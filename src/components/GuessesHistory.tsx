import React from 'react';
import { Trophy, CheckCircle, XCircle, Clock, Calendar, Search, Award, TrendingUp, Filter, Target } from 'lucide-react';
import { Jogo, Palpite } from '../types';
import { getGameCampeonato } from './MatchesSection';
import { safeParseDate, safeLocaleString } from '../utils/dateUtils';

function normalizePlayerName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
  n = n.replace(/\(\s*\d+\s*\)/g, ""); // strip parentheses and number (e.g. " (1)")
  n = n.replace(/\b[0-9]+\b/g, ""); // remove loose numbers
  n = n.replace(/\s+/g, " "); // collapse spaces
  return n.trim();
}

function getGoalsFromGameEvents(jogo: Jogo): { [playerKey: string]: number } {
  const goalsMap: { [playerKey: string]: number } = {};
  if (jogo.real_events && Array.isArray(jogo.real_events)) {
    jogo.real_events.forEach(evt => {
      if (evt.type === "Goal" && evt.player && evt.player.name) {
        const pName = normalizePlayerName(evt.player.name);
        
        let side: "casa" | "fora" = "casa";
        if (evt.team && evt.team.name) {
          const teamEventName = normalizePlayerName(evt.team.name);
          const teamFora = normalizePlayerName(jogo.time_fora);
          if (teamEventName === teamFora || teamFora.includes(teamEventName) || teamEventName.includes(teamFora)) {
            side = "fora";
          }
        }
        
        const key = `${pName}_${side}`;
        goalsMap[key] = (goalsMap[key] || 0) + 1;
      }
    });
  }
  return goalsMap;
}

interface GuessesHistoryProps {
  jogos: Jogo[];
  palpites: Palpite[];
  usuarioNome?: string;
  isCompact?: boolean;
  correcoes?: {
    id: number;
    usuario_id: number;
    tipo: 'VENCEDOR' | 'PLACAR_EXATO' | 'GOL';
    quantidade: number;
    pontos: number;
    descricao: string;
    created_at: string;
  }[];
  onDeleteCorrection?: (id: number) => void;
}

export default function GuessesHistory({ 
  jogos, 
  palpites, 
  usuarioNome, 
  isCompact = false,
  correcoes = [],
  onDeleteCorrection
}: GuessesHistoryProps) {
  const [filter, setFilter] = React.useState<'TODOS' | 'EXATOS' | 'VENCEDOR' | 'ERROS' | 'PENDENTES'>('TODOS');
  const [search, setSearch] = React.useState('');

  // Combine palpites with games
  const historyData = React.useMemo(() => {
    return palpites
      .map(p => {
        const jogo = jogos.find(j => j.id === p.jogo_id);
        if (!jogo) return null;

        const isExact = jogo.placar_casa !== null && jogo.placar_fora !== null && 
                        p.placar_casa === jogo.placar_casa && p.placar_fora === jogo.placar_fora;

        const pResultado = p.placar_casa > p.placar_fora ? 'CASA' : (p.placar_casa < p.placar_fora ? 'FORA' : 'EMPATE');
        const rResultado = jogo.placar_casa !== null && jogo.placar_fora !== null
          ? (jogo.placar_casa > jogo.placar_fora ? 'CASA' : (jogo.placar_casa < jogo.placar_fora ? 'FORA' : 'EMPATE'))
          : null;

        const isOutcome = rResultado !== null && pResultado === rResultado;
        
        let classification: 'EXATO' | 'VENCEDOR' | 'ERRO' | 'PENDENTE' = 'PENDENTE';
        if (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO') {
          if (isExact) classification = 'EXATO';
          else if (isOutcome) classification = 'VENCEDOR';
          else classification = 'ERRO';
        }

        return {
          palpite: p,
          jogo,
          classification,
          isExact,
          isOutcome,
          pontos: p.pontos || 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => safeParseDate(b.jogo.data_jogo).getTime() - safeParseDate(a.jogo.data_jogo).getTime());
  }, [jogos, palpites]);

  // Stats Counters
  const stats = React.useMemo(() => {
    let total = historyData.length;
    let exatos = 0;
    let vencedor = 0;
    let erros = 0;
    let pendentes = 0;
    let pontosSomados = 0;
    let acertosArtilheiro = 0;

    historyData.forEach(item => {
      pontosSomados += item.pontos;
      if (item.classification === 'EXATO') exatos++;
      else if (item.classification === 'VENCEDOR') vencedor++;
      else if (item.classification === 'ERRO') erros++;
      else if (item.classification === 'PENDENTE') pendentes++;

      // Count exact scorer prediction hits
      if (item.palpite.palpites_gols_jogadores && item.palpite.palpites_gols_jogadores.length > 0) {
        const actualGoals = getGoalsFromGameEvents(item.jogo);
        item.palpite.palpites_gols_jogadores.forEach(sg => {
          const gNameNormal = normalizePlayerName(sg.jogador);
          const guessSide = sg.time_lado || "casa";
          let matchedActualGoals = 0;
          let highestScore = 0;

          for (const [evtNameWithSide, goalsScored] of Object.entries(actualGoals)) {
            const parts = evtNameWithSide.split("_");
            const evtName = parts[0];

            if (evtName && gNameNormal) {
              let score = 0;
              if (evtName === gNameNormal) {
                score = 100;
              } else {
                const cleanWord = (w: string) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();
                const prepositions = ["de", "da", "do", "la", "el", "di", "del", "du", "van", "von", "y", "dos", "das", "der"];

                const evtWords = evtName.split(/\s+/).filter(Boolean);
                const guessWords = gNameNormal.split(/\s+/).filter(Boolean);

                const evtCleaned = evtWords.map(cleanWord).filter(Boolean);
                const guessCleaned = guessWords.map(cleanWord).filter(Boolean);

                const evtSig = evtCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));
                const guessSig = guessCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));

                // Check for exact match first of cleaned words
                const evtCleanStr = evtCleaned.join("");
                const guessCleanStr = guessCleaned.join("");
                if (evtCleanStr && guessCleanStr && evtCleanStr === guessCleanStr) {
                  score = 100;
                } else if (evtSig.length > 0 && guessSig.length > 0) {
                  const commonSig = evtSig.filter(w => guessSig.includes(w));
                  if (commonSig.length > 0) {
                    const overlap = commonSig.length / Math.max(evtSig.length, guessSig.length);
                    score = overlap * 80;
                  }
                } else {
                  const commonAll = evtCleaned.filter(w => guessCleaned.includes(w));
                  if (commonAll.length > 0) {
                    const overlap = commonAll.length / Math.max(evtCleaned.length, guessCleaned.length);
                    score = overlap * 80;
                  }
                }
              }

              if (score > highestScore && score >= 20) {
                highestScore = score;
                matchedActualGoals = goalsScored;
              }
            }
          }

          const hitGoals = Math.min(matchedActualGoals, sg.gols);
          if (hitGoals > 0) {
            acertosArtilheiro += hitGoals;
          }
        });
      }
    });

    // Merge manual corrections into the statistical outputs!
    if (correcoes && Array.isArray(correcoes)) {
      correcoes.forEach(c => {
        pontosSomados += c.pontos;
        if (c.tipo === 'PLACAR_EXATO') {
          exatos += c.quantidade;
        } else if (c.tipo === 'VENCEDOR') {
          vencedor += c.quantidade;
        } else if (c.tipo === 'GOL') {
          acertosArtilheiro += c.quantidade;
        }
      });
    }

    return { total, exatos, vencedor, erros, pendentes, pontosSomados, acertosArtilheiro };
  }, [historyData, correcoes]);

  // Filter & Search
  const filteredData = React.useMemo(() => {
    return historyData.filter(item => {
      // 1. Filter Tab
      if (filter === 'EXATOS' && item.classification !== 'EXATO') return false;
      if (filter === 'VENCEDOR' && item.classification !== 'VENCEDOR') return false;
      if (filter === 'ERROS' && item.classification !== 'ERRO') return false;
      if (filter === 'PENDENTES' && item.classification !== 'PENDENTE') return false;

      // 2. Search query
      if (search) {
        const query = search.toLowerCase();
        const matchTeams = item.jogo.time_casa.toLowerCase().includes(query) ||
                           item.jogo.time_fora.toLowerCase().includes(query);
        return matchTeams;
      }

      return true;
    });
  }, [historyData, filter, search]);

  const getFriendlyRoundName = (round: number, champ: string) => {
    if (champ === 'BRASILEIRAO') return `Série A - Rodada ${round}`;
    if (champ === 'LIBERTADORES') {
      if (round <= 6) return `Libertadores - Fase de Grupos (R${round})`;
      if (round === 7) return `Libertadores - Oitavas de Final`;
      if (round === 8) return `Libertadores - Quartas de Final`;
      if (round === 9) return `Libertadores - Semifinal`;
      return `Libertadores - Grande Final 🏆`;
    }
    // World Cup
    if (round <= 3) return `Copa do Mundo - Fase de Grupos (R${round})`;
    if (round === 4) return `Copa 16-avos`;
    if (round === 5) return `Copa do Mundo - Oitavas`;
    if (round === 6) return `Copa do Mundo - Quartas`;
    if (round === 7) return `Copa do Mundo - Semifinal`;
    return `Copa do Mundo - Grande Final 🏆`;
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      {!isCompact && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-100 tracking-tight font-sans">
              📋 {usuarioNome ? `Palpites de ${usuarioNome}` : 'Meu Histórico de Palpites'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-sans tracking-wide">
              Lista de todos os seus palpites computados ordenados por data de realização.
            </p>
          </div>
        </div>
      )}

      {/* Summary Analytics Cards */}
      <div className={`grid ${isCompact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'}`}>
        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-brand-blue-accent mb-1" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Total Enviados</span>
          <span className="text-sm sm:text-base font-black text-slate-200 mt-0.5 font-mono">{stats.total}</span>
        </div>
        
        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Pontos Obtidos</span>
          <span className="text-sm sm:text-base font-black text-yellow-500 mt-0.5 font-mono">{stats.pontosSomados} p</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Acertos Exatos</span>
          <span className="text-sm sm:text-base font-black text-emerald-500 mt-0.5 font-mono">{stats.exatos}</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-brand-blue-light mb-1" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Vencedor/Empate</span>
          <span className="text-sm sm:text-base font-black text-brand-blue-vibrant mt-0.5 font-mono">{stats.vencedor}</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Acerto Artilheiro</span>
          <span className="text-sm sm:text-base font-black text-amber-500 mt-0.5 font-mono">{stats.acertosArtilheiro}</span>
        </div>

        <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center text-center">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 mb-1 animate-pulse" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Pendentes</span>
          <span className="text-sm sm:text-base font-black text-slate-400 mt-0.5 font-mono">{stats.pendentes}</span>
        </div>
      </div>

      {/* Manual Corrections Section */}
      {correcoes && correcoes.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <Trophy className="h-4 w-4" />
            <h4 className="text-xs font-black uppercase tracking-wider font-sans">Ajustes / Correções de Pontos Creditadas</h4>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-450 font-sans font-medium">
            Registros de correções de palpites e artilharia inseridas pela administração para este participante.
          </p>
          <div className="divide-y divide-slate-800/50 bg-slate-950/30 border border-slate-900/60 rounded-xl px-4 font-sans">
            {correcoes.map((c) => (
              <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-205">
                      {c.tipo === 'PLACAR_EXATO' ? '🎯 Placar Exato' : c.tipo === 'VENCEDOR' ? '🟢 Resultado da Partida' : '⚽ Autor do Gol'}
                    </span>
                    <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                      +{c.quantidade} {c.quantidade === 1 ? 'Acerto' : 'Acertos'}
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      +{c.pontos} Pontos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Motivo: <span className="font-bold text-amber-500/80 italic font-sans">"{c.descricao}"</span></p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="text-[10px] text-slate-500 font-semibold font-mono">{safeLocaleString(c.created_at)}</span>
                  {onDeleteCorrection && (
                    <button
                      type="button"
                      onClick={() => onDeleteCorrection(c.id)}
                      className="text-[9px] uppercase font-black text-slate-950 bg-red-400 hover:bg-red-500 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-950/40 p-2.5 sm:p-3 rounded-xl border border-slate-900">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por nome de time..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-yellow-500 rounded-lg text-xs font-semibold text-slate-200 font-sans"
          />
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-1">
          {(['TODOS', 'EXATOS', 'VENCEDOR', 'ERROS', 'PENDENTES'] as const).map((opt) => {
            const labelsMap = {
              TODOS: 'Todos',
              EXATOS: 'Acertos Exatos 🎯',
              VENCEDOR: 'Vencedor 🟢',
              ERROS: 'Erros ❌',
              PENDENTES: 'Em Processamento ⏳'
            };
            const countMap = {
              TODOS: stats.total,
              EXATOS: stats.exatos,
              VENCEDOR: stats.vencedor,
              ERROS: stats.erros,
              PENDENTES: stats.pendentes
            };
            return (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider font-sans transition ${
                  filter === opt 
                    ? 'bg-yellow-500 text-slate-950' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {labelsMap[opt]} ({countMap[opt]})
              </button>
            );
          })}
        </div>
      </div>

      {/* List items representation */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredData.length > 0 ? (
          filteredData.map(({ palpite, jogo, classification, pontos }) => {
            const champ = getGameCampeonato(jogo);

            return (
              <div 
                key={palpite.jogo_id} 
                className={`bg-slate-950/50 p-3 rounded-xl border border-slate-900 flex flex-col xs:flex-row items-center justify-between gap-3 relative transition hover:border-slate-800/80`}
              >
                {/* Left side details */}
                <div className="flex flex-col space-y-1 align-left text-left w-full xs:w-auto">
                  <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {safeLocaleString(jogo.data_jogo, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • {getFriendlyRoundName(jogo.rodada, champ)}
                  </span>
                  
                  {/* Scoreboard visual alignment */}
                  <div className="flex items-center gap-3">
                    {/* Home Team */}
                    <span className="text-xs font-bold text-slate-100 max-w-[100px] truncate">{jogo.time_casa}</span>
                    
                    {/* Score display */}
                    <div className="flex items-center gap-1 font-mono text-xs bg-slate-900 border border-slate-850 px-2 py-0.5 rounded font-black">
                      <span className="text-slate-200">{jogo.placar_casa !== null ? jogo.placar_casa : '-'}</span>
                      <span className="text-slate-600">x</span>
                      <span className="text-slate-200">{jogo.placar_fora !== null ? jogo.placar_fora : '-'}</span>
                    </div>

                    {/* Away Team */}
                    <span className="text-xs font-bold text-slate-100 max-w-[100px] truncate">{jogo.time_fora}</span>
                  </div>

                  {/* Goalscorer predictions list (Artilheiros) */}
                  {palpite.palpites_gols_jogadores && palpite.palpites_gols_jogadores.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-900/40 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[8px] font-sans font-extrabold text-slate-500 uppercase tracking-widest mr-1">Artilheiros:</span>
                      {palpite.palpites_gols_jogadores.map((sg, sgIdx) => {
                        const actualGoals = getGoalsFromGameEvents(jogo);
                        const gNameNormal = normalizePlayerName(sg.jogador);
                        const guessSide = sg.time_lado || "casa";
                        
                        let matchedActualGoals = 0;
                        let highestScore = 0;

                        for (const [evtNameWithSide, goalsScored] of Object.entries(actualGoals)) {
                          const parts = evtNameWithSide.split("_");
                          const evtName = parts[0];

                          if (evtName && gNameNormal) {
                            let score = 0;
                            if (evtName === gNameNormal) {
                              score = 100;
                            } else {
                              const cleanWord = (w: string) => w.replace(/[^a-z0-9]/gi, "").toLowerCase();
                              const prepositions = ["de", "da", "do", "la", "el", "di", "del", "du", "van", "von", "y", "dos", "das", "der"];

                              const evtWords = evtName.split(/\s+/).filter(Boolean);
                              const guessWords = gNameNormal.split(/\s+/).filter(Boolean);

                              const evtCleaned = evtWords.map(cleanWord).filter(Boolean);
                              const guessCleaned = guessWords.map(cleanWord).filter(Boolean);

                              const evtSig = evtCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));
                              const guessSig = guessCleaned.filter(w => w.length >= 3 && !prepositions.includes(w));

                              // Check for exact match first of cleaned words
                              const evtCleanStr = evtCleaned.join("");
                              const guessCleanStr = guessCleaned.join("");
                              if (evtCleanStr && guessCleanStr && evtCleanStr === guessCleanStr) {
                                score = 100;
                              } else if (evtSig.length > 0 && guessSig.length > 0) {
                                const commonSig = evtSig.filter(w => guessSig.includes(w));
                                if (commonSig.length > 0) {
                                  const overlap = commonSig.length / Math.max(evtSig.length, guessSig.length);
                                  score = overlap * 80;
                                }
                              } else {
                                const commonAll = evtCleaned.filter(w => guessCleaned.includes(w));
                                if (commonAll.length > 0) {
                                  const overlap = commonAll.length / Math.max(evtCleaned.length, guessCleaned.length);
                                  score = overlap * 80;
                                }
                              }
                            }

                            if (score > highestScore && score >= 20) {
                              highestScore = score;
                              matchedActualGoals = goalsScored;
                            }
                          }
                        }

                        const isHit = matchedActualGoals >= sg.gols;
                        const isPartialHit = !isHit && matchedActualGoals > 0;

                        return (
                          <span 
                            key={sgIdx} 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-medium border transition ${
                              isHit 
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                                : isPartialHit 
                                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                                  : 'bg-slate-900/60 border-slate-850/60 text-slate-400'
                            }`}
                          >
                            <span>⚽</span>
                            <span className="font-bold text-slate-200">{sg.jogador}</span>
                            <span className="text-[8px] font-mono font-semibold">
                              ({sg.gols} {sg.gols === 1 ? 'gol' : 'gols'})
                            </span>
                            {isHit && (
                              <span className="text-[9px] text-emerald-400 font-extrabold leading-none">✓</span>
                            )}
                            {isPartialHit && (
                              <span className="text-[8px] text-amber-400 font-extrabold leading-none">({matchedActualGoals})</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side outcome metrics */}
                <div className="flex items-center justify-between xs:justify-end gap-3 w-full xs:w-auto border-t xs:border-t-0 border-slate-900 pt-2 xs:pt-0">
                  {/* Your prediction label */}
                  <div className="flex flex-col text-left xs:text-right font-sans">
                    <span className="text-[8px] text-slate-500 uppercase font-black">Seu Palpite</span>
                    <span className="text-xs font-mono font-black text-brand-blue-vibrant">{palpite.placar_casa} x {palpite.placar_fora}</span>
                  </div>

                  {/* Classification Badge & points */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {classification === 'EXATO' && (
                      <span className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-900/40 text-[9px] font-black text-emerald-500 uppercase tracking-wider font-sans">
                        🎯 Exato (+{pontos}p)
                      </span>
                    )}
                    {classification === 'VENCEDOR' && (
                      <span className="px-2 py-1 rounded bg-brand-blue-dark/80 border border-brand-blue-accent/30 text-[9px] font-black text-brand-blue-vibrant uppercase tracking-wider font-sans">
                        🟢 Vencedor (+{pontos}p)
                      </span>
                    )}
                    {classification === 'ERRO' && (
                      <span className="px-2 py-1 rounded bg-red-955/20 border border-red-900/40 text-[9px] font-black text-red-500 uppercase tracking-wider font-sans">
                        ❌ Erro (+0p)
                      </span>
                    )}
                    {classification === 'PENDENTE' && (
                      <span className="px-2 py-1 rounded bg-slate-900 border border-slate-850 text-[9px] font-black text-slate-450 uppercase tracking-wider font-sans animate-pulse">
                        ⏳ {jogo.status === 'AO_VIVO' ? 'Ao Vivo (Parcial)' : 'Pendente'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 border border-slate-900 rounded-xl bg-slate-950/20 text-center text-xs text-slate-500 font-sans">
            Nenhum palpite correspondente aos filtros foi encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
