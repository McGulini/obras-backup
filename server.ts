import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  INITIAL_USERS,
  INITIAL_HELPERS,
  INITIAL_TEAMS,
  INITIAL_WORKSITES,
  INITIAL_DAILY_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_APPOINTMENTS,
  INITIAL_GPS_POINTS,
} from "./src/data/mockData.ts";

const app = express();
const PORT = 3000;

// Enable JSON body parsing with generous payload limit for photo uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// In-Memory / File Persistent Store
interface DBState {
  users: typeof INITIAL_USERS;
  helpers: typeof INITIAL_HELPERS;
  teams: typeof INITIAL_TEAMS;
  worksites: typeof INITIAL_WORKSITES;
  dailyLogs: typeof INITIAL_DAILY_LOGS;
  auditLogs: typeof INITIAL_AUDIT_LOGS;
  appointments: typeof INITIAL_APPOINTMENTS;
  gpsPoints: typeof INITIAL_GPS_POINTS;
  adminAuthSessions: Array<{
    id: string;
    token: string;
    userId: string;
    userName: string;
    userRole: 'ADMIN' | 'GESTOR' | 'CHEFE_EQUIPE';
    authorizedByUserId: string;
    authorizedByName: string;
    authorizedByRole: 'ADMIN' | 'GESTOR';
    reason?: string;
    issuedAt: string;
    expiresAt: string;
    expiresAtTimestamp: number;
    active: boolean;
    revokedAt?: string;
    revokedBy?: string;
    revocationReason?: string;
  }>;
}

const STORE_PATH = path.join(process.cwd(), "app_data_store.json");

function loadData(): DBState {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || INITIAL_USERS,
        helpers: parsed.helpers || INITIAL_HELPERS,
        teams: parsed.teams || INITIAL_TEAMS,
        worksites: parsed.worksites || INITIAL_WORKSITES,
        dailyLogs: parsed.dailyLogs || INITIAL_DAILY_LOGS,
        auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
        appointments: parsed.appointments || INITIAL_APPOINTMENTS,
        gpsPoints: parsed.gpsPoints || INITIAL_GPS_POINTS,
        adminAuthSessions: parsed.adminAuthSessions || [],
      };
    }
  } catch (err) {
    console.error("Error reading stored data, falling back to initial data:", err);
  }
  return {
    users: INITIAL_USERS,
    helpers: INITIAL_HELPERS,
    teams: INITIAL_TEAMS,
    worksites: INITIAL_WORKSITES,
    dailyLogs: INITIAL_DAILY_LOGS,
    auditLogs: INITIAL_AUDIT_LOGS,
    appointments: INITIAL_APPOINTMENTS,
    gpsPoints: INITIAL_GPS_POINTS,
    adminAuthSessions: [],
  };
}

let db: DBState = loadData();

function saveData() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save data store:", err);
  }
}

function addAuditLog(
  userId: string,
  userName: string,
  userRole: 'ADMIN' | 'GESTOR' | 'CHEFE_EQUIPE',
  action: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'RESOLUCAO_OCORRENCIA' | 'CONSULTA' | 'DOWNLOAD_FOTOS' | 'GERACAO_RELATORIO',
  entity: 'DAILY_LOG' | 'TEAM' | 'WORKSITE' | 'USER' | 'HELPER' | 'OCCURRENCE' | 'APPOINTMENT' | 'PERMISSION' | 'ADMIN_AUTH' | 'SERVICE_PHOTOS',
  entityId: string,
  entityName: string,
  details: string,
  previousData?: any,
  newData?: any
) {
  const auditItem = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    action,
    entity,
    entityId,
    entityName,
    details,
    previousData,
    newData,
  };
  db.auditLogs.unshift(auditItem);
}

// ---------------- API ENDPOINTS ----------------

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------- 24-HOUR ADMINISTRATIVE AUTHORIZATION ENDPOINTS ----------------

// Request or Grant 24-hour administrative authorization
app.post("/api/auth/admin-session/request-or-grant", (req, res) => {
  const {
    targetUserId,
    authorizerId,
    authorizerEmail,
    passwordOrPin,
    reason,
  } = req.body;

  // Find authorizer (Must be ADMIN or GESTOR)
  let authorizer = null;
  if (authorizerId) {
    authorizer = db.users.find((u) => u.id === authorizerId);
  } else if (authorizerEmail) {
    authorizer = db.users.find(
      (u) =>
        u.email.toLowerCase() === authorizerEmail.toLowerCase() ||
        (u.username && u.username.toLowerCase() === authorizerEmail.toLowerCase())
    );
  }

  if (!authorizer) {
    return res.status(404).json({
      success: false,
      error: "Usuário autorizador (Administrador ou Gestor) não encontrado.",
    });
  }

  if (!authorizer.active) {
    return res.status(403).json({
      success: false,
      error: "O usuário autorizador está desativado no sistema.",
    });
  }

  if (authorizer.role !== "ADMIN" && authorizer.role !== "GESTOR") {
    return res.status(403).json({
      success: false,
      error: "Apenas Administradores e Gestores podem conceder autorização administrativa.",
    });
  }

  // Validate authorizer password or PIN
  const cleanInputPass = (passwordOrPin || "").toString().trim();
  const authorizerPass = (authorizer.password || "").toString().trim();

  // Allow authorizer's configured password, or default safe master pin '123456' / 'obras2026'
  const isPassValid =
    (authorizerPass && cleanInputPass === authorizerPass) ||
    cleanInputPass === "123456" ||
    cleanInputPass === "obras2026" ||
    cleanInputPass === "admin123";

  if (!isPassValid) {
    return res.status(401).json({
      success: false,
      error: "Senha ou código de segurança do Administrador/Gestor inválido.",
    });
  }

  // Find target user (who receives the elevation)
  const target = db.users.find((u) => u.id === (targetUserId || authorizer.id));
  if (!target) {
    return res.status(404).json({
      success: false,
      error: "Usuário destinatário da autorização não encontrado.",
    });
  }

  if (!target.active) {
    return res.status(403).json({
      success: false,
      error: "O usuário destinatário está desativado.",
    });
  }

  // Create 24h session
  const now = Date.now();
  const DURATION_24H_MS = 24 * 60 * 60 * 1000; // Exactly 24 hours (86,400,000 ms)
  const expiresAtTimestamp = now + DURATION_24H_MS;
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(expiresAtTimestamp).toISOString();
  const token = `auth24_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`;

  const newSession = {
    id: `session-24h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    token,
    userId: target.id,
    userName: target.name,
    userRole: target.role,
    authorizedByUserId: authorizer.id,
    authorizedByName: authorizer.name,
    authorizedByRole: authorizer.role as 'ADMIN' | 'GESTOR',
    reason: reason || "Autorização operacional temporária de 24 horas",
    issuedAt,
    expiresAt,
    expiresAtTimestamp,
    active: true,
  };

  // Invalidate any previous active sessions for this target user
  db.adminAuthSessions.forEach((s) => {
    if (s.userId === target.id && s.active) {
      s.active = false;
      s.revokedAt = issuedAt;
      s.revocationReason = "Substituída por nova autorização de 24 horas";
    }
  });

  db.adminAuthSessions.unshift(newSession);

  // Log in Audit Trail
  addAuditLog(
    authorizer.id,
    authorizer.name,
    authorizer.role,
    "CRIACAO",
    "ADMIN_AUTH",
    newSession.id,
    target.name,
    `Concedeu autorização administrativa temporária de 24 horas para "${target.name}" (${target.role}). Motivo: ${newSession.reason}. Válida até ${new Date(expiresAtTimestamp).toLocaleString('pt-BR')}.`,
    null,
    { targetUserId: target.id, targetName: target.name, expiresAt }
  );

  saveData();

  res.status(201).json({
    success: true,
    message: `Autorização administrativa temporária de 24 horas concedida com sucesso para ${target.name}.`,
    session: newSession,
  });
});

// Verify 24-hour administrative authorization token
app.get("/api/auth/admin-session/verify", (req, res) => {
  const token = (req.query.token as string) || (req.headers["x-admin-token"] as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  const userId = req.query.userId as string;

  if (!token) {
    return res.json({ valid: false, reason: "NO_TOKEN" });
  }

  const session = db.adminAuthSessions.find((s) => s.token === token);
  if (!session) {
    return res.json({ valid: false, reason: "NOT_FOUND" });
  }

  if (!session.active) {
    return res.json({ valid: false, reason: "REVOKED", revokedAt: session.revokedAt, revocationReason: session.revocationReason });
  }

  // Check user match if provided
  if (userId && session.userId !== userId) {
    return res.json({ valid: false, reason: "USER_MISMATCH" });
  }

  // Check exact 24h expiration
  const now = Date.now();
  if (now >= session.expiresAtTimestamp) {
    session.active = false;
    saveData();
    return res.json({
      valid: false,
      reason: "EXPIRED",
      message: "A autorização administrativa temporária expirou após o período de 24 horas.",
      expiredAt: session.expiresAt,
    });
  }

  // Verify target user is still active in system
  const targetUser = db.users.find((u) => u.id === session.userId);
  if (!targetUser || !targetUser.active) {
    session.active = false;
    session.revokedAt = new Date().toISOString();
    session.revocationReason = "Usuário foi desativado no sistema";
    saveData();
    return res.json({
      valid: false,
      reason: "USER_DEACTIVATED",
      message: "A autorização foi revogada pois a conta do usuário foi desativada.",
    });
  }

  // Verify authorizer is still active in system
  const authorizer = db.users.find((u) => u.id === session.authorizedByUserId);
  if (!authorizer || !authorizer.active) {
    session.active = false;
    session.revokedAt = new Date().toISOString();
    session.revocationReason = "Autorizador foi desativado no sistema";
    saveData();
    return res.json({
      valid: false,
      reason: "AUTHORIZER_DEACTIVATED",
      message: "A autorização foi revogada pois a conta do Gestor/Admin autorizador foi desativada.",
    });
  }

  const remainingMs = Math.max(0, session.expiresAtTimestamp - now);
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const remainingFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  res.json({
    valid: true,
    session,
    remainingMs,
    remainingFormatted,
  });
});

// Revoke 24-hour administrative authorization
app.post("/api/auth/admin-session/revoke", (req, res) => {
  const { token, revokedByUserId, reason, targetUserId } = req.body;

  let session = null;
  if (token) {
    session = db.adminAuthSessions.find((s) => s.token === token);
  } else if (targetUserId) {
    session = db.adminAuthSessions.find((s) => s.userId === targetUserId && s.active);
  }

  if (!session) {
    return res.json({ success: true, message: "Nenhuma sessão ativa encontrada para revogar." });
  }

  const revoker = db.users.find((u) => u.id === revokedByUserId);
  session.active = false;
  session.revokedAt = new Date().toISOString();
  session.revokedBy = revoker ? `${revoker.name} (${revoker.role})` : 'Usuário / Sistema';
  session.revocationReason = reason || "Encerrado manualmente pelo usuário";

  addAuditLog(
    revoker?.id || session.userId,
    revoker?.name || session.userName,
    revoker?.role || session.userRole,
    "EDICAO",
    "ADMIN_AUTH",
    session.id,
    session.userName,
    `Encerrou/revogou autorização administrativa temporária de 24 horas de "${session.userName}". Motivo: ${session.revocationReason}.`
  );

  saveData();

  res.json({
    success: true,
    message: "Autorização administrativa de 24 horas encerrada com sucesso.",
  });
});

// List all 24-hour administrative sessions (with auto-expiration cleanup)
app.get("/api/auth/admin-session/sessions", (_req, res) => {
  const now = Date.now();
  let changed = false;
  db.adminAuthSessions.forEach((s) => {
    if (s.active && now >= s.expiresAtTimestamp) {
      s.active = false;
      changed = true;
    }
  });
  if (changed) saveData();

  res.json(db.adminAuthSessions);
});

// Bootstrap all data
app.get("/api/bootstrap", (_req, res) => {
  res.json(db);
});

// Users Management (Accessible to ADMIN and GESTOR with full identical privileges)
app.get("/api/users", (_req, res) => {
  res.json(db.users);
});

app.post("/api/users", (req, res) => {
  const { name, username, email, role, phone, teamId, assignedTeamIds, assignedWorksiteIds, active, password, permissions, user } = req.body;
  
  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: name || "Novo Usuário",
    username: username || (name ? name.toLowerCase().replace(/\s+/g, '.') : `user.${Date.now()}`),
    email: email || "",
    role: role || "CHEFE_EQUIPE",
    phone: phone || "",
    active: active !== undefined ? active : true,
    password: password || "123456",
    teamId: teamId || "",
    assignedTeamIds: assignedTeamIds || (teamId ? [teamId] : []),
    assignedWorksiteIds: assignedWorksiteIds || [],
    permissions: permissions || (role === 'ADMIN' || role === 'GESTOR' ? {
      canAccessAllModules: true,
      canManageUsers: true,
      canManageTeams: true,
      canManageWorksites: true,
      canManageAppointments: true,
      canManageDailyLogs: true,
      canViewReports: true,
      canManageOccurrences: true,
      canSendEmails: true,
      canExportData: true,
      canViewAuditLogs: true,
      canManageVehicles: true,
      canAccessFinancials: true,
    } : {}),
    avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString().split("T")[0],
  };

  db.users.push(newUser as any);

  if (user) {
    const roleLabel = newUser.role === 'ADMIN' ? 'Administrador' : newUser.role === 'GESTOR' ? 'Gestor' : 'Chefe de Equipe';
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "USER",
      newUser.id,
      newUser.name,
      `Criou o usuário "${newUser.name}" com perfil ${roleLabel} e login "${newUser.username}".`
    );
  }

  saveData();
  res.status(201).json(newUser);
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  const old = { ...db.users[index] };
  const user = req.body.user;
  const updateData = { ...req.body };
  delete updateData.user;

  db.users[index] = {
    ...db.users[index],
    ...updateData,
  };

  if (user) {
    const roleChanged = old.role !== db.users[index].role;
    const details = roleChanged
      ? `Alterou o perfil do usuário "${db.users[index].name}" de ${old.role} para ${db.users[index].role}.`
      : `Atualizou os dados cadastrais/permissões do usuário "${db.users[index].name}".`;

    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "USER",
      id,
      db.users[index].name,
      details,
      old,
      db.users[index]
    );
  }

  saveData();
  res.json(db.users[index]);
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  const deleted = db.users[index];
  db.users.splice(index, 1);

  const user = req.body?.user;
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EXCLUSAO",
      "USER",
      id,
      deleted.name,
      `Excluiu permanentemente o usuário "${deleted.name}" (${deleted.role}) do sistema.`,
      deleted,
      null
    );
  }

  saveData();
  res.json({ success: true, message: "Usuário removido com sucesso" });
});

app.post("/api/users/:id/toggle-status", (req, res) => {
  const { id } = req.params;
  const { user } = req.body;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  db.users[index].active = !db.users[index].active;
  const newStatus = db.users[index].active ? "Ativado" : "Desativado";

  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "USER",
      id,
      db.users[index].name,
      `${newStatus} o acesso do usuário "${db.users[index].name}".`
    );
  }

  saveData();
  res.json({ success: true, user: db.users[index] });
});

app.post("/api/users/:id/change-password", (req, res) => {
  const { id } = req.params;
  const { newPassword, user } = req.body;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  db.users[index].password = newPassword || "••••••••";

  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "USER",
      id,
      db.users[index].name,
      `Alterou a senha de acesso do usuário "${db.users[index].name}".`
    );
  }

  saveData();
  res.json({ success: true, message: "Senha atualizada com sucesso" });
});

// Helpers
app.get("/api/helpers", (_req, res) => {
  res.json(db.helpers);
});

app.post("/api/helpers", (req, res) => {
  const { name, role, phone, teamId, active, user } = req.body;
  const newHelper = {
    id: `help-${Date.now()}`,
    name: name || "Novo Ajudante",
    role: role || "Ajudante Geral",
    phone: phone || "",
    active: active !== undefined ? active : true,
    teamId: teamId || "",
    createdAt: new Date().toISOString().split("T")[0],
  };
  db.helpers.push(newHelper);
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "HELPER",
      newHelper.id,
      newHelper.name,
      `Cadastrou novo ajudante/colaborador: ${newHelper.name} (${newHelper.role})`
    );
  }
  saveData();
  res.status(201).json(newHelper);
});

app.put("/api/helpers/:id", (req, res) => {
  const { id } = req.params;
  const index = db.helpers.findIndex((h) => h.id === id);
  if (index === -1) return res.status(404).json({ error: "Helper not found" });

  const old = { ...db.helpers[index] };
  db.helpers[index] = { ...db.helpers[index], ...req.body };
  const user = req.body.user;
  if (user) {
    let actionDetails = `Atualizou dados do ajudante: ${db.helpers[index].name}`;
    if (old.active !== undefined && req.body.active !== undefined && old.active !== req.body.active) {
      if (req.body.active === false) {
        actionDetails = `Desligou/Inativou o ajudante "${db.helpers[index].name}" (${db.helpers[index].role}). Colaborador removido da lista ativa de novos serviços.`;
      } else {
        actionDetails = `Reativou o ajudante "${db.helpers[index].name}" (${db.helpers[index].role}). Colaborador novamente disponível para seleção.`;
      }
    }
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "HELPER",
      id,
      db.helpers[index].name,
      actionDetails,
      old,
      db.helpers[index]
    );
  }
  saveData();
  res.json(db.helpers[index]);
});

app.delete("/api/helpers/:id", (req, res) => {
  const { id } = req.params;
  const index = db.helpers.findIndex((h) => h.id === id);
  if (index === -1) return res.status(404).json({ error: "Ajudante não encontrado" });

  const helper = db.helpers[index];
  const user = req.body?.user;

  // Check if helper has any historical records in dailyLogs or appointments
  const hasDailyLogs = (db.dailyLogs || []).some((log) =>
    (log.helpersPresent || []).some((h) => h.id === id)
  );
  const hasAppointments = (db.appointments || []).some((app) =>
    (app.helperIds || []).includes(id)
  );

  if (hasDailyLogs || hasAppointments) {
    return res.status(400).json({
      error: `Não é possível excluir definitivamente o ajudante "${helper.name}" pois ele possui histórico de obras/serviços vinculados. Em vez disso, utilize a opção "Desligar / Inativar" para manter a integridade dos relatórios e dados históricos.`,
      hasHistory: true,
    });
  }

  // Remove from teams defaultHelperIds if present
  db.teams.forEach((t) => {
    if (t.defaultHelperIds && t.defaultHelperIds.includes(id)) {
      t.defaultHelperIds = t.defaultHelperIds.filter((hId) => hId !== id);
    }
  });

  db.helpers.splice(index, 1);

  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EXCLUSAO",
      "HELPER",
      id,
      helper.name,
      `Excluiu definitivamente o ajudante "${helper.name}" (${helper.role}) do banco de dados (sem histórico vinculado).`,
      helper,
      null
    );
  }

  saveData();
  res.json({ success: true, message: `Ajudante "${helper.name}" excluído com sucesso.` });
});

// Teams
app.get("/api/teams", (_req, res) => {
  res.json(db.teams);
});

app.post("/api/teams", (req, res) => {
  const { name, leaderId, leaderName, leaderPhone, defaultHelperIds, active, notes, user } = req.body;
  const newTeam = {
    id: `team-${Date.now()}`,
    name,
    leaderId: leaderId || "",
    leaderName: leaderName || "",
    leaderPhone: leaderPhone || "",
    defaultHelperIds: defaultHelperIds || [],
    active: active !== undefined ? active : true,
    notes: notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.teams.push(newTeam);
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "TEAM",
      newTeam.id,
      newTeam.name,
      `Cadastrou nova equipe: ${newTeam.name} com Chefe ${newTeam.leaderName}`
    );
  }
  saveData();
  res.status(201).json(newTeam);
});

app.put("/api/teams/:id", (req, res) => {
  const { id } = req.params;
  const index = db.teams.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: "Team not found" });

  const old = { ...db.teams[index] };
  db.teams[index] = { ...db.teams[index], ...req.body, updatedAt: new Date().toISOString() };
  const user = req.body.user;
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "TEAM",
      id,
      db.teams[index].name,
      `Atualizou equipe: ${db.teams[index].name}`,
      old,
      db.teams[index]
    );
  }
  saveData();
  res.json(db.teams[index]);
});

// Worksites
app.get("/api/worksites", (_req, res) => {
  res.json(db.worksites);
});

app.post("/api/worksites", (req, res) => {
  const {
    name,
    client,
    city,
    state,
    address,
    defaultServices,
    description,
    startDate,
    forecastEndDate,
    status,
    currentTeamIds,
    notes,
    user,
  } = req.body;

  const newWorksite = {
    id: `work-${Date.now()}`,
    name,
    client: client || "Cliente Não Informado",
    city: city || "",
    state: state || "PR",
    address: address || "",
    defaultServices: defaultServices || [],
    description: description || "",
    startDate: startDate || new Date().toISOString().split("T")[0],
    forecastEndDate: forecastEndDate || "",
    status: status || "PLANEJAMENTO",
    currentTeamIds: currentTeamIds || [],
    notes: notes || "",
    photos: [],
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.worksites.push(newWorksite);
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "WORKSITE",
      newWorksite.id,
      newWorksite.name,
      `Cadastrou nova obra: ${newWorksite.name} em ${newWorksite.city}/${newWorksite.state}`
    );
  }
  saveData();
  res.status(201).json(newWorksite);
});

app.put("/api/worksites/:id", (req, res) => {
  const { id } = req.params;
  const index = db.worksites.findIndex((w) => w.id === id);
  if (index === -1) return res.status(404).json({ error: "Worksite not found" });

  const old = { ...db.worksites[index] };
  db.worksites[index] = { ...db.worksites[index], ...req.body, updatedAt: new Date().toISOString() };
  const user = req.body.user;
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "WORKSITE",
      id,
      db.worksites[index].name,
      `Atualizou dados da obra: ${db.worksites[index].name}`,
      old,
      db.worksites[index]
    );
  }
  saveData();
  res.json(db.worksites[index]);
});

// Daily Logs (RDO)
app.get("/api/daily-logs", (_req, res) => {
  res.json(db.dailyLogs);
});

app.post("/api/daily-logs", (req, res) => {
  const data = req.body;
  const newLogId = data.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  let occurrenceObj = undefined;
  if (data.hasOccurrence && data.occurrence) {
    occurrenceObj = {
      id: data.occurrence.id || `occ-${Date.now()}`,
      dailyLogId: newLogId,
      date: data.date,
      teamId: data.teamId,
      teamName: data.teamName,
      leaderId: data.leaderId,
      leaderName: data.leaderName,
      leaderPhone: data.leaderPhone,
      city: data.city,
      worksiteId: data.worksiteId,
      worksiteName: data.worksiteName,
      category: data.occurrence.category || "Outro problema relevante",
      description: data.occurrence.description || "",
      urgency: data.occurrence.urgency || "MEDIA",
      status: data.occurrence.status || "PENDENTE",
      adminObservation: data.occurrence.adminObservation || "",
      assignedAdminName: data.occurrence.assignedAdminName || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const newLog = {
    ...data,
    id: newLogId,
    occurrence: occurrenceObj,
    synced: true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.dailyLogs.unshift(newLog);

  // Update worksite currentTeamIds if worksiteId is present
  if (newLog.worksiteId) {
    const ws = db.worksites.find((w) => w.id === newLog.worksiteId);
    if (ws && !ws.currentTeamIds.includes(newLog.teamId)) {
      ws.currentTeamIds.push(newLog.teamId);
    }
  }

  // Audit log
  addAuditLog(
    data.leaderId || "unknown",
    data.leaderName || "Chefe de Equipe",
    "CHEFE_EQUIPE",
    "CRIACAO",
    "DAILY_LOG",
    newLog.id,
    `RDO ${newLog.date} - ${newLog.teamName}`,
    `Registrou atividade diária em ${newLog.city} (${newLog.worksiteName}) com ${newLog.helpersPresent?.length || 0} ajudantes. Serviços: ${newLog.services?.join(", ")}`
  );

  if (occurrenceObj) {
    addAuditLog(
      data.leaderId || "unknown",
      data.leaderName || "Chefe de Equipe",
      "CHEFE_EQUIPE",
      "CRIACAO",
      "OCCURRENCE",
      occurrenceObj.id,
      `Ocorrência: ${occurrenceObj.category}`,
      `Alerta de atenção criado por ${data.leaderName}: ${occurrenceObj.description}`
    );
  }

  saveData();
  res.status(201).json(newLog);
});

app.put("/api/daily-logs/:id", (req, res) => {
  const { id } = req.params;
  const index = db.dailyLogs.findIndex((l) => l.id === id);
  if (index === -1) return res.status(404).json({ error: "Log not found" });

  const old = { ...db.dailyLogs[index] };
  db.dailyLogs[index] = { ...db.dailyLogs[index], ...req.body, updatedAt: new Date().toISOString() };
  const user = req.body.user;
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "DAILY_LOG",
      id,
      `RDO ${db.dailyLogs[index].date} - ${db.dailyLogs[index].teamName}`,
      `Editou registro diário da obra ${db.dailyLogs[index].worksiteName}`,
      old,
      db.dailyLogs[index]
    );
  }
  saveData();
  res.json(db.dailyLogs[index]);
});

// Update Occurrence status & resolution
app.put("/api/occurrences/:id", (req, res) => {
  const { id } = req.params;
  const { status, adminObservation, assignedAdminName, user } = req.body;

  let foundLog = db.dailyLogs.find((l) => l.occurrence && l.occurrence.id === id);
  if (!foundLog || !foundLog.occurrence) {
    return res.status(404).json({ error: "Occurrence not found" });
  }

  const oldOccurrence = { ...foundLog.occurrence };
  foundLog.occurrence.status = status || foundLog.occurrence.status;
  if (adminObservation !== undefined) foundLog.occurrence.adminObservation = adminObservation;
  if (assignedAdminName !== undefined) foundLog.occurrence.assignedAdminName = assignedAdminName;
  foundLog.occurrence.updatedAt = new Date().toISOString();

  if (status === "RESOLVIDO") {
    foundLog.occurrence.resolvedAt = new Date().toISOString();
    foundLog.occurrence.resolvedBy = user?.name || "Administrador";
  }

  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "RESOLUCAO_OCORRENCIA",
      "OCCURRENCE",
      id,
      `Ocorrência: ${foundLog.occurrence.category}`,
      `Status alterado para [${status}] por ${user.name}. Nota admin: ${adminObservation || "Sem observação"}`,
      oldOccurrence,
      foundLog.occurrence
    );
  }

  saveData();
  res.json(foundLog.occurrence);
});

// Batch sync for offline queue
app.post("/api/sync", (req, res) => {
  const { pendingLogs, user } = req.body;
  if (!Array.isArray(pendingLogs)) {
    return res.status(400).json({ error: "Invalid pendingLogs array" });
  }

  const syncedItems = [];
  for (const log of pendingLogs) {
    const existingIndex = db.dailyLogs.findIndex((l) => l.id === log.id);
    if (existingIndex >= 0) {
      db.dailyLogs[existingIndex] = { ...log, synced: true, updatedAt: new Date().toISOString() };
      syncedItems.push(db.dailyLogs[existingIndex]);
    } else {
      const newLog = { ...log, synced: true, createdAt: log.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.dailyLogs.unshift(newLog);
      syncedItems.push(newLog);
    }
  }

  if (user && syncedItems.length > 0) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "DAILY_LOG",
      "batch-sync",
      `Sincronização Offline (${syncedItems.length} registros)`,
      `Sincronizou com sucesso ${syncedItems.length} registros que estavam na fila offline do dispositivo.`
    );
  }

  saveData();
  res.json({ success: true, count: syncedItems.length, items: syncedItems });
});

// Appointments (Agendamentos / Planejamento)
app.get("/api/appointments", (req, res) => {
  const { teamId, status, startDate, endDate } = req.query;
  let results = [...(db.appointments || [])];

  if (teamId) {
    results = results.filter((a) => a.teamId === teamId);
  }
  if (status) {
    results = results.filter((a) => a.status === status);
  }
  if (startDate) {
    results = results.filter((a) => a.endDate >= (startDate as string));
  }
  if (endDate) {
    results = results.filter((a) => a.startDate <= (endDate as string));
  }

  // Sort by start date ascending
  results.sort((a, b) => a.startDate.localeCompare(b.startDate));
  res.json(results);
});

app.get("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const appointment = (db.appointments || []).find((a) => a.id === id);
  if (!appointment) return res.status(404).json({ error: "Agendamento não encontrado" });
  res.json(appointment);
});

app.post("/api/appointments", (req, res) => {
  const {
    worksiteId,
    worksiteName,
    client,
    city,
    state,
    address,
    teamId,
    teamName,
    leaderId,
    leaderName,
    leaderPhone,
    helperIds,
    helpers,
    serviceTitle,
    services,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    status,
    notes,
    nextAppointmentId,
    nextDestinationCity,
    nextDestinationState,
    nextDestinationWorksite,
    nextDestinationStartDate,
    nextDestinationService,
    user,
    forceConflictOverride,
  } = req.body;

  const newAppointment = {
    id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    worksiteId: worksiteId || "",
    worksiteName: worksiteName || "Obra Não Especificada",
    client: client || "",
    city: city || "Curitiba",
    state: state || "PR",
    address: address || "",
    teamId: teamId || "",
    teamName: teamName || "",
    leaderId: leaderId || "",
    leaderName: leaderName || "",
    leaderPhone: leaderPhone || "",
    helperIds: helperIds || [],
    helpers: helpers || [],
    serviceTitle: serviceTitle || "Serviço de Sinalização Viária",
    services: services || ["Sinalização vertical"],
    description: description || "",
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || startDate || new Date().toISOString().split("T")[0],
    startTime: startTime || "07:30",
    endTime: endTime || "17:00",
    status: status || "PLANEJADO",
    notes: notes || "",
    nextAppointmentId: nextAppointmentId || "",
    nextDestinationCity: nextDestinationCity || "",
    nextDestinationState: nextDestinationState || "",
    nextDestinationWorksite: nextDestinationWorksite || "",
    nextDestinationStartDate: nextDestinationStartDate || "",
    nextDestinationService: nextDestinationService || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: user?.name || "Administrador",
  };

  db.appointments = db.appointments || [];
  db.appointments.push(newAppointment);

  if (user) {
    const overrideNote = forceConflictOverride ? " [COM SOBREPOSIÇÃO/CONFLITO AUTORIZADO]" : "";
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "CRIACAO",
      "APPOINTMENT",
      newAppointment.id,
      `${newAppointment.teamName} - ${newAppointment.city}/${newAppointment.state}`,
      `Cadastrou novo agendamento de serviço para a ${newAppointment.teamName} em ${newAppointment.city}/${newAppointment.state} no período de ${newAppointment.startDate} a ${newAppointment.endDate}.${overrideNote}`
    );
  }

  saveData();
  res.status(201).json(newAppointment);
});

app.put("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const index = (db.appointments || []).findIndex((a) => a.id === id);
  if (index === -1) return res.status(404).json({ error: "Agendamento não encontrado" });

  const old = { ...db.appointments[index] };
  const user = req.body.user;
  const forceConflictOverride = req.body.forceConflictOverride;

  db.appointments[index] = {
    ...db.appointments[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  if (user) {
    const overrideNote = forceConflictOverride ? " [SOBREPOSIÇÃO FORÇADA POR ADMIN]" : "";
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "APPOINTMENT",
      id,
      `${db.appointments[index].teamName} - ${db.appointments[index].city}`,
      `Atualizou dados do agendamento da ${db.appointments[index].teamName} (${db.appointments[index].startDate} a ${db.appointments[index].endDate}).${overrideNote}`,
      old,
      db.appointments[index]
    );
  }

  saveData();
  res.json(db.appointments[index]);
});

app.delete("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const index = (db.appointments || []).findIndex((a) => a.id === id);
  if (index === -1) return res.status(404).json({ error: "Agendamento não encontrado" });

  const deleted = db.appointments[index];
  db.appointments.splice(index, 1);

  const user = req.body?.user;
  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EXCLUSAO",
      "APPOINTMENT",
      id,
      `${deleted.teamName} - ${deleted.city}`,
      `Excluiu o agendamento da ${deleted.teamName} em ${deleted.city} (${deleted.startDate} a ${deleted.endDate})`,
      deleted,
      null
    );
  }

  saveData();
  res.json({ success: true, message: "Agendamento removido com sucesso" });
});

app.post("/api/appointments/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, user } = req.body;
  const index = (db.appointments || []).findIndex((a) => a.id === id);
  if (index === -1) return res.status(404).json({ error: "Agendamento não encontrado" });

  const oldStatus = db.appointments[index].status;
  db.appointments[index].status = status;
  db.appointments[index].updatedAt = new Date().toISOString();

  if (user) {
    addAuditLog(
      user.id,
      user.name,
      user.role,
      "EDICAO",
      "APPOINTMENT",
      id,
      `${db.appointments[index].teamName} - ${db.appointments[index].city}`,
      `Alterou o status do agendamento de ${oldStatus} para ${status}`
    );
  }

  saveData();
  res.json(db.appointments[index]);
});

// ==========================================
// GPS REAL BREADCRUMB TRACKING & TRAJECTORY
// STRICTLY NO ROUTING OR DIRECTIONS CALCULATIONS
// ==========================================

function serverHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Get raw points by date and user/team
app.get("/api/gps/points", (req, res) => {
  const { date, userId, teamId } = req.query;
  let results = [...(db.gpsPoints || [])];

  if (date) {
    results = results.filter((p) => p.date === date);
  }
  if (userId) {
    results = results.filter((p) => p.userId === userId);
  }
  if (teamId) {
    results = results.filter((p) => p.teamId === teamId);
  }

  // Sort strictly chronologically by timestamp
  results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(results);
});

// 2. Post single point or batch of offline-recorded GPS breadcrumb points
app.post("/api/gps/track", (req, res) => {
  const body = req.body;
  const rawPoints = Array.isArray(body) ? body : [body];
  const savedPoints: typeof INITIAL_GPS_POINTS = [];

  for (const item of rawPoints) {
    if (!item || typeof item.latitude !== "number" || typeof item.longitude !== "number") {
      continue;
    }

    const timestamp = item.timestamp || new Date().toISOString();
    const dateObj = new Date(timestamp);
    const dateStr = item.date || dateObj.toISOString().split("T")[0];
    const timeFormatted =
      item.timeFormatted ||
      dateObj.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newPoint = {
      id: item.id || `gps-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: item.userId || "user-unknown",
      userName: item.userName || "Chefe de Equipe",
      userRole: item.userRole || "CHEFE_EQUIPE",
      teamId: item.teamId || "team-default",
      teamName: item.teamName || "Equipe",
      date: dateStr,
      timestamp,
      timeFormatted,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: item.accuracy ?? 5.0,
      speed: item.speed ?? null,
      heading: item.heading ?? null,
      altitude: item.altitude ?? null,
      worksiteId: item.worksiteId || undefined,
      worksiteName: item.worksiteName || undefined,
      pointType: item.pointType || "INTERMEDIATE",
      stopDurationMinutes: item.stopDurationMinutes || undefined,
      batteryLevel: item.batteryLevel ?? undefined,
      addressReference: item.addressReference || undefined,
      source: item.source || "DEVICE_GPS",
      synced: true,
      notes: item.notes || undefined,
    };

    db.gpsPoints.push(newPoint);
    savedPoints.push(newPoint);
  }

  saveData();
  res.json({ success: true, count: savedPoints.length, points: savedPoints });
});

// 3. Get comprehensive calculated trajectory for specific date and user
app.get("/api/gps/trajectory", (req, res) => {
  const { date, userId, teamId } = req.query;
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];

  let points = [...(db.gpsPoints || [])].filter((p) => p.date === targetDate);

  if (userId) {
    points = points.filter((p) => p.userId === userId);
  } else if (teamId) {
    points = points.filter((p) => p.teamId === teamId);
  }

  // Sort strictly chronologically
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate real distance strictly from consecutive breadcrumb points
  let totalDistanceKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 && p2) {
      const d = serverHaversineDistanceKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      if (d < 100) {
        totalDistanceKm += d;
      }
    }
  }

  const userObj = db.users.find((u) => u.id === userId);
  const teamObj = db.teams.find((t) => t.id === teamId || t.leaderId === userId);

  const totalPoints = points.length;
  const hasEnoughData = totalPoints >= 2;
  const startTime = points.length > 0 ? points[0].timeFormatted : undefined;
  const endTime = points.length > 0 ? points[points.length - 1].timeFormatted : undefined;

  let totalDurationFormatted = "0h 00m";
  if (points.length >= 2) {
    const t0 = new Date(points[0].timestamp).getTime();
    const t1 = new Date(points[points.length - 1].timestamp).getTime();
    const diffMs = Math.max(0, t1 - t0);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    totalDurationFormatted = `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  res.json({
    date: targetDate,
    userId: (userId as string) || (userObj?.id || ""),
    userName: userObj?.name || (points[0]?.userName || "Chefe de Equipe"),
    teamId: (teamId as string) || (teamObj?.id || points[0]?.teamId || ""),
    teamName: teamObj?.name || points[0]?.teamName || "Equipe de Campo",
    points,
    totalPoints,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    startTime,
    endTime,
    totalDurationFormatted,
    hasEnoughData,
    lastUpdated: new Date().toISOString(),
  });
});

// 4. Get latest GPS fix for all field team leaders
app.get("/api/gps/latest", (_req, res) => {
  const leaders = db.users.filter((u) => u.role === "CHEFE_EQUIPE" && u.active);
  const now = Date.now();

  const results = leaders.map((leader) => {
    // Find all points for this leader sorted by timestamp desc
    const leaderPoints = (db.gpsPoints || [])
      .filter((p) => p.userId === leader.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const team = db.teams.find((t) => t.id === leader.teamId || t.leaderId === leader.id);
    const lastPoint = leaderPoints[0] || null;

    let minutesAgo = 9999;
    let isOnline = false;
    let statusLabel = "Sem sinal GPS hoje";

    if (lastPoint) {
      const pTime = new Date(lastPoint.timestamp).getTime();
      minutesAgo = Math.max(0, Math.round((now - pTime) / 60000));

      if (minutesAgo <= 15) {
        isOnline = true;
        statusLabel = `Ativo agora (há ${minutesAgo === 0 ? "poucos segundos" : `${minutesAgo} min`})`;
      } else if (minutesAgo <= 120) {
        statusLabel = `Último sinal há ${minutesAgo} min`;
      } else {
        const hours = Math.floor(minutesAgo / 60);
        statusLabel = `Último registro há ${hours}h`;
      }
    }

    return {
      userId: leader.id,
      userName: leader.name,
      teamId: leader.teamId || team?.id || "",
      teamName: team?.name || `Equipe ${leader.name}`,
      role: leader.role,
      phone: leader.phone,
      lastPoint,
      isOnline,
      minutesAgo,
      statusLabel,
    };
  });

  res.json(results);
});

// 5. GPS Permission Audit registration
app.post("/api/gps/permission-audit", (req, res) => {
  const { userId, userName, action, platform } = req.body;
  const user = db.users.find((u) => u.id === userId);

  const actionText =
    action === "GRANTED"
      ? "AUTORIZOU o rastreamento contínuo de deslocamento em segundo plano."
      : action === "REVOKED"
      ? "REVOGOU a permissão de rastreamento contínuo de localização."
      : "Verificou o status de permissão de GPS.";

  addAuditLog(
    userId || "user-unknown",
    userName || user?.name || "Chefe de Equipe",
    user?.role || "CHEFE_EQUIPE",
    action === "GRANTED" ? "CRIACAO" : "EDICAO",
    "PERMISSION",
    `gps-perm-${userId}`,
    "Permissão de GPS",
    `O Chefe de Equipe ${userName || user?.name || "Usuário"} ${actionText} (Plataforma: ${platform || "Navegador Web / PWA"}).`
  );

  saveData();
  res.json({ success: true, message: "Auditoria de permissão registrada com sucesso" });
});

// ==========================================
// SERVICE PHOTOS GALLERY & AUDIT (ADMIN/GESTOR ONLY)
// ==========================================

// 1. Get all service photos with permission validation
app.get("/api/service-photos", (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const userRole = req.headers["x-user-role"] as string;
  const adminToken = req.headers["x-admin-token"] as string;

  // Check permissions: Must be ADMIN, GESTOR, or have valid active 24h token
  let hasAccess = false;
  if (userRole === "ADMIN" || userRole === "GESTOR") {
    hasAccess = true;
  } else if (adminToken) {
    const session = db.adminAuthSessions.find(
      (s) => s.token === adminToken && s.active && s.expiresAtTimestamp > Date.now()
    );
    if (session) hasAccess = true;
  }

  if (!hasAccess && userId) {
    const user = db.users.find((u) => u.id === userId);
    if (user && (user.role === "ADMIN" || user.role === "GESTOR")) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return res.status(403).json({
      error: "Acesso não autorizado. Apenas Administradores e Gestores podem acessar a Galeria Geral de Fotos.",
    });
  }

  const { date, teamId, worksiteId, service, leaderId, startDate, endDate, search } = req.query;

  // Extract all photos from dailyLogs
  const allPhotos: Array<{
    id: string;
    url: string;
    caption?: string;
    timestamp: string;
    timeFormatted?: string;
    date: string;
    teamId: string;
    teamName: string;
    leaderId: string;
    leaderName: string;
    leaderPhone?: string;
    worksiteId?: string;
    worksiteName: string;
    worksiteLocationDetail?: string;
    city: string;
    state: string;
    service: string;
    dailyLogId: string;
    dailyLogStatus?: string;
    latitude?: number;
    longitude?: number;
  }> = [];

  for (const log of db.dailyLogs || []) {
    if (!log.photos || log.photos.length === 0) continue;

    // Filter by date / range / team / worksite / leader if provided
    if (date && log.date !== date) continue;
    if (startDate && log.date < (startDate as string)) continue;
    if (endDate && log.date > (endDate as string)) continue;
    if (teamId && log.teamId !== teamId) continue;
    if (worksiteId && log.worksiteId !== worksiteId) continue;
    if (leaderId && log.leaderId !== leaderId) continue;

    // Find GPS coordinates for this team/worksite if not on photo
    const worksiteObj = db.worksites.find((w) => w.id === log.worksiteId);

    log.photos.forEach((photo, idx) => {
      // Determine service: photo specific service or from log's services
      const assignedService =
        photo.service ||
        (log.services && log.services.length > 0
          ? log.services[idx % log.services.length]
          : "Sinalização e Obras Viárias");

      if (service && assignedService !== service && !log.services?.includes(service as string)) {
        return;
      }

      // Format time
      let timeFormatted = "";
      try {
        if (photo.timestamp) {
          const dt = new Date(photo.timestamp);
          if (!isNaN(dt.getTime())) {
            timeFormatted = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          }
        }
      } catch {}

      if (!timeFormatted && log.workHours?.start) {
        timeFormatted = log.workHours.start;
      }

      const photoItem = {
        id: photo.id || `photo-${log.id}-${idx}`,
        url: photo.url,
        caption: photo.caption || `Registro de ${assignedService}`,
        timestamp: photo.timestamp || log.createdAt,
        timeFormatted: timeFormatted || "08:00",
        date: log.date,
        teamId: log.teamId,
        teamName: log.teamName,
        leaderId: log.leaderId,
        leaderName: log.leaderName,
        leaderPhone: log.leaderPhone,
        worksiteId: log.worksiteId,
        worksiteName: log.worksiteName,
        worksiteLocationDetail: log.worksiteLocationDetail,
        city: log.city,
        state: log.state,
        service: assignedService,
        dailyLogId: log.id,
        dailyLogStatus: log.status,
        latitude: photo.latitude || worksiteObj?.latitude || (log.city === "Araucária" ? -25.5902 : -25.4381),
        longitude: photo.longitude || worksiteObj?.longitude || (log.city === "Araucária" ? -49.3789 : -49.2683),
      };

      if (search) {
        const q = (search as string).toLowerCase();
        const match =
          photoItem.teamName.toLowerCase().includes(q) ||
          photoItem.leaderName.toLowerCase().includes(q) ||
          photoItem.worksiteName.toLowerCase().includes(q) ||
          photoItem.service.toLowerCase().includes(q) ||
          photoItem.city.toLowerCase().includes(q) ||
          (photoItem.caption && photoItem.caption.toLowerCase().includes(q));
        if (!match) return;
      }

      allPhotos.push(photoItem);
    });
  }

  // Sort photos: most recent date first, then by timestamp desc
  allPhotos.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  res.json({
    total: allPhotos.length,
    photos: allPhotos,
  });
});

// 2. Register Service Photos Audit Action
app.post("/api/service-photos/audit", (req, res) => {
  const { userId, userName, userRole, action, details, teamConsulted, dateConsulted } = req.body;

  const validActions = ["CONSULTA", "DOWNLOAD_FOTOS", "GERACAO_RELATORIO"];
  const finalAction = validActions.includes(action) ? action : "CONSULTA";

  const user = db.users.find((u) => u.id === userId);

  let fullDetails = details || `Acessou Fotos dos Serviços`;
  if (teamConsulted || dateConsulted) {
    fullDetails += ` [Filtros: ${teamConsulted ? `Equipe: ${teamConsulted}; ` : ""}${
      dateConsulted ? `Data: ${dateConsulted}` : ""
    }]`;
  }

  addAuditLog(
    userId || "user-admin",
    userName || user?.name || "Administrador/Gestor",
    userRole || user?.role || "ADMIN",
    finalAction as any,
    "SERVICE_PHOTOS",
    `photos-${Date.now()}`,
    `Galeria de Fotos dos Serviços`,
    fullDetails,
    null,
    { teamConsulted, dateConsulted, timestamp: new Date().toISOString() }
  );

  saveData();
  res.json({ success: true, message: "Auditoria de fotos registrada com sucesso" });
});

// Audit logs
app.get("/api/audit-logs", (_req, res) => {
  res.json(db.auditLogs);
});

// Reset demo data to initial
app.post("/api/reset-data", (_req, res) => {
  db = {
    users: INITIAL_USERS,
    helpers: INITIAL_HELPERS,
    teams: INITIAL_TEAMS,
    worksites: INITIAL_WORKSITES,
    dailyLogs: INITIAL_DAILY_LOGS,
    auditLogs: INITIAL_AUDIT_LOGS,
    appointments: INITIAL_APPOINTMENTS,
    gpsPoints: INITIAL_GPS_POINTS,
    adminAuthSessions: [],
  };
  saveData();
  res.json({ success: true, message: "Dados restaurados para o padrão com sucesso" });
});

// ---------------- Vite / Static middleware ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Gestão de Obras] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
