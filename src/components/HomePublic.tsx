import React from 'react';
import { 
  Award, BookOpen, Gift, Users, Target, ChevronRight, Hourglass, ShieldCheck, Zap
} from 'lucide-react';
import { REGRAS_PROG, PREMIACOES } from '../data';
import { Jogo } from '../types';

const flagEmojiToIso = (flag: string): string | null => {
  if (!flag) return null;
  if (flag.includes("🏴󠁧󠁢󠁥󠁮󠁧󠁿") || flag === "🏴󠁧󠁢󠁥󠁮󠁧󠁿") return "gb-eng";
  if (flag.includes("🏴󠁧󠁢󠁳󠁣󠁴󠁿") || flag === "🏴󠁧󠁢󠁳󠁣󠁴󠁿") return "gb-sct";
  if (flag.includes("🏴󠁧󠁢󠁷󠁬󠁳󠁿") || flag === "🏴󠁧󠁢󠁷󠁬󠁳󠁿") return "gb-wls";

  const chars = Array.from(flag);
  if (chars.length >= 2) {
    const codePoint1 = chars[0].codePointAt(0);
    const codePoint2 = chars[1].codePointAt(0);
    if (codePoint1 && codePoint2) {
      if (codePoint1 >= 127462 && codePoint1 <= 127487 && codePoint2 >= 127462 && codePoint2 <= 127487) {
        const char1 = String.fromCharCode(codePoint1 - 127462 + 65);
        const char2 = String.fromCharCode(codePoint2 - 127462 + 65);
        return (char1 + char2).toLowerCase();
      }
    }
  }
  return null;
};

export const renderBandeira = (flag: string | undefined, sizeClass: string = "w-6 h-6", textClass: string = "text-2xl") => {
  if (!flag) return <span className={textClass}>🏳️</span>;
  if (flag.startsWith("http://") || flag.startsWith("https://")) {
    return (
      <img 
        src={flag} 
        alt="Bandeira" 
        className={`${sizeClass} object-contain rounded-sm inline-block`} 
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://images.api-sports.io/flags/default.png`;
        }}
      />
    );
  }

  const iso = flagEmojiToIso(flag);
  if (iso) {
    return (
      <img 
        src={`https://flagcdn.com/w80/${iso}.png`} 
        alt="Bandeira" 
        className={`${sizeClass} object-contain rounded-sm inline-block shadow-sm`} 
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://images.api-sports.io/flags/default.png`;
        }}
      />
    );
  }

  return <span className={textClass} role="img" aria-label="flag">{flag}</span>;
};


const COPA_GROUPS = [
  {
    name: "Grupo A",
    teams: [
      { name: "México", flag: "🇲🇽" },
      { name: "África do Sul", flag: "🇿🇦" },
      { name: "Coreia do Sul", flag: "🇰🇷" },
      { name: "Rep. Tcheca", flag: "🇨🇿" }
    ]
  },
  {
    name: "Grupo B",
    teams: [
      { name: "Canadá", flag: "🇨🇦" },
      { name: "Bósnia", flag: "🇧🇦" },
      { name: "Qatar", flag: "🇶🇦" },
      { name: "Suíça", flag: "🇨🇭" }
    ]
  },
  {
    name: "Grupo C",
    teams: [
      { name: "Brasil", flag: "🇧🇷" },
      { name: "Marrocos", flag: "🇲🇦" },
      { name: "Haiti", flag: "🇭🇹" },
      { name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" }
    ]
  },
  {
    name: "Grupo D",
    teams: [
      { name: "EUA", flag: "🇺🇸" },
      { name: "Paraguai", flag: "🇵🇾" },
      { name: "Austrália", flag: "🇦🇺" },
      { name: "Turquia", flag: "🇹🇷" }
    ]
  },
  {
    name: "Grupo E",
    teams: [
      { name: "Alemanha", flag: "🇩🇪" },
      { name: "Curaçao", flag: "🇨🇼" },
      { name: "Costa do Marfim", flag: "🇨🇮" },
      { name: "Equador", flag: "🇪🇨" }
    ]
  },
  {
    name: "Grupo F",
    teams: [
      { name: "Holanda", flag: "🇳🇱" },
      { name: "Japão", flag: "🇯🇵" },
      { name: "Suécia", flag: "🇸🇪" },
      { name: "Tunísia", flag: "🇹🇳" }
    ]
  },
  {
    name: "Grupo G",
    teams: [
      { name: "Bélgica", flag: "🇧🇪" },
      { name: "Egito", flag: "🇪🇬" },
      { name: "Irã", flag: "🇮🇷" },
      { name: "N. Zelândia", flag: "🇳🇿" }
    ]
  },
  {
    name: "Grupo H",
    teams: [
      { name: "Espanha", flag: "🇪🇸" },
      { name: "Cabo Verde", flag: "🇨🇻" },
      { name: "Arábia Saudita", flag: "🇸🇦" },
      { name: "Uruguai", flag: "🇺🇾" }
    ]
  },
  {
    name: "Grupo I",
    teams: [
      { name: "França", flag: "🇫🇷" },
      { name: "Senegal", flag: "🇸🇳" },
      { name: "Iraque", flag: "🇮🇶" },
      { name: "Noruega", flag: "🇳🇴" }
    ]
  },
  {
    name: "Grupo J",
    teams: [
      { name: "Argentina", flag: "🇦🇷" },
      { name: "Argélia", flag: "🇩🇿" },
      { name: "Áustria", flag: "🇦🇹" },
      { name: "Jordânia", flag: "🇯🇴" }
    ]
  },
  {
    name: "Grupo K",
    teams: [
      { name: "Portugal", flag: "🇵🇹" },
      { name: "RD Congo", flag: "🇨🇩" },
      { name: "Uzbequistão", flag: "🇺🇿" },
      { name: "Colômbia", flag: "🇨🇴" }
    ]
  },
  {
    name: "Grupo L",
    teams: [
      { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { name: "Croácia", flag: "🇭🇷" },
      { name: "Gana", flag: "🇬🇭" },
      { name: "Panamá", flag: "🇵🇦" }
    ]
  }
];

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
  // Real countdown to June 11th 2026 20:00:00 UTC
  const targetDate = new Date("2026-06-11T20:00:00Z");
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference <= 0) {
        return { days: 0, hours: 0, mins: 0, secs: 0 };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        mins: Math.floor((difference / 1000 / 60) % 60),
        secs: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter 3 closest matches, excluding Copa Libertadores
  const matchHighlights = jogos
    .filter(g => g.status === 'PENDENTE' && (!g.api_id || !g.api_id.startsWith("libertadores_")))
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
            CARTOLA ITL <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-yellow-400 bg-clip-text text-transparent text-3xl md:text-5xl block mt-2">
              PROVEDOR ITLFIBRA
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
              <div id="metric-clients-count" className="text-xl md:text-2xl font-black text-slate-100 font-mono">{metrics?.total_usuarios ?? 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Competidores</div>
            </div>
            <div className="px-2 text-center">
              <div id="metric-bets-count" className="text-xl md:text-2xl font-black text-emerald-400 font-mono">{metrics?.total_palpites ?? 0}</div>
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
                    {renderBandeira(jogo.time_casa_bandeira, "w-8 h-8", "text-2xl")}
                    <span className="text-xs font-semibold text-slate-200 mt-1 truncate text-center max-w-[80px]">
                      {jogo.time_casa}
                    </span>
                  </div>
                  
                  <span className="text-slate-500 text-xs font-black">VS</span>

                  <div className="flex flex-col items-center flex-1">
                    {renderBandeira(jogo.time_fora_bandeira, "w-8 h-8", "text-2xl")}
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

      {/* Grupos Oficiais Copa 2026 Grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-xl font-bold text-slate-100">Grupos Oficiais - Copa do Mundo 2026</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {COPA_GROUPS.map((group, gIdx) => (
            <div 
              key={gIdx} 
              className="bg-slate-900/55 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-md hover:border-emerald-600/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                  {group.name}
                </span>
                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800/80 text-slate-400 font-mono">
                  Fase de Grupos
                </span>
              </div>
              <ul className="space-y-2">
                {group.teams.map((team, tIdx) => (
                  <li 
                    key={tIdx} 
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 border border-transparent hover:border-slate-800/80 transition duration-150"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {renderBandeira(team.flag, "w-6 h-6", "text-sm")}
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {team.name}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

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
