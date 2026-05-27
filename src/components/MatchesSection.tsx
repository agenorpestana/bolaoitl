import React from 'react';
import { Lock, Unlock, Save, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Jogo, Palpite } from '../types';
import { renderBandeira } from './HomePublic';


export function getFriendlyRoundName(rdNum: number | string, campeonato?: 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO'): string {
  const num = Number(rdNum);
  if (isNaN(num)) return String(rdNum);
  if (campeonato === 'BRASILEIRAO') {
    return `Rodada ${num}`;
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

  // Determine current active/open round dynamically for this championship
  const isRdFinished = React.useCallback((rdNum: number) => {
    const matchesInRd = championshipJogos.filter(j => j.rodada === rdNum);
    return matchesInRd.length > 0 && matchesInRd.every(j => j.status === 'ENCERRADO' || isPastGame(j));
  }, [championshipJogos, isPastGame]);

  const currentRound = React.useMemo(() => {
    return rounds.find(rd => !isRdFinished(rd)) || (rounds.length > 0 ? rounds[rounds.length - 1] : null);
  }, [rounds, isRdFinished]);

  const currentRoundIdx = React.useMemo(() => {
    return rounds.findIndex(rd => rd === currentRound);
  }, [rounds, currentRound]);

  const nextRound = React.useMemo(() => {
    return currentRoundIdx !== -1 && currentRoundIdx + 1 < rounds.length ? rounds[currentRoundIdx + 1] : null;
  }, [rounds, currentRoundIdx]);

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

  const isAvailableOrLive = React.useCallback((jogo: Jogo): boolean => {
    return jogo.status === 'AO_VIVO' || (jogo.status === 'PENDENTE' && !isPastGame(jogo));
  }, [isPastGame]);

  const isConcludedOrExpired = React.useCallback((jogo: Jogo): boolean => {
    return jogo.status === 'ENCERRADO' || (jogo.status === 'PENDENTE' && isPastGame(jogo));
  }, [isPastGame]);

  // Filtered games list calculation
  const filteredGames = React.useMemo(() => {
    return championshipJogos.filter(jogo => {
      const matchesRound = activeRodada === 'TODOS' || activeRodada === null || jogo.rodada === activeRodada;
      
      let matchesStatus = true;
      if (filterStatus === 'ABERTO') {
        matchesStatus = jogo.status === 'PENDENTE' && !isMatchLocked(jogo);
      } else if (filterStatus === 'AO_VIVO') {
        matchesStatus = jogo.status === 'AO_VIVO';
      } else if (filterStatus === 'ENCERRADO') {
        matchesStatus = isConcludedOrExpired(jogo);
      } else if (filterStatus === 'TODOS') {
        // If we are looking at the current/active round, hide older/expired games by default
        // so they do not clutter the betting deck and move entirely to the "Encerrados" filter status.
        if (activeRodada === currentRound) {
          matchesStatus = !isConcludedOrExpired(jogo);
        }
      }

      return matchesRound && matchesStatus;
    });
  }, [championshipJogos, activeRodada, filterStatus, dataServidor, currentRound, isConcludedOrExpired]);

  // Split into active/pending matches versus finished matches as requested
  const pendingOrLiveGames = React.useMemo(() => {
    return filteredGames.filter(jogo => isAvailableOrLive(jogo));
  }, [filteredGames, isAvailableOrLive]);

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

    return (
      <div 
        key={jogo.id} 
        className={`bg-slate-900/70 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition duration-200 ${
          jogo.status === 'AO_VIVO' 
            ? 'border-red-900/40 shadow-red-950/5' 
            : isReadonly 
              ? 'border-slate-800/80 hover:border-slate-800' 
              : 'border-brand-blue-light/40 hover:border-brand-red/60 shadow-brand-blue-dark/5'
        }`}
      >
        
        {/* Game Top info bar */}
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-0 sm:items-center justify-between text-[10px] font-bold uppercase">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono">
              {getFriendlyRoundName(jogo.rodada, getGameCampeonato(jogo))}
            </span>
            <span>•</span>
            <span className="font-mono">
              {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {jogo.status === 'AO_VIVO' ? (
            <span className="self-start sm:self-auto flex items-center gap-1 bg-red-950/80 border border-red-800/40 text-red-400 px-2.5 py-0.5 rounded animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Ao Vivo ({jogo.placar_casa}x{jogo.placar_fora})
            </span>
          ) : jogo.status === 'ENCERRADO' ? (
            <span className="self-start sm:self-auto bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">
              Encerrado ({jogo.placar_casa}x{jogo.placar_fora})
            </span>
          ) : isReadonly ? (
            <span className="self-start sm:self-auto text-yellow-500 bg-yellow-950/30 border border-yellow-950/60 px-2 py-0.5 rounded flex items-center gap-1">
              <Lock className="h-3 w-3" /> {getLockTimeLeftStr(jogo)}
            </span>
          ) : (
            <span className="self-start sm:self-auto text-brand-red bg-brand-blue-dark/85 border border-brand-red/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Unlock className="h-3 w-3" /> Aberto • <Clock className="h-3 w-3 inline" /> {getLockTimeLeftStr(jogo)}
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

          {/* Guess Input grid */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            <input
              type="text"
              maxLength={2}
              disabled={!token || isReadonly}
              placeholder="-"
              value={inputVal.casa}
              onChange={(e) => handleInputChange(jogo.id, 'casa', e.target.value)}
              className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 text-center text-base sm:text-lg md:text-xl font-black font-mono rounded-xl border transition ${
                !token 
                  ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                  : isReadonly
                    ? 'bg-slate-950 border-slate-900 text-slate-400'
                    : 'bg-slate-950 border-brand-blue-light text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red'
              }`}
            />

            <span className="text-slate-600 font-mono text-xs sm:text-sm">x</span>

            <input
              type="text"
              maxLength={2}
              disabled={!token || isReadonly}
              placeholder="-"
              value={inputVal.fora}
              onChange={(e) => handleInputChange(jogo.id, 'fora', e.target.value)}
              className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 text-center text-base sm:text-lg md:text-xl font-black font-mono rounded-xl border transition ${
                !token 
                  ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                  : isReadonly
                    ? 'bg-slate-950 border-slate-900 text-slate-400'
                    : 'bg-slate-950 border-brand-blue-light text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red'
              }`}
            />

          </div>

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
              userBet ? (
                <div className="text-[11px] text-brand-red font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 inline text-brand-red" /> Palpitado: {userBet.placar_casa}x{userBet.placar_fora}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium">Você ainda não palpitou</span>
              )
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">Faça login para apostar</span>
            )}
          </div>

          {/* Guess action button */}
          {token && !isReadonly && (
            <button
              id={`btn-save-palpite-${jogo.id}`}
              onClick={() => handleSaveClick(jogo.id)}
              disabled={isSaving}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-red to-brand-red-hover hover:scale-105 hover:shadow-md hover:shadow-brand-red/10 text-white font-bold rounded-lg transition transform active:scale-95 text-[11px] w-full xs:w-auto justify-center"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          )}

          {/* Guess badge points feedback if completed or live matches */}
          {['ENCERRADO', 'AO_VIVO'].includes(jogo.status) && userBet && (
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[11px] text-slate-400">
                {jogo.status === 'AO_VIVO' ? 'Pontos parciais:' : 'Pontuação:'}
              </span>
              <span className={`px-2.5 py-0.5 rounded font-mono font-extrabold text-[11px] ${
                pointsWon && pointsWon > 5 
                  ? 'bg-yellow-950/80 border border-yellow-700/40 text-yellow-500 shadow-md animate-pulse' 
                  : pointsWon && pointsWon > 0
                    ? 'bg-brand-blue/80 border border-brand-red/30 text-brand-red'
                    : 'bg-slate-950/80 border border-slate-800/60 text-slate-500'
              }`}>
                +{pointsWon || 0} Pts {jogo.status === 'AO_VIVO' ? '🔴' : ''}
              </span>
            </div>
          )}

          {jogo.status === 'ENCERRADO' && !userBet && (
            <span className="text-[10px] text-red-500/80 font-bold bg-red-950/10 border border-red-950/30 px-1.5 py-0.5 rounded">
              Sem palpite (-0 Pts)
            </span>
          )}
          {jogo.status === 'AO_VIVO' && !userBet && (
            <span className="text-[10px] text-yellow-500/80 font-bold bg-yellow-950/10 border border-yellow-950/30 px-1.5 py-0.5 rounded animate-pulse">
              Sem palpite (Parcial)
            </span>
          )}
        </div>

      </div>
    );
  };

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
        <button
          onClick={() => setSelectedCampeonato('COPA_MUNDO')}
          className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
            selectedCampeonato === 'COPA_MUNDO'
              ? 'bg-gradient-to-r from-brand-red to-brand-red-hover text-white font-black shadow-md shadow-brand-red/15'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          🏆 Copa do Mundo 2026
        </button>
        <button
          onClick={() => setSelectedCampeonato('LIBERTADORES')}
          className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
            selectedCampeonato === 'LIBERTADORES'
              ? 'bg-gradient-to-r from-brand-red to-brand-red-hover text-white font-black shadow-md shadow-brand-red/15'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          🛰️ Copa Libertadores
        </button>
        {hasBrasileiraoGames && (
          <button
            onClick={() => setSelectedCampeonato('BRASILEIRAO')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition duration-200 ${
              selectedCampeonato === 'BRASILEIRAO'
                ? 'bg-gradient-to-r from-brand-red to-brand-red-hover text-white font-black shadow-md shadow-brand-red/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            🇧🇷 Brasileirão Série A
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
        
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
                    ? 'bg-brand-blue/80 text-brand-red border border-brand-red/40'
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
                ? 'bg-brand-blue/80 text-brand-red border border-brand-red/40'
                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas as Partidas
          </button>
        </div>

        {/* Game status filter toggle switches */}
        <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800/40 text-xs">
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
                  ? 'bg-brand-blue/80 text-brand-red font-bold shadow'
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
        <div className="space-y-8">
          
          {/* Section: Pending & Live Games */}
          {pendingOrLiveGames.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider">
                <Unlock className="h-3.5 w-3.5 text-brand-red" />
                <span>Disponíveis & Em Andamento</span>
                <span className="flex-1 h-px bg-slate-800/70 ml-2" />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {pendingOrLiveGames.map((jogo) => renderMatchCard(jogo))}
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
        <div className="bg-slate-900/30 border border-dashed border-slate-800 py-16 text-center space-y-2 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-slate-300 font-bold">Nenhuma partida localizada</h3>
          <p className="text-slate-500 text-xs">
            Modifique as seleções de filtros para visualizar outras rodadas da Copa.
          </p>
        </div>
      )}

    </div>
  );
}
