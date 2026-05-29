import { Jogo, ConfigPoints } from './types';

export const INITIAL_GAMES: Jogo[] = [];

export const INITIAL_POINTS_CONFIG: ConfigPoints = {
  pontos_acertar_vencedor: 4,
  pontos_acertar_empate: 4,
  pontos_acertar_placar_exato: 6, // exact match points added with winner points = 10 total
  bonus_rodada: 5,
  bonus_sequencia: 3,
  bonus_jogos_perfeitos: 15,
  pontos_acertar_autor_gol: 7
};

export const CIDADES_ATENDIDAS = [
  "Chapecó",
  "Xanxerê",
  "Concórdia",
  "Erechim",
  "Passo Fundo",
  "Maravilha",
  "São Miguel do Oeste",
  "Pinhalzinho",
  "Palmitos",
  "Seara"
];

export interface Medalha {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
}

export const LISTA_MEDALHAS: Medalha[] = [
  {
    id: "placar_exato",
    nome: "Mestre do Placar",
    descricao: "Acertou pelo menos 1 placar exato na rodada",
    icone: "🎯",
    cor: "from-amber-400 to-yellow-600"
  },
  {
    id: "gabarito",
    nome: "Visionário",
    descricao: "Acertou todos os vencedores em um único dia",
    icone: "🔮",
    cor: "from-purple-500 to-indigo-700"
  },
  {
    id: "lider",
    nome: "No Topo do Mundo",
    descricao: "Alcançou o top 3 do ranking geral",
    icone: "🏆",
    cor: "from-emerald-400 to-teal-700"
  },
  {
    id: "fidelidade",
    nome: "Palpiteiro Fiel",
    descricao: "Fez palpites para todas as partidas disponíveis na rodada",
    icone: "✍️",
    cor: "from-sky-400 to-blue-700"
  }
];

export const REGRAS_PROG = [
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

export const PREMIACOES = [
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
