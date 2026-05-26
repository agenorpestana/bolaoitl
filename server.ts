import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import http from "http";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

import { 
  Usuario, 
  Jogo, 
  Palpite, 
  ConfigPoints, 
  ConfigIXC, 
  ConfigFootballApi, 
  AuditLog, 
  AdminUser 
} from "./src/types";
import { INITIAL_GAMES, INITIAL_POINTS_CONFIG, CIDADES_ATENDIDAS } from "./src/data";

const JWT_SECRET = process.env.JWT_SECRET || "copa-bolao-2026-super-secret-key-isp";

// Ensure database file exists with initial structure
const DB_FILE = path.join(process.cwd(), "database.json");

interface LocalDatabase {
  usuarios: Usuario[];
  jogos: Jogo[];
  palpites: Palpite[];
  configs_ixc: ConfigIXC;
  configs_points: ConfigPoints;
  configs_football: ConfigFootballApi;
  logs: AuditLog[];
  admins: AdminUser[];
}

// ==========================================
// PRISMA CLIENT & DYNAMIC MYSQL DATABASE URL CONTEXT
// ==========================================
let prisma: PrismaClient | null = null;

if (process.env.DB_USER && process.env.DB_NAME && !process.env.DATABASE_URL) {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD || "";
  const name = process.env.DB_NAME;
  process.env.DATABASE_URL = `mysql://${user}:${encodeURIComponent(pass)}@${host}:3306/${name}`;
  console.log(`[MySql DB Setup] Dynamically constructed DATABASE_URL for user ${user} on host ${host}`);
}

if (process.env.DATABASE_URL) {
  prisma = new PrismaClient();
  console.log("[MySql DB Setup] Initialized PrismaClient using active URL configuration.");
}

let cachedDb: LocalDatabase | null = null;

function loadDatabase(): LocalDatabase {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = loadDatabaseFromFile();
  return cachedDb;
}

function loadDatabaseFromFile(): LocalDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data) as LocalDatabase;
    }
  } catch (err) {
    console.error("Error reading database file, resetting...", err);
  }

  // Create initial structure (pristine empty list of users and palpites to prevent fictitious data sync)
  const initialDb: LocalDatabase = {
    usuarios: [],
    jogos: INITIAL_GAMES,
    palpites: [],
    configs_ixc: {
      url: "https://provedor-ixc.exemplo.com.br",
      token: "6:4dacdb8e47193e8cbbabe508c3c59b4547e463817b1d9b9a1d20ab4812fe1a62",
      chave: "ixc_default_api_key_copa",
      timeout: 5000,
      offline_mode: false // default to production API representation
    },
    configs_points: INITIAL_POINTS_CONFIG,
    configs_football: {
      key: "dummy_soccer_api_key_2026_sports",
      url: "https://v3.football.api-sports.io",
      status_conexao: "CONECTADO",
      cron_active: true,
      manual_override: true
    },
    logs: [
      {
        id: 1,
        usuario: "Sistema",
        acao: "INICIALIZACAO",
        descricao: "Banco de dados inicializado com sucesso e 8 partidas programadas.",
        ip: "127.0.0.1",
        data: new Date().toISOString()
      },
      {
        id: 2,
        usuario: "Admin",
        acao: "CONFIGURACAO_CONECTIVIDADE",
        descricao: "Simulação de API IXC Soft ativada como retaguarda segura.",
        ip: "127.0.0.1",
        data: new Date().toISOString()
      }
    ],
    admins: [
      { id: 1, email: "suporte@unityautomacoes.com.br", nome: "Suporte Unity" }
    ]
  };

  saveDatabase(initialDb);
  return initialDb;
}

let isSyncing = false;
let needsSync = false;

function saveDatabase(db: LocalDatabase) {
  cachedDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file", err);
  }

  // Trigger asynchronous sync with MySQL
  triggerMySqlSync();
}

function triggerMySqlSync() {
  if (!prisma) return;
  if (isSyncing) {
    needsSync = true;
    return;
  }

  isSyncing = true;
  saveDatabaseToMySqlIncremental(cachedDb)
    .catch((err: any) => {
      console.error("[MySql Sync] Incremental save failed:", err.message);
    })
    .finally(() => {
      isSyncing = false;
      if (needsSync) {
        needsSync = false;
        setTimeout(triggerMySqlSync, 100);
      }
    });
}

async function saveDatabaseToMySqlIncremental(db: LocalDatabase | null) {
  if (!prisma || !db) return;

  try {
    // 1. Sync clients (Usuario)
    for (const u of db.usuarios) {
      await prisma.usuario.upsert({
        where: { id: u.id },
        update: {
          ixc_id: u.ixc_id,
          nome: u.nome,
          cpf_cnpj: u.cpf_cnpj,
          telefone: u.telefone,
          email: u.email,
          cidade: u.cidade,
          avatar: u.avatar || "⚽",
          pontos_total: u.pontos_total,
          acertos_exato: u.acertos_exato,
          acertos_vencedor: u.acertos_vencedor,
          erros: u.erros,
          bloqueado: u.bloqueado
        },
        create: {
          id: u.id,
          ixc_id: u.ixc_id,
          nome: u.nome,
          cpf_cnpj: u.cpf_cnpj,
          telefone: u.telefone,
          email: u.email,
          cidade: u.cidade,
          avatar: u.avatar || "⚽",
          pontos_total: u.pontos_total,
          acertos_exato: u.acertos_exato,
          acertos_vencedor: u.acertos_vencedor,
          erros: u.erros,
          bloqueado: u.bloqueado,
          created_at: new Date(u.created_at)
        }
      });
    }

    // Handle deletions of users
    const dbUserIds = db.usuarios.map(u => u.id);
    await prisma.usuario.deleteMany({
      where: { id: { notIn: dbUserIds } }
    });

    // 2. Sync games (Jogo)
    for (const g of db.jogos) {
      await prisma.jogo.upsert({
        where: { id: g.id },
        update: {
          api_id: g.api_id,
          time_casa: g.time_casa,
          time_fora: g.time_fora,
          time_casa_bandeira: g.time_casa_bandeira || "🏳️",
          time_fora_bandeira: g.time_fora_bandeira || "🏳️",
          data_jogo: new Date(g.data_jogo),
          placar_casa: g.placar_casa,
          placar_fora: g.placar_fora,
          status: g.status,
          rodada: g.rodada
        },
        create: {
          id: g.id,
          api_id: g.api_id,
          time_casa: g.time_casa,
          time_fora: g.time_fora,
          time_casa_bandeira: g.time_casa_bandeira || "🏳️",
          time_fora_bandeira: g.time_fora_bandeira || "🏳️",
          data_jogo: new Date(g.data_jogo),
          placar_casa: g.placar_casa,
          placar_fora: g.placar_fora,
          status: g.status,
          rodada: g.rodada
        }
      });
    }

    const dbJogoIds = db.jogos.map(g => g.id);
    await prisma.jogo.deleteMany({
      where: { id: { notIn: dbJogoIds } }
    });

    // 3. Sync bets (Palpite)
    for (const p of db.palpites) {
      const userExist = db.usuarios.some(u => u.id === p.usuario_id);
      const gameExist = db.jogos.some(g => g.id === p.jogo_id);
      if (!userExist || !gameExist) continue;

      await prisma.palpite.upsert({
        where: { id: p.id },
        update: {
          usuario_id: p.usuario_id,
          jogo_id: p.jogo_id,
          placar_casa: p.placar_casa,
          placar_fora: p.placar_fora,
          pontos: p.pontos
        },
        create: {
          id: p.id,
          usuario_id: p.usuario_id,
          jogo_id: p.jogo_id,
          placar_casa: p.placar_casa,
          placar_fora: p.placar_fora,
          pontos: p.pontos,
          created_at: new Date(p.created_at)
        }
      });
    }

    const dbPalpiteIds = db.palpites.map(p => p.id);
    await prisma.palpite.deleteMany({
      where: { id: { notIn: dbPalpiteIds } }
    });

    // 4. Sync Configs (Configuracoes)
    await prisma.configuracoes.upsert({
      where: { id: 1 },
      update: {
        ixc_url: db.configs_ixc.url,
        ixc_token: db.configs_ixc.token,
        ixc_chave: db.configs_ixc.chave || "",
        ixc_timeout: db.configs_ixc.timeout,
        ixc_offline_mode: db.configs_ixc.offline_mode,
        points_vencedor: db.configs_points.pontos_acertar_vencedor,
        points_empate: db.configs_points.pontos_acertar_empate,
        points_placar_exato: db.configs_points.pontos_acertar_placar_exato,
        bonus_rodada: db.configs_points.bonus_rodada,
        bonus_sequencia: db.configs_points.bonus_sequencia,
        bonus_jogos_perfeitos: db.configs_points.bonus_jogos_perfeitos,
        football_api_key: db.configs_football.key,
        football_api_url: db.configs_football.url,
        sync_manual_override: db.configs_football.manual_override,
        sync_cron_active: db.configs_football.cron_active
      },
      create: {
        id: 1,
        ixc_url: db.configs_ixc.url,
        ixc_token: db.configs_ixc.token,
        ixc_chave: db.configs_ixc.chave || "",
        ixc_timeout: db.configs_ixc.timeout,
        ixc_offline_mode: db.configs_ixc.offline_mode,
        points_vencedor: db.configs_points.pontos_acertar_vencedor,
        points_empate: db.configs_points.pontos_acertar_empate,
        points_placar_exato: db.configs_points.pontos_acertar_placar_exato,
        bonus_rodada: db.configs_points.bonus_rodada,
        bonus_sequencia: db.configs_points.bonus_sequencia,
        bonus_jogos_perfeitos: db.configs_points.bonus_jogos_perfeitos,
        football_api_key: db.configs_football.key,
        football_api_url: db.configs_football.url,
        sync_manual_override: db.configs_football.manual_override,
        sync_cron_active: db.configs_football.cron_active
      }
    });

    // Sync into api_tokens table as requested by user so it displays there!
    if (db.configs_ixc.token) {
      await prisma.apiToken.upsert({
        where: { id: 1 },
        update: {
          servico: "ixc_token",
          token: db.configs_ixc.token
        },
        create: {
          id: 1,
          servico: "ixc_token",
          token: db.configs_ixc.token
        }
      });
    }

    if (db.configs_ixc.chave) {
      await prisma.apiToken.upsert({
        where: { id: 2 },
        update: {
          servico: "ixc_chave",
          token: db.configs_ixc.chave
        },
        create: {
          id: 2,
          servico: "ixc_chave",
          token: db.configs_ixc.chave
        }
      });
    }

    if (db.configs_football.key) {
      await prisma.apiToken.upsert({
        where: { id: 3 },
        update: {
          servico: "football_api",
          token: db.configs_football.key
        },
        create: {
          id: 3,
          servico: "football_api",
          token: db.configs_football.key
        }
      });
    }

    // 5. Sync audit logs
    const lastDBSavedLog = await prisma.auditLog.findFirst({
      orderBy: { id: "desc" }
    });
    const lastId = lastDBSavedLog ? lastDBSavedLog.id : 0;
    const newLogs = db.logs.filter(l => l.id > lastId);
    if (newLogs.length > 0) {
      await prisma.auditLog.createMany({
        data: newLogs.map(l => ({
          id: l.id,
          usuario: l.usuario,
          acao: l.acao,
          descricao: l.descricao,
          ip: l.ip,
          data: new Date(l.data)
        }))
      });
    }
  } catch (err: any) {
    console.error("[MySql Sync] Sync engine batch write error:", err.message);
  }
}

async function loadDatabaseFromMySql(): Promise<LocalDatabase> {
  if (!prisma) throw new Error("Prisma client not connected");

  const dbUsuarios = await prisma.usuario.findMany();
  const dbJogos = await prisma.jogo.findMany();
  const dbPalpites = await prisma.palpite.findMany();
  
  let dbCfg = await prisma.configuracoes.findFirst();
  if (!dbCfg) {
    dbCfg = await prisma.configuracoes.create({
      data: {
        ixc_url: "https://provedor-ixc.exemplo.com.br",
        ixc_token: "6:4dacdb8e47193e8cbbabe508c3c59b4547e463817b1d9b9a1d20ab4812fe1a62",
        ixc_chave: "ixc_default_api_key_copa",
        ixc_timeout: 5000,
        ixc_offline_mode: false,
        points_vencedor: INITIAL_POINTS_CONFIG.pontos_acertar_vencedor,
        points_empate: INITIAL_POINTS_CONFIG.pontos_acertar_empate,
        points_placar_exato: INITIAL_POINTS_CONFIG.pontos_acertar_placar_exato,
        bonus_rodada: INITIAL_POINTS_CONFIG.bonus_rodada,
        bonus_sequencia: INITIAL_POINTS_CONFIG.bonus_sequencia,
        bonus_jogos_perfeitos: INITIAL_POINTS_CONFIG.bonus_jogos_perfeitos,
        football_api_key: "dummy_soccer_api_key_2026_sports",
        football_api_url: "https://v3.football.api-sports.io",
        sync_manual_override: true,
        sync_cron_active: true
      }
    });
  }

  const dbLogs = await prisma.auditLog.findMany({
    orderBy: { data: "desc" },
    take: 400
  });

  const dbAdmins = await prisma.admin.findMany();
  if (dbAdmins.length === 0) {
    const hash = await bcryptjs.hash("200616", 10);
    await prisma.admin.create({
      data: {
        email: "suporte@unityautomacoes.com.br",
        nome: "Suporte Unity",
        senha_hash: hash
      }
    });
  }

  if (dbJogos.length === 0) {
    console.log("[MySql Sync] Table 'jogos' is empty, seeding games catalog...");
    for (const g of INITIAL_GAMES) {
      await prisma.jogo.create({
        data: {
          id: g.id,
          api_id: g.api_id,
          time_casa: g.time_casa,
          time_fora: g.time_fora,
          time_casa_bandeira: g.time_casa_bandeira,
          time_fora_bandeira: g.time_fora_bandeira,
          data_jogo: new Date(g.data_jogo),
          status: g.status,
          rodada: g.rodada,
          placar_casa: g.placar_casa,
          placar_fora: g.placar_fora
        }
      });
    }
    const dbJogosUpdated = await prisma.jogo.findMany();
    dbJogos.push(...dbJogosUpdated);
  }

  return {
    usuarios: dbUsuarios.map(u => ({
      id: u.id,
      ixc_id: u.ixc_id,
      nome: u.nome,
      cpf_cnpj: u.cpf_cnpj,
      telefone: u.telefone,
      email: u.email,
      cidade: u.cidade,
      avatar: u.avatar || "⚽",
      pontos_total: u.pontos_total,
      acertos_exato: u.acertos_exato,
      acertos_vencedor: u.acertos_vencedor,
      erros: u.erros,
      bloqueado: u.bloqueado,
      created_at: u.created_at.toISOString()
    })),
    jogos: dbJogos.map(g => ({
      id: g.id,
      api_id: g.api_id || `manual_${g.id}`,
      time_casa: g.time_casa,
      time_fora: g.time_fora,
      time_casa_bandeira: g.time_casa_bandeira || "🏳️",
      time_fora_bandeira: g.time_fora_bandeira || "🏳️",
      data_jogo: g.data_jogo.toISOString(),
      placar_casa: g.placar_casa,
      placar_fora: g.placar_fora,
      status: g.status as any,
      rodada: g.rodada
    })),
    palpites: dbPalpites.map(p => ({
      id: p.id,
      usuario_id: p.usuario_id,
      jogo_id: p.jogo_id,
      placar_casa: p.placar_casa,
      placar_fora: p.placar_fora,
      pontos: p.pontos,
      created_at: p.created_at.toISOString()
    })),
    configs_ixc: {
      url: dbCfg.ixc_url,
      token: dbCfg.ixc_token,
      chave: dbCfg.ixc_chave || "",
      timeout: dbCfg.ixc_timeout,
      offline_mode: dbCfg.ixc_offline_mode
    },
    configs_points: {
      pontos_acertar_vencedor: dbCfg.points_vencedor,
      pontos_acertar_empate: dbCfg.points_empate,
      pontos_acertar_placar_exato: dbCfg.points_placar_exato,
      bonus_rodada: dbCfg.bonus_rodada,
      bonus_sequencia: dbCfg.bonus_sequencia,
      bonus_jogos_perfeitos: dbCfg.bonus_jogos_perfeitos
    },
    configs_football: {
      key: dbCfg.football_api_key || "",
      url: dbCfg.football_api_url,
      status_conexao: "CONECTADO",
      cron_active: dbCfg.sync_cron_active,
      manual_override: dbCfg.sync_manual_override
    },
    logs: dbLogs.map(l => ({
      id: l.id,
      usuario: l.usuario,
      acao: l.acao,
      descricao: l.descricao,
      ip: l.ip,
      data: l.data.toISOString()
    })),
    admins: [
      { id: 1, email: "suporte@unityautomacoes.com.br", nome: "Suporte Unity" }
    ]
  };
}

async function initializeDatabase() {
  if (prisma) {
    // Check if the usuarios table already exists to prevent destructive db push runs on every startup/reboot
    let schemaIsPushed = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM usuarios LIMIT 1`;
      schemaIsPushed = true;
      console.log("[MySql Sync] Table structure looks correct (table 'usuarios' found). Skipping schema push to prevent data loss.");
    } catch (err: any) {
      console.log("[MySql Sync] Tables not found or query failed. Pushing schema initially...", err.message);
    }

    if (!schemaIsPushed) {
      try {
        const { execSync } = await import("child_process");
        console.log("[MySql Sync] Dynamic push starting: npx prisma db push --accept-data-loss (first-time database setup only!)");
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
        console.log("[MySql Sync] Schema successfully pushed to VPS!");
      } catch (err: any) {
        console.error("[MySql Sync] Schema initial push failed:", err.message);
      }
    }

    try {
      console.log("[MySql Sync] Cleaning up legacy sandbox fictitious users if any exist...");
      const mockCpfList = ["123.456.789-00", "987.654.321-11", "111.222.333-44"];
      await prisma.usuario.deleteMany({
        where: {
          cpf_cnpj: { in: mockCpfList }
        }
      });
      console.log("[MySql Sync] Purged legacy fictitious users from MySQL successfully!");
    } catch (err: any) {
      console.error("[MySql Sync] Legacy user purge bypassed:", err.message);
    }

    try {
      console.log("[MySql Sync] Retrieving state from MySQL server...");
      cachedDb = await loadDatabaseFromMySql();
      console.log(`[MySql Sync] Cache filled from MySQL: ${cachedDb.usuarios.length} users parsed, ${cachedDb.palpites.length} bets.`);
      return;
    } catch (err: any) {
      console.error("[MySql Sync] MySQL connection failed, falling back to local database.json. Error:", err.message);
    }
  }

  // File fallback
  cachedDb = loadDatabaseFromFile();
  console.log(`[Cache Sync] Local database.json state resolved: ${cachedDb.usuarios.length} users, ${cachedDb.palpites.length} bets.`);
}

// Ensure database file exists with initial structure (kept for fallback)
function saveDatabaseToFile(db: LocalDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving fallback database file", err);
  }
}

// Mask name for general public (LGPD compliant)
function maskName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 3) {
    return trimmed;
  }
  const firstThree = trimmed.slice(0, 3);
  return firstThree + "****";
}

// Global logger helper
function addLog(usuario: string, acao: string, descricao: string, req?: express.Request) {
  const db = loadDatabase();
  const ip = req ? (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1") : "127.0.0.1";
  const newLog: AuditLog = {
    id: db.logs.length > 0 ? Math.max(...db.logs.map(l => l.id)) + 1 : 1,
    usuario,
    acao,
    descricao,
    ip,
    data: new Date().toISOString()
  };
  db.logs.unshift(newLog);
  // Keep last 400 logs to prevent infinite memory growth
  if (db.logs.length > 400) {
    db.logs = db.logs.slice(0, 400);
  }
  saveDatabase(db);
}

// Score Calculator Engine
function calculatePointsForBet(palpite: Palpite, jogo: Jogo, points_cfg: ConfigPoints): number {
  if (jogo.placar_casa === null || jogo.placar_fora === null) return 0;

  const palpiteCasa = palpite.placar_casa;
  const palpiteFora = palpite.placar_fora;
  const realCasa = jogo.placar_casa;
  const realFora = jogo.placar_fora;

  // Exact scorecard match
  if (palpiteCasa === realCasa && palpiteFora === realFora) {
    // Winner hit points + Exact score bônus
    return points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
  }

  // Draw check
  const palpiteEmpate = palpiteCasa === palpiteFora;
  const realEmpate = realCasa === realFora;

  if (realEmpate && palpiteEmpate) {
    return points_cfg.pontos_acertar_empate;
  }

  // Winner check (not a drawing score)
  const palpiteVencedorCasa = palpiteCasa > palpiteFora;
  const realVencedorCasa = realCasa > realFora;

  const palpiteVencedorFora = palpiteCasa < palpiteFora;
  const realVencedorFora = realCasa < realFora;

  if ((palpiteVencedorCasa && realVencedorCasa) || (palpiteVencedorFora && realVencedorFora)) {
    return points_cfg.pontos_acertar_vencedor;
  }

  return 0; // complete miss
}

// Recalculates whole database user tallies based on existing games and bets
function refreshLeaderboard() {
  const db = loadDatabase();
  const points_cfg = db.configs_points;

  // Reset users scores
  db.usuarios.forEach(u => {
    u.pontos_total = 0;
    u.acertos_exato = 0;
    u.acertos_vencedor = 0;
    u.erros = 0;
  });

  // Calculate scores per bet
  db.palpites.forEach(p => {
    const jogo = db.jogos.find(j => j.id === p.jogo_id);
    if (jogo && (jogo.status === 'ENCERRADO' || jogo.status === 'AO_VIVO')) {
      const pontos = calculatePointsForBet(p, jogo, points_cfg);
      p.pontos = pontos;

      const usuario = db.usuarios.find(u => u.id === p.usuario_id);
      if (usuario) {
        usuario.pontos_total += pontos;

        const maxPossivelExact = points_cfg.pontos_acertar_vencedor + points_cfg.pontos_acertar_placar_exato;
        if (pontos === maxPossivelExact) {
          usuario.acertos_exato += 1;
        } else if (pontos > 0) {
          usuario.acertos_vencedor += 1;
        } else {
          usuario.erros += 1;
        }
      }
    }
  });

  saveDatabase(db);
}

// Express app initialization
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware setups
  app.use(express.json());
  
  // Custom simple Helmet header layer for compliance
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Database auto-seed check on run
  await initializeDatabase();

  // Authentication Middleware for Clients
  const verifyClientToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de acesso ausente ou inválido." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
      req.usuario = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "Sua seção expirou ou o token é inválido." });
    }
  };

  // Authentication Middleware for Administrators
  const verifyAdminToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token administrativo ausente." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string };
      if (decoded.role !== "ADMIN") {
        return res.status(403).json({ error: "Acesso administrativo restrito." });
      }
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "Sessão expirada. Faça login novamente como administrador." });
    }
  };

  // ==========================================
  // PUBLIC & CLIENT API ROUTES
  // ==========================================

  // CPF/CNPJ verification and integration with simulated/real IXC Soft
  app.post("/api/auth/ixc-validate", async (req, res) => {
    const { cpf_cnpj, nome_complementar, telefone, email, cidade } = req.body;
    
    if (!cpf_cnpj) {
      return res.status(400).json({ error: "Informe o CPF ou CNPJ cadastrado no provedor." });
    }

    // Clean formatting characters to ensure uniformity
    const cleanedCpfCnpj = cpf_cnpj.replace(/\D/g, "");
    if (cleanedCpfCnpj.length < 11) {
      return res.status(400).json({ error: "O documento deve conter no mínimo 11 dígitos numéricos." });
    }

    const db = loadDatabase();
    const isOfflineMode = db.configs_ixc.offline_mode;

    let customerFoundFromIxc = null;

    if (isOfflineMode) {
      // Offline mode simulation - search database clients or simulate success for testing
      const matchedLocal = db.usuarios.find(u => u.cpf_cnpj.replace(/\D/g, "") === cleanedCpfCnpj);
      
      if (matchedLocal) {
        customerFoundFromIxc = {
          id: String(matchedLocal.ixc_id),
          razao: matchedLocal.nome,
          cnpj_cpf: matchedLocal.cpf_cnpj,
          telefone_celular: matchedLocal.telefone,
          email: matchedLocal.email,
          cidade: matchedLocal.cidade,
          ativo: "S"
        };
      } else {
        // Only allow automatic mock generation if the CPF is in our official mock list.
        // This prevents creating fictitious participants like "Apostador Provedor" with real customers' documents.
        const mockCpfList = ["12345678900", "98765432111", "11122233344"];
        if (mockCpfList.includes(cleanedCpfCnpj)) {
          const inputNome = nome_complementar || `Apostador Provedor ${cleanedCpfCnpj.slice(-4)}`;
          const inputTel = telefone || "(49) 99100-2026";
          const inputEmail = email || `cliente.${cleanedCpfCnpj.slice(-4)}@exemplo.com`;
          const inputCidade = cidade || CIDADES_ATENDIDAS[Math.floor(Math.random() * CIDADES_ATENDIDAS.length)];

          customerFoundFromIxc = {
            id: String(Math.floor(Math.random() * 8000) + 1200),
            razao: inputNome,
            cnpj_cpf: cpf_cnpj,
            telefone_celular: inputTel,
            email: inputEmail,
            cidade: inputCidade,
            ativo: "S"
          };
        } else {
          // It's a real CPF. In simulation mode, we prevent generating fictitious user entries.
          return res.status(404).json({ 
            error: "Cliente não localizado. O modo offline de simulação está ativo e apenas aceita CPFs de teste recomendados. Para usar este CPF de um cliente real, mude as definições de Integração IXC para Modo Real no painel administrativo." 
          });
        }
      }

      addLog("Sistema IXC (Simulação)", "CONSULTA_CLIENTE", `Cliente consultado no CPF ${cpf_cnpj}. Encontrado: S`, req);
    } else {
      // Live Mode API Request via Curl implementation
      try {
        const authStr = Buffer.from(db.configs_ixc.token).toString("base64");

        // Try standard unformatted numbers-only query first (how IXC standardizes storage)
        const payloadClean = {
          qtype: "cliente.cnpj_cpf",
          query: cleanedCpfCnpj,
          oper: "=",
          rp: "1",
          sortname: "cliente.id",
          sortorder: "desc"
        };
        
        let response = await axios.post(
          `${db.configs_ixc.url}/webservice/v1/cliente`,
          payloadClean,
          {
            headers: {
              "Authorization": `Basic ${authStr}`,
              "Content-Type": "application/json",
              "ixcsoft": "listar"
            },
            timeout: db.configs_ixc.timeout || 5000
          }
        );

        // Fallback to formatted string query if clean CPF didn't match and the original has formatting
        if ((!response.data || !response.data.registros || response.data.registros.length === 0) && cpf_cnpj !== cleanedCpfCnpj) {
          const payloadFormatted = {
            qtype: "cliente.cnpj_cpf",
            query: cpf_cnpj,
            oper: "=",
            rp: "1",
            sortname: "cliente.id",
            sortorder: "desc"
          };
          response = await axios.post(
            `${db.configs_ixc.url}/webservice/v1/cliente`,
            payloadFormatted,
            {
              headers: {
                "Authorization": `Basic ${authStr}`,
                "Content-Type": "application/json",
                "ixcsoft": "listar"
              },
              timeout: db.configs_ixc.timeout || 5000
            }
          );
        }

        // Parse result
        if (response.data && response.data.registros && response.data.registros.length > 0) {
          const matchedReg = response.data.registros[0];
          if (matchedReg.ativo === 'S') {
            let cityName = "Chapecó";
            if (matchedReg.cidade) {
              const cityQuery = String(matchedReg.cidade).trim();
              if (/^\d+$/.test(cityQuery)) {
                try {
                  const cityPayload = {
                    qtype: "cidade.id",
                    query: cityQuery,
                    oper: "=",
                    rp: "1",
                    sortname: "cidade.id",
                    sortorder: "desc"
                  };
                  
                  const cityResponse = await axios.post(
                    `${db.configs_ixc.url}/webservice/v1/cidade`,
                    cityPayload,
                    {
                      headers: {
                        "Authorization": `Basic ${authStr}`,
                        "Content-Type": "application/json",
                        "ixcsoft": "listar"
                      },
                      timeout: db.configs_ixc.timeout || 5000
                    }
                  );
                  
                  if (cityResponse.data && cityResponse.data.registros && cityResponse.data.registros.length > 0) {
                    const matchedCity = cityResponse.data.registros[0];
                    if (matchedCity.nome) {
                      cityName = matchedCity.nome;
                      if (matchedCity.uf) {
                        const ufId = String(matchedCity.uf).trim();
                        if (/^\d+$/.test(ufId)) {
                          try {
                            const ufPayload = {
                              qtype: "uf.id",
                              query: ufId,
                              oper: "=",
                              rp: "1",
                              sortname: "uf.id",
                              sortorder: "desc"
                            };
                            
                            const ufResponse = await axios.post(
                              `${db.configs_ixc.url}/webservice/v1/uf`,
                              ufPayload,
                              {
                                headers: {
                                  "Authorization": `Basic ${authStr}`,
                                  "Content-Type": "application/json",
                                  "ixcsoft": "listar"
                                },
                                timeout: db.configs_ixc.timeout || 5000
                              }
                            );
                            
                            if (ufResponse.data && ufResponse.data.registros && ufResponse.data.registros.length > 0) {
                              const matchedUf = ufResponse.data.registros[0];
                              const ufLabel = matchedUf.sigla || matchedUf.nome || ufId;
                              cityName = `${matchedCity.nome} - ${String(ufLabel).toUpperCase()}`;
                            } else {
                              cityName = `${matchedCity.nome} - ${ufId}`;
                            }
                          } catch (ufErr: any) {
                            console.error("[IXC UF API] Failed to fetch UF details for ID: " + ufId, ufErr.message);
                            cityName = `${matchedCity.nome} - ${ufId}`;
                          }
                        } else {
                          cityName = `${matchedCity.nome} - ${String(matchedCity.uf).toUpperCase()}`;
                        }
                      }
                    }
                  }
                } catch (cityErr: any) {
                  console.error("[IXC City API] Failed to fetch city details for ID: " + cityQuery, cityErr.message);
                }
              } else {
                cityName = matchedReg.cidade;
              }
            }

            customerFoundFromIxc = {
              id: matchedReg.id,
              razao: matchedReg.razao,
              cnpj_cpf: matchedReg.cnpj_cpf,
              telefone_celular: matchedReg.telefone_celular || matchedReg.whatsapp || matchedReg.fone || "",
              email: matchedReg.email,
              cidade: cityName,
              ativo: matchedReg.ativo
            };
          } else {
            return res.status(403).json({ error: "Cadastro encontrado no provedor está marcado como INATIVO." });
          }
        }
        
        addLog("API IXC Soft", "CONSULTA_POST_LISTAR", `Busca de ${cpf_cnpj} via webservice. Encontrados: ${customerFoundFromIxc ? 1 : 0}`, req);
      } catch (axErr: any) {
        addLog("Erro IXC Soft", "EXCECAO_CONEXAO", `Erro de comunicação na consulta do CPF ${cpf_cnpj}: ${axErr.message}`, req);
        return res.status(502).json({ 
          error: "Erro de autenticação de infraestrutura na API do provedor. Use o recurso de simulação no menu do painel admin caso persista." 
        });
      }
    }

    if (!customerFoundFromIxc) {
      return res.status(404).json({ error: "Cliente não encontrado nos cadastros ativos do Provedor." });
    }

    // Now, synchronize local DB User or register them
    let usuarioLocal = db.usuarios.find(u => u.ixc_id === customerFoundFromIxc.id);

    if (!usuarioLocal) {
      const newUId = db.usuarios.length > 0 ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1;
      usuarioLocal = {
        id: newUId,
        ixc_id: customerFoundFromIxc.id,
        nome: customerFoundFromIxc.razao,
        cpf_cnpj: customerFoundFromIxc.cnpj_cpf,
        telefone: customerFoundFromIxc.telefone_celular,
        email: customerFoundFromIxc.email,
        cidade: customerFoundFromIxc.cidade || "Chapecó",
        avatar: "⚽",
        pontos_total: 0,
        acertos_exato: 0,
        acertos_vencedor: 0,
        erros: 0,
        bloqueado: false,
        created_at: new Date().toISOString()
      };
      db.usuarios.push(usuarioLocal);
      saveDatabase(db);
      addLog(usuarioLocal.nome, "AUTO_CADASTRO", `Novo palpiteiro ativo registrado automaticamente pelo ID IXC ${usuarioLocal.ixc_id}`, req);
    } else {
      if (usuarioLocal.bloqueado) {
        return res.status(403).json({ error: "Acesso suspenso por restrição administrativa." });
      }
    }

    // Create login session token
    const token = jwt.sign(
      { id: usuarioLocal.id, nome: usuarioLocal.nome },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      usuario: usuarioLocal
    });
  });

  // Admin login credentials handler
  app.post("/api/auth/admin-login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Forneça email de administrador e senha." });
    }

    // Standard requested superuser: suporte@unityautomacoes.com.br / 200616
    if (email === "suporte@unityautomacoes.com.br" && password === "200616") {
      const token = jwt.sign(
        { email, role: "ADMIN", name: "Suporte Unity" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      addLog("Admin (Suporte)", "LOGIN_CONCEDIDO", "Acesso autenticado do usuário administrador padrão.", req);
      return res.json({
        success: true,
        token,
        admin: { email, nome: "Suporte Unity" }
      });
    }

    const db = loadDatabase();
    // Support alternate logins optionally
    const matchedAdmin = db.admins.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (matchedAdmin && password === "200616") { // fallback password
      const token = jwt.sign(
        { email, role: "ADMIN", name: matchedAdmin.nome },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      addLog(matchedAdmin.nome, "LOGIN_CONCEDIDO", "Acesso concedido para admin cadastrado secundário.", req);
      return res.json({
        success: true,
        token,
        admin: { email: matchedAdmin.email, nome: matchedAdmin.nome }
      });
    }

    addLog("Intrusão", "TENTATIVA_LOGIN_FALHOU", `Falha de login de administrador usando email: ${email}`, req);
    return res.status(401).json({ error: "Credenciais de administrador inválidas." });
  });

  // Get current state of games combined with user guesses
  app.get("/api/jogos", async (req: any, res) => {
    const db = loadDatabase();
    const sortedGames = [...db.jogos].sort((a,b) => new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime());

    // Express client identifier token is optional
    const authHeader = req.headers.authorization;
    let userId: number | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        userId = decoded.id;
      } catch (err) {}
    }

    let rawUserGuesses: Palpite[] = [];
    if (userId) {
      rawUserGuesses = db.palpites.filter(p => p.usuario_id === userId);
    }

    res.json({
      jogos: sortedGames,
      palpites: rawUserGuesses,
      data_servidor: new Date().toISOString()
    });
  });

  // Put a new user bet or update
  app.post("/api/palpites", verifyClientToken, (req: any, res) => {
    const userId = req.usuario.id;
    const { jogo_id, placar_casa, placar_fora } = req.body;

    if (jogo_id === undefined || placar_casa === undefined || placar_fora === undefined) {
      return res.status(400).json({ error: "Dados incompletos para envio do palpite." });
    }

    const numPlacarCasa = parseInt(placar_casa, 10);
    const numPlacarFora = parseInt(placar_fora, 10);

    if (isNaN(numPlacarCasa) || isNaN(numPlacarFora) || numPlacarCasa < 0 || numPlacarFora < 0) {
      return res.status(400).json({ error: "Os placares informados devem ser números positivos." });
    }

    const db = loadDatabase();
    const jogo = db.jogos.find(j => j.id === Number(jogo_id));

    if (!jogo) {
      return res.status(404).json({ error: "Partida de destino não encontrada." });
    }

    // Rules constraint: block guesses 1 hour before scheduled start
    const serverTime = new Date().getTime();
    const gameTime = new Date(jogo.data_jogo).getTime();
    const lockMarginMs = 60 * 60 * 1000; // 1 hour in MS

    if (gameTime - serverTime < lockMarginMs) {
      return res.status(400).json({ 
        error: `Palpites para esta partida encerraram em ${new Date(gameTime - lockMarginMs).toLocaleString("pt-BR")}. O bloqueio acontece 1 hora antes de iniciar!`
      });
    }

    if (jogo.status !== 'PENDENTE') {
      return res.status(400).json({ error: "Esta partida já iniciou ou foi encerrada." });
    }

    // Check existing
    let existingBet = db.palpites.find(p => p.usuario_id === userId && p.jogo_id === Number(jogo_id));

    if (existingBet) {
      existingBet.placar_casa = numPlacarCasa;
      existingBet.placar_fora = numPlacarFora;
      existingBet.created_at = new Date().toISOString();
    } else {
      const newBId = db.palpites.length > 0 ? Math.max(...db.palpites.map(p => p.id)) + 1 : 1;
      existingBet = {
        id: newBId,
        usuario_id: userId,
        jogo_id: Number(jogo_id),
        placar_casa: numPlacarCasa,
        placar_fora: numPlacarFora,
        pontos: null,
        created_at: new Date().toISOString()
      };
      db.palpites.push(existingBet);
    }

    saveDatabase(db);
    addLog(req.usuario.nome, "PARTICIPACAO_PALPITE", `Registrou palpite: ${jogo.time_casa} ${numPlacarCasa} x ${numPlacarFora} ${jogo.time_fora}`, req);

    res.json({ success: true, palpite: existingBet });
  });

  // Get active statistics rankings
  app.get("/api/ranking", (req, res) => {
    const db = loadDatabase();
    
    // Optional Bearer token parse for LGPD compliant name unmask of logged in user
    const authHeader = req.headers.authorization;
    let loggedInUserId: number | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        loggedInUserId = decoded.id;
      } catch (e) {}
    }

    // Sort customers descending points, then by success tags, then name
    const leaderData = db.usuarios
      .filter(u => !u.bloqueado)
      .map(u => {
        const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
        const displayName = isSelf ? u.nome : maskName(u.nome);
        return {
          id: u.id,
          nome: displayName,
          cidade: u.cidade,
          pontos: u.pontos_total,
          acertos_exato: u.acertos_exato,
          acertos_vencedor: u.acertos_vencedor,
          erros: u.erros,
          fator: u.pontos_total * 100 + u.acertos_exato * 10 - u.erros // resolving tiebreakers
        };
      })
      .sort((a,b) => {
        if (b.pontos !== a.pontos) {
          return b.pontos - a.pontos;
        }
        if (b.acertos_exato !== a.acertos_exato) {
          return b.acertos_exato - a.acertos_exato;
        }
        return a.nome.localeCompare(b.nome);
      });

    res.json(leaderData);
  });

  // Return public rule metrics
  app.get("/api/metrics-public", (req, res) => {
    const db = loadDatabase();
    const countUsers = db.usuarios.length;
    const countBets = db.palpites.length;
    
    // Optional Bearer token parse for LGPD compliant name unmask of logged in user
    const authHeader = req.headers.authorization;
    let loggedInUserId: number | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        loggedInUserId = decoded.id;
      } catch (e) {}
    }

    // Top 10 users overview
    const topUsers = db.usuarios
      .filter(u => !u.bloqueado)
      .sort((a,b) => {
        if (b.pontos_total !== a.pontos_total) {
          return b.pontos_total - a.pontos_total;
        }
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 10)
      .map((u, idx) => {
        const isSelf = loggedInUserId !== null && loggedInUserId === u.id;
        const displayName = isSelf ? u.nome : maskName(u.nome);
        return {
          posicao: idx + 1,
          nome: displayName,
          cidade: u.cidade,
          pontos: u.pontos_total,
          avatar: u.avatar || "⚽"
        };
      });

    res.json({
      total_usuarios: countUsers,
      total_palpites: countBets,
      top_15: topUsers,
      data_servidor: new Date().toISOString(),
      ixc_offline_mode: db.configs_ixc.offline_mode
    });
  });

  // ==========================================
  // ADMINISTRATOR CONTROLS
  // ==========================================

  // Dashboard performance counters
  app.get("/api/admin/metrics", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    
    // Metrics compilation
    const totalUsers = db.usuarios.length;
    const blockedUsers = db.usuarios.filter(u => u.bloqueado).length;
    const totalPalpites = db.palpites.length;
    const totalJogos = db.jogos.length;
    const activeJogos = db.jogos.filter(j => j.status === 'AO_VIVO').length;

    // Cities segmentation
    const cityTallies: { [key: string]: number } = {};
    db.usuarios.forEach(u => {
      const city = u.cidade || "Não Definido";
      cityTallies[city] = (cityTallies[city] || 0) + 1;
    });

    const formattedCities = Object.keys(cityTallies).map(city => ({
      name: city,
      count: cityTallies[city]
    })).sort((a,b) => b.count - a.count);

    // Distribution graph score brackets
    // 0-5, 6-10, 11-15, 16-20, 21-25, 26+
    const distribution = {
      "0-5 pts": db.usuarios.filter(u => u.pontos_total <= 5).length,
      "6-15 pts": db.usuarios.filter(u => u.pontos_total > 5 && u.pontos_total <= 15).length,
      "16-25 pts": db.usuarios.filter(u => u.pontos_total > 15 && u.pontos_total <= 25).length,
      "26+ pts": db.usuarios.filter(u => u.pontos_total > 25).length,
    };

    res.json({
      counters: {
        total_usuarios: totalUsers,
        usuarios_bloqueados: blockedUsers,
        total_palpites: totalPalpites,
        total_jogos: totalJogos,
        jogos_ativo: activeJogos
      },
      cities: formattedCities,
      distribuicao: distribution,
      logs_recents: db.logs.slice(0, 15),
      config_con_ixc: db.configs_ixc.offline_mode ? "SIMULAÇÃO ATIVA" : "PRODUÇÃO CONECTADA",
      config_con_soccer: db.configs_football.status_conexao
    });
  });

  // Client user directory administration 
  app.get("/api/admin/usuarios", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.usuarios);
  });

  // Update client data or points
  app.post("/api/admin/usuarios/:id", verifyAdminToken, (req: any, res) => {
    const id = Number(req.params.id);
    const { nome, telefone, email, cidade, pontos_total, reset } = req.body;

    const db = loadDatabase();
    const userIndex = db.usuarios.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilizador não localizado." });
    }

    const item = db.usuarios[userIndex];

    if (reset) {
      item.pontos_total = 0;
      item.acertos_exato = 0;
      item.acertos_vencedor = 0;
      item.erros = 0;
      // Also delete user bets
      db.palpites = db.palpites.filter(p => p.usuario_id !== id);
      addLog("Admin (Suporte)", "RESETA_SCORE", `Zerado os pontos e excluído palpites de ${item.nome}`, req);
    } else {
      if (nome) item.nome = nome;
      if (telefone) item.telefone = telefone;
      if (email) item.email = email;
      if (cidade) item.cidade = cidade;
      if (pontos_total !== undefined) item.pontos_total = Number(pontos_total);
      
      addLog("Admin (Suporte)", "EDITA_ATRIBUTOS_USUARIO", `Alterou atributos cadastrais de ${item.nome}`, req);
    }

    saveDatabase(db);
    refreshLeaderboard(); // secure correct recalculations

    res.json({ success: true, usuario: db.usuarios[userIndex] });
  });

  // Toggle blocking customer
  app.post("/api/admin/usuarios/:id/block", verifyAdminToken, (req: any, res) => {
    const id = Number(req.params.id);
    const db = loadDatabase();
    const user = db.usuarios.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ error: "Palpiteiro não encontrado." });
    }

    user.bloqueado = !user.bloqueado;
    saveDatabase(db);
    addLog("Admin (Suporte)", "MODERACAO_SUSPENSAO", `${user.bloqueado ? 'BLOQUEOU' : 'DESBLOQUEOU'} participante ${user.nome}`, req);

    res.json({ success: true, usuario: user });
  });

  // Delete customer fully
  app.delete("/api/admin/usuarios/:id", verifyAdminToken, (req: any, res) => {
    const id = Number(req.params.id);
    const db = loadDatabase();
    
    const user = db.usuarios.find(u => u.id === id);
    if (!user) {
       return res.status(404).json({ error: "Usuário não localizado." });
    }

    db.usuarios = db.usuarios.filter(u => u.id !== id);
    db.palpites = db.palpites.filter(p => p.usuario_id !== id);
    
    saveDatabase(db);
    addLog("Admin (Suporte)", "EXCLUSAO_CADASTRO", `Removido participante ${user.nome} e seus palpites`, req);

    res.json({ success: true });
  });

  // Admin Matches directory
  app.get("/api/admin/jogos", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.jogos);
  });

  // Create match manually
  app.post("/api/admin/jogos", verifyAdminToken, (req: any, res) => {
    const { time_casa, time_fora, time_casa_bandeira, time_fora_bandeira, data_jogo, rodada } = req.body;

    if (!time_casa || !time_fora || !data_jogo || !rodada) {
      return res.status(400).json({ error: "Dados para cadastro da partida insuficientes." });
    }

    const db = loadDatabase();
    const newGId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;

    const newGame: Jogo = {
      id: newGId,
      api_id: `manual_${newGId}`,
      time_casa,
      time_fora,
      time_casa_bandeira: time_casa_bandeira || "🏳️",
      time_fora_bandeira: time_fora_bandeira || "🏳️",
      data_jogo,
      placar_casa: null,
      placar_fora: null,
      status: 'PENDENTE',
      rodada: Number(rodada)
    };

    db.jogos.push(newGame);
    saveDatabase(db);
    addLog("Admin (Suporte)", "CADASTRO_JOGO_MANUAL", `Incluiu partida ${time_casa} x ${time_fora} (Id: ${newGId})`, req);

    res.json({ success: true, jogo: newGame });
  });

  // Update game or close scores (Triggers points calculation!)
  app.put("/api/admin/jogos/:id", verifyAdminToken, (req: any, res) => {
    const id = Number(req.params.id);
    const { time_casa, time_fora, data_jogo, placar_casa, placar_fora, status, rodada } = req.body;

    const db = loadDatabase();
    const game = db.jogos.find(g => g.id === id);

    if (!game) {
      return res.status(404).json({ error: "Partida de destino indisponível." });
    }

    if (time_casa) game.time_casa = time_casa;
    if (time_fora) game.time_fora = time_fora;
    if (data_jogo) game.data_jogo = data_jogo;
    if (rodada) game.rodada = Number(rodada);

    // Score checks
    if (placar_casa !== undefined && placar_casa !== null) {
      game.placar_casa = placar_casa === "" ? null : Number(placar_casa);
    }
    if (placar_fora !== undefined && placar_fora !== null) {
      game.placar_fora = placar_fora === "" ? null : Number(placar_fora);
    }

    // Checking status shifts to ENC_ERRADO to trigger scores calculation
    const oldStatus = game.status;
    if (status) {
      game.status = status;
    }

    saveDatabase(db);
    
    // Auto points triggers!
    if (['ENCERRADO', 'AO_VIVO'].includes(game.status)) {
      refreshLeaderboard();
      addLog("Sistema de Pontos", "RECALCULO_DOTAÇÕES_AUTOMATICO", `Jogo em ${game.status}. Resultados: ${game.time_casa} ${game.placar_casa} x ${game.placar_fora} ${game.time_fora}.`, req);
    } else {
      addLog("Admin (Suporte)", "ATUALIZO_JOGO", `Alteração de partida ID ${id}: Status=${game.status}`, req);
    }

    res.json({ success: true, jogo: game });
  });

  // Delete individual match
  app.delete("/api/admin/jogos/:id", verifyAdminToken, (req: any, res) => {
    const id = Number(req.params.id);
    const db = loadDatabase();
    db.jogos = db.jogos.filter(g => g.id !== id);
    saveDatabase(db);
    addLog("Admin (Suporte)", "EXCLUI_JOGO", `Parada excluída do calendário. ID: ${id}`, req);
    res.json({ success: true });
  });

  // Synchronize score parameters
  app.get("/api/admin/configs", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json({
      configs_ixc: db.configs_ixc,
      configs_points: db.configs_points,
      configs_football: db.configs_football
    });
  });

  // Save Config IXC Client Portal
  app.post("/api/admin/configs/ixc", verifyAdminToken, (req: any, res) => {
    const db = loadDatabase();
    const { url, token, chave, timeout, offline_mode } = req.body;

    if (url) db.configs_ixc.url = url;
    if (token) db.configs_ixc.token = token;
    if (chave) db.configs_ixc.chave = chave;
    if (timeout !== undefined) db.configs_ixc.timeout = Number(timeout);
    if (offline_mode !== undefined) db.configs_ixc.offline_mode = Boolean(offline_mode);

    saveDatabase(db);
    addLog("Admin (Suporte)", "ATUALIZA_PARAMETROS_IXC", `Configurações IXC atualizadas. Modo offline: ${db.configs_ixc.offline_mode}`, req);

    res.json({ success: true, configs_ixc: db.configs_ixc });
  });

  // Save Scoring Rule Parameters
  app.post("/api/admin/configs/points", verifyAdminToken, (req: any, res) => {
    const db = loadDatabase();
    const { 
      pontos_acertar_vencedor, 
      pontos_acertar_empate, 
      pontos_acertar_placar_exato, 
      bonus_rodada, 
      bonus_sequencia, 
      bonus_jogos_perfeitos 
    } = req.body;

    if (pontos_acertar_vencedor !== undefined) db.configs_points.pontos_acertar_vencedor = Number(pontos_acertar_vencedor);
    if (pontos_acertar_empate !== undefined) db.configs_points.pontos_acertar_empate = Number(pontos_acertar_empate);
    if (pontos_acertar_placar_exato !== undefined) db.configs_points.pontos_acertar_placar_exato = Number(pontos_acertar_placar_exato);
    if (bonus_rodada !== undefined) db.configs_points.bonus_rodada = Number(bonus_rodada);
    if (bonus_sequencia !== undefined) db.configs_points.bonus_sequencia = Number(bonus_sequencia);
    if (bonus_jogos_perfeitos !== undefined) db.configs_points.bonus_jogos_perfeitos = Number(bonus_jogos_perfeitos);

    saveDatabase(db);
    refreshLeaderboard(); // Recalculate using new metrics right away!

    addLog("Admin (Suporte)", "ATUALIZA_REGULAMENTO_PONTO", "Parâmetros de pontuação modificados. Executado reclassificações globais.", req);

    res.json({ success: true, configs_points: db.configs_points });
  });

  // Save Football API configuration
  app.post("/api/admin/configs/football", verifyAdminToken, (req: any, res) => {
    const db = loadDatabase();
    const { key, url, manual_override, cron_active } = req.body;

    if (key) db.configs_football.key = key;
    if (url) db.configs_football.url = url;
    if (manual_override !== undefined) db.configs_football.manual_override = Boolean(manual_override);
    if (cron_active !== undefined) db.configs_football.cron_active = Boolean(cron_active);

    saveDatabase(db);
    addLog("Admin (Suporte)", "ATUALIZA_PARAM_SOCCER_API", `Configurações API Football salvas. Sobrecarga manual: ${db.configs_football.manual_override}`, req);

    res.json({ success: true, configs_football: db.configs_football });
  });

  // Local helper: maps country name to flag emoji
  const getTeamFlag = (teamName: string): string => {
    const name = teamName.toLowerCase().trim();
    if (name.includes("brazil") || name.includes("brasil")) return "🇧🇷";
    if (name.includes("argentina")) return "🇦🇷";
    if (name.includes("canada") || name.includes("canadá")) return "🇨🇦";
    if (name.includes("united states") || name.includes("usa") || name.includes("estados unidos")) return "🇺🇸";
    if (name.includes("mexico") || name.includes("méxico")) return "🇲🇽";
    if (name.includes("france") || name.includes("frança")) return "🇫🇷";
    if (name.includes("germany") || name.includes("alemanha")) return "🇩🇪";
    if (name.includes("spain") || name.includes("espanha")) return "🇪🇸";
    if (name.includes("italy") || name.includes("itália")) return "🇮🇹";
    if (name.includes("england") || name.includes("inglaterra")) return "🇬🇧";
    if (name.includes("netherlands") || name.includes("holanda")) return "🇳🇱";
    if (name.includes("portugal")) return "🇵🇹";
    if (name.includes("uruguay") || name.includes("urugua")) return "🇺🇾";
    if (name.includes("japan") || name.includes("japão")) return "🇯🇵";
    if (name.includes("belgium") || name.includes("bélgica")) return "🇧🇪";
    if (name.includes("croatia") || name.includes("croácia")) return "🇭🇷";
    if (name.includes("morocco") || name.includes("marrocos")) return "🇲🇦";
    if (name.includes("switzerland") || name.includes("suíça")) return "🇨🇭";
    if (name.includes("ecuador") || name.includes("equador")) return "🇪🇨";
    if (name.includes("senegal")) return "🇸🇳";
    if (name.includes("poland") || name.includes("polônia")) return "🇵🇱";
    if (name.includes("saudi arabia") || name.includes("arábia saudita")) return "🇸🇦";
    if (name.includes("denmark") || name.includes("dinamarca")) return "🇩🇰";
    if (name.includes("tunisia") || name.includes("tunísia")) return "🇹🇳";
    if (name.includes("costa rica")) return "🇨🇷";
    if (name.includes("colombia") || name.includes("colômbia")) return "🇨🇴";
    if (name.includes("south korea") || name.includes("coréia do sul") || name.includes("korea")) return "🇰🇷";
    if (name.includes("sweden") || name.includes("suécia")) return "🇸🇪";
    if (name.includes("chile")) return "🇨🇱";
    if (name.includes("peru")) return "🇵🇪";
    if (name.includes("ukraine") || name.includes("ucrânia")) return "🇺🇦";
    if (name.includes("czech") || name.includes("república tcheca")) return "🇨🇿";
    return "🏳️";
  };

  // Local helper: parses round name to index
  const parseRoundNumber = (roundStr: string): number => {
    const norm = roundStr.toLowerCase();
    if (norm.includes("group stage - 1") || norm.includes("rodada 1")) return 1;
    if (norm.includes("group stage - 2") || norm.includes("rodada 2")) return 2;
    if (norm.includes("group stage - 3") || norm.includes("rodada 3")) return 3;
    if (norm.includes("32")) return 4;
    if (norm.includes("16") || norm.includes("eighth")) return 5;
    if (norm.includes("quarter") || norm.includes("quartas")) return 6;
    if (norm.includes("semi")) return 7;
    if (norm.includes("final")) return 8;
    return 1;
  };

  // Manual Trigger for Live Syncing API Football simulator & Real API integration
  app.post("/api/admin/games-sync-football", verifyAdminToken, async (req: any, res) => {
    const db = loadDatabase();
    
    const apiKey = db.configs_football.key;
    const apiUrl = db.configs_football.url || "https://v3.football.api-sports.io";
    const isRealApi = apiKey && apiKey.trim() !== "" && !apiKey.toLowerCase().includes("dummy") && apiKey.length > 10;

    if (isRealApi) {
      try {
        console.log(`[Football API] Triggering real fetch to ${apiUrl}/fixtures for World Cup 2026 (League 1, Season 2026)...`);
        
        let response;
        let hasSeasonError = false;
        let originalErrorMsg = "";

        try {
          response = await axios.get(`${apiUrl}/fixtures`, {
            params: {
              league: "1",
              season: "2026"
            },
            headers: {
              "x-apisports-key": apiKey
            },
            timeout: 12000
          });

          // Check if the API returned a season permission warning inside response.data.errors
          if (response.data && response.data.errors) {
            const errKeys = Object.keys(response.data.errors);
            if (errKeys.length > 0) {
              const firstErr = String(response.data.errors[errKeys[0]]);
              originalErrorMsg = firstErr;
              if (
                firstErr.toLowerCase().includes("free plan") || 
                firstErr.toLowerCase().includes("this season") || 
                firstErr.toLowerCase().includes("restricted") ||
                firstErr.toLowerCase().includes("2022 to 2024")
              ) {
                hasSeasonError = true;
              }
            }
          }
        } catch (innerErr: any) {
          const errMsg = innerErr.message || "";
          originalErrorMsg = errMsg;
          if (
            errMsg.toLowerCase().includes("free plan") || 
            errMsg.toLowerCase().includes("this season") || 
            errMsg.toLowerCase().includes("restricted") ||
            errMsg.toLowerCase().includes("2022 to 2024")
          ) {
            hasSeasonError = true;
          } else {
            throw innerErr;
          }
        }

        let isUsingFallback = false;
        if (hasSeasonError) {
          console.log(`[Football API] Free Plan restriction detected ("${originalErrorMsg}"). Executing smart fallback fetching authorized World Cup 2022 dataset and shifting dates automatically to 2026...`);
          isUsingFallback = true;
          
          response = await axios.get(`${apiUrl}/fixtures`, {
            params: {
              league: "1",
              season: "2022"
            },
            headers: {
              "x-apisports-key": apiKey
            },
            timeout: 12000
          });

          if (response.data && response.data.errors && Object.keys(response.data.errors).length > 0) {
            const errKeys = Object.keys(response.data.errors);
            const firstErr = response.data.errors[errKeys[0]];
            if (firstErr) {
              throw new Error(`Erro no fallback de 2022: ${firstErr}`);
            }
          }
        } else {
          // Double check any standard errors
          if (response && response.data && response.data.errors && Object.keys(response.data.errors).length > 0) {
            const errKeys = Object.keys(response.data.errors);
            const firstErr = response.data.errors[errKeys[0]];
            if (firstErr) {
              throw new Error(`Erro retornado pela API: ${firstErr}`);
            }
          }
        }

        const fixtures = response?.data?.response;
        if (!fixtures || fixtures.length === 0) {
          throw new Error("Nenhuma partida retornada pela API.");
        }

        // Clean up mock/fictional matches (wc2026_1 to wc2026_8) and any orphan guesses so they do not clutter the database
        const mockGameIds = db.jogos.filter(j => j.api_id && j.api_id.startsWith("wc2026_")).map(j => j.id);
        if (mockGameIds.length > 0) {
          console.log(`[Football API Sync] Purging ${mockGameIds.length} simulated starting matches to prevent cluttering real 2026 fixture sync...`);
          db.jogos = db.jogos.filter(j => !j.api_id || !j.api_id.startsWith("wc2026_"));
          db.palpites = db.palpites.filter(p => !mockGameIds.includes(p.jogo_id));
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (const item of fixtures) {
          const apiId = `football_api_${item.fixture.id}`;
          const timeCasa = item.teams.home.name;
          const timeFora = item.teams.away.name;
          const timeCasaBandeira = getTeamFlag(timeCasa);
          const timeForaBandeira = getTeamFlag(timeFora);
          
          let dataJogoStr = item.fixture.date;
          if (isUsingFallback) {
            // Shift World Cup 2022 date (Nov/Dec 2022) to World Cup 2026 (Jun/July 2026) by adding exactly 1294 to 1299 days dynamically
            try {
              const d = new Date(dataJogoStr);
              d.setDate(d.getDate() + 1299);
              dataJogoStr = d.toISOString();
            } catch (pE) {
              dataJogoStr = dataJogoStr.replace("2022", "2026");
            }
          }

          let placarCasa: number | null = null;
          let placarFora: number | null = null;
          if (item.goals.home !== null && item.goals.home !== undefined) {
            placarCasa = Number(item.goals.home);
          }
          if (item.goals.away !== null && item.goals.away !== undefined) {
            placarFora = Number(item.goals.away);
          }

          const shortStatus = item.fixture.status.short;
          let mappedStatus = "PENDENTE";
          if (["FT", "AET", "PEN"].includes(shortStatus)) {
            mappedStatus = "ENCERRADO";
          } else if (["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(shortStatus)) {
            mappedStatus = "AO_VIVO";
          }

          // In fallback mode, because they are historical games, we can map them as PENDENTE so that users can actually make bets!
          if (isUsingFallback) {
            // Since the user is playing/testing, let's treat matches that haven't passed the shifted 2026 dates as pending,
            // or we can allow the user to make mock predictions for testing if the game is still simulated.
            // If the shifted date is in the future relative to the current local server time (May 2026), keep it as PENDENTE.
            const shiftedLocalTime = new Date(dataJogoStr).getTime();
            const nowTime = new Date().getTime();
            if (shiftedLocalTime > nowTime) {
              mappedStatus = "PENDENTE";
              placarCasa = null;
              placarFora = null;
            } else {
              // It already passed in 2026 timeframe, keep as finished
              mappedStatus = "ENCERRADO";
            }
          }

          const mappedRound = parseRoundNumber(item.league.round || "Group Stage - 1");

          // Search existing match
          let existingJogo = db.jogos.find(j => j.api_id === apiId);
          if (!existingJogo) {
            // Closeness match within 24 hours with exact match of teams
            existingJogo = db.jogos.find(j => 
              j.time_casa.toLowerCase() === timeCasa.toLowerCase() &&
              j.time_fora.toLowerCase() === timeFora.toLowerCase() &&
              Math.abs(new Date(j.data_jogo).getTime() - new Date(dataJogoStr).getTime()) < 24 * 60 * 60 * 1000
            );
          }

          if (existingJogo) {
            existingJogo.api_id = apiId;
            existingJogo.time_casa = timeCasa;
            existingJogo.time_fora = timeFora;
            existingJogo.time_casa_bandeira = timeCasaBandeira;
            existingJogo.time_fora_bandeira = timeForaBandeira;
            existingJogo.data_jogo = dataJogoStr;
            existingJogo.placar_casa = placarCasa;
            existingJogo.placar_fora = placarFora;
            existingJogo.status = mappedStatus as any;
            existingJogo.rodada = mappedRound;
            updatedCount++;
          } else {
            const newId = db.jogos.length > 0 ? Math.max(...db.jogos.map(j => j.id)) + 1 : 1;
            db.jogos.push({
              id: newId,
              api_id: apiId,
              time_casa: timeCasa,
              time_fora: timeFora,
              time_casa_bandeira: timeCasaBandeira,
              time_fora_bandeira: timeForaBandeira,
              data_jogo: dataJogoStr,
              placar_casa: placarCasa,
              placar_fora: placarFora,
              status: mappedStatus as any,
              rodada: mappedRound
            });
            addedCount++;
          }
        }

        saveDatabase(db);
        refreshLeaderboard();

        addLog("API Football Real", "SINCRONIZACAO_SOCCER", `Sincronizador obteve ${fixtures.length} confrontos. Novas: ${addedCount}, Atualizações: ${updatedCount} ${isUsingFallback ? '(Usando Fallback Inteligente Copa 2022)' : ''}`, req);

        if (isUsingFallback) {
          return res.json({
            success: true,
            mensagem: `Conexão efetuada com sucesso! Identificamos que sua chave de API utiliza o Plano Gratuito (o qual restringe a consulta da futura Copa de 2026). Ativamos a Sincronização Inteligente: importamos os ${fixtures.length} confrontos da Copa de 2022 e adaptamos as datas automaticamente para 2026 (+1299 dias). Você já pode ver os confrontos reais atualizados e fazer testes completos de palpites!`,
            status_api: 'CONECTADO'
          });
        }

        return res.json({
          success: true,
          mensagem: `API-Football integrada executada com sucesso! ${fixtures.length} partidas da Copa do Mundo 2026 sincronizadas. Adicionadas: ${addedCount}, Atualizadas: ${updatedCount}.`,
          status_api: 'CONECTADO'
        });

      } catch (err: any) {
        console.error("[Football API Real error]", err.message);
        addLog("Erro Football API", "EXCECAO_CONEXAO", `Erro ao consultar a API-football: ${err.message}`, req);
        return res.status(502).json({
          error: `Erro ao conectar com API-Football: ${err.message}. Verifique sua credencial ou conexão.`
        });
      }
    }

    // Fallback Simulator: Used if key is empty/dummy for safe development & testing
    let updatedCount = 0;
    const now = new Date().getTime();

    db.jogos.forEach(g => {
      const gTime = new Date(g.data_jogo).getTime();
      // Only sync games that have actually started or are simulated start (prior to current local time)
      if (g.status === 'PENDENTE' && gTime <= now) {
        g.status = 'AO_VIVO';
        g.placar_casa = Math.floor(Math.random() * 3);
        g.placar_fora = Math.floor(Math.random() * 3);
        updatedCount++;
      } else if (g.status === 'AO_VIVO') {
        // Classify as finished
        g.status = 'ENCERRADO';
        updatedCount++;
      }
    });

    saveDatabase(db);
    
    if (updatedCount > 0) {
      refreshLeaderboard();
      addLog("Cron API Football", "SINCRONIZACAO_SOCCER", `Sincronizador automático obteve resultados para ${updatedCount} partidas ativo-pendente (Modo Simulação).`, req);
    } else {
      addLog("Cron API Football", "SINCRONIZACAO_IDLE", "Atualização executada sem partidas em horário de jogo ativo.", req);
    }

    res.json({
      success: true,
      mensagem: `Sincronização simulada executada (Modo simulação pois Chave API não inserida). ${updatedCount} partidas atualizadas.`,
      status_api: 'CONECTADO'
    });
  });

  // Audit Logs endpoint
  app.get("/api/admin/logs", verifyAdminToken, (req, res) => {
    const db = loadDatabase();
    res.json(db.logs);
  });

  // Retrieve comprehensive CSV reports payload
  app.get("/api/admin/reports", verifyAdminToken, (req, res) => {
    const db = loadDatabase();

    // Participation statistics by city
    const participation: any[] = [];
    const citiesGroup: { [key: string]: { user_count: number; bet_count: number; sum_pt: number } } = {};

    db.usuarios.forEach(u => {
      if (!citiesGroup[u.cidade]) {
        citiesGroup[u.cidade] = { user_count: 0, bet_count: 0, sum_pt: 0 };
      }
      citiesGroup[u.cidade].user_count++;
      citiesGroup[u.cidade].sum_pt += u.pontos_total;

      const betsByThisUser = db.palpites.filter(p => p.usuario_id === u.id).length;
      citiesGroup[u.cidade].bet_count += betsByThisUser;
    });

    const reportCities = Object.keys(citiesGroup).map(cName => ({
      cidade: cName,
      usuarios: citiesGroup[cName].user_count,
      palpites: citiesGroup[cName].bet_count,
      media_pontos: parseFloat((citiesGroup[cName].sum_pt / citiesGroup[cName].user_count).toFixed(2))
    })).sort((a,b) => b.usuarios - a.usuarios);

    // Matches with most bets report
    const matchBetsReport = db.jogos.map(g => {
      const betsCount = db.palpites.filter(p => p.jogo_id === g.id).length;
      return {
        id: g.id,
        partida: `${g.time_casa} x ${g.time_fora}`,
        data: g.data_jogo,
        total_palpites: betsCount,
        status: g.status
      };
    }).sort((a,b) => b.total_palpites - a.total_palpites);

    res.json({
      participacao: reportCities,
      jogos_relat: matchBetsReport,
      lideranca_geral: db.usuarios.map(u => ({
        id: u.id,
        ixc_id: u.ixc_id,
        nome: u.nome,
        cidade: u.cidade,
        telefone: u.telefone,
        email: u.email,
        pontos: u.pontos_total,
        exatos: u.acertos_exato,
        vencedores: u.acertos_vencedor,
        erros: u.erros,
        cadastro: u.created_at
      })).sort((a,b) => b.pontos - a.pontos)
    });
  });

  // Test IXC Connection manual validation endpoint
  app.post("/api/admin/ixc-test", verifyAdminToken, async (req: any, res) => {
    const { url, token, timeout } = req.body;
    
    if (!url || !token) {
      return res.status(400).json({ error: "Parâmetros URL e Token obrigatórios." });
    }

    try {
      // Execute listed clients head limit 1 as structured in curls
      const payload = {
        qtype: "cliente.id",
        query: "0",
        oper: ">",
        rp: "1",
        sortname: "cliente.id",
        sortorder: "desc"
      };

      const authStr = Buffer.from(token).toString("base64");
      
      const response = await axios.post(
        `${url}/webservice/v1/cliente`,
        payload,
        {
          headers: {
            "Authorization": `Basic ${authStr}`,
            "Content-Type": "application/json",
            "ixcsoft": "listar"
          },
          timeout: Number(timeout) || 4000
        }
      );

      if (response.status === 200) {
        addLog("Admin Connection Test", "TESTE_IXC_SUCESSO", `Conexão bem sucedida com a URL ${url}.`, req);
        return res.json({
          success: true,
          status: "ONLINE",
          mensagem: "Conexão com webservice do IXC Soft estabelecida com sucesso! Encontrado protocolo listar."
        });
      } else {
        throw new Error(`Código de status HTTP: ${response.status}`);
      }
    } catch (err: any) {
      addLog("Admin Connection Test", "TESTE_IXC_FALHOU", `Deu erro testando conexão com ${url}: ${err.message}`, req);
      return res.json({
        success: false,
        status: "OFFLINE",
        mensagem: `Conexão falhou: ${err.message}. A rede do IXC deve aceitar requisições de origem HTTPS externas.`
      });
    }
  });

  // ==========================================
  // VITE BUNDLING MIDDLEWARING LAYER
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Active server listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Copa 2026 Portal] Running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Fatal startup server error", err);
});
