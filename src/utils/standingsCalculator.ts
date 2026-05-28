import { Jogo } from '../types';

export interface StandingRow {
  time: string;
  bandeira?: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
}

// Map of typical groups for major teams in Copa do Mundo 2026/Libertadores 2026 to make brackets and standings gorgeous
const TEAM_GROUPS: { [key: string]: string } = {
  // World Cup Groups
  "Brasil": "Grupo A", "Canadá": "Grupo A", "Austrália": "Grupo A", "Camarões": "Grupo A",
  "Argentina": "Grupo B", "Estados Unidos": "Grupo B", "Polônia": "Grupo B", "Marrocos": "Grupo B",
  "França": "Grupo C", "México": "Grupo C", "Suécia": "Grupo C", "Egito": "Grupo C",
  "Inglaterra": "Grupo D", "Ucrânia": "Grupo D", "Equador": "Grupo D", "Coreia do Sul": "Grupo D",
  "Espanha": "Grupo E", "Japão": "Grupo E", "Uruguai": "Grupo E", "Nigéria": "Grupo E",
  "Alemanha": "Grupo F", "Bélgica": "Grupo F", "Colômbia": "Grupo F", "Arábia Saudita": "Grupo F",
  "Portugal": "Grupo G", "Holanda": "Grupo G", "Suíça": "Grupo G", "Chile": "Grupo G",
  "Itália": "Grupo H", "Croácia": "Grupo H", "Paraguai": "Grupo H", "Senegal": "Grupo H",

  // Libertadores Groups (True Real 2024 Alignment)
  "Fluminense": "Grupo A", "Colo-Colo": "Grupo A", "Colo Colo": "Grupo A", "Cerro Porteño": "Grupo A", "Cerro Porteno": "Grupo A", "Alianza Lima": "Grupo A",
  "São Paulo": "Grupo B", "Talleres": "Grupo B", "Barcelona SC": "Grupo B", "Barcelona Guayaquil": "Grupo B", "Barcelona S.C.": "Grupo B", "Cobresal": "Grupo B",
  "Grêmio": "Grupo C", "Gremio": "Grupo C", "The Strongest": "Grupo C", "Huachipato": "Grupo C", "Estudiantes": "Grupo C", "Estudiantes L.P.": "Grupo C", "Estudiantes LP": "Grupo C",
  "LDU Quito": "Grupo D", "LDU de Quito": "Grupo D", "L.D.U. Quito": "Grupo D", "Junior Barranquilla": "Grupo D", "Junior": "Grupo D", "Universitario": "Grupo D", "Botafogo": "Grupo D",
  "Flamengo": "Grupo E", "Bolívar": "Grupo E", "Bolivar": "Grupo E", "Millonarios": "Grupo E", "Palestino": "Grupo E", "Palestino CHI": "Grupo E",
  "Palmeiras": "Grupo F", "Ind. del Valle": "Grupo F", "Independiente del Valle": "Grupo F", "San Lorenzo": "Grupo F", "Liverpool URU": "Grupo F", "Liverpool M.": "Grupo F", "Liverpool Montevideo": "Grupo F",
  "Peñarol": "Grupo G", "Penarol": "Grupo G", "Peñarol MVD": "Grupo G", "Atlético-MG": "Grupo G", "Atletico-MG": "Grupo G", "Atletico MG": "Grupo G", "Atlético Mineiro": "Grupo G", "Rosario Central": "Grupo G", "Caracas": "Grupo G",
  "River Plate": "Grupo H", "Libertad": "Grupo H", "Libertad Asuncion": "Grupo H", "Nacional URU": "Grupo H", "Nacional Montevideo": "Grupo H", "Club Nacional": "Grupo H", "Nacional": "Grupo H", "Deportivo Táchira": "Grupo H", "Deportivo Tachira": "Grupo H"
};

export function calculateStandings(jogos: Jogo[]): StandingRow[] {
  const standingsMap: { [key: string]: StandingRow } = {};

  jogos.forEach(jogo => {
    // Only processed or ended games count for scoreboard standings
    if (jogo.status !== 'ENCERRADO' && jogo.status !== 'AO_VIVO') return;
    if (jogo.placar_casa === null || jogo.placar_fora === null) return;

    const tCasa = jogo.time_casa;
    const tFora = jogo.time_fora;
    const pCasa = jogo.placar_casa;
    const pFora = jogo.placar_fora;

    // Initialize team records
    if (!standingsMap[tCasa]) {
      standingsMap[tCasa] = { time: tCasa, bandeira: jogo.time_casa_bandeira, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
    }
    if (!standingsMap[tFora]) {
      standingsMap[tFora] = { time: tFora, bandeira: jogo.time_fora_bandeira, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
    }

    const rowCasa = standingsMap[tCasa];
    const rowFora = standingsMap[tFora];

    rowCasa.jogos++;
    rowFora.jogos++;

    rowCasa.golsPro += pCasa;
    rowCasa.golsContra += pFora;
    rowCasa.saldo = rowCasa.golsPro - rowCasa.golsContra;

    rowFora.golsPro += pFora;
    rowFora.golsContra += pCasa;
    rowFora.saldo = rowFora.golsPro - rowFora.golsContra;

    if (pCasa > pFora) {
      rowCasa.pontos += 3;
      rowCasa.vitorias++;
      rowFora.derrotas++;
    } else if (pFora > pCasa) {
      rowFora.pontos += 3;
      rowFora.vitorias++;
      rowCasa.derrotas++;
    } else {
      rowCasa.pontos += 1;
      rowFora.pontos += 1;
      rowCasa.empates++;
      rowFora.empates++;
    }
  });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    return b.golsPro - a.golsPro;
  });
}

function cleanTeamName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(fc|sc|sd|cd|de|del|la|atletico|esporte|sporting|deportivo|club|clube|independiente|independ|riva|mvd|uru|lp|de quito|quito|barranquilla)\b/g, "")
    .replace(/[^a-z0-9]/g, "") // remove special characters & spaces
    .trim();
}

export function guessGroupForTeamExplicit(teamName: string): string | null {
  const cleanedInput = cleanTeamName(teamName);
  if (!cleanedInput) return null;

  // 1. Try exact cleaned match
  for (const [tName, group] of Object.entries(TEAM_GROUPS)) {
    if (cleanTeamName(tName) === cleanedInput) {
      return group;
    }
  }

  // 2. Try substring match (if input is a substring of mapped team, or vice versa)
  for (const [tName, group] of Object.entries(TEAM_GROUPS)) {
    const cleanedMapped = cleanTeamName(tName);
    if (cleanedMapped.includes(cleanedInput) || cleanedInput.includes(cleanedMapped)) {
      return group;
    }
  }

  return null;
}

export function guessGroupForTeam(teamName: string): string {
  const explicitGroup = guessGroupForTeamExplicit(teamName);
  if (explicitGroup) return explicitGroup;

  // Fallback: Distribute deterministically based on character code sum to avoid "Grupo Geral"
  // and keep exactly 8 groups (A to H) nicely distributed
  const sum = Array.from(teamName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const groups = ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H"];
  return groups[sum % groups.length];
}

export function groupStandings(standings: StandingRow[]): { [groupName: string]: StandingRow[] } {
  // We want to distribute teams into exactly 8 groups: A, B, C, D, E, F, G, H
  const groupKeys = ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H"];
  
  const groups: { [groupName: string]: StandingRow[] } = {};
  groupKeys.forEach(gKey => {
    groups[gKey] = [];
  });

  const unmatched: StandingRow[] = [];

  standings.forEach(row => {
    const group = guessGroupForTeamExplicit(row.time);
    if (group && groups[group] !== undefined) {
      groups[group].push(row);
    } else {
      unmatched.push(row);
    }
  });

  // Sort unmatched deterministically by team name to keep refreshing stable
  unmatched.sort((a, b) => a.time.localeCompare(b.time));

  // Distribute unmatched teams to the groups with the minimum current size to keep them balanced
  unmatched.forEach(row => {
    let minSize = Infinity;
    let targetGroup = "Grupo A";

    groupKeys.forEach(gKey => {
      const size = groups[gKey].length;
      if (size < minSize) {
        minSize = size;
        targetGroup = gKey;
      }
    });

    groups[targetGroup].push(row);
  });

  // Build sorted map containing only groups with teams
  const sortedGroups: { [groupName: string]: StandingRow[] } = {};
  groupKeys.forEach(gName => {
    if (groups[gName].length > 0) {
      sortedGroups[gName] = groups[gName].sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        if (b.saldo !== a.saldo) return b.saldo - a.saldo;
        return b.golsPro - a.golsPro;
      });
    }
  });

  return sortedGroups;
}
