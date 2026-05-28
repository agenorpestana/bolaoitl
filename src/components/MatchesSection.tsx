import React from 'react';
import { 
  Lock, Unlock, Save, Clock, TrendingUp, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, BarChart2, Users, Layout, List, Sparkles, Trophy, Calendar, Loader2
} from 'lucide-react';
import { Jogo, Palpite } from '../types';
import { renderBandeira } from './HomePublic';
import { STATUS_LABELS } from '../utils/gameEnricher';
import { calculateStandings, groupStandings } from '../utils/standingsCalculator';


export function getFriendlyRoundName(rdNum: number | string, campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'): string {
  const num = Number(rdNum);
  if (isNaN(num)) return String(rdNum);
  if (campeonato === 'BRASILEIRAO') {
    return `Rodada ${num}`;
  }
  if (campeonato === 'LIBERTADORES') {
    switch (num) {
      case 1: return "Fase de Grupos - Rodada 1";
      case 2: return "Fase de Grupos - Rodada 2";
      case 3: return "Fase de Grupos - Rodada 3";
      case 4: return "Fase de Grupos - Rodada 4";
      case 5: return "Fase de Grupos - Rodada 5";
      case 6: return "Fase de Grupos - Rodada 6";
      case 7: return "Oitavas de Final";
      case 8: return "Quartas de Final";
      case 9: return "Semifinal";
      case 10: return "Grande Final";
      default: return `Rodada ${num}`;
    }
  }
  switch (num) {
    case 1: return "Fase de Grupos - Rodada 1";
    case 2: return "Fase de Grupos - Rodada 2";
    case 3: return "Fase de Grupos - Rodada 3";
    case 4: return "Fase de 16 avos (32 equipes)";
    case 5: return "Oitavas de Final";
    case 6: return "Quartas de Final";
    case 7: return "Semifinal";
    case 8: return "Grande Final";
    default: return `Rodada ${num}`;
  }
}

export function getGameCampeonato(jogo: Jogo): 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO' {
  if (jogo.api_id) {
    const idLower = jogo.api_id.toLowerCase();
    if (idLower.includes("libertadores")) {
      return 'LIBERTADORES';
    }
    if (idLower.includes("brasileirao")) {
      return 'BRASILEIRAO';
    }
  }
  return 'COPA_MUNDO';
}

interface MatchesSectionProps {
  jogos: Jogo[];
  palpites: Palpite[];
  token: string | null;
  onSavePalpite: (jogoId: number, placarCasa: number, placarFora: number) => Promise<boolean>;
  onCtaLogin: () => void;
  dataServidor: string;
}

export default function MatchesSection({ 
  jogos, 
  palpites, 
  token, 
  onSavePalpite, 
  onCtaLogin, 
  dataServidor 
}: MatchesSectionProps) {
  
  const hasCopaGames = React.useMemo(() => jogos.some(j => getGameCampeonato(j) === 'COPA_MUNDO'), [jogos]);
  const hasLibertadoresGames = React.useMemo(() => jogos.some(j => getGameCampeonato(j) === 'LIBERTADORES'), [jogos]);
  const hasBrasileiraoGames = React.useMemo(() => jogos.some(j => getGameCampeonato(j) === 'BRASILEIRAO'), [jogos]);

  const [selectedCampeonato, setSelectedCampeonato] = React.useState<'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'>(() => {
    if (jogos.some(j => getGameCampeonato(j) === 'COPA_MUNDO')) return 'COPA_MUNDO';
    if (jogos.some(j => getGameCampeonato(j) === 'LIBERTADORES')) return 'LIBERTADORES';
    if (jogos.some(j => getGameCampeonato(j) === 'BRASILEIRAO')) return 'BRASILEIRAO';
    return 'COPA_MUNDO';
  });

  const [activeRodada, setActiveRodada] = React.useState<number | 'TODOS' | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<'TODOS' | 'ABERTO' | 'AO_VIVO' | 'ENCERRADO'>('TODOS');
  const [viewTab, setViewTab] = React.useState<'JOGOS' | 'TABELA_CHAVEAMENTO'>('JOGOS');
  const [expandedGameIds, setExpandedGameIds] = React.useState<Set<number>>(new Set());
  const [gameActiveTab, setGameActiveTab] = React.useState<{ [key: number]: 'stats' | 'lineups' }>({});
  const [gameStatsData, setGameStatsData] = React.useState<{ [gameId: number]: any }>({});
  const [gameLineupsData, setGameLineupsData] = React.useState<{ [gameId: number]: any }>({});
  const [gameLoading, setGameLoading] = React.useState<{ [gameId: number]: { stats: boolean; lineups: boolean } }>({});
  const [gameError, setGameError] = React.useState<{ [gameId: number]: { stats: string | null; lineups: string | null } }>({});

  const fetchStatsForGame = async (gameId: number) => {
    setGameLoading(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: false, lineups: false }), stats: true } }));
    setGameError(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: null, lineups: null }), stats: null } }));
    try {
      const res = await fetch(`/api/jogos/${gameId}/estatisticas`);
      if (!res.ok) throw new Error("Erro ao carregar estatísticas.");
      const json = await res.json();
      setGameStatsData(prev => ({ ...prev, [gameId]: json.data }));
    } catch (err: any) {
      setGameError(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: null, lineups: null }), stats: err.message } }));
    } finally {
      setGameLoading(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: false, lineups: false }), stats: false } }));
    }
  };

  const fetchLineupsForGame = async (gameId: number) => {
    setGameLoading(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: false, lineups: false }), lineups: true } }));
    setGameError(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: null, lineups: null }), lineups: null } }));
    try {
      const res = await fetch(`/api/jogos/${gameId}/escalacao`);
      if (!res.ok) throw new Error("Erro ao carregar escalação.");
      const json = await res.json();
      setGameLineupsData(prev => ({ ...prev, [gameId]: json.data }));
    } catch (err: any) {
      setGameError(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: null, lineups: null }), lineups: err.message } }));
    } finally {
      setGameLoading(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { stats: false, lineups: false }), lineups: false } }));
    }
  };

  const toggleGameExpanded = (jogoId: number) => {
    setExpandedGameIds(prev => {
      const next = new Set(prev);
      if (next.has(jogoId)) {
        next.delete(jogoId);
      } else {
        next.add(jogoId);
        fetchStatsForGame(jogoId);
        fetchLineupsForGame(jogoId);
        setGameActiveTab(tabPrev => ({ ...tabPrev, [jogoId]: 'stats' }));
      }
      return next;
    });
  };
  
  const [isBlocked, setIsBlocked] = React.useState<boolean>(false);
  const [blockReason, setBlockReason] = React.useState<string>("");

  React.useEffect(() => {
    if (token) {
      fetch("/api/auth/check-block-status", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        setIsBlocked(!!data.blocked);
        setBlockReason(data.reason || "");
      })
      .catch(() => {
        setIsBlocked(false);
      });
    } else {
      setIsBlocked(false);
      setBlockReason("");
    }
  }, [token]);

  // Temporary score inputs state mapped to game id
  const [inputs, setInputs] = React.useState<{ [key: string]: { casa: string; fora: string } }>({});
  const [savingKeys, setSavingKeys] = React.useState<{ [key: string]: boolean }>({});
  
  // Map API response guesses to internal inputs state on load
  React.useEffect(() => {
    const updatedInputs: { [key: string]: { casa: string; fora: string } } = {};
    palpites.forEach(p => {
      updatedInputs[p.jogo_id] = {
        casa: String(p.placar_casa),
        fora: String(p.placar_fora)
      };
    });
    setInputs(updatedInputs);
  }, [palpites]);

  const handleInputChange = (jogoId: number, side: 'casa' | 'fora', val: string) => {
    // Only allow positive integers
    const sanitizedValue = val.replace(/\D/g, "");
    setInputs(prev => ({
      ...prev,
      [jogoId]: {
        ...prev[jogoId],
        [side]: sanitizedValue
      }
    }));
  };

  const handleSaveClick = async (jogoId: number) => {
    const vals = inputs[jogoId];
    if (!vals || vals.casa === "" || vals.fora === "") {
      alert("Por favor, preencha os placares de ambas as equipes para salvar seu palpite.");
      return;
    }

    setSavingKeys(prev => ({ ...prev, [jogoId]: true }));
    const success = await onSavePalpite(jogoId, Number(vals.casa), Number(vals.fora));
    
    // Slight simulated wait for premium UX
    setTimeout(() => {
      setSavingKeys(prev => ({ ...prev, [jogoId]: false }));
    }, 400);
  };

  // Filter games based on selected championship to avoid mixing calendars
  const championshipJogos = React.useMemo(() => {
    return jogos.filter(j => getGameCampeonato(j) === selectedCampeonato);
  }, [jogos, selectedCampeonato]);

  // Determine rounds available for this championship
  const rounds = React.useMemo(() => {
    const rds = Array.from(new Set(championshipJogos.map(g => g.rodada)));
    return rds.sort((a: number, b: number) => a - b);
  }, [championshipJogos]);

  const isPastGame = React.useCallback((jogo: Jogo): boolean => {
    const nowMs = new Date(dataServidor || new Date().toISOString()).getTime();
    const gameMs = new Date(jogo.data_jogo).getTime();
    return gameMs <= nowMs;
  }, [dataServidor]);

  const isAvailableOrLive = React.useCallback((jogo: Jogo): boolean => {
    if (jogo.status === 'AO_VIVO') return true;
    if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(jogo.status_detalhado || '')) return true;
    if (jogo.status === 'PENDENTE' && isPastGame(jogo)) {
      const kickoff = new Date(jogo.data_jogo).getTime();
      const now = new Date(dataServidor || new Date().toISOString()).getTime();
      const elapsedMins = (now - kickoff) / (1000 * 60);
      return elapsedMins < 135;
    }
    return jogo.status === 'PENDENTE' && !isPastGame(jogo);
  }, [isPastGame, dataServidor]);

  const isConcludedOrExpired = React.useCallback((jogo: Jogo): boolean => {
    if (jogo.status === 'ENCERRADO') return true;
    if (["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"].includes(jogo.status_detalhado || '')) return true;
    
    const statusDet = (jogo.status_detalhado || '').toUpperCase();
    if (["PST", "CANX", "ABD", "CANC", "SUSP"].includes(statusDet)) {
      return true;
    }

    if (isPastGame(jogo)) {
      const kickoff = new Date(jogo.data_jogo).getTime();
      const now = new Date(dataServidor || new Date().toISOString()).getTime();
      const elapsedMins = (now - kickoff) / (1000 * 60);
      
      // If past 135 minutes (2 hours 15 mins), and is not explicitly formatted live, treat as concluded/expired
      if (elapsedMins >= 135) {
        const isExplicitLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(jogo.status_detalhado || '');
        if (!isExplicitLive) {
          return true;
        }
      }
    }
    return false;
  }, [isPastGame, dataServidor]);

  // Determine current active/open round dynamically for this championship
  const isRdFinished = React.useCallback((rdNum: number) => {
    const matchesInRd = championshipJogos.filter(j => j.rodada === rdNum);
    return matchesInRd.length > 0 && matchesInRd.every(j => isConcludedOrExpired(j));
  }, [championshipJogos, isConcludedOrExpired]);

  const currentRound = React.useMemo(() => {
    return rounds.find(rd => !isRdFinished(rd)) || (rounds.length > 0 ? rounds[rounds.length - 1] : null);
  }, [rounds, isRdFinished]);

  const currentRoundIdx = React.useMemo(() => {
    return rounds.findIndex(rd => rd === currentRound);
  }, [rounds, currentRound]);

  const nextRound = React.useMemo(() => {
    return currentRoundIdx !== -1 && currentRoundIdx + 1 < rounds.length ? rounds[currentRoundIdx + 1] : null;
  }, [rounds, currentRoundIdx]);

  // Auto-switch selected championship if the current one has no games (deactivated/hidden)
  React.useEffect(() => {
    if (jogos && jogos.length > 0) {
      if (selectedCampeonato === 'COPA_MUNDO' && !hasCopaGames) {
        if (hasLibertadoresGames) setSelectedCampeonato('LIBERTADORES');
        else if (hasBrasileiraoGames) setSelectedCampeonato('BRASILEIRAO');
      } else if (selectedCampeonato === 'LIBERTADORES' && !hasLibertadoresGames) {
        if (hasCopaGames) setSelectedCampeonato('COPA_MUNDO');
        else if (hasBrasileiraoGames) setSelectedCampeonato('BRASILEIRAO');
      } else if (selectedCampeonato === 'BRASILEIRAO' && !hasBrasileiraoGames) {
        if (hasCopaGames) setSelectedCampeonato('COPA_MUNDO');
        else if (hasLibertadoresGames) setSelectedCampeonato('LIBERTADORES');
      }
    }
  }, [jogos, hasCopaGames, hasLibertadoresGames, hasBrasileiraoGames, selectedCampeonato]);

  // Synchronize active rodada when championship or currentRound changes
  React.useEffect(() => {
    if (currentRound !== undefined && currentRound !== null) {
      setActiveRodada(currentRound);
    } else {
      setActiveRodada(null);
    }
  }, [selectedCampeonato, currentRound]);

  // Time-locked assessment
  const isMatchLocked = (jogo: Jogo): boolean => {
    if (jogo.status !== 'PENDENTE') return true;
    
    // Only matches belonging to the current active round are open for guesses!
    if (jogo.rodada !== currentRound) return true;

    const nowMs = new Date(dataServidor || new Date().toISOString()).getTime();
    const gameMs = new Date(jogo.data_jogo).getTime();
    const lockMarginMs = 1 * 60 * 60 * 1000; // 1 Hour
    return (gameMs - nowMs) < lockMarginMs;
  };

  const getLockTimeLeftStr = (jogo: Jogo): string => {
    if (jogo.rodada !== currentRound) {
      if (currentRound && jogo.rodada > currentRound) {
        return "Disponível em breve";
      }
      return "Rodada encerrada";
    }

    const nowMs = new Date(dataServidor || new Date().toISOString()).getTime();
    const gameMs = new Date(jogo.data_jogo).getTime();
    const lockMarginMs = 1 * 60 * 60 * 1050; // lock margin
    const timeLeftMs = (gameMs - lockMarginMs) - nowMs;

    if (timeLeftMs <= 0) return "Fechado";

    const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const mins = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours/24)} dias restantes`;
    }
    return `${hours}h ${mins}m restantes`;
  };

  const isGameActuallyLive = React.useCallback((jogo: Jogo): boolean => {
    if (jogo.status === 'AO_VIVO') {
      return !isConcludedOrExpired(jogo);
    }
    if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(jogo.status_detalhado || '')) return true;
    if (jogo.status === 'PENDENTE' && isPastGame(jogo)) {
      return !isConcludedOrExpired(jogo);
    }
    return false;
  }, [isPastGame, isConcludedOrExpired]);

  // Filtered games list calculation
  const filteredGames = React.useMemo(() => {
    return championshipJogos.filter(jogo => {
      const matchesRound = activeRodada === 'TODOS' || activeRodada === null || jogo.rodada === activeRodada;
      
      let matchesStatus = true;
      if (filterStatus === 'ABERTO') {
        matchesStatus = jogo.status === 'PENDENTE' && !isMatchLocked(jogo);
      } else if (filterStatus === 'AO_VIVO') {
        matchesStatus = isGameActuallyLive(jogo);
      } else if (filterStatus === 'ENCERRADO') {
        matchesStatus = isConcludedOrExpired(jogo);
      } else if (filterStatus === 'TODOS') {
        // Show everything: live games, upcoming, and finished ones of active round
        matchesStatus = true;
      }

      return matchesRound && matchesStatus;
    });
  }, [championshipJogos, activeRodada, filterStatus, dataServidor, currentRound, isConcludedOrExpired, isGameActuallyLive]);

  // Split into live matches, upcoming matches, and finished matches
  const liveGamesList = React.useMemo(() => {
    return filteredGames.filter(jogo => isGameActuallyLive(jogo));
  }, [filteredGames, isGameActuallyLive]);

  const upcomingGamesList = React.useMemo(() => {
    return filteredGames.filter(jogo => 
      jogo.status === 'PENDENTE' && 
      !isPastGame(jogo) && 
      !isGameActuallyLive(jogo)
    );
  }, [filteredGames, isPastGame, isGameActuallyLive]);

  const concludedGames = React.useMemo(() => {
    return filteredGames.filter(jogo => isConcludedOrExpired(jogo));
  }, [filteredGames, isConcludedOrExpired]);

  const renderMatchCard = (jogo: Jogo) => {
    const isReadonly = isMatchLocked(jogo);
    const userBet = palpites.find(p => p.jogo_id === jogo.id);
    const inputVal = inputs[jogo.id] || { casa: "", fora: "" };
    const isSaving = savingKeys[jogo.id] || false;
    
    // Check points won if completed
    const pointsWon = userBet ? userBet.pontos : null;

    // Check canceled/suspended/postponed
    const isCanceled = jogo.status_detalhado === 'CANC';
    const isSuspended = jogo.status_detalhado === 'SUSP';
    const isPostponed = jogo.status_detalhado === 'PST';

    const isGameLive = isGameActuallyLive(jogo);

    return (
      <div 
        key={jogo.id} 
        className={`bg-slate-900/70 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition duration-200 ${
          isGameLive 
            ? 'border-red-900/40 shadow-red-950/5' 
            : isReadonly 
              ? 'border-slate-800/80 hover:border-slate-800' 
              : 'border-brand-blue-light/40 hover:border-brand-blue-accent/60 shadow-brand-blue-dark/5'
        }`}
      >
        
        {/* Game Top info bar */}
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-0 sm:items-center justify-between text-[10px] font-bold uppercase">
          <div className="flex items-center gap-1 text-slate-400 font-sans">
            <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono">
              {getFriendlyRoundName(jogo.rodada, getGameCampeonato(jogo))}
            </span>
            <span>•</span>
            <span className="font-mono">
              {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {isGameLive ? (
            <span className="self-start sm:self-auto flex items-center gap-1.5 bg-red-600 border border-red-500 text-white px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wide shadow-md shadow-red-900/30 font-sans">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-100 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              AO VIVO • {STATUS_LABELS[jogo.status_detalhado || "1H"] || jogo.status_detalhado || "EM ANDAMENTO"}
            </span>
          ) : isCanceled ? (
            <span className="self-start sm:self-auto bg-red-950/40 border border-red-550/40 text-red-400 px-2.5 py-1 rounded text-[10px] font-bold font-sans">
              Partida Cancelada
            </span>
          ) : isSuspended ? (
            <span className="self-start sm:self-auto bg-yellow-950/40 border border-yellow-500/40 text-yellow-400 px-2.5 py-1 rounded text-[10px] font-bold font-sans">
              Partida Suspensa
            </span>
          ) : isPostponed ? (
            <span className="self-start sm:self-auto bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded text-[10px] font-bold font-sans">
              Partida Adiada
            </span>
          ) : jogo.status === 'ENCERRADO' ? (
            <span className="self-start sm:self-auto bg-slate-800/80 border border-slate-700 text-slate-200 px-2.5 py-1 rounded text-[10px] font-black tracking-wide font-sans">
              {STATUS_LABELS[jogo.status_detalhado || "FT"] || jogo.status_detalhado || "FINALIZADO"}
            </span>
          ) : isReadonly ? (
            <span className="self-start sm:self-auto text-yellow-500 bg-yellow-950/30 border border-yellow-950/60 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
              <Lock className="h-3 w-3" /> {getLockTimeLeftStr(jogo)}
            </span>
          ) : (
            <span className="self-start sm:self-auto text-brand-blue-vibrant bg-brand-blue-dark/85 border border-brand-blue-accent/30 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
              <Unlock className="h-3 w-3" /> Aberto • {getLockTimeLeftStr(jogo)}
            </span>
          )}
        </div>

        {/* Main Matchup Arena */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 py-2">
          
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 space-y-2 text-center min-w-[70px]">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
              {renderBandeira(jogo.time_casa_bandeira, "w-8 h-8 sm:w-10 sm:h-10 shadow-sm", "text-2xl sm:text-3xl")}
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-200 mt-1 max-w-[70px] xs:max-w-[100px] sm:max-w-[120px] truncate leading-tight">
              {jogo.time_casa}
            </span>
          </div>

          {/* Real Scoreboard (for Live/Ended games) or Prediction Input fields */}
          {(isGameLive || jogo.status === 'ENCERRADO') ? (
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/90 px-5 sm:px-6 py-2.5 rounded-2xl border border-slate-800/80 shadow-inner select-none">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono text-white tracking-tight leading-none min-w-[1.2ch] text-center drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                {jogo.placar_casa ?? 0}
              </span>
              <span className={`text-[10px] font-black font-sans uppercase px-2 py-0.5 rounded-md tracking-wider ${
                isGameLive 
                  ? 'bg-red-600 text-white animate-pulse border border-red-500' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {isGameLive ? 'AO VIVO' : 'FIM'}
              </span>
              <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono text-white tracking-tight leading-none min-w-[1.2ch] text-center drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                {jogo.placar_fora ?? 0}
              </span>
            </div>
          ) : (
            /* Guess Input grid */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="text"
                maxLength={2}
                disabled={!token || isReadonly || isBlocked || isCanceled}
                placeholder="-"
                value={inputVal.casa}
                onChange={(e) => handleInputChange(jogo.id, 'casa', e.target.value)}
                className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 text-center text-base sm:text-lg md:text-xl font-black font-mono rounded-xl border transition ${
                  !token 
                    ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : (isReadonly || isBlocked || isCanceled)
                      ? 'bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-950 border-brand-blue-light text-brand-blue-vibrant focus:border-brand-blue-accent focus:ring-1 focus:ring-brand-blue-accent'
                }`}
              />

              <span className="text-slate-600 font-mono text-xs sm:text-sm">x</span>

              <input
                type="text"
                maxLength={2}
                disabled={!token || isReadonly || isBlocked || isCanceled}
                placeholder="-"
                value={inputVal.fora}
                onChange={(e) => handleInputChange(jogo.id, 'fora', e.target.value)}
                className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 text-center text-base sm:text-lg md:text-xl font-black font-mono rounded-xl border transition ${
                  !token 
                    ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : (isReadonly || isBlocked || isCanceled)
                      ? 'bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-950 border-brand-blue-light text-brand-blue-vibrant focus:border-brand-blue-accent focus:ring-1 focus:ring-brand-blue-accent'
                }`}
              />
            </div>
          )}

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 space-y-2 text-center min-w-[70px]">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
              {renderBandeira(jogo.time_fora_bandeira, "w-8 h-8 sm:w-10 sm:h-10 shadow-sm", "text-2xl sm:text-3xl")}
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-200 mt-1 max-w-[70px] xs:max-w-[100px] sm:max-w-[120px] truncate leading-tight font-sans">
              {jogo.time_fora}
            </span>
          </div>

        </div>

        {/* Input action panels */}
        <div className="pt-2 border-t border-slate-900 flex flex-col xs:flex-row gap-2 xs:gap-0 justify-between items-start xs:items-center text-xs">
          <div>
            {token ? (
              isBlocked ? (
                <span className="text-[10px] text-red-500 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-950/40">Palpites suspensos</span>
              ) : isCanceled ? (
                <span className="text-[10px] text-red-400 font-bold bg-red-955/20 px-2 py-0.5 rounded border border-red-900/40">Jogo cancelado</span>
              ) : userBet ? (
                <div className="text-[11px] text-brand-blue-vibrant font-semibold flex items-center gap-1 font-sans">
                  <CheckCircle className="h-3.5 w-3.5 inline text-brand-blue-vibrant" /> Palpitado: {userBet.placar_casa}x{userBet.placar_fora}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium">Você ainda não palpitou</span>
              )
            ) : (
              <span className="text-[10px] text-slate-500 font-medium font-sans">Faça login para apostar</span>
            )}
          </div>

          {/* Guess action button */}
          {token && !isReadonly && !isBlocked && !isCanceled && (
            <button
              id={`btn-save-palpite-${jogo.id}`}
              onClick={() => handleSaveClick(jogo.id)}
              disabled={isSaving}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-blue-accent to-brand-blue hover:scale-105 hover:shadow-md hover:shadow-brand-blue-accent/10 text-white font-bold rounded-lg transition transform active:scale-95 text-[11px] w-full xs:w-auto justify-center font-sans"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          )}

          {/* Guess badge points feedback if completed or live matches */}
          {(jogo.status === 'ENCERRADO' || isGameLive) && userBet && (
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[11px] text-slate-400">
                {isGameLive ? 'Pontos parciais:' : 'Pontuação:'}
              </span>
              <span className={`px-2.5 py-0.5 rounded font-mono font-extrabold text-[11px] ${
                pointsWon && pointsWon > 5 
                    ? 'bg-yellow-950/80 border border-yellow-700/40 text-yellow-500 shadow-md animate-pulse' 
                    : pointsWon && pointsWon > 0
                      ? 'bg-brand-blue-dark/80 border border-brand-blue-accent/30 text-brand-blue-vibrant'
                      : 'bg-slate-950/80 border border-slate-800/60 text-slate-500'
              }`}>
                +{pointsWon || 0} Pts {isGameLive ? '🔴' : ''}
              </span>
            </div>
          )}

          {jogo.status === 'ENCERRADO' && !userBet && (
            <span className="text-[10px] text-red-500/80 font-bold bg-red-950/10 border border-red-950/30 px-1.5 py-0.5 rounded font-sans">
              Sem palpite (-0 Pts)
            </span>
          )}
          {jogo.status === 'AO_VIVO' && !userBet && (
            <span className="text-[10px] text-yellow-500/80 font-bold bg-yellow-950/10 border border-yellow-950/30 px-1.5 py-0.5 rounded animate-pulse font-sans">
              Sem palpite (Parcial)
            </span>
          )}
        </div>

        {/* Details accordion toggle */}
        <div className="pt-2 border-t border-slate-950/80 flex justify-center">
          <button
            onClick={() => toggleGameExpanded(jogo.id)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-brand-blue-vibrant transition py-1.5 px-3.5 rounded bg-slate-950/60 border border-slate-900 active:scale-95 font-sans"
          >
            {expandedGameIds.has(jogo.id) ? (
              <>
                <ChevronUp className="h-3 w-3 text-brand-blue-accent animate-bounce" />
                Ocultar Informações
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 text-slate-500" />
                Estatísticas e Escalação
              </>
            )}
          </button>
        </div>
        {expandedGameIds.has(jogo.id) && (
          <div className="pt-3 border-t border-slate-950/85 space-y-3 animate-fadeIn text-[11px] font-sans">
            {/* Tab buttons */}
            <div className="flex border-b border-slate-900 font-sans font-black text-[10px] uppercase tracking-wider">
              <button
                role="tab"
                onClick={() => setGameActiveTab(prev => ({ ...prev, [jogo.id]: 'stats' }))}
                className={`flex-1 py-2 text-center transition-all border-b-2 font-black ${
                  (gameActiveTab[jogo.id] || 'stats') === 'stats'
                    ? 'border-brand-blue-accent text-brand-blue-vibrant bg-brand-blue/5'
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📊 Estatísticas
              </button>
              <button
                role="tab"
                onClick={() => setGameActiveTab(prev => ({ ...prev, [jogo.id]: 'lineups' }))}
                className={`flex-1 py-2 text-center transition-all border-b-2 font-black ${
                  (gameActiveTab[jogo.id] || 'stats') === 'lineups'
                    ? 'border-brand-blue-accent text-brand-blue-vibrant bg-brand-blue/5'
                    : 'border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                📋 Escalação
              </button>
            </div>

            {/* Tab Content Panes */}
            {(gameActiveTab[jogo.id] || 'stats') === 'stats' ? (
              <div className="bg-slate-950/40 p-3 sm:p-4 rounded-xl border border-slate-900/60 space-y-3.5">
                {gameLoading[jogo.id]?.stats ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-blue-accent" />
                    <span className="text-[10px] font-bold">Carregando estatísticas...</span>
                  </div>
                ) : gameError[jogo.id]?.stats ? (
                  <div className="text-center py-4 text-red-500 font-bold">
                    {gameError[jogo.id]?.stats}
                    <button
                      onClick={() => fetchStatsForGame(jogo.id)}
                      className="block mx-auto mt-2 text-[9px] uppercase px-2 py-1 bg-slate-900 rounded border border-slate-800 text-slate-300 hover:text-slate-100"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : gameStatsData[jogo.id] && gameStatsData[jogo.id].length > 0 ? (
                  <div className="space-y-3">
                    {gameStatsData[jogo.id].map((item: any, idx: number) => {
                      const valHome = parseFloat(String(item.casa).replace('%', '')) || 0;
                      const valAway = parseFloat(String(item.fora).replace('%', '')) || 0;
                      const total = valHome + valAway;
                      const percentHome = total > 0 ? (valHome / total) * 100 : 50;
                      const percentAway = total > 0 ? (valAway / total) * 100 : 50;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                            <span className="w-10 text-left font-mono font-black text-slate-200">{item.casa}</span>
                            <span className="text-slate-400 text-[9px] uppercase tracking-wide font-black truncate max-w-[150px] text-center">{item.name}</span>
                            <span className="w-10 text-right font-mono font-black text-slate-200">{item.fora}</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-900 overflow-hidden flex border border-slate-950/40">
                            <div 
                              style={{ width: `${percentHome}%` }} 
                              className="bg-brand-blue-accent rounded-l-full" 
                            />
                            <div 
                              style={{ width: `${percentAway}%` }} 
                              className="bg-amber-500 rounded-r-full" 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-[10px]">
                    Nenhuma estatística disponível para esta partida.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/40 p-3 sm:p-4 rounded-xl border border-slate-900/60">
                {gameLoading[jogo.id]?.lineups ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-blue-accent" />
                    <span className="text-[10px] font-bold">Carregando escalações...</span>
                  </div>
                ) : gameError[jogo.id]?.lineups ? (
                  <div className="text-center py-4 text-red-500 font-bold">
                    {gameError[jogo.id]?.lineups}
                    <button
                      onClick={() => fetchLineupsForGame(jogo.id)}
                      className="block mx-auto mt-2 text-[9px] uppercase px-2 py-1 bg-slate-900 rounded border border-slate-800 text-slate-300 hover:text-slate-100"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : gameLineupsData[jogo.id] ? (
                  <div className="space-y-4">
                    {/* Tactical formation header if available */}
                    {(gameLineupsData[jogo.id].format_casa || gameLineupsData[jogo.id].format_fora) && (
                      <div className="flex justify-between items-center bg-slate-900/20 border border-slate-900/60 rounded-lg px-3 py-1.5 font-sans text-[9px] font-bold text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[8px] uppercase font-black">Esquema:</span>
                          <span className="font-mono bg-slate-900 px-1 py-0.2 rounded font-black text-brand-blue-accent">{gameLineupsData[jogo.id].format_casa || "N/D"}</span>
                        </div>
                        <span className="text-[8px] uppercase font-black tracking-widest text-slate-600">Alinhamento</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[8px] uppercase font-black">Esquema:</span>
                          <span className="font-mono bg-slate-900 px-1 py-0.2 rounded font-black text-amber-500">{gameLineupsData[jogo.id].format_fora || "N/D"}</span>
                        </div>
                      </div>
                    )}

                    {/* Titulares list side-by-side */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Home XI */}
                      <div className="space-y-2">
                        <div className="font-black text-[9px] text-brand-blue-vibrant uppercase border-b border-slate-900/40 pb-1 flex justify-between">
                          <span className="truncate max-w-[85px]">{jogo.time_casa}</span>
                          <span className="text-[7.5px] font-sans font-black text-slate-600 shrink-0 uppercase tracking-wider">CASA</span>
                        </div>
                        {gameLineupsData[jogo.id].titular_casa && gameLineupsData[jogo.id].titular_casa.length > 0 ? (
                          <ul className="space-y-1 text-[10px] text-slate-300">
                            {gameLineupsData[jogo.id].titular_casa.map((p: string, pIdx: number) => {
                              const numMatch = p.match(/(.*?)\s*\((\d+)\)\s*-\s*(\w+)/) || p.match(/(.*?)\s*\((\d+)\)/);
                              if (numMatch) {
                                const name = numMatch[1].trim();
                                const number = numMatch[2];
                                const pos = numMatch[3] ? numMatch[3].toUpperCase() : null;
                                return (
                                  <li key={pIdx} className="flex items-center gap-1.5 truncate select-text py-0.5 hover:bg-slate-900/10 rounded">
                                    <span className="w-4 h-4 flex items-center justify-center font-mono font-bold text-[8.5px] bg-brand-blue/20 text-brand-blue-vibrant border border-brand-blue-accent/10 rounded-full shrink-0">{number}</span>
                                    <span className="truncate text-slate-300 font-medium">{name}</span>
                                    {pos && <span className="text-[7.5px] text-slate-500 font-mono font-black ml-auto bg-slate-900/40 px-1 rounded shrink-0">{pos}</span>}
                                  </li>
                                );
                              }
                              return (
                                <li key={pIdx} className="truncate select-text pl-1.5 border-l border-brand-blue/30 py-0.5 text-slate-300 font-medium">{p}</li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="text-[9.5px] text-slate-600 italic">Nenhum escalado</div>
                        )}
                        
                        {gameLineupsData[jogo.id].tecnico_casa && (
                          <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-tight mt-1.5 truncate bg-slate-900/10 p-1 rounded border border-slate-900/40">
                            Técnico: <span className="text-slate-350 font-medium font-sans">{gameLineupsData[jogo.id].tecnico_casa}</span>
                          </div>
                        )}
                      </div>

                      {/* Away XI */}
                      <div className="space-y-2 border-l border-slate-900/40 pl-3">
                        <div className="font-black text-[9px] text-amber-500 uppercase border-b border-slate-900/40 pb-1 flex justify-between">
                          <span className="truncate max-w-[85px]">{jogo.time_fora}</span>
                          <span className="text-[7.5px] font-sans font-black text-slate-600 shrink-0 uppercase tracking-wider">FORA</span>
                        </div>
                        {gameLineupsData[jogo.id].titular_fora && gameLineupsData[jogo.id].titular_fora.length > 0 ? (
                          <ul className="space-y-1 text-[10px] text-slate-300">
                            {gameLineupsData[jogo.id].titular_fora.map((p: string, pIdx: number) => {
                              const numMatch = p.match(/(.*?)\s*\((\d+)\)\s*-\s*(\w+)/) || p.match(/(.*?)\s*\((\d+)\)/);
                              if (numMatch) {
                                const name = numMatch[1].trim();
                                const number = numMatch[2];
                                const pos = numMatch[3] ? numMatch[3].toUpperCase() : null;
                                return (
                                  <li key={pIdx} className="flex items-center gap-1.5 truncate select-text py-0.5 hover:bg-slate-900/10 rounded">
                                    <span className="w-4 h-4 flex items-center justify-center font-mono font-bold text-[8.5px] bg-amber-950/20 text-amber-500 border border-amber-600/10 rounded-full shrink-0">{number}</span>
                                    <span className="truncate text-slate-300 font-medium">{name}</span>
                                    {pos && <span className="text-[7.5px] text-slate-500 font-mono font-black ml-auto bg-slate-900/40 px-1 rounded shrink-0">{pos}</span>}
                                  </li>
                                );
                              }
                              return (
                                <li key={pIdx} className="truncate select-text pl-1.5 border-l border-amber-500/30 py-0.5 text-slate-300 font-medium">{p}</li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="text-[9.5px] text-slate-600 italic">Nenhum escalado</div>
                        )}

                        {gameLineupsData[jogo.id].tecnico_fora && (
                          <div className="text-[8.5px] font-bold text-slate-500 uppercase tracking-tight mt-1.5 truncate bg-slate-900/10 p-1 rounded border border-slate-900/40">
                            Técnico: <span className="text-slate-350 font-medium font-sans">{gameLineupsData[jogo.id].tecnico_fora}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Substitutes squad drawer */}
                    {((gameLineupsData[jogo.id].reservas_casa && gameLineupsData[jogo.id].reservas_casa.length > 0) || 
                      (gameLineupsData[jogo.id].reservas_fora && gameLineupsData[jogo.id].reservas_fora.length > 0)) && (
                      <div className="pt-2.5 border-t border-slate-900 flex flex-col gap-1 text-[8.5px] text-slate-500 font-sans">
                        <div className="font-extrabold uppercase text-slate-400 tracking-wide">Suplementação técnica (Reservas):</div>
                        <div className="grid grid-cols-2 gap-3 leading-relaxed">
                          <div className="text-[9px] text-slate-400 italic">
                            <div className="font-black text-slate-500 not-italic text-[8.5px] uppercase mb-0.5 truncate">{jogo.time_casa}</div>
                            <span className="line-clamp-2 font-sans" title={gameLineupsData[jogo.id].reservas_casa?.join(", ")}>
                              {gameLineupsData[jogo.id].reservas_casa?.join(", ") || "Nenhum reserva listado"}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-400 italic border-l border-slate-900/60 pl-3">
                            <div className="font-black text-slate-500 not-italic text-[8.5px] uppercase mb-0.5 truncate">{jogo.time_fora}</div>
                            <span className="line-clamp-2 font-sans" title={gameLineupsData[jogo.id].reservas_fora?.join(", ")}>
                              {gameLineupsData[jogo.id].reservas_fora?.join(", ") || "Nenhum reserva listado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-[10px]">
                    Nenhuma escalação disponível para esta partida.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  const currentChampionshipGames = React.useMemo(() => {
    return jogos.filter(j => getGameCampeonato(j) === selectedCampeonato);
  }, [jogos, selectedCampeonato]);

  const standings = React.useMemo(() => {
    return calculateStandings(currentChampionshipGames);
  }, [currentChampionshipGames]);

  const groupsData = React.useMemo(() => {
    return groupStandings(standings);
  }, [standings]);

  const playOffsByRound = React.useMemo(() => {
    if (selectedCampeonato === 'LIBERTADORES') {
      return {
        7: currentChampionshipGames.filter(j => j.rodada === 7).sort((a,b) => a.id - b.id), // Oitavas (8 games)
        8: currentChampionshipGames.filter(j => j.rodada === 8).sort((a,b) => a.id - b.id), // Quartas (4 games)
        9: currentChampionshipGames.filter(j => j.rodada === 9).sort((a,b) => a.id - b.id), // Semifinais (2 games)
        10: currentChampionshipGames.filter(j => j.rodada === 10).sort((a,b) => a.id - b.id), // Finals (1 game)
      };
    }
    return {
      5: currentChampionshipGames.filter(j => j.rodada === 5).sort((a,b) => a.id - b.id), // Oitavas (8 games)
      6: currentChampionshipGames.filter(j => j.rodada === 6).sort((a,b) => a.id - b.id), // Quartas (4 games)
      7: currentChampionshipGames.filter(j => j.rodada === 7).sort((a,b) => a.id - b.id), // Semifinais (2 games)
      8: currentChampionshipGames.filter(j => j.rodada === 8).sort((a,b) => a.id - b.id), // Finals (1 game)
    };
  }, [currentChampionshipGames, selectedCampeonato]);

  const renderBracketMatchBox = (jogo: Jogo | undefined, label: string) => {
    if (!jogo) {
      return (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-center text-[10px] text-slate-600 font-sans italic">
          <span className="block opacity-60 font-bold uppercase tracking-wider">{label}</span>
          <span>A definir</span>
        </div>
      );
    }

    const isHomeWinner = jogo.status === 'ENCERRADO' && jogo.placar_casa !== null && jogo.placar_fora !== null && jogo.placar_casa > jogo.placar_fora;
    const isAwayWinner = jogo.status === 'ENCERRADO' && jogo.placar_casa !== null && jogo.placar_fora !== null && jogo.placar_fora > jogo.placar_casa;

    return (
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5 font-sans relative hover:border-slate-700 transition">
        <span className="block text-[8px] font-black uppercase tracking-wider text-slate-500 text-center border-b border-slate-950/40 pb-1 font-mono">
          {jogo.status === 'AO_VIVO' ? "🔴 Ao Vivo" : juegoHasStatusCanceled(jogo) ? "Cancelado" : jogo.status === 'ENCERRADO' ? "Finalizado" : "Pendente"}
        </span>
        <div className="space-y-1 text-[10px]">
          {/* Home Team */}
          <div className={`flex items-center justify-between ${isAwayWinner ? 'opacity-40' : 'font-bold'}`}>
            <div className="flex items-center gap-1.5 truncate max-w-[120px]">
              {renderBandeira(jogo.time_casa_bandeira, "w-4 h-4 rounded shadow-xs", "text-sm")}
              <span className="truncate">{jogo.time_casa}</span>
            </div>
            <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[9px]">
              {jogo.placar_casa !== null ? jogo.placar_casa : "-"}
            </span>
          </div>
          
          {/* Away Team */}
          <div className={`flex items-center justify-between ${isHomeWinner ? 'opacity-40' : 'font-bold'}`}>
            <div className="flex items-center gap-1.5 truncate max-w-[120px]">
              {renderBandeira(jogo.time_fora_bandeira, "w-4 h-4 rounded shadow-xs", "text-sm")}
              <span className="truncate">{jogo.time_fora}</span>
            </div>
            <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[9px]">
              {jogo.placar_fora !== null ? jogo.placar_fora : "-"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  function juegoHasStatusCanceled(j: Jogo) {
    return j.status_detalhado === 'CANC' || j.status_detalhado === 'SUSP';
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Banner info */}
      <div className="bg-slate-900 border border-emerald-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-sans">Painel de Palpites</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Importante: Palpites são bloqueados automaticamente <span className="text-yellow-500 font-bold">1 hora antes</span> do pontapé inicial. Apenas a rodada atual está aberta para palpites!
          </p>
        </div>
        
        {!token && (
          <button
            id="match-auth-cta"
            onClick={onCtaLogin}
            className="shrink-0 text-slate-950 bg-gradient-to-r from-emerald-400 to-yellow-500 hover:scale-105 active:scale-95 text-xs font-black uppercase px-4 py-2.5 rounded-lg shadow transition"
          >
            Faça Login para Palpitar
          </button>
        )}
      </div>

      {/* Payment Blocked Warning Banner */}
      {isBlocked && (
        <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-red-200 animate-fadeIn">
          <div className="h-8 w-8 rounded-lg bg-red-950 border border-red-850 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
          </div>
          <div>
            <b className="text-red-400 uppercase tracking-wider block sm:inline">Palpites Bloqueados por Pendência Financeira:</b> {blockReason || "Seu contrato está bloqueado por falta de pagamento. Regularize suas mensalidades no painel do Provedor para voltar a palpitar!"}
          </div>
        </div>
      )}

      {/* Warning current active round explanation banner */}
      {currentRound && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-350">
          <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0">
            <Unlock className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <b>Mecânica Automatizada das Rodadas:</b> Atualmente estamos na <span className="text-emerald-400 font-black">{getFriendlyRoundName(currentRound, selectedCampeonato)} (Atual)</span>. Palpites estão autorizados unicamente para esta rodada. As partidas das próximas rodadas serão liberadas para palpite de forma 100% dinâmica assim que findar o último confronto da rodada vigente!
          </div>
        </div>
      )}

      {/* Championship Selector Tabs */}
      <div className="flex bg-slate-900/40 p-1.5 rounded-xl border border-slate-900 w-full md:w-fit gap-1 font-sans">
        {hasCopaGames && (
          <button
            onClick={() => setSelectedCampeonato('COPA_MUNDO')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
              selectedCampeonato === 'COPA_MUNDO'
                ? 'bg-gradient-to-r from-brand-blue-accent to-brand-blue text-white font-black shadow-md shadow-brand-blue-accent/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            🏆 Copa do Mundo 2026
          </button>
        )}
        {hasLibertadoresGames && (
          <button
            onClick={() => setSelectedCampeonato('LIBERTADORES')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
              selectedCampeonato === 'LIBERTADORES'
                ? 'bg-gradient-to-r from-brand-blue-accent to-brand-blue text-white font-black shadow-md shadow-brand-blue-accent/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            🛰️ Copa Libertadores
          </button>
        )}
        {hasBrasileiraoGames && (
          <button
            onClick={() => setSelectedCampeonato('BRASILEIRAO')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
              selectedCampeonato === 'BRASILEIRAO'
                ? 'bg-gradient-to-r from-brand-blue-accent to-brand-blue text-white font-black shadow-md shadow-brand-blue-accent/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            🇧🇷 Brasileirão Série A
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-900 gap-6 text-xs font-black uppercase tracking-wider font-sans pt-2">
        <button
          onClick={() => setViewTab('JOGOS')}
          className={`pb-3 flex items-center gap-2 transition relative ${
            viewTab === 'JOGOS'
              ? 'text-brand-blue-vibrant font-black'
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <List className="h-4 w-4" />
          <span>Partidas & Palpites</span>
          {viewTab === 'JOGOS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue-vibrant" />
          )}
        </button>
        <button
          onClick={() => setViewTab('TABELA_CHAVEAMENTO')}
          className={`pb-3 flex items-center gap-2 transition relative ${
            viewTab === 'TABELA_CHAVEAMENTO'
              ? 'text-brand-blue-vibrant font-black'
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>{selectedCampeonato === 'BRASILEIRAO' ? 'Classificação / Tabela' : 'Standings e Chaveamento'}</span>
          {viewTab === 'TABELA_CHAVEAMENTO' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue-vibrant" />
          )}
        </button>
      </div>

      {viewTab === 'JOGOS' ? (
        <>
          {/* Filter Options */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 animate-fadeIn">
            
            {/* Rodadas select tab */}
            <div className="flex flex-wrap gap-1.5 font-sans">
              {rounds.map((rd) => {
                // Determine label suffix dynamically as requested
                let suffix = "";
                if (rd === currentRound) {
                  suffix = " (Atual)";
                } else if (isRdFinished(rd)) {
                  suffix = " (Encerrada)";
                } else if (rd === nextRound) {
                  suffix = " (Próxima)";
                }

                return (
                  <button
                    key={rd}
                    id={`btn-filter-rodada-${rd}`}
                    onClick={() => setActiveRodada(rd)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      activeRodada === rd
                        ? 'bg-brand-blue-dark/80 text-brand-blue-vibrant border border-brand-blue-accent/40'
                        : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {getFriendlyRoundName(rd, selectedCampeonato)}{suffix}
                  </button>
                );
              })}

              <button
                id="btn-filter-rodada-all"
                onClick={() => setActiveRodada('TODOS')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeRodada === 'TODOS'
                    ? 'bg-brand-blue-dark/80 text-brand-blue-vibrant border border-brand-blue-accent/40'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas as Partidas
              </button>
            </div>

            {/* Game status filter toggle switches */}
            <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800/40 text-xs font-sans">
              {[
                { id: 'TODOS', label: 'Tudo' },
                { id: 'ABERTO', label: 'Disponíveis' },
                { id: 'AO_VIVO', label: 'Ao Vivo' },
                { id: 'ENCERRADO', label: 'Encerrados' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilterStatus(item.id as any)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterStatus === item.id
                      ? 'bg-brand-blue-dark/85 text-brand-blue-vibrant font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>

          {/* Main Fixtures Deck - Safely Split Finished and Available Games as requested */}
          {filteredGames.length > 0 ? (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Section: Live Games */}
              {liveGamesList.length > 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-red-500 tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75 animate-duration-1000"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span>Partidas Ao Vivo (Em Andamento)</span>
                    <span className="flex-1 h-px bg-red-950/35 ml-2" />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    {liveGamesList.map((jogo) => renderMatchCard(jogo))}
                  </div>
                </div>
              )}

              {/* Section: Open & Upcoming Games */}
              {upcomingGamesList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                    <Unlock className="h-3.5 w-3.5 text-brand-blue-accent" />
                    <span>Abertos para Palpites e Próximos Jogos</span>
                    <span className="flex-1 h-px bg-slate-800/70 ml-2" />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    {upcomingGamesList.map((jogo) => renderMatchCard(jogo))}
                  </div>
                </div>
              )}

              {/* Section: Completed Games */}
              {concludedGames.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                    <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                    <span>Resultados Consolidados (Encerrados)</span>
                    <span className="flex-1 h-px bg-slate-800/70 ml-2" />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 opacity-90 hover:opacity-100 transition duration-150">
                    {concludedGames.map((jogo) => renderMatchCard(jogo))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-900/30 border border-dashed border-slate-800 py-16 text-center space-y-2 rounded-2xl animate-fadeIn">
              <AlertCircle className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-slate-300 font-bold">Nenhuma partida localizada</h3>
              <p className="text-slate-500 text-xs">
                Modifique as seleções de filtros para visualizar outras rodadas da Copa.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Championship Standings & Brackets Page View */
        <div className="space-y-6 animate-fadeIn">
          {selectedCampeonato === 'BRASILEIRAO' ? (
            /* Brasileirão Standings Table */
            <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-4 sm:p-5 overflow-x-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-100 font-sans flex items-center gap-2">
                  <span>🇧🇷 Tabela de Classificação em Tempo Real</span>
                </h3>
                <span className="text-[9px] text-slate-500 font-mono tracking-tight uppercase">Brasileirão Série A • 2026</span>
              </div>
              
              <table className="w-full text-left border-collapse text-xs font-sans min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-950/80 text-slate-500 uppercase text-[9px] font-black tracking-wider">
                    <th className="py-2 px-1 text-center w-10">Pos</th>
                    <th className="py-2 px-2">Clube</th>
                    <th className="py-2 px-1.5 text-center w-12">Pts</th>
                    <th className="py-2 px-1.5 text-center w-10">J</th>
                    <th className="py-2 px-1.5 text-center w-10">V</th>
                    <th className="py-2 px-1.5 text-center w-10">E</th>
                    <th className="py-2 px-1.5 text-center w-10">D</th>
                    <th className="py-2 px-1.5 text-center w-12 text-slate-550">GP</th>
                    <th className="py-2 px-1.5 text-center w-12 text-slate-550">GC</th>
                    <th className="py-2 px-1.5 text-center w-12">SG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {standings.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/20 text-slate-350 transition duration-150">
                      <td className="py-3 px-1 text-center font-black">
                        <span className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded font-mono text-[9px] font-bold ${
                          idx < 4 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' 
                            : idx < 6 
                              ? 'bg-brand-blue-dark/50 text-brand-blue-vibrant border border-brand-blue-accent/20'
                              : idx >= standings.length - 4 
                                ? 'bg-red-950 text-red-400 border border-red-900/35' 
                                : 'text-slate-500 bg-slate-950/40'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold flex items-center gap-2 truncate text-slate-200">
                        {renderBandeira(row.bandeira, "w-4 h-4 rounded shadow-xs", "text-sm")}
                        <span className="truncate">{row.time}</span>
                      </td>
                      <td className="py-3 px-1.5 text-center font-black text-slate-100 font-mono">{row.pontos}</td>
                      <td className="py-3 px-1.5 text-center font-mono">{row.jogos}</td>
                      <td className="py-3 px-1.5 text-center font-mono">{row.vitorias}</td>
                      <td className="py-3 px-1.5 text-center font-mono">{row.empates}</td>
                      <td className="py-3 px-1.5 text-center font-mono">{row.derrotas}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-450">{row.golsPro}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-450">{row.golsContra}</td>
                      <td className={`py-3 px-1.5 text-center font-bold font-mono ${row.saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {standings.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs italic font-sans">
                  Nenhuma partida finalizada para este campeonato até o momento.
                </div>
              )}
            </div>
          ) : (
            /* Word Cup or Libertadores Group Standings & Knockout tree */
            <div className="space-y-8">
              
              {/* Dynamic Group Stage Standings computed dynamically */}
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                  <Trophy className="h-4 w-4 text-brand-blue-accent" />
                  <span>fase de Grupos (Standings por Pontos & Gols)</span>
                  <span className="flex-1 h-px bg-slate-900 ml-2" />
                </div>
                
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.keys(groupsData).map((gName) => (
                    <div key={gName} className="bg-slate-900/60 border border-slate-900 rounded-2xl p-4 font-sans text-xs">
                      <div className="font-extrabold uppercase text-slate-200 border-b border-slate-900 pb-2 mb-2 tracking-wider flex justify-between items-center text-[10px] text-brand-blue-vibrant">
                        <span>{gName}</span>
                        <span className="text-[8px] font-mono text-slate-600">P / SG</span>
                      </div>
                      <div className="space-y-2">
                        {groupsData[gName].map((row, rIdx) => (
                          <div key={rIdx} className="flex items-center justify-between text-slate-350">
                            <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                              <span className={`font-mono text-[9px] w-4 text-center font-semibold ${rIdx < 2 ? 'text-emerald-450 font-black' : 'text-slate-600'}`}>
                                {rIdx + 1}
                              </span>
                              {renderBandeira(row.bandeira, "w-4 h-4 rounded shadow-xs", "text-sm")}
                              <span className={`truncate ${rIdx < 2 ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>{row.time}</span>
                            </div>
                            <div className="font-mono text-[9.5px] font-black flex items-center gap-2 shrink-0">
                              <span className="text-slate-100">{row.pontos}p</span>
                              <span className={`text-[9.5px] w-5 text-right ${row.saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupsData).length === 0 && (
                    <div className="col-span-full py-10 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 italic">
                      Nenhum resultado registrado nas fases de grupos. Os dados surgem logo que os palpites forem sendo resolvidos!
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Knockout Bracket Tree Visualizer */}
              <div className="space-y-4 pt-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                  <Calendar className="h-4 w-4 text-yellow-500" />
                  <span>Árvore de Chaveamento do Torneio (Fase Eliminatória)</span>
                  <span className="flex-1 h-px bg-slate-900 ml-2" />
                </div>

                {/* Vertical tree grid - responsive outer overflow */}
                <div className="bg-slate-950/80 border border-slate-900 p-4 sm:p-6 rounded-2xl overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none min-w-[900px] py-2">
                    
                    {/* Column 1: Oitavas de Final */}
                    <div className="space-y-4">
                      <div className="text-[10px] font-black uppercase text-brand-blue-accent tracking-widest text-center border-b border-slate-900 pb-2">
                        Oitavas de Final
                      </div>
                      <div className="space-y-3">
                        {Array.from({ length: 8 }).map((_, idx) => {
                          const game = playOffsByRound[selectedCampeonato === 'LIBERTADORES' ? 7 : 5]?.[idx];
                          return (
                            <React.Fragment key={idx}>
                              {renderBracketMatchBox(game, `Confronto #${idx + 1}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 2: Quartas de Final */}
                    <div className="space-y-4 flex flex-col justify-around">
                      <div>
                        <div className="text-[10px] font-black uppercase text-brand-blue-vibrant tracking-widest text-center border-b border-slate-900 pb-2">
                          Quartas de Final
                        </div>
                      </div>
                      <div className="space-y-16">
                        {Array.from({ length: 4 }).map((_, idx) => {
                          const game = playOffsByRound[selectedCampeonato === 'LIBERTADORES' ? 8 : 6]?.[idx];
                          return (
                            <React.Fragment key={idx}>
                              {renderBracketMatchBox(game, `Quartas #${idx + 1}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 3: Semifinais */}
                    <div className="space-y-4 flex flex-col justify-around">
                      <div>
                        <div className="text-[10px] font-black uppercase text-yellow-500 tracking-widest text-center border-b border-slate-900 pb-2">
                          Semifinal
                        </div>
                      </div>
                      <div className="space-y-32">
                        {Array.from({ length: 2 }).map((_, idx) => {
                          const game = playOffsByRound[selectedCampeonato === 'LIBERTADORES' ? 9 : 7]?.[idx];
                          return (
                            <React.Fragment key={idx}>
                              {renderBracketMatchBox(game, `Semifinal #${idx + 1}`)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 4: GRANDE FINAL */}
                    <div className="space-y-4 flex flex-col justify-center">
                      <div>
                        <div className="text-[10px] font-black uppercase text-emerald-400 tracking-widest text-center border-b border-slate-900 pb-2 mb-8">
                          Grande Final
                        </div>
                      </div>
                      <div className="space-y-2">
                        {renderBracketMatchBox(playOffsByRound[selectedCampeonato === 'LIBERTADORES' ? 10 : 8]?.[0], "Grande Final")}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-900/80 p-3 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                  💡 <b>Regulamento das Fases do Torneio:</b> O chaveamento é alimentado dinamicamente via integração API-Sports. À medida que as partidas das oitavas e quartas de final se encerram e são sincronizadas no painel administrativo, o sistema calcula os cruzamentos e posiciona os classificados na próxima fase automaticamente.
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
