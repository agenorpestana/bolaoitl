export interface Usuario {
  id: number;
  ixc_id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  avatar?: string;
  pontos_total: number;
  acertos_exato: number;
  acertos_vencedor: number;
  erros: number;
  bloqueado: boolean;
  created_at: string;
}

export interface Jogo {
  id: number;
  api_id: string;
  time_casa: string;
  time_fora: string;
  time_casa_bandeira?: string;
  time_fora_bandeira?: string;
  data_jogo: string; // ISO String
  placar_casa: number | null;
  placar_fora: number | null;
  status: 'PENDENTE' | 'AO_VIVO' | 'ENCERRADO';
  rodada: number;
  // ENRICHMENTS
  status_detalhado?: string;
  estatisticas?: {
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
    escanteios_casa?: number;
    escanteios_fora?: number;
  };
  escalacao?: {
    titular_casa: string[];
    titular_fora: string[];
    reservas_casa: string[];
    reservas_fora: string[];
    tecnico_casa?: string;
    tecnico_fora?: string;
  };
  preview?: {
    vitoria_casa: number;
    empate: number;
    vitoria_fora: number;
    placar_estimado_casa: number;
    placar_estimado_fora: number;
  };
  real_events?: any[];
}

export interface PalpiteGolJogador {
  jogador: string;
  gols: number;
  time_lado?: 'casa' | 'fora';
}

export interface Palpite {
  id: number;
  usuario_id: number;
  jogo_id: number;
  placar_casa: number;
  placar_fora: number;
  pontos: number | null;
  palpites_gols_jogadores?: PalpiteGolJogador[];
  created_at: string;
}

export interface ConfigPoints {
  pontos_acertar_vencedor: number;
  pontos_acertar_empate: number;
  pontos_acertar_placar_exato: number;
  bonus_rodada: number;
  bonus_sequencia: number;
  bonus_jogos_perfeitos: number;
  pontos_acertar_autor_gol?: number;
}

export interface ConfigIXC {
  url: string;
  token: string;
  chave?: string;
  timeout: number;
  offline_mode: boolean; // For demonstration/fallback
}

export interface ConfigFootballApi {
  key: string;
  url: string;
  status_conexao: 'CONECTADO' | 'DESCONECTADO';
  cron_active: boolean;
  manual_override: boolean;
}

export interface AuditLog {
  id: number;
  usuario: string; // "Admin" or Customer Name
  acao: string;
  descricao: string;
  ip: string;
  data: string;
}

export interface AdminUser {
  id: number;
  email: string;
  nome: string;
  senha?: string;
  podeExcluir?: boolean;
  podeEditar?: boolean;
  podeAtivarCampeonato?: boolean;
}

export interface RuleItem {
  id: number;
  titulo: string;
  texto: string;
}

export interface PrizeItem {
  posicao: string;
  premio: string;
  detalhes: string;
}

export interface ConfigCustom {
  background_image?: string;
  ad_image?: string;
  header_title_1?: string;
  header_title_2?: string;
  header_description?: string;
  regras?: RuleItem[];
  premiacoes?: PrizeItem[];
}
