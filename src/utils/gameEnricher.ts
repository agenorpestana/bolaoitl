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
  SUSP: "Suspenso",
  INT: "Interrompido"
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
    starter: ["Hugo Souza", "Fagner", "André Ramalho", "Cacá", "Matheus Bidu", "José Martínez", "Alex Santana", "Rodrigo Garro", "Carrillo", "Yuri Alberto", "Memphis Depay"],
    subs: ["Matheus Donelli", "Gustavo Henrique", "Matheuzinho", "Raniele", "Igor Coronado", "Romero", "Hector Hernández"],
    coach: "Ramón Díaz"
  },
  "fluminense": {
    starter: ["Fábio", "Samuel Xavier", "Thiago Silva", "Thiago Santos", "Diogo Barbosa", "Facundo Bernal", "Martinelli", "Ganso", "Jhon Arias", "Keno", "Kauã Elias"],
    subs: ["Felipe Alves", "Guga", "Antônio Carlos", "Felipe Melo", "Marquinhos", "Lima", "Cano"],
    coach: "Mano Menezes"
  },
  "river plate": {
    starter: ["Franco Armani", "Fabricio Bustos", "Germán Pezzella", "Paulo Díaz", "Marcos Acuña", "Matías Kranevitter", "Santiago Simón", "Maximiliano Meza", "Manuel Lanzini", "Facundo Colidio", "Miguel Borja"],
    subs: ["Jeremías Ledesma", "Leandro González Pirez", "Enzo Díaz", "Rodrigo Villagra", "Claudio Echeverri", "Pablo Solari", "Adam Bareiro"],
    coach: "Marcelo Gallardo"
  },
  "penarol": {
    starter: ["Washington Aguerre", "Pedro Milans", "Javier Méndez", "Guzmán Rodríguez", "Maximiliano Olivera", "Damián García", "Eduardo Darias", "Javier Cabrera", "Leonardo Fernández", "Jaime Báez", "Maximiliano Silvera"],
    subs: ["Guillermo de Amores", "Léo Coelho", "Camilo Mayada", "Gastón Ramírez", "Ignacio Sosa", "Facundo Batista", "Felipe Avenatti"],
    coach: "Diego Aguirre"
  },
  "boca juniors": {
    starter: ["Sergio Romero", "Luis Advíncula", "Cristian Lema", "Marcos Rojo", "Lautaro Blanco", "Cristian Medina", "Pol Fernández", "Kevin Zenón", "Tomas Belmonte", "Edinson Cavani", "Miguel Merentiel"],
    subs: ["Leandro Brey", "Aaron Anselmino", "Gary Medel", "Ignacio Miramón", "Jabes Saralegui", "Exequiel Zeballos", "Milton Giménez"],
    coach: "Fernando Gago"
  },
  "atletico-mg": {
    starter: ["Everson", "Renzo Saravia", "Rodrigo Battaglia", "Junior Alonso", "Guilherme Arana", "Otávio", "Alan Franco", "Gustavo Scarpa", "Bernard", "Paulinho", "Hulk"],
    subs: ["Matheus Mendes", "Igor Rabello", "Rubens", "Fausto Vera", "Igor Gomes", "Eduardo Vargas", "Alan Kardec"],
    coach: "Gabriel Milito"
  },
  "gremio": {
    starter: ["Agustín Marchesín", "João Pedro", "Rodrigo Ely", "Jemerson", "Reinaldo", "Mathías Villasanti", "Dodi", "Franco Cristaldo", "Miguel Monsalve", "Yeferson Soteldo", "Martin Braithwaite"],
    subs: ["Rafael Cabral", "Walter Kannemann", "Mayk", "Pepê", "Edenilson", "Alexander Aravena", "Diego Costa"],
    coach: "Renato Portaluppi"
  },
  "rosario central": {
    starter: ["Jorge Broun", "Emanuel Coronel", "Facundo Mallo", "Carlos Quintana", "Agustín Sández", "Franco Ibarra", "Mauricio Martínez", "Jonatan Gómez", "Maximiliano Lovera", "Jaminton Campaz", "Enzo Copetti"],
    subs: ["Axel Werner", "Juan Giménez", "Miguel Barbieri", "Kevin Ortiz", "Francesco Lo Celso", "Lautaro Giaccone", "Marco Ruben"],
    coach: "Matías Lequi"
  },
  "ldu quito": {
    starter: ["Alexander Domínguez", "José Quintero", "Ricardo Adé", "Richard Mina", "Leonel Quiñónez", "Ezequiel Piovi", "Fernando Cornejo", "Jhojan Julio", "Lisandro Alzugaray", "Luis Estupiñán", "Alex Arce"],
    subs: ["Gonzalo Valle", "Gian Allala", "Bryan Ramírez", "Marco Angulo", "Gabriel Villamíl", "Michael Estrada", "Freddy Mina"],
    coach: "Pablo Sánchez"
  },
  "bolivar": {
    starter: ["Carlos Lampe", "Yomar Rocha", "Renzo Orihuela", "José Sagredo", "Roberto Fernández", "Leonel Justiniano", "Fernando Saucedo", "Ramiro Vaca", "Patricio Rodríguez", "Bruno Sávio", "Fábio Gomes"],
    subs: ["Rubén Cordano", "Jesús Sagredo", "Ervin Vaca", "Henry Vaca", "Paulino Paz", "Lucas Chávez", "Jhon Velásquez"],
    coach: "Flavio Robatto"
  },
  "barcelona sc": {
    starter: ["Victor Mendoza", "Alex Rangel", "Nicolás Ramírez", "Luca Sosa", "Aníbal Chalá", "Leonai Souza", "Jesus Trindade", "Janner Corozo", "Eduard Bello", "Adonis Preciado", "Octavio Rivero"],
    subs: ["Javier Burrai", "Franklin Guerra", "Byron Castillo", "Dixon Arroyo", "Brian Oyola", "Allen Obando", "Djorkaeff Reasco"],
    coach: "Segundo Castillo"
  },
  "cruzeiro": {
    starter: ["Cássio", "William", "Zé Ivaldo", "João Marcelo", "Marlon", "Walace", "Lucas Romero", "Matheus Henrique", "Matheus Pereira", "Gabriel Veron", "Kaio Jorge"],
    subs: ["Anderson", "Lucas Villalba", "Wesley Gasolina", "Fabrizio Peralta", "Lucas Silva", "Álvaro Barreal", "Lautaro Díaz"],
    coach: "Fernando Diniz"
  },
  "junior": {
    starter: ["Santiago Mele", "Yeferson Moreno", "Emanuel Olivera", "Nicolás Zalazar", "Edwin Herrera", "Didier Moreno", "Víctor Cantillo", "José Enamorado", "Yimmi Chará", "Luis González", "Carlos Bacca"],
    subs: ["Jefferson Martínez", "Howell Mena", "Léider Berrío", "Andrés Colorado", "Bryan Castrillón", "Marco Pérez", "Steven Rodríguez"],
    coach: "César Farías"
  },
  "colo-colo": {
    starter: ["Brayan Cortés", "Óscar Opazo", "Alan Saldivia", "Maximiliano Falcón", "Erick Wiemberg", "Esteban Pavez", "Mauricio Isla", "Arturo Vidal", "Carlos Palacios", "Javier Correa", "Lucas Cepeda"],
    subs: ["Fernando de Paul", "Emiliano Amor", "Cristián Riquelme", "Vicente Pizarro", "Leonardo Gil", "Marcos Bolados", "Guillermo Paiva"],
    coach: "Jorge Almirón"
  },
  "talleres": {
    starter: ["Guido Herrera", "Gastón Benavídez", "Juan Carlos Portillo", "Lucas Suárez", "Miguel Navarro", "Juan Portilla", "Franco Moyano", "Rubén Botta", "Matías Galarza", "Valentín Depietri", "Bruno Barticciotto"],
    subs: ["Lautaro Morales", "Alex Vigo", "Blas Riveros", "Marcos Portillo", "Matías Esquivel", "Alejandro Martínez", "Cristian Tarragona"],
    coach: "Alexander Medina"
  }
};

const FIRST_NAMES = [
  "Gabriel", "Lucas", "Mateus", "Nicolas", "Diego", "Enzo", "Thiago", "Rodrigo", "Marcos", "Julián", 
  "Santiago", "Sebastián", "Ezequiel", "Facundo", "Claudio", "Eduardo", "Luis", "Carlos", "Juan", "Pedro", 
  "Felipe", "Bruno", "Daniel", "Gustavo", "Léo", "Fábio", "Alan", "Samuel", "Rafael", "Arturo", "Renan",
  "Ramon", "César", "Henrique", "Matias", "Miguel", "Joaquín", "Franco", "Marcelo", "Jorge", "Guilherme"
];

const LAST_NAMES = [
  "Silva", "Oliveira", "Santos", "Souza", "Lima", "Pereira", "Ferreira", "Rodrigues", "Almeida", "Gomes", 
  "Costa", "Ribeiro", "Cardoso", "Carvalho", "Fernández", "García", "Martínez", "Rodríguez", "González", 
  "López", "Gómez", "Díaz", "Álvarez", "Sánchez", "Romero", "Torres", "Arce", "Vargas", "Guzmán", "Pizarro",
  "Rios", "Bastos", "Alves", "Teixeira", "Moreira", "Vieira", "Araújo", "Romano", "Pinto", "Mendes", "Miranda"
];

export function generateGenericRoster(teamName: string, id: number): { starter: string[]; subs: string[]; coach: string } {
  const rand = new SeededRandom(id + teamName.charCodeAt(0) * 10);
  
  const starters: string[] = [];
  const usedNames = new Set<string>();

  // 1. Goalkeeper (always number 1 or 12)
  const gkFirstName = rand.pick(["Alex", "Rafael", "Weverton", "Marchesín", "Fábio", "Sergio", "Alexander", "Guido", "Cássio", "Hugo", "Everson"]);
  const gkLastName = rand.pick(LAST_NAMES);
  const gkName = `${gkFirstName} ${gkLastName}`;
  starters.push(`${gkName} (1)`);
  usedNames.add(gkName);

  // 2. Outfield players
  for (let i = 2; i <= 11; i++) {
    let attempts = 0;
    let pName = "";
    while (attempts < 10) {
      const f = rand.pick(FIRST_NAMES);
      const l = rand.pick(LAST_NAMES);
      pName = `${f} ${l}`;
      if (!usedNames.has(pName)) {
        break;
      }
      attempts++;
    }
    usedNames.add(pName);
    const num = String(rand.range(2, 39));
    starters.push(`${pName} (${num})`);
  }

  // 3. Substitutes
  const subs: string[] = [];
  for (let i = 1; i <= 7; i++) {
    let attempts = 0;
    let pName = "";
    while (attempts < 10) {
      const f = rand.pick(FIRST_NAMES);
      const l = rand.pick(LAST_NAMES);
      pName = `${f} ${l}`;
      if (!usedNames.has(pName)) {
        break;
      }
      attempts++;
    }
    usedNames.add(pName);
    const num = String(rand.range(12, 99));
    subs.push(`${pName} (${num})`);
  }

  // 4. Coach
  const coachFirst = rand.pick(["Prof.", "Técn.", "Señor", "Mr.", "Coach", "Dir."]);
  const coachLast = rand.pick(LAST_NAMES);
  const coach = `${coachFirst} ${coachLast}`;

  return {
    starter: starters,
    subs,
    coach
  };
}

export function lookupRoster(teamName: string, id: number): { starter: string[]; subs: string[]; coach: string } | null {
  if (!teamName) return null;
  const n = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  for (const k of Object.keys(ROSTERS)) {
    const keyCleaned = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    if (n.includes(keyCleaned) || keyCleaned.includes(n)) {
      return ROSTERS[k];
    }
  }
  return null;
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

  // 3. Squad and lineups
  const homeRoster = lookupRoster(jogo.time_casa, jogo.id * 2);
  const awayRoster = lookupRoster(jogo.time_fora, jogo.id * 3);

  let lineup: GameLineup | undefined = undefined;
  if (homeRoster && awayRoster) {
    lineup = {
      titular_casa: homeRoster.starter,
      titular_fora: awayRoster.starter,
      reservas_casa: homeRoster.subs,
      reservas_fora: awayRoster.subs,
      tecnico_casa: homeRoster.coach,
      tecnico_fora: awayRoster.coach
    };
  }

  // Returns fully hydrated game object structure
  return {
    ...jogo,
    status_detalhado: jogo.status_detalhado,
    estatisticas: undefined, // Removed fictitious/synthetic statistics
    escalacao: lineup as any,
    preview: undefined // Removed fictitious/predicted preview
  };
}
