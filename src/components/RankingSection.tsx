import React from 'react';
import { Search, Trophy, Medal, Star, Sparkles } from 'lucide-react';
import { LISTA_MEDALHAS } from '../data';

interface RankingRow {
  id: number;
  nome: string;
  cidade: string;
  pontos: number;
  acertos_exato: number;
  acertos_vencedor: number;
  erros: number;
  fator: number;
}

interface RankingSectionProps {
  ranking: RankingRow[];
}

export default function RankingSection({ ranking }: RankingSectionProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCity, setSelectedCity] = React.useState<string>("TODAS");

  // Get list of distinct cities available
  const distinctCities = Array.from(new Set(ranking.map(u => u.cidade))).sort();

  // Apply search filtering rules
  const filteredUsers = ranking.filter(u => {
    const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === 'TODAS' || u.cidade === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Split Top 3 leaders for podium display
  const podium1st = filteredUsers[0];
  const podium2nd = filteredUsers[1];
  const podium3rd = filteredUsers[2];
  
  // Remaining rows for normal table
  const remainingUsers = filteredUsers.slice(3);

  return (
    <div className="space-y-8 text-left">
      
      {/* Banner introduction with Trophy */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-950/60 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex gap-4 items-center">
          <div className="h-12 w-12 rounded-xl bg-yellow-400/10 border border-yellow-700/30 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Classificação Cartola ITL
              <span className="text-[10px] uppercase font-bold text-yellow-500 bg-yellow-950/40 border border-yellow-900/30 px-2 py-0.5 rounded">
                Geral
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
              Consulte sua colocação em tempo real. Os desempates consideram maior número de <span className="text-emerald-400 font-semibold">Placar Exato (X)</span>, menor índice de erro e correspondência literal de cadastro.
            </p>
          </div>
        </div>

        {/* Badges system brief summary */}
        <div className="flex items-center gap-1 bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800">
          <Star className="h-4 w-4 text-emerald-400 fill-emerald-400" />
          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">RANKING AUDITADO DIARIAMENTE</span>
        </div>
      </div>

      {/* Filter and query controls */}
      <div className="grid gap-3 sm:grid-cols-12 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
        
        {/* Name input filter */}
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar participante por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-emerald-500 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* City option filter */}
        <div className="sm:col-span-4 select-wrapper">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-emerald-500 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-200"
          >
            <option value="TODAS">Município (Todos)</option>
            {distinctCities.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>

      </div>

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
            <div className="order-1 w-full md:w-72 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-emerald-900/60 p-6 rounded-[2.5rem] flex flex-col items-center justify-between text-center min-h-[260px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-500 to-green-500" />
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
                  <span className="w-12 text-center text-slate-400">VC(4p)</span>
                  <span className="w-12 text-center text-slate-400">ER</span>
                </div>
                <div className="flex sm:hidden text-[9px] text-slate-500 mr-2">Acertos</div>
                <span className="w-16 text-right">Pontos</span>
              </div>
            </div>

            <div className="divide-y divide-slate-900">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => (
                  <div key={user.id} className="px-4 py-3.5 flex items-center text-xs hover:bg-slate-900/40 transition gap-2">
                    
                    {/* Rank identifier column */}
                    <span className="w-8 shrink-0 text-center font-bold font-mono text-slate-300">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                    </span>

                    {/* Meta customer data / user cards */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <span className="text-sm">⚽</span>
                        <span className="truncate">{user.nome}</span>
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
                        <span className="w-12 text-center font-bold text-emerald-400">{user.acertos_vencedor}</span>
                        <span className="w-12 text-center font-bold text-red-500/80">{user.erros}</span>
                      </div>

                      <div className="flex sm:hidden flex-col items-end text-[10px] text-slate-450 mr-1.5 font-mono leading-none">
                        <div className="flex gap-1.5">
                          <span className="text-yellow-500 font-semibold">{user.acertos_exato}EX</span>
                          <span>|</span>
                          <span className="text-emerald-400 font-semibold">{user.acertos_vencedor}VC</span>
                        </div>
                      </div>

                      {/* Total points */}
                      <span className="w-16 text-right font-black font-mono text-emerald-400 text-sm">
                        {user.pontos} p
                      </span>
                    </div>

                  </div>
                ))
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
            <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">Sistema de Medalhas</h3>
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

    </div>
  );
}
