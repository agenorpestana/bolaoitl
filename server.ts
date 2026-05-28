import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import http from "http";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

import { 
  Usuario, 
  Jogo, 
  Palpite, 
  ConfigPoints, 
  ConfigIXC, 
  ConfigFootballApi, 
  AuditLog, 
  AdminUser 
} from "./src/types";
import { INITIAL_GAMES, INITIAL_POINTS_CONFIG, CIDADES_ATENDIDAS } from "./src/data";
import { enrichGameDetails } from "./src/utils/gameEnricher";

const JWT_SECRET = process.env.JWT_SECRET || "copa-bolao-2026-super-secret-key-isp";

// Ensure database file exists with initial structure
const DB_FILE = path.join(process.cwd(), "database.json");

interface LocalDatabase {
  usuarios: Usuario[];
  jogos: Jogo[];
  palpites: Palpite[];
  configs_ixc: ConfigIXC;
  configs_points: ConfigPoints;
  configs_football: ConfigFootballApi;
  logs: AuditLog[];
  admins: AdminUser[];
  configs_libertadores?: {
    ativo: boolean;
  };
  configs_copa_mundo?: {
    ativo: boolean;
  };
  configs_brasileirao?: {
    ativo: boolean;
  };
}

// ==========================================
// PRISMA CLIENT & DYNAMIC MYSQL DATABASE URL CONTEXT
// ==========================================
let prisma: PrismaClient | null = null;

if (process.env.DB_USER && process.env.DB_NAME) {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD || "";
  const name = process.env.DB_NAME;
  // Always override process.env.DATABASE_URL on startup using encoded password to prevent connection crashes
  process.env.DATABASE_URL = `mysql://${user}:${encodeURIComponent(pass)}@${host}:3306/${name}`;
  console.log(`[MySql DB Setup] Dynamically constructed and secured DATABASE_URL for user '${user}' on host '${host}'`);
}

if (process.env.DATABASE_URL) {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  console.log("[MySql DB Setup] Initialized PrismaClient using active and secured URL configuration.");
}

let cachedDb: LocalDatabase | null = null;

// ==========================================
// GLOBAL FOOTBALL API HELPERS & ENGINE
// ==========================================
function getTeamFlag(teamName: string): string {
  const name = teamName.toLowerCase().trim();
  if (name.includes("brazil") || name.includes("brasil")) return "🇧🇷";
  if (name.includes("argentina")) return "🇦🇷";
  if (name.includes("canada") || name.includes("canadá")) return "🇨🇦";
  if (name.includes("united states") || name.includes("usa") || name.includes("estados unidos")) return "🇺🇸";
  if (name.includes("mexico") || name.includes("méxico")) return "🇲🇽";
  if (name.includes("france") || name.includes("frança")) return "🇫🇷";
  if (name.includes("germany") || name.includes("alemanha")) return "🇩🇪";
  if (name.includes("spain") || name.includes("espanha")) return "🇪🇸";
  if (name.includes("italy") || name.includes("itália")) return "🇮🇹";
  if (name.includes("england") || name.includes("inglaterra")) return "🇬🇧";
  if (name.includes("netherlands") || name.includes("holanda")) return "🇳🇱";
  if (name.includes("portugal")) return "🇵🇹";
  if (name.includes("uruguay") || name.includes("urugua")) return "🇺🇾";
  if (name.includes("japan") || name.includes("japão")) return "🇯🇵";
  if (name.includes("belgium") || name.includes("bélgica")) return "🇧🇪";
  if (name.includes("croatia") || name.includes("croácia")) return "🇭🇷";
  if (name.includes("morocco") || name.includes("marrocos")) return "🇲🇦";
  if (name.includes("switzerland") || name.includes("suíça")) return "🇨🇭";
  if (name.includes("ecuador") || name.includes("equador")) return "🇪🇨";
  if (name.includes("senegal")) return "🇸🇳";
  if (name.includes("poland") || name.includes("polônia")) return "🇵🇱";
  if (name.includes("saudi arabia") || name.includes("arábia saudita")) return "🇸🇦";
  if (name.includes("denmark") || name.includes("dinamarca")) return "🇩🇰";
  if (name.includes("tunisia") || name.includes("tunísia")) return "🇹🇳";
  if (name.includes("costa rica")) return "🇨🇷";
  if (name.includes("colombia") || name.includes("colômbia")) return "🇨🇴";
  if (name.includes("south korea") || name.includes("coréia do sul") || name.includes("korea")) return "🇰🇷";
  if (name.includes("sweden") || name.includes("suécia")) return "🇸🇪";
  if (name.includes("chile")) return "🇨🇱";
  if (name.includes("peru")) return "🇵🇪";
  if (name.includes("ukraine") || name.includes("ucrânia")) return "🇺🇦";
  if (name.includes("czech") || name.includes("república tcheca")) return "🇨🇿";
  return "🏳️";
}

function normalizeTeamName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove diacritics / accents
  if (n.includes("brazil") || n.includes("brasil")) return "brazil";
  if (n.includes("canada")) return "canada";
  if (n.includes("mexico")) return "mexico";
  if (n.includes("usa") || n.includes("united states") || n.includes("estados unidos")) return "usa";
  if (n.includes("germany") || n.includes("alemanha")) return "germany";
  if (n.includes("spain") || n.includes("espanha")) return "spain";
  if (n.includes("italy") || n.includes("italia")) return "italy";
  if (n.includes("england") || n.includes("inglaterra")) return "england";
  if (n.includes("netherlands") || n.includes("holanda")) return "netherlands";
  if (n.includes("croatia") || n.includes("croacia")) return "croatia";
  if (n.includes("morocco") || n.includes("marrocos")) return "morocco";
  if (n.includes("switzerland") || n.includes("suica")) return "switzerland";
  if (n.includes("ecuador") || n.includes("equador")) return "ecuador";
  if (n.includes("south korea") || n.includes("coreia do sul") || n.includes("korea")) return "south korea";
  if (n.includes("sweden") || n.includes("suecia")) return "sweden";
  if (n.includes("belgium") || n.includes("belgica")) return "belgium";
  if (n.includes("poland") || n.includes("polonia")) return "poland";
  if (n.includes("saudi") || n.includes("arabia")) return "saudi arabia";
  if (n.includes("denmark") || n.includes("dinamarca")) return "denmark";
  if (n.includes("tunisia") || n.includes("tunisia")) return "tunisia";
  if (n.includes("colombia")) return "colombia";
  if (n.includes("france") || n.includes("franca")) return "france";
  return n;
}

function parseRoundNumber(roundStr: string, isLibertadores = false): number {
  const norm = roundStr.toLowerCase();
  
  if (isLibertadores) {
    if (norm.includes("group stage - 1") || norm.includes("rodada 1")) return 1;
    if (norm.includes("group stage - 2") || norm.includes("rodada 2")) return 2;
    if (norm.includes("group stage - 3") || norm.includes("rodada 3")) return 3;
    if (norm.includes("group stage - 4") || norm.includes("rodada 4")) return 4;
    if (norm.includes("group stage - 5") || norm.includes("rodada 5")) return 5;
    if (norm.includes("group stage - 6") || norm.includes("rodada 6")) return 6;
    
    if (norm.includes("16") || norm.includes("eighth") || norm.includes("oitavas")) return 7;
    if (norm.includes("quarter") || norm.includes("quartas")) return 8;
    if (norm.includes("semi")) return 9;
    if (norm.includes("final")) return 10;
    return 1;
  }

  if (norm.includes("group stage - 1") || norm.includes("rodada 1")) return 1;
  if (norm.includes("group stage - 2") || norm.includes("rodada 2")) return 2;
  if (norm.includes("group stage - 3") || norm.includes("rodada 3")) return 3;
  if (norm.includes("32")) return 4;
  if (norm.includes("16") || norm.includes("eighth") || norm.includes("oitavas")) return 5;
  if (norm.includes("quarter") || norm.includes("quartas")) return 6;
  if (norm.includes("semi")) return 7;
  if (norm.includes("final")) return 8;
  return 1;
}

function getGameCampeonato(jogo: Jogo): 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO' {
  if (jogo.api_id) {
    const idLower = jogo.api_id.toLowerCase();
    if (idLower.includes("libertadores")) {
      return 'LIBERTADORES';
    }
    if (idLower.includes("brasileirao")) {
      return 'BRASILEIRAO';
    }
  }
  return 'COPA_MUNDO';
}

function isAnyRoundWindowActive(jogos: Jogo[]): boolean {
  const nowMs = new Date().getTime();

  // Group games by championship and round
  const groups: { [key: string]: Jogo[] } = {};
  for (const jogo of jogos) {
    const champ = getGameCampeonato(jogo);
    const round = jogo.rodada;
    const key = `${champ}_${round}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(jogo);
  }

  for (const key in groups) {
    const roundGames = groups[key];
    if (roundGames.length === 0) continue;

    // Find the min kickoff time
    const kickoffTimes = roundGames.map(g => new Date(g.data_jogo).getTime());
    const minKickoff = Math.min(...kickoffTimes);

    // Let's assume a football match takes about 240 minutes (4 hours to cover delays, extra time, and post-game updates safely)
    const matchDuration = 240 * 60 * 1000;
    const maxKickoff = Math.max(...kickoffTimes);
    const maxEndTime = maxKickoff + matchDuration;

    // Check if current time is inside this round window (from first match start to last match end)
    if (nowMs >= minKickoff && nowMs <= maxEndTime) {
      // Is there still at least one game in this round that is NOT ENCERRADO?
      const allConcluded = roundGames.every(g => g.status === 'ENCERRADO');
      if (!allConcluded) {
        return true;
      }
    }
  }

  return false;
}

const STANDARD_TEAMS = [
  { name: "Palmeiras", logo: "https://media.api-sports.io/football/teams/121.png" },
  { name: "Flamengo", logo: "https://media.api-sports.io/football/teams/127.png" },
  { name: "São Paulo", logo: "https://media.api-sports.io/football/teams/126.png" },
  { name: "Corinthians", logo: "https://media.api-sports.io/football/teams/131.png" },
  { name: "Santos", logo: "https://media.api-sports.io/football/teams/128.png" },
  { name: "Grêmio", logo: "https://media.api-sports.io/football/teams/130.png" },
  { name: "Internacional", logo: "https://media.api-sports.io/football/teams/119.png" },
  { name: "Atlético-MG", logo: "https://media.api-sports.io/football/teams/118.png" },
  { name: "Cruzeiro", logo: "https://media.api-sports.io/football/teams/122.png" },
  { name: "Botafogo", logo: "https://media.api-sports.io/football/teams/120.png" },
  { name: "Fluminense", logo: "https://media.api-sports.io/football/teams/124.png" },
  { name: "Vasco", logo: "https://media.api-sports.io/football/teams/133.png" },
  { name: "Bahia", logo: "https://media.api-sports.io/football/teams/112.png" },
  { name: "Athletico-PR", logo: "https://media.api-sports.io/football/teams/134.png" },
  { name: "Fortaleza", logo: "https://media.api-sports.io/football/teams/135.png" },
  { name: "Cuiabá", logo: "https://media.api-sports.io/football/teams/1105.png" },
  { name: "Bragantino", logo: "https://media.api-sports.io/football/teams/1109.png" },
  { name: "Juventude", logo: "https://media.api-sports.io/football/teams/1103.png" },
  { name: "Criciúma", logo: "https://media.api-sports.io/football/teams/1110.png" },
  { name: "Vitória", logo: "https://media.api-sports.io/football/teams/1107.png" }
];

function fillMissingBrasileiraoRounds(db: LocalDatabase) {
  // Discarded to ensure only real, authentic fixtures synced from the Football API-Sports are shown.
  return;
}

async function syncLeagueFromApi(db: LocalDatabase, leagueId: number): Promise<{ addedCount: number; updatedCount: number }> {
  const apiKey = db.configs_football.key;
  const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
  const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

  if (!isRealApi) {
    throw new Error("Chave de API do Football vazia ou de simulação.");
  }

  let addedCount = 0;
  let updatedCount = 0;

  if (leagueId === 1) { // COPA DO MUNDO
    const res = await syncFootballApiReal(db);
    return { addedCount: res.addedCount, updatedCount: res.updatedCount };
  } else if (leagueId === 13) { // COPA LIBERTADORES
    console.log(`[Auto-Sync Engine] Fetching Copa Libertadores (League 13) Season 2026...`);
    const response = await axios.get(`${apiUrl}/fixtures`, {
      params: { league: "13", season: "2026" },
      headers: { "x-apisports-key": apiKey },
      timeout: 12000
    });
    const fixtures = response?.data?.response || [];
    for (const item of fixtures) {
      const apiId = `libertadores_soccer_${item.fixture.id}`;
      const timeCasa = item.teams.home.name;
      const timeFora = item.teams.away.name;
      const timeCasaBandeira = item.teams.home.logo || "🏳️";
      const timeForaBandeira = item.teams.away.logo || "🏳️";
      const dataJogoStr = item.fixture.date;

      let placarCasa: number | null = null;
      let placarFora: number | null = null;
      if (item.goals.home !== null && item.goals.home !== undefined) placarCasa = Number(item.goals.home);
      if (item.goals.away !== null && item.goals.away !== undefined) placarFora = Number(item.goals.away);

      const shortStatus = item.fixture.status.short;
      let mappedStatus = "PENDENTE";
      if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(shortStatus)) {
        mappedStatus = "ENCERRADO";
      } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(shortStatus)) {
        mappedStatus = "AO_VIVO";
      }

      let existing = db.jogos.find(j => j.api_id === apiId);
      if (!existing) {
        existing = db.jogos.find(j => 
          (normalizeTeamName(j.time_casa) === normalizeTeamName(timeCasa) && normalizeTeamName(j.time_fora) === normalizeTeamName(timeFora))
        );
      }

      if (!existing) {
        const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
        db.jogos.push({
          id: newId,
          api_id: apiId,
          time_casa: timeCasa,
          time_fora: timeFora,
          time_casa_bandeira: timeCasaBandeira,
          time_fora_bandeira: timeForaBandeira,
          data_jogo: dataJogoStr,
          placar_casa: placarCasa,
          placar_fora: placarFora,
          status: mappedStatus as any,
          rodada: parseRoundNumber(item.league?.round || "Group Stage - 1", true),
          status_detalhado: shortStatus
        });
        addedCount++;
      } else {
        existing.api_id = apiId;
        existing.time_casa = timeCasa;
        existing.time_fora = timeFora;
        existing.time_casa_bandeira = timeCasaBandeira;
        existing.time_fora_bandeira = timeForaBandeira;
        existing.data_jogo = dataJogoStr;
        existing.placar_casa = placarCasa;
        existing.placar_fora = placarFora;
        existing.status = mappedStatus as any;
        existing.status_detalhado = shortStatus;
        existing.rodada = parseRoundNumber(item.league?.round || "Group Stage - 1", true);
        updatedCount++;
      }
    }
  } else if (leagueId === 71) { // BRASILEIRAO
    console.log(`[Auto-Sync Engine] Fetching Brasileirao (League 71) Season 2026...`);
    const response = await axios.get(`${apiUrl}/fixtures`, {
      params: { league: "71", season: "2026" },
      headers: { "x-apisports-key": apiKey },
      timeout: 12000
    });
    const fixtures = response?.data?.response || [];
    for (const item of fixtures) {
      const apiId = `brasileirao_soccer_${item.fixture.id}`;
      const timeCasa = item.teams.home.name;
      const timeFora = item.teams.away.name;
      const timeCasaBandeira = item.teams.home.logo || "🏳️";
      const timeForaBandeira = item.teams.away.logo || "🏳️";
      const dataJogoStr = item.fixture.date;

      let placarCasa: number | null = null;
      let placarFora: number | null = null;
      if (item.goals.home !== null && item.goals.home !== undefined) placarCasa = Number(item.goals.home);
      if (item.goals.away !== null && item.goals.away !== undefined) placarFora = Number(item.goals.away);

      const shortStatus = item.fixture.status.short;
      let mappedStatus = "PENDENTE";
      if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(shortStatus)) {
        mappedStatus = "ENCERRADO";
      } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(shortStatus)) {
        mappedStatus = "AO_VIVO";
      }

      let existing = db.jogos.find(j => j.api_id === apiId);
      if (!existing) {
        existing = db.jogos.find(j => 
          (normalizeTeamName(j.time_casa) === normalizeTeamName(timeCasa) && normalizeTeamName(j.time_fora) === normalizeTeamName(timeFora))
        );
      }

      if (!existing) {
        const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
        db.jogos.push({
          id: newId,
          api_id: apiId,
          time_casa: timeCasa,
          time_fora: timeFora,
          time_casa_bandeira: timeCasaBandeira,
          time_fora_bandeira: timeForaBandeira,
          data_jogo: dataJogoStr,
          placar_casa: placarCasa,
          placar_fora: placarFora,
          status: mappedStatus as any,
          rodada: item.league?.round ? (parseInt(item.league.round.replace(/\D/g, "")) || 1) : 1,
          status_detalhado: shortStatus
        });
        addedCount++;
      } else {
        existing.api_id = apiId;
        existing.time_casa = timeCasa;
        existing.time_fora = timeFora;
        existing.time_casa_bandeira = timeCasaBandeira;
        existing.time_fora_bandeira = timeForaBandeira;
        existing.data_jogo = dataJogoStr;
        existing.placar_casa = placarCasa;
        existing.placar_fora = placarFora;
        existing.status = mappedStatus as any;
        if (item.league?.round) {
          existing.rodada = parseInt(item.league.round.replace(/\D/g, "")) || 1;
        }
        existing.status_detalhado = shortStatus;
        updatedCount++;
      }
    }
    fillMissingBrasileiraoRounds(db);
  }

  return { addedCount, updatedCount };
}

async function syncFootballApiReal(db: LocalDatabase, req?: express.Request): Promise<{ addedCount: number; updatedCount: number; isUsingFallback: boolean; fixturesCount: number }> {
  const apiKey = db.configs_football.key;
  const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
  const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

  if (!isRealApi) {
    throw new Error("Chave de API do Football vazia ou de simulação.");
  }

  console.log(`[Football API Sync Engine] Querying endpoints: ${apiUrl}/fixtures for World Cup 2026 (League 1, Season 2026)...`);
  
  let response;
  let hasSeasonError = false;
  let originalErrorMsg = "";

  try {
    response = await axios.get(`${apiUrl}/fixtures`, {
      params: {
        league: "1",
        season: "2026"
      },
      headers: {
        "x-apisports-key": apiKey
      },
      timeout: 12000
    });

    if (response.data && response.data.errors) {
      const errKeys = Object.keys(response.data.errors);
      if (errKeys.length > 0) {
        const firstErr = String(response.data.errors[errKeys[0]]);
        originalErrorMsg = firstErr;
        if (
          firstErr.toLowerCase().includes("free plan") || 
          firstErr.toLowerCase().includes("this season") || 
          firstErr.toLowerCase().includes("restricted") ||
          firstErr.toLowerCase().includes("2022 to 2024")
        ) {
          hasSeasonError = true;
        }
      }
    }
  } catch (innerErr: any) {
    const errMsg = innerErr.message || "";
    originalErrorMsg = errMsg;
    if (
      errMsg.toLowerCase().includes("free plan") || 
      errMsg.toLowerCase().includes("this season") || 
      errMsg.toLowerCase().includes("restricted") ||
      errMsg.toLowerCase().includes("2022 to 2024")
    ) {
      hasSeasonError = true;
    } else {
      throw innerErr;
    }
  }

  let isUsingFallback = false;
  if (hasSeasonError) {
    console.log(`[Football API Sync Engine] Free Plan restriction detected ("${originalErrorMsg}"). Executing smart fallback fetching authorized World Cup 2022 dataset and shifting dates automatically to 2026...`);
    isUsingFallback = true;
    
    response = await axios.get(`${apiUrl}/fixtures`, {
      params: {
        league: "1",
        season: "2022"
      },
      headers: {
        "x-apisports-key": apiKey
      },
      timeout: 12000
    });

    if (response.data && response.data.errors && Object.keys(response.data.errors).length > 0) {
      const errKeys = Object.keys(response.data.errors);
      const firstErr = response.data.errors[errKeys[0]];
      if (firstErr) {
        throw new Error(`Erro no fallback de 2022: ${firstErr}`);
      }
    }
  } else {
    if (response && response.data && response.data.errors && Object.keys(response.data.errors).length > 0) {
      const errKeys = Object.keys(response.data.errors);
      const firstErr = response.data.errors[errKeys[0]];
      if (firstErr) {
        throw new Error(`Erro retornado pela API: ${firstErr}`);
      }
    }
  }

  const fixtures = response?.data?.response;
  if (!fixtures || fixtures.length === 0) {
    throw new Error("Nenhuma partida retornada pela API.");
  }

  const mockGameIdsToPurge = db.jogos.filter(j => {
    if (j.api_id && j.api_id.startsWith("wc2026_")) {
      const hasGuesses = db.palpites.some(p => p.jogo_id === j.id);
      return !hasGuesses;
    }
    return false;
  }).map(j => j.id);

  if (mockGameIdsToPurge.length > 0) {
    console.log(`[Football API Sync Engine] Purging ${mockGameIdsToPurge.length} unused simulated WC matches with 0 predictions...`);
    db.jogos = db.jogos.filter(j => !mockGameIdsToPurge.includes(j.id));
    db.palpites = db.palpites.filter(p => !mockGameIdsToPurge.includes(p.jogo_id));
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of fixtures) {
    const apiId = `football_api_${item.fixture.id}`;
    const timeCasa = item.teams.home.name;
    const timeFora = item.teams.away.name;
    const timeCasaBandeira = item.teams.home.logo || getTeamFlag(timeCasa);
    const timeForaBandeira = item.teams.away.logo || getTeamFlag(timeFora);
    
    let dataJogoStr = item.fixture.date;
    if (isUsingFallback) {
      try {
        const d = new Date(dataJogoStr);
        d.setDate(d.getDate() + 1299);
        dataJogoStr = d.toISOString();
      } catch (pE) {
        dataJogoStr = dataJogoStr.replace("2022", "2026");
      }
    }

    let placarCasa: number | null = null;
    let placarFora: number | null = null;
    if (item.goals.home !== null && item.goals.home !== undefined) {
      placarCasa = Number(item.goals.home);
    }
    if (item.goals.away !== null && item.goals.away !== undefined) {
      placarFora = Number(item.goals.away);
    }

    let shortStatus = item.fixture.status.short;
    let mappedStatus = "PENDENTE";
    if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(shortStatus)) {
      mappedStatus = "ENCERRADO";
    } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(shortStatus)) {
      mappedStatus = "AO_VIVO";
    }

    if (isUsingFallback) {
      const shiftedLocalTime = new Date(dataJogoStr).getTime();
      const nowTime = new Date().getTime();
      if (shiftedLocalTime > nowTime) {
        mappedStatus = "PENDENTE";
        placarCasa = null;
        placarFora = null;
        shortStatus = "NS";
      } else {
        const elapsedMins = (nowTime - shiftedLocalTime) / (1000 * 60);
        if (elapsedMins >= 105) {
          mappedStatus = "ENCERRADO";
          shortStatus = "FT";
        } else {
          mappedStatus = "AO_VIVO";
          shortStatus = elapsedMins < 50 ? "1H" : elapsedMins < 60 ? "HT" : "2H";
        }
      }
    }

    const mappedRound = parseRoundNumber(item.league.round || "Group Stage - 1");

    let existingJogo = db.jogos.find(j => j.api_id === apiId);
    if (!existingJogo) {
      existingJogo = db.jogos.find(j => 
        (normalizeTeamName(j.time_casa) === normalizeTeamName(timeCasa) && normalizeTeamName(j.time_fora) === normalizeTeamName(timeFora))
      );
    }

    if (existingJogo) {
      existingJogo.api_id = apiId;
      existingJogo.time_casa = timeCasa;
      existingJogo.time_fora = timeFora;
      existingJogo.time_casa_bandeira = timeCasaBandeira;
      existingJogo.time_fora_bandeira = timeForaBandeira;
      existingJogo.data_jogo = dataJogoStr;
      existingJogo.placar_casa = placarCasa;
      existingJogo.placar_fora = placarFora;
      existingJogo.status = mappedStatus as any;
      existingJogo.rodada = mappedRound;
      existingJogo.status_detalhado = shortStatus;
      updatedCount++;
    } else {
      const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
      db.jogos.push({
        id: newId,
        api_id: apiId,
        time_casa: timeCasa,
        time_fora: timeFora,
        time_casa_bandeira: timeCasaBandeira,
        time_fora_bandeira: timeForaBandeira,
        data_jogo: dataJogoStr,
        placar_casa: placarCasa,
        placar_fora: placarFora,
        status: mappedStatus as any,
        rodada: mappedRound,
        status_detalhado: shortStatus
      });
      addedCount++;
    }
  }

  return {
    addedCount,
    updatedCount,
    isUsingFallback,
    fixturesCount: fixtures.length
  };
}

function loadDatabase(): LocalDatabase {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = loadDatabaseFromFile();

  if (!cachedDb.configs_libertadores) {
    cachedDb.configs_libertadores = { ativo: false };
  }

  if (!cachedDb.configs_copa_mundo) {
    cachedDb.configs_copa_mundo = { ativo: true };
  }

  if (!cachedDb.configs_brasileirao) {
    cachedDb.configs_brasileirao = { ativo: false };
  }

  if (!cachedDb.admins) {
    cachedDb.admins = [];
  }

  // If we have real Football API games, we automatically hide/purge any initial dummy wc2026_ games that don't have predictions on them
  const hasRealApiGames = cachedDb.jogos.some(j => j.api_id && j.api_id.startsWith("football_api_"));
  if (hasRealApiGames) {
    const originalLength = cachedDb.jogos.length;
    cachedDb.jogos = cachedDb.jogos.filter(j => {
      if (j.api_id && j.api_id.startsWith("wc2026_")) {
        const hasGuesses = cachedDb.palpites.some(p => p.jogo_id === j.id);
        return hasGuesses; // keep if it has user bets!
      }
      return true;
    });

    if (cachedDb.jogos.length !== originalLength) {
      console.log(`[Database Load] Dynamically purged initial unused fictional games from live database because real API games exist.`);
      const mockGameIdsToPurge = [1, 2, 3, 4, 5, 6, 7, 8].filter(id => {
        const hasGuesses = cachedDb.palpites.some(p => p.jogo_id === id);
        return !hasGuesses;
      });
      cachedDb.palpites = cachedDb.palpites.filter(p => !mockGameIdsToPurge.includes(p.jogo_id));
      saveDatabase(cachedDb);
    }
  }

  // Always clean up any generated fake Brasileirao games (api_id starts with "brasileirao_soccer_gen_" or includes "_gen_")
  const originalGamesLength = cachedDb.jogos.length;
  cachedDb.jogos = cachedDb.jogos.filter(j => {
    if (j.api_id && (j.api_id.startsWith("brasileirao_soccer_gen_") || j.api_id.includes("_gen_"))) {
      return false;
    }
    return true;
  });
  if (cachedDb.jogos.length !== originalGamesLength) {
    console.log(`[Database Load] Dynamically purged ${originalGamesLength - cachedDb.jogos.length} fictional generated matches.`);
    saveDatabase(cachedDb);
  }

  return cachedDb;
}

function loadDatabaseFromFile(): LocalDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data) as LocalDatabase;
    }
  } catch (err) {
    console.error("Error reading database file, resetting...", err);
  }

  // Create initial structure (pristine empty list of users and palpites to prevent fictitious data sync)
  const initialDb: LocalDatabase = {
    usuarios: [],
    jogos: INITIAL_GAMES,
    palpites: [],
    configs_ixc: {
      url: "https://provedor-ixc.exemplo.com.br",
      token: "6:4dacdb8e47193e8cbbabe508c3c59b4547e463817b1d9b9a1d20ab4812fe1a62",
      chave: "ixc_default_api_key_copa",
      timeout: 5000,
      offline_mode: false // default to production API representation
    },
    configs_points: INITIAL_POINTS_CONFIG,
    configs_football: {
      key: "dummy_soccer_api_key_2026_sports",
      url: "https://v3.football.api-sports.io",
      status_conexao: "CONECTADO",
      cron_active: true,
      manual_override: true
    },
    logs: [
      {
        id: 1,
        usuario: "Sistema",
        acao: "INICIALIZACAO",
        descricao: "Banco de dados inicializado com sucesso e 8 partidas programadas.",
        ip: "127.0.0.1",
        data: new Date().toISOString()
      },
      {
        id: 2,
        usuario: "Admin",
        acao: "CONFIGURACAO_CONECTIVIDADE",
        descricao: "Simulação de API IXC Soft ativada como retaguarda segura.",
        ip: "127.0.0.1",
        data: new Date().toISOString()
      }
    ],
    admins: [
      { id: 1, email: "suporte@unityautomacoes.com.br", nome: "Suporte Unity" }
    ],
    configs_libertadores: {
      ativo: false
    },
    configs_copa_mundo: {
      ativo: true
    },
    configs_brasileirao: {
      ativo: false
    }
  };

  saveDatabase(initialDb);
  return initialDb;
}

let isSyncing = false;
let needsSync = false;

function saveDatabase(db: LocalDatabase) {
  cachedDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file", err);
  }

  // Trigger asynchronous sync with MySQL
  triggerMySqlSync();
}

function triggerMySqlSync() {
  if (!prisma) return;
  if (isSyncing) {
    needsSync = true;
    return;
  }

  isSyncing = true;
  saveDatabaseToMySqlIncremental(cachedDb)
    .catch((err: any) => {
      console.error("[MySql Sync] Incremental save failed:", err.message);
    })
    .finally(() => {
      isSyncing = false;
      if (needsSync) {
        needsSync = false;
        setTimeout(triggerMySqlSync, 100);
      }
    });
}

async function saveDatabaseToMySqlIncremental(db: LocalDatabase | null) {
  if (!prisma || !db) return;

  try {
    // 1. Sync clients (Usuario)
    for (const u of db.usuarios) {
      try {
        await prisma.usuario.upsert({
          where: { id: u.id },
          update: {
            ixc_id: u.ixc_id,
            nome: u.nome,
            cpf_cnpj: u.cpf_cnpj,
            telefone: u.telefone,
            email: u.email,
            cidade: u.cidade,
            avatar: u.avatar || "⚽",
            pontos_total: u.pontos_total,
            acertos_exato: u.acertos_exato,
            acertos_vencedor: u.acertos_vencedor,
            erros: u.erros,
            bloqueado: u.bloqueado
          },
          create: {
            id: u.id,
            ixc_id: u.ixc_id,
            nome: u.nome,
            cpf_cnpj: u.cpf_cnpj,
            telefone: u.telefone,
            email: u.email,
            cidade: u.cidade,
            avatar: u.avatar || "⚽",
            pontos_total: u.pontos_total,
            acertos_exato: u.acertos_exato,
            acertos_vencedor: u.acertos_vencedor,
            erros: u.erros,
            bloqueado: u.bloqueado,
            created_at: new Date(u.created_at)
          }
        });
      } catch (err: any) {
        console.error(`[MySql Sync] Failed to upsert user ID ${u.id} (${u.nome}):`, err.message);
      }
    }

    // 2. Sync games (Jogo)
    for (const g of db.jogos) {
      try {
        await prisma.jogo.upsert({
          where: { id: g.id },
          update: {
            api_id: g.api_id,
            time_casa: g.time_casa,
            time_fora: g.time_fora,
            time_casa_bandeira: g.time_casa_bandeira || "🏳️",
            time_fora_bandeira: g.time_fora_bandeira || "🏳️",
            data_jogo: new Date(g.data_jogo),
            placar_casa: g.placar_casa,
            placar_fora: g.placar_fora,
            status: g.status,
            status_detalhado: g.status_detalhado || "NS",
            rodada: g.rodada
          },
          create: {
            id: g.id,
            api_id: g.api_id,
            time_casa: g.time_casa,
            time_fora: g.time_fora,
            time_casa_bandeira: g.time_casa_bandeira || "🏳️",
            time_fora_bandeira: g.time_fora_bandeira || "🏳️",
            data_jogo: new Date(g.data_jogo),
            placar_casa: g.placar_casa,
            placar_fora: g.placar_fora,
            status: g.status,
            status_detalhado: g.status_detalhado || "NS",
            rodada: g.rodada
          }
        });
      } catch (err: any) {
        console.error(`[MySql Sync] Failed to upsert game ID ${g.id} (${g.time_casa} x ${g.time_fora}):`, err.message);
      }
    }

    // 3. Sync bets (Palpite)
    for (const p of db.palpites) {
      try {
        const userExist = db.usuarios.some(u => u.id === p.usuario_id);
        const gameExist = db.jogos.some(g => g.id === p.jogo_id);
        if (!userExist || !gameExist) {
          console.warn(`[MySql Sync] Skipping bet ID ${p.id}: userExist=${userExist}, gameExist=${gameExist}`);
          continue;
        }

        // Upsert by compound unique constraint usuario_id_jogo_id to prevent duplicate key constraint crashes
        await prisma.palpite.upsert({
          where: {
            usuario_id_jogo_id: {
              usuario_id: p.usuario_id,
              jogo_id: p.jogo_id
            }
          },
          update: {
            placar_casa: p.placar_casa,
            placar_fora: p.placar_fora,
            pontos: p.pontos
          },
          create: {
            usuario_id: p.usuario_id,
            jogo_id: p.jogo_id,
            placar_casa: p.placar_casa,
            placar_fora: p.placar_fora,
            pontos: p.pontos,
            created_at: new Date(p.created_at)
          }
        });
      } catch (err: any) {
        console.error(`[MySql Sync] Failed to upsert bet ID ${p.id} (user ID ${p.usuario_id}, game ID ${p.jogo_id}):`, err.message);
      }
    }

    // 4. Sync Configs (Configuracoes)
    const isLibAtivoStr = db.configs_libertadores?.ativo ? "true" : "false";
    const isCopaAtivoStr = db.configs_copa_mundo?.ativo !== false ? "true" : "false";
    const isBrasileiraoAtivoStr = db.configs_brasileirao?.ativo ? "true" : "false";
    const ixcChaveCompound = `${db.configs_ixc.chave || ""}|libertadores:${isLibAtivoStr}|copa:${isCopaAtivoStr}|brasileirao:${isBrasileiraoAtivoStr}`;

    await prisma.configuracoes.upsert({
      where: { id: 1 },
      update: {
        ixc_url: db.configs_ixc.url,
        ixc_token: db.configs_ixc.token,
        ixc_chave: ixcChaveCompound,
        ixc_timeout: db.configs_ixc.timeout,
        ixc_offline_mode: db.configs_ixc.offline_mode,
        points_vencedor: db.configs_points.pontos_acertar_vencedor,
        points_empate: db.configs_points.pontos_acertar_empate,
        points_placar_exato: db.configs_points.pontos_acertar_placar_exato,
        bonus_rodada: db.configs_points.bonus_rodada,
        bonus_sequencia: db.configs_points.bonus_sequencia,
        bonus_jogos_perfeitos: db.configs_points.bonus_jogos_perfeitos,
        football_api_key: db.configs_football.key,
        football_api_url: db.configs_football.url,
        sync_manual_override: db.configs_football.manual_override,
        sync_cron_active: db.configs_football.cron_active
      },
      create: {
        id: 1,
        ixc_url: db.configs_ixc.url,
        ixc_token: db.configs_ixc.token,
        ixc_chave: ixcChaveCompound,
        ixc_timeout: db.configs_ixc.timeout,
        ixc_offline_mode: db.configs_ixc.offline_mode,
        points_vencedor: db.configs_points.pontos_acertar_vencedor,
        points_empate: db.configs_points.pontos_acertar_empate,
        points_placar_exato: db.configs_points.pontos_acertar_placar_exato,
        bonus_rodada: db.configs_points.bonus_rodada,
        bonus_sequencia: db.configs_points.bonus_sequencia,
        bonus_jogos_perfeitos: db.configs_points.bonus_jogos_perfeitos,
        football_api_key: db.configs_football.key,
        football_api_url: db.configs_football.url,
        sync_manual_override: db.configs_football.manual_override,
        sync_cron_active: db.configs_football.cron_active
      }
    });

    // Sync into api_tokens table as requested by user so it displays there!
    if (db.configs_ixc.token) {
      await prisma.apiToken.upsert({
        where: { id: 1 },
        update: {
          servico: "ixc_token",
          token: db.configs_ixc.token
        },
        create: {
          id: 1,
          servico: "ixc_token",
          token: db.configs_ixc.token
        }
      });
    }

    if (db.configs_ixc.chave) {
      await prisma.apiToken.upsert({
        where: { id: 2 },
        update: {
          servico: "ixc_chave",
          token: db.configs_ixc.chave
        },
        create: {
          id: 2,
          servico: "ixc_chave",
          token: db.configs_ixc.chave
        }
      });
    }

    if (db.configs_football.key) {
      await prisma.apiToken.upsert({
        where: { id: 3 },
        update: {
          servico: "football_api",
          token: db.configs_football.key
        },
        create: {
          id: 3,
          servico: "football_api",
          token: db.configs_football.key
        }
      });
    }

    // 5. Sync audit logs
    const lastDBSavedLog = await prisma.auditLog.findFirst({
      orderBy: { id: "desc" }
    });
    const lastId = lastDBSavedLog ? lastDBSavedLog.id : 0;
    const newLogs = db.logs.filter(l => l.id > lastId);
    if (newLogs.length > 0) {
      await prisma.auditLog.createMany({
        data: newLogs.map(l => ({
          id: l.id,
          usuario: l.usuario,
          acao: l.acao,
          descricao: l.descricao,
          ip: l.ip,
          data: new Date(l.data)
        }))
      });
    }
  } catch (err: any) {
    console.error("[MySql Sync] Sync engine batch write error:", err.message);
  }
}

async function loadDatabaseFromMySql(): Promise<LocalDatabase> {
  if (!prisma) throw new Error("Prisma client not connected");

  const dbUsuarios = await prisma.usuario.findMany();
  const dbJogos = await prisma.jogo.findMany();
  const dbPalpites = await prisma.palpite.findMany();
  
  let dbCfg = await prisma.configuracoes.findFirst();
  if (!dbCfg) {
    dbCfg = await prisma.configuracoes.create({
      data: {
        ixc_url: "https://provedor-ixc.exemplo.com.br",
        ixc_token: "6:4dacdb8e47193e8cbbabe508c3c59b4547e463817b1d9b9a1d20ab4812fe1a62",
        ixc_chave: "ixc_default_api_key_copa",
        ixc_timeout: 5000,
        ixc_offline_mode: false,
        points_vencedor: INITIAL_POINTS_CONFIG.pontos_acertar_vencedor,
        points_empate: INITIAL_POINTS_CONFIG.pontos_acertar_empate,
        points_placar_exato: INITIAL_POINTS_CONFIG.pontos_acertar_placar_exato,
        bonus_rodada: INITIAL_POINTS_CONFIG.bonus_rodada,
        bonus_sequencia: INITIAL_POINTS_CONFIG.bonus_sequencia,
        bonus_jogos_perfeitos: INITIAL_POINTS_CONFIG.bonus_jogos_perfeitos,
        football_api_key: "dummy_soccer_api_key_2026_sports",
        football_api_url: "https://v3.football.api-sports.io",
        sync_manual_override: true,
        sync_cron_active: true
      }
    });
  }

  const dbLogs = await prisma.auditLog.findMany({
    orderBy: { data: "desc" },
    take: 400
  });

  const dbAdmins = await prisma.admin.findMany();
  if (dbAdmins.length === 0) {
    const hash = await bcryptjs.hash("200616", 10);
    await prisma.admin.create({
      data: {
        email: "suporte@unityautomacoes.com.br",
        nome: "Suporte Unity",
        senha_hash: hash
      }
    });
  }

  if (dbJogos.length === 0) {
    console.log("[MySql Sync] Table 'jogos' is empty, seeding games catalog...");
    for (const g of INITIAL_GAMES) {
      await prisma.jogo.create({
        data: {
          id: g.id,
          api_id: g.api_id,
          time_casa: g.time_casa,
          time_fora: g.time_fora,
          time_casa_bandeira: g.time_casa_bandeira,
          time_fora_bandeira: g.time_fora_bandeira,
          data_jogo: new Date(g.data_jogo),
          status: g.status,
          rodada: g.rodada,
          placar_casa: g.placar_casa,
          placar_fora: g.placar_fora
        }
      });
    }
    const dbJogosUpdated = await prisma.jogo.findMany();
    dbJogos.push(...dbJogosUpdated);
  }

  let ixcChaveOriginal = dbCfg.ixc_chave || "";
  let isLibertadoresAtivo = false;
  if (ixcChaveOriginal.includes("|libertadores:true")) {
    isLibertadoresAtivo = true;
    ixcChaveOriginal = ixcChaveOriginal.replace("|libertadores:true", "");
  } else if (ixcChaveOriginal.includes("|libertadores:false")) {
    isLibertadoresAtivo = false;
    ixcChaveOriginal = ixcChaveOriginal.replace("|libertadores:false", "");
  }

  let isCopaAtivo = true;
  if (ixcChaveOriginal.includes("|copa:true")) {
    isCopaAtivo = true;
    ixcChaveOriginal = ixcChaveOriginal.replace("|copa:true", "");
  } else if (ixcChaveOriginal.includes("|copa:false")) {
    isCopaAtivo = false;
    ixcChaveOriginal = ixcChaveOriginal.replace("|copa:false", "");
  }

  let isBrasileiraoAtivo = false;
  if (ixcChaveOriginal.includes("|brasileirao:true")) {
    isBrasileiraoAtivo = true;
    ixcChaveOriginal = ixcChaveOriginal.replace("|brasileirao:true", "");
  } else if (ixcChaveOriginal.includes("|brasileirao:false")) {
    isBrasileiraoAtivo = false;
    ixcChaveOriginal = ixcChaveOriginal.replace("|brasileirao:false", "");
  }

  return {
    usuarios: dbUsuarios.map(u => ({
      id: u.id,
      ixc_id: u.ixc_id,
      nome: u.nome,
      cpf_cnpj: u.cpf_cnpj,
      telefone: u.telefone,
      email: u.email,
      cidade: u.cidade,
      avatar: u.avatar || "⚽",
      pontos_total: u.pontos_total,
      acertos_exato: u.acertos_exato,
      acertos_vencedor: u.acertos_vencedor,
      erros: u.erros,
      bloqueado: u.bloqueado,
      created_at: u.created_at.toISOString()
    })),
    jogos: dbJogos.map(g => ({
      id: g.id,
      api_id: g.api_id || `manual_${g.id}`,
      time_casa: g.time_casa,
      time_fora: g.time_fora,
      time_casa_bandeira: g.time_casa_bandeira || "🏳️",
      time_fora_bandeira: g.time_fora_bandeira || "🏳️",
      data_jogo: g.data_jogo.toISOString(),
      placar_casa: g.placar_casa,
      placar_fora: g.placar_fora,
      status: g.status as any,
      rodada: g.rodada,
      status_detalhado: (g as any).status_detalhado || "NS"
    })),
    palpites: dbPalpites.map(p => ({
      id: p.id,
      usuario_id: p.usuario_id,
      jogo_id: p.jogo_id,
      placar_casa: p.placar_casa,
      placar_fora: p.placar_fora,
      pontos: p.pontos,
      created_at: p.created_at.toISOString()
    })),
    configs_ixc: {
      url: dbCfg.ixc_url,
      token: dbCfg.ixc_token,
      chave: ixcChaveOriginal,
      timeout: dbCfg.ixc_timeout,
      offline_mode: dbCfg.ixc_offline_mode
    },
    configs_points: {
      pontos_acertar_vencedor: dbCfg.points_vencedor,
      pontos_acertar_empate: dbCfg.points_empate,
      pontos_acertar_placar_exato: dbCfg.points_placar_exato,
      bonus_rodada: dbCfg.bonus_rodada,
      bonus_sequencia: dbCfg.bonus_sequencia,
      bonus_jogos_perfeitos: dbCfg.bonus_jogos_perfeitos
    },
    configs_football: {
      key: dbCfg.football_api_key || "",
      url: dbCfg.football_api_url,
      status_conexao: "CONECTADO",
      cron_active: dbCfg.sync_cron_active,
      manual_override: dbCfg.sync_manual_override
    },
    logs: dbLogs.map(l => ({
      id: l.id,
      usuario: l.usuario,
      acao: l.acao,
      descricao: l.descricao,
      ip: l.ip,
      data: l.data.toISOString()
    })),
    admins: [
      { id: 1, email: "suporte@unityautomacoes.com.br", nome: "Suporte Unity" }
    ],
    configs_libertadores: {
      ativo: isLibertadoresAtivo
    },
    configs_copa_mundo: {
      ativo: isCopaAtivo
    },
    configs_brasileirao: {
      ativo: isBrasileiraoAtivo
    }
  };
}

async function loadDatabaseFromMySqlWithRetry(retries = 5, delayMs = 3000): Promise<LocalDatabase> {
  for (let i = 1; i <= retries; i++) {
    try {
      if (prisma) {
        return await loadDatabaseFromMySql();
      }
      throw new Error("Prisma client not initialized");
    } catch (err: any) {
      console.log(`[MySql DB Connection] Attempt ${i}/${retries} failed to fetch from MySQL: ${err.message}`);
      if (i === retries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Failed to connect to MySQL after retries");
}

async function initializeDatabase() {
  if (prisma) {
    // Check if the usuarios table already exists to prevent destructive db push runs on every startup/reboot
    let schemaIsPushed = false;
    let databaseIsOffline = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM usuarios LIMIT 1`;
      schemaIsPushed = true;
      console.log("[MySql Sync] Table structure looks correct (table 'usuarios' found). Skipping schema push to prevent data loss.");

      try {
        await prisma.$executeRawUnsafe("ALTER TABLE usuarios MODIFY COLUMN avatar VARCHAR(255) DEFAULT '⚽'");
        await prisma.$executeRawUnsafe("ALTER TABLE jogos MODIFY COLUMN time_casa_bandeira VARCHAR(255) DEFAULT NULL");
        await prisma.$executeRawUnsafe("ALTER TABLE jogos MODIFY COLUMN time_fora_bandeira VARCHAR(255) DEFAULT NULL");
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE jogos ADD COLUMN status_detalhado VARCHAR(10) DEFAULT 'NS'");
          console.log("[MySql Sync] Column 'status_detalhado' added successfully.");
        } catch (colErr: any) {
          // Will fail if column already exists, which is fine and expected
          console.log("[MySql Sync] Safe check for 'status_detalhado' column ready: ", colErr.message);
        }
        console.log("[MySql Sync] Columns 'avatar', 'time_casa_bandeira', and 'time_fora_bandeira' successfully verified and enlarged to VARCHAR(255) via ALTER TABLE.");
      } catch (alterErr: any) {
        console.log("[MySql Sync] Safe column alteration check completed or bypassed: ", alterErr.message);
      }
    } catch (err: any) {
      const errMsg = err.message || "";
      console.log("[MySql Sync] SELECT query check result/error:", errMsg);
      if (errMsg.includes("doesn't exist") || errMsg.includes("no such table") || errMsg.includes("exist") || errMsg.includes("P2010")) {
        schemaIsPushed = false;
      } else {
        databaseIsOffline = true;
        schemaIsPushed = true; // prevent executing schema push when MySQL is temporarily offline/unreachable
      }
    }

    if (!schemaIsPushed && !databaseIsOffline) {
      try {
        const { execSync } = await import("child_process");
        console.log("[MySql Sync] Dynamic push starting: npx prisma db push (first-time database setup only!)");
        execSync("npx prisma db push", { stdio: "inherit" });
        console.log("[MySql Sync] Schema successfully pushed to VPS!");
      } catch (err: any) {
        console.error("[MySql Sync] Schema initial push failed:", err.message);
      }
    }

    try {
      console.log("[MySql Sync] Cleaning up legacy sandbox fictitious users if any exist...");
      const mockCpfList = ["123.456.789-00", "987.654.321-11", "111.222.333-44"];
      await prisma.usuario.deleteMany({
        where: {
          cpf_cnpj: { in: mockCpfList }
        }
      });
      console.log("[MySql Sync] Purged legacy fictitious users from MySQL successfully!");
    } catch (err: any) {
      console.error("[MySql Sync] Legacy user purge bypassed:", err.message);
    }

    try {
      console.log("[MySql Sync] Retrieving state from MySQL server (with retries if needed)...");
      const mysqlDb = await loadDatabaseFromMySqlWithRetry(5, 3000);
      const fileDb = loadDatabaseFromFile();

      const hasLocalData = fileDb.usuarios.length > 0 || fileDb.palpites.length > 0 || fileDb.jogos.length > 0;
      const hasMySqlData = mysqlDb.usuarios.length > 0 || mysqlDb.palpites.length > 0 || mysqlDb.jogos.length > 0;

      if (hasLocalData && !hasMySqlData) {
        console.log("[MySql Sync] MySQL database is empty, but local JSON file has active data. Seeding MySQL from local database.json...");
        cachedDb = fileDb;
        // Asynchronously sync the file cache into MySQL
        saveDatabase(cachedDb);
      } else {
        console.log(`[MySql Sync] Cache successfully filled from MySQL: ${mysqlDb.usuarios.length} users, ${mysqlDb.palpites.length} bets, ${mysqlDb.jogos.length} games.`);
        cachedDb = mysqlDb;
        // Keep the local file synchronized
        saveDatabaseToFile(cachedDb);
      }
    } catch (err: any) {
      console.error("[MySql Sync] MySQL connection failed completely, falling back to local database.json. Error:", err.message);
      cachedDb = loadDatabaseFromFile();
    }
  } else {
    // File fallback
    cachedDb = loadDatabaseFromFile();
    console.log(`[Cache Sync] Local database.json state resolved: ${cachedDb.usuarios.length} users, ${cachedDb.palpites.length} bets.`);
  }

  // Ensure Admin Testing User is present in both MySQL and local cache
  if (cachedDb) {
    const adminUserExists = cachedDb.usuarios.some(u => u.id === 999999);
    if (!adminUserExists) {
      console.log("[MySql Sync] Registering admin testing user profile with ID 999999...");
      cachedDb.usuarios.push({
        id: 999999,
        ixc_id: "0",
        nome: "Suporte Unity (Admin)",
        cpf_cnpj: "000.000.000-00",
        telefone: "0000000000",
        email: "suporte@unityautomacoes.com.br",
        cidade: "Suporte",
        avatar: "🛡️",
        pontos_total: 0,
        acertos_exato: 0,
        acertos_vencedor: 0,
        erros: 0,
        bloqueado: false,
        created_at: new Date().toISOString()
      });
      saveDatabase(cachedDb);
    }
  }
}

// Ensure database file exists with initial structure (kept for fallback)
function saveDatabaseToFile(db: LocalDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving fallback database file", err);
  }
}

// Mask name for general public (LGPD compliant)
function maskName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 3) {
    return trimmed;
  }
  const firstThree = trimmed.slice(0, 3);
  return firstThree + "****";
}

// Global logger helper
function addLog(usuario: string, acao: string, descricao: string, req?: express.Request) {
  const db = loadDatabase();
  const ip = req ? (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1") : "127.0.0.1";
  const newLog: AuditLog = {
    id: db.logs.length > 0 ? Math.max(...db.logs.map(l => l.id)) + 1 : 1,
    usuario,
    acao,
    descricao,
    ip,
    data: new Date().toISOString()
  };
  db.logs.unshift(newLog);
  // Keep last 400 logs to prevent infinite memory growth
  if (db.logs.length > 400) {
    db.logs = db.logs.slice(0, 400);
  }
  saveDatabase(db);
}

// Score Calculator Engine
function calculatePointsForBet(palpite: Palpite, jogo: Jogo, points_cfg: ConfigPoints): number {
  if (jogo.placar_casa === null || jogo.placar_fora === null) return 0;

  const palpiteCasa = palpite.placar_casa;
  const palpiteFora = palpite.placar_fora;
  const realCasa = jogo.placar_casa;
  const realFora = jogo.placar_fora;

  // Exact scorecard match
  if (palpiteCasa === realCasa && palpiteFora === realFora) {
    // Winner hit points + Exact score bônus
    return points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
  }

  // Draw check
  const palpiteEmpate = palpiteCasa === palpiteFora;
  const realEmpate = realCasa === realFora;

  if (realEmpate && palpiteEmpate) {
    return points_cfg.pontos_acertar_empate;
  }

  // Winner check (not a drawing score)
  const palpiteVencedorCasa = palpiteCasa > palpiteFora;
  const realVencedorCasa = realCasa > realFora;

  const palpiteVencedorFora = palpiteCasa < palpiteFora;
  const realVencedorFora = realCasa < realFora;

  if ((palpiteVencedorCasa && realVencedorCasa) || (palpiteVencedorFora && realVencedorFora)) {
    return points_cfg.pontos_acertar_vencedor;
  }

  return 0; // complete miss
}

// Recalculates whole database user tallies based on existing games and bets
function refreshLeaderboard() {
  const db = loadDatabase();
  const points_cfg = db.configs_points;

  // Reset users scores
  db.usuarios.forEach(u => {
    u.pontos_total = 0;
    u.acertos_exato = 0;
    u.acertos_vencedor = 0;
    u.erros = 0;
  });

  // Calculate scores per bet
  db.palpites.forEach(p => {
    const jogo = db.jogos.find(j => j.id === p.jogo_id);
    if (jogo && (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO')) {
      const pontos = calculatePointsForBet(p, jogo, points_cfg);
      p.pontos = pontos;

      const usuario = db.usuarios.find(u => u.id === p.usuario_id);
      if (usuario) {
        usuario.pontos_total += pontos;

        const maxPossivelExact = points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
        if (pontos === maxPossivelExact) {
          usuario.acertos_exato += 1;
        } else if (pontos > 0) {
          usuario.acertos_vencedor += 1;
        } else {
          usuario.erros += 1;
        }
      }
    }
  });

  saveDatabase(db);
}

let lastGlobalSyncTime = 0;

// Express app initialization
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware setups
  app.use(express.json());
  
  // Custom simple Helmet header layer for compliance
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Database auto-seed check on run
  await initializeDatabase();

  // Automatic Background Real-Time Match Synchronizer and Live Score Incrementor/Synchronizer
  // Runs every 60 seconds (1 minute), as recommended by the Football API documentation
  setInterval(async () => {
    try {
      const db = loadDatabase();
      const nowMs = new Date().getTime();
      
      const apiKey = db.configs_football.key;
      const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

      if (isRealApi) {
        // Real API configured
        const isActive = isAnyRoundWindowActive(db.jogos);
        const fifteenMinsMs = 15 * 60 * 1000;
        const timeSinceLastSync = nowMs - lastGlobalSyncTime;

        if (isActive || timeSinceLastSync >= fifteenMinsMs) {
          console.log(`[Auto-Sync Cron] Real API. Round active: ${isActive}. Interval elapsed: ${Math.round(timeSinceLastSync / 1000)}s. Initiating multi-competition automatic sync...`);
          
          let totalAdded = 0;
          let totalUpdated = 0;

          // 1. Sync Copa do Mundo (league 1)
          try {
            const res1 = await syncLeagueFromApi(db, 1);
            totalAdded += res1.addedCount;
            totalUpdated += res1.updatedCount;
          } catch (apiErr: any) {
            console.error(`[Auto-Sync Cron Exception] Copa do Mundo (League 1) sync failed:`, apiErr.message);
          }

          // 2. Sync Copa Libertadores (league 13) - if enabled by config
          const isLibertadoresActive = db.configs_libertadores?.ativo === true;
          if (isLibertadoresActive) {
            try {
              const res13 = await syncLeagueFromApi(db, 13);
              totalAdded += res13.addedCount;
              totalUpdated += res13.updatedCount;
            } catch (apiErr: any) {
              console.error(`[Auto-Sync Cron Exception] Copa Libertadores (League 13) sync failed:`, apiErr.message);
            }
          }

          // 3. Sync Brasileirão Série A (league 71) - if enabled by config
          const isBrasileiraoActive = db.configs_brasileirao?.ativo === true;
          if (isBrasileiraoActive) {
            try {
              const res71 = await syncLeagueFromApi(db, 71);
              totalAdded += res71.addedCount;
              totalUpdated += res71.updatedCount;
            } catch (apiErr: any) {
              console.error(`[Auto-Sync Cron Exception] Brasileirão (League 71) sync failed:`, apiErr.message);
            }
          }

          lastGlobalSyncTime = nowMs;

          if (totalAdded > 0 || totalUpdated > 0) {
            saveDatabase(db);
            refreshLeaderboard();
            console.log(`[Auto-Sync Cron] Multi-competition real-time sync completed. Added: ${totalAdded}, Updated: ${totalUpdated}.`);
          } else {
            console.log(`[Auto-Sync Cron] Multi-competition sync ran, no additions or changes to save.`);
          }
        } else {
          // If no active round and inside 15-minute window, we wait to respect API limits
          const nextSyncInSecs = Math.round((fifteenMinsMs - timeSinceLastSync) / 1000);
          console.log(`[Auto-Sync Cron] Standing by. Current state: Idle (no active round). Next query for all enabled leagues in ${nextSyncInSecs}s.`);
        }
      } else {
        // Fallback simulation branch for development (no real API key)
        let updatedCount = 0;

        db.jogos.forEach(g => {
          const gameMs = new Date(g.data_jogo).getTime();
          const elapsedMins = (nowMs - gameMs) / (1000 * 60);
          const isRealMatch = g.api_id && (g.api_id.startsWith("football_api_") || g.api_id.startsWith("libertadores_soccer_") || g.api_id.startsWith("brasileirao_soccer_"));
          
          // 1. Transition game from PENDENTE to AO_VIVO once the kickoff time has arrived/passed
          if (g.status === 'PENDENTE' && gameMs <= nowMs) {
            if (elapsedMins < 105) {
              g.status = 'AO_VIVO';
              if (g.placar_casa === null) g.placar_casa = 0;
              if (g.placar_fora === null) g.placar_fora = 0;
              
              if (elapsedMins < 45) g.status_detalhado = "1H";
              else if (elapsedMins < 60) g.status_detalhado = "HT";
              else g.status_detalhado = "2H";

              updatedCount++;
              console.log(`[Auto-Sync Backtimer Simulation] Jogo iniciado automaticamente: ${g.time_casa} x ${g.time_fora}`);
            } else {
              g.status = 'ENCERRADO';
              g.status_detalhado = "FT";
              if (g.placar_casa === null) g.placar_casa = Math.floor(Math.random() * 3);
              if (g.placar_fora === null) g.placar_fora = Math.floor(Math.random() * 3);
              updatedCount++;
              console.log(`[Auto-Sync Backtimer Simulation] Jogo encerrado automaticamente na inicialização: ${g.time_casa} x ${g.time_fora}`);
            }
          } 
          // 2. Simulating real-time game updates while AO_VIVO
          else if (g.status === 'AO_VIVO') {
            const prevDet = g.status_detalhado;
            if (elapsedMins < 45) g.status_detalhado = "1H";
            else if (elapsedMins < 60) g.status_detalhado = "HT";
            else if (elapsedMins < 105) g.status_detalhado = "2H";
            else g.status_detalhado = "FT";

            if (prevDet !== g.status_detalhado) {
              updatedCount++;
            }

            if (!isRealMatch) {
              // Increment goals slowly per minute during playtime for mock games only
              const shouldGoalCasa = Math.random() < 0.04; // 4% chance per minute to score
              const shouldGoalFora = Math.random() < 0.04; 
              
              if (shouldGoalCasa) {
                g.placar_casa = (g.placar_casa || 0) + 1;
                updatedCount++;
              }
              if (shouldGoalFora) {
                g.placar_fora = (g.placar_fora || 0) + 1;
                updatedCount++;
              }
            }

            // 3. Conclude game automatically after 105 minutes (90' plus halftime rest / extra time)
            if (elapsedMins >= 105) {
              g.status = 'ENCERRADO';
              g.status_detalhado = "FT";
              updatedCount++;
              console.log(`[Auto-Sync Backtimer Simulation] Jogo encerrado automaticamente: ${g.time_casa} x ${g.time_fora} (${g.placar_casa}x${g.placar_fora})`);
            }
          }
        });

        if (updatedCount > 0) {
          saveDatabase(db);
          refreshLeaderboard();
          console.log(`[Auto-Sync Backtimer Simulation] ${updatedCount} partidas atualizadas. Leaderboard e pontuações de usuários completamente recalculadas.`);
        }
      }
    } catch (err: any) {
      console.error("[Auto-Sync Backtimer Error]:", err.message);
    }
  }, 60000);

  // Authentication Middleware for Clients
  const verifyClientToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de acesso ausente ou inválido." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
      req.usuario = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "Sua seção expirou ou o token é inválido." });
    }
  };

  // Authentication Middleware for Administrators with specific permission hydration
  const verifyAdminToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token administrativo ausente." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string; name?: string };
      if (decoded.role !== "ADMIN") {
        return res.status(403).json({ error: "Acesso administrativo restrito." });
      }

      const db = loadDatabase();
      let permissions = {
        podeExcluir: true,
        podeEditar: true,
        podeAtivarCampeonato: true
      };

      if (decoded.email.toLowerCase() !== "suporte@unityautomacoes.com.br") {
        const matched = db.admins.find(a => a.email.toLowerCase() === decoded.email.toLowerCase());
        if (matched) {
          permissions = {
            podeExcluir: matched.podeExcluir !== false,
            podeEditar: matched.podeEditar !== false,
            podeAtivarCampeonato: matched.podeAtivarCampeonato !== false
          };
        } else {
          return res.status(403).json({ error: "Este usuário administrador foi removido ou não existe." });
        }
      }

      req.admin = {
        email: decoded.email,
        name: decoded.name || "Admin",
        role: "ADMIN",
        permissions
      };
      
      next();
    } catch (err) {
      return res.status(403).json({ error: "Sessão expirada. Faça login novamente como administrador." });
    }
  };

  // ==========================================
  // PUBLIC & CLIENT API ROUTES
  // ==========================================

  // Helper to verify contract block status with IXC Soft
  async function checkIxcClientBlocked(ixcId: string, db: LocalDatabase): Promise<{ blocked: boolean; reason?: string }> {
    const isOfflineMode = db.configs_ixc.offline_mode;
    if (isOfflineMode) {
      const matchedUser = db.usuarios.find(u => String(u.ixc_id) === String(ixcId));
      if (matchedUser && matchedUser.bloqueado) {
        return { blocked: true, reason: "Acesso suspenso por restrição administrativa ou simulação de bloqueio no sistema do Provedor." };
      }
      if (matchedUser && (matchedUser.nome.toLowerCase().includes("bloqueado") || matchedUser.email.toLowerCase().includes("bloqueado"))) {
        return { blocked: true, reason: "Bloqueado por falta de pagamento (Simulação modo offline)." };
      }
      return { blocked: false };
    }

    try {
      const authStr = Buffer.from(db.configs_ixc.token).toString("base64");
      const payload = {
        qtype: "cliente_contrato.id_cliente",
        query: String(ixcId),
        oper: "=",
        rp: "100",
        sortname: "cliente_contrato.id",
        sortorder: "desc"
      };

      const response = await axios.post(
        `${db.configs_ixc.url}/webservice/v1/cliente_contrato`,
        payload,
        {
          headers: {
            "Authorization": `Basic ${authStr}`,
            "Content-Type": "application/json",
            "ixcsoft": "listar"
          },
          timeout: db.configs_ixc.timeout || 5000
        }
      );

      if (response.data && response.data.registros && response.data.registros.length > 0) {
        const contratos = response.data.registros;
        let isAllowed = false;
        let blockedReason = "Nenhum contrato ativo localizado no sistema do Provedor.";

        for (const contrato of contratos) {
          const s = String(contrato.status).toUpperCase().trim();
          const sInt = String(contrato.status_internet).toUpperCase().trim();

          const isStatusOk = s === "A" || s === "FA";
          const isInternetOk = sInt === "A" || sInt === "FA";

          if (isStatusOk && isInternetOk) {
            isAllowed = true;
            break;
          } else {
            if (s === "CA" || s === "I" || sInt === "CA" || sInt === "I") {
              blockedReason = `Bloqueado por pendência financeira ou contrato inativo (Status: ${s}, Internet: ${sInt}).`;
            } else {
              blockedReason = `Contrato suspenso ou inativo (Status: ${s}, Internet: ${sInt}).`;
            }
          }
        }

        if (isAllowed) {
          return { blocked: false };
        } else {
          return { blocked: true, reason: blockedReason };
        }
      } else {
        return { blocked: true, reason: "Nenhum contrato localizado para este cliente no sistema do Provedor." };
      }
    } catch (err: any) {
      console.error("[IXC Contract Validation API Error]:", err.message);
      // Fallback safely to not block the user during API outages so they can still make guesses
      return { blocked: false };
    }
  }

  // Check if current user is blocked based on contract conditions
  app.get("/api/auth/check-block-status", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de acesso ausente ou inválido." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === "ADMIN") {
        return res.json({ blocked: false });
      }
      const db = loadDatabase();
      const usuario = db.usuarios.find(u => u.id === decoded.id);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não localizado." });
      }
      if (usuario.bloqueado) {
        return res.json({ blocked: true, reason: "Acesso suspenso por restrição administrativa." });
      }
      if (usuario.ixc_id) {
        const blockCheck = await checkIxcClientBlocked(usuario.ixc_id, db);
        return res.json({ blocked: blockCheck.blocked, reason: blockCheck.reason });
      }
      res.json({ blocked: false });
    } catch (err) {
      res.status(401).json({ error: "Seção expirada." });
    }
  });

  // CPF/CNPJ verification and integration with simulated/real IXC Soft
  app.post("/api/auth/ixc-validate", async (req, res) => {
    const { cpf_cnpj, nome_complementar, telefone, email, cidade } = req.body;
    
    if (!cpf_cnpj) {
      return res.status(400).json({ error: "Informe o CPF ou CNPJ cadastrado no provedor." });
    }

    // Clean formatting characters to ensure uniformity
    const cleanedCpfCnpj = cpf_cnpj.replace(/\D/g, "");
    if (cleanedCpfCnpj.length < 11) {
      return res.status(400).json({ error: "O documento deve conter no mínimo 11 dígitos numéricos." });
    }

    const db = loadDatabase();
    const isOfflineMode = db.configs_ixc.offline_mode;

    let customerFoundFromIxc = null;

    if (isOfflineMode) {
      // Offline mode simulation - search database clients or simulate success for testing
      const matchedLocal = db.usuarios.find(u => u.cpf_cnpj.replace(/\D/g, "") === cleanedCpfCnpj);
      
      if (matchedLocal) {
        customerFoundFromIxc = {
          id: String(matchedLocal.ixc_id),
          razao: matchedLocal.nome,
          cnpj_cpf: matchedLocal.cpf_cnpj,
          telefone_celular: matchedLocal.telefone,
          email: matchedLocal.email,
          cidade: matchedLocal.cidade,
          ativo: "S"
        };
      } else {
        // Only allow automatic mock generation if the CPF is in our official mock list.
        // This prevents creating fictitious participants like "Apostador Provedor" with real customers' documents.
        const mockCpfList = ["12345678900", "98765432111", "11122233344"];
        if (mockCpfList.includes(cleanedCpfCnpj)) {
          const inputNome = nome_complementar || `Apostador Provedor ${cleanedCpfCnpj.slice(-4)}`;
          const inputTel = telefone || "(49) 99100-2026";
          const inputEmail = email || `cliente.${cleanedCpfCnpj.slice(-4)}@exemplo.com`;
          const inputCidade = cidade || CIDADES_ATENDIDAS[Math.floor(Math.random() * CIDADES_ATENDIDAS.length)];

          customerFoundFromIxc = {
            id: String(Math.floor(Math.random() * 8000) + 1200),
            razao: inputNome,
            cnpj_cpf: cpf_cnpj,
            telefone_celular: inputTel,
            email: inputEmail,
            cidade: inputCidade,
            ativo: "S"
          };
        } else {
          // It's a real CPF. In simulation mode, we prevent generating fictitious user entries.
          return res.status(404).json({ 
            error: "Cliente não localizado. O modo offline de simulação está ativo e apenas aceita CPFs de teste recomendados. Para usar este CPF de um cliente real, mude as definições de Integração IXC para Modo Real no painel administrativo." 
          });
        }
      }

      addLog("Sistema IXC (Simulação)", "CONSULTA_CLIENTE", `Cliente consultado no CPF ${cpf_cnpj}. Encontrado: S`, req);
    } else {
      // Live Mode API Request via Curl implementation
      try {
        const authStr = Buffer.from(db.configs_ixc.token).toString("base64");

        // Try standard unformatted numbers-only query first (how IXC standardizes storage)
        const payloadClean = {
          qtype: "cliente.cnpj_cpf",
          query: cleanedCpfCnpj,
          oper: "=",
          rp: "1",
          sortname: "cliente.id",
          sortorder: "desc"
        };
        
        let response = await axios.post(
          `${db.configs_ixc.url}/webservice/v1/cliente`,
          payloadClean,
          {
            headers: {
              "Authorization": `Basic ${authStr}`,
              "Content-Type": "application/json",
              "ixcsoft": "listar"
            },
            timeout: db.configs_ixc.timeout || 5000
          }
        );

        // Fallback to formatted string query if clean CPF didn't match and the original has formatting
        if ((!response.data || !response.data.registros || response.data.registros.length === 0) && cpf_cnpj !== cleanedCpfCnpj) {
          const payloadFormatted = {
            qtype: "cliente.cnpj_cpf",
            query: cpf_cnpj,
            oper: "=",
            rp: "1",
            sortname: "cliente.id",
            sortorder: "desc"
          };
          response = await axios.post(
            `${db.configs_ixc.url}/webservice/v1/cliente`,
            payloadFormatted,
            {
              headers: {
                "Authorization": `Basic ${authStr}`,
                "Content-Type": "application/json",
                "ixcsoft": "listar"
              },
              timeout: db.configs_ixc.timeout || 5000
            }
          );
        }

        // Parse result
        if (response.data && response.data.registros && response.data.registros.length > 0) {
          const matchedReg = response.data.registros[0];
          if (matchedReg.ativo === 'S') {
            let cityName = "Chapecó";
            if (matchedReg.cidade) {
              const cityQuery = String(matchedReg.cidade).trim();
              if (/^\d+$/.test(cityQuery)) {
                try {
                  const cityPayload = {
                    qtype: "cidade.id",
                    query: cityQuery,
                    oper: "=",
                    rp: "1",
                    sortname: "cidade.id",
                    sortorder: "desc"
                  };
                  
                  const cityResponse = await axios.post(
                    `${db.configs_ixc.url}/webservice/v1/cidade`,
                    cityPayload,
                    {
                      headers: {
                        "Authorization": `Basic ${authStr}`,
                        "Content-Type": "application/json",
                        "ixcsoft": "listar"
                      },
                      timeout: db.configs_ixc.timeout || 5000
                    }
                  );
                  
                  if (cityResponse.data && cityResponse.data.registros && cityResponse.data.registros.length > 0) {
                    const matchedCity = cityResponse.data.registros[0];
                    if (matchedCity.nome) {
                      cityName = matchedCity.nome;
                      if (matchedCity.uf) {
                        const ufId = String(matchedCity.uf).trim();
                        if (/^\d+$/.test(ufId)) {
                          try {
                            const ufPayload = {
                              qtype: "uf.id",
                              query: ufId,
                              oper: "=",
                              rp: "1",
                              sortname: "uf.id",
                              sortorder: "desc"
                            };
                            
                            const ufResponse = await axios.post(
                              `${db.configs_ixc.url}/webservice/v1/uf`,
                              ufPayload,
                              {
                                headers: {
                                  "Authorization": `Basic ${authStr}`,
                                  "Content-Type": "application/json",
                                  "ixcsoft": "listar"
                                },
                                timeout: db.configs_ixc.timeout || 5000
                              }
                            );
                            
                            if (ufResponse.data && ufResponse.data.registros && ufResponse.data.registros.length > 0) {
                              const matchedUf = ufResponse.data.registros[0];
                              const ufLabel = matchedUf.sigla || matchedUf.nome || ufId;
                              cityName = `${matchedCity.nome} - ${String(ufLabel).toUpperCase()}`;
                            } else {
                              cityName = `${matchedCity.nome} - ${ufId}`;
                            }
                          } catch (ufErr: any) {
                            console.error("[IXC UF API] Failed to fetch UF details for ID: " + ufId, ufErr.message);
                            cityName = `${matchedCity.nome} - ${ufId}`;
                          }
                        } else {
                          cityName = `${matchedCity.nome} - ${String(matchedCity.uf).toUpperCase()}`;
                        }
                      }
                    }
                  }
                } catch (cityErr: any) {
                  console.error("[IXC City API] Failed to fetch city details for ID: " + cityQuery, cityErr.message);
                }
              } else {
                cityName = matchedReg.cidade;
              }
            }

            customerFoundFromIxc = {
              id: matchedReg.id,
              razao: matchedReg.razao,
              cnpj_cpf: matchedReg.cnpj_cpf,
              telefone_celular: matchedReg.telefone_celular || matchedReg.whatsapp || matchedReg.fone || "",
              email: matchedReg.email,
              cidade: cityName,
              ativo: matchedReg.ativo
            };
          } else {
            return res.status(403).json({ error: "Cadastro encontrado no provedor está marcado como INATIVO." });
          }
        }
        
        addLog("API IXC Soft", "CONSULTA_POST_LISTAR", `Busca de ${cpf_cnpj} via webservice. Encontrados: ${customerFoundFromIxc ? 1 : 0}`, req);
      } catch (axErr: any) {
        addLog("Erro IXC Soft", "EXCECAO_CONEXAO", `Erro de comunicação na consulta do CPF ${cpf_cnpj}: ${axErr.message}`, req);
        return res.status(502).json({ 
          error: "Erro de autenticação de infraestrutura na API do provedor. Use o recurso de simulação no menu do painel admin caso persista." 
        });
      }
    }

    if (!customerFoundFromIxc) {
      return res.status(404).json({ error: "Cliente não encontrado nos cadastros ativos do Provedor." });
    }

    // Now, synchronize local DB User or register them
    let usuarioLocal = db.usuarios.find(u => u.ixc_id === customerFoundFromIxc.id);

    if (!usuarioLocal) {
      const newUId = db.usuarios.length > 0 ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1;
      usuarioLocal = {
        id: newUId,
        ixc_id: customerFoundFromIxc.id,
        nome: customerFoundFromIxc.razao,
        cpf_cnpj: customerFoundFromIxc.cnpj_cpf,
        telefone: customerFoundFromIxc.telefone_celular,
        email: customerFoundFromIxc.email,
        cidade: customerFoundFromIxc.cidade || "Chapecó",
        avatar: "⚽",
        pontos_total: 0,
        acertos_exato: 0,
        acertos_vencedor: 0,
        erros: 0,
        bloqueado: false,
        created_at: new Date().toISOString()
      };
      db.usuarios.push(usuarioLocal);
      saveDatabase(db);
      addLog(usuarioLocal.nome, "AUTO_CADASTRO", `Novo palpiteiro ativo registrado automaticamente pelo ID IXC ${usuarioLocal.ixc_id}`, req);
    } else {
      if (usuarioLocal.bloqueado) {
        return res.status(403).json({ error: "Acesso suspenso por restrição administrativa." });
      }
    }

    // Create login session token
    const token = jwt.sign(
      { id: usuarioLocal.id, nome: usuarioLocal.nome },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      usuario: usuarioLocal
    });
  });

  // Admin login credentials handler
  app.post("/api/auth/admin-login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Forneça email de administrador e senha." });
    }

    // Standard requested superuser: suporte@unityautomacoes.com.br / 200616
    if (email === "suporte@unityautomacoes.com.br" && password === "200616") {
      const token = jwt.sign(
        { email, role: "ADMIN", name: "Suporte Unity" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      addLog("Admin (Suporte)", "LOGIN_CONCEDIDO", "Acesso autenticado do usuário administrador padrão.", req);
      return res.json({
        success: true,
        token,
        admin: { email, nome: "Suporte Unity" }
      });
    }

    const db = loadDatabase();
    // Support alternate logins optionally
    const matchedAdmin = db.admins.find(a => a.email.toLowerCase() === email.toLowerCase());
    
    // Check if custom password matches, or fallback password matches
    const isPasswordValid = matchedAdmin && (
      (matchedAdmin.senha && password === matchedAdmin.senha) ||
      (!matchedAdmin.senha && password === "200616") ||
      (password === "200616")
    );

    if (matchedAdmin && isPasswordValid) {
      const token = jwt.sign(
        { email, role: "ADMIN", name: matchedAdmin.nome },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      addLog(matchedAdmin.nome, "LOGIN_CONCEDIDO", "Acesso concedido para admin cadastrado secundário.", req);
      return res.json({
        success: true,
        token,
        admin: { email: matchedAdmin.email, nome: matchedAdmin.nome }
      });
    }

    addLog("Intrusão", "TENTATIVA_LOGIN_FALHOU", `Falha de login de administrador usando email: ${email}`, req);
    return res.status(401).json({ error: "Credenciais de administrador inválidas." });
  });

  // Get current state of games combined with user guesses
  app.get("/api/jogos", async (req: any, res) => {
    const db = loadDatabase();
    const sortedGames = [...db.jogos].sort((a,b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime());

    // Express client identifier token is optional
    const authHeader = req.headers.authorization;
    let userId: number | null = null;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded) {
          if (decoded.role === "ADMIN") {
            isAdmin = true;
            userId = 999999;
          } else {
            userId = decoded.id;
          }
        }
      } catch (err) {}
    }

    const isLibActive = db.configs_libertadores?.ativo === true;
    const isCopaActive = db.configs_copa_mundo?.ativo !== false;
    const isBrasileiraoActive = db.configs_brasileirao?.ativo === true;
    let filteredGames = sortedGames;
    if (!isAdmin) {
      if (!isLibActive) {
        filteredGames = filteredGames.filter(j => getGameCampeonato(j) !== 'LIBERTADORES');
      }
      if (!isBrasileiraoActive) {
        filteredGames = filteredGames.filter(j => getGameCampeonato(j) !== 'BRASILEIRAO');
      }
      if (!isCopaActive) {
        filteredGames = filteredGames.filter(j => getGameCampeonato(j) !== 'COPA_MUNDO');
      }
    }

    let rawUserGuesses: Palpite[] = [];
    if (userId) {
      rawUserGuesses = db.palpites.filter(p => p.usuario_id === userId);
    }

    const enriched = filteredGames.map(g => enrichGameDetails(g));

    res.json({
      jogos: enriched,
      palpites: rawUserGuesses,
      data_servidor: new Date().toISOString()
    });
  });

  // Put a new user bet or update
  app.post("/api/palpites", async (req: any, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de acesso ausente ou inválido." });
    }
    const token = authHeader.split(" ")[1];
    let userId: number;
    let userName: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === "ADMIN") {
        userId = 999999;
        userName = "Suporte Unity";
      } else {
        userId = decoded.id;
        userName = decoded.name;
      }
    } catch (err) {
      return res.status(403).json({ error: "Sua seção expirou ou o token é inválido." });
    }

    const { jogo_id, placar_casa, placar_fora } = req.body;

    if (jogo_id === undefined || placar_casa === undefined || placar_fora === undefined) {
      return res.status(400).json({ error: "Dados incompletos para envio do palpite." });
    }

    const numPlacarCasa = parseInt(placar_casa, 10);
    const numPlacarFora = parseInt(placar_fora, 10);

    if (isNaN(numPlacarCasa) || isNaN(numPlacarFora) || numPlacarCasa < 0 || numPlacarFora < 0) {
      return res.status(400).json({ error: "Os placares informados devem ser números positivos." });
    }

    const db = loadDatabase();

    // Verify if the user is contract-blocked for finance/non-payment reasons
    if (userId !== 999999) {
      const usuario = db.usuarios.find(u => u.id === userId);
      if (usuario) {
        if (usuario.bloqueado) {
          return res.status(403).json({ error: "Acesso suspenso por restrição administrativa." });
        }
        if (usuario.ixc_id) {
          const blockCheck = await checkIxcClientBlocked(usuario.ixc_id, db);
          if (blockCheck.blocked) {
            return res.status(403).json({ 
              error: `Seu palpite não pôde ser salvo porque seu contrato está bloqueado no Provedor: ${blockCheck.reason || "Falta de pagamento."}` 
            });
          }
        }
      }
    }
    const jogo = db.jogos.find(j => j.id === Number(jogo_id));

    if (!jogo) {
      return res.status(404).json({ error: "Partida de destino não encontrada." });
    }

    // Rules constraint: block guesses 1 hour before scheduled start
    const serverTime = new Date().getTime();
    const gameTime = new Date(jogo.data_jogo).getTime();
    const lockMarginMs = 60 * 60 * 1000; // 1 hour in MS

    if (gameTime - serverTime < lockMarginMs) {
      return res.status(400).json({ 
        error: `Palpites para esta partida encerraram em ${new Date(gameTime - lockMarginMs).toLocaleString("pt-BR")}. O bloqueio acontece 1 hora antes de iniciar!`
      });
    }

    if (jogo.status !== 'PENDENTE') {
      return res.status(400).json({ error: "Esta partida já iniciou ou foi encerrada." });
    }

    // Check existing
    let existingBet = db.palpites.find(p => p.usuario_id === userId && p.jogo_id === Number(jogo_id));

    if (existingBet) {
      existingBet.placar_casa = numPlacarCasa;
      existingBet.placar_fora = numPlacarFora;
      existingBet.created_at = new Date().toISOString();
    } else {
      const newBId = db.palpites.length > 0 ? Math.max(...db.palpites.map(p => p.id)) + 1 : 1;
      existingBet = {
        id: newBId,
        usuario_id: userId,
        jogo_id: Number(jogo_id),
        placar_casa: numPlacarCasa,
        placar_fora: numPlacarFora,
        pontos: null,
        created_at: new Date().toISOString()
      };
      db.palpites.push(existingBet);
    }

    saveDatabase(db);
    addLog(userName, "PARTICIPACAO_PALPITE", `Registrou palpite: ${jogo.time_casa} ${numPlacarCasa} x ${numPlacarFora} ${jogo.time_fora}`, req);

    res.json({ success: true, palpite: existingBet });
  });

  // Proxy endpoint to fetch real-time game statistics from API Football can fall back to deterministic mock stats
  app.get("/api/jogos/:id/estatisticas", async (req, res) => {
    try {
      const db = loadDatabase();
      const jogoId = parseInt(req.params.id);
      const jogo = db.jogos.find(j => j.id === jogoId);
      if (!jogo) {
        return res.status(404).json({ error: "Partida não encontrada." });
      }

      // Check if the game has started or is concluded
      const nowMs = Date.now();
      const kickoffMs = new Date(jogo.data_jogo).getTime();
      const isConcluded = jogo.status === 'ENCERRADO' || ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST', 'CANX'].includes((jogo.status_detalhado || '').toUpperCase());
      const isLive = jogo.status === 'AO_VIVO' || ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'SUSP', 'INT'].includes((jogo.status_detalhado || '').toUpperCase());
      const hasStarted = isLive || isConcluded || nowMs >= kickoffMs;

      if (!hasStarted) {
        return res.json({ source: "awaiting", data: [] });
      }

      const apiKey = db.configs_football?.key;
      const apiUrl = db.configs_football?.url || "https://v3.football.api-sports.io";
      const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

      let fixtureId: number | null = null;
      if (jogo.api_id) {
        const match = jogo.api_id.match(/^(?:football_api_|libertadores_soccer_|brasileirao_soccer_|soccer_)?(\d+)$/);
        if (match) fixtureId = parseInt(match[1]);
      }

      const fallbackStats = generateDeterministicStats(jogoId);

      if (isRealApi && fixtureId) {
        try {
          console.log(`[API Proxy] Fetching statistics from API Football for fixture ID: ${fixtureId}...`);
          const response = await axios.get(`${apiUrl}/fixtures/statistics`, {
            params: { fixture: fixtureId },
            headers: { "x-apisports-key": apiKey },
            timeout: 5000
          });

          if (response.data && response.data.response && response.data.response.length > 0) {
            const apiResponse = response.data.response;
            const formattedStats = parseApiStats(apiResponse, jogo);
            return res.json({ source: "api", data: formattedStats });
          }
        } catch (err: any) {
          console.error("[API Proxy Error] Error fetching statistics from API-Sports:", err.message);
        }
      }

      return res.json({ source: "fallback", data: fallbackStats });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Proxy endpoint to fetch real starting XI and coach lineups from API Football or fallback to deterministic mock rosters
  app.get("/api/jogos/:id/escalacao", async (req, res) => {
    try {
      const db = loadDatabase();
      const jogoId = parseInt(req.params.id);
      const jogo = db.jogos.find(j => j.id === jogoId);
      if (!jogo) {
        return res.status(404).json({ error: "Partida não encontrada." });
      }

      const nowMs = Date.now();
      const kickoffMs = new Date(jogo.data_jogo).getTime();
      const timeToKickoffMin = (kickoffMs - nowMs) / (60 * 1000);
      const isConcluded = jogo.status === 'ENCERRADO' || ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST', 'CANX'].includes((jogo.status_detalhado || '').toUpperCase());
      const isLive = jogo.status === 'AO_VIVO' || ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'SUSP', 'INT'].includes((jogo.status_detalhado || '').toUpperCase());
      const hasStarted = isLive || isConcluded || nowMs >= kickoffMs;

      // If the match is in the future and kickoff is more than 60 minutes away:
      if (!hasStarted && timeToKickoffMin > 60) {
        return res.json({ source: "awaiting", data: null });
      }

      const apiKey = db.configs_football?.key;
      const apiUrl = db.configs_football?.url || "https://v3.football.api-sports.io";
      const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

      let fixtureId: number | null = null;
      if (jogo.api_id) {
        const match = jogo.api_id?.match(/^(?:football_api_|libertadores_soccer_|brasileirao_soccer_|soccer_)?(\d+)$/);
        if (match) fixtureId = parseInt(match[1]);
      }

      if (isRealApi && fixtureId) {
        try {
          console.log(`[API Proxy] Fetching lineups from API Football for fixture ID: ${fixtureId}...`);
          const response = await axios.get(`${apiUrl}/fixtures/lineups`, {
            params: { fixture: fixtureId },
            headers: { "x-apisports-key": apiKey },
            timeout: 5000
          });

          if (response.data && response.data.response && response.data.response.length > 0) {
            const apiLineups = response.data.response;
            const parsedLineup = parseApiLineup(apiLineups, jogo);
            const hasPlayers = (parsedLineup.titular_casa && parsedLineup.titular_casa.length > 0) || 
                              (parsedLineup.titular_fora && parsedLineup.titular_fora.length > 0);
            if (hasPlayers) {
              return res.json({ source: "api", data: parsedLineup });
            }
          }
        } catch (err: any) {
          console.error("[API Proxy Error] Error fetching lineups from API-Sports:", err.message);
        }

        // If it is a future match and the real API is enabled but has not returned actual lineups yet, return empty/awaiting
        if (!hasStarted) {
          return res.json({ source: "awaiting", data: null });
        }
      }

      // If it is a future match, do not return fictitious mock rosters
      if (!hasStarted) {
        return res.json({ source: "awaiting", data: null });
      }

      // Load deterministic mock lineup from our gameEnricher module only for active or completed games
      const { enrichGameDetails } = require("./src/utils/gameEnricher");
      const enrichedJogo = enrichGameDetails(jogo);
      const fallbackLineup = enrichedJogo.escalacao || {
        titular_casa: [],
        titular_fora: [],
        reservas_casa: [],
        reservas_fora: [],
        tecnico_casa: "",
        tecnico_fora: ""
      };

      return res.json({ source: "fallback", data: fallbackLineup });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Proxy endpoint to fetch real events from API Football with custom realistic fallback based on the final score
  app.get("/api/jogos/:id/eventos", async (req, res) => {
    try {
      const db = loadDatabase();
      const jogoId = parseInt(req.params.id);
      const jogo = db.jogos.find(j => j.id === jogoId);
      if (!jogo) {
        return res.status(404).json({ error: "Partida não encontrada." });
      }

      const nowMs = Date.now();
      const kickoffMs = new Date(jogo.data_jogo).getTime();
      const isConcluded = jogo.status === 'ENCERRADO' || ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST', 'CANX'].includes((jogo.status_detalhado || '').toUpperCase());
      const isLive = jogo.status === 'AO_VIVO' || ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'SUSP', 'INT'].includes((jogo.status_detalhado || '').toUpperCase());
      const hasStarted = isLive || isConcluded || nowMs >= kickoffMs;

      // Same as other cards, if not started yet: awaiting information
      if (!hasStarted) {
        return res.json({ source: "awaiting", data: [] });
      }

      const apiKey = db.configs_football?.key;
      const apiUrl = db.configs_football?.url || "https://v3.football.api-sports.io";
      const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

      let fixtureId: number | null = null;
      if (jogo.api_id) {
        const match = jogo.api_id.match(/^(?:football_api_|libertadores_soccer_|brasileirao_soccer_|soccer_)?(\d+)$/);
        if (match) fixtureId = parseInt(match[1]);
      }

      if (isRealApi && fixtureId) {
        try {
          console.log(`[API Proxy] Fetching events from API Football for fixture ID: ${fixtureId}...`);
          const response = await axios.get(`${apiUrl}/fixtures/events`, {
            params: { fixture: fixtureId },
            headers: { "x-apisports-key": apiKey },
            timeout: 5000
          });

          if (response.data && response.data.response && response.data.response.length > 0) {
            return res.json({ source: "api", data: response.data.response });
          }
        } catch (err: any) {
          console.error("[API Proxy Error] Error fetching events from API-Sports:", err.message);
        }
      }

      // If no API or API failed, let's create a realistic fallback based on the actual score
      const fallbackEvents = generateDeterministicEvents(jogo, nowMs);
      return res.json({ source: "fallback", data: fallbackEvents });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get Copa World Cup round-by-round winners
  app.get("/api/vencedores-rodadas", (req, res) => {
    const db = loadDatabase();
    const points_cfg = db.configs_points;

    // Optional Bearer token parse for LGPD compliant name unmask of logged in user
    const authHeader = req.headers.authorization;
    let loggedInUserId: number | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        loggedInUserId = decoded.id;
      } catch (e) {}
    }

    // Filter only COPA_MUNDO matches (where api_id does not contain libertadores or brasileirao)
    const copaGames = db.jogos.filter(jogo => {
      if (jogo.api_id) {
        const idLower = jogo.api_id.toLowerCase();
        if (idLower.includes("libertadores") || idLower.includes("brasileirao")) {
          return false;
        }
      }
      return true;
    });

    // Group Copa matches by round (rodada)
    const roundsMap: { [key: number]: Jogo[] } = {};
    copaGames.forEach(g => {
      if (!roundsMap[g.rodada]) {
        roundsMap[g.rodada] = [];
      }
      roundsMap[g.rodada].push(g);
    });

    const rounds = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
    const result: any[] = [];

    // For each round, calculate scores of all users
    rounds.forEach(rodadaNum => {
      // Don't show round 8 (Final) as round prize based on prompt: "somente na final que não vai ter premiar por rodada"
      if (rodadaNum === 8) return;

      const gamesInRound = roundsMap[rodadaNum];
      const gamesInRoundIds = gamesInRound.map(g => g.id);

      // Check if there is at least one game that has started/finished in this round
      const roundHasProgress = gamesInRound.some(g => g.status === 'ENCERRADO' || g.status === 'AO_VIVO');
      if (!roundHasProgress) return;

      const userScoresInRound = db.usuarios
        .filter(u => !u.bloqueado && u.id !== 999999)
        .map(u => {
          const userBetsInRound = db.palpites.filter(p => p.usuario_id === u.id && gamesInRoundIds.includes(p.jogo_id));
          
          let roundPoints = 0;
          let roundExacts = 0;
          let roundErrors = 0;

          userBetsInRound.forEach(bet => {
            const jogo = gamesInRound.find(g => g.id === bet.jogo_id);
            if (jogo && (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO')) {
              const pts = calculatePointsForBet(bet, jogo, points_cfg);
              roundPoints += pts;

              const maxPossivelExact = points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
              if (pts === maxPossivelExact) {
                roundExacts += 1;
              } else if (pts > 0) {
                // simple winner
              } else {
                roundErrors += 1;
              }
            }
          });

          return {
            id: u.id,
            nome: u.nome,
            cidade: u.cidade,
            pontos: roundPoints,
            acertos_exato: roundExacts,
            erros: roundErrors,
            fator: roundPoints * 100 + roundExacts * 10 - roundErrors
          };
        })
        .filter(u => {
          const userBetsInRound = db.palpites.some(p => p.usuario_id === u.id && gamesInRoundIds.includes(p.jogo_id));
          return userBetsInRound;
        });

      // Sort by points desc, exacts desc, errors asc, name asc
      userScoresInRound.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.acertos_exato !== a.acertos_exato) return b.acertos_exato - a.acertos_exato;
        if (a.erros !== b.erros) return a.erros - b.erros;
        return a.nome.localeCompare(b.nome);
      });

      // Are all games in this round ENCERRADO?
      const allClosed = gamesInRound.every(g => g.status === 'ENCERRADO');

      result.push({
        rodada: rodadaNum,
        status: allClosed ? "ENCERRADO" : "EM_ANDAMENTO",
        vencedores: userScoresInRound.slice(0, 3).map((u, idx) => {
          const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
          const displayName = isSelf ? u.nome : maskName(u.nome);
          return {
            posicao: idx + 1,
            id: u.id,
            nome: displayName,
            cidade: u.cidade,
            pontos: u.pontos,
            acertos_exato: u.acertos_exato
          };
        })
      });
    });

    res.json(result);
  });

  // Get active statistics rankings
  app.get("/api/ranking", (req, res) => {
    const db = loadDatabase();
    
    // Optional Bearer token parse for LGPD compliant name unmask of logged in user
    const authHeader = req.headers.authorization;
    let loggedInUserId: number | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        loggedInUserId = decoded.id;
      } catch (e) {}
    }

    // Sort customers descending points, then by success tags, then name
    const leaderData = db.usuarios
      .filter(u => !u.bloqueado && u.id !== 999999)
      .map(u => {
        const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
        const displayName = isSelf ? u.nome : maskName(u.nome);
        return {
          id: u.id,
          nome: displayName,
          cidade: u.cidade,
          pontos: u.pontos_total,
          acertos_exato: u.acertos_exato,
          acertos_vencedor: u.acertos_vencedor,
          erros: u.erros,
          fator: u.pontos_total * 100 + u.acertos_exato * 10 - u.erros // resolving tiebreakers
        };
      })
      .sort((a,b) => {
        if (b.pontos !== a.pontos) {
          return b.pontos - a.pontos;
        }
        if (b.acertos_exato !== a.acertos_exato) {
          return b.acertos_exato - a.acertos_exato;
        }
        return a.nome.localeCompare(b.nome);
      });

    res.json(leaderData);
  });

  // Return public rule metrics
  app.get("/api/metrics-public", (req, res) => {
    const db = loadDatabase();
    const countUsers = db.usuarios.length;
    const countBets = db.palpites.length;
    
    // Optional Bearer token parse for LGPD compliant name unmask of logged in user
    const authHeader = req.headers.authorization;
    let loggedInUserId: number | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        loggedInUserId = decoded.id;
      } catch (e) {}
    }

    // Top 10 users overview
    const topUsers = db.usuarios
      .filter(u => !u.bloqueado)
      .sort((a,b) => {
        if (b.pontos_total !== a.pontos_total) {
          return b.pontos_total - a.pontos_total;
        }
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 10)
      .map((u, idx) => {
        const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
        const displayName = isSelf ? u.nome : maskName(u.nome);
        return {
          posicao: idx + 1,
          nome: displayName,
          cidade: u.cidade,
          pontos: u.pontos_total,
          avatar: u.avatar || "⚽"
        };
      });

    res.json({
      total_usuarios: countUsers,
      total_palpites: countBets,
      top_15: topUsers,
      data_servidor: new Date().toISOString(),
      ixc_offline_mode: db.configs_ixc.offline_mode
    });
  });

  // ==========================================
  // ADMINISTRATOR CONTROLS
  // ==========================================

  // Dashboard performance counters
  app.get("/api/admin/metrics", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    
    // Metrics compilation
    const totalUsers = db.usuarios.length;
    const blockedUsers = db.usuarios.filter(u => u.bloqueado).length;
    const totalPalpites = db.palpites.length;
    const totalJogos = db.jogos.length;
    const activeJogos = db.jogos.filter(j => j.status === 'AO_VIVO').length;

    // Cities segmentation
    const cityTallies: { [key: string]: number } = {};
    db.usuarios.forEach(u => {
      const city = u.cidade || "Não Definido";
      cityTallies[city] = (cityTallies[city] || 0) + 1;
    });

    const formattedCities = Object.keys(cityTallies).map(city => ({
      name: city,
      count: cityTallies[city]
    })).sort((a,b) => b.count - a.count);

    // Distribution graph score brackets
    // 0-5, 6-10, 11-15, 16-20, 21-25, 26+
    const distribution = {
      "0-5 pts": db.usuarios.filter(u => u.pontos_total <= 5).length,
      "6-15 pts": db.usuarios.filter(u => u.pontos_total > 5 && u.pontos_total <= 15).length,
      "16-25 pts": db.usuarios.filter(u => u.pontos_total > 15 && u.pontos_total <= 25).length,
      "26+ pts": db.usuarios.filter(u => u.pontos_total > 25).length,
    };

    res.json({
      counters: {
        total_usuarios: totalUsers,
        usuarios_bloqueados: blockedUsers,
        total_palpites: totalPalpites,
        total_jogos: totalJogos,
        jogos_ativo: activeJogos
      },
      cities: formattedCities,
      distribuicao: distribution,
      logs_recents: db.logs.slice(0, 15),
      config_con_ixc: db.configs_ixc.offline_mode ? "SIMULAÇÃO ATIVA" : "PRODUÇÃO CONECTADA",
      config_con_soccer: db.configs_football.status_conexao
    });
  });

  // Client user directory administration 
  app.get("/api/admin/usuarios", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.usuarios);
  });

  // Get detailed palpites of a specific user for administrative audit/view
  app.get("/api/admin/usuarios/:id/palpites", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    const id = Number(req.params.id);
    const user = db.usuarios.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "Participante não localizado." });
    }
    const userPalpites = db.palpites.filter(p => p.usuario_id === id);
    res.json({
      usuario: user,
      palpites: userPalpites
    });
  });

  // Update client data or points
  app.post("/api/admin/usuarios/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para editar dados." });
    }

    const id = Number(req.params.id);
    const { nome, telefone, email, cidade, pontos_total, reset } = req.body;

    const db = loadDatabase();
    const userIndex = db.usuarios.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilizador não localizado." });
    }

    const item = db.usuarios[userIndex];

    if (reset) {
      item.pontos_total = 0;
      item.acertos_exato = 0;
      item.acertos_vencedor = 0;
      item.erros = 0;
      // Also delete user bets
      db.palpites = db.palpites.filter(p => p.usuario_id !== id);
      if (prisma) {
        prisma.palpite.deleteMany({ where: { usuario_id: id } }).catch((err: any) => {
          console.error(`[MySQL Sync] Failed to delete palpites for reset user ${id}:`, err.message);
        });
      }
      addLog(req.admin.name || "Admin", "RESETA_SCORE", `Zerado os pontos e excluído palpites de ${item.nome}`, req);
    } else {
      if (nome) item.nome = nome;
      if (telefone) item.telefone = telefone;
      if (email) item.email = email;
      if (cidade) item.cidade = cidade;
      if (pontos_total !== undefined) item.pontos_total = Number(pontos_total);
      
      addLog(req.admin.name || "Admin", "EDITA_ATRIBUTOS_USUARIO", `Alterou atributos cadastrais de ${item.nome}`, req);
    }

    saveDatabase(db);
    refreshLeaderboard(); // secure correct recalculations

    res.json({ success: true, usuario: db.usuarios[userIndex] });
  });

  // Toggle blocking customer
  app.post("/api/admin/usuarios/:id/block", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar estados ou editar dados." });
    }

    const id = Number(req.params.id);
    const db = loadDatabase();
    const user = db.usuarios.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ error: "Palpiteiro não encontrado." });
    }

    user.bloqueado = !user.bloqueado;
    saveDatabase(db);
    addLog(req.admin.name || "Admin", "MODERACAO_SUSPENSAO", `${user.bloqueado ? 'BLOQUEOU' : 'DESBLOQUEOU'} participante ${user.nome}`, req);

    res.json({ success: true, usuario: user });
  });

  // Delete customer fully
  app.delete("/api/admin/usuarios/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeExcluir) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para excluir registros." });
    }

    const id = Number(req.params.id);
    const db = loadDatabase();
    
    const user = db.usuarios.find(u => u.id === id);
    if (!user) {
       return res.status(404).json({ error: "Usuário não localizado." });
    }

    db.usuarios = db.usuarios.filter(u => u.id !== id);
    db.palpites = db.palpites.filter(p => p.usuario_id !== id);
    
    saveDatabase(db);
    
    if (prisma) {
      prisma.usuario.delete({ where: { id } }).catch((err: any) => {
        console.error(`[MySQL Sync] Failed to explicitly delete user ${id} from MySQL:`, err.message);
      });
    }

    addLog(req.admin.name || "Admin", "EXCLUSAO_CADASTRO", `Removido participante ${user.nome} e seus palpites`, req);

    res.json({ success: true });
  });

  // SUB-ADMINS DIRECTORY ROUTES
  app.get("/api/admin/sub-admins", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.admins || []);
  });

  app.post("/api/admin/sub-admins", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para cadastrar ou editar usuários administradores." });
    }
    
    const db = loadDatabase();
    if (!db.admins) {
      db.admins = [];
    }

    const { id, email, nome, senha, podeExcluir, podeEditar, podeAtivarCampeonato } = req.body;

    if (!email || !nome) {
      return res.status(400).json({ error: "Preencha Nome e E-mail obrigatoriamente." });
    }

    // Check email uniqueness, ignoring current sub-admin
    const emailExists = db.admins.some((a: any) => a.email.toLowerCase() === email.toLowerCase() && a.id !== id) || 
                        email.toLowerCase() === "suporte@unityautomacoes.com.br";
    if (emailExists) {
      return res.status(400).json({ error: "Este email já está sendo utilizado por outro administrador." });
    }

    if (id) {
      // Edit mode
      const idx = db.admins.findIndex((a: any) => a.id === id);
      if (idx !== -1) {
        db.admins[idx] = {
          ...db.admins[idx],
          email,
          nome,
          senha: senha || db.admins[idx].senha,
          podeExcluir: podeExcluir === undefined ? db.admins[idx].podeExcluir : !!podeExcluir,
          podeEditar: podeEditar === undefined ? db.admins[idx].podeEditar : !!podeEditar,
          podeAtivarCampeonato: podeAtivarCampeonato === undefined ? db.admins[idx].podeAtivarCampeonato : !!podeAtivarCampeonato
        };
        addLog(req.admin.name, "EDICAO_SUB_ADMIN", `Editou o sub-administrador: ${nome} (${email})`, req);
        saveDatabase(db);
        return res.json({ success: true, admin: db.admins[idx] });
      } else {
        return res.status(404).json({ error: "Sub-computador administrativo não cadastrado." });
      }
    } else {
      // Create mode
      const newId = db.admins.length > 0 ? Math.max(...db.admins.map((a: any) => a.id)) + 1 : 1;
      const newAdmin = {
        id: newId,
        email,
        nome,
        senha: senha || "200616",
        podeExcluir: podeExcluir === undefined ? true : !!podeExcluir,
        podeEditar: podeEditar === undefined ? true : !!podeEditar,
        podeAtivarCampeonato: podeAtivarCampeonato === undefined ? true : !!podeAtivarCampeonato
      };
      db.admins.push(newAdmin);
      addLog(req.admin.name, "CADASTRO_SUB_ADMIN", `Cadastrou o sub-administrador: ${nome} (${email})`, req);
      saveDatabase(db);
      return res.json({ success: true, admin: newAdmin });
    }
  });

  app.delete("/api/admin/sub-admins/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeExcluir) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para excluir registros." });
    }
    const id = Number(req.params.id);
    const db = loadDatabase();
    
    const mat = (db.admins || []).find((a: any) => a.id === id);
    if (!mat) {
      return res.status(404).json({ error: "Administrador não encontrado." });
    }

    db.admins = (db.admins || []).filter((a: any) => a.id !== id);
    addLog(req.admin.name, "EXCLUSAO_SUB_ADMIN", `Excluiu o sub-administrador: ${mat.nome} (${mat.email})`, req);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Matches directory
  app.get("/api/admin/jogos", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.jogos.map(g => enrichGameDetails(g)));
  });

  // Create match manually
  app.post("/api/admin/jogos", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para cadastrar ou editar partidas." });
    }
    const { time_casa, time_fora, time_casa_bandeira, time_fora_bandeira, data_jogo, rodada } = req.body;

    if (!time_casa || !time_fora || !data_jogo || !rodada) {
      return res.status(400).json({ error: "Dados para cadastro da partida insuficientes." });
    }

    const db = loadDatabase();
    const newGId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;

    const newGame: Jogo = {
      id: newGId,
      api_id: `manual_${newGId}`,
      time_casa,
      time_fora,
      time_casa_bandeira: time_casa_bandeira || "🏳️",
      time_fora_bandeira: time_fora_bandeira || "🏳️",
      data_jogo,
      placar_casa: null,
      placar_fora: null,
      status: 'PENDENTE',
      rodada: Number(rodada)
    };

    db.jogos.push(newGame);
    saveDatabase(db);
    addLog("Admin (Suporte)", "CADASTRO_JOGO_MANUAL", `Incluiu partida ${time_casa} x ${time_fora} (Id: ${newGId})`, req);

    res.json({ success: true, jogo: newGame });
  });

  // Update game or close scores (Triggers points calculation!)
  app.put("/api/admin/jogos/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para editar resultados ou alterar dados." });
    }
    const id = Number(req.params.id);
    const { time_casa, time_fora, data_jogo, placar_casa, placar_fora, status, rodada } = req.body;

    const db = loadDatabase();
    const game = db.jogos.find(g => g.id === id);

    if (!game) {
      return res.status(404).json({ error: "Partida de destino indisponível." });
    }

    if (time_casa) game.time_casa = time_casa;
    if (time_fora) game.time_fora = time_fora;
    if (data_jogo) game.data_jogo = data_jogo;
    if (rodada) game.rodada = Number(rodada);

    // Score checks
    if (placar_casa !== undefined && placar_casa !== null) {
      game.placar_casa = placar_casa === "" ? null : Number(placar_casa);
    }
    if (placar_fora !== undefined && placar_fora !== null) {
      game.placar_fora = placar_fora === "" ? null : Number(placar_fora);
    }

    // Checking status shifts to ENC_ERRADO to trigger scores calculation
    const oldStatus = game.status;
    if (status) {
      game.status = status;
    }

    saveDatabase(db);
    
    // Auto points triggers!
    if (['ENCERRADO', 'AO_VIVO'].includes(game.status)) {
      refreshLeaderboard();
      addLog("Sistema de Pontos", "RECALCULO_DOTAÇÕES_AUTOMATICO", `Jogo em ${game.status}. Resultados: ${game.time_casa} ${game.placar_casa} x ${game.placar_fora} ${game.time_fora}.`, req);
    } else {
      addLog("Admin (Suporte)", "ATUALIZO_JOGO", `Alteração de partida ID ${id}: Status=${game.status}`, req);
    }

    res.json({ success: true, jogo: game });
  });

  // Delete individual match
  app.delete("/api/admin/jogos/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeExcluir) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para excluir registros de partidas." });
    }
    const id = Number(req.params.id);
    const db = loadDatabase();
    db.jogos = db.jogos.filter(g => g.id !== id);
    saveDatabase(db);
    
    if (prisma) {
      prisma.jogo.delete({ where: { id } }).catch((err: any) => {
        console.error(`[MySQL Sync] Failed to explicitly delete game ${id} from MySQL:`, err.message);
      });
    }

    addLog("Admin (Suporte)", "EXCLUI_JOGO", `Parada excluída do calendário. ID: ${id}`, req);
    res.json({ success: true });
  });

  // Synchronize score parameters
  app.get("/api/admin/configs", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json({
      configs_ixc: db.configs_ixc,
      configs_points: db.configs_points,
      configs_football: db.configs_football,
      configs_libertadores: db.configs_libertadores || { ativo: false },
      configs_copa_mundo: db.configs_copa_mundo || { ativo: true },
      configs_brasileirao: db.configs_brasileirao || { ativo: false }
    });
  });

  // Save Config IXC Client Portal
  app.post("/api/admin/configs/ixc", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar configurações." });
    }
    const db = loadDatabase();
    const { url, token, chave, timeout, offline_mode } = req.body;

    if (url) db.configs_ixc.url = url;
    if (token) db.configs_ixc.token = token;
    if (chave) db.configs_ixc.chave = chave;
    if (timeout !== undefined) db.configs_ixc.timeout = Number(timeout);
    if (offline_mode !== undefined) db.configs_ixc.offline_mode = Boolean(offline_mode);

    saveDatabase(db);
    addLog("Admin (Suporte)", "ATUALIZA_PARAMETROS_IXC", `Configurações IXC atualizadas. Modo offline: ${db.configs_ixc.offline_mode}`, req);

    res.json({ success: true, configs_ixc: db.configs_ixc });
  });

  // Save Scoring Rule Parameters
  app.post("/api/admin/configs/points", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar configurações de pontuação." });
    }
    const db = loadDatabase();
    const { 
      pontos_acertar_vencedor, 
      pontos_acertar_empate, 
      pontos_acertar_placar_exato, 
      bonus_rodada, 
      bonus_sequencia, 
      bonus_jogos_perfeitos 
    } = req.body;

    if (pontos_acertar_vencedor !== undefined) db.configs_points.pontos_acertar_vencedor = Number(pontos_acertar_vencedor);
    if (pontos_acertar_empate !== undefined) db.configs_points.pontos_acertar_empate = Number(pontos_acertar_empate);
    if (pontos_acertar_placar_exato !== undefined) db.configs_points.pontos_acertar_placar_exato = Number(pontos_acertar_placar_exato);
    if (bonus_rodada !== undefined) db.configs_points.bonus_rodada = Number(bonus_rodada);
    if (bonus_sequencia !== undefined) db.configs_points.bonus_sequencia = Number(bonus_sequencia);
    if (bonus_jogos_perfeitos !== undefined) db.configs_points.bonus_jogos_perfeitos = Number(bonus_jogos_perfeitos);

    saveDatabase(db);
    refreshLeaderboard(); // Recalculate using new metrics right away!

    addLog("Admin (Suporte)", "ATUALIZA_REGULAMENTO_PONTO", "Parâmetros de pontuação modificados. Executado reclassificações globais.", req);

    res.json({ success: true, configs_points: db.configs_points });
  });

  // Save Football API configuration
  app.post("/api/admin/configs/football", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar configurações da API." });
    }
    const db = loadDatabase();
    const { key, url, manual_override, cron_active } = req.body;

    if (key) db.configs_football.key = key;
    if (url) db.configs_football.url = url;
    if (manual_override !== undefined) db.configs_football.manual_override = Boolean(manual_override);
    if (cron_active !== undefined) db.configs_football.cron_active = Boolean(cron_active);

    saveDatabase(db);
    addLog("Admin (Suporte)", "ATUALIZA_PARAM_SOCCER_API", `Configurações API Football salvas. Sobrecarga manual: ${db.configs_football.manual_override}`, req);

    res.json({ success: true, configs_football: db.configs_football });
  });

  // Save Libertadores configurations
  app.post("/api/admin/configs/libertadores", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeAtivarCampeonato) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para liberar ou ocultar campeonatos para clientes." });
    }
    const db = loadDatabase();
    const { ativo } = req.body;
    if (ativo !== undefined) {
      if (!db.configs_libertadores) {
        db.configs_libertadores = { ativo: false };
      }
      db.configs_libertadores.ativo = Boolean(ativo);
    }
    saveDatabase(db);
    addLog("Admin (Suporte)", "TOGGLE_LIBERTADORES", `Alterou ativação da Libertadores para clientes para: ${db.configs_libertadores.ativo}`, req);
    res.json({ success: true, configs_libertadores: db.configs_libertadores });
  });

  // Save Copa do Mundo configurations
  app.post("/api/admin/configs/copa_mundo", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeAtivarCampeonato) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para liberar ou ocultar campeonatos para clientes." });
    }
    const db = loadDatabase();
    const { ativo } = req.body;
    if (ativo !== undefined) {
      if (!db.configs_copa_mundo) {
        db.configs_copa_mundo = { ativo: true };
      }
      db.configs_copa_mundo.ativo = Boolean(ativo);
    }
    saveDatabase(db);
    addLog("Admin (Suporte)", "TOGGLE_COPA_MUNDO", `Alterou ativação da Copa do Mundo para clientes para: ${db.configs_copa_mundo.ativo}`, req);
    res.json({ success: true, configs_copa_mundo: db.configs_copa_mundo });
  });

  // Save Brasileirão configurations
  app.post("/api/admin/configs/brasileirao", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeAtivarCampeonato) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para liberar ou ocultar campeonatos para clientes." });
    }
    const db = loadDatabase();
    const { ativo } = req.body;
    if (ativo !== undefined) {
      if (!db.configs_brasileirao) {
        db.configs_brasileirao = { ativo: false };
      }
      db.configs_brasileirao.ativo = Boolean(ativo);
    }
    saveDatabase(db);
    addLog("Admin (Suporte)", "TOGGLE_BRASILEIRAO", `Alterou ativação do Brasileirão para clientes para: ${db.configs_brasileirao.ativo}`, req);
    res.json({ success: true, configs_brasileirao: db.configs_brasileirao });
  });

  // Sync today's Libertadores games from Football API with high quality fallback
  app.post("/api/admin/libertadores/sync", verifyAdminToken, async (req: any, res) => {
    const db = loadDatabase();
    const apiKey = db.configs_football.key;
    const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
    const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

    let fixtures: any[] = [];
    let isFallback = true;

    if (isRealApi) {
      try {
        console.log(`[Libertadores API] Fetching fixtures for League 13 (Copa Libertadores) Season 2026...`);
        const response = await axios.get(`${apiUrl}/fixtures`, {
          params: {
            league: "13",
            season: "2026"
          },
          headers: {
            "x-apisports-key": apiKey
          },
          timeout: 12000
        });

        if (response.data && response.data.response && response.data.response.length > 0) {
          fixtures = response.data.response;
          isFallback = false;
        }
      } catch (err: any) {
        console.error("[Libertadores API] Failed real sync, falling back...", err.message);
      }
    }

    let addedCount = 0;
    let updatedCount = 0;

    // High quality real matches for today's Libertadores as dynamic fallback set relative to current date 2026-05-26
    const FALLBACK_LIBERTADORES = [
      {
        api_id: "libertadores_fallback_201",
        time_casa: "Junior",
        time_fora: "Botafogo",
        time_casa_bandeira: "🇨🇴",
        time_fora_bandeira: "🇧🇷",
        data_jogo: "2026-05-26T19:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "libertadores_fallback_202",
        time_casa: "Flamengo",
        time_fora: "Millonarios",
        time_casa_bandeira: "🇧🇷",
        time_fora_bandeira: "🇨🇴",
        data_jogo: "2026-05-26T21:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "libertadores_fallback_203",
        time_casa: "Grêmio",
        time_fora: "The Strongest",
        time_casa_bandeira: "🇧🇷",
        time_fora_bandeira: "🇧🇴",
        data_jogo: "2026-05-27T19:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "libertadores_fallback_204",
        time_casa: "São Paulo",
        time_fora: "Talleres",
        time_casa_bandeira: "🇧🇷",
        time_fora_bandeira: "🇦🇷",
        data_jogo: "2026-05-27T21:30:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "libertadores_fallback_205",
        time_casa: "Palmeiras",
        time_fora: "San Lorenzo",
        time_casa_bandeira: "🇧🇷",
        time_fora_bandeira: "🇦🇷",
        data_jogo: "2026-05-28T19:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "libertadores_fallback_206",
        time_casa: "Fluminense",
        time_fora: "Alianza Lima",
        time_casa_bandeira: "🇧🇷",
        time_fora_bandeira: "🇵🇪",
        data_jogo: "2026-05-28T21:30:00Z",
        status: "PENDENTE",
        rodada: 1
      }
    ];

    if (isFallback) {
      for (const item of FALLBACK_LIBERTADORES) {
        let existing = db.jogos.find(j => j.api_id === item.api_id);
        if (!existing) {
          existing = db.jogos.find(j => 
            (normalizeTeamName(j.time_casa) === normalizeTeamName(item.time_casa) && normalizeTeamName(j.time_fora) === normalizeTeamName(item.time_fora))
          );
        }
        if (!existing) {
          const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
          db.jogos.push({
            id: newId,
            api_id: item.api_id,
            time_casa: item.time_casa,
            time_fora: item.time_fora,
            time_casa_bandeira: item.time_casa_bandeira,
            time_fora_bandeira: item.time_fora_bandeira,
            data_jogo: item.data_jogo,
            placar_casa: null,
            placar_fora: null,
            status: item.status as any,
            rodada: item.rodada
          });
          addedCount++;
        } else {
          existing.time_casa = item.time_casa;
          existing.time_fora = item.time_fora;
          existing.time_casa_bandeira = item.time_casa_bandeira;
          existing.time_fora_bandeira = item.time_fora_bandeira;
          existing.data_jogo = item.data_jogo;
          updatedCount++;
        }
      }
    } else {
      for (const item of fixtures) {
        const apiId = `libertadores_soccer_${item.fixture.id}`;
        const timeCasa = item.teams.home.name;
        const timeFora = item.teams.away.name;
        const timeCasaBandeira = item.teams.home.logo || "🏳️";
        const timeForaBandeira = item.teams.away.logo || "🏳️";

        const dataJogoStr = item.fixture.date;
        let placarCasa: number | null = null;
        let placarFora: number | null = null;
        if (item.goals.home !== null && item.goals.home !== undefined) {
          placarCasa = Number(item.goals.home);
        }
        if (item.goals.away !== null && item.goals.away !== undefined) {
          placarFora = Number(item.goals.away);
        }

        const shortStatus = item.fixture.status.short;
        let mappedStatus = "PENDENTE";
        if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(shortStatus)) {
          mappedStatus = "ENCERRADO";
        } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(shortStatus)) {
          mappedStatus = "AO_VIVO";
        }

        let existing = db.jogos.find(j => j.api_id === apiId);
          if (!existing) {
            existing = db.jogos.find(j => 
              (normalizeTeamName(j.time_casa) === normalizeTeamName(timeCasa) && normalizeTeamName(j.time_fora) === normalizeTeamName(timeFora))
            );
          }
        if (!existing) {
          const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
          db.jogos.push({
            id: newId,
            api_id: apiId,
            time_casa: timeCasa,
            time_fora: timeFora,
            time_casa_bandeira: timeCasaBandeira,
            time_fora_bandeira: timeForaBandeira,
            data_jogo: dataJogoStr,
            placar_casa: placarCasa,
            placar_fora: placarFora,
            status: mappedStatus as any,
            status_detalhado: shortStatus,
            rodada: parseRoundNumber(item.league?.round || "Group Stage - 1", true)
          });
          addedCount++;
        } else {
          existing.api_id = apiId;
          existing.time_casa = timeCasa;
          existing.time_fora = timeFora;
          existing.time_casa_bandeira = timeCasaBandeira;
          existing.time_fora_bandeira = timeForaBandeira;
          existing.data_jogo = dataJogoStr;
          existing.placar_casa = placarCasa;
          existing.placar_fora = placarFora;
          existing.status = mappedStatus as any;
          existing.status_detalhado = shortStatus;
          existing.rodada = parseRoundNumber(item.league?.round || "Group Stage - 1", true);
          updatedCount++;
        }
      }
    }

    saveDatabase(db);
    addLog("Admin (Suporte)", "SYNC_LIBERTADORES", `Sincronizou jogos Libertadores: ${addedCount} adicionados, ${updatedCount} atualizados`, req);
    
    res.json({
      success: true,
      mensagem: isFallback
        ? `Sincronização executada com sucesso através de dados fallback dos jogos de hoje e desta semana da Libertadores! Adicionados: ${addedCount}, Atualizados: ${updatedCount}.`
        : `Sincronização efetuada diretamente via API Football! ${fixtures.length} confrontos da Copa Libertadores obtidos da API.`
    });
  });

  // Sync today's Brasileirão games from Football API with high quality fallback
  app.post("/api/admin/brasileirao/sync", verifyAdminToken, async (req: any, res) => {
    const db = loadDatabase();
    const apiKey = db.configs_football.key;
    const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
    const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

    let fixtures: any[] = [];
    let isFallback = true;

    if (isRealApi) {
      try {
        console.log(`[Brasileirão API] Fetching fixtures for League 71 (Brasileirão Série A) Season 2026...`);
        const response = await axios.get(`${apiUrl}/fixtures`, {
          params: {
            league: "71",
            season: "2026"
          },
          headers: {
            "x-apisports-key": apiKey
          },
          timeout: 12000
        });

        if (response.data && response.data.response && response.data.response.length > 0) {
          fixtures = response.data.response;
          isFallback = false;
        }
      } catch (err: any) {
        console.error("[Brasileirão API] Failed real sync, falling back...", err.message);
      }
    }

    let addedCount = 0;
    let updatedCount = 0;

    const FALLBACK_BRASILEIRAO = [
      {
        api_id: "brasileirao_fallback_301",
        time_casa: "Palmeiras",
        time_fora: "Flamengo",
        time_casa_bandeira: "🐷",
        time_fora_bandeira: "🦅",
        data_jogo: "2026-05-30T16:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "brasileirao_fallback_302",
        time_casa: "Corinthians",
        time_fora: "São Paulo",
        time_casa_bandeira: "🦅",
        time_fora_bandeira: "🇾🇪",
        data_jogo: "2026-05-30T18:30:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "brasileirao_fallback_303",
        time_casa: "Atlético-MG",
        time_fora: "Cruzeiro",
        time_casa_bandeira: "🐔",
        time_fora_bandeira: "🦊",
        data_jogo: "2026-05-31T16:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "brasileirao_fallback_304",
        time_casa: "Grêmio",
        time_fora: "Internacional",
        time_casa_bandeira: "🇪🇪",
        time_fora_bandeira: "🇦🇹",
        data_jogo: "2026-05-31T18:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "brasileirao_fallback_305",
        time_casa: "Fluminense",
        time_fora: "Botafogo",
        time_casa_bandeira: "🇭🇺",
        time_fora_bandeira: "⭐️",
        data_jogo: "2026-06-01T20:00:00Z",
        status: "PENDENTE",
        rodada: 1
      },
      {
        api_id: "brasileirao_fallback_306",
        time_casa: "Vasco",
        time_fora: "Bahia",
        time_casa_bandeira: "💢",
        time_fora_bandeira: "🔵",
        data_jogo: "2026-06-02T21:00:00Z",
        status: "PENDENTE",
        rodada: 1
      }
    ];

    if (isFallback) {
      for (const item of FALLBACK_BRASILEIRAO) {
        let existing = db.jogos.find(j => j.api_id === item.api_id);
        if (!existing) {
          existing = db.jogos.find(j => 
            (normalizeTeamName(j.time_casa) === normalizeTeamName(item.time_casa) && normalizeTeamName(j.time_fora) === normalizeTeamName(item.time_fora))
          );
        }
        if (!existing) {
          const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
          db.jogos.push({
            id: newId,
            api_id: item.api_id,
            time_casa: item.time_casa,
            time_fora: item.time_fora,
            time_casa_bandeira: item.time_casa_bandeira,
            time_fora_bandeira: item.time_fora_bandeira,
            data_jogo: item.data_jogo,
            placar_casa: null,
            placar_fora: null,
            status: item.status as any,
            rodada: item.rodada
          });
          addedCount++;
        } else {
          existing.time_casa = item.time_casa;
          existing.time_fora = item.time_fora;
          existing.time_casa_bandeira = item.time_casa_bandeira;
          existing.time_fora_bandeira = item.time_fora_bandeira;
          existing.data_jogo = item.data_jogo;
          updatedCount++;
        }
      }
    } else {
      for (const item of fixtures) {
        const apiId = `brasileirao_soccer_${item.fixture.id}`;
        const timeCasa = item.teams.home.name;
        const timeFora = item.teams.away.name;
        const timeCasaBandeira = item.teams.home.logo || "🏳️";
        const timeForaBandeira = item.teams.away.logo || "🏳️";

        const dataJogoStr = item.fixture.date;
        let placarCasa: number | null = null;
        let placarFora: number | null = null;
        if (item.goals.home !== null && item.goals.home !== undefined) {
          placarCasa = Number(item.goals.home);
        }
        if (item.goals.away !== null && item.goals.away !== undefined) {
          placarFora = Number(item.goals.away);
        }

        const shortStatus = item.fixture.status.short;
        let mappedStatus = "PENDENTE";
        if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(shortStatus)) {
          mappedStatus = "ENCERRADO";
        } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(shortStatus)) {
          mappedStatus = "AO_VIVO";
        }

        let existing = db.jogos.find(j => j.api_id === apiId);
        if (!existing) {
          existing = db.jogos.find(j => 
            (normalizeTeamName(j.time_casa) === normalizeTeamName(timeCasa) && normalizeTeamName(j.time_fora) === normalizeTeamName(timeFora))
          );
        }
        if (!existing) {
          const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
          db.jogos.push({
            id: newId,
            api_id: apiId,
            time_casa: timeCasa,
            time_fora: timeFora,
            time_casa_bandeira: timeCasaBandeira,
            time_fora_bandeira: timeForaBandeira,
            data_jogo: dataJogoStr,
            placar_casa: placarCasa,
            placar_fora: placarFora,
            status: mappedStatus as any,
            status_detalhado: shortStatus,
            rodada: item.league?.round ? (parseInt(item.league.round.replace(/\D/g, "")) || 1) : 1
          });
          addedCount++;
        } else {
          existing.api_id = apiId;
          existing.time_casa = timeCasa;
          existing.time_fora = timeFora;
          existing.time_casa_bandeira = timeCasaBandeira;
          existing.time_fora_bandeira = timeForaBandeira;
          existing.data_jogo = dataJogoStr;
          existing.placar_casa = placarCasa;
          existing.placar_fora = placarFora;
          existing.status = mappedStatus as any;
          existing.status_detalhado = shortStatus;
          if (item.league?.round) {
            existing.rodada = parseInt(item.league.round.replace(/\D/g, "")) || 1;
          }
          updatedCount++;
        }
      }
    }

    fillMissingBrasileiraoRounds(db);
    saveDatabase(db);
    addLog("Admin (Suporte)", "SYNC_BRASILEIRAO", `Sincronizou jogos Brasileirão Série A: ${addedCount} adicionados, ${updatedCount} atualizados`, req);

    res.json({
      success: true,
      mensagem: isFallback
        ? `Sincronização executada com sucesso através de dados fallback dos clássicos da rodada do Brasileirão Série A! Adicionados: ${addedCount}, Atualizados: ${updatedCount}.`
        : `Sincronização efetuada diretamente via API Football! ${fixtures.length} confrontos do Brasileirão Série A obtidos da API.`
    });
  });

  // Manual Trigger for Live Syncing API Football simulator & Real API integration
  app.post("/api/admin/games-sync-football", verifyAdminToken, async (req: any, res) => {
    const db = loadDatabase();
    
    const apiKey = db.configs_football.key;
    const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

    if (isRealApi) {
      try {
        const result = await syncFootballApiReal(db, req);
        saveDatabase(db);
        refreshLeaderboard();

        addLog("API Football Real", "SINCRONIZACAO_SOCCER", `Sincronizador obteve ${result.fixturesCount} confrontos. Novas: ${result.addedCount}, Atualizações: ${result.updatedCount} ${result.isUsingFallback ? '(Usando Fallback Inteligente Copa 2022)' : ''}`, req);

        if (result.isUsingFallback) {
          return res.json({
            success: true,
            mensagem: `Conexão efetuada com sucesso! Identificamos que sua chave de API utiliza o Plano Gratuito (o qual restringe a consulta da futura Copa de 2026). Ativamos a Sincronização Inteligente: importamos os ${result.fixturesCount} confrontos da Copa de 2022 e adaptamos as datas automaticamente para 2026 (+1299 dias). Você já pode ver os confrontos reais atualizados e fazer testes completos de palpites!`,
            status_api: 'CONECTADO'
          });
        }

        return res.json({
          success: true,
          mensagem: `API-Football integrada executada com sucesso! ${result.fixturesCount} partidas da Copa do Mundo 2026 sincronizadas. Adicionadas: ${result.addedCount}, Atualizadas: ${result.updatedCount}.`,
          status_api: 'CONECTADO'
        });

      } catch (err: any) {
        console.error("[Football API Real error]", err.message);
        addLog("Erro Football API", "EXCECAO_CONEXAO", `Erro ao consultar a API-football: ${err.message}`, req);
        return res.status(502).json({
          error: `Erro ao conectar com API-Football: ${err.message}. Verifique sua credencial ou conexão.`
        });
      }
    }

    // Fallback Simulator: Used if key is empty/dummy for safe development & testing
    let updatedCount = 0;
    const now = new Date().getTime();

    db.jogos.forEach(g => {
      const gTime = new Date(g.data_jogo).getTime();
      const elapsedMins = (now - gTime) / (1000 * 60);
      const isRealMatch = g.api_id && (g.api_id.startsWith("football_api_") || g.api_id.startsWith("libertadores_soccer_"));

      // Only sync games that have actually started or are simulated start (prior to current local time)
      if (g.status === 'PENDENTE' && gTime <= now) {
        if (elapsedMins < 105) {
          g.status = 'AO_VIVO';
          if (g.placar_casa === null) g.placar_casa = 0;
          if (g.placar_fora === null) g.placar_fora = 0;
          
          if (elapsedMins < 45) g.status_detalhado = "1H";
          else if (elapsedMins < 60) g.status_detalhado = "HT";
          else g.status_detalhado = "2H";

          updatedCount++;
        } else {
          g.status = 'ENCERRADO';
          g.status_detalhado = "FT";
          if (g.placar_casa === null) g.placar_casa = Math.floor(Math.random() * 3);
          if (g.placar_fora === null) g.placar_fora = Math.floor(Math.random() * 3);
          updatedCount++;
        }
      } else if (g.status === 'AO_VIVO') {
        const prevDet = g.status_detalhado;
        if (elapsedMins < 45) g.status_detalhado = "1H";
        else if (elapsedMins < 60) g.status_detalhado = "HT";
        else if (elapsedMins < 105) g.status_detalhado = "2H";
        else g.status_detalhado = "FT";

        if (prevDet !== g.status_detalhado) {
          updatedCount++;
        }

        if (elapsedMins >= 105) {
          g.status = 'ENCERRADO';
          g.status_detalhado = "FT";
          updatedCount++;
        } else if (!isRealMatch) {
          // Increment some goals for mock games occasionally while live
          if (Math.random() < 0.2) {
            g.placar_casa = (g.placar_casa || 0) + 1;
            updatedCount++;
          }
          if (Math.random() < 0.2) {
            g.placar_fora = (g.placar_fora || 0) + 1;
            updatedCount++;
          }
        }
      }
    });

    saveDatabase(db);
    
    if (updatedCount > 0) {
      refreshLeaderboard();
      addLog("Cron API Football", "SINCRONIZACAO_SOCCER", `Sincronizador automático obteve resultados para ${updatedCount} partidas ativo-pendente (Modo Simulação).`, req);
    } else {
      addLog("Cron API Football", "SINCRONIZACAO_IDLE", "Atualização executada sem partidas em horário de jogo ativo.", req);
    }

    res.json({
      success: true,
      mensagem: `Sincronização simulada executada (Modo simulação pois Chave API não inserida). ${updatedCount} partidas atualizadas.`,
      status_api: 'CONECTADO'
    });
  });

  // Audit Logs endpoint
  app.get("/api/admin/logs", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.logs);
  });

  // Retrieve comprehensive CSV reports payload
  app.get("/api/admin/reports", verifyAdminToken, (req, res) => {
    const db = loadDatabase();

    // Participation statistics by city
    const participation: any[] = [];
    const citiesGroup: { [key: string]: { user_count: number; bet_count: number; sum_pt: number } } = {};

    db.usuarios.forEach(u => {
      if (!citiesGroup[u.cidade]) {
        citiesGroup[u.cidade] = { user_count: 0, bet_count: 0, sum_pt: 0 };
      }
      citiesGroup[u.cidade].user_count++;
      citiesGroup[u.cidade].sum_pt += u.pontos_total;

      const betsByThisUser = db.palpites.filter(p => p.usuario_id === u.id).length;
      citiesGroup[u.cidade].bet_count += betsByThisUser;
    });

    const reportCities = Object.keys(citiesGroup).map(cName => ({
      cidade: cName,
      usuarios: citiesGroup[cName].user_count,
      palpites: citiesGroup[cName].bet_count,
      media_pontos: parseFloat((citiesGroup[cName].sum_pt / citiesGroup[cName].user_count).toFixed(2))
    })).sort((a,b) => b.usuarios - a.usuarios);

    // Matches with most bets report
    const matchBetsReport = db.jogos.map(g => {
      const betsCount = db.palpites.filter(p => p.jogo_id === g.id).length;
      return {
        id: g.id,
        partida: `${g.time_casa} x ${g.time_fora}`,
        data: g.data_jogo,
        total_palpites: betsCount,
        status: g.status
      };
    }).sort((a,b) => b.total_palpites - a.total_palpites);

    res.json({
      participacao: reportCities,
      jogos_relat: matchBetsReport,
      lideranca_geral: db.usuarios.map(u => ({
        id: u.id,
        ixc_id: u.ixc_id,
        nome: u.nome,
        cidade: u.cidade,
        telefone: u.telefone,
        email: u.email,
        pontos: u.pontos_total,
        exatos: u.acertos_exato,
        vencedores: u.acertos_vencedor,
        erros: u.erros,
        cadastro: u.created_at
      })).sort((a,b) => b.pontos - a.pontos)
    });
  });

  // Test IXC Connection manual validation endpoint
  app.post("/api/admin/ixc-test", verifyAdminToken, async (req: any, res) => {
    const { url, token, timeout } = req.body;
    
    if (!url || !token) {
      return res.status(400).json({ error: "Parâmetros URL e Token obrigatórios." });
    }

    try {
      // Execute listed clients head limit 1 as structured in curls
      const payload = {
        qtype: "cliente.id",
        query: "0",
        oper: ">",
        rp: "1",
        sortname: "cliente.id",
        sortorder: "desc"
      };

      const authStr = Buffer.from(token).toString("base64");
      
      const response = await axios.post(
        `${url}/webservice/v1/cliente`,
        payload,
        {
          headers: {
            "Authorization": `Basic ${authStr}`,
            "Content-Type": "application/json",
            "ixcsoft": "listar"
          },
          timeout: Number(timeout) || 4000
        }
      );

      if (response.status === 200) {
        addLog("Admin Connection Test", "TESTE_IXC_SUCESSO", `Conexão bem sucedida com a URL ${url}.`, req);
        return res.json({
          success: true,
          status: "ONLINE",
          mensagem: "Conexão com webservice do IXC Soft estabelecida com sucesso! Encontrado protocolo listar."
        });
      } else {
        throw new Error(`Código de status HTTP: ${response.status}`);
      }
    } catch (err: any) {
      addLog("Admin Connection Test", "TESTE_IXC_FALHOU", `Deu erro testando conexão com ${url}: ${err.message}`, req);
      return res.json({
        success: false,
        status: "OFFLINE",
        mensagem: `Conexão falhou: ${err.message}. A rede do IXC deve aceitar requisições de origem HTTPS externas.`
      });
    }
  });

  // ==========================================
  // VITE BUNDLING MIDDLEWARING LAYER
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Active server listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Copa 2026 Portal] Running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Fatal startup server error", err);
});

function generateDeterministicStats(jogoId: number) {
  const seed = jogoId * 73;
  const rand = (max: number, min = 0) => {
    const x = Math.sin(seed + min) * 10000;
    const r = x - Math.floor(x);
    return Math.floor(r * (max - min + 1)) + min;
  };

  const posseCasa = rand(65, 35);
  const posseFora = 100 - posseCasa;

  const chutesCasa = rand(22, 5);
  const chutesFora = rand(20, 4);

  const chutesNoGolCasa = Math.min(chutesCasa, rand(Math.max(1, Math.floor(chutesCasa / 2)), 1));
  const chutesNoGolFora = Math.min(chutesFora, rand(Math.max(1, Math.floor(chutesFora / 2)), 1));

  const chutesForaCasa = Math.max(0, chutesCasa - chutesNoGolCasa - rand(3, 0));
  const chutesForaFora = Math.max(0, chutesFora - chutesNoGolFora - rand(3, 0));

  const bloqueadosCasa = Math.max(0, chutesCasa - chutesNoGolCasa - chutesForaCasa);
  const bloqueadosFora = Math.max(0, chutesFora - chutesNoGolFora - chutesForaFora);

  const faltasCasa = rand(18, 6);
  const faltasFora = rand(20, 7);

  const escanteiosCasa = rand(9, 1);
  const escanteiosFora = rand(8, 1);

  const impedimentosCasa = rand(4, 0);
  const impedimentosFora = rand(4, 0);

  const amarelosCasa = rand(4, 0);
  const amarelosFora = rand(5, 0);

  const vermelhosCasa = rand(1, 0) > 0.85 ? 1 : 0;
  const vermelhosFora = rand(1, 0) > 0.85 ? 1 : 0;

  const defesasCasa = Math.max(0, chutesNoGolFora - rand(2, 0));
  const defesasFora = Math.max(0, chutesNoGolCasa - rand(2, 0));

  const passesCasa = rand(550, 280);
  const passesFora = rand(520, 260);

  const passesPrecisosCasa = Math.floor(passesCasa * (rand(87, 65) / 100));
  const passesPrecisosFora = Math.floor(passesFora * (rand(85, 63) / 100));

  const precisaoCasa = passesCasa > 0 ? `${Math.round((passesPrecisosCasa / passesCasa) * 100)}%` : "50%";
  const precisaoFora = passesFora > 0 ? `${Math.round((passesPrecisosFora / passesFora) * 100)}%` : "50%";

  return [
    { name: "Posse de Bola", casa: `${posseCasa}%`, fora: `${posseFora}%` },
    { name: "Total de Chutes", casa: chutesCasa, fora: chutesFora },
    { name: "Chutes a Gol", casa: chutesNoGolCasa, fora: chutesNoGolFora },
    { name: "Chutes para Fora", casa: chutesForaCasa, fora: chutesForaFora },
    { name: "Chutes Bloqueados", casa: bloqueadosCasa, fora: bloqueadosFora },
    { name: "Faltas", casa: faltasCasa, fora: faltasFora },
    { name: "Escanteios", casa: escanteiosCasa, fora: escanteiosFora },
    { name: "Impedimentos", casa: impedimentosCasa, fora: impedimentosFora },
    { name: "Cartões Amarelos", casa: amarelosCasa, fora: amarelosFora },
    { name: "Cartões Vermelhos", casa: vermelhosCasa, fora: vermelhosFora },
    { name: "Defesas do Goleiro", casa: defesasCasa, fora: defesasFora },
    { name: "Total de Passes", casa: passesCasa, fora: passesFora },
    { name: "Passes Precisos", casa: passesPrecisosCasa, fora: passesPrecisosFora },
    { name: "Precisão de Passe", casa: precisaoCasa, fora: precisaoFora }
  ];
}

function parseApiStats(apiResponse: any[], jogo: any) {
  let homeData = apiResponse[0];
  let awayData = apiResponse[1];
  
  if (apiResponse.length >= 2) {
    const apiTeamHomeName = apiResponse[0].team?.name?.toLowerCase() || "";
    const dbTeamHomeName = jogo.time_casa?.toLowerCase() || "";
    
    if (dbTeamHomeName.includes(apiTeamHomeName) || apiTeamHomeName.includes(dbTeamHomeName)) {
      homeData = apiResponse[0];
      awayData = apiResponse[1];
    } else {
      homeData = apiResponse[1];
      awayData = apiResponse[0];
    }
  }

  const homeStats = homeData?.statistics || [];
  const awayStats = awayData?.statistics || [];

  const getStatVal = (statsList: any[], typeName: string): any => {
    const item = statsList.find((s: any) => s.type?.toLowerCase() === typeName.toLowerCase());
    return item ? (item.value !== null ? item.value : 0) : 0;
  };

  const posseCasa = getStatVal(homeStats, "Ball Possession") || "50%";
  const posseFora = getStatVal(awayStats, "Ball Possession") || "50%";

  const chutesCasa = getStatVal(homeStats, "Total Shots");
  const chutesFora = getStatVal(awayStats, "Total Shots");

  const chutesNoGolCasa = getStatVal(homeStats, "Shots on Goal");
  const chutesNoGolFora = getStatVal(awayStats, "Shots on Goal");

  const chutesForaCasa = getStatVal(homeStats, "Shots off Goal");
  const chutesForaFora = getStatVal(awayStats, "Shots off Goal");

  const bloqueadosCasa = getStatVal(homeStats, "Blocked Shots");
  const bloqueadosFora = getStatVal(awayStats, "Blocked Shots");

  const faltasCasa = getStatVal(homeStats, "Fouls");
  const faltasFora = getStatVal(awayStats, "Fouls");

  const escanteiosCasa = getStatVal(homeStats, "Corner Kicks");
  const escanteiosFora = getStatVal(awayStats, "Corner Kicks");

  const impedimentosCasa = getStatVal(homeStats, "Offsides");
  const impedimentosFora = getStatVal(awayStats, "Offsides");

  const amarelosCasa = getStatVal(homeStats, "Yellow Cards");
  const amarelosFora = getStatVal(awayStats, "Yellow Cards");

  const vermelhosCasa = getStatVal(homeStats, "Red Cards");
  const vermelhosFora = getStatVal(awayStats, "Red Cards");

  const defesasCasa = getStatVal(homeStats, "Goalkeeper Saves");
  const defesasFora = getStatVal(awayStats, "Goalkeeper Saves");

  const passesCasa = getStatVal(homeStats, "Total passes");
  const passesFora = getStatVal(awayStats, "Total passes");

  const passesPrecisosCasa = getStatVal(homeStats, "Passes accurate");
  const passesPrecisosFora = getStatVal(awayStats, "Passes accurate");

  const precisaoCasa = getStatVal(homeStats, "Passes %") !== null ? `${getStatVal(homeStats, "Passes %")}%` : "50%";
  const precisaoFora = getStatVal(awayStats, "Passes %") !== null ? `${getStatVal(awayStats, "Passes %")}%` : "50%";

  return [
    { name: "Posse de Bola", casa: typeof posseCasa === "string" ? posseCasa : `${posseCasa}%`, fora: typeof posseFora === "string" ? posseFora : `${posseFora}%` },
    { name: "Total de Chutes", casa: chutesCasa, fora: chutesFora },
    { name: "Chutes a Gol", casa: chutesNoGolCasa, fora: chutesNoGolFora },
    { name: "Chutes para Fora", casa: chutesForaCasa, fora: chutesForaFora },
    { name: "Chutes Bloqueados", casa: bloqueadosCasa, fora: bloqueadosFora },
    { name: "Faltas", casa: faltasCasa, fora: faltasFora },
    { name: "Escanteios", casa: escanteiosCasa, fora: escanteiosFora },
    { name: "Impedimentos", casa: impedimentosCasa, fora: impedimentosFora },
    { name: "Cartões Amarelos", casa: amarelosCasa, fora: amarelosFora },
    { name: "Cartões Vermelhos", casa: vermelhosCasa, fora: vermelhosFora },
    { name: "Defesas do Goleiro", casa: defesasCasa, fora: defesasFora },
    { name: "Total de Passes", casa: passesCasa, fora: passesFora },
    { name: "Passes Precisos", casa: passesPrecisosCasa, fora: passesPrecisosFora },
    { name: "Precisão de Passe", casa: precisaoCasa, fora: precisaoFora }
  ];
}

function parseApiLineup(apiLineups: any[], jogo: any) {
  let homeData = apiLineups[0];
  let awayData = apiLineups[1];

  if (apiLineups.length >= 2) {
    const apiTeamHomeName = apiLineups[0].team?.name?.toLowerCase() || "";
    const dbTeamHomeName = jogo.time_casa?.toLowerCase() || "";

    if (dbTeamHomeName.includes(apiTeamHomeName) || apiTeamHomeName.includes(dbTeamHomeName)) {
      homeData = apiLineups[0];
      awayData = apiLineups[1];
    } else {
      homeData = apiLineups[1];
      awayData = apiLineups[0];
    }
  }

  const formatXI = (startXIList: any[] = []) => {
    return startXIList.map((item: any) => {
      const p = item.player;
      return `${p.name} (${p.number || "-"}) - ${p.pos || ""}`;
    });
  };

  const formatSubs = (subList: any[] = []) => {
    return subList.map((item: any) => {
      const p = item.player;
      return `${p.name} (${p.number || "-"})`;
    });
  };

  return {
    titular_casa: formatXI(homeData?.startXI),
    titular_fora: formatXI(awayData?.startXI),
    reservas_casa: formatSubs(homeData?.substitutes),
    reservas_fora: formatSubs(awayData?.substitutes),
    tecnico_casa: homeData?.coach?.name || "",
    tecnico_fora: awayData?.coach?.name || "",
    format_casa: homeData?.formation || "4-4-2",
    format_fora: awayData?.formation || "4-4-2"
  };
}

function generateDeterministicEvents(jogo: any, nowMs: number) {
  const events: any[] = [];
  const seed = jogo.id * 17;
  const rand = (max: number, min = 0, step = 1) => {
    const x = Math.sin(seed + step) * 10000;
    const r = x - Math.floor(x);
    return Math.floor(r * (max - min + 1)) + min;
  };

  const scoreCasa = jogo.placar_casa !== null && jogo.placar_casa !== undefined ? Number(jogo.placar_casa) : 0;
  const scoreFora = jogo.placar_fora !== null && jogo.placar_fora !== undefined ? Number(jogo.placar_fora) : 0;

  // Generate Goal events matching the exact score!
  const casaGoals: number[] = [];
  for (let i = 0; i < scoreCasa; i++) {
    const minute = rand(88, 5, i * 7 + 1);
    casaGoals.push(minute);
  }
  casaGoals.sort((a, b) => a - b);
  casaGoals.forEach((min, idx) => {
    events.push({
      time: { elapsed: min, extra: null },
      team: { name: jogo.time_casa },
      player: { name: getFallbackPlayerName(jogo.time_casa, idx, seed) },
      type: "Goal",
      detail: "Normal Goal",
      comments: null
    });
  });

  const foraGoals: number[] = [];
  for (let i = 0; i < scoreFora; i++) {
    const minute = rand(88, 5, i * 11 + 2);
    foraGoals.push(minute);
  }
  foraGoals.sort((a, b) => a - b);
  foraGoals.forEach((min, idx) => {
    events.push({
      time: { elapsed: min, extra: null },
      team: { name: jogo.time_fora },
      player: { name: getFallbackPlayerName(jogo.time_fora, idx + 5, seed) },
      type: "Goal",
      detail: "Normal Goal",
      comments: null
    });
  });

  // Let's add some Yellow Cards
  const totalYellows = rand(5, 1, 99);
  for (let i = 0; i < totalYellows; i++) {
    const isCasa = rand(100, 0, i * 3) > 50;
    const minute = rand(89, 10, i * 13 + 5);
    const teamName = isCasa ? jogo.time_casa : jogo.time_fora;
    events.push({
      time: { elapsed: minute, extra: null },
      team: { name: teamName },
      player: { name: getFallbackPlayerName(teamName, i + 10, seed) },
      type: "Card",
      detail: "Yellow Card",
      comments: null
    });
  }

  // Maybe one Red Card occasionally
  if (rand(100, 0, 101) > 85) {
    const isCasa = rand(100, 0, 102) > 50;
    const minute = rand(89, 45, 103);
    const teamName = isCasa ? jogo.time_casa : jogo.time_fora;
    events.push({
      time: { elapsed: minute, extra: null },
      team: { name: teamName },
      player: { name: getFallbackPlayerName(teamName, 15, seed) },
      type: "Card",
      detail: "Red Card",
      comments: null
    });
  }

  // Add 1 or 2 substitutions
  const subsCount = rand(3, 1, 104);
  for (let i = 0; i < subsCount; i++) {
    const isCasa = rand(100, 0, i * 4) > 50;
    const minute = rand(85, 46, i * 14 + 6);
    const teamName = isCasa ? jogo.time_casa : jogo.time_fora;
    events.push({
      time: { elapsed: minute, extra: null },
      team: { name: teamName },
      player: { name: getFallbackPlayerName(teamName, i + 16, seed) },
      assist: { name: getFallbackPlayerName(teamName, i + 20, seed) },
      type: "subst",
      detail: `Substitution ${i + 1}`,
      comments: null
    });
  }

  // Sort events by elapsed minute
  events.sort((a, b) => a.time.elapsed - b.time.elapsed);
  return events;
}

function getFallbackPlayerName(teamName: string, index: number, seed: number): string {
  const names = [
    "G. Silva", "Rodrigo", "Felipe", "Marquinhos", "Lucas M.", "Everton", "T. Santos",
    "G. Barbosa", "B. Henrique", "P. Henrique", "Gustavo", "Ronaldo", "Neymar Jr",
    "Vinicius", "Rodrygo", "Richarlison", "Casemiro", "Paqueta", "Eder M."
  ];
  const idx = Math.abs(Math.floor(seed + index)) % names.length;
  return names[idx];
}

