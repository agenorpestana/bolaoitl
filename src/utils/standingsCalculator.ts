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
  // Grupo A
  "México": "Grupo A", "Mexico": "Grupo A",
  "África do Sul": "Grupo A", "South Africa": "Grupo A",
  "Coreia do Sul": "Grupo A", "South Korea": "Grupo A", "Korea": "Grupo A",
  "Rep. Tcheca": "Grupo A", "Czech Republic": "Grupo A", "Czechia": "Grupo A",

  // Grupo B
  "Canadá": "Grupo B", "Canada": "Grupo B",
  "Bósnia": "Grupo B", "Bosnia": "Grupo B", "Bosnia and Herzegovina": "Grupo B",
  "Qatar": "Grupo B", "Katar": "Grupo B",
  "Suíça": "Grupo B", "Switzerland": "Grupo B",

  // Grupo C
  "Brasil": "Grupo C", "Brazil": "Grupo C",
  "Marrocos": "Grupo C", "Morocco": "Grupo C",
  "Haiti": "Grupo C",
  "Escócia": "Grupo C", "Scotland": "Grupo C",

  // Grupo D
  "EUA": "Grupo D", "USA": "Grupo D", "Estados Unidos": "Grupo D", "United States": "Grupo D",
  "Paraguai": "Grupo D", "Paraguay": "Grupo D",
  "Austrália": "Grupo D", "Australia": "Grupo D",
  "Turquia": "Grupo D", "Turkey": "Grupo D",

  // Grupo E
  "Alemanha": "Grupo E", "Germany": "Grupo E",
  "Curaçao": "Grupo E", "Curacao": "Grupo E",
  "Costa do Marfim": "Grupo E", "Ivory Coast": "Grupo E",
  "Equador": "Grupo E", "Ecuador": "Grupo E",

  // Grupo F
  "Holanda": "Grupo F", "Netherlands": "Grupo F",
  "Japão": "Grupo F", "Japan": "Grupo F",
  "Suécia": "Grupo F", "Sweden": "Grupo F",
  "Tunísia": "Grupo F", "Tunisia": "Grupo F",

  // Grupo G
  "Bélgica": "Grupo G", "Belgium": "Grupo G",
  "Egito": "Grupo G", "Egypt": "Grupo G",
  "Irã": "Grupo G", "Iran": "Grupo G", "Islamic Republic of Iran": "Grupo G",
  "N. Zelândia": "Grupo G", "Nova Zelândia": "Grupo G", "New Zealand": "Grupo G",

  // Grupo H
  "Espanha": "Grupo H", "Spain": "Grupo H",
  "Cabo Verde": "Grupo H", "Cape Verde": "Grupo H",
  "Arábia Saudita": "Grupo H", "Saudi Arabia": "Grupo H",
  "Uruguai": "Grupo H", "Uruguay": "Grupo H",

  // Grupo I
  "França": "Grupo I", "France": "Grupo I",
  "Senegal": "Grupo I",
  "Iraque": "Grupo I", "Iraq": "Grupo I",
  "Noruega": "Grupo I", "Norway": "Grupo I",

  // Grupo J
  "Argentina": "Grupo J",
  "Argélia": "Grupo J", "Algeria": "Grupo J",
  "Áustria": "Grupo J", "Austria": "Grupo J",
  "Jordânia": "Grupo J", "Jordan": "Grupo J",

  // Grupo K
  "Portugal": "Grupo K",
  "RD Congo": "Grupo K", "DR Congo": "Grupo K", "Congo DR": "Grupo K", "Democratic Republic of the Congo": "Grupo K",
  "Uzbequistão": "Grupo K", "Uzbekistan": "Grupo K",
  "Colômbia": "Grupo K", "Colombia": "Grupo K",

  // Grupo L
  "Inglaterra": "Grupo L", "England": "Grupo L",
  "Croácia": "Grupo L", "Croatia": "Grupo L",
  "Gana": "Grupo L", "Ghana": "Grupo L",
  "Panamá": "Grupo L", "Panama": "Grupo L",
};

const LIBERTADORES_TEAM_GROUPS: { [key: string]: string } = {
  // Grupo A
  "Flamengo": "Grupo A", "Flamingo": "Grupo A",
  "Estudiantes L.P.": "Grupo A", "Estudiantes": "Grupo A", "Estudiantes LP": "Grupo A",
  "Cusco": "Grupo A", "Cusco FC": "Grupo A",
  "Ind. Medellín": "Grupo A", "Independiente Medellín": "Grupo A", "Medellín": "Grupo A",

  // Grupo B
  "Club Nacional": "Grupo B", "Nacional": "Grupo B", "Nacional Montevideo": "Grupo B",
  "Universitario": "Grupo B", "Universitário": "Grupo B",
  "Coquimbo Unido": "Grupo B", "Coquimbo": "Grupo B",
  "Deportes Tolima": "Grupo B", "Tolima": "Grupo B",

  // Grupo C
  "Fluminense": "Grupo C",
  "Bolívar": "Grupo C", "Bolivar": "Grupo C",
  "Dep. La Guaira": "Grupo C", "Deportivo La Guaira": "Grupo C",
  "Ind. Rivadavia": "Grupo C", "Independiente Rivadavia": "Grupo C",

  // Grupo D
  "Boca Juniors": "Grupo D", "Boca": "Grupo D",
  "Cruzeiro": "Grupo D",
  "Univ. Católica": "Grupo D", "Universidad Católica": "Grupo D",
  "Barcelona SC": "Grupo D", "Bar. Guayaquil": "Grupo D",

  // Grupo E
  "Peñarol": "Grupo E", "Penarol": "Grupo E",
  "Corinthians": "Grupo E",
  "Ind. Santa Fé": "Grupo E", "Independiente Santa Fe": "Grupo E", "Santa Fe": "Grupo E",
  "Platense": "Grupo E",

  // Grupo F
  "Palmeiras": "Grupo F",
  "Cerro Porteño": "Grupo F", "Cerro Porteno": "Grupo F",
  "Junior": "Grupo F", "Júnior Barranquilla": "Grupo F", "Junior Barranquilla": "Grupo F",
  "Sporting Cristal": "Grupo F",

  // Grupo G
  "LDU de Quito": "Grupo G", "LDU": "Grupo G", "LDU Quito": "Grupo G",
  "Lanús": "Grupo G", "Lanus": "Grupo G",
  "Always Ready": "Grupo G",
  "Mirassol": "Grupo G", "Mirassol FC": "Grupo G",

  // Grupo H
  "Ind. del Valle": "Grupo H", "Independiente del Valle": "Grupo H", "IDV": "Grupo H",
  "Libertad": "Grupo H",
  "Rosário Central": "Grupo H", "Rosario Central": "Grupo H",
  "Univ. Central": "Grupo H", "Universidad Central": "Grupo H"
};

export const WORLD_CUP_GROUPS_INITIAL_TEAMS: { [group: string]: string[] } = {
  "Grupo A": ["México", "África do Sul", "Coreia do Sul", "Rep. Tcheca"],
  "Grupo B": ["Canadá", "Bósnia", "Qatar", "Suíça"],
  "Grupo C": ["Brasil", "Marrocos", "Haiti", "Escócia"],
  "Grupo D": ["EUA", "Paraguai", "Austrália", "Turquia"],
  "Grupo E": ["Alemanha", "Curaçao", "Costa do Marfim", "Equador"],
  "Grupo F": ["Holanda", "Japão", "Suécia", "Tunísia"],
  "Grupo G": ["Bélgica", "Egito", "Irã", "N. Zelândia"],
  "Grupo H": ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
  "Grupo I": ["França", "Senegal", "Iraque", "Noruega"],
  "Grupo J": ["Argentina", "Argélia", "Áustria", "Jordânia"],
  "Grupo K": ["Portugal", "RD Congo", "Uzbequistão", "Colômbia"],
  "Grupo L": ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

export const LIBERTADORES_GROUPS_INITIAL_TEAMS: { [group: string]: string[] } = {
  "Grupo A": ["Flamengo", "Estudiantes L.P.", "Cusco", "Ind. Medellín"],
  "Grupo B": ["Club Nacional", "Universitario", "Coquimbo Unido", "Deportes Tolima"],
  "Grupo C": ["Fluminense", "Bolívar", "Dep. La Guaira", "Ind. Rivadavia"],
  "Grupo D": ["Boca Juniors", "Cruzeiro", "Univ. Católica", "Barcelona SC"],
  "Grupo E": ["Peñarol", "Corinthians", "Ind. Santa Fé", "Platense"],
  "Grupo F": ["Palmeiras", "Cerro Porteño", "Junior", "Sporting Cristal"],
  "Grupo G": ["LDU de Quito", "Lanús", "Always Ready", "Mirassol"],
  "Grupo H": ["Ind. del Valle", "Libertad", "Rosário Central", "Univ. Central"],
};

function getGameChampionshipLocal(jogo: Jogo): 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO' {
  if (jogo.api_id) {
    const idLower = jogo.api_id.toLowerCase();
    if (idLower.includes("libertadores")) return 'LIBERTADORES';
    if (idLower.includes("brasileirao")) return 'BRASILEIRAO';
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

function getCanonicalTeamName(teamName: string, campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'): string {
  if (!teamName) return "";
  const cleaned = cleanTeamName(teamName);
  
  if (campeonato === 'LIBERTADORES') {
    if (cleaned === "flamengo" || cleaned === "flamingo") return "Flamengo";
    if (cleaned.includes("estudiantes")) return "Estudiantes L.P.";
    if (cleaned === "cusco" || cleaned === "cuscofc") return "Cusco";
    if (cleaned.includes("medellin")) return "Ind. Medellín";
    
    if (cleaned === "nacional" || cleaned === "clubnacional" || cleaned === "nacionalmontevideo" || cleaned === "nacionaluru") return "Club Nacional";
    if (cleaned === "universitario" || cleaned === "universitário") return "Universitario";
    if (cleaned === "coquimbounido" || cleaned === "coquimbo") return "Coquimbo Unido";
    if (cleaned === "tolima" || cleaned === "deportestolima" || cleaned === "deptolima") return "Deportes Tolima";
    
    if (cleaned === "fluminense") return "Fluminense";
    if (cleaned === "bolivar" || cleaned === "bolívar") return "Bolívar";
    if (cleaned === "deportivolaguaira" || cleaned === "laguaira" || cleaned === "deplaguaira") return "Dep. La Guaira";
    if (cleaned === "indrivadavia" || cleaned === "independienterivadavia" || cleaned === "rivadavia") return "Ind. Rivadavia";
    
    if (cleaned === "bocajuniors" || cleaned === "boca" || cleaned === "bocajr" || cleaned === "bocajrs") return "Boca Juniors";
    if (cleaned === "cruzeiro") return "Cruzeiro";
    if (cleaned === "universidadcatolica" || cleaned === "univcatolica" || cleaned === "ucatolica" || cleaned.includes("catol")) return "Univ. Católica";
    if (cleaned === "barguayaquil" || cleaned === "barcelonasc" || cleaned === "barcelonaguayaquil" || cleaned.includes("barcelona")) return "Barcelona SC";
    
    if (cleaned === "penarol" || cleaned === "peñarol") return "Peñarol";
    if (cleaned === "corinthians" || cleaned === "corintians") return "Corinthians";
    if (cleaned === "indantafe" || cleaned === "independientesantafe" || cleaned === "santafe") return "Ind. Santa Fé";
    if (cleaned === "platense" || cleaned === "caplatense" || cleaned === "atleticoplatense") return "Platense";
    
    if (cleaned === "palmeiras") return "Palmeiras";
    if (cleaned === "cerroporteno" || cleaned === "cerroporteño" || cleaned === "cerro") return "Cerro Porteño";
    if (cleaned === "junior" || cleaned === "juniorbarranquilla" || cleaned === "juniordebarranquilla") return "Junior";
    if (cleaned === "sportingcristal" || cleaned === "cristal") return "Sporting Cristal";
    
    if (cleaned === "ldu" || cleaned === "lduquito" || cleaned === "ldudequito" || cleaned.startsWith("ldu")) return "LDU de Quito";
    if (cleaned === "lanus") return "Lanús";
    if (cleaned === "alwaysready") return "Always Ready";
    if (cleaned === "mirassol" || cleaned === "mirassolfc") return "Mirassol";
    
    if (cleaned === "inddelvalle" || cleaned === "independientedelvalle" || cleaned === "idv") return "Ind. del Valle";
    if (cleaned === "libertad" || cleaned === "libertadasuncion") return "Libertad";
    if (cleaned === "rosariocentral") return "Rosário Central";
    if (cleaned === "univcentral" || cleaned === "universidadcentral" || cleaned === "universidadcentraldevenezuela" || cleaned === "ucv") return "Univ. Central";
  }
  
  if (campeonato === 'COPA_MUNDO') {
    if (cleaned === "brasil" || cleaned === "brazil") return "Brasil";
    if (cleaned === "canada") return "Canadá";
    if (cleaned === "australia") return "Austrália";
    if (cleaned === "camaroes" || cleaned === "cameroon") return "Camarões";
    if (cleaned === "estadosunidos" || cleaned === "usa" || cleaned === "us" || cleaned === "eua" || cleaned === "unitedstates") return "EUA";
    if (cleaned === "polonia" || cleaned === "poland") return "Polônia";
    if (cleaned === "marrocos" || cleaned === "morocco") return "Marrocos";
    if (cleaned === "franca" || cleaned === "france") return "França";
    if (cleaned === "mexico") return "México";
    if (cleaned === "suecia" || cleaned === "sweden") return "Suécia";
    if (cleaned === "egito" || cleaned === "egypt") return "Egito";
    if (cleaned === "inglaterra" || cleaned === "england") return "Inglaterra";
    if (cleaned === "ucrania" || cleaned === "ukraine") return "Ucrânia";
    if (cleaned === "equador" || cleaned === "ecuador") return "Equador";
    if (cleaned === "coreiadosul" || cleaned === "southkorea" || cleaned === "korea") return "Coreia do Sul";
    if (cleaned === "espanha" || cleaned === "spain") return "Espanha";
    if (cleaned === "japao" || cleaned === "japan") return "Japão";
    if (cleaned === "uruguai" || cleaned === "uruguay") return "Uruguai";
    if (cleaned === "nigeria" || cleaned === "nigeria") return "Nigéria";
    if (cleaned === "alemanha" || cleaned === "germany") return "Alemanha";
    if (cleaned === "belgica" || cleaned === "belgium") return "Bélgica";
    if (cleaned === "colombia") return "Colômbia";
    if (cleaned === "arabiasaudita" || cleaned === "saudiarabia") return "Arábia Saudita";
    if (cleaned === "holanda" || cleaned === "netherlands") return "Holanda";
    if (cleaned === "suica" || cleaned === "switzerland") return "Suíça";
    if (cleaned === "italia" || cleaned === "italy") return "Itália";
    if (cleaned === "croacia" || cleaned === "croatia") return "Croácia";
    if (cleaned === "paraguai" || cleaned === "paraguay") return "Paraguai";
    if (cleaned === "tunisia") return "Tunísia";
    if (cleaned === "novazelandia" || cleaned === "newzealand" || cleaned === "nzelandia") return "N. Zelândia";
    if (cleaned === "turquia" || cleaned === "turkey") return "Turquia";
    if (cleaned === "algeria" || cleaned === "argelia") return "Argélia";
    if (cleaned === "panama") return "Panamá";
    if (cleaned === "ira" || cleaned === "iran") return "Irã";
    if (cleaned === "dinamarca" || cleaned === "denmark") return "Dinamarca";
    if (cleaned === "servia" || cleaned === "serbia") return "Sérvia";
    if (cleaned === "gana" || cleaned === "ghana") return "Gana";
    if (cleaned === "austria") return "Áustria";
    if (cleaned === "gales" || cleaned === "wales") return "Gales";
    if (cleaned === "tailandia" || cleaned === "thailand") return "Tailândia";
    if (cleaned === "africadosul" || cleaned === "southafrica") return "África do Sul";
    
    // Additional teams from image
    if (cleaned === "bosnia" || cleaned.includes("herzegovina")) return "Bósnia";
    if (cleaned === "haiti") return "Haiti";
    if (cleaned === "escocia" || cleaned === "scotland") return "Escócia";
    if (cleaned === "curacao") return "Curaçao";
    if (cleaned.includes("marfim") || cleaned === "ivorycoast") return "Costa do Marfim";
    if (cleaned === "caboverde" || cleaned === "capeverde") return "Cabo Verde";
    if (cleaned === "senegal") return "Senegal";
    if (cleaned === "iraque" || cleaned === "iraq") return "Iraque";
    if (cleaned === "noruega" || cleaned === "norway") return "Noruega";
    if (cleaned === "jordania" || cleaned === "jordan") return "Jordânia";
    if (cleaned.includes("congo") || cleaned === "rdcongo") return "RD Congo";
    if (cleaned === "uzbequistao" || cleaned === "uzbekistan") return "Uzbequistão";
    if (cleaned.includes("tcheca") || cleaned === "czechrepublic" || cleaned === "czechia" || cleaned === "reptcheca") return "Rep. Tcheca";
  }

  return teamName;
}

export function calculateStandings(jogos: Jogo[]): StandingRow[] {
  const standingsMap: { [key: string]: StandingRow } = {};

  jogos.forEach(jogo => {
    // Only processed or ended games count for scoreboard standings
    if (jogo.status !== 'ENCERRADO' && jogo.status !== 'AO_VIVO') return;
    if (jogo.placar_casa === null || jogo.placar_fora === null) return;

    const champ = getGameChampionshipLocal(jogo);
    const tCasa = getCanonicalTeamName(jogo.time_casa, champ);
    const tFora = getCanonicalTeamName(jogo.time_fora, champ);
    const pCasa = jogo.placar_casa;
    const pFora = jogo.placar_fora;

    // Initialize team records with optional badge support from either game if available
    if (!standingsMap[tCasa]) {
      standingsMap[tCasa] = { time: tCasa, bandeira: jogo.time_casa_bandeira || undefined, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
    } else if (jogo.time_casa_bandeira && !standingsMap[tCasa].bandeira) {
      standingsMap[tCasa].bandeira = jogo.time_casa_bandeira;
    }
    
    if (!standingsMap[tFora]) {
      standingsMap[tFora] = { time: tFora, bandeira: jogo.time_fora_bandeira || undefined, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
    } else if (jogo.time_fora_bandeira && !standingsMap[tFora].bandeira) {
      standingsMap[tFora].bandeira = jogo.time_fora_bandeira;
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
  const canonicalName = getCanonicalTeamName(teamName, campeonato);
  const cleanedInput = cleanTeamName(canonicalName);
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
  campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO',
  allGames?: Jogo[]
): { [groupName: string]: StandingRow[] } {
  // World Cup 2026 has 12 groups (A to L), while Libertadores has 8 (A to H)
  const groupKeys = campeonato === 'COPA_MUNDO'
    ? ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"]
    : ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H"];

  // 1. Build flags map from any games if available
  const teamFlags: { [teamName: string]: string } = {};
  if (allGames && Array.isArray(allGames)) {
    allGames.forEach(jogo => {
      const ch = getGameChampionshipLocal(jogo);
      const tCasa = getCanonicalTeamName(jogo.time_casa, ch);
      const tFora = getCanonicalTeamName(jogo.time_fora, ch);
      if (jogo.time_casa_bandeira) teamFlags[tCasa] = jogo.time_casa_bandeira;
      if (jogo.time_fora_bandeira) teamFlags[tFora] = jogo.time_fora_bandeira;
    });
  }

  const groups: { [groupName: string]: StandingRow[] } = {};
  groupKeys.forEach(gKey => {
    groups[gKey] = [];

    let defaultTeams: string[] = [];
    if (campeonato === 'COPA_MUNDO') {
      defaultTeams = WORLD_CUP_GROUPS_INITIAL_TEAMS[gKey] || [];
    } else if (campeonato === 'LIBERTADORES') {
      defaultTeams = LIBERTADORES_GROUPS_INITIAL_TEAMS[gKey] || [];
    }

    defaultTeams.forEach(team => {
      const canonical = getCanonicalTeamName(team, campeonato);
      groups[gKey].push({
        time: canonical,
        bandeira: teamFlags[canonical] || undefined,
        pontos: 0,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsPro: 0,
        golsContra: 0,
        saldo: 0
      });
    });
  });

  const unmatched: StandingRow[] = [];

  standings.forEach(row => {
    const group = guessGroupForTeamExplicit(row.time, campeonato);
    if (group && groups[group] !== undefined) {
      // Find if we already pre-populated this team in that group
      const cleanedRowTime = cleanTeamName(row.time);
      const existingIdx = groups[group].findIndex(p => cleanTeamName(p.time) === cleanedRowTime);
      
      const rowWithFlag = {
        ...row,
        bandeira: row.bandeira || teamFlags[getCanonicalTeamName(row.time, campeonato)] || undefined
      };

      if (existingIdx !== -1) {
        groups[group][existingIdx] = rowWithFlag;
      } else {
        groups[group].push(rowWithFlag);
      }
    } else {
      unmatched.push(row);
    }
  });

  // Build sorted map for all groupKeys so empty groups with 0 points are also returned
  const sortedGroups: { [groupName: string]: StandingRow[] } = {};
  groupKeys.forEach(gName => {
    sortedGroups[gName] = [...groups[gName]].sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
      if (b.saldo !== a.saldo) return b.saldo - a.saldo;
      if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
      return a.time.localeCompare(b.time); // Deterministic tie-breaker
    });
  });

  return sortedGroups;
}
