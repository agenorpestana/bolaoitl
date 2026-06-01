import React from 'react';
import { 
  Trophy, Award, Calendar, Users, Sliders, Play, PlusCircle, FileSpreadsheet, Shield, 
  Dribbble, LogOut, CheckCircle, Info, Heart, Smartphone, Download, Share2, X
} from 'lucide-react';

import Header from './components/Header';
import HomePublic from './components/HomePublic';
import MatchesSection from './components/MatchesSection';
import RankingSection from './components/RankingSection';
import ParticipantLogin from './components/ParticipantLogin';
import AdminPanel from './components/AdminPanel';
import GuessesHistory from './components/GuessesHistory';
import { Usuario, Jogo, Palpite } from './types';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = React.useState<string>('home');
  const [loading, setLoading] = React.useState(true);

  // Authentication states with localStorage sync to survive dev refreshes
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('bolao_token'));
  const [usuario, setUsuario] = React.useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('bolao_usuario');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Erro ao analisar dados do usuário salvo:", e);
      localStorage.removeItem('bolao_usuario');
      localStorage.removeItem('bolao_token');
      return null;
    }
  });

  const [adminToken, setAdminToken] = React.useState<string | null>(() => localStorage.getItem('bolao_admin_token'));
  const [adminLogado, setAdminLogado] = React.useState<boolean>(() => !!localStorage.getItem('bolao_admin_token'));

  // Database states
  const [jogos, setJogos] = React.useState<Jogo[]>([]);
  const [palpites, setPalpites] = React.useState<Palpite[]>([]);
  const [ranking, setRanking] = React.useState<any[]>([]);
  const [vencedoresRodadas, setVencedoresRodadas] = React.useState<any[]>([]);
  const [publicMetrics, setPublicMetrics] = React.useState<any | null>(null);
  const [pointsConfig, setPointsConfig] = React.useState<any>(null);
  const [dataServidor, setDataServidor] = React.useState<string>(new Date().toISOString());
  const [ixcOfflineMode, setIxcOfflineMode] = React.useState<boolean>(true);
  const [configsCustom, setConfigsCustom] = React.useState<any | null>(null);

  // Global flash messages
  const [alertInfo, setAlertInfo] = React.useState<{ msg: string; isErr: boolean } | null>(null);

  const showAlert = (msg: string, isErr = false) => {
    setAlertInfo({ msg, isErr });
    setTimeout(() => setAlertInfo(null), 4000);
  };

  // PWA states and install hooks
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState<boolean>(false);
  const [isIOS, setIsIOS] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect standalone mode or iOS platform
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowInstallBanner(true);
    }

    // If already launched in standalone (PWA app mode), make sure banner remains hidden
    if (isStandalone) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Sincronização dinâmica de Favicon
  React.useEffect(() => {
    if (publicMetrics?.configs_favicon?.has_custom_favicon) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = `/favicon.ico?v=${publicMetrics.configs_favicon.timestamp}`;
      }
    }
  }, [publicMetrics]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Helper to convert base64 url-safe key to UInt8 array for push manager subscription
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const [notificationPermission, setNotificationPermission] = React.useState<string>(() => {
    return 'Notification' in window ? Notification.permission : 'default';
  });

  const subscribeUserToPush = async (activeUserToken?: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("Navegador não possui suporte para notificações Web Push.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        console.warn("Permissão de notificações não foi concedida pelo usuário.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        const keyRes = await fetch("/api/notifications/vapid-public-key");
        if (!keyRes.ok) throw new Error("Chave VAPID pública indisponível.");
        const keyData = await keyRes.json();
        
        if (!keyData.publicKey) {
          console.warn("Chave pública VAPID nula retornada.");
          return;
        }

        const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }

      const headersArr: any = { "Content-Type": "application/json" };
      const tok = activeUserToken || token;
      if (tok) {
        headersArr["Authorization"] = `Bearer ${tok}`;
      }

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: headersArr,
        body: JSON.stringify({ subscription: sub })
      });

      console.log("[PWA Push] Dispositivo inscrito para receber alertas do Provedor ITLFibra.");
    } catch (err) {
      console.error("Erro ao gerenciar inscrição de notificações Web Push:", err);
    }
  };

  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted' && token) {
      subscribeUserToPush();
    }
  }, [token]);

  // Sync caches from Express API
  const refreshAppData = async () => {
    try {
      const headersArr: any = {};
      const activeUserToken = token || adminToken; // fetch guesses optionally if user/admin is logged
      if (activeUserToken) {
        headersArr["Authorization"] = `Bearer ${activeUserToken}`;
      }

      // 1. Public Metrics
      const mRes = await fetch("/api/metrics-public", { headers: headersArr });
      if (mRes.ok) {
        const mData = await mRes.json();
        setPublicMetrics(mData);
        setDataServidor(mData.data_servidor);
        if (mData.ixc_offline_mode !== undefined) {
          setIxcOfflineMode(mData.ixc_offline_mode);
        }
      }

      // 2. Rankings List
      const rRes = await fetch("/api/ranking", { headers: headersArr });
      if (rRes.ok) {
        const rData = await rRes.json();
        setRanking(rData);
      }

      // 2.5 Copa Round Winners List
      const vRes = await fetch("/api/vencedores-rodadas", { headers: headersArr });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVencedoresRodadas(vData);
      }

      // 3. Fixtures combined with User Guesses (if token available)
      const gRes = await fetch("/api/jogos", { headers: headersArr });
      if (gRes.status === 401) {
        localStorage.removeItem('bolao_token');
        localStorage.removeItem('bolao_usuario');
        localStorage.removeItem('bolao_admin_token');
        setToken(null);
        setUsuario(null);
        setAdminToken(null);
        setAdminLogado(false);
        setActiveTab('home');
        showAlert("Sua sessão expirou. Por favor, faça login novamente.", true);
        return;
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setJogos(gData.jogos);
        setPalpites(gData.palpites);
        setDataServidor(gData.data_servidor);
        if (gData.configs_points) {
          setPointsConfig(gData.configs_points);
        }
        if (gData.configs_custom) {
          setConfigsCustom(gData.configs_custom);
        }
        if (gData.usuario) {
          setUsuario(gData.usuario);
          localStorage.setItem('bolao_usuario', JSON.stringify(gData.usuario));
        }
      }

    } catch (err) {
      console.error("Erro ao sincronizar informações com servidor.", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshAppData();
    // Auto-refresh interval (polling for live sync simulation) every 30s
    const clock = setInterval(refreshAppData, 30000);
    return () => clearInterval(clock);
  }, [token, adminToken]);

  // Auth logins controllers
  const handleClientLoginSuccess = (userToken: string, userObj: Usuario) => {
    localStorage.setItem('bolao_token', userToken);
    localStorage.setItem('bolao_usuario', JSON.stringify(userObj));
    setToken(userToken);
    setUsuario(userObj);
    
    // Switch immediately to bets screen
    setActiveTab('jogos');
    showAlert(`Bem-vindo de volta, ${userObj.nome}!`);
    refreshAppData();
  };

  const handleAdminLoginSuccess = (admToken: string, admObj: any) => {
    localStorage.setItem('bolao_admin_token', admToken);
    setAdminToken(admToken);
    setAdminLogado(true);
    
    // Switch immediately to admin panel
    setActiveTab('admin');
    showAlert("Controle administrativo carregado com sucesso!");
    refreshAppData();
  };

  const handleLogout = () => {
    localStorage.removeItem('bolao_token');
    localStorage.removeItem('bolao_usuario');
    localStorage.removeItem('bolao_admin_token');
    
    setToken(null);
    setUsuario(null);
    setAdminToken(null);
    setAdminLogado(false);

    setActiveTab('home');
    showAlert("Sua sessão foi encerrada.");
  };

  // Submit client bet
  const handleSavePalpite = async (jogoId: number, placarCasa: number, placarFora: number, palpitesGolsJogadores?: any[]): Promise<boolean> => {
    if (!token) {
      showAlert("É necessário estar logado para enviar palpites.", true);
      return false;
    }

    try {
      const response = await fetch("/api/palpites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          jogo_id: jogoId,
          placar_casa: placarCasa,
          placar_fora: placarFora,
          palpites_gols_jogadores: palpitesGolsJogadores
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert(data.error || "Ocorreu um erro ao salvar o palpite.", true);
        return false;
      }

      showAlert("Palpite computado com sucesso! Boa sorte. 🎯");
      
      // Update local cache
      setPalpites(prev => {
        const cleaned = prev.filter(p => p.jogo_id !== jogoId);
        return [...cleaned, data.palpite];
      });

      // Recalculate public metric graphs
      refreshAppData();

      return true;
    } catch (err) {
      showAlert("Não foi possível alcançar o servidor do bolão.", true);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-brand-blue-accent selection:text-white relative">
      {configsCustom?.background_image && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url(${configsCustom.background_image})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
      
      {/* Dynamic Upper Custom Alerts Alert */}
      {alertInfo && (
        <div 
          id="global-alert-toast" 
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full border shadow-2xl transition duration-300 ${
            alertInfo.isErr 
              ? 'bg-red-950 border-red-500 text-red-200' 
              : 'bg-brand-blue-dark border-brand-blue-accent/60 text-slate-100'
          }`}
        >
          {alertInfo.isErr ? (
            <Info className="h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 text-brand-blue-vibrant" />
          )}
          <span className="text-xs font-black tracking-wide">{alertInfo.msg}</span>
        </div>
      )}

      {/* Main Layout Header */}
      <Header 
        usuario={usuario}
        adminLogado={adminLogado}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        configsLogo={publicMetrics?.configs_logo}
      />

      {/* PWA Installation Assist Banner */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-slate-900 via-brand-blue-dark/20 to-slate-900 border-y border-brand-blue-light/20 py-3.5 px-4 shadow-xl flex flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center justify-between text-xs font-sans relative z-40">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-950 border border-brand-blue/35 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4 text-brand-blue-vibrant animate-pulse" />
            </div>
            <div>
              <p className="font-black text-slate-100 flex items-center gap-1.5 leading-none uppercase tracking-wide">
                Baixar Aplicativo <span className="bg-brand-blue-vibrant/20 text-[9px] font-mono px-1.5 py-0.5 rounded text-brand-blue-vibrant font-black">PWA</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                Instale o Cartola ITL na tela inicial para palpitar muito mais rápido e prático no seu celular!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-auto justify-end">
            {deferredPrompt ? (
              <button
                onClick={handleInstallPWA}
                className="bg-brand-blue-vibrant hover:bg-brand-blue-accent text-slate-950 font-black px-4 py-2 rounded-lg text-xs tracking-wider uppercase transition duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-brand-blue-vibrant/20"
              >
                <Download className="h-3.5 w-3.5" /> Instalar Aplicativo 📲
              </button>
            ) : isIOS ? (
              <span className="text-[10px] sm:text-xs bg-slate-950/80 border border-slate-800 text-yellow-500 font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 shrink-0 text-yellow-500" /> No iPhone: toque em "Compartilhar" 📤 e escolha "Adicionar à Tela de Início"
              </span>
            ) : null}
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition shrink-0 ml-1"
              title="Ignorar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PWA Notifications opt-in banner */}
      {usuario && notificationPermission !== 'granted' && (
        <div className="bg-gradient-to-r from-slate-900 via-brand-blue-dark/15 to-slate-900 border-b border-brand-blue-light/10 py-3 px-4 flex flex-col md:flex-row gap-3 md:gap-0 items-start md:items-center justify-between text-xs font-sans relative z-30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-950 border border-brand-blue/30 flex items-center justify-center shrink-0">
              <span className="text-sm">🔔</span>
            </div>
            <div>
              <p className="font-extrabold text-slate-200">
                Ativar Alertas de Palpites Fechando ⚽
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Não fique de fora! Receba um alerta no celular 1 hora antes do encerramento dos palpites para não esquecer de responder!
              </p>
            </div>
          </div>
          <button
            onClick={() => subscribeUserToPush()}
            className="w-full md:w-auto bg-brand-blue-light/35 hover:bg-brand-blue-light/50 border border-brand-blue-vibrant/40 text-brand-blue-vibrant hover:text-white font-bold px-4 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer text-center"
          >
            Ativar Notificações 🔔
          </button>
        </div>
      )}

      {/* Content Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {loading ? (
          /* Elegant loading loader */
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-slate-900 border-t-brand-blue-accent animate-spin" />
              <Dribbble className="h-6 w-6 text-brand-blue-accent absolute animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-blue-accent bg-clip-text">Carregando Cartola ITL...</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Lendo tabelas ixc_usuarios, palpites e rodadas</p>
            </div>
          </div>
        ) : (
          /* Render Active Sections */
          <div className="animate-fadeIn duration-200">
            {activeTab === 'home' && (
              <HomePublic 
                onParticipateCta={() => setActiveTab(token ? 'jogos' : 'login')} 
                metrics={publicMetrics}
                jogos={jogos}
                vencedoresRodadas={vencedoresRodadas}
                usuarioLogado={usuario}
                configsCustom={configsCustom}
              />
            )}

            {activeTab === 'jogos' && (
              <MatchesSection 
                jogos={jogos} 
                palpites={palpites} 
                token={token}
                onSavePalpite={handleSavePalpite}
                onCtaLogin={() => setActiveTab('login')}
                dataServidor={dataServidor}
                pointsConfig={pointsConfig}
              />
            )}

            {activeTab === 'ranking' && (
              <RankingSection ranking={ranking} jogos={jogos} token={token} />
            )}

            {activeTab === 'historico' && usuario && (
              <GuessesHistory 
                jogos={jogos}
                palpites={palpites}
                usuarioNome={usuario.nome}
              />
            )}

            {activeTab === 'login' && (
              <ParticipantLogin 
                onLoginSuccess={handleClientLoginSuccess} 
                onAdminLoginSuccess={handleAdminLoginSuccess}
                dataServidor={dataServidor}
                ixcOfflineMode={ixcOfflineMode}
                configsCustom={configsCustom}
              />
            )}

            {activeTab === 'admin' && adminLogado && (
              <AdminPanel 
                token={adminToken} 
                onRefreshLeaderboard={refreshAppData}
              />
            )}
          </div>
        )}
      </main>

      {/* Visual platform credits footer omission */}
       <footer className="w-full bg-slate-950 border-t border-brand-blue-light/35 py-6 text-center text-xs text-slate-500 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <span className="font-extrabold text-[10px] tracking-wider uppercase text-brand-blue-vibrant bg-brand-blue-dark/50 border border-brand-blue-light/50 px-1.5 py-0.5 rounded">
              CARTOLA ITL - PROVEDOR ITLFIBRA
            </span>
            <span>© Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-slate-400">
            <span>Desenvolvido por: Agenor Pestana - ITLFIBRA ULTRA VELOCIDADE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
