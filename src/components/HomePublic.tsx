import React from 'react';
import { 
  Award, BookOpen, Gift, Users, Target, ChevronRight, Hourglass, ShieldCheck, Zap
} from 'lucide-react';
import { REGRAS_PROG, PREMIACOES } from '../data';
import { Jogo, ConfigCustom } from '../types';
import { getFriendlyRoundName, getGameCampeonato } from './MatchesSection';

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
  vencedoresRodadas?: any[];
  usuarioLogado?: { id: number; nome: string } | null;
  configsCustom?: ConfigCustom | null;
}

export default function HomePublic({ 
  onParticipateCta, 
  metrics, 
  jogos,
  vencedoresRodadas = [],
  usuarioLogado = null,
  configsCustom = null
}: HomePublicProps) {
  // Real countdown to June 11th 2026 20:00:00 UTC
  const targetDate = new Date("2026-06-11T20:00:00Z");
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  const matchHighlights = React.useMemo(() => {
    const dataServidorStr = metrics?.data_servidor || new Date().toISOString();
    const nowMs = new Date(dataServidorStr).getTime();

    // Helper to check if a single game is concluded/expired
    const isGameConcludedOrExpired = (j: Jogo): boolean => {
      if (j.status === 'ENCERRADO') return true;
      if (['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'].includes(j.status_detalhado || '')) return true;
      
      const gameMs = new Date(j.data_jogo).getTime();
      const idUpper = (j.status_detalhado || '').toUpperCase();
      const isExplicitLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'SUSP', 'INT'].includes(idUpper) || j.status === 'AO_VIVO';
      
      // Postponed/abandoned/canceled matches in the past are considered concluded/not blocking for round calculation
      if (['PST', 'CANX', 'ABD', 'CANC', 'SUSP'].includes(idUpper)) {
        return true;
      }

      if (gameMs < nowMs && !isExplicitLive) {
        return true;
      }

      if (gameMs <= nowMs && !isExplicitLive) {
        const elapsedMins = (nowMs - gameMs) / (1000 * 60);
        if (elapsedMins >= 135) {
          return true;
        }
      }
      return false;
    };

    // Helper to calculate current active round for any given list of games
    const getChampionshipCurrentRound = (championshipJogos: Jogo[]): number | null => {
      if (championshipJogos.length === 0) return null;
      
      const rounds = Array.from(new Set(championshipJogos.map(g => g.rodada)))
        .sort((a, b) => Number(a) - Number(b));
        
      const currentActive = rounds.find(rdNum => {
        const matchesInRd = championshipJogos.filter(j => j.rodada === rdNum);
        // Is this round finished? A round is finished if ALL its matches are concluded
        const isRdFinished = matchesInRd.length > 0 && matchesInRd.every(j => isGameConcludedOrExpired(j));
        return !isRdFinished;
      });

      return currentActive !== undefined ? currentActive : (rounds.length > 0 ? rounds[rounds.length - 1] : null);
    };

    // Group games by championship and find current round for each
    const copaGames = (jogos || []).filter(j => getGameCampeonato(j) === 'COPA_MUNDO');
    const libGames = (jogos || []).filter(j => getGameCampeonato(j) === 'LIBERTADORES');
    const brasGames = (jogos || []).filter(j => getGameCampeonato(j) === 'BRASILEIRAO');

    const copaCurrentRound = getChampionshipCurrentRound(copaGames);
    const libCurrentRound = getChampionshipCurrentRound(libGames);
    const brasCurrentRound = getChampionshipCurrentRound(brasGames);

    // Normalize Server date to start of today local to avoid timezone leaks
    const now = new Date(dataServidorStr);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Now, filter pending games that are within those current rounds AND do NOT have a date in the past
    const pendingAndValidHighlights = (jogos || []).filter(j => {
      // Must be PENDENTE
      if (j.status !== 'PENDENTE') return false;

      // Must NOT be explicit postponed/cancelled
      const statusDet = (j.status_detalhado || '').toUpperCase();
      if (['PST', 'CANX', 'ABD', 'CANC', 'SUSP'].includes(statusDet)) return false;

      // Must NOT have a date prior to today (yesterday or older)
      const gameDate = new Date(j.data_jogo);
      const gameMs = gameDate.getTime();
      if (gameMs < todayMidnight) return false;

      // Must be of the current/active round of its championship
      const champ = getGameCampeonato(j);
      if (champ === 'COPA_MUNDO') {
        return j.rodada === copaCurrentRound;
      } else if (champ === 'LIBERTADORES') {
        return j.rodada === libCurrentRound;
      } else if (champ === 'BRASILEIRAO') {
        return j.rodada === brasCurrentRound;
      }
      return false;
    });

    // Let's sort highlights by kickoff date so that the closest games appear first!
    return pendingAndValidHighlights
      .sort((a, b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime())
      .slice(0, 3);
  }, [jogos, metrics]);

  const liveMatches = React.useMemo(() => {
    const dataServidor = metrics?.data_servidor || new Date().toISOString();
    return (jogos || []).filter(jogo => {
      if (jogo.status === 'AO_VIVO') return true;
      if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "SUSP", "INT"].includes(jogo.status_detalhado || '')) return true;
      
      const nowMs = new Date(dataServidor).getTime();
      const gameMs = new Date(jogo.data_jogo).getTime();
      const isPastGame = gameMs <= nowMs;
      
      if (jogo.status === 'PENDENTE' && isPastGame) {
        const elapsedMins = (nowMs - gameMs) / (1000 * 60);
        return elapsedMins < 135; // Keep live for 2h 15m from kickoff
      }
      return false;
    });
  }, [jogos, metrics]);

  // Find rounds where this user won (was the 1st place)
  const rodadasGanhas = React.useMemo(() => {
    if (!usuarioLogado || !vencedoresRodadas) return [];
    return vencedoresRodadas
      .filter((r: any) => {
        const winner = r.vencedores?.find((w: any) => w.posicao === 1);
        return winner && Number(winner.id) === Number(usuarioLogado.id);
      })
      .map((r: any) => r.rodada);
  }, [vencedoresRodadas, usuarioLogado]);

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

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-12">
      {/* Craque da Rodada Celebratory Banner */}
      {rodadasGanhas.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/15 via-blue-500/10 to-yellow-500/15 border border-yellow-500/40 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl animate-fadeIn">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.12),transparent_70%)] animate-pulse" />
          <div className="relative z-10 flex flex-col items-center space-y-2">
            <span className="text-4xl animate-bounce">🏆</span>
            <h2 className="text-xl md:text-2xl font-black text-yellow-400 uppercase tracking-tight">
              Parabéns! Você foi o craque da rodada!
            </h2>
            <p className="text-xs md:text-sm text-slate-200 max-w-xl leading-relaxed">
              Você conquistou ou liderou o <strong className="text-yellow-400">1º Lugar</strong> na <strong className="text-brand-blue-vibrant">{rodadasGanhas.map(r => `Rodada ${r}`).join(", ")}</strong> da Copa do Mundo com uma pontuação espetacular!
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1.5 bg-yellow-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-full shadow-md">
                Prêmio: 1 Mês de Internet Grátis + Brinde
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Hero Banner Segment */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 border border-brand-blue-light/50 shadow-2xl">
        {/* Visual green grass ambient mesh effect */}
        <div className="absolute inset-x-0 -bottom-32 -top-10 bg-[radial-gradient(circle_at_bottom_left,rgba(15,7,77,0.35),transparent_50%)]" />
        <div className="absolute inset-x-0 -top-32 -bottom-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_40%)]" />

        <div className="relative px-6 py-12 md:py-20 md:px-12 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue-dark/80 border border-brand-blue-accent/30 text-xs font-bold uppercase tracking-wider text-brand-blue-vibrant">
            <Zap className="h-3.5 w-3.5 text-yellow-500" /> EXCLUSIVO PARA CLIENTES DO PROVEDOR
          </div>

          {configsCustom?.ad_image && (
            <div className="w-full max-w-lg mx-auto overflow-hidden rounded-2xl border border-brand-blue-light/35 shadow-xl animate-fadeIn">
              <img 
                src={configsCustom.ad_image} 
                alt="Propaganda" 
                className="w-full h-auto object-cover max-h-[300px]"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100">
            {configsCustom?.header_title_1 || "CARTOLA ITL"} <br />
            <span className="bg-gradient-to-r from-brand-blue-vibrant via-blue-400 to-yellow-500 bg-clip-text text-transparent text-3xl md:text-5xl block mt-2 animate-pulse">
              {configsCustom?.header_title_2 || "PROVEDOR ITLFIBRA"}
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {configsCustom?.header_description || "Mostre suas habilidades de palpite, crave placares exatos das maiores seleções e dispute um ano de internet grátis, TVs, consoles de última geração e prêmios incríveis!"}
          </p>

          {/* Countdown Clock */}
          <div className="flex justify-center gap-3 md:gap-5 py-4">
            {[
              { label: 'Dias', val: timeLeft.days },
              { label: 'Horas', val: timeLeft.hours },
              { label: 'Mins', val: timeLeft.mins },
              { label: 'Segs', val: timeLeft.secs },
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col items-center bg-slate-900/95 border border-brand-blue-light/40 rounded-2xl p-3 min-w-[70px] md:min-w-[90px] shadow-lg">
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
              className="group flex items-center justify-center gap-2.5 px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-brand-blue-accent to-brand-blue hover:scale-[1.02] text-white font-extrabold rounded-xl shadow-lg shadow-brand-blue-accent/10 active:scale-95 transition-all cursor-pointer text-base"
            >
              Participar Agora Grátis
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#premios-regras"
              className="text-xs font-semibold text-slate-300 hover:text-brand-blue-vibrant border border-slate-800 hover:bg-slate-900 px-5 py-3 rounded-xl transition"
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
              <div id="metric-bets-count" className="text-xl md:text-2xl font-black text-brand-blue-vibrant font-mono">{metrics?.total_palpites ?? 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Palpites Feitos</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-xl md:text-2xl font-black text-yellow-500 font-mono">100%</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Gratuito</div>
            </div>
          </div>

        </div>
      </section>

      {/* Live Matches Panel */}
      {liveMatches.length > 0 && (
        <section className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Partidas em Andamento (Ao Vivo)
            </h2>
            <button 
              onClick={onParticipateCta} 
              className="text-xs font-bold text-red-400 hover:underline flex items-center gap-1"
            >
              Ver palpites & estatísticas
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((jogo) => {
              const friendlyStatus = jogo.status_detalhado === "1H" ? "1º Tempo" 
                : jogo.status_detalhado === "2H" ? "2º Tempo" 
                : jogo.status_detalhado === "HT" ? "Intervalo" 
                : jogo.status_detalhado === "ET" ? "Prorrogação" 
                : jogo.status_detalhado === "P" ? "Pênaltis" 
                : "Em Andamento";

              return (
                <div 
                  key={jogo.id} 
                  className="bg-slate-900 border border-red-900/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-red-950/10 cursor-pointer hover:border-red-500/50 transition-all duration-200"
                  onClick={onParticipateCta}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1.5 bg-red-600 border border-red-500 text-white px-2.5 py-0.5 rounded font-sans font-black tracking-wide shadow-sm shadow-red-950/20">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-100 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                      AO VIVO • {friendlyStatus}
                    </span>
                    <span className="bg-red-950/60 text-red-400 px-2.5 py-0.5 rounded border border-red-900/40 font-mono">
                      Pontuação em Tempo Real
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    {/* Home Team */}
                    <div className="flex flex-col items-center flex-1 text-center space-y-1.5 min-w-[70px]">
                      {renderBandeira(jogo.time_casa_bandeira, "w-10 h-10 shadow", "text-3xl")}
                      <span className="text-xs font-bold text-slate-150 truncate max-w-[90px]">
                        {jogo.time_casa}
                      </span>
                    </div>

                    {/* Scores display */}
                    <div className="flex items-center gap-3 bg-slate-950/90 px-4 sm:px-5 py-2 rounded-xl border border-slate-800/80 shadow-inner">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">{jogo.placar_casa ?? 0}</span>
                      <span className="text-red-500 font-bold text-xs sm:text-sm animate-pulse px-1">X</span>
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">{jogo.placar_fora ?? 0}</span>
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center flex-1 text-center space-y-1.5 min-w-[70px]">
                      {renderBandeira(jogo.time_fora_bandeira, "w-10 h-10 shadow", "text-3xl")}
                      <span className="text-xs font-bold text-slate-150 truncate max-w-[90px]">
                        {jogo.time_fora}
                      </span>
                    </div>
                  </div>

                  <div className="text-center font-mono text-[9px] text-slate-500 bg-slate-950/40 py-1.5 rounded tracking-wide border border-slate-950/20">
                    Rodada {jogo.rodada} • {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Highlights: Próximos Jogos */}
      {matchHighlights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-brand-blue-accent" />
              Jogos em Destaque
            </h2>
            <button 
              id="cta-view-all-games"
              onClick={onParticipateCta} 
              className="text-xs font-bold text-brand-blue-vibrant hover:underline"
            >
              Palpitar nestes jogos
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {matchHighlights.map((jogo) => (
              <div 
                key={jogo.id} 
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-brand-blue-light transition"
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>{getFriendlyRoundName(jogo.rodada)}</span>
                  <span className="bg-brand-blue/80 text-brand-blue-vibrant px-2 py-0.5 rounded border border-brand-blue-accent/20 font-mono">
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
          <div className="h-6 w-1.5 rounded-full bg-brand-blue-accent" />
          <h2 className="text-xl font-bold text-slate-100">Grupos Oficiais - Copa do Mundo 2026</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {COPA_GROUPS.map((group, gIdx) => (
            <div 
              key={gIdx} 
              className="bg-slate-900/55 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-md hover:border-brand-blue-accent/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-brand-blue-vibrant font-mono">
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
              className="text-xs font-bold text-brand-blue-vibrant hover:underline"
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
                    <span className="w-16 text-right font-black font-mono text-brand-blue-vibrant">{top.pontos} p</span>
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
              <BookOpen className="h-5 w-5 text-brand-blue-accent" />
              Critérios de Funcionamento
            </h2>
            <div className="space-y-3">
              {(configsCustom?.regras || REGRAS_PROG).map((reg) => (
                <div key={reg.id} className="flex gap-3 text-left">
                  <div className="flex h-5 w-5 mt-0.5 shrink-0 items-center justify-center rounded-md bg-brand-blue-dark text-[10px] font-bold text-brand-blue-vibrant border border-brand-blue-light/50">
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
              {(configsCustom?.premiacoes || PREMIACOES).map((prem, idx) => (
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

          {/* Winners of Each Round Section */}
          {vencedoresRodadas && vencedoresRodadas.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Award className="h-5 w-5 text-brand-blue-accent" />
                Ganhadores das Rodadas
              </h2>
              <div className="space-y-3">
                {vencedoresRodadas.map((r: any) => (
                  <div 
                    key={r.rodada} 
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-left space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-xs font-black uppercase text-brand-blue-vibrant tracking-wider">
                        {getFriendlyRoundName(r.rodada, 'COPA_MUNDO')}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                        r.status === 'ENCERRADO' 
                          ? 'bg-slate-950/80 border border-slate-800 text-slate-400' 
                          : 'bg-blue-950/50 border border-brand-blue-accent/30 text-brand-blue-vibrant animate-pulse'
                      }`}>
                        {r.status === 'ENCERRADO' ? 'Finalizado' : 'Em Andamento'}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 pt-1">
                      {r.vencedores && r.vencedores.length > 0 ? (
                        r.vencedores.map((v: any) => {
                          const isUserWinner = usuarioLogado && Number(usuarioLogado.id) === Number(v.id);
                          return (
                            <div 
                              key={v.posicao} 
                              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                                isUserWinner
                                  ? 'bg-brand-blue-dark/60 border-brand-blue-accent/60 shadow shadow-brand-blue-accent/15'
                                  : 'bg-slate-950/40 border-slate-800/80'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {v.posicao === 1 ? "🥇 1º Lugar" : v.posicao === 2 ? "🥈 2º Lugar" : "🥉 3º Lugar"}
                                  </span>
                                  {isUserWinner && (
                                    <span className="text-[9px] bg-yellow-500 text-slate-950 px-1 rounded font-extrabold uppercase animate-bounce">VOCÊ!</span>
                                  )}
                                </div>
                                <p className="text-xs font-black text-slate-200 mt-1 truncate">
                                  {v.nome}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{v.cidade}</p>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-slate-850/60 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-400 font-sans">Pontos:</span>
                                <span className="font-bold text-brand-blue-vibrant">{v.pontos} p</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 col-span-3 py-2 text-center">Aguardando palpites calculados.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </div>

      {/* Integration highlight banner */}
      <section className="bg-slate-950 border border-brand-blue-light/35 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        <div className="flex gap-4 items-center">
          <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-brand-blue-accent" />
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
          className="px-5 py-3 bg-brand-blue hover:bg-brand-blue-light text-brand-blue-vibrant text-xs font-bold rounded-lg border border-brand-blue-accent/30 active:scale-95 transition"
        >
          Validar meu Contrato agora
        </button>
      </section>

    </div>
  );
}
