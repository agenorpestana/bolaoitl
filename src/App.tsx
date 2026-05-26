import React from 'react';
import { 
  Trophy, Award, Calendar, Users, Sliders, Play, PlusCircle, FileSpreadsheet, Shield, 
  Dribbble, LogOut, CheckCircle, Info, Heart
} from 'lucide-react';

import Header from './components/Header';
import HomePublic from './components/HomePublic';
import MatchesSection from './components/MatchesSection';
import RankingSection from './components/RankingSection';
import ParticipantLogin from './components/ParticipantLogin';
import AdminPanel from './components/AdminPanel';
import { Usuario, Jogo, Palpite } from './types';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = React.useState<string>('home');
  const [loading, setLoading] = React.useState(true);

  // Authentication states with localStorage sync to survive dev refreshes
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('bolao_token'));
  const [usuario, setUsuario] = React.useState<Usuario | null>(() => {
    const saved = localStorage.getItem('bolao_usuario');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminToken, setAdminToken] = React.useState<string | null>(() => localStorage.getItem('bolao_admin_token'));
  const [adminLogado, setAdminLogado] = React.useState<boolean>(() => !!localStorage.getItem('bolao_admin_token'));

  // Database states
  const [jogos, setJogos] = React.useState<Jogo[]>([]);
  const [palpites, setPalpites] = React.useState<Palpite[]>([]);
  const [ranking, setRanking] = React.useState<any[]>([]);
  const [publicMetrics, setPublicMetrics] = React.useState<any | null>(null);
  const [dataServidor, setDataServidor] = React.useState<string>(new Date().toISOString());
  const [ixcOfflineMode, setIxcOfflineMode] = React.useState<boolean>(true);

  // Global flash messages
  const [alertInfo, setAlertInfo] = React.useState<{ msg: string; isErr: boolean } | null>(null);

  const showAlert = (msg: string, isErr = false) => {
    setAlertInfo({ msg, isErr });
    setTimeout(() => setAlertInfo(null), 4000);
  };

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

      // 3. Fixtures combined with User Guesses (if token available)
      const gRes = await fetch("/api/jogos", { headers: headersArr });
      if (gRes.ok) {
        const gData = await gRes.json();
        setJogos(gData.jogos);
        setPalpites(gData.palpites);
        setDataServidor(gData.data_servidor);
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
  const handleSavePalpite = async (jogoId: number, placarCasa: number, placarFora: number): Promise<boolean> => {
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
          placar_fora: placarFora
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 relative">
      
      {/* Dynamic Upper Custom Alerts Alert */}
      {alertInfo && (
        <div 
          id="global-alert-toast" 
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full border shadow-2xl transition duration-300 ${
            alertInfo.isErr 
              ? 'bg-red-950 border-red-500 text-red-200' 
              : 'bg-emerald-950 border-emerald-500 text-emerald-200'
          }`}
        >
          {alertInfo.isErr ? (
            <Info className="h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
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
      />

      {/* Content Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {loading ? (
          /* Elegant loading loader */
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-slate-900 border-t-emerald-500 animate-spin" />
              <Dribbble className="h-6 w-6 text-emerald-500 absolute animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Carregando Cartola ITL...</p>
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
              />
            )}

            {activeTab === 'ranking' && (
              <RankingSection ranking={ranking} />
            )}

            {activeTab === 'login' && (
              <ParticipantLogin 
                onLoginSuccess={handleClientLoginSuccess} 
                onAdminLoginSuccess={handleAdminLoginSuccess}
                dataServidor={dataServidor}
                ixcOfflineMode={ixcOfflineMode}
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
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <span className="font-extrabold text-[10px] tracking-wider uppercase text-emerald-500/80 bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded">
              CARTOLA ITL - PROVEDOR ITLFIBRA
            </span>
            <span>© Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-slate-500">
            <span>Desenvolvido com</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span>para Provedores ISP de Ultra Velocidade</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
