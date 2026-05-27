import React from 'react';
import { 
  Sliders, Users, Shield, Database, Activity, FileSpreadsheet, PlusCircle, Trash2, 
  Save, RefreshCw, Check, Search, Download, Trash, Edit2, Play, Power, AlertTriangle, ShieldCheck, Trophy, Key
} from 'lucide-react';
import { Usuario, Jogo, ConfigPoints, ConfigIXC, ConfigFootballApi, AuditLog } from '../types';
import { CIDADES_ATENDIDAS } from '../data';
import { renderBandeira } from './HomePublic';


interface AdminPanelProps {
  token: string | null;
  onRefreshLeaderboard: () => void;
}

export default function AdminPanel({ token, onRefreshLeaderboard }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<'METRICAS' | 'IXC' | 'REGRAS' | 'SOCCER_API' | 'JOGADORES' | 'JOGOS' | 'RELATORIOS' | 'LOGS' | 'ADMINS'>('METRICAS');
  const [calendarioMode, setCalendarioMode] = React.useState<'COPA_2026' | 'LIBERTADORES' | 'BRASILEIRAO' | 'FUTURAS'>('COPA_2026');
  const [apiFutebolMode, setApiFutebolMode] = React.useState<'COPA_2026' | 'LIBERTADORES' | 'BRASILEIRAO' | 'FUTURAS'>('COPA_2026');

  // Server state caches
  const [metrics, setMetrics] = React.useState<any | null>(null);
  const [usuarios, setUsuarios] = React.useState<Usuario[]>([]);
  const [jogos, setJogos] = React.useState<Jogo[]>([]);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);

  // Libertadores, Copa do Mundo and Brasileirao config and sync states
  const [libertadoresAtivo, setLibertadoresAtivo] = React.useState(false);
  const [copaMundoAtivo, setCopaMundoAtivo] = React.useState(true);
  const [brasileiraoAtivo, setBrasileiraoAtivo] = React.useState(false);
  const [syncingLibertadores, setSyncingLibertadores] = React.useState(false);
  const [syncingBrasileirao, setSyncingBrasileirao] = React.useState(false);
  
  // Configurations states
  const [ixcUrl, setIxcUrl] = React.useState("");
  const [ixcToken, setIxcToken] = React.useState("");
  const [ixcChave, setIxcChave] = React.useState("");
  const [ixcTimeout, setIxcTimeout] = React.useState(5000);
  const [ixcOfflineMode, setIxcOfflineMode] = React.useState(true);

  const [ptsWinner, setPtsWinner] = React.useState(4);
  const [ptsDraw, setPtsDraw] = React.useState(4);
  const [ptsExact, setPtsExact] = React.useState(6);
  const [ptsBonusRound, setPtsBonusRound] = React.useState(5);
  const [ptsBonusSeq, setPtsBonusSeq] = React.useState(3);
  const [ptsBonusPerfect, setPtsBonusPerfect] = React.useState(15);

  const [soccerKey, setSoccerKey] = React.useState("");
  const [soccerUrl, setSoccerUrl] = React.useState("https://v3.football.api-sports.io");
  const [soccerManualOverride, setSoccerManualOverride] = React.useState(true);
  const [soccerCronActive, setSoccerCronActive] = React.useState(true);

  // Connection testing states
  const [testingIxc, setTestingIxc] = React.useState(false);
  const [ixcTestFeedback, setIxcTestFeedback] = React.useState<{ success: boolean; msg: string } | null>(null);

  // Sync state
  const [syncingFootball, setSyncingFootball] = React.useState(false);

  // Search parameters for players list
  const [userSearchText, setUserSearchText] = React.useState("");

  // Managing user attributes popup modal or quick fields
  const [editingUserId, setEditingUserId] = React.useState<number | null>(null);
  const [editUserNome, setEditUserNome] = React.useState("");
  const [editUserCidade, setEditUserCidade] = React.useState("");
  const [editUserTelefone, setEditUserTelefone] = React.useState("");
  const [editUserEmail, setEditUserEmail] = React.useState("");
  const [editUserPontos, setEditUserPontos] = React.useState(0);

  // Match addition / editing states
  const [creatingMatch, setCreatingMatch] = React.useState(false);
  const [newHomeTeam, setNewHomeTeam] = React.useState("");
  const [newAwayTeam, setNewAwayTeam] = React.useState("");
  const [newHomeFlag, setNewHomeFlag] = React.useState("🇧🇷");
  const [newAwayFlag, setNewAwayFlag] = React.useState("🇦🇷");
  const [newMatchDate, setNewMatchDate] = React.useState("2026-06-11T20:00");
  const [newMatchRound, setNewMatchRound] = React.useState(1);

  const [editingMatchId, setEditingMatchId] = React.useState<number | null>(null);
  const [editMatchCasaPlacar, setEditMatchCasaPlacar] = React.useState("");
  const [editMatchForaPlacar, setEditMatchForaPlacar] = React.useState("");
  const [editMatchStatus, setEditMatchStatus] = React.useState<'PENDENTE' | 'AO_VIVO' | 'ENCERRADO'>('PENDENTE');

  // Sub-admins management states
  const [subAdmins, setSubAdmins] = React.useState<any[]>([]);
  const [editingSubAdmin, setEditingSubAdmin] = React.useState<any | null>(null);
  const [subAdminNome, setSubAdminNome] = React.useState("");
  const [subAdminEmail, setSubAdminEmail] = React.useState("");
  const [subAdminSenha, setSubAdminSenha] = React.useState("");
  const [subAdminPodeExcluir, setSubAdminPodeExcluir] = React.useState(true);
  const [subAdminPodeEditar, setSubAdminPodeEditar] = React.useState(true);
  const [subAdminPodeAtivarCampeonato, setSubAdminPodeAtivarCampeonato] = React.useState(true);

  const loadSubAdmins = async () => {
    try {
      const response = await fetch("/api/admin/sub-admins", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubAdmins(data);
      }
    } catch (err) {
      console.error("Error loading sub-admins:", err);
    }
  };

  const handleSaveSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAdminNome || !subAdminEmail) {
      showFeedback("Preencha Nome e E-mail obrigatoriamente.", true);
      return;
    }
    try {
      const payload = {
        id: editingSubAdmin ? editingSubAdmin.id : undefined,
        nome: subAdminNome,
        email: subAdminEmail,
        senha: subAdminSenha,
        podeExcluir: subAdminPodeExcluir,
        podeEditar: subAdminPodeEditar,
        podeAtivarCampeonato: subAdminPodeAtivarCampeonato
      };
      
      const response = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        showFeedback(editingSubAdmin ? "Usuário administrador atualizado com sucesso!" : "Usuário administrador cadastrado com sucesso!");
        // Reset state variables
        setEditingSubAdmin(null);
        setSubAdminNome("");
        setSubAdminEmail("");
        setSubAdminSenha("");
        setSubAdminPodeExcluir(true);
        setSubAdminPodeEditar(true);
        setSubAdminPodeAtivarCampeonato(true);
        // Reload directory list
        loadSubAdmins();
      } else {
        showFeedback(result.error || "Erro ao salvar usuário administrador.", true);
      }
    } catch (err) {
      showFeedback("Erro de conectividade com o servidor.", true);
    }
  };

  const handleDeleteSubAdmin = async (admId: number) => {
    if (!confirm("Deseja realmente remover este usuário administrador?")) return;
    try {
      const response = await fetch(`/api/admin/sub-admins/${admId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showFeedback("Usuário administrador removido com sucesso!");
        loadSubAdmins();
      } else {
        showFeedback(result.error || "Erro ao remover usuário administrador.", true);
      }
    } catch (err) {
      showFeedback("Erro de conectividade com o servidor.", true);
    }
  };

  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);

  // Load and cache settings states
  const loadAdminMetrics = async () => {
    try {
      const response = await fetch("/api/admin/metrics", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        if (data.logs_recents) {
          setLogs(data.logs_recents);
        }
      }
    } catch (err) {}
  };

  const loadPlayers = async () => {
    try {
      const response = await fetch("/api/admin/usuarios", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (err) {}
  };

  const loadMatches = async () => {
    try {
      const response = await fetch("/api/admin/jogos", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJogos(data);
      }
    } catch (err) {}
  };

  const loadServerConfigs = async () => {
    try {
      const response = await fetch("/api/admin/configs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Load ixc
        setIxcUrl(data.configs_ixc.url);
        setIxcToken(data.configs_ixc.token);
        setIxcChave(data.configs_ixc.chave || "");
        setIxcTimeout(data.configs_ixc.timeout);
        setIxcOfflineMode(data.configs_ixc.offline_mode);

        // Load points
        setPtsWinner(data.configs_points.pontos_acertar_vencedor);
        setPtsDraw(data.configs_points.pontos_acertar_empate);
        setPtsExact(data.configs_points.pontos_acertar_placar_exato);
        setPtsBonusRound(data.configs_points.bonus_rodada);
        setPtsBonusSeq(data.configs_points.bonus_sequencia);
        setPtsBonusPerfect(data.configs_points.bonus_jogos_perfeitos);

        // Load API Football
        setSoccerKey(data.configs_football.key);
        setSoccerUrl(data.configs_football.url);
        setSoccerManualOverride(data.configs_football.manual_override);
        setSoccerCronActive(data.configs_football.cron_active);

        if (data.configs_libertadores) {
          setLibertadoresAtivo(data.configs_libertadores.ativo);
        }

        if (data.configs_copa_mundo) {
          setCopaMundoAtivo(data.configs_copa_mundo.ativo);
        }

        if (data.configs_brasileirao) {
          setBrasileiraoAtivo(data.configs_brasileirao.ativo);
        }
      }
    } catch (err) {}
  };

  const triggerAuditLogsLoading = async () => {
    try {
      const response = await fetch("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {}
  };

  React.useEffect(() => {
    if (token) {
      loadAdminMetrics();
      loadPlayers();
      loadMatches();
      loadServerConfigs();
      if (activeSubTab === 'JOGOS' && calendarioMode === 'LIBERTADORES') {
        loadAdminPalpites();
      }
      if (activeSubTab === 'ADMINS') {
        loadSubAdmins();
      }
    }
  }, [token, activeSubTab, calendarioMode]);

  // Flash UI Alert
  const showFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setFeedbackError(msg);
      setTimeout(() => setFeedbackError(null), 4000);
    } else {
      setFeedbackSuccess(msg);
      setTimeout(() => setFeedbackSuccess(null), 4000);
    }
  };

  // IXC Connection Test Action 
  const handleTestIxcConnection = async () => {
    setTestingIxc(true);
    setIxcTestFeedback(null);
    try {
      const response = await fetch("/api/admin/ixc-test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          url: ixcUrl,
          token: ixcToken,
          timeout: ixcTimeout
        })
      });

      const data = await response.json();
      setIxcTestFeedback({
        success: data.success,
        msg: data.mensagem
      });

      if (data.success) {
        showFeedback("Teste de conexão estabelecido com sucesso!");
      } else {
        showFeedback("Falha na validação do link IXC.", true);
      }
    } catch (err: any) {
      setIxcTestFeedback({ success: false, msg: err.message });
      showFeedback("Não foi possível acessar a rota de validação de rede.", true);
    } finally {
      setTestingIxc(false);
    }
  };

  // Save IXC Params Action
  const handleSaveIxcConfigs = async () => {
    try {
      const response = await fetch("/api/admin/configs/ixc", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          url: ixcUrl,
          token: ixcToken,
          chave: ixcChave,
          timeout: ixcTimeout,
          offline_mode: ixcOfflineMode
        })
      });

      if (response.ok) {
        showFeedback("Definições do cliente API IXC salvas.");
        loadAdminMetrics();
      } else {
        throw new Error();
      }
    } catch (err) {
      showFeedback("Erro ao registrar parâmetros do IXC.", true);
    }
  };

  // Save Config scoring points parameters
  const handleSaveScoringParams = async () => {
    try {
      const response = await fetch("/api/admin/configs/points", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pontos_acertar_vencedor: ptsWinner,
          pontos_acertar_empate: ptsDraw,
          pontos_acertar_placar_exato: ptsExact,
          bonus_rodada: ptsBonusRound,
          bonus_sequencia: ptsBonusSeq,
          bonus_jogos_perfeitos: ptsBonusPerfect
        })
      });

      if (response.ok) {
        showFeedback("Tabela de pontuação salva. Re-calculado placares de todos utilizadores.");
        onRefreshLeaderboard();
      } else {
        throw new Error();
      }
    } catch (err) {
      showFeedback("Falha salvando recalibração.", true);
    }
  };

  // Save Football API Params
  const handleSaveSoccerParams = async () => {
    try {
      const response = await fetch("/api/admin/configs/football", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          key: soccerKey,
          url: soccerUrl,
          manual_override: soccerManualOverride,
          cron_active: soccerCronActive
        })
      });

      if (response.ok) {
        showFeedback("Definições estruturais de Futebol salvas.");
      } else {
        throw new Error();
      }
    } catch (err) {
      showFeedback("Erro gravando futebol.", true);
    }
  };

  // Manual Trigger Football Sync simulation
  const handleSyncFootballManual = async () => {
    setSyncingFootball(true);
    try {
      const response = await fetch("/api/admin/games-sync-football", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showFeedback(data.mensagem);
        loadMatches();
        onRefreshLeaderboard();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showFeedback(`Falha ao forçar sincronização: ${err.message}`, true);
    } finally {
      setSyncingFootball(false);
    }
  };

  // User Actions: Toggle Blocking
  const handleToggleBlockUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/usuarios/${userId}/block`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showFeedback("Status de bloqueio atualizado.");
        loadPlayers();
        onRefreshLeaderboard();
      }
    } catch (err) {
      showFeedback("Falha ao atualizar bloqueio.", true);
    }
  };

  // User Actions: Edit profile or manual score overrides
  const handleEditUserClick = (user: Usuario) => {
    setEditingUserId(user.id);
    setEditUserNome(user.nome);
    setEditUserCidade(user.cidade);
    setEditUserTelefone(user.telefone);
    setEditUserEmail(user.email);
    setEditUserPontos(user.pontos_total);
  };

  const handleSaveUserEdit = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: editUserNome,
          cidade: editUserCidade,
          telefone: editUserTelefone,
          email: editUserEmail,
          pontos_total: editUserPontos
        })
      });

      if (response.ok) {
        showFeedback("Dados do utilizador salvos com sucesso.");
        setEditingUserId(null);
        loadPlayers();
        onRefreshLeaderboard();
      }
    } catch (err) {
      showFeedback("Falha gravando alterações.", true);
    }
  };

  const handleResetUserScores = async (userId: number) => {
    if (!confirm("🚨 ATENÇÃO: Deseja realmente ZERAR os pontos deste usuário e EXCLUIR todos os palpites dele? Esta ação é irreversível.")) return;

    try {
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reset: true })
      });

      if (response.ok) {
        showFeedback("Pontuações redefinidas e palpites apagados.");
        setEditingUserId(null);
        loadPlayers();
        onRefreshLeaderboard();
      }
    } catch (err) {
      showFeedback("Falha limpando cadastro.", true);
    }
  };

  const handleDeleteUserAll = async (userId: number) => {
     if (!confirm("🚨 EXCLUIR DEFINITIVAMENTE: Isso irá remover por completo o participante do ranking e apagar todos os palpites. Confirmar?")) return;
     try {
       const response = await fetch(`/api/admin/usuarios/${userId}`, {
         method: "DELETE",
         headers: { "Authorization": `Bearer ${token}` }
       });
       if (response.ok) {
          showFeedback("Participante removido do bolão.");
          loadPlayers();
          onRefreshLeaderboard();
       }
     } catch (err) {
       showFeedback("Houve um problema de rede deletando.", true);
     }
  };

  // Match: Create manual Match
  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeTeam || !newAwayTeam) {
      alert("Defina as seleções concorrentes.");
      return;
    }

    try {
      const response = await fetch("/api/admin/jogos", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          time_casa: newHomeTeam,
          time_fora: newAwayTeam,
          time_casa_bandeira: newHomeFlag,
          time_fora_bandeira: newAwayFlag,
          data_jogo: new Date(newMatchDate).toISOString(),
          rodada: newMatchRound
        })
      });

      if (response.ok) {
        showFeedback("Partida incluída no calendário Copa 2026.");
        setCreatingMatch(false);
        setNewHomeTeam("");
        setNewAwayTeam("");
        loadMatches();
      }
    } catch (err) {
      showFeedback("Falha cadastrando jogo.", true);
    }
  };

  // Match: Insert/Submit results scores (Saves and triggers recalculate automatically!)
  const handleOpenMatchScoreEditor = (jogo: Jogo) => {
    setEditingMatchId(jogo.id);
    setEditMatchCasaPlacar(jogo.placar_casa !== null ? String(jogo.placar_casa) : "");
    setEditMatchForaPlacar(jogo.placar_fora !== null ? String(jogo.placar_fora) : "");
    setEditMatchStatus(jogo.status);
  };

  const handleSaveMatchScore = async (jogoId: number) => {
    try {
      const response = await fetch(`/api/admin/jogos/${jogoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          placar_casa: editMatchCasaPlacar === "" ? null : Number(editMatchCasaPlacar),
          placar_fora: editMatchForaPlacar === "" ? null : Number(editMatchForaPlacar),
          status: editMatchStatus
        })
      });

      if (response.ok) {
        showFeedback("Resultado atualizado e pontuação recalculada!");
        setEditingMatchId(null);
        loadMatches();
        onRefreshLeaderboard();
      }
    } catch (err) {
      showFeedback("Erro guardando placar.", true);
    }
  };

  // Local state for temporary prediction fields
  const [testPlacares, setTestPlacares] = React.useState<Record<string, { casa: string; fora: string }>>({});
  const [adminPalpites, setAdminPalpites] = React.useState<any[]>([]);

  const loadAdminPalpites = async () => {
    try {
      const response = await fetch("/api/jogos", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdminPalpites(data.palpites || []);
      }
    } catch (err) {}
  };

  const handleToggleLibertadores = async () => {
    try {
      const response = await fetch("/api/admin/configs/libertadores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !libertadoresAtivo })
      });
      if (response.ok) {
        const data = await response.json();
        setLibertadoresAtivo(data.configs_libertadores.ativo);
        showFeedback(`Copa Libertadores para clientes: ${data.configs_libertadores.ativo ? 'LIBERADA/ATIVA' : 'OCULTA/INATIVA'}`);
      }
    } catch (err) {
      showFeedback("Erro ao alterar ativação da Libertadores", true);
    }
  };

  const handleToggleCopaMundo = async () => {
    try {
      const response = await fetch("/api/admin/configs/copa_mundo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !copaMundoAtivo })
      });
      if (response.ok) {
        const data = await response.json();
        setCopaMundoAtivo(data.configs_copa_mundo.ativo);
        showFeedback(`Copa do Mundo para clientes: ${data.configs_copa_mundo.ativo ? 'LIBERADA/ATIVA' : 'OCULTA/INATIVA'}`);
      }
    } catch (err) {
      showFeedback("Erro ao alterar ativação da Copa do Mundo", true);
    }
  };

  const handleSyncLibertadores = async () => {
    setSyncingLibertadores(true);
    try {
      const response = await fetch("/api/admin/libertadores/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showFeedback(data.mensagem || "Sincronização concluída com sucesso!");
        loadMatches();
      } else {
        showFeedback(data.error || "Houve um erro durante a chamada da API.", true);
      }
    } catch (err) {
      showFeedback("Erro ao acessar servidor para sincronização", true);
    } finally {
      setSyncingLibertadores(false);
    }
  };

  const handleToggleBrasileirao = async () => {
    try {
      const response = await fetch("/api/admin/configs/brasileirao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !brasileiraoAtivo })
      });
      if (response.ok) {
        const data = await response.json();
        setBrasileiraoAtivo(data.configs_brasileirao.ativo);
        showFeedback(`Brasileirão Série A para clientes: ${data.configs_brasileirao.ativo ? 'LIBERADO/ATIVO' : 'OCULTO/INATIVO'}`);
      }
    } catch (err) {
      showFeedback("Erro ao alterar ativação do Brasileirão", true);
    }
  };

  const handleSyncBrasileirao = async () => {
    setSyncingBrasileirao(true);
    try {
      const response = await fetch("/api/admin/brasileirao/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showFeedback(data.mensagem || "Sincronização concluída com sucesso!");
        loadMatches();
      } else {
        showFeedback(data.error || "Houve um erro durante a chamada da API.", true);
      }
    } catch (err) {
      showFeedback("Erro ao acessar servidor para sincronização", true);
    } finally {
      setSyncingBrasileirao(false);
    }
  };

  const submitTestPrediction = async (jogoId: number) => {
    const guessState = testPlacares[jogoId];
    if (!guessState || guessState.casa === "" || guessState.fora === "") {
      showFeedback("Informe ambos os placares para enviar seu palpite de teste.", true);
      return;
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
          placar_casa: guessState.casa,
          placar_fora: guessState.fora
        })
      });
      const data = await response.json();
      if (response.ok) {
        showFeedback("Palpite de teste do Admin registrado perfeitamente!");
        loadAdminPalpites();
      } else {
        showFeedback(data.error || "Ocorreu um erro ao enviar palpite de teste.", true);
      }
    } catch (err) {
      showFeedback("Falha comunicando com API.", true);
    }
  };

  const handleDeleteMatch = async (jogoId: number) => {
    if (!confirm("Deseja realmente REMOVER esta partida do sistema? Todos os palpites de clientes para este jogo serão invalidados.")) return;
    try {
      const response = await fetch(`/api/admin/jogos/${jogoId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showFeedback("Jogo deletado com sucesso.");
        loadMatches();
        onRefreshLeaderboard();
      }
    } catch (err) {
      showFeedback("Erro ao apagar partida.", true);
    }
  };

  // Export files: Direct Raw download of CSV data
  const handleExportCSV = async (type: 'JOGADORES' | 'JOGOS' | 'CIDADES') => {
    try {
      const response = await fetch("/api/admin/reports", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      const reportData = await response.json();

      let csvContent = "";
      let filename = "relatorio.csv";

      if (type === 'JOGADORES') {
        filename = "palpiteiros_copa_2026.csv";
        csvContent = "ID;ID_IXC;Nome;Cidade;Telefone;Email;Pontos;Placares_Exatos;Vitorias;Erros;Data_Cadastro\r\n";
        reportData.lideranca_geral.forEach((u: any) => {
          csvContent += `"${u.id}";"${u.ixc_id}";"${u.nome}";"${u.cidade}";"${u.telefone}";"${u.email}";"${u.pontos}";"${u.exatos}";"${u.vencedores}";"${u.erros}";"${u.cadastro}"\r\n`;
        });
      } else if (type === 'JOGOS') {
        filename = "partidas_mais_palpitadas.csv";
        csvContent = "ID_Jogo;Partida;Data;Palpites_Recebidos;Status\r\n";
        reportData.jogos_relat.forEach((g: any) => {
          csvContent += `"${g.id}";"${g.partida}";"${g.data}";"${g.total_palpites}";"${g.status}"\r\n`;
        });
      } else if (type === 'CIDADES') {
        filename = "engajamento_por_cidade.csv";
        csvContent = "Cidade;Total_Usuarios;Total_Palpites;Media_Pontos\r\n";
        reportData.participacao.forEach((c: any) => {
          csvContent += `"${c.cidade}";"${c.usuarios}";"${c.palpites}";"${c.media_pontos}"\r\n`;
        });
      }

      // Download trigger
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showFeedback(`Arquivo ${filename} baixado.`);
    } catch (err) {
      showFeedback("Falha emitindo CSV.", true);
    }
  };

  // Printing report trigger
  const handlePrintReport = () => {
    window.print();
  };

  // Searching filter on client records
  const filteredPlayersList = usuarios.filter(u => {
    const raw = `${u.nome} ${u.cpf_cnpj} ${u.cidade} ${u.ixc_id}`.toLowerCase();
    return raw.includes(userSearchText.toLowerCase());
  });

  return (
    <div className="space-y-6 text-left">
      
      {/* Upper Alerts Indicator */}
      {feedbackSuccess && (
        <div id="admin-alert-toast" className="fixed top-20 right-4 z-50 p-4 bg-emerald-900 border border-emerald-500 text-slate-100 rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <Check className="h-4 w-4 bg-emerald-500 text-slate-950 rounded-full p-0.5" />
          <span className="text-xs font-bold">{feedbackSuccess}</span>
        </div>
      )}

      {feedbackError && (
        <div id="admin-alert-toast-err" className="fixed top-20 right-4 z-50 p-4 bg-red-950 border border-red-500 text-slate-100 rounded-2xl shadow-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold">{feedbackError}</span>
        </div>
      )}

      {/* Main Admin title, navigation */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              Painel de Controle Administrador
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Superusuário logado. Gerencie as pontuações dos clientes, conexões IXC Soft, APIs e jogos da Copa do Mundo 2026.
          </p>
        </div>

        <button
          onClick={loadAdminMetrics}
          className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] uppercase font-bold text-slate-300 hover:text-emerald-400 transition flex items-center gap-1.5"
          title="Recarregar Métricas"
        >
          <RefreshCw className="h-3 w-3" />
          Atualizar Dados
        </button>
      </div>

      {/* Navigation Subtabs menu lists */}
      <div className="flex flex-wrap border-b border-slate-900 gap-1 select-none">
        {[
          { id: 'METRICAS', label: 'Estatísticas', icon: Activity },
          { id: 'IXC', label: 'Integração IXC', icon: Database },
          { id: 'REGRAS', label: 'Regras de Pontos', icon: Sliders },
          { id: 'SOCCER_API', label: 'API Futebol', icon: Play },
          { id: 'JOGADORES', label: 'Participantes', icon: Users },
          { id: 'JOGOS', label: 'Calendário', icon: PlusCircle },
          { id: 'RELATORIOS', label: 'Relatórios & Export', icon: FileSpreadsheet },
          { id: 'LOGS', label: 'Auditoria Logs', icon: Shield },
          { id: 'ADMINS', label: 'Equipe Admin', icon: Key }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 -mb-[2px] transition ${
                isActive
                  ? 'border-yellow-500 text-yellow-500 bg-slate-900/50 rounded-t-xl font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-150'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Subtab Contents rendering logic */}
      
      {/* 1. METRIQUES/ESTATÍSTICAS */}
      {activeSubTab === 'METRICAS' && metrics && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-5 text-center">
            
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Utilizadores Ativos</span>
              <div className="text-2xl font-black text-slate-100 font-mono mt-1">{metrics.counters.total_usuarios}</div>
              <span className="text-[9px] text-emerald-400 mt-1 block">Conectados via IXC</span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Palpites Atribuídos</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{metrics.counters.total_palpites}</div>
              <span className="text-[9px] text-slate-500 mt-1 block">Cravados no sistema</span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Partidas Listadas</span>
              <div className="text-2xl font-black text-slate-100 font-mono mt-1">{metrics.counters.total_jogos}</div>
              <span className="text-[9px] text-yellow-500 mt-1 block">{metrics.counters.jogos_ativo} jogos Ao Vivo</span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Integração IXC</span>
              <div className="text-sm font-black text-slate-150 mt-2 truncate bg-slate-950 px-2 py-1 rounded font-mono">
                {ixcOfflineMode ? "⚠️ SIMULAÇÃO" : "✅ PRODUÇÃO"}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 block">Servidor Provedor</span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Futebol Live Sync</span>
              <div className="text-xs font-bold text-emerald-400 mt-2 tracking-widest bg-emerald-950/40 border border-emerald-900/40 px-2 py-1 rounded">
                API-SPORTS
              </div>
              <span className="text-[9px] text-emerald-400 mt-1 block">Operação: Normal</span>
            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Left: Score Brackets distribution representation */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">Distribuição de Pontos</h3>
              <div className="space-y-3">
                {Object.keys(metrics.distribuicao).map((bracket) => {
                  const count = metrics.distribuicao[bracket];
                  const total = metrics.counters.total_usuarios || 1;
                  const ratio = Math.min(100, Math.round((count / total) * 100));
                  return (
                    <div key={bracket} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-450 font-bold">{bracket}</span>
                        <span className="font-mono text-slate-300">{count} jogadores ({ratio}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-yellow-500 transition-all duration-500" 
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Cities Stats */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">Top Cidades em Engajamento</h3>
              <div className="divide-y divide-slate-950 max-h-[190px] overflow-y-auto pr-1">
                {metrics.cities.map((city: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs">
                    <span className="text-slate-300 font-semibold">{city.name}</span>
                    <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded">
                      {city.count} participantes
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick audit feed */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black uppercase text-slate-300">Auditoria Rápida de Atividades</h4>
              <button 
                onClick={() => setActiveSubTab('LOGS')}
                className="text-[10px] text-yellow-500 hover:underline"
              >
                Ver histórico de logs
              </button>
            </div>
            
            <div className="bg-slate-950 rounded-xl p-3 divide-y divide-slate-900 max-h-[220px] overflow-y-auto">
              {logs.slice(0, 5).map((lg) => (
                <div key={lg.id} className="py-2 text-[11px] font-mono flex items-start gap-2">
                  <span className="text-[10px] text-slate-500 shrink-0">[{new Date(lg.data).toLocaleTimeString('pt-BR')}]</span>
                  <span className="text-yellow-500/95 font-bold shrink-0">{lg.acao}:</span>
                  <span className="text-slate-300 flex-1">{lg.descricao}</span>
                  <span className="text-slate-550 shrink-0 text-[10px]">{lg.usuario} ({lg.ip})</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 2. CONFIGURAÇÃO INTEGRACAO IXC */}
      {activeSubTab === 'IXC' && (
        <div className="bg-slate-900/40 border border-slate-805/85 p-6 rounded-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">WebService IXC Soft Integration</h3>
            <p className="text-xs text-slate-400">
              Gerencie as credenciais de sua API IXC para validação automática de clientes com o CPF cadastrado.
            </p>
          </div>

          {/* Alert of simulation settings */}
          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Modo Simulação e Demonstração</span>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                Se você não possui uma URL do IXC Soft real ou quer apenas demonstrar o bolão, 
                deixe o <span className="text-yellow-500 font-bold">Modo Simulação Ativo</span>. 
                Se deseja fazer consultas reais no seu banco do IXC, defina como <span className="text-emerald-400 font-bold">PRODUÇÃO (DESLIGADO)</span>. 
                <span className="block mt-2 font-bold text-yellow-350">⚠️ Importante: Após alternar, lembre-se de clicar em &quot;Salvar Configurações&quot; abaixo para gravar!</span>
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-350">Status:</span>
              <button
                type="button"
                onClick={() => setIxcOfflineMode(!ixcOfflineMode)}
                id="btn-toggle-ixc-simulation"
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded transition duration-200 ${
                  ixcOfflineMode 
                    ? 'bg-yellow-500/20 border border-yellow-700/60 text-yellow-500 shadow-inner' 
                    : 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 shadow-lg'
                }`}
              >
                {ixcOfflineMode ? "⚠️ SIMULAÇÃO ATIVA" : "✅ API REAL (PRODUÇÃO)"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                URL Webservice IXC
              </label>
              <input
                type="text"
                placeholder="https://177.200.x.x/webservice/v1"
                value={ixcUrl}
                onChange={(e) => setIxcUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 focus:border-yellow-500 hover:border-slate-800 rounded-xl text-xs font-mono text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                Token de Autorização (Basic/Token)
              </label>
              <input
                type="password"
                placeholder="Token de Webservice ixcsoft..."
                value={ixcToken}
                onChange={(e) => setIxcToken(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 focus:border-yellow-500 hover:border-slate-800 rounded-xl text-xs font-mono text-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-450 block">
                Timeout de Requisição: {ixcTimeout}ms
              </label>
              <input
                type="range"
                min="2000"
                max="10000"
                step="500"
                value={ixcTimeout}
                onChange={(e) => setIxcTimeout(Number(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-yellow-500 mt-3"
              />
            </div>

          </div>

          {/* Test results screen */}
          {ixcTestFeedback && (
            <div className={`p-4 rounded-xl border text-xs leading-normal font-sans ${
              ixcTestFeedback.success 
                ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400' 
                : 'bg-red-950/10 border-red-900/40 text-red-400'
            }`}>
              <strong className="block mb-1">{ixcTestFeedback.success ? "Conexão Bem Sucedida:" : "Conexão Offline:"}</strong>
              {ixcTestFeedback.msg}
            </div>
          )}

          {/* Buttons interactions */}
          <div className="pt-3 border-t border-slate-950 flex flex-wrap gap-3">
            <button
              onClick={handleSaveIxcConfigs}
              id="btn-save-ixc-config"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition shadow"
            >
              <Save className="h-4 w-4" />
              Salvar Configurações
            </button>
            <button
              onClick={handleTestIxcConnection}
              id="btn-test-ixc-conn"
              disabled={testingIxc}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 hover:text-emerald-400 text-slate-300 text-xs font-extrabold rounded-lg cursor-pointer transition"
            >
              <RefreshCw className={`h-4 w-4 ${testingIxc ? 'animate-spin' : ''}`} />
              {testingIxc ? "Testando webservice..." : "Testar Conexão IXC"}
            </button>
          </div>

        </div>
      )}

      {/* 3. PARÂMETROS DE PONTÚAÇÃO */}
      {activeSubTab === 'REGRAS' && (
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">Fórmula de Geração de Pontos</h3>
            <p className="text-xs text-slate-400">
              Ajuste granularmente quantos pontos seus clientes levam por jogo. Salvar este formulário recalculará a pontuação do ranking automaticamente.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            
            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Acerto de Vencedor</label>
              <input
                type="number"
                value={ptsWinner}
                onChange={(e) => setPtsWinner(Number(e.target.value))}
                className="w-full p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-center text-sm font-bold text-emerald-400"
              />
              <span className="text-[9px] text-slate-500 block leading-normal">
                Dado ao apostador que indicar o time vencedor correto (ou empate simples, se cadastrar draw).
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Acerto de Empate</label>
              <input
                type="number"
                value={ptsDraw}
                onChange={(e) => setPtsDraw(Number(e.target.value))}
                className="w-full p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-center text-sm font-bold text-emerald-400"
              />
              <span className="text-[9px] text-slate-500 block leading-normal">
                Atribuído a chutes que craveem empates (por exemplo: Brasil 1 x 1 Itália, apostou 2 x 2).
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bônus Placar Exato</label>
              <input
                type="number"
                value={ptsExact}
                onChange={(e) => setPtsExact(Number(e.target.value))}
                className="w-full p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-center text-sm font-bold text-yellow-500"
              />
              <span className="text-[9px] text-slate-500 block leading-normal">
                Pontos extras somados caso acerte o placar inteiro exato (Ex: cravou Brasil 2 x 1, terminou 2 x 1).
              </span>
            </div>

          </div>

          {/* Gamification Extras Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Bônus Adicionais de Gamificação</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Bônus Rodada Completa", val: ptsBonusRound, hook: setPtsBonusRound, desc: "Se fizer palpite em todos os jogos da mesma rodada" },
                { label: "Bônus Sequência Vitória", val: ptsBonusSeq, hook: setPtsBonusSeq, desc: "A cada 3 palpites consecutivos com vitória acertada" },
                { label: "Bônus Jogo Perfeito", val: ptsBonusPerfect, hook: setPtsBonusPerfect, desc: "Cravou 5 jogos exatos no campeonato inteiro" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-950/60 p-3 rounded-xl space-y-1.5 text-left text-xs">
                  <span className="text-slate-300 font-bold block truncate">{item.label}</span>
                  <input
                    type="number"
                    value={item.val}
                    onChange={(e) => item.hook(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900/80 border border-slate-800 rounded font-mono text-center text-slate-200"
                  />
                  <span className="text-[9px] text-slate-500 block leading-tight">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-950">
            <button
              onClick={handleSaveScoringParams}
              id="btn-save-scoring-recalculates"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition shadow"
            >
              <Save className="h-4 w-4" />
              Salvar Regras de Pontos
            </button>
          </div>
        </div>
      )}

      {/* 4. SOCCER API FOOTBALL SYNCHRONIZATION */}
      {activeSubTab === 'SOCCER_API' && (
        <div className="bg-slate-900/40 border border-slate-850/85 p-6 rounded-2xl space-y-6">
          
          {/* Subtabs nested row for API Futebol */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-800/60 select-none">
            {[
              { id: 'COPA_2026', label: 'Copa do Mundo 2026', icon: Play },
              { id: 'LIBERTADORES', label: 'Copa Libertadores', icon: Trophy },
              { id: 'BRASILEIRAO', label: 'Brasileirão Série A (ID 71)', icon: Play },
              { id: 'FUTURAS', label: '+ Próximas Competições', icon: Sliders }
            ].map((sub) => {
              const Icon = sub.icon;
              const isSubActive = apiFutebolMode === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setApiFutebolMode(sub.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                    isSubActive
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-extrabold shadow'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Subtab Content: COPA 2026 */}
          {apiFutebolMode === 'COPA_2026' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">Sincronizador Copa do Mundo 2026</h3>
                <p className="text-xs text-slate-400">
                  Configure credenciais de API para carregar partidas e resultados em tempo real para a Copa do Mundo 22/26.
                </p>
              </div>

              {/* Quick sync metrics alert box */}
              <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Status Conexão API</span>
                  <span className="text-xs font-extrabold text-emerald-400 block mt-1">● EM REDE ONLINE</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Tarefa Agendada (CRON)</span>
                  <span className="text-xs font-bold text-slate-300 block mt-1">A cada 15 Minutos</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Sobrecarga de Edição Manual</span>
                  <span className="text-xs font-bold text-yellow-500 block mt-1 font-mono">Ativada (Ajustes Livres)</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 text-left">URL de Endpoint</label>
                  <input
                    type="text"
                    value={soccerUrl}
                    onChange={(e) => setSoccerUrl(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 focus:border-yellow-500 hover:border-slate-800 rounded-xl text-xs font-mono text-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 text-left">Chave Secundária (API-Sports Key)</label>
                  <input
                    type="password"
                    placeholder="Ex b7a6cb56ecbd..."
                    value={soccerKey}
                    onChange={(e) => setSoccerKey(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 focus:border-yellow-500 hover:border-slate-800 rounded-xl text-xs font-mono text-slate-300"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 text-xs text-slate-400 text-left">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soccerManualOverride}
                    onChange={(e) => setSoccerManualOverride(e.target.checked)}
                    className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950 h-4 w-4"
                  />
                  <span>Permitir alteração de resultados manual pelo administrador (Recomendado caso a API falhe)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={soccerCronActive}
                    onChange={(e) => setSoccerCronActive(e.target.checked)}
                    className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950 h-4 w-4"
                  />
                  <span>Executar Varredura Cron Job automático no plano de fundo (Copa)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-950 flex flex-wrap gap-3">
                <button
                  onClick={handleSaveSoccerParams}
                  id="btn-save-soccer-config"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition shadow"
                >
                  <Save className="h-4 w-4" />
                  Salvar Parâmetros Futebol
                </button>
                <button
                  onClick={handleSyncFootballManual}
                  id="btn-sync-football-trigger"
                  disabled={syncingFootball}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 hover:text-emerald-400 text-slate-300 text-xs font-extrabold rounded-lg cursor-pointer transition"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingFootball ? 'animate-spin' : ''}`} />
                  {syncingFootball ? "Executando carga..." : "Forçar Sincronização Copa do Mundo"}
                </button>
              </div>
            </div>
          )}

          {/* Subtab Content: LIBERTADORES */}
          {apiFutebolMode === 'LIBERTADORES' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">Sincronizador Copa Libertadores</h3>
                <p className="text-xs text-slate-400">
                  Configure e ative a carga dinâmica dos jogos oficiais da Copa Libertadores da América.
                </p>
              </div>

              {/* Status & Visibilidade segment */}
              <div className="bg-slate-950/75 p-4 rounded-xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase text-emerald-400">Visibilidade da Libertadores para Clientes</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ative ou oculte a exibição das partidas e palpites da Libertadores para os participantes no painel público.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Status Libertadores:</span>
                  <button
                    type="button"
                    onClick={handleToggleLibertadores}
                    className={`px-4 py-2 rounded-xl text-xs font-black select-none transition flex items-center gap-2 cursor-pointer ${
                      libertadoresAtivo
                        ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                        : 'bg-red-950 border border-red-500/40 text-red-400 hover:bg-red-900/60'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {libertadoresAtivo ? 'LIBERADA (ATIVADO PARA CLIENTES)' : 'BLOQUEADA (OCULTO PARA CLIENTES)'}
                  </button>
                </div>
              </div>

              {/* Synchronize Match Segment */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-900 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-300">Puxar Partidas da Rodada</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Puxar os confrontos e scores atualizados da Copa Libertadores em tempo real. Caso as suas credenciais estejam usando o plano gratuito ou estejam vazias, o sistema utilizará a base fallback oficial para testar a aplicação com dados perfeitos!
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleSyncLibertadores}
                    disabled={syncingLibertadores}
                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-500 font-black text-xs text-slate-950 rounded-lg transition flex items-center gap-2 cursor-pointer shadow"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingLibertadores ? 'animate-spin' : ''}`} />
                    {syncingLibertadores ? 'Sincronizando Libertadores...' : 'Forçar Sincronização Libertadores'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: BRASILEIRAO */}
          {apiFutebolMode === 'BRASILEIRAO' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">Sincronizador Brasileirão Série A 2026</h3>
                <p className="text-xs text-slate-400">
                  Configure credenciais de API para carregar partidas e resultados em tempo real para o Brasileirão Série A (ID 71) Season 2026.
                </p>
              </div>

              {/* Status Alert Segment */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#5bc0be]">STATUS SÉRIE A PARA CLIENTES</span>
                    <h4 className="text-sm font-bold text-slate-200">% Visibilidade do Campeonato</h4>
                    <p className="text-xs text-slate-405 leading-relaxed pt-1">
                      Por padrão, o Brasileirão Série A vem desativado para clientes. Acione o botão abaixo para ativar/inibir a visibilidade das rodadas e permitir palpites.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleToggleBrasileirao}
                      className={`px-4 py-2 font-black text-xs rounded-lg transition duration-200 flex items-center gap-1.5 cursor-pointer border ${
                        brasileiraoAtivo
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400'
                          : 'bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950 hover:text-red-350'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      {brasileiraoAtivo ? 'ATIVADO PARA CLIENTES (Clique para Desativar)' : 'DESATIVADO PARA CLIENTES (Clique para Ativar)'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 font-mono">DADOS DE CONEXÃO DA LIGA</span>
                    <h4 className="text-sm font-bold text-slate-200 pt-0.5">Parâmetros das Requisições</h4>
                    <p className="text-xs text-slate-405 leading-relaxed pt-1.5">
                      • Campeonato ID: <span className="font-mono font-bold text-slate-200">71</span><br />
                      • Temporada / Season: <span className="font-mono font-bold text-slate-200">2026</span><br />
                      • Provedor Oficial: <span className="font-bold text-slate-200">API Football (v3.football.api-sports.io)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Synchronize Match Segment */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-900 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-300">Puxar Partidas Brasileirão</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Puxar os confrontos e scores atualizados do Brasileirão Série A em tempo real. Caso as suas credenciais estejam usando o plano gratuito ou estejam vazias, o sistema utilizará a base fallback com os maiores clássicos brasileiros para que seu teste funcione perfeitamente!
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleSyncBrasileirao}
                    disabled={syncingBrasileirao}
                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-500 font-black text-xs text-slate-950 rounded-lg transition flex items-center gap-2 cursor-pointer shadow"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingBrasileirao ? 'animate-spin' : ''}`} />
                    {syncingBrasileirao ? 'Sincronizando Brasileirão...' : 'Forçar Sincronização Brasileirão Série A'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: FUTURAS */}
          {apiFutebolMode === 'FUTURAS' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-200">Próximos Campeonatos & Modelos de API</h3>
                <p className="text-xs text-slate-400">
                  Estrutura limpa e preparada para você estender o engajamento do seu bolão para qualquer outro campeonato de futebol.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-3 opacity-75">
                  <div className="h-9 w-9 bg-blue-950 border border-blue-500/30 text-blue-400 rounded-lg flex items-center justify-center font-bold text-sm">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-200">Brasileirão Série A</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Mapeie as partidas do Campeonato Brasileiro. IDs recomendados da API-Football: League 71.
                    </p>
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400">PRONTO PARA IMPLANTAR</span>
                </div>

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-3 opacity-75">
                  <div className="h-9 w-9 bg-purple-950 border border-purple-500/30 text-purple-400 rounded-lg flex items-center justify-center font-bold text-sm">
                    U
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-200">UEFA Champions League</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Ligue a principal competição europeia ao seu bolão. ID recomendado da API-Football: League 2.
                    </p>
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400">PRONTO PARA IMPLANTAR</span>
                </div>

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-3 opacity-75">
                  <div className="h-9 w-9 bg-amber-950 border border-amber-500/30 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm">
                    +
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-200">Adicionar Customizado</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Insira ligas estaduais, copas regionais ou torneios amadores de forma 100% manual.
                    </p>
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400">ARQUITETURA PRONTA</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. GERENCIAMENTO DE JOGADORES PARTICIPANTES */}
      {activeSubTab === 'JOGADORES' && (
        <div className="space-y-4">
          
          {/* List Search and actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Procurar concorrente por nome, CPF/CNPJ, Id IXC..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-850 hover:border-slate-800 focus:border-yellow-500 rounded-lg text-xs font-semibold text-slate-200"
              />
            </div>
            
            <button
              onClick={() => handleExportCSV('JOGADORES')}
              id="btn-export-users-csv"
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:text-emerald-500 text-xs font-bold text-slate-300 rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Exportar Cadastro CSV
            </button>
          </div>

          {/* Player details editor modal display inline if set */}
          {editingUserId !== null && (
            <div className="bg-slate-950/80 border border-yellow-700/30 p-5 rounded-2xl space-y-4 text-left animate-fadeIn">
              <h4 className="text-xs font-black uppercase text-yellow-500 tracking-wider flex items-center gap-1">
                <Edit2 className="h-3.5 w-3.5" /> Alterar Atributos e Pontuações do Participante
              </h4>
              
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Razão</label>
                  <input
                    type="text"
                    value={editUserNome}
                    onChange={(e) => setEditUserNome(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-250 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Município</label>
                  <select
                    value={editUserCidade}
                    onChange={(e) => setEditUserCidade(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-250 font-semibold"
                  >
                    {CIDADES_ATENDIDAS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pontuação Total (Sobrecarga Manual)</label>
                  <input
                    type="number"
                    value={editUserPontos}
                    onChange={(e) => setEditUserPontos(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded font-mono text-center text-xs font-bold text-yellow-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ações Especiais</label>
                  <button
                    type="button"
                    onClick={() => handleResetUserScores(editingUserId)}
                    className="w-full py-2 bg-red-950/40 border border-red-900/40 hover:bg-red-900 hover:text-slate-950 text-red-400 font-bold text-[10px] rounded transition"
                  >
                    ⚠️ Resetar Pontos e Zerar Apostas
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-900 pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="px-3 py-1.5 bg-slate-900 text-slate-400 hover:text-slate-200 font-bold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUserEdit(editingUserId)}
                  className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded transition"
                >
                  Gravar Alterações
                </button>
              </div>
            </div>
          )}

          {/* Directory grid table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow overflow-x-auto">
            <div className="min-w-[800px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-450 border-b border-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">IDC</th>
                    <th className="px-4 py-3">Nome / Detalhes</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3 text-center">Cidade</th>
                    <th className="px-4 py-3 text-center w-24">Pontuação</th>
                    <th className="px-4 py-3 text-center w-36">Operações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredPlayersList.length > 0 ? (
                    filteredPlayersList.map((user) => (
                      <tr key={user.id} className={`hover:bg-slate-905/30 transition ${user.bloqueado ? 'bg-red-950/5' : ''}`}>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400">{user.ixc_id}</td>
                        <td className="px-4 py-3.5 font-bold">
                          <div className="text-slate-205">{user.nome}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{user.email || 'Não cadastrado'} • {user.telefone}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">{user.cpf_cnpj}</td>
                        <td className="px-4 py-3.5 text-center text-slate-400 font-semibold">{user.cidade}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-black text-emerald-400 text-sm">
                          {user.pontos_total} p
                        </td>
                        <td className="px-4 py-3.5 text-center flex items-center justify-center gap-1 pt-4">
                          <button
                            title="Bloquear/Liberar"
                            onClick={() => handleToggleBlockUser(user.id)}
                            className={`p-1 px-2 text-[10px] font-bold rounded transition ${
                              user.bloqueado 
                                ? 'bg-red-500 text-slate-950' 
                                : 'bg-slate-950 text-red-400 hover:bg-slate-900'
                            }`}
                          >
                            {user.bloqueado ? "BLOQUEADO" : "SUSPENDER"}
                          </button>
                          
                          <button
                            onClick={() => handleEditUserClick(user)}
                            className="p-1 bg-slate-950 border border-slate-800 hover:text-yellow-500 p-1.5 rounded"
                            title="Ajustes rápidos"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>

                          <button
                             onClick={() => handleDeleteUserAll(user.id)}
                             className="p-1 bg-slate-950 text-red-500/80 hover:bg-slate-900 rounded"
                             title="Excluir do bolão"
                          >
                             <Trash className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                        Nenhum utilizador encontrado nos parâmetros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 6. CALENDÁRIO PLANILHA JOGOS DA COPA E OUTRAS COMPETIÇÕES */}
      {activeSubTab === 'JOGOS' && (
        <div className="space-y-4 text-left">
          
          {/* Subtabs nested row for Calendário */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-800/60 select-none">
            {[
              { id: 'COPA_2026', label: 'Copa do Mundo 2026', icon: Play },
              { id: 'LIBERTADORES', label: 'Copa Libertadores', icon: Trophy },
              { id: 'BRASILEIRAO', label: 'Brasileirão Série A (ID 71)', icon: Play },
              { id: 'FUTURAS', label: '+ Próximas Competições', icon: Sliders }
            ].map((sub) => {
              const Icon = sub.icon;
              const isSubActive = calendarioMode === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setCalendarioMode(sub.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                    isSubActive
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 font-extrabold shadow'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Subtab Content: COPA 2026 */}
          {calendarioMode === 'COPA_2026' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Title block */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-400">Varreduras do Calendário - Copa do Mundo</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Adicione partidas manualmente ou gerencie o fechamento e fechamento de placares.</p>
                </div>

                <button
                  onClick={() => setCreatingMatch(!creatingMatch)}
                  id="btn-show-add-match-form-copa"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Partida Manual
                </button>
              </div>

              {/* Copa do Mundo Status and Activation Settings */}
              <div className="bg-slate-950/65 p-4 rounded-xl border border-slate-900 select-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase text-emerald-400">Status Campanha: Copa do Mundo 2026</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-2xl">
                    Altere a visibilidade do Bolão da Copa do Mundo 2026 para os participantes. Se desativado, os jogos da Copa do Mundo serão ocultados na interface do cliente.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Aba Copa para Clientes:</span>
                  <button
                    type="button"
                    onClick={handleToggleCopaMundo}
                    className={`px-4 py-2 rounded-xl text-xs font-black select-none transition flex items-center gap-2 cursor-pointer ${
                      copaMundoAtivo
                        ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                        : 'bg-red-950 border border-red-500/40 text-red-400 hover:bg-red-900/60'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {copaMundoAtivo ? 'LIBERADA (ATIVADO PARA CLIENTES)' : 'BLOQUEADA (OCULTO PARA CLIENTES)'}
                  </button>
                </div>
              </div>

              {/* Add Match Form (Conditional rendering) */}
              {creatingMatch && (
                <form onSubmit={handleCreateMatchSubmit} className="bg-slate-950 border border-emerald-950/40 p-5 rounded-2xl space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-black uppercase text-emerald-400">Criar Partida Copa do Mundo 2026</h3>
                  
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-1 grid gap-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Time Casa (E.g. Brasil)</label>
                      <input
                        type="text"
                        required
                        placeholder="Brasil"
                        value={newHomeTeam}
                        onChange={(e) => setNewHomeTeam(e.target.value)}
                        className="p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-205 font-semibold"
                      />
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="E.g 🇧🇷"
                        value={newHomeFlag}
                        onChange={(e) => setNewHomeFlag(e.target.value)}
                        className="p-2 bg-slate-900 border border-slate-800 rounded font-bold text-center text-xs mt-1 w-16"
                      />
                    </div>

                    <div className="space-y-1 grid gap-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Time Fora (E.g. Argentina)</label>
                      <input
                        type="text"
                        required
                        placeholder="Argentina"
                        value={newAwayTeam}
                        onChange={(e) => setNewAwayTeam(e.target.value)}
                        className="p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-210 font-semibold"
                      />
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="E.g 🇦🇷"
                        value={newAwayFlag}
                        onChange={(e) => setNewAwayFlag(e.target.value)}
                        className="p-2 bg-slate-900 border border-slate-800 rounded font-bold text-center text-xs mt-1 w-16"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Data e Horário Partida (Servidor)</label>
                      <input
                        type="datetime-local"
                        required
                        value={newMatchDate}
                        onChange={(e) => setNewMatchDate(e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Rodada do Grupo</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        value={newMatchRound}
                        onChange={(e) => setNewMatchRound(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-center text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-slate-900 pt-3 text-xs select-none">
                    <button
                      type="button"
                      onClick={() => setCreatingMatch(false)}
                      className="px-3 py-1.5 bg-slate-900 text-slate-400 hover:text-slate-250 font-bold rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-black rounded transition"
                    >
                      Confirmar Jogo
                    </button>
                  </div>
                </form>
              )}

              {/* Matches grid listing with inline score update */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-450 border-b border-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">Rod</th>
                      <th className="px-4 py-3">Partida / Times Concorrentes</th>
                      <th className="px-4 py-3">Data Prevista</th>
                      <th className="px-4 py-3 text-center">Placares Atuais</th>
                      <th className="px-4 py-3 text-center w-24">Status</th>
                      <th className="px-4 py-3 text-center w-32">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {jogos
                      .filter(j => !j.api_id || (!j.api_id.startsWith("libertadores_") && !j.api_id.startsWith("brasileirao_")))
                      .map((jogo) => {
                        const isEditingThis = editingMatchId === jogo.id;
                        return (
                          <tr key={jogo.id}>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">{jogo.rodada}</td>
                            <td className="px-4 py-3 font-semibold text-slate-250">
                              <span className="inline-flex items-center gap-1.5 align-middle">
                                {renderBandeira(jogo.time_casa_bandeira, "w-6 h-6", "text-sm")}
                                <span>{jogo.time_casa}</span>
                                <span className="text-slate-500 font-bold mx-1">x</span>
                                {renderBandeira(jogo.time_fora_bandeira, "w-6 h-6", "text-sm")}
                                <span>{jogo.time_fora}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {new Date(jogo.data_jogo).toLocaleDateString('pt-BR')} às {new Date(jogo.data_jogo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              {isEditingThis ? (
                                <div className="flex items-center gap-1.5 justify-center">
                                  <input
                                    type="number"
                                    placeholder="-"
                                    value={editMatchCasaPlacar}
                                    onChange={(e) => setEditMatchCasaPlacar(e.target.value)}
                                    className="w-10 p-1 bg-slate-950 border border-slate-800 rounded font-mono font-bold text-center text-xs text-yellow-500"
                                  />
                                  <span className="text-slate-650">x</span>
                                  <input
                                    type="number"
                                    placeholder="-"
                                    value={editMatchForaPlacar}
                                    onChange={(e) => setEditMatchForaPlacar(e.target.value)}
                                    className="w-10 p-1 bg-slate-950 border border-slate-800 rounded font-mono font-bold text-center text-xs text-yellow-500"
                                  />
                                </div>
                              ) : (
                                <span className="font-mono font-extrabold text-sm text-yellow-500 bg-slate-950 px-2 py-0.5 rounded">
                                  {jogo.placar_casa !== null ? jogo.placar_casa : '-'} x {jogo.placar_fora !== null ? jogo.placar_fora : '-'}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {isEditingThis ? (
                                <select
                                  value={editMatchStatus}
                                  onChange={(e) => setEditMatchStatus(e.target.value as any)}
                                  className="bg-slate-950 border border-slate-800 rounded text-[10px] py-1 font-bold text-yellow-500"
                                >
                                  <option value="PENDENTE">Aberto</option>
                                  <option value="AO_VIVO">Ao Vivo</option>
                                  <option value="ENCERRADO">Encerrado</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  jogo.status === 'AO_VIVO' 
                                    ? 'bg-red-950/80 border border-red-800/40 text-red-400 animate-pulse' 
                                    : jogo.status === 'ENCERRADO'
                                      ? 'bg-slate-950 border border-slate-800 text-slate-400'
                                      : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                                }`}>
                                  {jogo.status === 'AO_VIVO' ? 'Ao vivo' : jogo.status === 'ENCERRADO' ? 'Encerrado' : 'Aberto'}
                                </span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              {isEditingThis ? (
                                <div className="flex items-center justify-center gap-1 text-[10px]">
                                  <button
                                    onClick={() => handleSaveMatchScore(jogo.id)}
                                    className="p-1 px-2.5 bg-emerald-500 text-slate-950 font-black rounded cursor-pointer transition hover:scale-105"
                                    title="Salvar e recalcular pontos"
                                  >
                                    SALVAR 🎯
                                  </button>
                                  <button
                                    onClick={() => setEditingMatchId(null)}
                                    className="p-1 px-1.5 bg-slate-95 w-12 text-slate-350 cursor-pointer text-center font-bold"
                                  >
                                    Voltar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenMatchScoreEditor(jogo)}
                                    title="Editar partida ou fechar placar"
                                    className="p-1 bg-slate-950 hover:text-yellow-500/90 border border-slate-850 p-1.5 rounded text-slate-300"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMatch(jogo.id)}
                                    title="Deletar partida do calendário"
                                    className="p-1 bg-slate-950 text-red-500/80 hover:bg-slate-900 rounded"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: LIBERTADORES */}
          {calendarioMode === 'LIBERTADORES' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Control Segment */}
              <div className="bg-slate-950/65 p-4 rounded-xl border border-slate-900 select-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-black uppercase text-yellow-500">Varreduras do Calendário - Libertadores</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Visualize o calendário da Copa Libertadores da América, configure palpites de teste e oficialize os placares reais da rodada.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Libertadores ativa para Clientes:</span>
                  <button
                    type="button"
                    onClick={handleToggleLibertadores}
                    className={`px-4 py-2 rounded-xl text-xs font-black select-none transition flex items-center gap-2 cursor-pointer ${
                      libertadoresAtivo
                        ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                        : 'bg-red-950 border border-red-500/40 text-red-400 hover:bg-red-900/60'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {libertadoresAtivo ? 'ATIVADO' : 'BLOQUEADO'}
                  </button>
                </div>
              </div>

              {/* Instructions and tips box */}
              <div className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-300">Testagem do Fluxo de Pontos da Libertadores</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Como administrador, use o formulário de <b>Palpites de Teste</b> abaixo para simular apostas sob o seu perfil técnico de administrador. Em seguida, altere e grave o placar real de qualquer jogo para simular o recálculo imediato do ranking!
                </p>
                <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] text-slate-450">
                    O sincronizador automático de jogos da Libertadores e chaves de API estão localizados na aba <b>API Futebol</b> &gt; <b>Copa Libertadores</b>.
                  </div>
                </div>
              </div>

              {/* Matches list for Libertadores */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden overflow-x-auto shadow">
                <div className="min-w-[950px]">
                  <div className="bg-slate-950 text-xs font-black uppercase text-slate-400 px-4 py-3.5 border-b border-slate-900 grid grid-cols-12 gap-2 select-none">
                    <span className="col-span-2">Data / Hora</span>
                    <span className="col-span-4 text-center">Partida / Clubes</span>
                    <span className="col-span-1 text-center font-bold">Placar</span>
                    <span className="col-span-2 text-center">Status</span>
                    <span className="col-span-3 text-right">Ações Administrador / Palpite de Teste</span>
                  </div>

                  <div className="divide-y divide-slate-900/70">
                    {jogos.filter(j => j.api_id && j.api_id.startsWith("libertadores_")).length > 0 ? (
                      jogos
                        .filter(j => j.api_id && j.api_id.startsWith("libertadores_"))
                        .map(jogo => {
                          const hasTestBet = adminPalpites.find(p => p.jogo_id === jogo.id);
                          const isEditing = editingMatchId === jogo.id;

                          return (
                            <div key={jogo.id} className="px-4 py-4 hover:bg-slate-905/35 transition grid grid-cols-12 gap-2 items-center text-xs">
                              <div className="col-span-2 font-mono text-slate-450">
                                {new Date(jogo.data_jogo).toLocaleString('pt-BR')}
                              </div>

                              <div className="col-span-4 flex items-center justify-between px-3">
                                <div className="flex items-center gap-2 w-[45%] justify-end">
                                  <span className="font-semibold text-slate-200 truncate">{jogo.time_casa}</span>
                                  <span className="text-base select-none">{renderBandeira(jogo.time_casa_bandeira)}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase shrink-0">vs</span>
                                <div className="flex items-center gap-2 w-[45%]">
                                  <span className="text-base select-none">{renderBandeira(jogo.time_fora_bandeira)}</span>
                                  <span className="font-semibold text-slate-200 truncate">{jogo.time_fora}</span>
                                </div>
                              </div>

                              <div className="col-span-1 text-center font-mono font-bold text-yellow-500">
                                {jogo.status === 'PENDENTE' ? (
                                  <span className="text-slate-550">- x -</span>
                                ) : (
                                  <span>{jogo.placar_casa} x {jogo.placar_fora}</span>
                                )}
                              </div>

                              <div className="col-span-2 text-center select-none">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded ${
                                  jogo.status === 'PENDENTE'
                                    ? 'bg-slate-800/80 text-slate-400'
                                    : jogo.status === 'AO_VIVO'
                                    ? 'bg-red-950 border border-red-500/20 text-red-400 animate-pulse'
                                    : 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {jogo.status}
                                </span>
                              </div>

                              <div className="col-span-3">
                                {isEditing ? (
                                  <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl space-y-2 text-left">
                                    <div className="flex items-center justify-center gap-2 font-mono">
                                      <input
                                        type="number"
                                        maxLength={2}
                                        value={editMatchCasaPlacar}
                                        onChange={(e) => setEditMatchCasaPlacar(e.target.value)}
                                        className="w-10 text-center bg-slate-900 border border-slate-700 text-yellow-500 text-xs py-1 rounded-md"
                                      />
                                      <span className="text-slate-500">x</span>
                                      <input
                                        type="number"
                                        maxLength={2}
                                        value={editMatchForaPlacar}
                                        onChange={(e) => setEditMatchForaPlacar(e.target.value)}
                                        className="w-10 text-center bg-slate-900 border border-slate-700 text-yellow-500 text-xs py-1 rounded-md"
                                      />
                                    </div>
                                    <select
                                      value={editMatchStatus}
                                      onChange={(e: any) => setEditMatchStatus(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1"
                                    >
                                      <option value="PENDENTE">PENDENTE</option>
                                      <option value="AO_VIVO">AO_VIVO</option>
                                      <option value="ENCERRADO">ENCERRADO</option>
                                    </select>
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => setEditingMatchId(null)}
                                        className="px-2 py-1 bg-slate-800 rounded text-[9px] text-slate-400 hover:text-slate-200"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSaveMatchScore(jogo.id)}
                                        className="px-2.5 py-1 bg-yellow-500 rounded text-[9px] font-black text-slate-950 hover:bg-yellow-400"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2 text-right">
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingMatchId(jogo.id);
                                          setEditMatchCasaPlacar(jogo.placar_casa !== null ? String(jogo.placar_casa) : "");
                                          setEditMatchForaPlacar(jogo.placar_fora !== null ? String(jogo.placar_fora) : "");
                                          setEditMatchStatus(jogo.status);
                                        }}
                                        className="px-2 py-1 bg-slate-900 border border-slate-850 hover:border-slate-700 hover:text-yellow-500 rounded text-[10px] font-semibold text-slate-400 transition cursor-pointer"
                                      >
                                        Oficializar Placar
                                      </button>
                                    </div>

                                    {/* Bet test flow for admin */}
                                    {jogo.status === 'PENDENTE' && (
                                      <div className="flex items-center justify-end gap-1.5 font-mono">
                                        <span className="text-[10px] text-slate-450 font-sans mr-1">Palpite Teste:</span>
                                        <input
                                          type="number"
                                          placeholder="C"
                                          value={testPlacares[jogo.id]?.casa || ""}
                                          onChange={(e) => setTestPlacares(prev => ({
                                            ...prev,
                                            [jogo.id]: { casa: e.target.value, fora: prev[jogo.id]?.fora || "" }
                                          }))}
                                          className="w-7 text-center bg-slate-950 border border-slate-850 focus:border-slate-700 text-yellow-500 font-bold text-xs h-6 rounded"
                                        />
                                        <span className="text-slate-650 text-[10px]">x</span>
                                        <input
                                          type="number"
                                          placeholder="F"
                                          value={testPlacares[jogo.id]?.fora || ""}
                                          onChange={(e) => setTestPlacares(prev => ({
                                            ...prev,
                                            [jogo.id]: { casa: prev[jogo.id]?.casa || "", fora: e.target.value }
                                          }))}
                                          className="w-7 text-center bg-slate-950 border border-slate-850 focus:border-slate-700 text-yellow-500 font-bold text-xs h-6 rounded"
                                        />
                                        <button
                                          onClick={() => submitTestPrediction(jogo.id)}
                                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-bold tracking-tight transition ml-1 cursor-pointer"
                                        >
                                          {hasTestBet ? 'Reenviar' : 'Palpitar'}
                                        </button>
                                      </div>
                                    )}

                                    {hasTestBet && (
                                      <div className="text-[10px] text-slate-450 flex items-center gap-1.5 justify-end uppercase tracking-tight select-none mt-1">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Palpitado de Teste ({hasTestBet.placar_casa} x {hasTestBet.placar_fora})
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-20 text-center text-slate-500 space-y-2">
                        <Trophy className="h-10 w-10 text-slate-700 mx-auto" />
                        <p className="text-xs">
                          Nenhuma partida da Libertadores foi encontrada na base de dados. Sincronize usando o painel na aba <b>API Futebol</b>!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: BRASILEIRAO */}
          {calendarioMode === 'BRASILEIRAO' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Control Segment */}
              <div className="bg-slate-950/65 p-4 rounded-xl border border-slate-900 select-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-black uppercase text-yellow-500">Varreduras do Calendário - Brasileirão Série A</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Visualize o calendário do Brasileirão Série A, configure palpites de teste e oficialize os placares reais da rodada.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Brasileirão ativo para Clientes:</span>
                  <button
                    type="button"
                    onClick={handleToggleBrasileirao}
                    className={`px-4 py-2 rounded-xl text-xs font-black select-none transition flex items-center gap-2 cursor-pointer ${
                      brasileiraoAtivo
                        ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                        : 'bg-red-950 border border-red-500/40 text-red-400 hover:bg-red-900/60'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {brasileiraoAtivo ? 'ATIVADO' : 'BLOQUEADO'}
                  </button>
                </div>
              </div>

              {/* Instructions and tips box */}
              <div className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-300">Testagem do Fluxo de Pontos do Brasileirão</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Como administrador, use o formulário de <b>Palpites de Teste</b> abaixo para simular apostas sob o seu perfil de administrador. Em seguida, altere e grave o placar real de qualquer jogo para simular o recálculo imediato do ranking!
                </p>
                <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] text-slate-450">
                    O Sincronizador de jogos do Brasileirão Série A e chaves de API estão localizados na aba <b>API Futebol</b> &gt; <b>Brasileirão Série A (ID 71)</b>.
                  </div>
                </div>
              </div>

              {/* Matches list for Brasileirao */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden overflow-x-auto shadow">
                <div className="min-w-[950px]">
                  <div className="bg-slate-950 text-xs font-black uppercase text-slate-400 px-4 py-3.5 border-b border-slate-900 grid grid-cols-12 gap-2 select-none">
                    <span className="col-span-2">Data / Hora</span>
                    <span className="col-span-4 text-center">Partida / Clubes</span>
                    <span className="col-span-1 text-center font-bold">Placar</span>
                    <span className="col-span-2 text-center">Status</span>
                    <span className="col-span-3 text-right">Ações Administrador / Palpite de Teste</span>
                  </div>

                  <div className="divide-y divide-slate-900/70">
                    {jogos.filter(j => j.api_id && j.api_id.startsWith("brasileirao_")).length > 0 ? (
                      jogos
                        .filter(j => j.api_id && j.api_id.startsWith("brasileirao_"))
                        .map(jogo => {
                          const hasTestBet = adminPalpites.find(p => p.jogo_id === jogo.id);
                          const isEditing = editingMatchId === jogo.id;

                          return (
                            <div key={jogo.id} className="px-4 py-4 hover:bg-slate-905/35 transition grid grid-cols-12 gap-2 items-center text-xs">
                              <div className="col-span-2 font-mono text-slate-450">
                                {new Date(jogo.data_jogo).toLocaleString('pt-BR')}
                              </div>

                              <div className="col-span-4 flex items-center justify-between px-3">
                                <div className="flex items-center gap-2 w-[45%] justify-end">
                                  <span className="font-semibold text-slate-200 truncate">{jogo.time_casa}</span>
                                  <span className="text-base select-none">{renderBandeira(jogo.time_casa_bandeira)}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase shrink-0">vs</span>
                                <div className="flex items-center gap-2 w-[45%]">
                                  <span className="text-base select-none">{renderBandeira(jogo.time_fora_bandeira)}</span>
                                  <span className="font-semibold text-slate-200 truncate">{jogo.time_fora}</span>
                                </div>
                              </div>

                              <div className="col-span-1 text-center font-mono font-bold text-yellow-500">
                                {jogo.status === 'PENDENTE' ? (
                                  <span className="text-slate-550">- x -</span>
                                ) : (
                                  <span>{jogo.placar_casa} x {jogo.placar_fora}</span>
                                )}
                              </div>

                              <div className="col-span-2 text-center select-none">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded ${
                                  jogo.status === 'PENDENTE' 
                                    ? 'bg-slate-950 border border-slate-800 text-slate-450' 
                                    : jogo.status === 'AO_VIVO' 
                                      ? 'bg-red-950 border border-red-500/50 text-red-400 font-extrabold shadow shadow-red-950' 
                                      : 'bg-emerald-950 border border-emerald-500/40 text-emerald-450'
                                }`}>
                                  {jogo.status === 'PENDENTE' ? '⚽ PENDENTE' : jogo.status === 'AO_VIVO' ? '🚨 AO VIVO' : '🏆 ENCERRADO'}
                                </span>
                              </div>

                              <div className="col-span-3">
                                {isEditing ? (
                                  <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl space-y-2 text-left">
                                    <div className="flex items-center justify-center gap-2 font-mono">
                                      <input
                                        type="number"
                                        maxLength={2}
                                        value={editMatchCasaPlacar}
                                        onChange={(e) => setEditMatchCasaPlacar(e.target.value)}
                                        className="w-10 text-center bg-slate-900 border border-slate-700 text-yellow-500 text-xs py-1 rounded-md"
                                      />
                                      <span className="text-slate-500">x</span>
                                      <input
                                        type="number"
                                        maxLength={2}
                                        value={editMatchForaPlacar}
                                        onChange={(e) => setEditMatchForaPlacar(e.target.value)}
                                        className="w-10 text-center bg-slate-900 border border-slate-700 text-yellow-500 text-xs py-1 rounded-md"
                                      />
                                    </div>
                                    <select
                                      value={editMatchStatus}
                                      onChange={(e: any) => setEditMatchStatus(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1"
                                    >
                                      <option value="PENDENTE">PENDENTE</option>
                                      <option value="AO_VIVO">AO_VIVO</option>
                                      <option value="ENCERRADO">ENCERRADO</option>
                                    </select>
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => setEditingMatchId(null)}
                                        className="px-2 py-1 bg-slate-800 rounded text-[9px] text-slate-400 hover:text-slate-200"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSaveMatchScore(jogo.id)}
                                        className="px-2.5 py-1 bg-yellow-500 rounded text-[9px] font-black text-slate-950 hover:bg-yellow-400"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2 text-right">
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingMatchId(jogo.id);
                                          setEditMatchCasaPlacar(jogo.placar_casa !== null ? String(jogo.placar_casa) : "");
                                          setEditMatchForaPlacar(jogo.placar_fora !== null ? String(jogo.placar_fora) : "");
                                          setEditMatchStatus(jogo.status);
                                        }}
                                        className="px-2 py-1 bg-slate-900 border border-slate-850 hover:border-slate-700 hover:text-yellow-500 rounded text-[10px] font-semibold text-slate-400 transition cursor-pointer"
                                      >
                                        Oficializar Placar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMatch(jogo.id)}
                                        className="p-1 px-2 border border-red-950/60 bg-red-950/20 text-red-400 hover:text-white hover:bg-red-950 rounded font-bold text-[10px] transition cursor-pointer"
                                        title="Excluir partida do calendário"
                                      >
                                        EXCLUIR
                                      </button>
                                    </div>

                                    {jogo.status === 'PENDENTE' && (
                                      <div className="flex items-center justify-end gap-1.5 font-mono">
                                        <span className="text-[10px] text-slate-450 font-sans mr-1">Palpite Teste:</span>
                                        <input
                                          type="number"
                                          placeholder="C"
                                          value={testPlacares[jogo.id]?.casa || ""}
                                          onChange={(e) => setTestPlacares(prev => ({
                                            ...prev,
                                            [jogo.id]: { casa: e.target.value, fora: prev[jogo.id]?.fora || "" }
                                          }))}
                                          className="w-7 text-center bg-slate-950 border border-slate-850 focus:border-slate-700 text-yellow-500 font-bold text-xs h-6 rounded"
                                        />
                                        <span className="text-slate-650 text-[10px]">x</span>
                                        <input
                                          type="number"
                                          placeholder="F"
                                          value={testPlacares[jogo.id]?.fora || ""}
                                          onChange={(e) => setTestPlacares(prev => ({
                                            ...prev,
                                            [jogo.id]: { casa: prev[jogo.id]?.casa || "", fora: e.target.value }
                                          }))}
                                          className="w-7 text-center bg-slate-950 border border-slate-850 focus:border-slate-700 text-yellow-500 font-bold text-xs h-6 rounded"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => submitTestPrediction(jogo.id)}
                                          className="p-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white transition font-bold rounded text-[10px] cursor-pointer"
                                        >
                                          SALVAR
                                        </button>
                                      </div>
                                    )}

                                    {hasTestBet && (
                                      <div className="text-[10px] text-slate-450 flex items-center gap-1.5 justify-end uppercase tracking-tight select-none mt-1">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Palpitado de Teste ({hasTestBet.placar_casa} x {hasTestBet.placar_fora})
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-20 text-center text-slate-500 space-y-2">
                        <Trophy className="h-10 w-10 text-slate-700 mx-auto" />
                        <p className="text-xs">
                          Nenhuma partida do Brasileirão Série A foi encontrada na base de dados. Sincronize usando o painel na aba <b>API Futebol</b>!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: FUTURAS */}
          {calendarioMode === 'FUTURAS' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-200">Gerenciar Próximas Competições</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Adicione e controle novos campeonatos e ligas esportivas no seu painel. A arquitetura elástica de dados (NoSQL/Relacional híbrido) suporta novas competições sem alteração estrutural no servidor.
                </p>
              </div>

              {/* Form placeholder */}
              <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl grid gap-4 sm:grid-cols-2 opacity-80 select-none text-left">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-yellow-500 tracking-wider">Mapeamento Técnico de Nova Competição</h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Competição</label>
                    <input disabled type="text" placeholder="UEFA Champions League (Mapeando)" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-400 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ID na API-Sports Football</label>
                    <input disabled type="number" placeholder="2" className="w-full p-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-400 cursor-not-allowed" />
                  </div>
                  <button type="button" disabled className="px-4 py-2 bg-slate-900 text-slate-600 font-bold text-[10px] uppercase rounded-lg border border-slate-800/80 cursor-not-allowed">
                    Ativar Coleta Ativa
                  </button>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-extrabold uppercase text-slate-300">Arquitetura Elástica Pronta:</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Todas as consultas baseiam-se em identificadores flexíveis no banco de dados. No momento que o programador cadastrar uma nova liga na base, ela passará a ser listada automaticamente para clientes apostarem e disputarem as pontuações do ranking unificado do provedor!
                    </p>
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-500/20 p-2.5 rounded-lg text-[10px] text-yellow-500 leading-normal">
                    💡 <b>Suporte técnico pronto para adicionar</b>: Brasileirão Série A, Champions League, Copa América, Eurocopa ou torneios estaduais.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 7. RELATÓRIOS E COMPILADORES IMPRESSIVEIS */}
      {activeSubTab === 'RELATORIOS' && (
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-205">Sessão de Relatórios & Geração de Arquivos</h3>
            <p className="text-xs text-slate-400">
              Emitir e extrair inteligência do campeonato para apresentações executivas das gerências ou distribuição local do provedor.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            
            <div className="bg-slate-950 p-4 rounded-xl space-y-3 flex flex-col justify-between text-left border border-slate-900 shadow">
              <div>
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block font-mono">CADASTRO GERAL</span>
                <span className="text-sm font-bold text-slate-200 mt-2 block">Lista de Palpiteiros</span>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Arquivo contendo listagem inteira dos apostadores, municípios, CPFs associados, e-mail de contato, e pontuações consolidadas.
                </p>
              </div>
              <button
                onClick={() => handleExportCSV('JOGADORES')}
                className="w-full py-2 bg-slate-905 border border-slate-800 text-slate-350 select-none hover:text-emerald-400 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" /> Baixar Planilha CSV
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-3 flex flex-col justify-between text-left border border-slate-900 shadow">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block font-mono">ANÁLISE DE ENGAJAMENTO</span>
                <span className="text-sm font-bold text-slate-200 mt-2 block">Cidade & Municípios</span>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Dados consolidados de quantidade de participantes e média aritmética de pontos obtidos segmentados por filial de cidades atendidas no provedor.
                </p>
              </div>
              <button
                onClick={() => handleExportCSV('CIDADES')}
                className="w-full py-2 bg-slate-905 border border-slate-800 text-slate-350 select-none hover:text-emerald-400 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" /> Baixar Planilha CSV
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-3 flex flex-col justify-between text-left border border-slate-900 shadow">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">TRÁFEGO DE APOSTAS</span>
                <span className="text-sm font-bold text-slate-200 mt-2 block">Ranking de Jogos</span>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Tabela que ordena as partidas da Copa do Mundo mais palpitadas e o fluxo dinâmico de apostas recebidas em cada rodada.
                </p>
              </div>
              <button
                onClick={() => handleExportCSV('JOGOS')}
                className="w-full py-2 bg-slate-905 border border-slate-800 text-slate-350 select-none hover:text-emerald-400 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" /> Baixar Planilha CSV
              </button>
            </div>

          </div>

          {/* Styled actions to print report format */}
          <div className="bg-slate-955 border border-slate-900 p-5 rounded-xl text-left space-y-3">
            <h4 className="text-xs font-bold text-slate-205 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Relatório para Impressão de Alta Fidelidade
            </h4>
            <p className="text-[11px] text-slate-450 leading-relaxed">
              O botão abaixo reorganiza e formata todo o painel de classificação em modelo limpo de cor clara para impressão direta no seu navegador (PDF ou Impressora Física).
            </p>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-yellow-500 font-bold text-xs rounded transition flex items-center gap-1.5 select-none cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-yellow-500" />
              Imprimir / Salvar PDF do Ranking
            </button>
          </div>
        </div>
      )}

      {/* 8. AUDITORIA DE REGRAS E LOGS */}
      {activeSubTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-950/65 p-3 rounded-xl border border-slate-900 select-none">
            <div>
              <span className="text-xs font-black uppercase text-yellow-500">Trilhas de Auditoria (Logs)</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Visão transparente de chamadas IXC, criação de jogos, e palpites efetuados.</p>
            </div>
            
            <button
              onClick={triggerAuditLogsLoading}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 text-[10px] uppercase font-bold text-slate-300 rounded-lg transition flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Limpar Filtros / Recarregar
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="bg-slate-950 text-[10px] font-bold uppercase text-slate-400 px-4 py-2.5 border-b border-slate-900 grid grid-cols-12 gap-2">
                <span className="col-span-2">Data / Hora</span>
                <span className="col-span-2">Tipo Ação</span>
                <span className="col-span-5">Descrição Completa</span>
                <span className="col-span-2 font-semibold">Originador</span>
                <span className="col-span-1 text-right">IP Cliente</span>
              </div>

              <div className="divide-y divide-slate-900 font-mono text-[11px] leading-relaxed max-h-[440px] overflow-y-auto">
                {logs.length > 0 ? (
                  logs.map((lg) => (
                    <div key={lg.id} className="px-4 py-3 bg-slate-905/30 hover:bg-slate-905/60 transition grid grid-cols-12 gap-2">
                      <span className="col-span-2 text-slate-500">{new Date(lg.data).toLocaleString('pt-BR')}</span>
                      <span className="col-span-2 text-yellow-500 font-bold tracking-tight truncate pr-1" title={lg.acao}>{lg.acao}</span>
                      <span className="col-span-5 text-slate-300">{lg.descricao}</span>
                      <span className="col-span-2 text-slate-400 font-sans font-bold truncate pr-1">{lg.usuario}</span>
                      <span className="col-span-1 text-slate-500 text-right truncate">{lg.ip}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Ainda não há logs de auditoria gravados.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. CADASTRO E GERENCIAMENTO DE ADMINISTRADORES (SUB-ADMINS) */}
      {activeSubTab === 'ADMINS' && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase text-yellow-500 mb-2">
              {editingSubAdmin ? "Editar Usuário Administrador" : "Cadastrar Novo Administrador"}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Cadastre usuários adicionais da equipe para acessar o painel administrativo e defina restrições para garantir a segurança dos dados.
            </p>

            <form onSubmit={handleSaveSubAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nome do Administrador</label>
                  <input
                    type="text"
                    value={subAdminNome}
                    onChange={(e) => setSubAdminNome(e.target.value)}
                    placeholder="Ex: Agenor Tec"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Email de Acesso</label>
                  <input
                    type="email"
                    value={subAdminEmail}
                    onChange={(e) => setSubAdminEmail(e.target.value)}
                    placeholder="Ex: agenor@provedor.com"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-yellow-500"
                    required
                    disabled={!!editingSubAdmin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Senha de Acesso</label>
                  <input
                    type="text"
                    value={subAdminSenha}
                    onChange={(e) => setSubAdminSenha(e.target.value)}
                    placeholder={editingSubAdmin ? "Deixe em branco para manter a atual" : "Padrão se vazio: 200616"}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Permissions settings */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <span className="block text-xs font-black uppercase text-slate-300 mb-2">Restrições e Permissões Administrativas</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-start gap-2.5 p-3 bg-slate-950/40 rounded-lg border border-slate-900 select-none cursor-pointer hover:border-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={subAdminPodeEditar}
                      onChange={(e) => setSubAdminPodeEditar(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-900 text-yellow-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-200">Permissão para Editar Dados</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Permite alterar palpites, partidas, pontuações, configs de conexão e sincronizar APIs.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-slate-950/40 rounded-lg border border-slate-950 select-none cursor-pointer hover:border-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={subAdminPodeExcluir}
                      onChange={(e) => setSubAdminPodeExcluir(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-900 text-yellow-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-200">Permissão para Excluir Registros</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Possibilita excluir participantes e remover partidas inteiras do calendário.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-slate-950/40 rounded-lg border border-slate-900 select-none cursor-pointer hover:border-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={subAdminPodeAtivarCampeonato}
                      onChange={(e) => setSubAdminPodeAtivarCampeonato(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-900 text-yellow-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 mt-0.5"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-200">Permissão para Liberar Campeonatos</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Controla se o usuário pode ativar ou desativar ligas de campeonato para clientes.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {editingSubAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubAdmin(null);
                      setSubAdminNome("");
                      setSubAdminEmail("");
                      setSubAdminSenha("");
                      setSubAdminPodeExcluir(true);
                      setSubAdminPodeEditar(true);
                      setSubAdminPodeAtivarCampeonato(true);
                    }}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:text-slate-100 text-xs font-bold text-slate-450 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                )}
                
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-yellow-550 hover:bg-yellow-600 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-yellow-950/10 flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {editingSubAdmin ? "Atualizar Administrador" : "Salvar Novo Administrador"}
                </button>
              </div>
            </form>
          </div>

          {/* Administrators directory list */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase text-yellow-500 mb-4 font-extrabold tracking-wider">Membros da Equipe Administrativa</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* Core Unrestricted Super Admin (Reference block) */}
              <div className="bg-slate-900/60 border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-auto text-[9px] uppercase tracking-wider bg-yellow-400 text-slate-950 px-2.5 py-1 font-black rounded-bl-xl shadow-sm">
                  Super Usuário Padrão
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-yellow-950/45 border border-yellow-800/40 text-yellow-500 flex items-center justify-center font-black text-sm uppercase">
                    SU
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="block text-sm font-extrabold text-slate-100">Suporte Unity</span>
                    <span className="block text-xs text-slate-400">suporte@unityautomacoes.com.br</span>
                    
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
                        Pode Editar ✔
                      </span>
                      <span className="text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
                        Pode Excluir ✔
                      </span>
                      <span className="text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
                        Pode Liberar Campeonato ✔
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic DB sub-admins list */}
              {subAdmins
                .filter(a => a.email.toLowerCase() !== "suporte@unityautomacoes.com.br")
                .map((adm) => (
                  <div key={adm.id} className="bg-slate-900/30 border border-slate-800/80 hover:border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-950/45 border border-emerald-800/40 text-emerald-400 flex items-center justify-center font-black text-sm uppercase">
                          {adm.nome.slice(0, 2)}
                        </div>
                        <div className="space-y-1">
                          <span className="block text-sm font-extrabold text-slate-100">{adm.nome}</span>
                          <span className="block text-xs text-slate-450">{adm.email}</span>
                          
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            <span className={`text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full ${
                              adm.podeEditar !== false 
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                                : 'bg-red-950/50 text-red-400 border border-red-900/40'
                            }`}>
                              Editar: {adm.podeEditar !== false ? 'SIM ✔' : 'NÃO ✖'}
                            </span>
                            <span className={`text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full ${
                              adm.podeExcluir !== false 
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                                : 'bg-red-950/50 text-red-400 border border-red-900/40'
                            }`}>
                              Excluir: {adm.podeExcluir !== false ? 'SIM ✔' : 'NÃO ✖'}
                            </span>
                            <span className={`text-[9px] uppercase font-black tracking-tight px-2 py-0.5 rounded-full ${
                              adm.podeAtivarCampeonato !== false 
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' 
                                : 'bg-red-950/50 text-red-400 border border-red-900/40'
                            }`}>
                              Liberar Ligas: {adm.podeAtivarCampeonato !== false ? 'SIM ✔' : 'NÃO ✖'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-900 pt-3 select-none">
                      <button
                        onClick={() => {
                          setEditingSubAdmin(adm);
                          setSubAdminNome(adm.nome);
                          setSubAdminEmail(adm.email);
                          setSubAdminSenha("");
                          setSubAdminPodeExcluir(adm.podeExcluir !== false);
                          setSubAdminPodeEditar(adm.podeEditar !== false);
                          setSubAdminPodeAtivarCampeonato(adm.podeAtivarCampeonato !== false);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1.5 bg-slate-905 border border-slate-800 text-[10px] uppercase font-bold text-slate-350 hover:text-yellow-500 rounded-lg transition"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDeleteSubAdmin(adm.id)}
                        className="px-2.5 py-1.5 bg-slate-905 border border-slate-800 text-[10px] uppercase font-bold text-slate-350 hover:text-red-500 hover:border-red-950 rounded-lg transition flex items-center gap-1"
                      >
                        <Trash className="h-3 w-3" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}

              {subAdmins.filter(a => a.email.toLowerCase() !== "suporte@unityautomacoes.com.br").length === 0 && (
                <div className="col-span-2 py-10 border border-dashed border-slate-850 rounded-2xl text-center text-xs text-slate-500">
                  Nenhum sub-administrador secundário cadastrado de momento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
