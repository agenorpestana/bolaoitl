import React from 'react';
import { Lock, Unlock, Save, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Jogo, Palpite } from '../types';
import { renderBandeira } from './HomePublic';


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

  // Determine rounds available in database
  const rounds = Array.from(new Set(jogos.map(g => g.rodada))).sort((a, b) => a - b);

  // Determine current active/open round dynamically
  const isRdFinished = (rdNum: number) => {
    const matchesInRd = jogos.filter(j => j.rodada === rdNum);
    return matchesInRd.length > 0 && matchesInRd.every(j => j.status === 'ENCERRADO');
  };
  const currentRound = rounds.find(rd => !isRdFinished(rd)) || (rounds.length > 0 ? rounds[rounds.length - 1] : null);

  const currentRoundIdx = rounds.findIndex(rd => rd === currentRound);
  const nextRound = currentRoundIdx !== -1 && currentRoundIdx + 1 < rounds.length ? rounds[currentRoundIdx + 1] : null;

  // Initialize active rodada to currentRound once on load
  const hasInitializedRound = React.useRef(false);
  React.useEffect(() => {
    if (jogos.length > 0 && !hasInitializedRound.current) {
      if (currentRound !== undefined && currentRound !== null) {
        setActiveRodada(currentRound);
        hasInitializedRound.current = true;
      }
    }
  }, [jogos, currentRound]);

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

  // Filtered games list calculation
  const filteredGames = jogos.filter(jogo => {
    const matchesRound = activeRodada === 'TODOS' || activeRodada === null || jogo.rodada === activeRodada;
    
    let matchesStatus = true;
    if (filterStatus === 'ABERTO') {
      matchesStatus = jogo.status === 'PENDENTE' && !isMatchLocked(jogo);
    } else if (filterStatus === 'AO_VIVO') {
      matchesStatus = jogo.status === 'AO_VIVO';
    } else if (filterStatus === 'ENCERRADO') {
      matchesStatus = jogo.status === 'ENCERRADO';
    }

    return matchesRound && matchesStatus;
  });

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
            <b>Mecânica Automatizada das Rodadas:</b> Atualmente estamos na <span className="text-emerald-400 font-black">Rodada {currentRound} (Atual)</span>. Palpites estão autorizados unicamente para esta rodada. As partidas das próximas rodadas serão liberadas para palpite de forma 100% dinâmica assim que findar o último confronto da rodada vigente!
          </div>
        </div>
      )}

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
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                Rodada {rd}{suffix}
              </button>
            );
          })}

          <button
            id="btn-filter-rodada-all"
            onClick={() => setActiveRodada('TODOS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeRodada === 'TODOS'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
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
                  ? 'bg-emerald-950 text-emerald-400 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Fixtures Deck */}
      {filteredGames.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredGames.map((jogo) => {
            const isReadonly = isMatchLocked(jogo);
            const userBet = palpites.find(p => p.jogo_id === jogo.id);
            const inputVal = inputs[jogo.id] || { casa: "", fora: "" };
            const isSaving = savingKeys[jogo.id] || false;
            
            // Check points won if completed
            const pointsWon = userBet ? userBet.pontos : null;

            return (
              <div 
                key={jogo.id} 
                className={`bg-slate-900/70 border rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition duration-200 ${
                  jogo.status === 'AO_VIVO' 
                    ? 'border-red-900/40 shadow-red-950/5' 
                    : isReadonly 
                      ? 'border-slate-800/80 hover:border-slate-800' 
                      : 'border-emerald-950/40 hover:border-emerald-900/60 shadow-emerald-950/5'
                }`}
              >
                
                {/* Game Top info bar */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono">
                      Rodada {jogo.rodada}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {jogo.status === 'AO_VIVO' ? (
                    <span className="flex items-center gap-1 bg-red-950/80 border border-red-800/40 text-red-400 px-2.5 py-0.5 rounded animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Ao Vivo ({jogo.placar_casa}x{jogo.placar_fora})
                    </span>
                  ) : jogo.status === 'ENCERRADO' ? (
                    <span className="bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">
                      Encerrado ({jogo.placar_casa}x{jogo.placar_fora})
                    </span>
                  ) : isReadonly ? (
                    <span className="text-yellow-500 bg-yellow-950/30 border border-yellow-950/60 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="h-3 w-3" /> {getLockTimeLeftStr(jogo)}
                    </span>
                  ) : (
                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded flex items-center gap-1">
                      <Unlock className="h-3 w-3" /> Aberto • <Clock className="h-3 w-3 inline" /> {getLockTimeLeftStr(jogo)}
                    </span>
                  )}
                </div>

                {/* Main Matchup Arena */}
                <div className="flex items-center justify-between gap-2 py-2">
                  
                  {/* Home Team */}
                  <div className="flex flex-col items-center flex-1 space-y-2 text-center">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {renderBandeira(jogo.time_casa_bandeira, "w-10 h-10 shadow-sm", "text-3xl")}
                    </div>
                    <span className="text-xs font-bold text-slate-200 mt-1 max-w-[120px] truncate">
                      {jogo.time_casa}
                    </span>
                  </div>

                  {/* Guess Input grid */}
                  <div className="flex items-center gap-2">
                    
                    <input
                      type="text"
                      maxLength={2}
                      disabled={!token || isReadonly}
                      placeholder="-"
                      value={inputVal.casa}
                      onChange={(e) => handleInputChange(jogo.id, 'casa', e.target.value)}
                      className={`w-12 h-12 text-center text-xl font-black font-mono rounded-xl border transition ${
                        !token 
                          ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                          : isReadonly
                            ? 'bg-slate-950 border-slate-900 text-slate-400'
                            : 'bg-slate-950 border-emerald-900 text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    />

                    <span className="text-slate-600 font-mono text-sm">x</span>

                    <input
                      type="text"
                      maxLength={2}
                      disabled={!token || isReadonly}
                      placeholder="-"
                      value={inputVal.fora}
                      onChange={(e) => handleInputChange(jogo.id, 'fora', e.target.value)}
                      className={`w-12 h-12 text-center text-xl font-black font-mono rounded-xl border transition ${
                        !token 
                          ? 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
                          : isReadonly
                            ? 'bg-slate-950 border-slate-900 text-slate-400'
                            : 'bg-slate-950 border-emerald-900 text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    />

                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center flex-1 space-y-2 text-center">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {renderBandeira(jogo.time_fora_bandeira, "w-10 h-10 shadow-sm", "text-3xl")}
                    </div>
                    <span className="text-xs font-bold text-slate-200 mt-1 max-w-[120px] truncate font-sans">
                      {jogo.time_fora}
                    </span>
                  </div>

                </div>

                {/* Input action panels */}
                <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                  <div>
                    {token ? (
                      userBet ? (
                        <div className="text-[11px] text-emerald-400/90 font-semibold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 inline text-emerald-500" /> Palpitado: {userBet.placar_casa}x{userBet.placar_fora}
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
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold rounded-lg transition transform active:scale-95 text-[11px]"
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
                            ? 'bg-emerald-950/80 border border-emerald-800/40 text-emerald-400'
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
          })}
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
