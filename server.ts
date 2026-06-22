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
import sharp from "sharp";
import webpush from "web-push";

import { 
  Usuario, 
  Jogo, 
  Palpite, 
  ConfigPoints, 
  ConfigIXC, 
  ConfigFootballApi, 
  AuditLog, 
  AdminUser,
  Correcao
} from "./src/types";
import { INITIAL_GAMES, INITIAL_POINTS_CONFIG, CIDADES_ATENDIDAS } from "./src/data";
import { enrichGameDetails, lookupRoster, generateGenericRoster } from "./src/utils/gameEnricher";

const JWT_SECRET = process.env.JWT_SECRET || "copa-bolao-2026-super-secret-key-isp";

// Initialize VAPID Keys dynamically or from environment
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || ""
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidKeys.publicKey = generated.publicKey;
    vapidKeys.privateKey = generated.privateKey;
    console.log("[PWA Push] Created dynamic transient VAPID keys for PWA notifications.");
  } catch (err: any) {
    console.error("[PWA Push] Failed to generate VAPID keys:", err.message);
  }
}

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:suporte@itlfibra.com.br",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (err: any) {
    console.error("[PWA Push] setup error:", err.message);
  }
}

// Ensure database file exists with initial structure
const DB_FILE = path.join(process.cwd(), "database.json");

interface LocalDatabase {
  usuarios: Usuario[];
  jogos: Jogo[];
  palpites: Palpite[];
  correcoes?: Correcao[];
  configs_ixc: ConfigIXC;
  configs_points: ConfigPoints;
  configs_football: ConfigFootballApi;
  logs: AuditLog[];
  admins: AdminUser[];
  push_subscriptions?: Array<{
    usuario_id: number | null;
    subscription: any;
    created_at: string;
    alerted_games?: number[];
  }>;
  configs_libertadores?: {
    ativo: boolean;
  };
  configs_copa_mundo?: {
    ativo: boolean;
  };
  configs_brasileirao?: {
    ativo: boolean;
  };
  configs_logo?: {
    has_custom_logo: boolean;
    timestamp: number;
    custom_logo_base64?: string;
  };
  configs_favicon?: {
    has_custom_favicon: boolean;
    timestamp: number;
    extension?: string;
    custom_favicon_base64?: string;
  };
  configs_custom?: {
    background_image?: string;
    ad_image?: string;
    header_title_1?: string;
    header_title_2?: string;
    header_description?: string;
    regras?: Array<{ id: number; titulo: string; texto: string }>;
    premiacoes?: Array<{ posicao: string; premio: string; detalhes: string }>;
    recaptcha_active?: boolean;
    recaptcha_site_key?: string;
    recaptcha_secret_key?: string;
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

const FALLBACK_LIBERTADORES = [
  // ----------------------------------------
  // RODADA 1 (TODOS ENCERRADOS COM PLACAR REALISTA DA COPA LIBERTADORES 2026)
  // ----------------------------------------
  // GRUPO A
  {
    api_id: "libertadores_r1_gA_1",
    time_casa: "Flamengo",
    time_fora: "Estudiantes",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-05-12T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 2,
    placar_fora: 1,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gA_2",
    time_casa: "Cusco",
    time_fora: "Ind. Medellín",
    time_casa_bandeira: "🇵🇪",
    time_fora_bandeira: "🇨🇴",
    data_jogo: "2026-05-12T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 1,
    rodada: 1
  },
  // GRUPO B
  {
    api_id: "libertadores_r1_gB_1",
    time_casa: "Nacional",
    time_fora: "Universitário",
    time_casa_bandeira: "🇺🇾",
    time_fora_bandeira: "🇵🇪",
    data_jogo: "2026-05-13T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 0,
    placar_fora: 1,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gB_2",
    time_casa: "Coquimbo Unido",
    time_fora: "Tolima",
    time_casa_bandeira: "🇨🇱",
    time_fora_bandeira: "🇨🇴",
    data_jogo: "2026-05-13T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 2,
    placar_fora: 2,
    rodada: 1
  },
  // GRUPO C
  {
    api_id: "libertadores_r1_gC_1",
    time_casa: "Fluminense",
    time_fora: "Bolívar",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇧🇴",
    data_jogo: "2026-05-14T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 3,
    placar_fora: 0,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gC_2",
    time_casa: "Dep. La Guaira",
    time_fora: "Ind. Rivadavia",
    time_casa_bandeira: "🇻🇪",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-05-14T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 2,
    rodada: 1
  },
  // GRUPO D
  {
    api_id: "libertadores_r1_gD_1",
    time_casa: "Boca Júniors",
    time_fora: "Cruzeiro",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-05-15T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 0,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gD_2",
    time_casa: "Univ. Católica",
    time_fora: "Bar. Guayaquil",
    time_casa_bandeira: "🇨🇱",
    time_fora_bandeira: "🇪🇨",
    data_jogo: "2026-05-15T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 2,
    placar_fora: 0,
    rodada: 1
  },
  // GRUPO E
  {
    api_id: "libertadores_r1_gE_1",
    time_casa: "Peñarol",
    time_fora: "Corinthians",
    time_casa_bandeira: "🇺🇾",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-05-19T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 2,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gE_2",
    time_casa: "Ind. Santa Fé",
    time_fora: "Platense",
    time_casa_bandeira: "🇨🇴",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-05-19T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 0,
    placar_fora: 0,
    rodada: 1
  },
  // GRUPO F
  {
    api_id: "libertadores_r1_gF_1",
    time_casa: "Palmeiras",
    time_fora: "Cerro Porteño",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇵🇾",
    data_jogo: "2026-05-20T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 4,
    placar_fora: 1,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gF_2",
    time_casa: "Júnior Barranquilla",
    time_fora: "Sporting Cristal",
    time_casa_bandeira: "🇨🇴",
    time_fora_bandeira: "🇵🇪",
    data_jogo: "2026-05-20T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 1,
    rodada: 1
  },
  // GRUPO G
  {
    api_id: "libertadores_r1_gG_1",
    time_casa: "LDU",
    time_fora: "Lanús",
    time_casa_bandeira: "🇪🇨",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-05-21T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 2,
    placar_fora: 1,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gG_2",
    time_casa: "Always Ready",
    time_fora: "Mirassol",
    time_casa_bandeira: "🇧🇴",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-05-21T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 0,
    placar_fora: 2,
    rodada: 1
  },
  // GRUPO H
  {
    api_id: "libertadores_r1_gH_1",
    time_casa: "Ind. del Valle",
    time_fora: "Libertad",
    time_casa_bandeira: "🇪🇨",
    time_fora_bandeira: "🇵🇾",
    data_jogo: "2026-05-22T19:00:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 1,
    placar_fora: 1,
    rodada: 1
  },
  {
    api_id: "libertadores_r1_gH_2",
    time_casa: "Rosário Central",
    time_fora: "Univ. Central",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇻🇪",
    data_jogo: "2026-05-22T21:30:00Z",
    status: "ENCERRADO",
    status_detalhado: "FT",
    placar_casa: 2,
    placar_fora: 0,
    rodada: 1
  },

  // ----------------------------------------
  // RODADA 2 (PROXIMOS JOGOS SELECIONADOS PARA PALPITES DOS CLIENTES)
  // ----------------------------------------
  // GRUPO A
  {
    api_id: "libertadores_r2_gA_1",
    time_casa: "Ind. Medellín",
    time_fora: "Flamengo",
    time_casa_bandeira: "🇨🇴",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-06-02T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gA_2",
    time_casa: "Estudiantes",
    time_fora: "Cusco",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇵🇪",
    data_jogo: "2026-06-02T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO B
  {
    api_id: "libertadores_r2_gB_1",
    time_casa: "Tolima",
    time_fora: "Nacional",
    time_casa_bandeira: "🇨🇴",
    time_fora_bandeira: "🇺🇾",
    data_jogo: "2026-06-03T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gB_2",
    time_casa: "Universitário",
    time_fora: "Coquimbo Unido",
    time_casa_bandeira: "🇵🇪",
    time_fora_bandeira: "🇨🇱",
    data_jogo: "2026-06-03T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO C
  {
    api_id: "libertadores_r2_gC_1",
    time_casa: "Ind. Rivadavia",
    time_fora: "Fluminense",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-06-04T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gC_2",
    time_casa: "Bolívar",
    time_fora: "Dep. La Guaira",
    time_casa_bandeira: "🇧🇴",
    time_fora_bandeira: "🇻🇪",
    data_jogo: "2026-06-04T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO D
  {
    api_id: "libertadores_r2_gD_1",
    time_casa: "Bar. Guayaquil",
    time_fora: "Boca Júniors",
    time_casa_bandeira: "🇪🇨",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-06-05T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gD_2",
    time_casa: "Cruzeiro",
    time_fora: "Univ. Católica",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇨🇱",
    data_jogo: "2026-06-05T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO E
  {
    api_id: "libertadores_r2_gE_1",
    time_casa: "Platense",
    time_fora: "Peñarol",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇺🇾",
    data_jogo: "2026-06-09T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gE_2",
    time_casa: "Corinthians",
    time_fora: "Ind. Santa Fé",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇨🇴",
    data_jogo: "2026-06-09T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO F
  {
    api_id: "libertadores_r2_gF_1",
    time_casa: "Sporting Cristal",
    time_fora: "Palmeiras",
    time_casa_bandeira: "🇵🇪",
    time_fora_bandeira: "🇧🇷",
    data_jogo: "2026-06-10T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gF_2",
    time_casa: "Cerro Porteño",
    time_fora: "Júnior Barranquilla",
    time_casa_bandeira: "🇵🇾",
    time_fora_bandeira: "🇨🇴",
    data_jogo: "2026-06-10T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO G
  {
    api_id: "libertadores_r2_gG_1",
    time_casa: "Mirassol",
    time_fora: "LDU",
    time_casa_bandeira: "🇧🇷",
    time_fora_bandeira: "🇪🇨",
    data_jogo: "2026-06-11T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gG_2",
    time_casa: "Lanús",
    time_fora: "Always Ready",
    time_casa_bandeira: "🇦🇷",
    time_fora_bandeira: "🇧🇴",
    data_jogo: "2026-06-11T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  // GRUPO H
  {
    api_id: "libertadores_r2_gH_1",
    time_casa: "Univ. Central",
    time_fora: "Ind. del Valle",
    time_casa_bandeira: "🇻🇪",
    time_fora_bandeira: "🇪🇨",
    data_jogo: "2026-06-12T19:00:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  },
  {
    api_id: "libertadores_r2_gH_2",
    time_casa: "Libertad",
    time_fora: "Rosário Central",
    time_casa_bandeira: "🇵🇾",
    time_fora_bandeira: "🇦🇷",
    data_jogo: "2026-06-12T21:30:00Z",
    status: "PENDENTE",
    status_detalhado: "PENDENTE",
    placar_casa: null as number | null,
    placar_fora: null as number | null,
    rodada: 2
  }
];

// ==========================================
// GLOBAL FOOTBALL API HELPERS & ENGINE
// ==========================================
const TEAM_TRANSLATIONS: Record<string, string> = {
  "USA": "Estados Unidos",
  "United States": "Estados Unidos",
  "Germany": "Alemanha",
  "Argentina": "Argentina",
  "Brazil": "Brasil",
  "Croatia": "Croácia",
  "Morocco": "Marrocos",
  "Qatar": "Catar",
  "Spain": "Espanha",
  "France": "França",
  "Belgium": "Bélgica",
  "England": "Inglaterra",
  "Iran": "Irã",
  "Wales": "País de Gales",
  "Senegal": "Senegal",
  "Netherlands": "Holanda",
  "Denmark": "Dinamarca",
  "Tunisia": "Tunísia",
  "Mexico": "México",
  "Poland": "Polônia",
  "Australia": "Austrália",
  "Japan": "Japão",
  "Costa Rica": "Costa Rica",
  "Canada": "Canadá",
  "Slovakia": "Eslováquia",
  "Switzerland": "Suíça",
  "Cameroon": "Camarões",
  "Uruguay": "Uruguai",
  "South Korea": "Coreia do Sul",
  "Portugal": "Portugal",
  "Ghana": "Gana",
  "Ecuador": "Equador",
  "Saudi Arabia": "Arábia Saudita",
  "Serbia": "Sérvia",
  "Italy": "Itália",
  "Sweden": "Suécia",
  "Ukraine": "Ucrânia",
  "Turkey": "Turquia",
  "Colombia": "Colômbia",
  "Peru": "Peru",
  "Chile": "Chile",
  "Paraguay": "Paraguai",
  "Venezuela": "Venezuela",
  "Bolivia": "Bolívia",
  "South Africa": "África do Sul",
  "Ivory Coast": "Costa do Marfim",
  "Egypt": "Egito",
  "Nigeria": "Nigéria",
  "Algeria": "Argélia",
  "Russia": "Rússia",
  "Czech Republic": "República Tcheca",
  "Czechia": "República Tcheca",
  "Austria": "Áustria",
  "Hungary": "Hungria",
  "Romania": "Romênia",
  "Scotland": "Escócia",
  "Slovenia": "Eslovênia",
  "Georgia": "Geórgia",
  "Albania": "Albânia",
  "New Zealand": "Nova Zelândia",
  "Greece": "Grécia",
  "Iceland": "Islândia",
  "Norway": "Noruega",
  "Finland": "Finlândia",
  "Ireland": "Irlanda",
  "Northern Ireland": "Irlanda do Norte",
  "China": "China",
  "Honduras": "Honduras",
  "Jamaica": "Jamaica",
  "Panama": "Panamá",
  "Iraq": "Iraque",
  "Syria": "Síria",
  "United Arab Emirates": "Emirados Árabes Unidos",
  "Oman": "Omã",
  "Jordan": "Jordânia",
  "Lebanon": "Líbano",
  "Palestine": "Palestina",
  "Uzbekistan": "Uzbequistão",
  "Vietnam": "Vietnã",
  "Thailand": "Tailândia",
  "India": "Índia",
  "North Korea": "Coreia do Norte"
};

function translateTeamToPt(name: string): string {
  if (!name) return name;
  const trimmed = name.trim();
  if (TEAM_TRANSLATIONS[trimmed]) {
    return TEAM_TRANSLATIONS[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const k of Object.keys(TEAM_TRANSLATIONS)) {
    if (k.toLowerCase() === lower) {
      return TEAM_TRANSLATIONS[k];
    }
  }
  return trimmed;
}

function translateAllGamesInDb(db: any) {
  if (db && db.jogos && Array.isArray(db.jogos)) {
    for (const j of db.jogos) {
      if (j.time_casa) j.time_casa = translateTeamToPt(j.time_casa);
      if (j.time_fora) j.time_fora = translateTeamToPt(j.time_fora);
    }
  }
}

function cleanTeamNameLocal(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(fc|sc|sd|cd|de|del|la|atletico|esporte|sporting|deportivo|club|clube|independiente|independ|riva|mvd|uru|lp|de quito|quito|barranquilla)\b/g, "")
    .replace(/[^a-z0-9]/g, "") // remove special characters & spaces
    .trim();
}

function teamsMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const normA = nameA.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const normB = nameB.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // LDU match
  if (normA.startsWith("ldu") && normB.startsWith("ldu")) return true;
  // Barcelona match
  if ((normA.includes("barcelona") || normA.includes("bar.")) && (normB.includes("barcelona") || normB.includes("bar."))) return true;

  const cleanA = cleanTeamNameLocal(nameA);
  const cleanB = cleanTeamNameLocal(nameB);
  if (cleanA === cleanB) return true;

  // Split by words
  const wordListA = normA.split(/[^a-z0-9]/).filter(w => w.length >= 4);
  const wordListB = normB.split(/[^a-z0-9]/).filter(w => w.length >= 4);
  const exclude = ["club", "clube", "deportivo", "independiente", "junior", "nacional"];
  for (const wA of wordListA) {
    if (exclude.includes(wA)) continue;
    for (const wB of wordListB) {
      if (wA === wB) return true;
    }
  }
  return false;
}

function migrateGuessesAndPurgeFallbackLibertadores(db: LocalDatabase) {
  const fallbackGames = db.jogos.filter(j => j.api_id?.startsWith("libertadores_r"));
  const realGames = db.jogos.filter(j => j.api_id?.startsWith("libertadores_soccer_"));

  if (realGames.length === 0) {
    return; // No real API matches synchronized yet, keep fallbacks for display
  }

  console.log(`[Database Migration] Migrating user guesses from fallback matches to real Football API-Sports matches...`);
  let migrationCount = 0;
  const deletedGameIds: number[] = [];

  fallbackGames.forEach(fallback => {
    // Find matching real game in the same round (rodada)
    const matchedReal = realGames.find(real => 
      real.rodada === fallback.rodada && 
      teamsMatch(fallback.time_casa, real.time_casa) && 
      teamsMatch(fallback.time_fora, real.time_fora)
    );

    if (matchedReal) {
      // Find all user guesses pointing to the fallback.id
      db.palpites.forEach(palpite => {
        if (palpite.jogo_id === fallback.id) {
          // Point to real game's ID
          palpite.jogo_id = matchedReal.id;
          migrationCount++;
        }
      });
    }
    // ALWAYS delete the fallback match once real API fixtures exist
    deletedGameIds.push(fallback.id);
  });

  if (deletedGameIds.length > 0) {
    // Remove the fallback games from database
    db.jogos = db.jogos.filter(j => !deletedGameIds.includes(j.id));
    console.log(`[Database Migration] Purged ${deletedGameIds.length} fallback games. Migrated ${migrationCount} guesses.`);
    
    // Also perform safe deletion on MySQL side if Prisma is connected
    if (typeof prisma !== 'undefined' && prisma) {
      prisma.jogo.deleteMany({
        where: { id: { in: deletedGameIds } }
      })
      .then(res => {
        console.log(`[Database Migration MySQL] Deleted ${res.count} fallback rows from MySQL.`);
      })
      .catch(err => {
        console.error("[Database Migration MySQL Error] Direct delete failed:", err.message);
      });
    }
  }
}

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
    
    if (norm.includes("16") || norm.includes("eighth") || norm.includes("oitavas") || norm.includes("8th")) return 7;
    if (norm.includes("quarter") || norm.includes("quartas")) return 8;
    if (norm.includes("semi")) return 9;
    if (norm.includes("final")) return 10;
    return -100; // Qualifiers / Prévia matches return -100
  }

  if (norm.includes("group stage - 1") || norm.includes("rodada 1")) return 1;
  if (norm.includes("group stage - 2") || norm.includes("rodada 2")) return 2;
  if (norm.includes("group stage - 3") || norm.includes("rodada 3")) return 3;
  if (norm.includes("32")) return 4;
  if (norm.includes("16") || norm.includes("eighth") || norm.includes("oitavas") || norm.includes("8th")) return 5;
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

  const homeLower = (jogo.time_casa || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const awayLower = (jogo.time_fora || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const knownClubs = [
    "flamengo", "cruzeiro", "palmeiras", "corinthians", "vasco", "bahia", 
    "fluminense", "botafogo", "gremio", "internacional", "atletico", "santos",
    "estudiantes", "catolica", "rosario", "tolima", "valle", "mirassol", "ldu",
    "cerro", "peñarol", "penarol", "junior", "cristal", "lanus", "always",
    "platense", "coquimbo", "rivadavia", "boca"
  ];

  const hasClub = knownClubs.some(c => homeLower.includes(c) || awayLower.includes(c));
  if (hasClub) {
    if (jogo.rodada >= 11 && jogo.rodada <= 38) {
      return 'BRASILEIRAO';
    }
    return 'LIBERTADORES';
  }

  return 'COPA_MUNDO';
}

function cleanInvalidLibertadoresMatches(db: LocalDatabase) {
  const LIBERTADORES_GROUPS_TEAMS = new Set([
    "flamengo", "estudiantes", "estudiantes l.p.", "estudiantes lp", "estudiantes de la plata", "cusco", "cusco fc", "ind. medellin", "independiente medellin", "medellin",
    "nacional", "club nacional", "nacional montevideo", "nacional uru", "universitario", "universitário", "coquimbo unido", "coquimbo", "tolima", "deportes tolima",
    "fluminense", "bolivar", "bolívar", "dep. la guaira", "deportivo la guaira", "la guaira", "ind. rivadavia", "independiente rivadavia", "rivadavia",
    "boca juniors", "boca júniors", "boca", "cruzeiro", "univ. catolica", "universidad catolica", "univ catolica", "univ. católica", "bar. guayaquil", "barcelona sc", "barcelona guayaquil", "barcelona s.c.",
    "penarol", "peñarol", "corinthians", "corintians", "ind. santa fe", "independiente santa fe", "santa fe", "platense",
    "palmeiras", "cerro porteno", "cerro porteño", "junior barranquilla", "junior de barranquilla", "junior", "sporting cristal", "cristal",
    "ldu", "ldu quito", "ldu de quito", "lanus", "lanús", "always ready", "mirassol",
    "ind. del valle", "independiente del valle", "libertad", "libertad asuncion", "rosario central", "rosário central", "univ. central", "universidad central", "universidad central de venezuela", "ucv"
  ]);

  const isValidLibertadoresTeam = (name: string): boolean => {
    if (!name) return false;
    const cleaned = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "") // remove symbols & spaces
      .trim();

    // Normalise matches and database keys symmetrically
    const normalisedGroupsTeams = Array.from(LIBERTADORES_GROUPS_TEAMS).map(t => 
      t.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .replace(/[^a-z0-9]/g, "")
       .trim()
    );

    // Prevent known false-positive matches of qualifiers / non-group phase teams (like Nacional Potosi, etc.)
    if (cleaned === "nacionalpotosi" || cleaned.includes("potosi")) {
      return false;
    }
    if (cleaned === "atleticonacional" || cleaned === "nacionalparaguay" || cleaned === "nacionalasuncion") {
      return false;
    }

    if (normalisedGroupsTeams.includes(cleaned)) {
      return true;
    }

    // Fallback block - only allow substring checks for sufficiently long names
    for (const team of normalisedGroupsTeams) {
      if (team.length >= 6 && (cleaned.includes(team) || team.includes(cleaned))) {
        return true;
      }
    }

    return false;
  };

  const toDeleteIds: number[] = [];
  
  db.jogos = db.jogos.filter(j => {
    const isLib = (j.api_id?.toLowerCase().includes("libertadores") || getGameCampeonato(j) === 'LIBERTADORES');
    if (isLib) {
      const validTeams = isValidLibertadoresTeam(j.time_casa) && isValidLibertadoresTeam(j.time_fora);
      if (!validTeams || j.rodada === -100) {
        toDeleteIds.push(j.id);
        return false;
      }
    }
    return true;
  });

  if (toDeleteIds.length > 0) {
    console.log(`[Database Cleanup] Purging ${toDeleteIds.length} invalid Libertadores matches. IDs:`, toDeleteIds);
    if (prisma) {
      prisma.jogo.deleteMany({
        where: { id: { in: toDeleteIds } }
      })
      .then((res) => {
        console.log(`[Database Cleanup MySQL] Deleted ${res.count} qualifier rows from MySQL of total ${toDeleteIds.length} elements.`);
      })
      .catch((err) => {
        console.error("[Database Cleanup MySQL Error] Failed to delete rows:", err.message);
      });
    }
    return true;
  }
  return false;
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
      const mappedRound = parseRoundNumber(item.league?.round || "Group Stage - 1", true);
      if (mappedRound === -100) {
        continue; // Skip any qualifiers / pre-libertadores matches
      }

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
          teamsMatch(j.time_casa, timeCasa) && teamsMatch(j.time_fora, timeFora)
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
          rodada: mappedRound,
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
        existing.rodada = mappedRound;
        updatedCount++;
      }
    }
    cleanInvalidLibertadoresMatches(db);
    migrateGuessesAndPurgeFallbackLibertadores(db);
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
    const timeCasa = translateTeamToPt(item.teams.home.name);
    const timeFora = translateTeamToPt(item.teams.away.name);
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

function ensureCustomLogoAndFaviconStatus(db: LocalDatabase | null) {
  if (!db) return;
  const publicDir = path.join(process.cwd(), "public");
  const customLogoPath = path.join(publicDir, "custom-logo.png");

  // 1. Auto-Restore Custom Logo and PWA Icons if missing, but we have base64 in database
  if (db.configs_logo && db.configs_logo.has_custom_logo && db.configs_logo.custom_logo_base64 && !fs.existsSync(customLogoPath)) {
    try {
      console.log("[Logo Restoration] Recreating custom-logo.png and icons from persistent DB custom_logo_base64...");
      const base64Str = db.configs_logo.custom_logo_base64;
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], "base64");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(customLogoPath, buffer);

        const distPath = path.join(process.cwd(), "dist");
        if (fs.existsSync(distPath)) {
          try { fs.copyFileSync(customLogoPath, path.join(distPath, "custom-logo.png")); } catch (e) {}
        }

        const icon192Path = path.join(publicDir, "icon-192.png");
        const icon512Path = path.join(publicDir, "icon-512.png");
        
        sharp(buffer)
          .resize({ width: 256, height: 256, fit: "inside" })
          .png()
          .toFile(customLogoPath)
          .catch(() => {});

        sharp(buffer).resize(192, 192, { fit: "cover" }).png().toBuffer().then(b => {
          fs.writeFileSync(icon192Path, b);
          if (fs.existsSync(distPath)) {
            try { fs.copyFileSync(icon192Path, path.join(distPath, "icon-192.png")); } catch (e) {}
          }
        }).catch(() => {});

        sharp(buffer).resize(512, 512, { fit: "cover" }).png().toBuffer().then(b => {
          fs.writeFileSync(icon512Path, b);
          if (fs.existsSync(distPath)) {
            try { fs.copyFileSync(icon512Path, path.join(distPath, "icon-512.png")); } catch (e) {}
          }
        }).catch(() => {});
      }
    } catch (restoreErr: any) {
      console.error("[Logo Restoration Error]", restoreErr.message);
    }
  }

  // 2. Auto-Restore Custom Favicon if missing, but we have base64 in database
  const extDb = db.configs_favicon?.extension || "ico";
  const expectedFaviconPath = path.join(publicDir, `favicon.${extDb}`);
  if (db.configs_favicon && db.configs_favicon.has_custom_favicon && db.configs_favicon.custom_favicon_base64 && !fs.existsSync(expectedFaviconPath)) {
    try {
      console.log(`[Favicon Restoration] Recreating favicon.${extDb} from persistent DB custom_favicon_base64...`);
      const base64Str = db.configs_favicon.custom_favicon_base64;
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], "base64");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        const possibleNames = ["favicon.ico", "favicon.png", "favicon.svg"];
        possibleNames.forEach(name => {
          try {
            const fp = path.join(publicDir, name);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch (e) {}
        });

        fs.writeFileSync(expectedFaviconPath, buffer);

        const distPath = path.join(process.cwd(), "dist");
        if (fs.existsSync(distPath)) {
          possibleNames.forEach(name => {
            try {
              const dp = path.join(distPath, name);
              if (fs.existsSync(dp)) fs.unlinkSync(dp);
            } catch (e) {}
          });
          try { fs.copyFileSync(expectedFaviconPath, path.join(distPath, `favicon.${extDb}`)); } catch (e) {}
        }
      }
    } catch (restoreErr: any) {
      console.error("[Favicon Restoration Error]", restoreErr.message);
    }
  }

  if (fs.existsSync(customLogoPath)) {
    try {
      const stats = fs.statSync(customLogoPath);
      db.configs_logo = {
        has_custom_logo: true,
        timestamp: Math.floor(stats.mtimeMs || Date.now()),
        custom_logo_base64: db.configs_logo?.custom_logo_base64
      };
    } catch (e) {
      db.configs_logo = {
        has_custom_logo: true,
        timestamp: Date.now(),
        custom_logo_base64: db.configs_logo?.custom_logo_base64
      };
    }
  } else if (!db.configs_logo) {
    db.configs_logo = {
      has_custom_logo: false,
      timestamp: 0
    };
  }

  const favIco = path.join(publicDir, "favicon.ico");
  const favPng = path.join(publicDir, "favicon.png");
  const favSvg = path.join(publicDir, "favicon.svg");
  let hasFav = false;
  let ext = "ico";
  let mtime = Date.now();
  if (fs.existsSync(favIco)) {
    hasFav = true;
    ext = "ico";
    try { mtime = fs.statSync(favIco).mtimeMs; } catch (e) {}
  } else if (fs.existsSync(favPng)) {
    hasFav = true;
    ext = "png";
    try { mtime = fs.statSync(favPng).mtimeMs; } catch (e) {}
  } else if (fs.existsSync(favSvg)) {
    hasFav = true;
    ext = "svg";
    try { mtime = fs.statSync(favSvg).mtimeMs; } catch (e) {}
  }

  if (hasFav) {
    db.configs_favicon = {
      has_custom_favicon: true,
      timestamp: Math.floor(mtime),
      extension: ext,
      custom_favicon_base64: db.configs_favicon?.custom_favicon_base64
    };
  } else if (!db.configs_favicon) {
    db.configs_favicon = {
      has_custom_favicon: false,
      timestamp: 0
    };
  }
}

function ensureCustomConfigs(db: LocalDatabase | null) {
  if (!db) return;
  if (!db.configs_custom) {
    db.configs_custom = {};
  }
  if (db.configs_custom.background_image === undefined) {
    db.configs_custom.background_image = "";
  }
  if (db.configs_custom.ad_image === undefined) {
    db.configs_custom.ad_image = "";
  }
  if (db.configs_custom.header_title_1 === undefined) {
    db.configs_custom.header_title_1 = "CARTOLA ITL";
  }
  if (db.configs_custom.header_title_2 === undefined) {
    db.configs_custom.header_title_2 = "PROVEDOR ITLFIBRA";
  }
  if (db.configs_custom.header_description === undefined) {
    db.configs_custom.header_description = "Mostre suas habilidades de palpite, crave placares exatos das maiores seleções e dispute um ano de internet grátis, TVs, consoles de última geração e prêmios incríveis!";
  }
  if (!db.configs_custom.regras) {
    db.configs_custom.regras = [
      {
        id: 1,
        titulo: "Participação Gratuita",
        texto: "Bolão exclusivo para clientes ativos do nosso provedor, sem custo adicional."
      },
      {
        id: 2,
        titulo: "Bloqueio Prévio",
        texto: "As apostas para cada partida serão encerradas exatamente 1 hora antes do início configurado pelo horário do servidor."
      },
      {
        id: 3,
        titulo: "Sistemática de Pontos",
        texto: "Acordo de vencedor: 4 pontos. Empate: 4 pontos. Placar Exato: +6 pontos bônus (totalizando 10 pontos)."
      },
      {
        id: 4,
        titulo: "Validação Mensal",
        texto: "Em caso de inadimplência no provedor, o acesso pode ser temporariamente suspenso até a regularização cadastral automática."
      }
    ];
  }
  if (!db.configs_custom.premiacoes) {
    db.configs_custom.premiacoes = [
      {
        posicao: "1º Lugar Geral (Final da Copa)",
        premio: "1 Ano de Internet Grátis",
        detalhes: "Grande campeão do Bolão Geral ao final do torneio."
      },
      {
        posicao: "1º Lugar de Cada Rodada",
        premio: "1 Mês de Internet Grátis + Brinde Exclusivo",
        detalhes: "Para o maior pontuador individual de cada rodada da Copa."
      },
      {
        posicao: "2º Lugar de Cada Rodada",
        premio: "1 Mês de Internet Grátis",
        detalhes: "Para o segundo colocado de cada rodada individual."
      },
      {
        posicao: "3º Lugar de Cada Rodada",
        premio: "Um Brinde Exclusivo da ITLFIBRA",
        detalhes: "Para o terceiro colocado de cada rodada individual."
      }
    ];
  }
  if (db.configs_custom.recaptcha_active === undefined) {
    db.configs_custom.recaptcha_active = true;
  }
  if (db.configs_custom.recaptcha_site_key === undefined) {
    db.configs_custom.recaptcha_site_key = "6Lf4qjAsAAAAAXVXGhzCDJpaV1VtWDZOdWl4jI";
  }
  if (db.configs_custom.recaptcha_secret_key === undefined) {
    db.configs_custom.recaptcha_secret_key = "6Lf4qjAsAAAAAC3zwCjx0i7k_UNzaiPSUKw34AOy";
  }
}

function loadDatabase(): LocalDatabase {
  if (cachedDb) {
    ensureCustomLogoAndFaviconStatus(cachedDb);
    ensureCustomConfigs(cachedDb);
    
    // Auto-populate warm cache if missing Copa Libertadores matches
    const hasWarmLibertadoresMatches = cachedDb.jogos.some(j => (j.api_id?.toLowerCase().includes("libertadores") || getGameCampeonato(j) === "LIBERTADORES"));
    if (!hasWarmLibertadoresMatches) {
      console.log("[Database Warm Cache] Warm loading database and auto-populating missing Libertadores matches...");
      for (const item of FALLBACK_LIBERTADORES) {
        const newId = cachedDb.jogos.length > 0 ? Math.max(...cachedDb.jogos.map(j => j.id)) + 1 : 1;
        cachedDb.jogos.push({
          id: newId,
          api_id: item.api_id,
          time_casa: item.time_casa,
          time_fora: item.time_fora,
          time_casa_bandeira: item.time_casa_bandeira,
          time_fora_bandeira: item.time_fora_bandeira,
          data_jogo: item.data_jogo,
          placar_casa: item.placar_casa,
          placar_fora: item.placar_fora,
          status: item.status as any,
          status_detalhado: item.status_detalhado || (item.status === "ENCERRADO" ? "FT" : "FT"),
          rodada: item.rodada
        });
      }
      saveDatabase(cachedDb);
    }
    
    if (!cachedDb.push_subscriptions) {
      cachedDb.push_subscriptions = [];
    }
    
    if (!cachedDb.correcoes) {
      cachedDb.correcoes = [];
    }
    
    translateAllGamesInDb(cachedDb);
    return cachedDb;
  }
  cachedDb = loadDatabaseFromFile();

  if (!cachedDb.push_subscriptions) {
    cachedDb.push_subscriptions = [];
  }

  if (!cachedDb.correcoes) {
    cachedDb.correcoes = [];
  }

  if (cachedDb.configs_points && !cachedDb.configs_points.pontos_acertar_autor_gol) {
    cachedDb.configs_points.pontos_acertar_autor_gol = 7;
  }

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

  // Purge any unwanted Libertadores qualifier entries or unmatched teams to make group stage/standings pristine
  const purgedLibMatches = cleanInvalidLibertadoresMatches(cachedDb);
  if (purgedLibMatches) {
    saveDatabase(cachedDb);
  }

  // If no Copa Libertadores games exist, auto-populate them in cache using the global manual groups fallback schedule
  const legacyCount = cachedDb.jogos.length;
  cachedDb.jogos = cachedDb.jogos.filter(j => !(j.api_id && j.api_id.startsWith("libertadores_fallback_")));
  if (cachedDb.jogos.length !== legacyCount) {
    saveDatabase(cachedDb);
  }

  const hasLibertadoresMatches = cachedDb.jogos.some(j => (j.api_id?.toLowerCase().includes("libertadores") || getGameCampeonato(j) === "LIBERTADORES"));
  if (!hasLibertadoresMatches) {
    console.log("[Database Load] Auto-populating Copa Libertadores 2026 groups manual matches...");
    for (const item of FALLBACK_LIBERTADORES) {
      const newId = cachedDb.jogos.length > 0 ? Math.max(...cachedDb.jogos.map(j => j.id)) + 1 : 1;
      cachedDb.jogos.push({
        id: newId,
        api_id: item.api_id,
        time_casa: item.time_casa,
        time_fora: item.time_fora,
        time_casa_bandeira: item.time_casa_bandeira,
        time_fora_bandeira: item.time_fora_bandeira,
        data_jogo: item.data_jogo,
        placar_casa: item.placar_casa,
        placar_fora: item.placar_fora,
        status: item.status as any,
        status_detalhado: item.status_detalhado || (item.status === "ENCERRADO" ? "FT" : "FT"),
        rodada: item.rodada
      });
    }
    saveDatabase(cachedDb);
  }

  ensureCustomLogoAndFaviconStatus(cachedDb);
  ensureCustomConfigs(cachedDb);
  translateAllGamesInDb(cachedDb);
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
    // Clone and strip large base64 strings before writing to the local backup file to keep disk saving extremely fast
    const dbToSave = JSON.parse(JSON.stringify(db)) as LocalDatabase;
    if (dbToSave.configs_logo) {
      delete dbToSave.configs_logo.custom_logo_base64;
    }
    if (dbToSave.configs_favicon) {
      delete dbToSave.configs_favicon.custom_favicon_base64;
    }
    if (dbToSave.configs_custom) {
      delete (dbToSave.configs_custom as any).background_image;
      delete (dbToSave.configs_custom as any).ad_image;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbToSave, null, 2), "utf-8");
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

let lastSyncedDbState: LocalDatabase | null = null;

function isUsuarioDifferent(u1: any, u2: any): boolean {
  if (!u1 || !u2) return true;
  return (
    (u1.ixc_id || "").toString() !== (u2.ixc_id || "").toString() ||
    (u1.nome || "").trim() !== (u2.nome || "").trim() ||
    (u1.cpf_cnpj || "").replace(/\D/g, "") !== (u2.cpf_cnpj || "").replace(/\D/g, "") ||
    (u1.telefone || "").toString() !== (u2.telefone || "").toString() ||
    (u1.email || "").toLowerCase().trim() !== (u2.email || "").toLowerCase().trim() ||
    (u1.cidade || "").trim() !== (u2.cidade || "").trim() ||
    (u1.avatar || "⚽") !== (u2.avatar || "⚽") ||
    Number(u1.pontos_total || 0) !== Number(u2.pontos_total || 0) ||
    Number(u1.acertos_exato || 0) !== Number(u2.acertos_exato || 0) ||
    Number(u1.acertos_vencedor || 0) !== Number(u2.acertos_vencedor || 0) ||
    Number(u1.erros || 0) !== Number(u2.erros || 0) ||
    Boolean(u1.bloqueado) !== Boolean(u2.bloqueado)
  );
}

function isJogoDifferent(j1: any, j2: any): boolean {
  if (!j1 || !j2) return true;

  const d1 = j1.data_jogo ? new Date(j1.data_jogo).getTime() : 0;
  const d2 = j2.data_jogo ? new Date(j2.data_jogo).getTime() : 0;

  return (
    (j1.api_id || "").toString() !== (j2.api_id || "").toString() ||
    (j1.time_casa || "").trim() !== (j2.time_casa || "").trim() ||
    (j1.time_fora || "").trim() !== (j2.time_fora || "").trim() ||
    (j1.time_casa_bandeira || "") !== (j2.time_casa_bandeira || "") ||
    (j1.time_fora_bandeira || "") !== (j2.time_fora_bandeira || "") ||
    d1 !== d2 ||
    (j1.placar_casa !== null && j1.placar_casa !== undefined ? Number(j1.placar_casa) : null) !== (j2.placar_casa !== null && j2.placar_casa !== undefined ? Number(j2.placar_casa) : null) ||
    (j1.placar_fora !== null && j1.placar_fora !== undefined ? Number(j1.placar_fora) : null) !== (j2.placar_fora !== null && j2.placar_fora !== undefined ? Number(j2.placar_fora) : null) ||
    (j1.placar_casa_prorrogacao !== null && j1.placar_casa_prorrogacao !== undefined ? Number(j1.placar_casa_prorrogacao) : null) !== (j2.placar_casa_prorrogacao !== null && j2.placar_casa_prorrogacao !== undefined ? Number(j2.placar_casa_prorrogacao) : null) ||
    (j1.placar_fora_prorrogacao !== null && j1.placar_fora_prorrogacao !== undefined ? Number(j1.placar_fora_prorrogacao) : null) !== (j2.placar_fora_prorrogacao !== null && j2.placar_fora_prorrogacao !== undefined ? Number(j2.placar_fora_prorrogacao) : null) ||
    (j1.placar_casa_penaltis !== null && j1.placar_casa_penaltis !== undefined ? Number(j1.placar_casa_penaltis) : null) !== (j2.placar_casa_penaltis !== null && j2.placar_casa_penaltis !== undefined ? Number(j2.placar_casa_penaltis) : null) ||
    (j1.placar_fora_penaltis !== null && j1.placar_fora_penaltis !== undefined ? Number(j1.placar_fora_penaltis) : null) !== (j2.placar_fora_penaltis !== null && j2.placar_fora_penaltis !== undefined ? Number(j2.placar_fora_penaltis) : null) ||
    (j1.status || "PENDENTE") !== (j2.status || "PENDENTE") ||
    (j1.status_detalhado || "NS") !== (j2.status_detalhado || "NS") ||
    Number(j1.rodada || 1) !== Number(j2.rodada || 1)
  );
}

function isPalpiteDifferent(p1: any, p2: any): boolean {
  if (!p1 || !p2) return true;
  return (
    (p1.placar_casa !== null && p1.placar_casa !== undefined ? Number(p1.placar_casa) : null) !== (p2.placar_casa !== null && p2.placar_casa !== undefined ? Number(p2.placar_casa) : null) ||
    (p1.placar_fora !== null && p1.placar_fora !== undefined ? Number(p1.placar_fora) : null) !== (p2.placar_fora !== null && p2.placar_fora !== undefined ? Number(p2.placar_fora) : null) ||
    (p1.placar_casa_prorrogacao !== null && p1.placar_casa_prorrogacao !== undefined ? Number(p1.placar_casa_prorrogacao) : null) !== (p2.placar_casa_prorrogacao !== null && p2.placar_casa_prorrogacao !== undefined ? Number(p2.placar_casa_prorrogacao) : null) ||
    (p1.placar_fora_prorrogacao !== null && p1.placar_fora_prorrogacao !== undefined ? Number(p1.placar_fora_prorrogacao) : null) !== (p2.placar_fora_prorrogacao !== null && p2.placar_fora_prorrogacao !== undefined ? Number(p2.placar_fora_prorrogacao) : null) ||
    (p1.placar_casa_penaltis !== null && p1.placar_casa_penaltis !== undefined ? Number(p1.placar_casa_penaltis) : null) !== (p2.placar_casa_penaltis !== null && p2.placar_casa_penaltis !== undefined ? Number(p2.placar_casa_penaltis) : null) ||
    (p1.placar_fora_penaltis !== null && p1.placar_fora_penaltis !== undefined ? Number(p1.placar_fora_penaltis) : null) !== (p2.placar_fora_penaltis !== null && p2.placar_fora_penaltis !== undefined ? Number(p2.placar_fora_penaltis) : null) ||
    Number(p1.pontos || 0) !== Number(p2.pontos || 0) ||
    JSON.stringify(p1.palpites_gols_jogadores || null) !== JSON.stringify(p2.palpites_gols_jogadores || null)
  );
}

function isAdminDifferent(a1: any, a2: any): boolean {
  if (!a1 || !a2) return true;
  return (
    (a1.email || "").toLowerCase().trim() !== (a2.email || "").toLowerCase().trim() ||
    (a1.nome || "").trim() !== (a2.nome || "").trim() ||
    (a1.senha || "200616") !== (a2.senha || "200616") ||
    Boolean(a1.podeExcluir !== false) !== Boolean(a2.podeExcluir !== false) ||
    Boolean(a1.podeEditar !== false) !== Boolean(a2.podeEditar !== false) ||
    Boolean(a1.podeAtivarCampeonato !== false) !== Boolean(a2.podeAtivarCampeonato !== false)
  );
}

async function saveDatabaseToMySqlIncremental(db: LocalDatabase | null) {
  if (!prisma || !db) return;

  try {
    let usersToSync = db.usuarios;
    let gamesToSync = db.jogos;
    let betsToSync = db.palpites;
    let adminsToSync = db.admins || [];
    
    let usersToDelete: number[] = [];
    let gamesToDelete: number[] = [];
    let betsToDelete: Array<{ usuario_id: number; jogo_id: number }> = [];
    let adminsToDelete: number[] = [];

    const isFullSync = !lastSyncedDbState;

    const nextSyncedDbState: LocalDatabase = lastSyncedDbState 
      ? JSON.parse(JSON.stringify(lastSyncedDbState))
      : {
          usuarios: [],
          jogos: [],
          palpites: [],
          configs_ixc: {},
          configs_points: {},
          configs_football: {},
          logs: [],
          admins: [],
          configs_libertadores: { ativo: false },
          configs_copa_mundo: { ativo: true },
          configs_brasileirao: { ativo: false },
          configs_custom: {},
          configs_logo: {},
          configs_favicon: {}
        } as any;

    if (!isFullSync && lastSyncedDbState) {
      // 1. Detect modified/new users
      usersToSync = db.usuarios.filter(u => {
        const prev = lastSyncedDbState!.usuarios.find(x => x.id === u.id);
        return !prev || isUsuarioDifferent(u, prev);
      });
      // Detect deleted users
      usersToDelete = lastSyncedDbState.usuarios
        .filter(prev => !db.usuarios.some(x => x.id === prev.id))
        .map(x => x.id);

      // 2. Detect modified/new games
      gamesToSync = db.jogos.filter(g => {
        const prev = lastSyncedDbState!.jogos.find(x => x.id === g.id);
        return !prev || isJogoDifferent(g, prev);
      });
      // Detect deleted games
      gamesToDelete = lastSyncedDbState.jogos
        .filter(prev => !db.jogos.some(x => x.id === prev.id))
        .map(x => x.id);

      // 3. Detect modified/new bets (palpites)
      betsToSync = db.palpites.filter(p => {
        const prev = lastSyncedDbState!.palpites.find(x => x.usuario_id === p.usuario_id && x.jogo_id === p.jogo_id);
        return !prev || isPalpiteDifferent(p, prev);
      });
      // Detect deleted bets
      betsToDelete = lastSyncedDbState.palpites
        .filter(prev => !db.palpites.some(x => x.usuario_id === prev.usuario_id && x.jogo_id === prev.jogo_id))
        .map(x => ({ usuario_id: x.usuario_id, jogo_id: x.jogo_id }));

      // 4. Detect modified/new admins
      adminsToSync = (db.admins || []).filter(a => {
        const prev = (lastSyncedDbState!.admins || []).find(x => x.id === a.id);
        return !prev || isAdminDifferent(a, prev);
      });
      // Detect deleted admins
      adminsToDelete = (lastSyncedDbState.admins || [])
        .filter(prev => !(db.admins || []).some(x => x.id === prev.id))
        .map(x => x.id);
    }

    // A. Sync deleted items first
    try {
      if (usersToDelete.length > 0) {
        console.log(`[MySql Async Sync] Syncing deletion of ${usersToDelete.length} users from MySQL`);
        await prisma.usuario.deleteMany({
          where: { id: { in: usersToDelete } }
        });
        nextSyncedDbState.usuarios = nextSyncedDbState.usuarios.filter(u => !usersToDelete.includes(u.id));
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing users deletion:", err.message);
    }

    try {
      if (gamesToDelete.length > 0) {
        console.log(`[MySql Async Sync] Syncing deletion of ${gamesToDelete.length} games from MySQL`);
        await prisma.jogo.deleteMany({
          where: { id: { in: gamesToDelete } }
        });
        nextSyncedDbState.jogos = nextSyncedDbState.jogos.filter(g => !gamesToDelete.includes(g.id));
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing games deletion:", err.message);
    }

    try {
      if (betsToDelete.length > 0) {
        console.log(`[MySql Async Sync] Syncing deletion of ${betsToDelete.length} bets from MySQL`);
        let successfullyDeletedBets: Array<{ usuario_id: number; jogo_id: number }> = [];
        await Promise.all(
          betsToDelete.map(async (b) => {
            try {
              await prisma!.palpite.delete({
                where: {
                  usuario_id_jogo_id: {
                    usuario_id: b.usuario_id,
                    jogo_id: b.jogo_id
                  }
                }
              });
              successfullyDeletedBets.push(b);
            } catch (err) {}
          })
        );
        nextSyncedDbState.palpites = nextSyncedDbState.palpites.filter(
          p => !successfullyDeletedBets.some(b => b.usuario_id === p.usuario_id && b.jogo_id === p.jogo_id)
        );
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing bets deletion:", err.message);
    }

    try {
      if (adminsToDelete.length > 0) {
        console.log(`[MySql Async Sync] Syncing deletion of ${adminsToDelete.length} admins from MySQL`);
        await prisma.admin.deleteMany({
          where: { id: { in: adminsToDelete } }
        });
        nextSyncedDbState.admins = (nextSyncedDbState.admins || []).filter(a => !adminsToDelete.includes(a.id));
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing admins deletion:", err.message);
    }

    // B. Sync modified/created Users in chunks of 20 to prevent query overflow
    try {
      if (usersToSync.length > 0) {
        console.log(`[MySql Async Sync] Syncing ${usersToSync.length} modified/new users to MySQL`);
        const chunkSize = 20;
        for (let i = 0; i < usersToSync.length; i += chunkSize) {
          const chunk = usersToSync.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (u) => {
              try {
                await prisma!.usuario.upsert({
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
                const idx = nextSyncedDbState.usuarios.findIndex(x => x.id === u.id);
                if (idx !== -1) {
                  nextSyncedDbState.usuarios[idx] = JSON.parse(JSON.stringify(u));
                } else {
                  nextSyncedDbState.usuarios.push(JSON.parse(JSON.stringify(u)));
                }
              } catch (err: any) {
                console.error(`[MySql Sync] Failed to upsert user ID ${u.id} (${u.nome}):`, err.message);
              }
            })
          );
        }
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing users list:", err.message);
    }

    // C. Sync modified/created Games in chunks of 20 to prevent query overflow
    try {
      if (gamesToSync.length > 0) {
        console.log(`[MySql Async Sync] Syncing ${gamesToSync.length} modified/new games to MySQL`);
        const chunkSize = 20;
        for (let i = 0; i < gamesToSync.length; i += chunkSize) {
          const chunk = gamesToSync.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (g) => {
              try {
                await prisma!.jogo.upsert({
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
                    placar_casa_prorrogacao: g.placar_casa_prorrogacao,
                    placar_fora_prorrogacao: g.placar_fora_prorrogacao,
                    placar_casa_penaltis: g.placar_casa_penaltis,
                    placar_fora_penaltis: g.placar_fora_penaltis,
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
                    placar_casa_prorrogacao: g.placar_casa_prorrogacao,
                    placar_fora_prorrogacao: g.placar_fora_prorrogacao,
                    placar_casa_penaltis: g.placar_casa_penaltis,
                    placar_fora_penaltis: g.placar_fora_penaltis,
                    status: g.status,
                    status_detalhado: g.status_detalhado || "NS",
                    rodada: g.rodada
                  }
                });
                const idx = nextSyncedDbState.jogos.findIndex(x => x.id === g.id);
                if (idx !== -1) {
                  nextSyncedDbState.jogos[idx] = JSON.parse(JSON.stringify(g));
                } else {
                  nextSyncedDbState.jogos.push(JSON.parse(JSON.stringify(g)));
                }
              } catch (err: any) {
                console.error(`[MySql Sync] Failed to upsert game ID ${g.id} (${g.time_casa} x ${g.time_fora}):`, err.message);
              }
            })
          );
        }
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing games list:", err.message);
    }

    // D. Sync modified/created Bets (Palpites) optimized with Set O(1) membership check and chunked execution
    try {
      if (betsToSync.length > 0) {
        console.log(`[MySql Async Sync] Syncing ${betsToSync.length} modified/new bets to MySQL`);
        const userIdsSet = new Set(db.usuarios.map(u => u.id));
        const gameIdsSet = new Set(db.jogos.map(g => g.id));
        
        const filteredBetsToSync = betsToSync.filter(p => userIdsSet.has(p.usuario_id) && gameIdsSet.has(p.jogo_id));

        const chunkSize = 20;
        for (let i = 0; i < filteredBetsToSync.length; i += chunkSize) {
          const chunk = filteredBetsToSync.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (p) => {
              try {
                await prisma!.palpite.upsert({
                  where: {
                    usuario_id_jogo_id: {
                      usuario_id: p.usuario_id,
                      jogo_id: p.jogo_id
                    }
                  },
                  update: {
                    placar_casa: p.placar_casa,
                    placar_fora: p.placar_fora,
                    placar_casa_prorrogacao: p.placar_casa_prorrogacao,
                    placar_fora_prorrogacao: p.placar_fora_prorrogacao,
                    placar_casa_penaltis: p.placar_casa_penaltis,
                    placar_fora_penaltis: p.placar_fora_penaltis,
                    pontos: p.pontos,
                    gols_jogadores: p.palpites_gols_jogadores ? JSON.stringify(p.palpites_gols_jogadores) : null
                  },
                  create: {
                    usuario_id: p.usuario_id,
                    jogo_id: p.jogo_id,
                    placar_casa: p.placar_casa,
                    placar_fora: p.placar_fora,
                    placar_casa_prorrogacao: p.placar_casa_prorrogacao,
                    placar_fora_prorrogacao: p.placar_fora_prorrogacao,
                    placar_casa_penaltis: p.placar_casa_penaltis,
                    placar_fora_penaltis: p.placar_fora_penaltis,
                    pontos: p.pontos,
                    gols_jogadores: p.palpites_gols_jogadores ? JSON.stringify(p.palpites_gols_jogadores) : null,
                    created_at: new Date(p.created_at)
                  }
                });
                const idx = nextSyncedDbState.palpites.findIndex(x => x.usuario_id === p.usuario_id && x.jogo_id === p.jogo_id);
                if (idx !== -1) {
                  nextSyncedDbState.palpites[idx] = JSON.parse(JSON.stringify(p));
                } else {
                  nextSyncedDbState.palpites.push(JSON.parse(JSON.stringify(p)));
                }
              } catch (err: any) {
                console.error(`[MySql Sync] Failed to upsert bet (user ID ${p.usuario_id}, game ID ${p.jogo_id}):`, err.message);
              }
            })
          );
        }
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing bets list:", err.message);
    }

    // E. Sync configs ONLY if changed
    try {
      const configsChanged = isFullSync || (
        JSON.stringify(db.configs_ixc) !== JSON.stringify(lastSyncedDbState!.configs_ixc) ||
        JSON.stringify(db.configs_points) !== JSON.stringify(lastSyncedDbState!.configs_points) ||
        JSON.stringify(db.configs_football) !== JSON.stringify(lastSyncedDbState!.configs_football) ||
        db.configs_libertadores?.ativo !== lastSyncedDbState!.configs_libertadores?.ativo ||
        db.configs_copa_mundo?.ativo !== lastSyncedDbState!.configs_copa_mundo?.ativo ||
        db.configs_brasileirao?.ativo !== lastSyncedDbState!.configs_brasileirao?.ativo
      );

      if (configsChanged) {
        console.log(`[MySql Async Sync] Syncing updated configuration parameters to MySQL`);
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
            points_autor_gol: db.configs_points.pontos_acertar_autor_gol || 7,
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
            points_autor_gol: db.configs_points.pontos_acertar_autor_gol || 7,
            bonus_rodada: db.configs_points.bonus_rodada,
            bonus_sequencia: db.configs_points.bonus_sequencia,
            bonus_jogos_perfeitos: db.configs_points.bonus_jogos_perfeitos,
            football_api_key: db.configs_football.key,
            football_api_url: db.configs_football.url,
            sync_manual_override: db.configs_football.manual_override,
            sync_cron_active: db.configs_football.cron_active
          }
        });

        if (db.configs_ixc.token) {
          await prisma.apiToken.upsert({
            where: { id: 1 },
            update: { servico: "ixc_token", token: db.configs_ixc.token },
            create: { id: 1, servico: "ixc_token", token: db.configs_ixc.token }
          });
        }

        if (db.configs_ixc.chave) {
          await prisma.apiToken.upsert({
            where: { id: 2 },
            update: { servico: "ixc_chave", token: db.configs_ixc.chave },
            create: { id: 2, servico: "ixc_chave", token: db.configs_ixc.chave }
          });
        }

        if (db.configs_football.key) {
          await prisma.apiToken.upsert({
            where: { id: 3 },
            update: { servico: "football_api", token: db.configs_football.key },
            create: { id: 3, servico: "football_api", token: db.configs_football.key }
          });
        }

        nextSyncedDbState.configs_ixc = JSON.parse(JSON.stringify(db.configs_ixc));
        nextSyncedDbState.configs_points = JSON.parse(JSON.stringify(db.configs_points));
        nextSyncedDbState.configs_football = JSON.parse(JSON.stringify(db.configs_football));
        nextSyncedDbState.configs_libertadores = JSON.parse(JSON.stringify(db.configs_libertadores || { ativo: false }));
        nextSyncedDbState.configs_copa_mundo = JSON.parse(JSON.stringify(db.configs_copa_mundo || { ativo: true }));
        nextSyncedDbState.configs_brasileirao = JSON.parse(JSON.stringify(db.configs_brasileirao || { ativo: false }));
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing configurations params:", err.message);
    }

    // F. Sync branding (personalizacao) ONLY if changed
    try {
      const brandingChanged = isFullSync || (
        JSON.stringify(db.configs_custom || {}) !== JSON.stringify(lastSyncedDbState!.configs_custom || {}) ||
        JSON.stringify(db.configs_logo || {}) !== JSON.stringify(lastSyncedDbState!.configs_logo || {}) ||
        JSON.stringify(db.configs_favicon || {}) !== JSON.stringify(lastSyncedDbState!.configs_favicon || {})
      );

      if (brandingChanged) {
        console.log(`[MySql Async Sync] Syncing updated branding/texts parameters to MySQL`);
        const configCustom = (db.configs_custom || {}) as any;
        const configLogo = (db.configs_logo || {}) as any;
        const configFavicon = (db.configs_favicon || {}) as any;

        await prisma.personalizacao.upsert({
          where: { id: 1 },
          update: {
            background_image: configCustom.background_image || null,
            ad_image: configCustom.ad_image || null,
            header_title_1: configCustom.header_title_1 || null,
            header_title_2: configCustom.header_title_2 || null,
            header_description: configCustom.header_description || null,
            regras: configCustom.regras ? JSON.stringify(configCustom.regras) : null,
            premiacoes: configCustom.premiacoes ? JSON.stringify(configCustom.premiacoes) : null,
            recaptcha_active: configCustom.recaptcha_active !== undefined ? Boolean(configCustom.recaptcha_active) : true,
            recaptcha_site_key: configCustom.recaptcha_site_key || null,
            recaptcha_secret_key: configCustom.recaptcha_secret_key || null,
            has_custom_logo: configLogo.has_custom_logo !== undefined ? Boolean(configLogo.has_custom_logo) : false,
            custom_logo_base64: configLogo.custom_logo_base64 || null,
            custom_logo_timestamp: configLogo.timestamp !== undefined ? String(configLogo.timestamp) : null,
            has_custom_favicon: configFavicon.has_custom_favicon !== undefined ? Boolean(configFavicon.has_custom_favicon) : false,
            custom_favicon_base64: configFavicon.custom_favicon_base64 || null,
            custom_favicon_extension: configFavicon.extension || null,
            custom_favicon_timestamp: configFavicon.timestamp !== undefined ? String(configFavicon.timestamp) : null,
          },
          create: {
            id: 1,
            background_image: configCustom.background_image || null,
            ad_image: configCustom.ad_image || null,
            header_title_1: configCustom.header_title_1 || null,
            header_title_2: configCustom.header_title_2 || null,
            header_description: configCustom.header_description || null,
            regras: configCustom.regras ? JSON.stringify(configCustom.regras) : null,
            premiacoes: configCustom.premiacoes ? JSON.stringify(configCustom.premiacoes) : null,
            recaptcha_active: configCustom.recaptcha_active !== undefined ? Boolean(configCustom.recaptcha_active) : true,
            recaptcha_site_key: configCustom.recaptcha_site_key || null,
            recaptcha_secret_key: configCustom.recaptcha_secret_key || null,
            has_custom_logo: configLogo.has_custom_logo !== undefined ? Boolean(configLogo.has_custom_logo) : false,
            custom_logo_base64: configLogo.custom_logo_base64 || null,
            custom_logo_timestamp: configLogo.timestamp !== undefined ? String(configLogo.timestamp) : null,
            has_custom_favicon: configFavicon.has_custom_favicon !== undefined ? Boolean(configFavicon.has_custom_favicon) : false,
            custom_favicon_base64: configFavicon.custom_favicon_base64 || null,
            custom_favicon_extension: configFavicon.extension || null,
            custom_favicon_timestamp: configFavicon.timestamp !== undefined ? String(configFavicon.timestamp) : null,
          }
        });

        nextSyncedDbState.configs_custom = JSON.parse(JSON.stringify(db.configs_custom || {}));
        nextSyncedDbState.configs_logo = JSON.parse(JSON.stringify(db.configs_logo || {}));
        nextSyncedDbState.configs_favicon = JSON.parse(JSON.stringify(db.configs_favicon || {}));
      }
    } catch (err: any) {
      console.error("[MySql Sync Error] Failed to incremental save Site Personalization parameters:", err.message);
    }

    // G. Sync newly created Audit logs
    try {
      const lastDBSavedLog = await prisma.auditLog.findFirst({
        orderBy: { id: "desc" }
      });
      const lastId = lastDBSavedLog ? lastDBSavedLog.id : 0;
      const newLogs = db.logs.filter(l => l.id > lastId);
      if (newLogs.length > 0) {
        console.log(`[MySql Async Sync] Batch uploading ${newLogs.length} audit logs to MySQL`);
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
        
        const loggedIds = new Set((nextSyncedDbState.logs || []).map(l => l.id));
        newLogs.forEach(l => {
          if (!loggedIds.has(l.id)) {
            if (!nextSyncedDbState.logs) nextSyncedDbState.logs = [];
            nextSyncedDbState.logs.push(JSON.parse(JSON.stringify(l)));
          }
        });
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing audit logs:", err.message);
    }

    // H. Sync modified/created Admins parallelized
    try {
      if (adminsToSync.length > 0) {
        console.log(`[MySql Async Sync] Syncing ${adminsToSync.length} modified/new administrators to MySQL`);
        const filteredAdmins = adminsToSync.filter(a => a.email.toLowerCase() !== "suporte@unityautomacoes.com.br");
        if (filteredAdmins.length > 0) {
          await Promise.all(
            filteredAdmins.map(async (a) => {
              try {
                const passwordPlainText = a.senha || "200616";
                let hashVal = passwordPlainText;
                // Only hash if it is not already a bcrypt hash (starts with $2a$, $2b$ or $2y$ and is ~60 characters)
                const isAlreadyHash = passwordPlainText.startsWith("$2a$") || passwordPlainText.startsWith("$2b$") || passwordPlainText.startsWith("$2y$");
                if (!isAlreadyHash && passwordPlainText.length < 50) {
                  hashVal = await bcryptjs.hash(passwordPlainText, 10);
                } else if (isAlreadyHash) {
                  hashVal = passwordPlainText;
                } else {
                  hashVal = await bcryptjs.hash(passwordPlainText, 10);
                }

                await prisma!.admin.upsert({
                  where: { email: a.email.toLowerCase() },
                  update: {
                    nome: a.nome,
                    senha: passwordPlainText,
                    senha_hash: hashVal,
                    pode_excluir: a.podeExcluir !== false,
                    pode_editar: a.podeEditar !== false,
                    pode_ativar_campeonato: a.podeAtivarCampeonato !== false
                  },
                  create: {
                    id: a.id,
                    email: a.email.toLowerCase(),
                    nome: a.nome,
                    senha: passwordPlainText,
                    senha_hash: hashVal,
                    pode_excluir: a.podeExcluir !== false,
                    pode_editar: a.podeEditar !== false,
                    pode_ativar_campeonato: a.podeAtivarCampeonato !== false
                  }
                });

                const idx = (nextSyncedDbState.admins || []).findIndex(x => x.id === a.id);
                if (idx !== -1) {
                  nextSyncedDbState.admins![idx] = JSON.parse(JSON.stringify(a));
                } else {
                  if (!nextSyncedDbState.admins) nextSyncedDbState.admins = [];
                  nextSyncedDbState.admins.push(JSON.parse(JSON.stringify(a)));
                }
              } catch (errUps: any) {
                console.error(`[MySql Sync] Failed to upsert administrator sub-admin ID ${a.id} (${a.nome}):`, errUps.message);
              }
            })
          );
        }
      }
    } catch (err: any) {
      console.error("[MySql Sync] Error syncing administrators list:", err.message);
    }

    lastSyncedDbState = nextSyncedDbState;
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
        points_autor_gol: INITIAL_POINTS_CONFIG.pontos_acertar_autor_gol || 7,
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

  let dbPers = await prisma.personalizacao.findFirst();
  if (!dbPers) {
    dbPers = await prisma.personalizacao.create({
      data: {
        id: 1,
        background_image: "",
        ad_image: "",
        header_title_1: "CARTOLA ITL",
        header_title_2: "PROVEDOR ITLFIBRA",
        header_description: "Mostre suas habilidades de palpite, crave placares exatos das maiores seleções e dispute um ano de internet grátis, TVs, consoles de última geração e prêmios incríveis!",
        regras: JSON.stringify([
          { id: 1, titulo: "Participação Gratuita", texto: "Bolão exclusivo para clientes ativos do nosso provedor, sem custo adicional." },
          { id: 2, titulo: "Bloqueio Prévio", texto: "As apostas para cada partida serão encerradas exatamente 1 hora antes do início configurado pelo horário do servidor." },
          { id: 3, titulo: "Sistemática de Pontos", texto: "Acordo de vencedor: 4 pontos. Empate: 4 pontos. Placar Exato: +6 pontos bônus (totalizando 10 pontos)." },
          { id: 4, titulo: "Validação Mensal", texto: "Em caso de inadimplência no provedor, o acesso pode ser temporariamente suspenso até a regularização cadastral automática." }
        ]),
        premiacoes: JSON.stringify([
          { posicao: "1º Lugar Geral (Final da Copa)", premio: "1 Ano de Internet Grátis", detalhes: "Grande campeão do Bolão Geral ao final do torneio." },
          { posicao: "1º Lugar de Cada Rodada", premio: "1 Mês de Internet Grátis + Brinde Exclusivo", detalhes: "Para o maior pontuador individual de cada rodada da Copa." },
          { posicao: "2º Lugar de Cada Rodada", premio: "1 Mês de Internet Grátis", detalhes: "Para o segundo colocado de cada rodada individual." },
          { posicao: "3º Lugar de Cada Rodada", premio: "Um Brinde Exclusivo da ITLFIBRA", detalhes: "Para o terceiro colocado de cada rodada individual." }
        ]),
        recaptcha_active: true,
        recaptcha_site_key: "6Lf4qjAsAAAAAXVXGhzCDJpaV1VtWDZOdWl4jI",
        recaptcha_secret_key: "6Lf4qjAsAAAAAC3zwCjx0i7k_UNzaiPSUKw34AOy"
      }
    });
  }

  let customRules: any[] = [];
  try {
    customRules = dbPers.regras ? JSON.parse(dbPers.regras) : [];
  } catch (e) {}

  let customAwards: any[] = [];
  try {
    customAwards = dbPers.premiacoes ? JSON.parse(dbPers.premiacoes) : [];
  } catch (e) {}

  const dbLogs = await prisma.auditLog.findMany({
    orderBy: { data: "desc" },
    take: 400
  });

  let dbAdmins = await prisma.admin.findMany();
  if (dbAdmins.length === 0) {
    const hash = await bcryptjs.hash("200616", 10);
    const createdSuper = await prisma.admin.create({
      data: {
        email: "suporte@unityautomacoes.com.br",
        nome: "Suporte Unity",
        senha_hash: hash,
        senha: "200616"
      }
    });
    dbAdmins = [createdSuper];
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
    palpites: dbPalpites.map(p => {
      let parsedGols: any[] | undefined = undefined;
      if (p.gols_jogadores) {
        try {
          parsedGols = JSON.parse(p.gols_jogadores);
        } catch (err) {
          console.error(`Error parsing gols_jogadores for palpite ID ${p.id}:`, err);
        }
      }
      return {
        id: p.id,
        usuario_id: p.usuario_id,
        jogo_id: p.jogo_id,
        placar_casa: p.placar_casa,
        placar_fora: p.placar_fora,
        pontos: p.pontos,
        palpites_gols_jogadores: parsedGols,
        created_at: p.created_at.toISOString()
      };
    }),
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
      bonus_jogos_perfeitos: dbCfg.bonus_jogos_perfeitos,
      pontos_acertar_autor_gol: (dbCfg as any).points_autor_gol !== undefined ? (dbCfg as any).points_autor_gol : 7
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
    admins: dbAdmins.map(a => ({
      id: a.id,
      email: a.email,
      nome: a.nome,
      senha: (a as any).senha || "200616",
      podeExcluir: (a as any).pode_excluir !== false,
      podeEditar: (a as any).pode_editar !== false,
      podeAtivarCampeonato: (a as any).pode_ativar_campeonato !== false
    })),
    configs_libertadores: {
      ativo: isLibertadoresAtivo
    },
    configs_copa_mundo: {
      ativo: isCopaAtivo
    },
    configs_brasileirao: {
      ativo: isBrasileiraoAtivo
    },
    configs_custom: {
      background_image: dbPers.background_image || "",
      ad_image: dbPers.ad_image || "",
      header_title_1: dbPers.header_title_1 || "CARTOLA ITL",
      header_title_2: dbPers.header_title_2 || "PROVEDOR ITLFIBRA",
      header_description: dbPers.header_description || "",
      regras: customRules,
      premiacoes: customAwards,
      recaptcha_active: dbPers.recaptcha_active !== null ? Boolean(dbPers.recaptcha_active) : true,
      recaptcha_site_key: dbPers.recaptcha_site_key || "6Lf4qjAsAAAAAXVXGhzCDJpaV1VtWDZOdWl4jI",
      recaptcha_secret_key: dbPers.recaptcha_secret_key || "6Lf4qjAsAAAAAC3zwCjx0i7k_UNzaiPSUKw34AOy"
    },
    configs_logo: {
      has_custom_logo: dbPers.has_custom_logo || false,
      timestamp: dbPers.custom_logo_timestamp ? Number(dbPers.custom_logo_timestamp) : Date.now(),
      custom_logo_base64: dbPers.custom_logo_base64 || undefined
    },
    configs_favicon: {
      has_custom_favicon: dbPers.has_custom_favicon || false,
      timestamp: dbPers.custom_favicon_timestamp ? Number(dbPers.custom_favicon_timestamp) : Date.now(),
      extension: dbPers.custom_favicon_extension || "ico",
      custom_favicon_base64: dbPers.custom_favicon_base64 || undefined
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

      // For site personalization: check if table 'personalizacao' exists
      try {
        await prisma.$queryRaw`SELECT 1 FROM personalizacao LIMIT 1`;
        console.log("[MySql Sync] Table 'personalizacao' verified.");
      } catch (errPers: any) {
        console.log("[MySql Sync] Table 'personalizacao' doesn't exist. Forcing db push to synchronize customization schema: ", errPers.message);
        schemaIsPushed = false;
      }

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
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE palpites ADD COLUMN gols_jogadores TEXT DEFAULT NULL");
          console.log("[MySql Sync] Column 'gols_jogadores' added to 'palpites' successfully.");
        } catch (colErr: any) {
          // Will fail if column already exists, which is fine and expected
          console.log("[MySql Sync] Safe check for 'gols_jogadores' column in 'palpites' table ready: ", colErr.message);
        }

        // Add knockout columns to 'jogos'
        for (const col of ["placar_casa_prorrogacao", "placar_fora_prorrogacao", "placar_casa_penaltis", "placar_fora_penaltis"]) {
          try {
            await prisma.$executeRawUnsafe(`ALTER TABLE jogos ADD COLUMN ${col} INT DEFAULT NULL`);
            console.log(`[MySql Sync] Column '${col}' added to 'jogos' successfully.`);
          } catch (colErr: any) {
            console.log(`[MySql Sync] Safe check for '${col}' in 'jogos' ready:`, colErr.message);
          }
        }

        // Add knockout columns to 'palpites'
        for (const col of ["placar_casa_prorrogacao", "placar_fora_prorrogacao", "placar_casa_penaltis", "placar_fora_penaltis"]) {
          try {
            await prisma.$executeRawUnsafe(`ALTER TABLE palpites ADD COLUMN ${col} INT DEFAULT NULL`);
            console.log(`[MySql Sync] Column '${col}' added to 'palpites' successfully.`);
          } catch (colErr: any) {
            console.log(`[MySql Sync] Safe check for '${col}' in 'palpites' ready:`, colErr.message);
          }
        }

        try {
          await prisma.$executeRawUnsafe("ALTER TABLE admins ADD COLUMN senha VARCHAR(255) DEFAULT '200616'");
          console.log("[MySql Sync] Column 'senha' added to 'admins' successfully.");
        } catch (colErr: any) {
          console.log("[MySql Sync] Safe check for 'senha' column in 'admins' table ready: ", colErr.message);
        }
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE admins ADD COLUMN pode_excluir BOOLEAN DEFAULT TRUE");
          console.log("[MySql Sync] Column 'pode_excluir' added to 'admins' successfully.");
        } catch (colErr: any) {
          console.log("[MySql Sync] Safe check for 'pode_excluir' column in 'admins' table ready: ", colErr.message);
        }
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE admins ADD COLUMN pode_editar BOOLEAN DEFAULT TRUE");
          console.log("[MySql Sync] Column 'pode_editar' added to 'admins' successfully.");
        } catch (colErr: any) {
          console.log("[MySql Sync] Safe check for 'pode_editar' column in 'admins' table ready: ", colErr.message);
        }
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE admins ADD COLUMN pode_ativar_campeonato BOOLEAN DEFAULT TRUE");
          console.log("[MySql Sync] Column 'pode_ativar_campeonato' added to 'admins' successfully.");
        } catch (colErr: any) {
          console.log("[MySql Sync] Safe check for 'pode_ativar_campeonato' column in 'admins' table ready: ", colErr.message);
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
        
        let mergedScorerGuessesCount = 0;
        mysqlDb.palpites.forEach(mysqlBet => {
          if (!mysqlBet.palpites_gols_jogadores || mysqlBet.palpites_gols_jogadores.length === 0) {
            const localBet = fileDb.palpites.find(p => p.usuario_id === mysqlBet.usuario_id && p.jogo_id === mysqlBet.jogo_id);
            if (localBet && localBet.palpites_gols_jogadores && localBet.palpites_gols_jogadores.length > 0) {
              mysqlBet.palpites_gols_jogadores = localBet.palpites_gols_jogadores;
              mergedScorerGuessesCount++;
            }
          }
        });

        if (mergedScorerGuessesCount > 0) {
          console.log(`[MySql Sync] Restored and merged ${mergedScorerGuessesCount} scorer guess predictions from local backup to prevent data loss.`);
        }

        cachedDb = mysqlDb;
        // Keep the local file synchronized
        saveDatabaseToFile(cachedDb);

        // Async write the merged local backup scorer guesses back to MySQL now that Prisma model supports it
        if (mergedScorerGuessesCount > 0) {
          triggerMySqlSync();
        }
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
    ensureCustomLogoAndFaviconStatus(cachedDb);

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
    
    // Auto-populate custom manual groups schedule if missing from synced MySQL database
    loadDatabase();

    // Ensure accurate Oitavas de Final matches for Cruzeiro vs Flamengo are present
    const idIda = "libertadores_manual_cru_fla_ida";
    const idVolta = "libertadores_manual_cru_fla_volta";
    let hasModifiedDb = false;

    if (!cachedDb.jogos.some(j => j.api_id === idIda)) {
      console.log(`[Startup Seeder] Seeding Oitavas de Final - Ida: Cruzeiro x Flamengo`);
      const newId = cachedDb.jogos.length > 0 ? Math.max(...cachedDb.jogos.map(j => j.id)) + 1 : 1;
      cachedDb.jogos.push({
        id: newId,
        api_id: idIda,
        time_casa: "Cruzeiro",
        time_fora: "Flamengo",
        time_casa_bandeira: "https://media.api-sports.io/football/teams/122.png",
        time_fora_bandeira: "https://media.api-sports.io/football/teams/127.png",
        data_jogo: "2026-08-11T21:30:00Z",
        placar_casa: null,
        placar_fora: null,
        status: "PENDENTE",
        rodada: 7
      });
      hasModifiedDb = true;
    }

    if (!cachedDb.jogos.some(j => j.api_id === idVolta)) {
      console.log(`[Startup Seeder] Seeding Oitavas de Final - Volta: Flamengo x Cruzeiro`);
      const newId = cachedDb.jogos.length > 0 ? Math.max(...cachedDb.jogos.map(j => j.id)) + 1 : 1;
      cachedDb.jogos.push({
        id: newId,
        api_id: idVolta,
        time_casa: "Flamengo",
        time_fora: "Cruzeiro",
        time_casa_bandeira: "https://media.api-sports.io/football/teams/127.png",
        time_fora_bandeira: "https://media.api-sports.io/football/teams/122.png",
        data_jogo: "2026-08-18T21:30:00Z",
        placar_casa: null,
        placar_fora: null,
        status: "PENDENTE",
        rodada: 7
      });
      hasModifiedDb = true;
    }

    if (hasModifiedDb) {
      saveDatabase(cachedDb);
    }

    // Clean up fallback matches on startup if real API games are already synced/imported
    migrateGuessesAndPurgeFallbackLibertadores(cachedDb);

    // Recalculate leaderboard / rankings scores for all users and games on startup
    // to correct any legacy scoring defects instantly!
    console.log("[Setup Startup Reset] Restoring and recalculating clean, precise player goals leaderboard points...");
    try {
      refreshLeaderboard();
    } catch (err: any) {
      console.error("[Setup Startup Reset] Leaderboard auto-refresh failed:", err.message);
    }
  }
  // Initialize our change detection state cache
  lastSyncedDbState = JSON.parse(JSON.stringify(cachedDb));
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

function normalizePlayerName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
  n = n.replace(/\(\s*\d+\s*\)/g, ""); // strip parentheses and number (e.g. " (1)")
  n = n.replace(/\b[0-9]+\b/g, ""); // remove loose numbers
  n = n.replace(/\s+/g, " "); // collapse spaces
  return n.trim();
}

function getGoalsFromGameEvents(jogo: Jogo): { [playerName: string]: number } {
  let rawEvents: any[] = [];
  if (jogo.real_events && Array.isArray(jogo.real_events)) {
    rawEvents = jogo.real_events;
  } else {
    rawEvents = generateDeterministicEvents(jogo, Date.now());
  }

  const goalsMap: { [playerName: string]: number } = {};
  rawEvents.forEach(evt => {
    if (evt.type === "Goal" && evt.player && evt.player.name) {
      const pName = normalizePlayerName(evt.player.name);
      
      let side: "casa" | "fora" = "casa";
      if (evt.team && evt.team.name) {
        const teamEventName = normalizePlayerName(evt.team.name);
        const teamFora = normalizePlayerName(jogo.time_fora);
        if (teamEventName === teamFora || teamFora.includes(teamEventName) || teamEventName.includes(teamFora)) {
          side = "fora";
        }
      }
      
      const key = `${pName}_${side}`;
      goalsMap[key] = (goalsMap[key] || 0) + 1;
    }
  });
  return goalsMap;
}

function calculateArtilheiroHitsForBet(palpite: Palpite, jogo: Jogo): number {
  let acertosArtilheiro = 0;
  if (palpite.palpites_gols_jogadores && Array.isArray(palpite.palpites_gols_jogadores)) {
    const actualGoals = getGoalsFromGameEvents(jogo);
    palpite.palpites_gols_jogadores.forEach(p_guess => {
      const gNameNormal = normalizePlayerName(p_guess.jogador);
      const guessedGoals = Number(p_guess.gols) || 0;
      if (guessedGoals <= 0 || !gNameNormal) return;

      let matchedActualGoals = 0;
      let highestScore = 0;

      for (const [evtNameWithSide, goalsScored] of Object.entries(actualGoals)) {
        const parts = evtNameWithSide.split("_");
        const evtName = parts[0];

        if (evtName && gNameNormal) {
          let score = 0;
          if (evtName === gNameNormal) {
            score = 100;
          } else {
            const cleanWord = (w: string) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();
            const prepositions = ["de", "da", "do", "la", "el", "di", "del", "du", "van", "von", "y", "dos", "das", "der"];

            const evtWords = evtName.split(/\s+/).filter(Boolean);
            const guessWords = gNameNormal.split(/\s+/).filter(Boolean);

            const evtCleaned = evtWords.map(cleanWord).filter(Boolean);
            const guessCleaned = guessWords.map(cleanWord).filter(Boolean);

            const evtSig = evtCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));
            const guessSig = guessCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));

            // Check for exact match first of cleaned words
            const evtCleanStr = evtCleaned.join("");
            const guessCleanStr = guessCleaned.join("");
            if (evtCleanStr && guessCleanStr && evtCleanStr === guessCleanStr) {
              score = 100;
            } else if (evtSig.length > 0 && guessSig.length > 0) {
              const commonSig = evtSig.filter(w => guessSig.includes(w));
              if (commonSig.length > 0) {
                const overlap = commonSig.length / Math.max(evtSig.length, guessSig.length);
                score = overlap * 80;
              }
            } else {
              const commonAll = evtCleaned.filter(w => guessCleaned.includes(w));
              if (commonAll.length > 0) {
                const overlap = commonAll.length / Math.max(evtCleaned.length, guessCleaned.length);
                score = overlap * 80;
              }
            }
          }

          if (score > highestScore && score >= 20) {
            highestScore = score;
            matchedActualGoals = goalsScored;
          }
        }
      }

      const creditGoals = Math.min(matchedActualGoals, guessedGoals);
      if (creditGoals > 0) {
        acertosArtilheiro += creditGoals;
      }
    });
  }
  return acertosArtilheiro;
}

// Score Calculator Engine
function isKnockoutMatch(jogo: Jogo): boolean {
  const campeonato = getGameCampeonato(jogo);
  if (campeonato === 'BRASILEIRAO') return false;
  if (campeonato === 'LIBERTADORES') return jogo.rodada >= 7;
  return jogo.rodada >= 4;
}

interface DetailedBetStats {
  pontos: number;
  acertos_exato: number;
  acertos_vencedor: number;
  erros: number;
}

function calculateDetailedStatsForBet(palpite: Palpite, jogo: Jogo, points_cfg: ConfigPoints): DetailedBetStats {
  const stats = { pontos: 0, acertos_exato: 0, acertos_vencedor: 0, erros: 0 };
  if (jogo.placar_casa === null || jogo.placar_fora === null) return stats;

  const isKnockout = isKnockoutMatch(jogo);

  // 1. Regular Time (Jogo Normal)
  const palpiteCasa = palpite.placar_casa;
  const palpiteFora = palpite.placar_fora;
  const realCasa = jogo.placar_casa;
  const realFora = jogo.placar_fora;

  const isExactReg = palpiteCasa === realCasa && palpiteFora === realFora;
  const palpiteEmpateReg = palpiteCasa === palpiteFora;
  const realEmpateReg = realCasa === realFora;

  let isOutcomeReg = false;
  if (realEmpateReg && palpiteEmpateReg) {
    isOutcomeReg = true;
  } else if (!realEmpateReg && !palpiteEmpateReg) {
    const palpiteWinnerReg = palpiteCasa > palpiteFora;
    const realWinnerReg = realCasa > realFora;
    if (palpiteWinnerReg === realWinnerReg) {
      isOutcomeReg = true;
    }
  }

  // scoring regular time
  if (isExactReg) {
    stats.pontos += points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
    stats.acertos_exato += 1;
  } else if (isOutcomeReg) {
    stats.pontos += palpiteEmpateReg ? points_cfg.pontos_acertar_empate : points_cfg.pontos_acertar_vencedor;
    stats.acertos_vencedor += 1;
  } else {
    stats.erros += 1;
  }

  if (isKnockout) {
    // 2. Extra Time (Prorrogação)
    // Only played and predicted if regular time finished as a draw and predicted as a draw
    const extraTimeApplicable = palpiteEmpateReg && realEmpateReg;
    if (extraTimeApplicable) {
      const pC_extra = palpite.placar_casa_prorrogacao;
      const pF_extra = palpite.placar_fora_prorrogacao;
      const rC_extra = jogo.placar_casa_prorrogacao;
      const rF_extra = jogo.placar_fora_prorrogacao;

      // Ensure both predictions and real scores exist before scoring extra time
      if (pC_extra !== undefined && pC_extra !== null && pF_extra !== undefined && pF_extra !== null &&
          rC_extra !== undefined && rC_extra !== null && rF_extra !== undefined && rF_extra !== null) {
        const isExactExtra = pC_extra === rC_extra && pF_extra === rF_extra;
        const pEmpateExtra = pC_extra === pF_extra;
        const rEmpateExtra = rC_extra === rF_extra;

        let isOutcomeExtra = false;
        if (rEmpateExtra && pEmpateExtra) {
          isOutcomeExtra = true;
        } else if (!rEmpateExtra && !pEmpateExtra) {
          const pWinnerExtra = pC_extra > pF_extra;
          const rWinnerExtra = rC_extra > rF_extra;
          if (pWinnerExtra === rWinnerExtra) {
            isOutcomeExtra = true;
          }
        }

        if (isExactExtra) {
          stats.pontos += 4; // 4 points for exact score of extra time
          stats.acertos_exato += 1;
        } else if (isOutcomeExtra) {
          stats.pontos += 2; // 2 points for winner/draw of extra time
          stats.acertos_vencedor += 1;
        } else {
          stats.erros += 1;
        }

        // 3. Penalty Shootout (Pênaltis)
        // Only played and predicted if extra time ended in a draw too!
        const penaltyApplicable = pEmpateExtra && rEmpateExtra;
        if (penaltyApplicable) {
          const pC_pen = palpite.placar_casa_penaltis;
          const pF_pen = palpite.placar_fora_penaltis;
          const rC_pen = jogo.placar_casa_penaltis;
          const rF_pen = jogo.placar_fora_penaltis;

          if (pC_pen !== undefined && pC_pen !== null && pF_pen !== undefined && pF_pen !== null &&
              rC_pen !== undefined && rC_pen !== null && rF_pen !== undefined && rF_pen !== null) {
            const isExactPen = pC_pen === rC_pen && pF_pen === rF_pen;
            // penalty shootout must have a winner (cannot draw in shootout)
            const pWinnerPen = pC_pen > pF_pen;
            const rWinnerPen = rC_pen > rF_pen;
            const isOutcomePen = pWinnerPen === rWinnerPen;

            if (isExactPen) {
              stats.pontos += 10; // 10 points for exact penalties score
              stats.acertos_exato += 1;
            } else if (isOutcomePen) {
              stats.pontos += 4; // 4 points for correct outcome/winner of penalties
              stats.acertos_vencedor += 1;
            } else {
              stats.erros += 1;
            }
          }
        }
      }
    }
  }

  // 4. Scorer predictions points (Artilheiro, only regular + extra time, NOT penalties!)
  let scorerPoints = 0;
  const pointsPerGoal = points_cfg.pontos_acertar_autor_gol !== undefined ? points_cfg.pontos_acertar_autor_gol : 7;

  if (palpite.palpites_gols_jogadores && Array.isArray(palpite.palpites_gols_jogadores)) {
    const actualGoals = getGoalsFromGameEvents(jogo);
    palpite.palpites_gols_jogadores.forEach(p_guess => {
      const gNameNormal = normalizePlayerName(p_guess.jogador);
      const guessedGoals = Number(p_guess.gols) || 0;
      if (guessedGoals <= 0 || !gNameNormal) return;

      let matchedActualGoals = 0;
      let highestScore = 0;

      for (const [evtNameWithSide, goalsScored] of Object.entries(actualGoals)) {
        const parts = evtNameWithSide.split("_");
        const evtName = parts[0];

        if (evtName && gNameNormal) {
          let score = 0;
          if (evtName === gNameNormal) {
            score = 100;
          } else {
            const cleanWord = (w: string) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();
            const prepositions = ["de", "da", "do", "la", "el", "di", "del", "du", "van", "von", "y", "dos", "das", "der"];

            const evtWords = evtName.split(/\s+/).filter(Boolean);
            const guessWords = gNameNormal.split(/\s+/).filter(Boolean);

            const evtCleaned = evtWords.map(cleanWord).filter(Boolean);
            const guessCleaned = guessWords.map(cleanWord).filter(Boolean);

            const evtSig = evtCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));
            const guessSig = guessCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));

            // Check for exact match first of cleaned words
            const evtCleanStr = evtCleaned.join("");
            const guessCleanStr = guessCleaned.join("");
            if (evtCleanStr && guessCleanStr && evtCleanStr === guessCleanStr) {
              score = 100;
            } else if (evtSig.length > 0 && guessSig.length > 0) {
              const commonSig = evtSig.filter(w => guessSig.includes(w));
              if (commonSig.length > 0) {
                const overlap = commonSig.length / Math.max(evtSig.length, guessSig.length);
                score = overlap * 80;
              }
            } else {
              const commonAll = evtCleaned.filter(w => guessCleaned.includes(w));
              if (commonAll.length > 0) {
                const overlap = commonAll.length / Math.max(evtCleaned.length, guessCleaned.length);
                score = overlap * 80;
              }
            }
          }

          if (score > highestScore && score >= 20) {
            highestScore = score;
            matchedActualGoals = goalsScored;
          }
        }
      }

      const creditGoals = Math.min(matchedActualGoals, guessedGoals);
      if (creditGoals > 0) {
        scorerPoints += creditGoals * pointsPerGoal;
      }
    });
  }

  stats.pontos += scorerPoints;
  return stats;
}

function calculatePointsForBet(palpite: Palpite, jogo: Jogo, points_cfg: ConfigPoints): number {
  return calculateDetailedStatsForBet(palpite, jogo, points_cfg).pontos;
}

// Background helper to fetch and synchronize real goals/cards events from Football API-Sports for live and recently-finished matches
async function syncLiveMatchEvents(db: LocalDatabase) {
  const apiKey = db.configs_football?.key;
  const apiUrl = db.configs_football?.url || "https://v3.football.api-sports.io";
  const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

  if (!isRealApi) return;

  const nowMs = Date.now();
  const activeGames = db.jogos.filter(jogo => {
    const isLive = jogo.status === 'AO_VIVO';
    const isConcluded = jogo.status === 'ENCERRADO';
    const gameMs = new Date(jogo.data_jogo).getTime();
    const isRecent = (nowMs - gameMs) < 24 * 60 * 60 * 1000; // last 24 hours
    return (isLive || (isConcluded && isRecent)) && jogo.api_id;
  });

  if (activeGames.length === 0) return;

  console.log(`[PWA Event Sync] Scanning real-time events for ${activeGames.length} active/recent games...`);
  let dbUpdated = false;

  for (const jogo of activeGames) {
    let fixtureId: number | null = null;
    const match = jogo.api_id!.match(/^(?:football_api_|libertadores_soccer_|brasileirao_soccer_|soccer_)?(\d+)$/);
    if (match) fixtureId = parseInt(match[1]);

    if (fixtureId) {
      try {
        console.log(`[PWA Event Sync] Fetching events for game ${jogo.time_casa} x ${jogo.time_fora} (Fixture: ${fixtureId})...`);
        const response = await axios.get(`${apiUrl}/fixtures/events`, {
          params: { fixture: fixtureId },
          headers: { "x-apisports-key": apiKey },
          timeout: 5000
        });

        if (response.data && response.data.response && Array.isArray(response.data.response)) {
          jogo.real_events = response.data.response;
          dbUpdated = true;
          console.log(`[PWA Event Sync] Successfully updated events for ${jogo.time_casa} x ${jogo.time_fora}. Found ${response.data.response.length} events.`);
        }
        // sleep 500ms to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        console.error(`[PWA Event Sync Error] Failed to sync events for fixture ${fixtureId}:`, err.message);
      }
    }
  }

  if (dbUpdated) {
    saveDatabase(db);
    refreshLeaderboard();
  }
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
    u.acertos_artilheiro = 0;
    u.erros = 0;
  });

  // Calculate scores per bet
  db.palpites.forEach(p => {
    const jogo = db.jogos.find(j => j.id === p.jogo_id);
    if (jogo && (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO')) {
       const stats = calculateDetailedStatsForBet(p, jogo, points_cfg);
       p.pontos = stats.pontos;

       const usuario = db.usuarios.find(u => u.id === p.usuario_id);
       if (usuario && jogo.placar_casa !== null && jogo.placar_fora !== null) {
         usuario.pontos_total += stats.pontos;
         usuario.acertos_exato += stats.acertos_exato;
         usuario.acertos_vencedor += stats.acertos_vencedor;
         usuario.erros += stats.erros;
         usuario.acertos_artilheiro = (usuario.acertos_artilheiro || 0) + calculateArtilheiroHitsForBet(p, jogo);
       }
    }
  });

  // Apply corrections to user tallies
  if (db.correcoes && Array.isArray(db.correcoes)) {
    db.correcoes.forEach(c => {
      const usuario = db.usuarios.find(u => u.id === c.usuario_id);
      if (usuario) {
        usuario.pontos_total += c.pontos;
        if (c.tipo === 'PLACAR_EXATO') {
          usuario.acertos_exato += c.quantidade;
        } else if (c.tipo === 'VENCEDOR') {
          usuario.acertos_vencedor += c.quantidade;
        }
      }
    });
  }

  saveDatabase(db);
}

let lastGlobalSyncTime = 0;

// Express app initialization
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware setups
  app.use(express.json({ limit: "20mb" }));
  
  // Custom simple Helmet header layer for compliance and anti-caching for iOS/Safari
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer");
    
    // Prevent aggressive caching on iOS Safari
    if (req.url && (req.url.startsWith("/api/") || req.url.includes("/api"))) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
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

          // 4. Sync live/concluded match events to update scorer predictions with actual goals
          try {
            await syncLiveMatchEvents(db);
          } catch (apiErr: any) {
            console.error(`[Auto-Sync Cron Exception] Live match events sync failed:`, apiErr.message);
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
    const { cpf_cnpj, nome_complementar, telefone, email, cidade, recaptchaToken } = req.body;
    
    if (!cpf_cnpj) {
      return res.status(400).json({ error: "Informe o CPF ou CNPJ cadastrado no provedor." });
    }

    const db = loadDatabase();

    // Verify reCAPTCHA if enabled
    const configCustom = db.configs_custom || {};
    if (configCustom.recaptcha_active && configCustom.recaptcha_secret_key) {
      if (!recaptchaToken) {
        return res.status(400).json({ error: "Verificação reCAPTCHA obrigatória não fornecida." });
      }

      try {
        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const params = new URLSearchParams();
        params.append("secret", configCustom.recaptcha_secret_key);
        params.append("response", recaptchaToken);

        const recaptchaRes = await axios.post(verifyUrl, params, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });

        if (!recaptchaRes.data || !recaptchaRes.data.success) {
          console.error("reCAPTCHA validation failed:", recaptchaRes.data);
          const errorCodes = recaptchaRes.data && recaptchaRes.data["error-codes"] ? recaptchaRes.data["error-codes"].join(", ") : "sem código de erro";
          let friendlyExplanation = "Validação do reCAPTCHA do Google falhou.";
          if (errorCodes.includes("invalid-input-response") || errorCodes.includes("timeout-or-duplicate") || errorCodes.includes("bad-request")) {
            friendlyExplanation += " O token é inválido, expirou ou o domínio atual (" + (req.headers.host || "desconhecido") + ") não está registrado nas configurações da sua chave do Google reCAPTCHA. (Dica importante: Para testar livremente neste link temporário de visualização, você pode desmarcar a opção 'Verificar a origem das soluções do reCAPTCHA' nas configurações da chave no Google Admin Console ou adicionar o domínio atual). Erro: [" + errorCodes + "]";
          } else {
            friendlyExplanation += " Detalhes do erro: [" + errorCodes + "]";
          }
          return res.status(400).json({ error: friendlyExplanation });
        }
      } catch (err: any) {
        console.error("Erro ao validar reCAPTCHA:", err.message);
        return res.status(500).json({ error: "Erro interno ao validar verificação de segurança reCAPTCHA: " + err.message });
      }
    }

    // Clean formatting characters to ensure uniformity
    const cleanedCpfCnpj = cpf_cnpj.replace(/\D/g, "");
    if (cleanedCpfCnpj.length < 11) {
      return res.status(400).json({ error: "O documento deve conter no mínimo 11 dígitos numéricos." });
    }

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

  // Diagnostic route to check DB connection
  app.get("/api/diagnose-db", async (req, res) => {
    const report: any = {
      timestamp: new Date().toISOString(),
      prisma_initialized: !!prisma,
      DATABASE_URL_present: !!process.env.DATABASE_URL,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_HOST: process.env.DB_HOST,
      cachedDb_stats: null,
      error: null
    };

    if (cachedDb) {
      report.cachedDb_stats = {
        usuarios_count: cachedDb.usuarios?.length || 0,
        palpites_count: cachedDb.palpites?.length || 0,
        jogos_count: cachedDb.jogos?.length || 0,
        admins_count: cachedDb.admins?.length || 0
      };
    }

    try {
      if (prisma) {
        report.mysql_counts = {
          usuarios: await prisma.usuario.count(),
          jogos: await prisma.jogo.count(),
          palpites: await prisma.palpite.count(),
          admins: await prisma.admin.count()
        };
      } else {
        report.mysql_status = "No prisma client initialized";
      }
    } catch (err: any) {
      report.error = {
        message: err.message,
        stack: err.stack,
        code: err.code
      };
    }

    res.json(report);
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
        if (token && token !== "null" && token !== "undefined") {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded) {
            if (decoded.role === "ADMIN") {
              isAdmin = true;
              userId = 999999;
            } else {
              userId = decoded.id;
            }
          }
        }
      } catch (err) {
        return res.status(401).json({ error: "Sessão expirada. Por favor, faça login novamente." });
      }
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
    let matchedUser: any = null;

    if (userId) {
      rawUserGuesses = db.palpites.filter(p => p.usuario_id === userId);
      // Recalculate on-the-fly to ensure the client gets accurate temporary marks instantly
      const points_cfg = db.configs_points;
      rawUserGuesses.forEach(p => {
        const gameObj = db.jogos.find(jg => jg.id === p.jogo_id);
        if (gameObj && (gameObj.status === 'AO_VIVO' || gameObj.status === 'ENCERRADO')) {
          p.pontos = calculatePointsForBet(p, gameObj, points_cfg);
        }
      });
      if (!isAdmin) {
        const u = db.usuarios.find(user => user.id === userId);
        if (u) {
          let finalTotalPontos = 0;
          let finalExatos = 0;
          let finalVencedores = 0;
          let finalArtilheiro = 0;
          let finalErros = 0;

          const points_cfg = db.configs_points;
          const userBets = db.palpites.filter(pb => pb.usuario_id === u.id);
          userBets.forEach(pb => {
            const jg = db.jogos.find(g => g.id === pb.jogo_id);
            if (jg && (jg.status === 'AO_VIVO' || jg.status === 'ENCERRADO')) {
              const stats = calculateDetailedStatsForBet(pb, jg, points_cfg);
              finalTotalPontos += stats.pontos;

              if (jg.placar_casa !== null && jg.placar_fora !== null) {
                finalExatos += stats.acertos_exato;
                finalVencedores += stats.acertos_vencedor;
                finalErros += stats.erros;
                finalArtilheiro += calculateArtilheiroHitsForBet(pb, jg);
              }
            }
          });

          // Add corrections:
          const userCorrections = (db.correcoes || []).filter(c => c.usuario_id === u.id);
          userCorrections.forEach(c => {
            finalTotalPontos += c.pontos;
            if (c.tipo === 'PLACAR_EXATO') finalExatos += c.quantidade;
            if (c.tipo === 'VENCEDOR') finalVencedores += c.quantidade;
            if (c.tipo === 'GOL') finalArtilheiro += c.quantidade;
          });

          matchedUser = {
            id: u.id,
            ixc_id: u.ixc_id,
            nome: u.nome,
            cpf_cnpj: u.cpf_cnpj,
            telefone: u.telefone,
            email: u.email,
            cidade: u.cidade,
            avatar: u.avatar || "⚽",
            pontos_total: finalTotalPontos,
            acertos_exato: finalExatos,
            acertos_vencedor: finalVencedores,
            acertos_artilheiro: finalArtilheiro,
            erros: finalErros,
            bloqueado: u.bloqueado,
            created_at: u.created_at
          };
        }
      }
    }

    const enriched = filteredGames.map(g => enrichGameDetails(g));

    res.json({
      jogos: enriched,
      palpites: rawUserGuesses,
      usuario: matchedUser,
      correcoes: userId ? (db.correcoes || []).filter(c => c.usuario_id === userId) : [],
      configs_points: db.configs_points,
      configs_custom: db.configs_custom,
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

    const { 
      jogo_id, 
      placar_casa, 
      placar_fora, 
      palpites_gols_jogadores,
      placar_casa_prorrogacao,
      placar_fora_prorrogacao,
      placar_casa_penaltis,
      placar_fora_penaltis 
    } = req.body;

    if (jogo_id === undefined || placar_casa === undefined || placar_fora === undefined) {
      return res.status(400).json({ error: "Dados incompletos para envio do palpite." });
    }

    const numPlacarCasa = parseInt(placar_casa, 10);
    const numPlacarFora = parseInt(placar_fora, 10);

    if (isNaN(numPlacarCasa) || isNaN(numPlacarFora) || numPlacarCasa < 0 || numPlacarFora < 0) {
      return res.status(400).json({ error: "Os placares informados devem ser números positivos." });
    }

    const parseOptionalScore = (val: any) => {
      if (val === undefined || val === null || val === "") return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    const numCasaProrrogacao = parseOptionalScore(placar_casa_prorrogacao);
    const numForaProrrogacao = parseOptionalScore(placar_fora_prorrogacao);
    const numCasaPenaltis = parseOptionalScore(placar_casa_penaltis);
    const numForaPenaltis = parseOptionalScore(placar_fora_penaltis);

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
      existingBet.placar_casa_prorrogacao = numCasaProrrogacao;
      existingBet.placar_fora_prorrogacao = numForaProrrogacao;
      existingBet.placar_casa_penaltis = numCasaPenaltis;
      existingBet.placar_fora_penaltis = numForaPenaltis;
      existingBet.palpites_gols_jogadores = Array.isArray(palpites_gols_jogadores) ? palpites_gols_jogadores : undefined;
      existingBet.created_at = new Date().toISOString();
    } else {
      const newBId = db.palpites.length > 0 ? Math.max(...db.palpites.map(p => p.id)) + 1 : 1;
      existingBet = {
        id: newBId,
        usuario_id: userId,
        jogo_id: Number(jogo_id),
        placar_casa: numPlacarCasa,
        placar_fora: numPlacarFora,
        placar_casa_prorrogacao: numCasaProrrogacao,
        placar_fora_prorrogacao: numForaProrrogacao,
        placar_casa_penaltis: numCasaPenaltis,
        placar_fora_penaltis: numForaPenaltis,
        pontos: null,
        palpites_gols_jogadores: Array.isArray(palpites_gols_jogadores) ? palpites_gols_jogadores : undefined,
        created_at: new Date().toISOString()
      };
      db.palpites.push(existingBet);
    }

    saveDatabase(db);
    addLog(userName, "PARTICIPACAO_PALPITE", `Registrou palpite: ${jogo.time_casa} ${numPlacarCasa} x ${numPlacarFora} ${jogo.time_fora}`, req);

    res.json({ success: true, palpite: existingBet });
  });

  const getTeamIdFromLogo = (logoUrl: string | null | undefined): number | null => {
    if (!logoUrl) return null;
    const match = logoUrl.match(/\/teams\/(\d+)\.png/) || logoUrl.match(/\/teams\/(\d+)/) || logoUrl.match(/teams_logo\/(\d+)/) || logoUrl.match(/\/(\d+)\.png/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Fetch both team rosters/players catalog for the scorer card widget dropdown list selections
  app.get("/api/jogos/:id/jogadores", async (req, res) => {
    try {
      const db = loadDatabase();
      const jogoId = parseInt(req.params.id, 10);
      const jogo = db.jogos.find(j => j.id === jogoId);
      if (!jogo) {
        return res.status(404).json({ error: "Partida não encontrada." });
      }

      if (!(db as any).squads_cache) {
        (db as any).squads_cache = {};
      }

      const apiKey = db.configs_football.key;
      const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
      const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

      const homeId = getTeamIdFromLogo(jogo.time_casa_bandeira);
      const awayId = getTeamIdFromLogo(jogo.time_fora_bandeira);

      let jogCasa: string[] = [];
      let jogFora: string[] = [];

      // HELPER FETCH SQUAD WITH CACHE & ROSTER FALLBACKS
      const fetchSquad = async (teamId: number, teamName: string, fallbackKey: number): Promise<string[]> => {
        if ((db as any).squads_cache[teamId]) {
          return (db as any).squads_cache[teamId];
        }

        if (isRealApi) {
          try {
            console.log(`[API Football Squad Fetch] Sincronizando elenco atualizado para o clube ID: ${teamId} (${teamName})...`);
            const response = await axios.get(`${apiUrl}/players/squads`, {
              params: { team: String(teamId) },
              headers: { "x-apisports-key": apiKey },
              timeout: 6000
            });
            const playersList = response?.data?.response?.[0]?.players || [];
            if (playersList.length > 0) {
              const names = playersList.map((p: any) => p.name).filter(Boolean);
              (db as any).squads_cache[teamId] = names;
              saveDatabase(db);
              return names;
            }
          } catch (e: any) {
            console.error(`[API Football Squad Fetch] Erro ao sincronizar elenco via API do ${teamName}:`, e.message);
          }
        }

        // Return fallback
        let roster = lookupRoster(teamName, fallbackKey);
        if (!roster) {
          roster = generateGenericRoster(teamName, fallbackKey);
        }
        const stripNumbers = (p: string) => p.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
        return [
          ...(roster.starter || []).map(stripNumbers),
          ...(roster.subs || []).map(stripNumbers)
        ];
      };

      if (homeId) {
        jogCasa = await fetchSquad(homeId, jogo.time_casa, jogo.id * 2);
      } else {
        let rosterHome = lookupRoster(jogo.time_casa, jogo.id * 2);
        if (!rosterHome) {
          rosterHome = generateGenericRoster(jogo.time_casa, jogo.id * 2);
        }
        const stripNumbers = (p: string) => p.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
        jogCasa = [
          ...(rosterHome.starter || []).map(stripNumbers),
          ...(rosterHome.subs || []).map(stripNumbers)
        ];
      }

      if (awayId) {
        jogFora = await fetchSquad(awayId, jogo.time_fora, jogo.id * 3);
      } else {
        let rosterAway = lookupRoster(jogo.time_fora, jogo.id * 3);
        if (!rosterAway) {
          rosterAway = generateGenericRoster(jogo.time_fora, jogo.id * 3);
        }
        const stripNumbers = (p: string) => p.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
        jogFora = [
          ...(rosterAway.starter || []).map(stripNumbers),
          ...(rosterAway.subs || []).map(stripNumbers)
        ];
      }

      return res.json({
        time_casa: jogo.time_casa,
        time_fora: jogo.time_fora,
        jogadores_casa: Array.from(new Set(jogCasa)),
        jogadores_fora: Array.from(new Set(jogFora))
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
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
            jogo.real_events = response.data.response;
            saveDatabase(db);
            refreshLeaderboard();
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
              const stats = calculateDetailedStatsForBet(bet, jogo, points_cfg);
              roundPoints += stats.pontos;

              if (jogo.placar_casa !== null && jogo.placar_fora !== null) {
                roundExacts += stats.acertos_exato;
                roundErrors += stats.erros;
              }
            }
          });

          // Apply manual corrections for this specific round or fallback to round 1 if unmapped
          if (db.correcoes && Array.isArray(db.correcoes)) {
            db.correcoes.forEach(c => {
              if (c.usuario_id === u.id) {
                let belongsToRound = false;
                if (c.rodada !== undefined && c.rodada !== null) {
                  belongsToRound = Number(c.rodada) === rodadaNum;
                } else if (c.descricao) {
                  const descLower = c.descricao.toLowerCase();
                  const m = descLower.match(/rodada\s*(\d+)/i);
                  if (m) {
                    belongsToRound = Number(m[1]) === rodadaNum;
                  } else {
                    belongsToRound = rodadaNum === 1;
                  }
                } else {
                  belongsToRound = rodadaNum === 1;
                }

                if (belongsToRound) {
                  roundPoints += c.pontos;
                  if (c.tipo === 'PLACAR_EXATO') {
                    roundExacts += c.quantidade;
                  }
                }
              }
            });
          }

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
          const hasCorrectionInRound = (db.correcoes || []).some(c => {
            if (c.usuario_id === u.id) {
              if (c.rodada !== undefined && c.rodada !== null) {
                return Number(c.rodada) === rodadaNum;
              } else if (c.descricao) {
                const descLower = c.descricao.toLowerCase();
                const m = descLower.match(/rodada\s*(\d+)/i);
                if (m) return Number(m[1]) === rodadaNum;
              }
              return rodadaNum === 1;
            }
            return false;
          });
          return userBetsInRound || hasCorrectionInRound;
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

    const { campeonato, rodada } = req.query;

    const useCamp = campeonato && campeonato !== "all" && campeonato !== "GERAL" && campeonato !== "TODOS";
    const useRodada = rodada && rodada !== "all" && rodada !== "TODAS" && rodada !== "TODOS";

    // Filter games
    let filteredGames = db.jogos;
    if (useCamp) {
      filteredGames = filteredGames.filter(j => getGameCampeonato(j) === campeonato);
    }
    if (useRodada) {
      filteredGames = filteredGames.filter(j => j.rodada === Number(rodada));
    }

    const filteredGameIds = new Set(filteredGames.map(g => g.id));
    const points_cfg = db.configs_points;

    // Sort customers descending points, then by success tags, then name
    const leaderData = db.usuarios
      .filter(u => !u.bloqueado && u.id !== 999999)
      .map(u => {
        let pontos = 0;
        let acertos_exato = 0;
        let acertos_vencedor = 0;
        let erros = 0;
        let acertos_artilheiro = 0;

        // Find all bids for this user
        const userBets = db.palpites.filter(p => p.usuario_id === u.id);
        
        userBets.forEach(p => {
          if (!filteredGameIds.has(p.jogo_id)) return;
          const jogo = filteredGames.find(g => g.id === p.jogo_id);
          if (jogo && (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO')) {
            const stats = calculateDetailedStatsForBet(p, jogo, points_cfg);
            pontos += stats.pontos;

            if (jogo.placar_casa !== null && jogo.placar_fora !== null) {
              acertos_exato += stats.acertos_exato;
              acertos_vencedor += stats.acertos_vencedor;
              erros += stats.erros;
              acertos_artilheiro += calculateArtilheiroHitsForBet(p, jogo);
            }
          }
        });

        // Apply active corrections for this user (filtering by rodada if scoped)
        let corrList = (db.correcoes || []).filter(c => c.usuario_id === u.id);
        if (useRodada) {
          const rodadaNum = Number(rodada);
          corrList = corrList.filter(c => {
            if (c.rodada !== undefined && c.rodada !== null) {
              return Number(c.rodada) === rodadaNum;
            } else if (c.descricao) {
              const descLower = c.descricao.toLowerCase();
              const m = descLower.match(/rodada\s*(\d+)/i);
              if (m) return Number(m[1]) === rodadaNum;
            }
            return rodadaNum === 1;
          });
        }
        corrList.forEach(c => {
          pontos += c.pontos;
          if (c.tipo === 'PLACAR_EXATO') {
            acertos_exato += c.quantidade;
          } else if (c.tipo === 'VENCEDOR') {
            acertos_vencedor += c.quantidade;
          } else if (c.tipo === 'GOL') {
            acertos_artilheiro += c.quantidade;
          }
        });

        const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
        const displayName = isSelf ? u.nome : maskName(u.nome);

        return {
          id: u.id,
          nome: displayName,
          cidade: u.cidade,
          pontos,
          acertos_exato,
          acertos_vencedor,
          erros,
          acertos_artilheiro,
          fator: pontos * 100000 + acertos_exato * 10000 + acertos_vencedor * 1000 + acertos_artilheiro * 10 - erros
        };
      })
      .sort((a,b) => {
        if (b.pontos !== a.pontos) {
          return b.pontos - a.pontos;
        }
        if (b.acertos_exato !== a.acertos_exato) {
          return b.acertos_exato - a.acertos_exato;
        }
        if (b.acertos_vencedor !== a.acertos_vencedor) {
          return b.acertos_vencedor - a.acertos_vencedor;
        }
        if (b.acertos_artilheiro !== a.acertos_artilheiro) {
          return b.acertos_artilheiro - a.acertos_artilheiro;
        }
        if (a.erros !== b.erros) {
          return a.erros - b.erros;
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
      top_10: topUsers,
      top_15: topUsers,
      data_servidor: new Date().toISOString(),
      ixc_offline_mode: db.configs_ixc.offline_mode,
      configs_logo: db.configs_logo || { has_custom_logo: false, timestamp: 0 },
      configs_favicon: db.configs_favicon || { has_custom_favicon: false, timestamp: 0 }
    });
  });

  // Get PWA Push Notification Public VAPID Key
  app.get("/api/notifications/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey || null });
  });

  // Subscribe a user's browser device to PWA Web Push alerts
  app.post("/api/notifications/subscribe", (req, res) => {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Inscrição inválida ou incompleta." });
    }

    const db = loadDatabase();
    if (!db.push_subscriptions) {
      db.push_subscriptions = [];
    }

    // Try parsing tenant token to associate subscription with a real user
    let userId: number | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        if (token && token !== "null" && token !== "undefined") {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded && decoded.id) {
            userId = decoded.id;
          }
        }
      } catch (e) {}
    }

    // Clean existing duplicate subscriptions for this exact endpoint to avoid spam
    db.push_subscriptions = db.push_subscriptions.filter(sub => sub.subscription.endpoint !== subscription.endpoint);

    db.push_subscriptions.push({
      usuario_id: userId,
      subscription,
      created_at: new Date().toISOString(),
      alerted_games: []
    });

    saveDatabase(db);
    console.log(`[PWA Push] Registered new subscription successfully. Associated with User ID: ${userId || "Guest"}`);
    res.json({ success: true, message: "Inscrição de alertas PWA registrada com sucesso!" });
  });

  // Admin control: trigger a test alert or manual sweep alert to all registered PWA browsers
  app.post("/api/admin/notifications/broadcast", verifyAdminToken, (req: any, res) => {
    const { title, message } = req.body;
    const alertTitle = title || "Alerta Cartola ITL! ⚽";
    const alertBody = message || "Não fique de fora faça seu palpite e concorra a prêmios!";

    const db = loadDatabase();
    if (!db.push_subscriptions || db.push_subscriptions.length === 0) {
      return res.status(400).json({ error: "Nenhum dispositivo cadastrado para receber notificações de alerta." });
    }

    console.log(`[PWA Admin Push] Broadcasting message to ${db.push_subscriptions.length} devices: "${alertBody}"`);
    let successCount = 0;
    let failureCount = 0;

    const payload = JSON.stringify({
      title: alertTitle,
      body: alertBody,
      url: "/jogos"
    });

    const sendPromises = db.push_subscriptions.map(subRecord => {
      return webpush.sendNotification(subRecord.subscription, payload)
        .then(() => {
          successCount++;
        })
        .catch((err: any) => {
          failureCount++;
          console.warn("[PWA Admin Push] Push failed for subscription:", err.message);
          // Delete inactive subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.push_subscriptions = db.push_subscriptions?.filter(s => s.subscription.endpoint !== subRecord.subscription.endpoint);
          }
        });
    });

    Promise.all(sendPromises).finally(() => {
      saveDatabase(db);
      res.json({
        success: true,
        summary: `Envio concluído! Dispositivos alcançados com sucesso: ${successCount}, Falhas/Inativos descartados: ${failureCount}.`
      });
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
    const userCorrecoes = db.correcoes ? db.correcoes.filter(c => c.usuario_id === id) : [];
    res.json({
      usuario: user,
      palpites: userPalpites,
      correcoes: userCorrecoes
    });
  });

  // Add a manual correction to a participant
  app.post("/api/admin/correcoes", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeEditar) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para editar dados." });
    }

    const { usuario_id, tipo, quantidade, descricao, rodada } = req.body;
    if (!usuario_id || !tipo || !quantidade || !descricao) {
      return res.status(400).json({ error: "Parâmetros inválidos ou em falta." });
    }

    const db = loadDatabase();
    const user = db.usuarios.find(u => u.id === Number(usuario_id));
    if (!user) {
      return res.status(404).json({ error: "Participante não localizado." });
    }

    // Auto-calculate points based on current points configurations
    const points_cfg = db.configs_points;
    let pointsPerItem = 0;
    if (tipo === 'PLACAR_EXATO') {
      pointsPerItem = points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato; // e.g. 4 + 6 = 10
    } else if (tipo === 'VENCEDOR') {
      pointsPerItem = points_cfg.pontos_acertar_vencedor; // e.g. 4
    } else if (tipo === 'GOL') {
      pointsPerItem = points_cfg.pontos_acertar_autor_gol !== undefined ? points_cfg.pontos_acertar_autor_gol : 7; // e.g. 7
    }

    const calculatedPoints = Number(quantidade) * pointsPerItem;

    if (!db.correcoes) {
      db.correcoes = [];
    }

    const newId = db.correcoes.length > 0 ? Math.max(...db.correcoes.map(c => c.id)) + 1 : 1;
    const newCorrection = {
      id: newId,
      usuario_id: Number(usuario_id),
      tipo,
      quantidade: Number(quantidade),
      pontos: calculatedPoints,
      descricao,
      created_at: new Date().toISOString(),
      rodada: rodada !== undefined && rodada !== null && rodada !== "" ? Number(rodada) : undefined
    };

    db.correcoes.push(newCorrection);
    saveDatabase(db);
    refreshLeaderboard(); // Recalculate everything and sync back!

    addLog(req.admin.name || "Admin", "ADICIONAR_CORRECAO", `Adicionou correção do tipo ${tipo} (${quantidade}x) com ${calculatedPoints} pontos para ${user.nome}`, req);

    res.json({ success: true, correcao: newCorrection });
  });

  // Delete a manual correction
  app.delete("/api/admin/correcoes/:id", verifyAdminToken, (req: any, res) => {
    if (!req.admin.permissions.podeExcluir) {
      return res.status(403).json({ error: "Sua conta de administrador não possui permissão para excluir dados." });
    }

    const id = Number(req.params.id);
    const db = loadDatabase();
    
    if (!db.correcoes) {
      db.correcoes = [];
    }

    const corrIndex = db.correcoes.findIndex(c => c.id === id);
    if (corrIndex === -1) {
      return res.status(404).json({ error: "Correção não localizada." });
    }

    const corr = db.correcoes[corrIndex];
    const user = db.usuarios.find(u => u.id === corr.usuario_id);
    const userName = user ? user.nome : `Usuário #${corr.usuario_id}`;

    // Remove from array
    db.correcoes.splice(corrIndex, 1);
    saveDatabase(db);
    refreshLeaderboard(); // Recalculate perfectly and sync

    addLog(req.admin.name || "Admin", "EXCLUIR_CORRECAO", `Removeu correção do tipo ${corr.tipo} para ${userName}`, req);

    res.json({ success: true });
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
      configs_brasileirao: db.configs_brasileirao || { ativo: false },
      configs_custom: db.configs_custom
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
      bonus_jogos_perfeitos,
      pontos_acertar_autor_gol
    } = req.body;

    if (pontos_acertar_vencedor !== undefined) db.configs_points.pontos_acertar_vencedor = Number(pontos_acertar_vencedor);
    if (pontos_acertar_empate !== undefined) db.configs_points.pontos_acertar_empate = Number(pontos_acertar_empate);
    if (pontos_acertar_placar_exato !== undefined) db.configs_points.pontos_acertar_placar_exato = Number(pontos_acertar_placar_exato);
    if (bonus_rodada !== undefined) db.configs_points.bonus_rodada = Number(bonus_rodada);
    if (bonus_sequencia !== undefined) db.configs_points.bonus_sequencia = Number(bonus_sequencia);
    if (bonus_jogos_perfeitos !== undefined) db.configs_points.bonus_jogos_perfeitos = Number(bonus_jogos_perfeitos);
    if (pontos_acertar_autor_gol !== undefined) db.configs_points.pontos_acertar_autor_gol = Number(pontos_acertar_autor_gol);

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
            placar_casa: item.placar_casa,
            placar_fora: item.placar_fora,
            status: item.status as any,
            status_detalhado: item.status_detalhado || (item.status === "ENCERRADO" ? "FT" : "FT"),
            rodada: item.rodada
          });
          addedCount++;
        } else {
          existing.time_casa = item.time_casa;
          existing.time_fora = item.time_fora;
          existing.time_casa_bandeira = item.time_casa_bandeira;
          existing.time_fora_bandeira = item.time_fora_bandeira;
          existing.data_jogo = item.data_jogo;
          existing.status = item.status as any;
          existing.status_detalhado = item.status_detalhado || (item.status === "ENCERRADO" ? "FT" : "FT");
          existing.placar_casa = item.placar_casa;
          existing.placar_fora = item.placar_fora;
          existing.rodada = item.rodada;
          updatedCount++;
        }
      }
    } else {
      for (const item of fixtures) {
        const mappedRound = parseRoundNumber(item.league?.round || "Group Stage - 1", true);
        if (mappedRound === -100) {
          continue; // Skip any qualifiers / pre-libertadores matches
        }

        const apiId = `libertadores_soccer_${item.fixture.id}`;
        let timeCasa = item.teams.home.name;
        let timeFora = item.teams.away.name;
        let timeCasaBandeira = item.teams.home.logo || "🏳️";
        let timeForaBandeira = item.teams.away.logo || "🏳️";

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
            teamsMatch(j.time_casa, timeCasa) && teamsMatch(j.time_fora, timeFora)
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
            rodada: mappedRound
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
          existing.rodada = mappedRound;
          updatedCount++;
        }
      }
    }

    cleanInvalidLibertadoresMatches(db);
    migrateGuessesAndPurgeFallbackLibertadores(db);
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

  // Dynamic Logo Serving to bypass any frontend cache issues
  app.get("/custom-logo.png", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "custom-logo.png");
    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(filePath);
    }
    return res.status(404).send("Logo not found");
  });

  app.get("/icon-192.png", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "icon-192.png");
    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(filePath);
    }
    return res.status(404).send("PWA Icon 192 not found");
  });

  app.get("/icon-512.png", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "icon-512.png");
    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(filePath);
    }
    return res.status(404).send("PWA Icon 512 not found");
  });

  // Dynamic Favicon Serving
  app.get("/favicon.ico", (req, res) => {
    const publicDir = path.join(process.cwd(), "public");
    const favIco = path.join(publicDir, "favicon.ico");
    const favPng = path.join(publicDir, "favicon.png");
    const favSvg = path.join(publicDir, "favicon.svg");

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (fs.existsSync(favIco)) {
      res.setHeader("Content-Type", "image/x-icon");
      return res.sendFile(favIco);
    }
    if (fs.existsSync(favPng)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(favPng);
    }
    if (fs.existsSync(favSvg)) {
      res.setHeader("Content-Type", "image/svg+xml");
      return res.sendFile(favSvg);
    }

    // Default fallback to icon-192.png if no favicon is uploaded at all
    const defaultIcon = path.join(publicDir, "icon-192.png");
    if (fs.existsSync(defaultIcon)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(defaultIcon);
    }
    return res.status(404).send("Favicon not found");
  });

  // Logo upload API route
  app.post("/api/admin/upload-logo", verifyAdminToken, async (req: any, res) => {
    try {
      if (!req.admin.permissions.podeEditar) {
        return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar a logo do sistema." });
      }

      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Nenhum arquivo de imagem recebido." });
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Formato de imagem inválido. Use JPG, PNG ou SVG." });
      }

      const buffer = Buffer.from(matches[2], "base64");

      const publicDir = path.join(process.cwd(), "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const customLogoPath = path.join(publicDir, "custom-logo.png");
      const icon192Path = path.join(publicDir, "icon-192.png");
      const icon512Path = path.join(publicDir, "icon-512.png");

      // Save custom logo
      await sharp(buffer)
        .resize({ width: 256, height: 256, fit: "inside" })
        .png()
        .toFile(customLogoPath);

      // Save PWA 192x192
      await sharp(buffer)
        .resize(192, 192, { fit: "cover" })
        .png()
        .toFile(icon192Path);

      // Save PWA 512x512
      await sharp(buffer)
        .resize(512, 512, { fit: "cover" })
        .png()
        .toFile(icon512Path);

      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        try {
          fs.copyFileSync(customLogoPath, path.join(distPath, "custom-logo.png"));
          fs.copyFileSync(icon192Path, path.join(distPath, "icon-192.png"));
          fs.copyFileSync(icon512Path, path.join(distPath, "icon-512.png"));
        } catch (copyErr) {
          console.error("Error copying logos to dist directory", copyErr);
        }
      }

      const db = loadDatabase();
      db.configs_logo = {
        has_custom_logo: true,
        timestamp: Date.now(),
        custom_logo_base64: base64Data
      };
      saveDatabase(db);

      addLog("Logo System Update", "LOGO_ATUALIZACAO_SUCESSO", "Nova logo do sistema foi carregada e configurada com sucesso para o header e PWA.", req);

      return res.json({ success: true, configs_logo: db.configs_logo });
    } catch (err: any) {
      console.error("Erro interno no upload de logo:", err);
      return res.status(500).json({ error: "Erro ao processar imagem: " + err.message });
    }
  });

  // Favicon upload API route
  app.post("/api/admin/upload-favicon", verifyAdminToken, async (req: any, res) => {
    try {
      if (!req.admin.permissions.podeEditar) {
        return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar o favicon." });
      }

      const { base64Data, originalName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Nenhum arquivo de imagem recebido." });
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Formato de imagem inválido. Use .ico, .png ou .svg." });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      const publicDir = path.join(process.cwd(), "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Determine extension based on originalName or mimeType
      let extension = "ico";
      if (mimeType.includes("png")) {
        extension = "png";
      } else if (mimeType.includes("svg")) {
        extension = "svg";
      } else if (originalName && originalName.endsWith(".svg")) {
        extension = "svg";
      } else if (originalName && originalName.endsWith(".png")) {
        extension = "png";
      } else if (originalName && originalName.endsWith(".ico")) {
        extension = "ico";
      }

      // Delete any old favicon files to avoid conflicts
      const possibleNames = ["favicon.ico", "favicon.png", "favicon.svg"];
      possibleNames.forEach(name => {
        try {
          const fp = path.join(publicDir, name);
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
          }
        } catch (err) {}
      });

      // Write the new favicon file
      const newFaviconName = `favicon.${extension}`;
      const faviconPath = path.join(publicDir, newFaviconName);
      fs.writeFileSync(faviconPath, buffer);

      // Copy to dist/ if it exists
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        try {
          // Delete old files in dist
          possibleNames.forEach(name => {
            const dp = path.join(distPath, name);
            if (fs.existsSync(dp)) {
              fs.unlinkSync(dp);
            }
          });
          // Copy new file
          fs.copyFileSync(faviconPath, path.join(distPath, newFaviconName));
        } catch (copyErr) {
          console.error("Error copying favicon to dist directory", copyErr);
        }
      }

      const db = loadDatabase();
      db.configs_favicon = {
        has_custom_favicon: true,
        timestamp: Date.now(),
        extension: extension,
        custom_favicon_base64: base64Data
      };
      saveDatabase(db);

      addLog("Favicon Update", "FAVICON_ATUALIZACAO_SUCESSO", `Novo favicon do sistema (.${extension}) foi carregado com sucesso.`, req);

      return res.json({ success: true, configs_favicon: db.configs_favicon });
    } catch (err: any) {
      console.error("Erro interno no upload de favicon:", err);
      return res.status(500).json({ error: "Erro ao processar favicon: " + err.message });
    }
  });

  // Save Site Branding and Text configs
  app.post("/api/admin/configs/custom", verifyAdminToken, (req: any, res) => {
    try {
      if (!req.admin.permissions.podeEditar) {
        return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar as configurações do site." });
      }

      const { header_title_1, header_title_2, header_description, regras, premiacoes, recaptcha_active, recaptcha_site_key, recaptcha_secret_key } = req.body;
      const db = loadDatabase();

      if (!db.configs_custom) {
        db.configs_custom = {};
      }

      if (header_title_1 !== undefined) db.configs_custom.header_title_1 = header_title_1;
      if (header_title_2 !== undefined) db.configs_custom.header_title_2 = header_title_2;
      if (header_description !== undefined) db.configs_custom.header_description = header_description;
      if (regras !== undefined) db.configs_custom.regras = regras;
      if (premiacoes !== undefined) db.configs_custom.premiacoes = premiacoes;
      if (recaptcha_active !== undefined) db.configs_custom.recaptcha_active = recaptcha_active;
      if (recaptcha_site_key !== undefined) db.configs_custom.recaptcha_site_key = recaptcha_site_key;
      if (recaptcha_secret_key !== undefined) db.configs_custom.recaptcha_secret_key = recaptcha_secret_key;

      saveDatabase(db);
      addLog("Admin (Suporte)", "ATUALIZA_DADOS_PERSONALIZADOS", "Textos, tabelas e configurações de reCAPTCHA atualizadas.", req);

      return res.json({ success: true, configs_custom: db.configs_custom });
    } catch (err: any) {
      console.error("Erro ao salvar dados personalizados:", err);
      return res.status(500).json({ error: "Erro interno: " + err.message });
    }
  });

  // Upload Watermark Background
  app.post("/api/admin/upload-background", verifyAdminToken, (req: any, res) => {
    try {
      if (!req.admin.permissions.podeEditar) {
        return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar a imagem de fundo." });
      }

      const { base64Data, remove } = req.body;
      const db = loadDatabase();

      if (!db.configs_custom) {
        db.configs_custom = {};
      }

      if (remove) {
        db.configs_custom.background_image = "";
        saveDatabase(db);
        addLog("Admin (Suporte)", "REMOVE_BACKGROUND", "Imagem de marca d'água de fundo foi removida.", req);
        return res.json({ success: true, configs_custom: db.configs_custom });
      }

      if (!base64Data) {
        return res.status(400).json({ error: "Nenhuma imagem recebida." });
      }

      db.configs_custom.background_image = base64Data;
      saveDatabase(db);
      addLog("Admin (Suporte)", "ATUALIZA_BACKGROUND", "Nova imagem de marca d'água de fundo foi carregada.", req);

      return res.json({ success: true, configs_custom: db.configs_custom });
    } catch (err: any) {
      console.error("Erro no upload do background:", err);
      return res.status(500).json({ error: "Erro interno ao processar: " + err.message });
    }
  });

  // Upload ad banner (propaganda)
  app.post("/api/admin/upload-ad-banner", verifyAdminToken, (req: any, res) => {
    try {
      if (!req.admin.permissions.podeEditar) {
        return res.status(403).json({ error: "Sua conta de administrador não possui permissão para alterar o banner de propaganda." });
      }

      const { base64Data, remove } = req.body;
      const db = loadDatabase();

      if (!db.configs_custom) {
        db.configs_custom = {};
      }

      if (remove) {
        db.configs_custom.ad_image = "";
        saveDatabase(db);
        addLog("Admin (Suporte)", "REMOVE_AD_BANNER", "Banner de propaganda da página inicial foi removido.", req);
        return res.json({ success: true, configs_custom: db.configs_custom });
      }

      if (!base64Data) {
        return res.status(400).json({ error: "Nenhuma imagem recebida." });
      }

      db.configs_custom.ad_image = base64Data;
      saveDatabase(db);
      addLog("Admin (Suporte)", "ATUALIZA_AD_BANNER", "Novo banner de propaganda da página inicial foi carregado.", req);

      return res.json({ success: true, configs_custom: db.configs_custom });
    } catch (err: any) {
      console.error("Erro no upload do banner de propaganda:", err);
      return res.status(500).json({ error: "Erro interno ao processar: " + err.message });
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
    
    // Explicitly add strict no-cache control route for core files to prevent aggressive browser/iOS Safari caching
    app.get(["/", "/index.html", "/sw.js", "/manifest.json"], (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      
      if (req.path === "/sw.js") {
        return res.sendFile(path.join(distPath, "sw.js"));
      } else if (req.path === "/manifest.json") {
        return res.sendFile(path.join(distPath, "manifest.json"));
      }
      return res.sendFile(path.join(distPath, "index.html"));
    });

    // Serve all static assets (js, css, png, etc.)
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Double check extension types just in case they bypass direct route definition
        if (filePath.endsWith("sw.js") || filePath.endsWith(".html") || filePath.endsWith("manifest.json")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          // Serve compiled assets/chunks with a long-term immutable cache (since filenames have high-entropy hashes that change with updates)
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));

    app.get('*', (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Active server listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Copa 2026 Portal] Running successfully on http://0.0.0.0:${PORT}`);
    try {
      console.log(`[Boot Cache] Triggering initial database load and cache warmup...`);
      loadDatabase();
    } catch (err: any) {
      console.error(`[Boot Cache Log Exception] Warmup error ignored:`, err.message);
    }
    try {
      console.log("[PWA Push Setup] Registering automated 1-hour PWA push notification alerts check daemon (every 5 minutes)...");
      setInterval(runAutomatedPushAlertsCheck, 5 * 60 * 1000);
      setTimeout(runAutomatedPushAlertsCheck, 10000); // run first check after 10 seconds of boot
    } catch (err: any) {
      console.error("[PWA Push Worker Init Err] Failed to initialize worker daemon:", err.message);
    }
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

function cleanStringForSymmetricMatch(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "");     // remove all non-alphanumeric chars
}

function cleanCompare(s1: string, s2: string): boolean {
  const c1 = cleanStringForSymmetricMatch(s1);
  const c2 = cleanStringForSymmetricMatch(s2);
  if (!c1 || !c2) return false;
  return c1.includes(c2) || c2.includes(c1);
}

function alignHomeAwayData(apiList: any[], jogo: any): { homeData: any, awayData: any } {
  let homeData = apiList[0];
  let awayData = apiList[1];

  if (apiList && apiList.length >= 2) {
    const rawApi0 = apiList[0].team?.name || "";
    const rawApi1 = apiList[1].team?.name || "";
    const transApi0 = translateTeamToPt(rawApi0);
    const transApi1 = translateTeamToPt(rawApi1);
    const dbHome = jogo?.time_casa || "";
    const dbAway = jogo?.time_fora || "";

    // Score for apiList[0] as home
    let score0Home = 0;
    if (cleanCompare(dbHome, transApi0) || cleanCompare(dbHome, rawApi0)) score0Home += 10;
    if (cleanCompare(dbAway, transApi1) || cleanCompare(dbAway, rawApi1)) score0Home += 10;

    // Score for apiList[1] as home
    let score1Home = 0;
    if (cleanCompare(dbHome, transApi1) || cleanCompare(dbHome, rawApi1)) score1Home += 10;
    if (cleanCompare(dbAway, transApi0) || cleanCompare(dbAway, rawApi0)) score1Home += 10;

    if (score1Home > score0Home) {
      homeData = apiList[1];
      awayData = apiList[0];
    } else {
      homeData = apiList[0];
      awayData = apiList[1];
    }
  }
  return { homeData, awayData };
}

function parseApiStats(apiResponse: any[], jogo: any) {
  const { homeData, awayData } = alignHomeAwayData(apiResponse, jogo);

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
  const { homeData, awayData } = alignHomeAwayData(apiLineups, jogo);

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

async function runAutomatedPushAlertsCheck() {
  try {
    const db = loadDatabase();
    if (!db.push_subscriptions || db.push_subscriptions.length === 0) return;
    
    // Find games starting in (1 hr to 2 hr) from now
    const nowMs = Date.now();
    const minDiff = 1 * 60 * 60 * 1000; // 1 hour
    const maxDiff = 2 * 60 * 60 * 1000; // 2 hours
    
    const gamesClosingSoon = db.jogos.filter(jogo => {
      const kickoff = new Date(jogo.data_jogo).getTime();
      const diff = kickoff - nowMs;
      // Also must be locked status === "PENDENTE"
      return jogo.status === "PENDENTE" && diff > minDiff && diff <= maxDiff;
    });
    
    if (gamesClosingSoon.length === 0) return;
    
    console.log(`[PWA Push Worker] Found ${gamesClosingSoon.length} matches closing soon. Scanning subscribers...`);
    
    let dbUpdated = false;
    
    for (const subRecord of db.push_subscriptions) {
      if (!subRecord.alerted_games) {
        subRecord.alerted_games = [];
      }
      
      // Determine if there is any closing match for which this subscription has NOT been alerted yet
      const unalertedMatches = gamesClosingSoon.filter(g => !subRecord.alerted_games!.includes(g.id));
      
      if (unalertedMatches.length > 0) {
        const matchesText = unalertedMatches.map(g => `${g.time_casa} x ${g.time_fora}`).join(", ");
        const payload = JSON.stringify({
          title: "Não fique de fora! ⚽",
          body: `Seu palpite para mais de um jogo encerra em breve (menos de 1 hora restantes para salvar!). Não fique de fora faça seu palpite e concorra a prêmios!`,
          url: "/jogos"
        });
        
        webpush.sendNotification(subRecord.subscription, payload)
          .then(() => {
            console.log(`[PWA Push Worker] Push alert dispatched successfully to subscriber.`);
          })
          .catch((err: any) => {
            console.warn(`[PWA Push Worker] Push failed for subscriber (might be expired or revoked):`, err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
              db.push_subscriptions = db.push_subscriptions?.filter(s => s.subscription.endpoint !== subRecord.subscription.endpoint);
              dbUpdated = true;
            }
          });
          
        unalertedMatches.forEach(g => subRecord.alerted_games!.push(g.id));
        dbUpdated = true;
      }
    }
    
    if (dbUpdated) {
      saveDatabase(db);
    }
  } catch (err: any) {
    console.error("[PWA Push Worker] Runner error:", err.message);
  }
}


