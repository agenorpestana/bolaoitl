import { Jogo } from '../types';

export interface GameStats {
  posse_casa: number;
  posse_fora: number;
  chutes_casa: number;
  chutes_fora: number;
  faltas_casa: number;
  faltas_fora: number;
  cartoes_amarelos_casa: number;
  cartoes_amarelos_fora: number;
  cartoes_vermelhos_casa: number;
  cartoes_vermelhos_fora: number;
  escanteios_casa: number;
  escanteios_fora: number;
}

export interface GameLineup {
  titular_casa: string[];
  titular_fora: string[];
  reservas_casa: string[];
  reservas_fora: string[];
  tecnico_casa: string;
  tecnico_fora: string;
}

export interface GamePreview {
  vitoria_casa: number;
  empate: number;
  vitoria_fora: number;
  placar_estimado_casa: number;
  placar_estimado_fora: number;
}

export const STATUS_LABELS: { [key: string]: string } = {
  NS: "Não Iniciado",
  "1H": "1º Tempo",
  HT: "Intervalo",
  "2H": "2º Tempo",
  ET: "Prorrogação",
  P: "Pênaltis",
  FT: "Tempo Regulamentar",
  AET: "Pós-Prorrogação",
  PEN: "Decidido nos Pênaltis",
  PST: "Adiado",
  CANC: "Cancelado",
  SUSP: "Suspenso"
};

// Seed-based random generator to keep details deterministic for each game ID
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = Math.abs(seed) || 12345;
  }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.range(0, arr.length - 1)];
  }
}

const ROSTERS: { [key: string]: { starter: string[]; subs: string[]; coach: string } } = {
  "brazil": {
    starter: ["Alisson", "Danilo", "Marquinhos", "Gabriel Magalhães", "Guilherme Arana", "Bruno Guimarães", "João Gomes", "Lucas Paquetá", "Raphinha", "Rodrygo", "Vinicius Júnior"],
    subs: ["Bento", "Éder Militão", "Bremer", "Douglas Luiz", "Andreas Pereira", "Savinho", "Endrick"],
    coach: "Dorival Júnior"
  },
  "argentina": {
    starter: ["Emiliano Martínez", "Nahuel Molina", "Cristian Romero", "Nicolás Otamendi", "Nicolás Tagliafico", "Rodrigo De Paul", "Enzo Fernández", "Alexis Mac Allister", "Lionel Messi", "Lautaro Martínez", "Julián Álvarez"],
    subs: ["Franco Armani", "Gonzalo Montiel", "Germán Pezzella", "Leandro Paredes", "Giovani Lo Celso", "Alejandro Garnacho", "Ángel Di María"],
    coach: "Lionel Scaloni"
  },
  "germany": {
    starter: ["Marc-André ter Stegen", "Joshua Kimmich", "Antonio Rüdiger", "Jonathan Tah", "David Raum", "Robert Andrich", "Pascal Groß", "Jamal Musiala", "Florian Wirtz", "Leroy Sané", "Kai Havertz"],
    subs: ["Oliver Baumann", "Waldemar Anton", "Benjamin Henrichs", "İlkay Gündoğan", "Thomas Müller", "Niclas Füllkrug", "Maximilian Beier"],
    coach: "Julian Nagelsmann"
  },
  "england": {
    starter: ["Jordan Pickford", "Kyle Walker", "John Stones", "Marc Guéhi", "Kieran Trippier", "Declan Rice", "Jude Bellingham", "Bukayo Saka", "Phil Foden", "Cole Palmer", "Harry Kane"],
    subs: ["Aaron Ramsdale", "Ezri Konsa", "Trent Alexander-Arnold", "Conor Gallagher", "Kobbie Mainoo", "Jarrod Bowen", "Ollie Watkins"],
    coach: "Thomas Tuchel"
  },
  "france": {
    starter: ["Mike Maignan", "Jules Koundé", "Dayot Upamecano", "William Saliba", "Theo Hernandez", "N'Golo Kanté", "Aurélien Tchouaméni", "Adrien Rabiot", "Ousmane Dembélé", "Kylian Mbappé", "Bradley Barcola"],
    subs: ["Brice Samba", "Benjamin Pavard", "Ibrahima Konate", "Eduardo Camavinga", "Youssouf Fofana", "Kingsley Coman", "Olivier Giroud"],
    coach: "Didier Deschamps"
  },
  "spain": {
    starter: ["Unai Simón", "Daniel Carvajal", "Robin Le Normand", "Aymeric Laporte", "Marc Cucurella", "Rodri", "Fabián Ruiz", "Dani Olmo", "Lamine Yamal", "Nico Williams", "Álvaro Morata"],
    subs: ["David Raya", "Daniel Vivian", "Alex Grimaldo", "Martín Zubimendi", "Mikel Merino", "Pedri", "Ferran Torres"],
    coach: "Luis de la Fuente"
  },
  "portugal": {
    starter: ["Diogo Costa", "João Cancelo", "Rúben Dias", "Pepe", "Nuno Mendes", "João Palhinha", "Vitinha", "Bruno Fernandes", "Bernardo Silva", "Rafael Leão", "Cristiano Ronaldo"],
    subs: ["Rui Patrício", "Diogo Dalot", "Gonçalo Inácio", "Rúben Neves", "Otávio", "Diogo Jota", "Gonçalo Ramos"],
    coach: "Roberto Martínez"
  },
  "uruguay": {
    starter: ["Sergio Rochet", "Nahitan Nández", "Ronald Araújo", "José María Giménez", "Mathías Olivera", "Manuel Ugarte", "Federico Valverde", "Nicolás De la Cruz", "Facundo Pellistri", "Maximiliano Araújo", "Darwin Núñez"],
    subs: ["Santiago Mele", "Guillermo Varela", "Sebastián Cáceres", "Rodrigo Bentancur", "Giorgian de Arrascaeta", "Brian Rodríguez", "Luis Suárez"],
    coach: "Marcelo Bielsa"
  },
  "netherlands": {
    starter: ["Bart Verbruggen", "Denzel Dumfries", "Stefan de Vrij", "Virgil van Dijk", "Nathan Aké", "Jerdy Schouten", "Tijjani Reijnders", "Xavi Simons", "Donyell Malen", "Cody Gakpo", "Memphis Depay"],
    subs: ["Mark Flekken", "Matthijs de Ligt", "Micky van de Ven", "Georginio Wijnaldum", "Joey Veerman", "Steven Bergwijn", "Wout Weghorst"],
    coach: "Ronald Koeman"
  },
  "belgium": {
    starter: ["Koen Casteels", "Timothy Castagne", "Wout Faes", "Jan Vertonghen", "Arthur Theate", "Amadou Onana", "Orel Mangala", "Kevin De Bruyne", "Jérémy Doku", "Leandro Trossard", "Romelu Lukaku"],
    subs: ["Kaminski", "Zeno Debast", "Thomas Meunier", "Youri Tielemans", "Arthur Vermeeren", "Johan Bakayoko", "Charles De Ketelaere"],
    coach: "Domenico Tedesco"
  },
  "canada": {
    starter: ["Maxime Crépeau", "Alistair Johnston", "Moïse Bombito", "Derek Cornelius", "Alphonso Davies", "Stephen Eustáquio", "Ismaël Koné", "Richie Laryea", "Liam Millar", "Jonathan David", "Cyle Larin"],
    subs: ["Dayne St. Clair", "Kamal Miller", "Joel Waterman", "Samuel Piette", "Jonathan Osorio", "Jacob Shaffelburg", "Tani Oluwaseyi"],
    coach: "Jesse Marsch"
  },
  "usa": {
    starter: ["Matt Turner", "Joe Scally", "Chris Richards", "Tim Ream", "Antonee Robinson", "Weston McKennie", "Yunus Musah", "Giovanni Reyna", "Timothy Weah", "Christian Pulisic", "Folarin Balogun"],
    subs: ["Ethan Horvath", "Cameron Carter-Vickers", "Miles Robinson", "Tyler Adams", "Johnny Cardoso", "Brenden Aaronson", "Ricardo Pepi"],
    coach: "Mauricio Pochettino"
  },
  "mexico": {
    starter: ["Julio González", "Jorge Sánchez", "César Montes", "Johan Vásquez", "Gerardo Arteaga", "Edson Álvarez", "Luis Chávez", "Orbelín Pineda", "Uriel Antuna", "Julián Quiñones", "Santiago Giménez"],
    subs: ["Carlos Acevedo", "Israel Reyes", "Bryan González", "Luis Romo", "Carlos Rodríguez", "Alexis Vega", "Guillermo Martínez"],
    coach: "Javier Aguirre"
  },
  "italy": {
    starter: ["Gianluigi Donnarumma", "Giovanni Di Lorenzo", "Alessandro Bastoni", "Riccardo Calafiori", "Federico Dimarco", "Nicolò Barella", "Jorginho", "Davide Frattesi", "Federico Chiesa", "Lorenzo Pellegrini", "Gianluca Scamacca"],
    subs: ["Guglielmo Vicario", "Gianluca Mancini", "Raoul Bellanova", "Bryan Cristante", "Nicolò Fagioli", "Mattia Zaccagni", "Giacomo Raspadori"],
    coach: "Luciano Spalletti"
  },
  "flamengo": {
    starter: ["Agustín Rossi", "Guillermo Varela", "Léo Ortiz", "Léo Pereira", "Ayrton Lucas", "Erick Pulgar", "Nicolás De la Cruz", "Gerson", "Giorgian De Arrascaeta", "Bruno Henrique", "Pedro"],
    subs: ["Matheus Cunha", "Fabrício Bruno", "David Luiz", "Viña", "Allan", "Carlos Alcaraz", "Gabriel Barbosa"],
    coach: "Filipe Luís"
  },
  "palmeiras": {
    starter: ["Weverton", "Marcos Rocha", "Gustavo Gómez", "Murilo", "Joaquín Piquerez", "Aníbal Moreno", "Richard Ríos", "Raphael Veiga", "Estêvão", "Felipe Anderson", "José Manuel López"],
    subs: ["Marcelo Lomba", "Vitor Reis", "Mayke", "Zé Rafael", "Gabriel Menino", "Maurício", "Rony"],
    coach: "Abel Ferreira"
  },
  "sao paulo": {
    starter: ["Rafael", "Rafinha", "Robert Arboleda", "Alan Franco", "Welington", "Luiz Gustavo", "Damián Bobadilla", "Lucas Moura", "Luciano", "Ferreira", "Jonathan Calleri"],
    subs: ["Jandrei", "Sabino", "Igor Vinícius", "Marcos Antônio", "Alisson", "Rodrigo Nestor", "André Silva"],
    coach: "Luis Zubeldía"
  },
  "botafogo": {
    starter: ["John", "Vitinho", "Bastos", "Alexander Barboza", "Alex Telles", "Gregore", "Marlon Freitas", "Thiago Almada", "Savarino", "Luiz Henrique", "Igor Jesus"],
    subs: ["Gatito Fernández", "Adryelson", "Cuiabano", "Danilo Barbosa", "Tche Tche", "Matheus Martins", "Tiquinho Soares"],
    coach: "Artur Jorge"
  },
  "corinthians": {
    starter: ["Hugo Souza", "Matheuzinho", "André Ramalho", "Gustavo Henrique", "Matheus Bidu", "José Martínez", "Charles", "Rodrigo Garro", "André Carrillo", "Yuri Alberto", "Memphis Depay"],
    subs: ["Matheus Donelli", "Cacá", "Fagner", "Raniele", "Ryan", "Igor Coronado", "Ángel Romero"],
    coach: "Ramón Díaz"
  },
  "fluminense": {
    starter: ["Fábio", "Samuel Xavier", "Thiago Silva", "Thiago Santos", "Diogo Barbosa", "Facundo Bernal", "Martinelli", "Paulo Henrique Ganso", "Jhon Arias", "Keno", "Kauã Elias"],
    subs: ["Felipe Alves", "Guga", "Antônio Carlos", "Felipe Melo", "Renato Augusto", "Marquinhos", "Germán Cano"],
    coach: "Mano Menezes"
  }
};

const GENERIC_ROSTER_POOL_HOUSE = [
  "Ronaldo", "Mário", "Bortolo", "Pestana", "Junior", "Roberto", "Santos", "Oliveira", "Silva",
  "Barbosa", "Nascimento", "Rodriguez", "Fernández", "Gomes", "Alves", "Pinto", "Cardoso",
  "Teixeira", "Moreira", "Lima", "Moraes", "Costa", "Torres", "Vieira", "Ribeiro", "Araújo"
];

function generateGenericRoster(teamName: string, id: number): { starter: string[]; subs: string[]; coach: string } {
  const rand = new SeededRandom(id + teamName.charCodeAt(0) * 10);
  const words = teamName.replace(/[^a-zA-Z\s]/g, "").split(" ").filter(Boolean);
  const prefix = words[0] ? words[0].substring(0, 3).toUpperCase() : "FC";

  const starters: string[] = [];
  for (let i = 1; i <= 11; i++) {
    const num = i === 1 ? "1" : String(rand.range(2, 30));
    const lastName = rand.pick(GENERIC_ROSTER_POOL_HOUSE);
    starters.push(`${prefix} ${lastName} (${num})`);
  }

  const subs: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const num = String(rand.range(12, 99));
    const lastName = rand.pick(GENERIC_ROSTER_POOL_HOUSE);
    subs.push(`${prefix} ${lastName} (${num})`);
  }

  const coachLastName = rand.pick(GENERIC_ROSTER_POOL_HOUSE);
  return {
    starter: starters,
    subs,
    coach: `Prof. ${coachLastName}`
  };
}

export function lookupRoster(teamName: string, id: number): { starter: string[]; subs: string[]; coach: string } {
  if (!teamName) return generateGenericRoster("Time Desconhecido", id);
  const n = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const k of Object.keys(ROSTERS)) {
    if (n.includes(k) || k.includes(n)) {
      return ROSTERS[k];
    }
  }
  return generateGenericRoster(teamName, id);
}

// Dynamically generate all stats, predictions, and lineups deterministically based on match values
export function enrichGameDetails(jogo: Jogo): Jogo {
  const rand = new SeededRandom(jogo.id * 103);

  // 1. Detailed Status Code
  if (!jogo.status_detalhado) {
    if (jogo.status === 'PENDENTE') {
      jogo.status_detalhado = rand.pick(['NS', 'NS', 'NS', 'PST']);
    } else if (jogo.status === 'AO_VIVO') {
      jogo.status_detalhado = rand.pick(['1H', '2H', 'HT', 'ET', 'P']);
    } else if (jogo.status === 'ENCERRADO') {
      const isDraw = jogo.placar_casa === jogo.placar_fora;
      jogo.status_detalhado = isDraw && rand.next() > 0.5 ? 'PEN' : 'FT';
    }
  }

  // 2. Pre-match predictions and metrics (preview) if PENDENTE
  // In the original type Jogo we add them directly or as properties.
  // To avoid Prisma TS issues, we can return them as enriched components in the JSON.
  const preview: GamePreview = {
    vitoria_casa: rand.range(25, 60),
    vitoria_fora: 0,
    empate: 0,
    placar_estimado_casa: rand.range(0, 3),
    placar_estimado_fora: rand.range(0, 2)
  };
  preview.vitoria_fora = rand.range(20, 100 - preview.vitoria_casa - 10);
  preview.empate = 100 - preview.vitoria_casa - preview.vitoria_fora;

  // 3. Squad and lineups
  const homeRoster = lookupRoster(jogo.time_casa, jogo.id * 2);
  const awayRoster = lookupRoster(jogo.time_fora, jogo.id * 3);

  const lineup: GameLineup = {
    titular_casa: homeRoster.starter,
    titular_fora: awayRoster.starter,
    reservas_casa: homeRoster.subs,
    reservas_fora: awayRoster.subs,
    tecnico_casa: homeRoster.coach,
    tecnico_fora: awayRoster.coach
  };

  // 4. Statistics based on score
  const scoreCasa = jogo.placar_casa !== null ? jogo.placar_casa : 0;
  const scoreFora = jogo.placar_fora !== null ? jogo.placar_fora : 0;

  // Derive possession logically from score & a bit of seeding
  let possessionCasa = 50 + rand.range(-15, 15);
  if (scoreCasa > scoreFora) {
    possessionCasa -= rand.range(2, 6); // leading team tends to defend more, lower possession
  } else if (scoreFora > scoreCasa) {
    possessionCasa += rand.range(2, 6);
  }
  possessionCasa = Math.max(25, Math.min(75, possessionCasa));
  const possessionAway = 100 - possessionCasa;

  const totalShotsCode = 10 + scoreCasa + scoreFora + rand.range(1, 10);
  const shotsCasa = Math.floor(totalShotsCode * (possessionCasa / 100)) + rand.range(-2, 2);
  const shotsFora = totalShotsCode - shotsCasa;

  const targetCasa = scoreCasa + rand.range(1, 4);
  const targetFora = scoreFora + rand.range(1, 4);

  const stats: GameStats = {
    posse_casa: possessionCasa,
    posse_fora: possessionAway,
    chutes_casa: Math.max(targetCasa + 1, shotsCasa),
    chutes_fora: Math.max(targetFora + 1, shotsFora),
    faltas_casa: rand.range(8, 18),
    faltas_fora: rand.range(8, 18),
    cartoes_amarelos_casa: rand.range(1, 4),
    cartoes_amarelos_fora: rand.range(1, 4),
    cartoes_vermelhos_casa: rand.next() > 0.90 ? 1 : 0,
    cartoes_vermelhos_fora: rand.next() > 0.90 ? 1 : 0,
    escanteios_casa: rand.range(2, 8),
    escanteios_fora: rand.range(2, 8)
  };

  // Returns fully hydrated game object structure
  return {
    ...jogo,
    status_detalhado: jogo.status_detalhado,
    estatisticas: stats as any,
    escalacao: lineup as any,
    preview: preview as any
  };
}
