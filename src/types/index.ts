export type UserRole = 'ADMIN' | 'GESTOR' | 'CHEFE_EQUIPE';

export interface CustomPermissions {
  canAccessAllModules: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  canManageWorksites: boolean;
  canManageAppointments: boolean;
  canManageDailyLogs: boolean;
  canViewReports: boolean;
  canManageOccurrences: boolean;
  canSendEmails: boolean;
  canExportData: boolean;
  canViewAuditLogs: boolean;
  canManageVehicles?: boolean;
  canAccessFinancials?: boolean;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  password?: string;
  teamId?: string; // If CHEFE_EQUIPE, primary associated team
  assignedTeamIds?: string[]; // Multiple teams if applicable
  assignedWorksiteIds?: string[]; // Specific worksites assigned
  permissions?: Partial<CustomPermissions>;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Helper {
  id: string;
  name: string;
  role: string; // e.g. "Ajudante Geral", "Pintor Especializado", "Montador", "Motorista"
  phone?: string;
  active: boolean;
  teamId?: string; // Default or primary team, but can be chosen by any leader
  createdAt: string;
}

export interface Team {
  id: string;
  name: string; // e.g. "Equipe 01 - Sinalização Vertical"
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  defaultHelperIds: string[]; // default/usual helpers, can be modified dynamically daily
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorksiteStatus = 'PLANEJAMENTO' | 'EM_ANDAMENTO' | 'PAUSADA' | 'CONCLUIDA';

export interface Worksite {
  id: string;
  name: string; // e.g. "Trecho Rodovia BR-277 - Km 40 ao 55"
  client: string; // e.g. "Ecovia / DER-PR", "Prefeitura de Curitiba"
  city: string;
  state: string;
  address: string;
  latitude?: number;
  longitude?: number;
  defaultServices: string[];
  description: string;
  startDate: string;
  forecastEndDate: string;
  status: WorksiteStatus;
  currentTeamIds: string[];
  notes?: string;
  photos?: string[];
  documents?: { name: string; url: string; uploadDate: string }[];
  createdAt: string;
  updatedAt: string;
}

export const STANDARD_SERVICES = [
  'Instalação de placas',
  'Remoção de placas',
  'Substituição de placas',
  'Pintura termoplástica',
  'Pintura acrílica',
  'Sinalização horizontal',
  'Sinalização vertical',
  'Implantação de tachões / tachas',
  'Outros serviços',
] as const;

export type StandardServiceType = (typeof STANDARD_SERVICES)[number];

export type OccurrenceStatus = 'PENDENTE' | 'EM_ATENDIMENTO' | 'RESOLVIDO';
export type OccurrenceUrgency = 'ALTA' | 'MEDIA' | 'BAIXA';

export const OCCURRENCE_CATEGORIES = [
  'Problema mecânico em veículo ou caminhão',
  'Problema em máquina / extrusora / compressora',
  'Ferramentas quebradas ou com defeito',
  'Equipamentos danificados',
  'Falta de ferramentas necessárias',
  'Falta de tintas / termoplásticos / solventes',
  'Falta de placas / suportes / parafusos',
  'Falta de cones / sinalização de segurança',
  'Problemas no local da obra / Chuva / Condições climáticas',
  'Imprevisto / Bloqueio de trânsito não liberado',
  'Necessidade de manutenção preventiva urgente',
  'Outro problema relevante',
] as const;

export interface Occurrence {
  id: string;
  dailyLogId: string;
  date: string;
  teamId: string;
  teamName: string;
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  city: string;
  worksiteId?: string;
  worksiteName: string;
  category: string;
  description: string;
  urgency: OccurrenceUrgency;
  status: OccurrenceStatus;
  adminObservation?: string;
  assignedAdminName?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type DailyLogStatus = 'EM_ANDAMENTO' | 'CONCLUIDO_DIA' | 'PARALISADO';
export type WeatherType = 'ENSOLARADO' | 'NUBLADO' | 'CHUVA_LEVE' | 'CHUVA_FORTE';

export interface PresentHelper {
  id: string;
  name: string;
  role?: string;
}

export interface DailyLogPhoto {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
  service?: string;
  latitude?: number;
  longitude?: number;
  uploadedBy?: string;
}

export interface ServicePhotoItem {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
  timeFormatted?: string;
  date: string; // YYYY-MM-DD
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
  dailyLogStatus?: DailyLogStatus;
  latitude?: number;
  longitude?: number;
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  teamId: string;
  teamName: string;
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  // Dynamic daily roster preserved in time
  helpersPresent: PresentHelper[];
  city: string;
  state: string;
  worksiteId?: string;
  worksiteName: string;
  worksiteLocationDetail?: string; // e.g. "Km 14+200 pista sentido litoral"
  services: string[]; // multi-select list
  otherServiceDescription?: string; // Required when 'Outros serviços' is selected
  serviceDescription: string; // detailed work description
  observations?: string; // general day observations
  status: DailyLogStatus;
  weather?: WeatherType;
  hasOccurrence: boolean;
  occurrence?: Occurrence;
  photos: DailyLogPhoto[];
  workHours?: {
    start: string;
    end: string;
    breakMinutes?: number;
  };
  appointmentId?: string; // Linked appointment if applicable
  synced?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AuditAction =
  | 'CRIACAO'
  | 'EDICAO'
  | 'EXCLUSAO'
  | 'RESOLUCAO_OCORRENCIA'
  | 'CONSULTA'
  | 'DOWNLOAD_FOTOS'
  | 'GERACAO_RELATORIO';

export type AuditEntity =
  | 'DAILY_LOG'
  | 'TEAM'
  | 'WORKSITE'
  | 'USER'
  | 'HELPER'
  | 'OCCURRENCE'
  | 'APPOINTMENT'
  | 'PERMISSION'
  | 'ADMIN_AUTH'
  | 'GPS_TRACK'
  | 'SERVICE_PHOTOS';

export type GpsPointType = 'START' | 'INTERMEDIATE' | 'STOP' | 'WORKSITE' | 'END' | 'CURRENT';

export interface GpsPoint {
  id: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  teamId: string;
  teamName?: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601 string
  timeFormatted: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  accuracy?: number; // In meters, e.g. 4.5
  speed?: number | null; // In km/h
  heading?: number | null; // In degrees (0-360)
  altitude?: number | null;
  worksiteId?: string;
  worksiteName?: string;
  pointType?: GpsPointType;
  stopDurationMinutes?: number;
  batteryLevel?: number; // e.g. 85 (%)
  addressReference?: string;
  source: 'DEVICE_GPS' | 'MANUAL_PING' | 'OFFLINE_SYNC';
  synced: boolean;
  notes?: string;
}

export interface VisitedWorksiteStop {
  worksiteId?: string;
  worksiteName: string;
  city?: string;
  arrivedAt: string; // HH:MM:SS
  departedAt?: string; // HH:MM:SS
  arrivalTime?: string;
  departureTime?: string;
  durationMinutes?: number;
  latitude: number;
  longitude: number;
  servicesPerformed?: string[];
  pointsCount?: number;
}

export interface TrajectoryStop {
  id: string;
  title: string;
  arrivedAt: string; // HH:MM:SS
  departedAt: string; // HH:MM:SS
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  latitude: number;
  longitude: number;
  isWorksite: boolean;
  worksiteName?: string;
  addressReference?: string;
  notes?: string;
}

export interface GpsDayTrajectory {
  date: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  points: GpsPoint[];
  totalPoints: number;
  totalDistanceKm: number; // Sum of real consecutive GPS point distances
  startTime?: string;
  endTime?: string;
  totalDurationFormatted?: string;
  visitedWorksites: VisitedWorksiteStop[];
  stops: TrajectoryStop[];
  timelineEvents?: any[];
  hasEnoughData: boolean;
  lastUpdated?: string;
}

export type GpsTrackingStatus = 'ACTIVE' | 'INTERRUPTED' | 'PERMISSION_REQUEST' | 'DISABLED';

export interface GpsPermissionAuditRecord {
  id: string;
  userId: string;
  userName: string;
  action: 'GRANTED' | 'REVOKED' | 'CHECK';
  timestamp: string;
  platform?: string;
  userAgent?: string;
}

export interface GpsLatestLocation {
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  role: UserRole;
  phone?: string;
  lastPoint: GpsPoint;
  isOnline: boolean;
  minutesAgo: number;
  statusLabel: string;
}

export interface AdminAuthSession {
  id: string;
  token: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  authorizedByUserId: string;
  authorizedByName: string;
  authorizedByRole: 'ADMIN' | 'GESTOR';
  reason?: string;
  issuedAt: string; // ISO String
  expiresAt: string; // ISO String (issuedAt + 24h)
  expiresAtTimestamp: number; // Unix timestamp in ms
  active: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

export type AppointmentStatus = 'PLANEJADO' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface Appointment {
  id: string;
  worksiteId?: string;
  worksiteName: string;
  client?: string;
  city: string;
  state: string;
  address: string;
  teamId: string;
  teamName: string;
  leaderId?: string;
  leaderName: string;
  leaderPhone: string;
  helperIds: string[];
  helpers: PresentHelper[];
  serviceTitle: string;
  services: string[];
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // e.g. "07:30"
  endTime?: string; // e.g. "17:00"
  status: AppointmentStatus;
  notes?: string;
  nextAppointmentId?: string;
  nextDestinationCity?: string;
  nextDestinationState?: string;
  nextDestinationWorksite?: string;
  nextDestinationStartDate?: string;
  nextDestinationDate?: string;
  nextDestinationService?: string;
  overrideConflictReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AppointmentConflict {
  type: 'HELPER' | 'TEAM' | 'WORKSITE';
  severity: 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  conflictingAppointmentId?: string;
  conflictingTeamName?: string;
  conflictingDates?: string;
  helperName?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName: string;
  details: string;
  previousData?: any;
  newData?: any;
}

export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  teamId?: string;
  leaderId?: string;
  city?: string;
  worksiteId?: string;
  serviceType?: string;
  status?: DailyLogStatus | 'TODOS';
  hasOccurrence?: boolean | 'TODOS';
  occurrenceStatus?: OccurrenceStatus | 'TODOS';
  searchTerm?: string;
}
