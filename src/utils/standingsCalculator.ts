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
const WORLD_CUP_TEAM_GROUPS: { [key: string]: string } = {
  // Group A
  "Brasil": "Grupo A", "Brazil": "Grupo A", "Canadá": "Grupo A", "Canada": "Grupo A", 
  "Austrália": "Grupo A", "Australia": "Grupo A", "Camarões": "Grupo A", "Cameroon": "Grupo A",
  
  // Group B
  "Argentina": "Grupo B", "Estados Unidos": "Grupo B", "USA": "Grupo B", "Polônia": "Grupo B", 
  "Poland": "Grupo B", "Marrocos": "Grupo B", "Morocco": "Grupo B",
  
  // Group C
  "França": "Grupo C", "France": "Grupo C", "México": "Grupo C", "Mexico": "Grupo C", 
  "Suécia": "Grupo C", "Sweden": "Grupo C", "Egito": "Grupo C", "Egypt": "Grupo C",
  
  // Group D
  "Inglaterra": "Grupo D", "England": "Grupo D", "Ucrânia": "Grupo D", "Ukraine": "Grupo D", 
  "Equador": "Grupo D", "Ecuador": "Grupo D", "Coreia do Sul": "Grupo D", "South Korea": "Grupo D",
  
  // Group E
  "Espanha": "Grupo E", "Spain": "Grupo E", "Japão": "Grupo E", "Japan": "Grupo E", 
  "Uruguai": "Grupo E", "Uruguay": "Grupo E", "Nigéria": "Grupo E", "Nigeria": "Grupo E",
  
  // Group F
  "Alemanha": "Grupo F", "Germany": "Grupo F", "Bélgica": "Grupo F", "Belgium": "Grupo F", 
  "Colômbia": "Grupo F", "Colombia": "Grupo F", "Arábia Saudita": "Grupo F", "Saudi Arabia": "Grupo F",
  
  // Group G
  "Portugal": "Grupo G", "Holanda": "Grupo G", "Netherlands": "Grupo G", "Suíça": "Grupo G", 
  "Switzerland": "Grupo G", "Chile": "Grupo G",
  
  // Group H
  "Itália": "Grupo H", "Italy": "Grupo H", "Croácia": "Grupo H", "Croatia": "Grupo H", 
  "Paraguai": "Grupo H", "Paraguay": "Grupo H", "Senegal": "Grupo H",

  // Group I
  "Costa Rica": "Grupo I", "Tunísia": "Grupo I", "Tunisia": "Grupo I", "Nova Zelândia": "Grupo I", 
  "New Zealand": "Grupo I", "Peru": "Grupo I",

  // Group J
  "Turquia": "Grupo J", "Turkey": "Grupo J", "Argélia": "Grupo J", "Algeria": "Grupo J", 
  "Panamá": "Grupo J", "Panama": "Grupo J", "Irã": "Grupo J", "Iran": "Grupo J", "Islamic Republic of Iran": "Grupo J",

  // Group K
  "Dinamarca": "Grupo K", "Denmark": "Grupo K", "Sérvia": "Grupo K", "Serbia": "Grupo K", 
  "Gana": "Grupo K", "Ghana": "Grupo K", "Qatar": "Grupo K",

  // Group L
  "Áustria": "Grupo L", "Austria": "Grupo L", "Gales": "Grupo L", "Wales": "Grupo L", 
  "Tailândia": "Grupo L", "Thailand": "Grupo L", "África do Sul": "Grupo L", "South Africa": "Grupo L"
};

const LIBERTADORES_TEAM_GROUPS: { [key: string]: string } = {
  // Grupo A
  "Flamengo": "Grupo A", "Flamingo": "Grupo A",
  "Estudiantes": "Grupo A", "Estudiantes L.P.": "Grupo A", "Estudiantes LP": "Grupo A", "Estudiantes de La Plata": "Grupo A",
  "Cusco": "Grupo A", "Cusco FC": "Grupo A", "Cusco F.C.": "Grupo A",
  "Ind. Medellín": "Grupo A", "Independiente Medellín": "Grupo A", "Medellín": "Grupo A", "Independiente Medellin": "Grupo A", "Ind. Medellin": "Grupo A",

  // Grupo B
  "Nacional": "Grupo B", "Club Nacional": "Grupo B", "Nacional Montevideo": "Grupo B", "Nacional URU": "Grupo B", "Nacional de Montevideo": "Grupo B",
  "Universitário": "Grupo B", "Universitario": "Grupo B", "Universitario de Deportes": "Grupo B",
  "Coquimbo Unido": "Grupo B", "Coquimbo": "Grupo B",
  "Tolima": "Grupo B", "Deportes Tolima": "Grupo B", "Dep. Tolima": "Grupo B",

  // Grupo C
  "Fluminense": "Grupo C",
  "Bolívar": "Grupo C", "Bolivar": "Grupo C",
  "Dep. La Guaira": "Grupo C", "Deportivo La Guaira": "Grupo C", "La Guaira": "Grupo C",
  "Ind. Rivadavia": "Grupo C", "Independiente Rivadavia": "Grupo C", "Rivadavia": "Grupo C",

  // Grupo D
  "Boca Júniors": "Grupo D", "Boca Juniors": "Grupo D", "Boca": "Grupo D", "Boca Jr": "Grupo D", "Boca Jrs": "Grupo D",
  "Cruzeiro": "Grupo D",
  "Univ. Católica": "Grupo D", "Universidad Católica": "Grupo D", "Univ Catolica": "Grupo D", "Universidad Catolica": "Grupo D", "U. Católica": "Grupo D",
  "Bar. Guayaquil": "Grupo D", "Barcelona SC": "Grupo D", "Barcelona Guayaquil": "Grupo D", "Barcelona S.C.": "Grupo D",

  // Grupo E
  "Peñarol": "Grupo E", "Penarol": "Grupo E",
  "Corinthians": "Grupo E", "Corintians": "Grupo E",
  "Ind. Santa Fé": "Grupo E", "Independiente Santa Fe": "Grupo E", "Santa Fe": "Grupo E", "Santa Fé": "Grupo E", "Ind. Santa Fe": "Grupo E",
  "Platense": "Grupo E", "C.A. Platense": "Grupo E", "Atletico Platense": "Grupo E",

  // Grupo F
  "Palmeiras": "Grupo F",
  "Cerro Porteño": "Grupo F", "Cerro Porteno": "Grupo F",
  "Júnior Barranquilla": "Grupo F", "Junior": "Grupo F", "Junior Barranquilla": "Grupo F", "Junior de Barranquilla": "Grupo F",
  "Sporting Cristal": "Grupo F", "Cristal": "Grupo F",

  // Grupo G
  "LDU": "Grupo G", "LDU Quito": "Grupo G", "LDU de Quito": "Grupo G", "L.D.U. Quito": "Grupo G",
  "Lanús": "Grupo G", "Lanus": "Grupo G",
  "Always Ready": "Grupo G",
  "Mirassol": "Grupo G", "Mirassol FC": "Grupo G",

  // Grupo H
  "Ind. del Valle": "Grupo H", "Independiente del Valle": "Grupo H", "IDV": "Grupo H",
  "Libertad": "Grupo H", "Libertad Asuncion": "Grupo H",
  "Rosário Central": "Grupo H", "Rosario Central": "Grupo H",
  "Univ. Central": "Grupo H", "Universidad Central": "Grupo H", "Universidad Central de Venezuela": "Grupo H", "UCV": "Grupo H"
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

export function guessGroupForTeamExplicit(teamName: string, campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'): string | null {
  const cleanedInput = cleanTeamName(teamName);
  if (!cleanedInput) return null;

  // Choose the appropriate map based on championship
  let mapToUse = LIBERTADORES_TEAM_GROUPS; // fallback default
  if (campeonato === 'COPA_MUNDO') {
    mapToUse = WORLD_CUP_TEAM_GROUPS;
  } else if (campeonato === 'LIBERTADORES') {
    mapToUse = LIBERTADORES_TEAM_GROUPS;
  } else {
    // If not specified, search BOTH starting with World Cup then Libertadores
    const wcGroup = checkInMap(cleanedInput, WORLD_CUP_TEAM_GROUPS);
    if (wcGroup) return wcGroup;
    return checkInMap(cleanedInput, LIBERTADORES_TEAM_GROUPS);
  }

  return checkInMap(cleanedInput, mapToUse);
}

function checkInMap(cleanedInput: string, teamMap: { [key: string]: string }): string | null {
  // 1. Try exact cleaned match first
  for (const [tName, group] of Object.entries(teamMap)) {
    if (cleanTeamName(tName) === cleanedInput) {
      return group;
    }
  }

  // 2. Prevent known false matches (like Boca Juniors matching Junior, or Potosi matching Club Nacional)
  if (cleanedInput === "bocajuniors" || cleanedInput.includes("boca")) {
    return null;
  }
  if (cleanedInput === "nacionalpotosi" || cleanedInput.includes("potosi")) {
    return null;
  }
  if (cleanedInput === "atleticonacional" || cleanedInput === "nacionalparaguay" || cleanedInput === "nacionalasuncion") {
    return null;
  }

  // 3. Substring match only if the mapped comparison name is significant
  for (const [tName, group] of Object.entries(teamMap)) {
    const cleanedMapped = cleanTeamName(tName);
    if (cleanedMapped.length >= 4) {
      if (cleanedMapped === cleanedInput || cleanedMapped.includes(cleanedInput) || cleanedInput.includes(cleanedMapped)) {
        return group;
      }
    }
  }

  return null;
}

export function guessGroupForTeam(teamName: string, campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'): string {
  const explicitGroup = guessGroupForTeamExplicit(teamName, campeonato);
  if (explicitGroup) return explicitGroup;

  // Fallback: Distribute deterministically based on character code sum to avoid "Grupo Geral"
  const sum = Array.from(teamName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const groupsWorldCup = ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"];
  const groupsLibertadores = ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H"];
  const groups = campeonato === 'COPA_MUNDO' ? groupsWorldCup : groupsLibertadores;
  return groups[sum % groups.length];
}

export function groupStandings(
  standings: StandingRow[],
  campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'
): { [groupName: string]: StandingRow[] } {
  // World Cup 2026 has 12 groups (A to L), while Libertadores has 8 (A to H)
  const groupKeys = campeonato === 'COPA_MUNDO'
    ? ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"]
    : ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H"];
  
  const groups: { [groupName: string]: StandingRow[] } = {};
  groupKeys.forEach(gKey => {
    groups[gKey] = [];
  });

  const unmatched: StandingRow[] = [];

  standings.forEach(row => {
    const group = guessGroupForTeamExplicit(row.time, campeonato);
    if (group && groups[group] !== undefined) {
      groups[group].push(row);
    } else {
      unmatched.push(row);
    }
  });

  // Sort unmatched deterministically by team name 
  unmatched.sort((a, b) => a.time.localeCompare(b.time));

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
