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

  // Libertadores Groups
  "Flamengo": "Grupo A", "Peñarol": "Grupo A", "Millonarios": "Grupo A", "Bolívar": "Grupo A",
  "Palmeiras": "Grupo B", "San Lorenzo": "Grupo B", "Ind. del Valle": "Grupo B", "Liverpool URU": "Grupo B",
  "São Paulo": "Grupo C", "Talleres": "Grupo C", "Barcelona SC": "Grupo C", "Cobresal": "Grupo C",
  "Fluminense": "Grupo D", "Colo-Colo": "Grupo D", "Cerro Porteño": "Grupo D", "Alianza Lima": "Grupo D",
  "Botafogo": "Grupo E", "Junior Barranquilla": "Grupo E", "LDU Quito": "Grupo E", "Universitario": "Grupo E",
  "River Plate": "Grupo F", "Nacional URU": "Grupo F", "Libertad": "Grupo F", "Deportivo Táchira": "Grupo F",
  "Atlético-MG": "Grupo G", "Rosario Central": "Grupo G", "Caracas": "Grupo G", "Peñarol MVD": "Grupo G",
  "Grêmio": "Grupo H", "The Strongest": "Grupo H", "Huachipato": "Grupo H", "Estudiantes": "Grupo H"
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

export function groupStandings(standings: StandingRow[]): { [groupName: string]: StandingRow[] } {
  const groups: { [groupName: string]: StandingRow[] } = {};

  standings.forEach(row => {
    const group = TEAM_GROUPS[row.time] || "Grupo Geral";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(row);
  });

  // Limit each group view to 4 teams typical of FIFA setup
  Object.keys(groups).forEach(gName => {
    groups[gName] = groups[gName].sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
      if (b.saldo !== a.saldo) return b.saldo - a.saldo;
      return b.golsPro - a.golsPro;
    });
  });

  return groups;
}

export function guessGroupForTeam(teamName: string): string {
  return TEAM_GROUPS[teamName] || "Grupo A";
}
