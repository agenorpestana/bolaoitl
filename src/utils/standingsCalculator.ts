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
    if (cleaned === "estadosunidos" || cleaned === "usa" || cleaned === "us") return "Estados Unidos";
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
    if (cleaned === "nigeria") return "Nigéria";
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
    if (cleaned === "novazelandia" || cleaned === "newzealand") return "Nova Zelândia";
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
