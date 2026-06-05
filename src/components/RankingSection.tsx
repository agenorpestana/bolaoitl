import React from 'react';
import { Search, Trophy, Medal, Star, Sparkles, Calendar, Filter } from 'lucide-react';
import { LISTA_MEDALHAS } from '../data';
import { Jogo } from '../types';

interface RankingRow {
  id: number;
  nome: string;
  cidade: string;
  pontos: number;
  acertos_exato: number;
  acertos_vencedor: number;
  erros: number;
  fator: number;
  acertos_artilheiro?: number;
}

interface RankingSectionProps {
  ranking: RankingRow[];
  jogos: Jogo[];
  token: string | null;
  usuarioLogado?: any;
}

export default function RankingSection({ ranking, jogos, token, usuarioLogado }: RankingSectionProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCity, setSelectedCity] = React.useState<string>("TODAS");
  const [localRanking, setLocalRanking] = React.useState<RankingRow[]>(ranking);
  const [activeMode, setActiveMode] = React.useState<'GERAL' | 'CAMPEONATO'>('GERAL');
  const [selectedCampeonato, setSelectedCampeonato] = React.useState<'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO' | 'all'>('all');
  const [selectedRodada, setSelectedRodada] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(false);

  // Sync prop ranking changes with local state (useful for first-load or global refresh notifications)
  React.useEffect(() => {
    if (activeMode === 'GERAL') {
      setLocalRanking(ranking);
    }
  }, [ranking, activeMode]);

  // Fetch updated rankings from backend dynamically when selectors change
  const fetchFilteredRanking = async (camp: string, rod: string) => {
    setIsLoading(true);
    try {
      const headersArr: any = {};
      if (token) {
        headersArr['Authorization'] = `Bearer ${token}`;
      }
      const query = new URLSearchParams();
      if (camp && camp !== 'all') query.set('campeonato', camp);
      if (rod && rod !== 'all') query.set('rodada', rod);

      const url = `/api/ranking?${query.toString()}`;
      const res = await fetch(url, { headers: headersArr });
      if (res.ok) {
        const data = await res.json();
        setLocalRanking(data);
      }
    } catch (err) {
      console.error("Erro ao carregar ranking filtrado:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get list of distinct cities available in the current ranking
  const distinctCities = React.useMemo(() => {
    return Array.from(new Set(localRanking.map(u => u.cidade))).sort();
  }, [localRanking]);

  // Apply search filtering rules
  const filteredUsers = React.useMemo(() => {
    return localRanking.filter(u => {
      const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = selectedCity === 'TODAS' || u.cidade === selectedCity;
      return matchesSearch && matchesCity;
    });
  }, [localRanking, searchTerm, selectedCity]);

  // Slicing logic for logged-in user to show top 10 and self beneath
  const loggedInUserIndex = React.useMemo(() => {
    if (!usuarioLogado) return -1;
    return filteredUsers.findIndex(u => {
      return u.id === usuarioLogado.id || 
             (u.nome && usuarioLogado.nome && u.nome.toLowerCase().trim() === usuarioLogado.nome.toLowerCase().trim());
    });
  }, [filteredUsers, usuarioLogado]);

  const usersToRender = React.useMemo(() => {
    if (usuarioLogado) {
      return filteredUsers.slice(0, 10);
    }
    return filteredUsers;
  }, [filteredUsers, usuarioLogado]);

  const isUserBelowTop10 = usuarioLogado && loggedInUserIndex >= 10;
  const loggedInUserObj = isUserBelowTop10 ? filteredUsers[loggedInUserIndex] : null;

  // Extract available rounds dynamically from matches list based on selected championship
  const availableRounds = React.useMemo(() => {
    if (!selectedCampeonato || selectedCampeonato === 'all') return [];
    
    const matchingGames = jogos.filter(j => {
      if (j.api_id) {
        const idLower = j.api_id.toLowerCase();
        if (idLower.includes("libertadores")) {
          return 'LIBERTADORES' === selectedCampeonato;
        }
        if (idLower.includes("brasileirao")) {
          return 'BRASILEIRAO' === selectedCampeonato;
        }
      }
      return 'COPA_MUNDO' === selectedCampeonato;
    });

    const rounds = Array.from(new Set(matchingGames.map(g => g.rodada)))
      .filter(r => typeof r === 'number' && r > 0)
      .sort((a, b) => a - b);

    return rounds;
  }, [jogos, selectedCampeonato]);

  const getCampDisplayName = (camp: string) => {
    if (camp === 'COPA_MUNDO') return 'Copa do Mundo';
    if (camp === 'LIBERTADORES') return 'Libertadores';
    if (camp === 'BRASILEIRAO') return 'Brasileirão';
    return 'Geral';
  };

  // Split Top 3 leaders for podium display
  const podium1st = filteredUsers[0];
  const podium2nd = filteredUsers[1];
  const podium3rd = filteredUsers[2];

  return (
    <div className="space-y-8 text-left">
      
      {/* Banner introduction with Trophy */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-brand-blue-light/50 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex gap-4 items-center">
          <div className="h-12 w-12 rounded-xl bg-yellow-400/10 border border-yellow-700/30 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex flex-wrap items-center gap-2">
              Classificação Cartola ITL
              <span className="text-[10px] uppercase font-black text-yellow-500 bg-yellow-950/40 border border-yellow-900/30 px-2 py-0.5 rounded tracking-wider">
                {activeMode === 'GERAL' ? 'Classificação Geral' : `${getCampDisplayName(selectedCampeonato)}${selectedRodada !== 'all' ? ` - Rodada ${selectedRodada}` : ' (Geral)'}`}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
              Consulte sua colocação em tempo real. Os desempates consideram maior número de <span className="text-brand-blue-vibrant font-semibold">Placar Exato (EX)</span>, maior número de <span className="text-brand-blue-vibrant font-semibold">Vencedor/Empate (VC)</span>, <span className="text-amber-500 font-semibold">Acerto Artilheiro (ART)</span> e menor índice de erros.
            </p>
          </div>
        </div>

        {/* Badges system brief summary */}
        <div className="flex items-center gap-1 bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800">
          <Star className="h-4 w-4 text-brand-blue-accent fill-brand-blue-accent" />
          <span className="text-[10px] font-black uppercase text-brand-blue-vibrant tracking-wider">RANKING AUDITADO DIARIAMENTE</span>
        </div>
      </div>

      {/* Scope Selector Controls Row */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
        
        {/* Overall Ranking Button (GERAL) */}
        <button
          type="button"
          onClick={() => {
            setActiveMode('GERAL');
            setSelectedCampeonato('all');
            setSelectedRodada('all');
            fetchFilteredRanking('all', 'all');
          }}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 select-none ${
            activeMode === 'GERAL'
              ? 'bg-brand-blue-accent text-slate-100 hover:bg-brand-blue-accent/90 shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          RANKING GERAL
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {/* Championship Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider hidden md:block">Campeonato:</label>
          <select
            value={selectedCampeonato}
            onChange={(e) => {
              const val = e.target.value as 'COPA_MUNDO' | 'LIBERTADORES' | 'BRASILEIRAO' | 'all';
              if (val === 'all') {
                setActiveMode('GERAL');
                setSelectedCampeonato('all');
                setSelectedRodada('all');
                fetchFilteredRanking('all', 'all');
              } else {
                setActiveMode('CAMPEONATO');
                setSelectedCampeonato(val);
                setSelectedRodada('all');
                fetchFilteredRanking(val, 'all');
              }
            }}
            className="px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-blue-accent hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200"
          >
            <option value="all">Filtro por Campeonato...</option>
            <option value="BRASILEIRAO">Brasileirão Série A</option>
            <option value="LIBERTADORES">Copa Libertadores</option>
            <option value="COPA_MUNDO">Copa do Mundo</option>
          </select>
        </div>

        {/* Round Selector Dropdown (Shown only when a specific Championship is active) */}
        {activeMode === 'CAMPEONATO' && selectedCampeonato !== 'all' && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="h-6 w-px bg-slate-800 hidden sm:block" />
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider hidden md:block">Rodada:</label>
            <select
              value={selectedRodada}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedRodada(val);
                fetchFilteredRanking(selectedCampeonato, val);
              }}
              className="px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-blue-accent hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200"
            >
              <option value="all">Todas as Rodadas</option>
              {availableRounds.map((rd) => (
                <option key={rd} value={rd.toString()}>Rodada {rd}</option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* Filter and query controls */}
      <div className="grid gap-3 sm:grid-cols-12 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
        
        {/* Name input filter */}
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar participante por nome no ranking filtrado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-brand-blue-accent hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* City option filter */}
        <div className="sm:col-span-4 select-wrapper">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-brand-blue-accent hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200"
          >
            <option value="TODAS">Município (Todos)</option>
            {distinctCities.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Loading overlay panel */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-slate-900/10 border border-slate-900/60 rounded-2xl">
          <div className="h-10 w-10 rounded-full border-4 border-slate-900 border-t-brand-blue-accent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-blue-accent">Buscando classificação filtrada...</p>
        </div>
      ) : (
        <>
          {/* Podium Visualization Layer */}
          {filteredUsers.length > 0 ? (
            <div className="grid gap-6 items-end justify-center md:flex max-w-4xl mx-auto py-4">
              
              {/* 2nd Place Podium */}
              {podium2nd && (
                <div className="order-2 w-full md:w-64 bg-slate-900/60 border border-slate-800/85 p-5 rounded-3xl flex flex-col items-center justify-between text-center min-h-[220px] shadow relative overflow-hidden">
                  <span className="absolute -top-3 -left-3 text-4xl opacity-10 font-bold select-none">#2</span>
                  <div className="flex flex-col items-center space-y-3">
                    <span className="text-4xl text-slate-300 drop-shadow flex items-center justify-center p-2 rounded-full border border-slate-800 bg-slate-950 h-16 w-16">
                      🥈
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{podium2nd.nome}</h3>
                      <span className="text-[10px] text-slate-400">{podium2nd.cidade}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-800/80 w-full">
                    <div className="text-lg font-black text-slate-300 font-mono leading-none">{podium2nd.pontos} Pts</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase mt-1">Cravou {podium2nd.acertos_exato} placares exatos</div>
                  </div>
                </div>
              )}

              {/* 1st Place Hero Podium */}
              {podium1st && (
                <div className="order-1 w-full md:w-72 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-brand-blue-accent/30 p-6 rounded-[2.5rem] flex flex-col items-center justify-between text-center min-h-[260px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-blue-vibrant via-brand-blue to-yellow-500" />
                  <span className="absolute -top-3 -right-3 text-5xl opacity-10 font-bold select-none text-yellow-500">🥇</span>
                  
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-full bg-yellow-500/20 blur" />
                      <span className="relative text-5xl text-yellow-400 drop-shadow flex items-center justify-center p-3 rounded-full border-2 border-yellow-500 bg-slate-950 h-20 w-20">
                        👑
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-100 flex items-center gap-1">
                        {podium1st.nome}
                        <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">{podium1st.cidade}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-900 w-full">
                    <div className="text-2xl font-black text-yellow-400 font-mono leading-none tracking-tight">{podium1st.pontos} Pts</div>
                    <div className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-wider mt-1.5">Acertou {podium1st.acertos_exato} placares perfeitos</div>
                  </div>
                </div>
              )}

              {/* 3rd Place Podium */}
              {podium3rd && (
                <div className="order-3 w-full md:w-64 bg-slate-900/60 border border-slate-800/85 p-5 rounded-3xl flex flex-col items-center justify-between text-center min-h-[200px] shadow relative overflow-hidden">
                  <span className="absolute -bottom-3 -right-3 text-4xl opacity-10 font-bold select-none">#3</span>
                  <div className="flex flex-col items-center space-y-3">
                    <span className="text-4xl text-amber-600 drop-shadow flex items-center justify-center p-2 rounded-full border border-slate-800 bg-slate-950 h-16 w-16">
                      🥉
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{podium3rd.nome}</h3>
                      <span className="text-[10px] text-slate-400">{podium3rd.cidade}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 w-full">
                    <div className="text-lg font-black text-amber-500 font-mono leading-none">{podium3rd.pontos} Pts</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase mt-1">Cravou {podium3rd.acertos_exato} placares exatos</div>
                  </div>
                </div>
              )}

            </div>
          ) : null}

          {/* Detail Classified Lists Panel */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            
            {/* Table list of other scores */}
            <section className="lg:col-span-8 space-y-3">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
                
                <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-900 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2 select-none">
                  <span className="w-8 text-center shrink-0">Pos</span>
                  <span className="flex-1">Usuário</span>
                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-3">
                      <span className="w-24 text-right hidden lg:inline text-slate-400">Cidade</span>
                      <span className="w-12 text-center text-slate-400">EX(10p)</span>
                      <span className="w-12 text-center text-slate-405">VC(4p)</span>
                      <span className="w-12 text-center text-amber-500">ART</span>
                      <span className="w-12 text-center text-slate-400">ER</span>
                    </div>
                    <div className="flex sm:hidden text-[9px] text-slate-500 mr-2">Acertos</div>
                    <span className="w-16 text-right">Pontos</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-900">
                  {usersToRender.length > 0 ? (
                    <>
                      {usersToRender.map((user, idx) => {
                        const isSelf = usuarioLogado && (
                          user.id === usuarioLogado.id || 
                          (user.nome && usuarioLogado.nome && user.nome.toLowerCase().trim() === usuarioLogado.nome.toLowerCase().trim())
                        );

                        return (
                          <div 
                            key={user.id} 
                            className={`px-4 py-3.5 flex items-center text-xs transition gap-2 ${
                              isSelf 
                                ? 'bg-brand-blue-accent/15 border-l-4 border-brand-blue-accent/90 hover:bg-brand-blue-accent/20' 
                                : 'hover:bg-slate-900/40'
                            }`}
                          >
                            
                            {/* Rank identifier column */}
                            <span className="w-8 shrink-0 text-center font-bold font-mono text-slate-300">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                            </span>

                            {/* Meta customer data / user cards */}
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                                <span className="text-sm">⚽</span>
                                <span className="truncate flex items-center gap-1.5">
                                  {user.nome}
                                  {isSelf && (
                                    <span className="text-[9px] text-yellow-400 bg-yellow-950/60 border border-yellow-800/40 px-1.5 py-0.5 rounded uppercase font-black tracking-wider shrink-0 select-none">Você</span>
                                  )}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium sm:hidden truncate">
                                {user.cidade}
                              </div>
                            </div>

                            {/* Stats responsive block */}
                            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                              <div className="hidden sm:flex items-center gap-3 font-mono">
                                <span className="w-24 text-right text-slate-400 font-sans font-medium truncate hidden lg:inline">{user.cidade}</span>
                                <span className="w-12 text-center font-bold text-yellow-500">{user.acertos_exato}</span>
                                <span className="w-12 text-center font-bold text-brand-blue-vibrant">{user.acertos_vencedor}</span>
                                <span className="w-12 text-center font-semibold text-amber-500">{user.acertos_artilheiro ?? 0}</span>
                                <span className="w-12 text-center font-bold text-red-500/80">{user.erros}</span>
                              </div>

                              <div className="flex sm:hidden flex-col items-end text-[10px] text-slate-450 mr-1.5 font-mono leading-none">
                                <div className="flex gap-1 flex-wrap justify-end">
                                  <span className="text-yellow-500 font-semibold">{user.acertos_exato}EX</span>
                                  <span className="text-slate-800">|</span>
                                  <span className="text-brand-blue-vibrant font-semibold">{user.acertos_vencedor}VC</span>
                                  <span className="text-slate-800">|</span>
                                  <span className="text-amber-500 font-semibold">{user.acertos_artilheiro ?? 0}ART</span>
                                </div>
                              </div>

                              {/* Total points */}
                              <span className="w-16 text-right font-black font-mono text-brand-blue-vibrant text-sm">
                                {user.pontos} p
                              </span>
                            </div>

                          </div>
                        );
                      })}

                      {/* Display logged-in user standing if located outside the Top 10 */}
                      {isUserBelowTop10 && loggedInUserObj && (
                        <>
                          <div className="px-4 py-2.5 bg-slate-950 text-center text-[10px] font-black text-slate-500 border-y border-slate-900 tracking-wider uppercase select-none flex items-center justify-center gap-2">
                            <span>Sua Posição no Campeonato</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-brand-blue-accent animate-pulse" />
                          </div>
                          
                          <div 
                            className="px-4 py-3.5 flex items-center text-xs transition gap-2 bg-gradient-to-r from-brand-blue-accent/15 to-slate-900/60 border-l-4 border-brand-blue-accent/90 hover:from-brand-blue-accent/20 hover:to-slate-900/80"
                          >
                            
                            {/* Rank identifier column */}
                            <span className="w-8 shrink-0 text-center font-black font-mono text-brand-blue-vibrant text-sm">
                              #{loggedInUserIndex + 1}
                            </span>

                            {/* Meta customer data / user cards */}
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                                <span className="text-sm">⭐</span>
                                <span className="truncate flex items-center gap-1.5">
                                  {loggedInUserObj.nome}
                                  <span className="text-[9px] text-yellow-400 bg-yellow-950/60 border border-yellow-800/40 px-1.5 py-0.5 rounded uppercase font-black tracking-wider shrink-0 select-none">Você</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium sm:hidden truncate">
                                {loggedInUserObj.cidade}
                              </div>
                            </div>

                            {/* Stats responsive block */}
                            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                              <div className="hidden sm:flex items-center gap-3 font-mono">
                                <span className="w-24 text-right text-slate-400 font-sans font-medium truncate hidden lg:inline">{loggedInUserObj.cidade}</span>
                                <span className="w-12 text-center font-bold text-yellow-500">{loggedInUserObj.acertos_exato}</span>
                                <span className="w-12 text-center font-bold text-brand-blue-vibrant">{loggedInUserObj.acertos_vencedor}</span>
                                <span className="w-12 text-center font-semibold text-amber-500">{loggedInUserObj.acertos_artilheiro ?? 0}</span>
                                <span className="w-12 text-center font-bold text-red-500/80">{loggedInUserObj.erros}</span>
                              </div>

                              <div className="flex sm:hidden flex-col items-end text-[10px] text-slate-450 mr-1.5 font-mono leading-none">
                                <div className="flex gap-1 flex-wrap justify-end">
                                  <span className="text-yellow-500 font-semibold">{loggedInUserObj.acertos_exato}EX</span>
                                  <span className="text-slate-800">|</span>
                                  <span className="text-brand-blue-vibrant font-semibold">{loggedInUserObj.acertos_vencedor}VC</span>
                                  <span className="text-slate-800">|</span>
                                  <span className="text-amber-500 font-semibold">{loggedInUserObj.acertos_artilheiro ?? 0}ART</span>
                                </div>
                              </div>

                              {/* Total points */}
                              <span className="w-16 text-right font-black font-mono text-brand-blue-vibrant text-sm">
                                {loggedInUserObj.pontos} p
                              </span>
                            </div>

                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="py-16 text-center text-xs text-slate-500">
                      Nenhum palpiteiro preenche os termos de filtros especificados.
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Gamification Badge definitions */}
            <section className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/40 border border-slate-850/60 rounded-2xl p-5 space-y-4 text-left">
                <h3 className="text-sm font-black uppercase text-brand-blue-accent tracking-wider">Sistema de Medalhas</h3>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Diferencial competitivo: Conquiste insígnias de honra ao realizar performances gloriosas nas rodadas da Copa.
                </p>
                
                <div className="space-y-4">
                  {LISTA_MEDALHAS.map((med) => (
                    <div key={med.id} className="flex gap-3 hover:bg-slate-900/20 p-1.5 rounded transition">
                      <span className="text-2xl pt-1 select-none" role="img" aria-label="insignia">{med.icone}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{med.nome}</h4>
                        <span className="text-[10px] text-slate-450 block mt-0.5 leading-snug">{med.descricao}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </>
      )}

    </div>
  );
}
