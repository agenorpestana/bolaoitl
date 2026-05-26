import React from 'react';
import { Trophy, LogOut, Menu, X, Shield, Calendar, Award } from 'lucide-react';
import { Usuario } from '../types';

interface HeaderProps {
  usuario: Usuario | null;
  adminLogado: boolean;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({ usuario, adminLogado, onLogout, activeTab, setActiveTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'home', label: 'Início', icon: Calendar },
    { id: 'jogos', label: 'Efetuar Palpites', icon: Award },
    { id: 'ranking', label: 'Ranking Geral', icon: Trophy },
  ];

  const handleNav = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/60 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-yellow-500 shadow-lg shadow-emerald-950/40">
            <Trophy className="h-5 w-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-200 to-yellow-400 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
              CARTOLA ITL
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold tracking-wider uppercase text-yellow-500/90 bg-yellow-950/40 border border-yellow-800/30 px-1.5 py-0.5 rounded">
              PROVEDOR ITLFIBRA
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50 shadow-inner' 
                    : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          
          {adminLogado && (
            <button
              id="nav-admin"
              onClick={() => handleNav('admin')}
              className={`flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'border-yellow-500/80 bg-slate-900 text-yellow-400'
                  : 'border-slate-800 text-yellow-500/80 hover:text-yellow-400 hover:bg-slate-900/40'
              }`}
            >
              <Shield className="h-4 w-4" />
              Painel Admin
            </button>
          )}
        </nav>

        {/* User Session Profile Header */}
        <div className="hidden md:flex items-center gap-4">
          {usuario ? (
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl">
              <span className="text-xl" role="img" aria-label="avatar">{usuario.avatar || "⚽"}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 max-w-[130px] truncate">{usuario.nome}</span>
                <span className="text-[10px] font-bold text-emerald-400">{usuario.pontos_total} Pts • {usuario.cidade}</span>
              </div>
              <button
                id="btn-logout"
                title="Sair da Conta"
                onClick={onLogout}
                className="ml-2 hover:bg-slate-800 p-1 rounded text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : adminLogado ? (
            <div className="flex items-center gap-3 bg-slate-900/80 border border-yellow-800/30 px-3 py-1.5 rounded-xl">
              <Shield className="h-4 w-4 text-yellow-400" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-yellow-400">Admin Control</span>
                <span className="text-[10px] text-slate-400">Unity Suporte</span>
              </div>
              <button
                id="btn-logout-admin"
                onClick={onLogout}
                className="ml-2 hover:bg-slate-800 p-1 rounded text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-login-cta"
              onClick={() => setActiveTab('login')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 text-sm font-bold rounded-lg shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
            >
              Entrar Grátis
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {usuario && (
            <div className="text-xs font-bold text-emerald-400 bg-slate-900/90 border border-slate-800/80 px-2 py-1 rounded">
              {usuario.pontos_total} Pts
            </div>
          )}
          
          <button
            id="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 pt-2 pb-4 space-y-2 animate-fadeIn duration-200">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60' 
                    : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          
          {adminLogado && (
            <button
              id="mobile-nav-admin"
              onClick={() => handleNav('admin')}
              className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium border border-dashed border-slate-800 text-yellow-500 ${
                activeTab === 'admin' ? 'bg-slate-900 text-yellow-400 border-yellow-700/60' : ''
              }`}
            >
              <Shield className="h-4 w-4" />
              Painel Admin
            </button>
          )}

          <div className="pt-2 border-t border-slate-900">
            {usuario ? (
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{usuario.avatar || "⚽"}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">{usuario.nome}</div>
                    <div className="text-[10px] text-slate-400">{usuario.cidade} • {usuario.cpf_cnpj}</div>
                  </div>
                </div>
                <button
                  id="mobile-logout"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-red-400"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : adminLogado ? (
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-yellow-400">Admin Control</div>
                    <div className="text-[10px] text-slate-400">suporte@unityautomacoes...</div>
                  </div>
                </div>
                <button
                  id="mobile-logout-admin"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-red-400"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="mobile-login-cta"
                onClick={() => handleNav('login')}
                className="flex w-full justify-center items-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-bold rounded-lg text-sm"
              >
                Faça seu Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
