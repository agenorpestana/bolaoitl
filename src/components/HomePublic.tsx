import React from 'react';
import { 
  Award, BookOpen, Gift, Users, Target, ChevronRight, Hourglass, ShieldCheck, Zap
} from 'lucide-react';
import { REGRAS_PROG, PREMIACOES } from '../data';
import { Jogo } from '../types';

interface HomePublicProps {
  onParticipateCta: () => void;
  metrics: {
    total_usuarios: number;
    total_palpites: number;
    top_10: any[];
    data_servidor: string;
  } | null;
  jogos: Jogo[];
}

export default function HomePublic({ onParticipateCta, metrics, jogos }: HomePublicProps) {
  // Simulating countdown to 11th June 2026
  const [timeLeft, setTimeLeft] = React.useState({ days: 17, hours: 5, mins: 38, secs: 15 });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter 3 closest matches
  const matchHighlights = jogos
    .filter(g => g.status === 'PENDENTE')
    .slice(0, 3);

  return (
    <div className="space-y-12 pb-16">
      
      {/* Dynamic Hero Banner Segment */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 border border-emerald-900/40 shadow-2xl">
        {/* Visual green grass ambient mesh effect */}
        <div className="absolute inset-x-0 -bottom-32 -top-10 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_50%)]" />
        <div className="absolute inset-x-0 -top-32 -bottom-10 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.06),transparent_40%)]" />

        <div className="relative px-6 py-12 md:py-20 md:px-12 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/40 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Zap className="h-3.5 w-3.5 text-yellow-500" /> EXCLUSIVO PARA CLIENTES DO PROVEDOR
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100">
            Bolão da Copa <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-yellow-400 bg-clip-text text-transparent">
              Mundial de 2026
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Mostre suas habilidades de palpite, crave placares exatos das maiores seleções e dispute 
            um ano de internet grátis, TVs, consoles de última geração e prêmios incríveis!
          </p>

          {/* Countdown Clock */}
          <div className="flex justify-center gap-3 md:gap-5 py-4">
            {[
              { label: 'Dias', val: timeLeft.days },
              { label: 'Horas', val: timeLeft.hours },
              { label: 'Mins', val: timeLeft.mins },
              { label: 'Segs', val: timeLeft.secs },
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col items-center bg-slate-900/95 border border-emerald-900/30 rounded-2xl p-3 min-w-[70px] md:min-w-[90px] shadow-lg">
                <span className="text-2xl md:text-4xl font-black text-yellow-400 font-mono tracking-tight">
                  {col.val.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Core Action Call-To-Action */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-3">
            <button
              id="hero-participate-cta"
              onClick={onParticipateCta}
              className="group flex items-center justify-center gap-2.5 px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer text-base"
            >
              Participar Agora Grátis
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#premios-regras"
              className="text-xs font-semibold text-slate-300 hover:text-emerald-400 border border-slate-800 hover:bg-slate-900 px-5 py-3 rounded-xl transition"
            >
              Ver Premiações e Regras
            </a>
          </div>

          {/* Platform Performance Metrics Badges */}
          <div className="grid grid-cols-3 divide-x divide-slate-900 pt-8 border-t border-slate-900 max-w-lg mx-auto">
            <div className="px-2 text-center">
              <div id="metric-clients-count" className="text-xl md:text-2xl font-black text-slate-100 font-mono">{metrics?.total_usuarios || 342}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Competidores</div>
            </div>
            <div className="px-2 text-center">
              <div id="metric-bets-count" className="text-xl md:text-2xl font-black text-emerald-400 font-mono">{metrics?.total_palpites || 1482}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Palpites Feitos</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-xl md:text-2xl font-black text-yellow-500 font-mono">100%</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Gratuito</div>
            </div>
          </div>

        </div>
      </section>

      {/* Highlights: Próximos Jogos */}
      {matchHighlights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-emerald-400" />
              Jogos em Destaque
            </h2>
            <button 
              id="cta-view-all-games"
              onClick={onParticipateCta} 
              className="text-xs font-bold text-emerald-400 hover:underline"
            >
              Palpitar nestes jogos
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {matchHighlights.map((jogo) => (
              <div 
                key={jogo.id} 
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-emerald-950 transition"
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Rodada {jogo.rodada}</span>
                  <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40">
                    Aberto
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-2xl" role="img" aria-label="flag">{jogo.time_casa_bandeira}</span>
                    <span className="text-xs font-semibold text-slate-200 mt-1 truncate text-center max-w-[80px]">
                      {jogo.time_casa}
                    </span>
                  </div>
                  
                  <span className="text-slate-500 text-xs font-black">VS</span>

                  <div className="flex flex-col items-center flex-1">
                    <span className="text-2xl" role="img" aria-label="flag">{jogo.time_fora_bandeira}</span>
                    <span className="text-xs font-semibold text-slate-200 mt-1 truncate text-center max-w-[80px]">
                      {jogo.time_fora}
                    </span>
                  </div>
                </div>

                <div className="text-center font-mono text-[10px] text-slate-400 bg-slate-950/60 py-1 rounded">
                  {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ranking Geral Preview & Rules Split Layout */}
      <div id="premios-regras" className="grid gap-8 lg:grid-cols-12 items-start">
        
        {/* Left column: Leaderboard public layout */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Líderes Atuais (Top 10)
            </h2>
            <button 
              id="cta-ranking-tab"
              onClick={() => onParticipateCta()} 
              className="text-xs font-bold text-emerald-400 hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-900 text-[10px] font-bold uppercase text-slate-400 flex">
              <span className="w-10">Pos</span>
              <span className="flex-1">Participante</span>
              <span className="w-20 text-right">Cidade</span>
              <span className="w-16 text-right">Pontos</span>
            </div>

            <div className="divide-y divide-slate-900 max-h-[440px] overflow-y-auto">
              {metrics?.top_10 && metrics.top_10.length > 0 ? (
                metrics.top_10.map((top, idx) => (
                  <div key={idx} className="px-4 py-3.5 flex items-center text-sm hover:bg-slate-900/40 transition">
                    <span className="w-10 font-bold font-mono text-slate-400 flex items-center gap-1">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${top.posicao}º`}
                    </span>
                    <span className="flex-1 flex items-center gap-2">
                      <span className="text-base">{top.avatar || "⚽"}</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[140px]">{top.nome}</span>
                    </span>
                    <span className="w-20 text-right text-xs text-slate-400 truncate">{top.cidade}</span>
                    <span className="w-16 text-right font-black font-mono text-emerald-400">{top.pontos} p</span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Nenhum pontuador cadastrado ainda. Seja o primeiro!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right column: Rules / Criteria list */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Rules Card */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              Critérios de Funcionamento
            </h2>
            <div className="space-y-3">
              {REGRAS_PROG.map((reg) => (
                <div key={reg.id} className="flex gap-3 text-left">
                  <div className="flex h-5 w-5 mt-0.5 shrink-0 items-center justify-center rounded-md bg-emerald-950 text-[10px] font-bold text-emerald-300 border border-emerald-900">
                    {reg.id}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{reg.titulo}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{reg.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prizes Catalog cards */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-500" />
              Prêmios para a Competição
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {PREMIACOES.map((prem, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between text-left relative overflow-hidden group shadow-md"
                >
                  <div className="absolute top-0 right-0 h-12 w-12 bg-yellow-500/5 rounded-bl-full group-hover:bg-yellow-500/10 transition" />
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-yellow-500 font-mono tracking-widest">{prem.posicao}</h4>
                    <p className="text-xs font-bold text-slate-150 mt-1 leading-snug line-clamp-2">{prem.premio}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-3 border-t border-slate-800/80 pt-2 block">
                    {prem.detalhes}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>

      </div>

      {/* Integration highlight banner */}
      <section className="bg-slate-950 border border-slate-900 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        <div className="flex gap-4 items-center">
          <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Integração Direta com Provedor</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
              Sistema verificado automatizado via API IXC Soft. Clientes com fatura em dia entram мгновенно, 
              sem burocracias de senhas complexas ou inscrições pagas.
            </p>
          </div>
        </div>
        <button
          id="btn-trigger-register"
          onClick={onParticipateCta}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-850 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-900/60 active:scale-95 transition"
        >
          Validar meu Contrato agora
        </button>
      </section>

    </div>
  );
}
