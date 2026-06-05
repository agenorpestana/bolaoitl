import React from 'react';
import { UserCheck, Fingerprint, Shield, ArrowLeft, AlertCircle, CircleHelp, Info } from 'lucide-react';
import { CIDADES_ATENDIDAS } from '../data';

interface ParticipantLoginProps {
  onLoginSuccess: (token: string, usuario: any) => void;
  onAdminLoginSuccess: (token: string, admin: any) => void;
  dataServidor: string;
  ixcOfflineMode?: boolean;
  configsCustom?: any;
}

export default function ParticipantLogin({ onLoginSuccess, onAdminLoginSuccess, dataServidor, ixcOfflineMode = true, configsCustom = null }: ParticipantLoginProps) {
  const [isAdminForm, setIsAdminForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Client Form States
  const [cpf, setCpf] = React.useState("");
  
  // Custom Registration supplementary fields (for automated sandbox registry)
  const [nome, setNome] = React.useState("");
  const [tel, setTel] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [cidade, setCidade] = React.useState("Chapecó");
  const [showSandboxOptions, setShowSandboxOptions] = React.useState(false);

  // Administrative Form States
  const [adminEmail, setAdminEmail] = React.useState("");
  const [adminPassword, setAdminPassword] = React.useState("");

  const [recaptchaTokenState, setRecaptchaTokenState] = React.useState<string | null>(null);
  const recaptchaWidgetRef = React.useRef<number | null>(null);

  // Load and render reCAPTCHA dynamically if active
  React.useEffect(() => {
    if (configsCustom?.recaptcha_active && configsCustom?.recaptcha_site_key) {
      const initRecaptcha = () => {
        if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
          // Wrap with setTimeout to ensure DOM container has fully painted and has computed styles on iOS Safari
          setTimeout(() => {
            try {
              const container = document.getElementById("recaptcha-wrapper-container");
              if (container) {
                // If container is empty, reset the widget ref to allow re-rendering (e.g. after tab switching)
                if (container.children.length === 0) {
                  recaptchaWidgetRef.current = null;
                }
                
                if (recaptchaWidgetRef.current === null) {
                  recaptchaWidgetRef.current = (window as any).grecaptcha.render("recaptcha-wrapper-container", {
                    sitekey: configsCustom.recaptcha_site_key,
                    theme: "dark",
                    callback: (token: string) => {
                      setRecaptchaTokenState(token);
                      setErrorMsg(null);
                    },
                    "expired-callback": () => {
                      setRecaptchaTokenState(null);
                    }
                  });
                }
              }
            } catch (err) {
              console.error("Erro ao renderizar reCAPTCHA:", err);
            }
          }, 250);
        }
      };

      const existingScript = document.getElementById("recaptcha-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "recaptcha-script";
        script.src = "https://www.recaptcha.net/recaptcha/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const checkInterval = setInterval(() => {
            if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
              clearInterval(checkInterval);
              initRecaptcha();
            }
          }, 100);
        };
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
            clearInterval(checkInterval);
            initRecaptcha();
          }
        }, 100);
      }
    }
  }, [configsCustom]);

  const formatCpfCnpj = (value: string) => {
    // Only numbers
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      // CPF: 000.000.000-00
      return v
        .replace(/(\md?)/, "$1")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ: 00.000.000/0000-00
      return v
        .substring(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Strip non-digits momentarily just to check length limits
    const numeric = raw.replace(/\D/g, "");
    if (numeric.length > 14) return; // limit CNPJ
    setCpf(formatCpfCnpj(raw));
  };

  const submitLoginForm = async (recaptchaToken?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/ixc-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf_cnpj: cpf,
          nome_complementar: nome,
          telefone: tel,
          email: email,
          cidade: cidade,
          recaptchaToken: recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (configsCustom?.recaptcha_active && (window as any).grecaptcha && recaptchaWidgetRef.current !== null) {
          (window as any).grecaptcha.reset(recaptchaWidgetRef.current);
          setRecaptchaTokenState(null);
        }
        throw new Error(data.error || "Cadastro inexistente no IXC.");
      }

      // Conceder acesso imediato
      onLoginSuccess(data.token, data.usuario);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform Client authentication lookup with captcha gate
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length < 11) {
      setErrorMsg("O documento CPF deve possuir 11 dígitos, ou 14 dígitos para CNPJ.");
      return;
    }

    if (configsCustom?.recaptcha_active && configsCustom?.recaptcha_site_key) {
      if (!recaptchaTokenState) {
        setErrorMsg("Por favor, marque a caixa de seleção 'Não sou um robô'.");
        return;
      }
      submitLoginForm(recaptchaTokenState);
    } else {
      submitLoginForm();
    }
  };

  // Perform administrative credentials submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!adminEmail || !adminPassword) {
      setErrorMsg("Defina email e senha de acesso.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha nas credenciais administrativas.");
      }

      onAdminLoginSuccess(data.token, data.admin);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-md bg-slate-900/90 border border-brand-blue-light/50 rounded-3xl overflow-hidden shadow-2xl relative text-left">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue-vibrant via-brand-blue-accent to-brand-blue" />
        
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Header segment */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
              {isAdminForm ? (
                <Shield className="h-6 w-6 text-yellow-500" />
              ) : (
                <UserCheck className="h-6 w-6 text-brand-blue-accent" />
              )}
            </div>
            
            <h2 id="login-card-title" className="text-xl font-bold text-slate-100">
              {isAdminForm ? "Acesso do Administrador" : "Acessar Cartola ITL"}
            </h2>
            <p className="text-xs text-slate-400">
              {isAdminForm 
                ? "Controle global de regras, calibragem e sincronizações" 
                : "Identificação rápida e sem senhas complicadas"}
            </p>
          </div>

          {/* Core messages alert box */}
          {errorMsg && (
            <div id="login-error-alert" className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-xs text-red-400 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Simulation mode info box */}
          {!isAdminForm && ixcOfflineMode && (
            <div className="p-3 bg-yellow-950/40 border border-yellow-600/30 rounded-xl text-[11px] text-yellow-300 flex gap-2 leading-relaxed">
              <Info className="h-4 w-4 shrink-0 text-yellow-400 mt-0.5 animate-pulse" />
              <div>
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-yellow-400 block mb-0.5">⚠️ MODO SIMULAÇÃO ATIVO</span>
                O sistema de cadastro de apostas está em <strong>Modo Simulação local</strong>. Por isso, qualquer CPF digitado é aceito automaticamente sem consultar a API real do IXC Soft. Desative este modo no Panel Admin (aba IXC) para validar clientes reais via API!
              </div>
            </div>
          )}

          {/* Dual Toggle Forms rendering */}
          {!isAdminForm ? (
            /* CLIENT LOGIN FORM */
            <form onSubmit={handleClientSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CPF ou CNPJ do Cliente
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    id="input-login-cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-850 hover:border-slate-700/80 focus:border-brand-blue-accent focus:ring-1 focus:ring-brand-blue-accent rounded-xl text-sm font-semibold tracking-wide text-slate-200"
                  />
                </div>
                <span className="text-[9px] text-slate-500 block leading-normal pt-1">
                  Digite apenas os números. O sistema consultará sua adimplência no IXC automaticamente.
                </span>
              </div>

              {/* Sandbox toggle drawer for custom testing names */}
              {(import.meta as any).env?.DEV && (
                <div className="bg-slate-950/50 border border-slate-800/40 p-3 rounded-xl space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowSandboxOptions(!showSandboxOptions)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-brand-blue-vibrant transition"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                    {showSandboxOptions ? "Fechar Opções Sandbox" : "Não é cliente? Simular cadastro aqui"}
                  </button>

                  {showSandboxOptions && (
                    <div className="space-y-3 pt-2 border-t border-slate-900 text-xs text-left animate-fadeIn">
                      <div className="p-2 bg-brand-blue/30 border border-brand-blue-light/50 rounded text-[10px] text-brand-blue-vibrant leading-normal flex gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <div>
                          <strong>Modo Simulação Ativo:</strong> Se o CPF fornecido ainda não existir, você será cadastrado na hora com os atributos abaixo!
                        </div>
                      </div>

                      <div className="grid gap-2 grid-cols-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Seu Nome</label>
                          <input 
                            type="text" 
                            placeholder="Ex: João da Silva" 
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Telefone</label>
                          <input 
                            type="text" 
                            placeholder="(49) 99120-2211" 
                            value={tel}
                            onChange={e => setTel(e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2 grid-cols-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Email</label>
                          <input 
                            type="email" 
                            placeholder="joao@exemplo.com" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Município</label>
                          <select 
                            value={cidade}
                            onChange={e => setCidade(e.target.value)}
                            className="w-full p-2 bg-slate-950 border border-slate-850 rounded text-xs text-slate-300"
                          >
                            {CIDADES_ATENDIDAS.map(ct => (
                              <option key={ct} value={ct}>{ct}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-900 pt-2">
                        Dica: Você também pode usar um CPF de teste pré-definido como: <code className="text-yellow-500 font-mono">123.456.789-00</code> ou <code className="text-yellow-500 font-mono">987.654.321-11</code>.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {configsCustom?.recaptcha_active && configsCustom?.recaptcha_site_key && (
                <div 
                  id="recaptcha-wrapper-container" 
                  className="my-3 flex justify-center items-center overflow-visible w-full"
                  style={{ minHeight: "78px", minWidth: "302px" }}
                ></div>
              )}

              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-blue-accent to-brand-blue hover:scale-[1.01] disabled:from-slate-850 disabled:to-slate-900 text-white font-extrabold text-sm rounded-xl tracking-wide shadow-lg cursor-pointer transform active:scale-[0.98] transition animate-pulse duration-500"
              >
                {loading ? "Chamando Webservice IXC..." : "Iniciar Meus Palpites"}
               </button>

            </form>
          ) : (
            /* ADMINISTRATIVE ACCESS FORM */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  E-mail de Administrador
                </label>
                <input
                  type="email"
                  required
                  id="input-admin-email"
                  placeholder="admin@provedor.com.br"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-850 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl text-xs font-semibold text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Senha Secreta
                </label>
                <input
                  type="password"
                  required
                  id="input-admin-password"
                  placeholder="••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-850 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl text-xs font-semibold text-slate-200"
                />
              </div>

              <button
                type="submit"
                id="btn-admin-submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-850 text-slate-950 font-extrabold text-sm rounded-xl shadow-md cursor-pointer transition"
              >
                {loading ? "Autenticando..." : "Desbloquear Painel de Controle"}
              </button>

            </form>
          )}

          {/* Form Switch CTA Footer */}
          <div className="pt-4 border-t border-slate-955 flex items-center justify-between text-xs font-semibold">
            {isAdminForm ? (
               <button
                 type="button"
                 id="btn-toggle-client-form"
                 onClick={() => {
                   setIsAdminForm(false);
                   setErrorMsg(null);
                 }}
                 className="text-brand-blue-vibrant hover:text-blue-300 flex items-center gap-1.5 transition"
               >
                 <ArrowLeft className="h-4 w-4" />
                 Voltar ao Login Cliente
               </button>
            ) : (
              <button
                type="button"
                id="btn-toggle-admin-form"
                onClick={() => {
                  setIsAdminForm(true);
                  setErrorMsg(null);
                }}
                className="text-slate-400 hover:text-yellow-500 flex items-center gap-1.5 transition ml-auto"
              >
                <Shield className="h-4 w-4 text-slate-500" />
                Acesso Administrativo 🔑
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
