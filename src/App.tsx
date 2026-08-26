import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AdminDashboard } from './components/AdminDashboard';
import { DailyOverview } from './components/DailyOverview';
import { DailyActivityForm } from './components/DailyActivityForm';
import { TeamsManagement } from './components/TeamsManagement';
import { WorksitesManagement } from './components/WorksitesManagement';
import { HistoryAndFilter } from './components/HistoryAndFilter';
import { OccurrencesAlertCenter } from './components/OccurrencesAlertCenter';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { AppointmentsManagement } from './components/AppointmentsManagement';
import { MyScheduleView } from './components/MyScheduleView';
import { GmailCenterView } from './components/GmailCenterView';
import { UsersAndPermissionsManagement } from './components/UsersAndPermissionsManagement';
import { TeamRouteHistory } from './components/TeamRouteHistory';
import { ServicePhotosGallery } from './components/ServicePhotosGallery';
import { SendEmailModal } from './components/SendEmailModal';
import { GpsPermissionModal } from './components/GpsPermissionModal';
import { GpsMobileArchitectureModal } from './components/GpsMobileArchitectureModal';
import { GmailProvider, useGmail } from './context/GmailContext';
import { GpsTrackingProvider } from './context/GpsTrackingContext';
import { DailyLog, Appointment } from './types';
import { exportSingleRDOtoPDF } from './services/pdfExport';
import {
  HardHat,
  Plus,
  Calendar,
  AlertTriangle,
  FileDown,
  Clock,
  Building2,
  Users,
  History,
  CheckCircle2,
  CalendarRange,
  Truck,
  Mail,
  Compass,
  MapPin,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, isAdmin, isLeader } = useAuth();
  const { dailyLogs = [], helpers = [], teams = [], appointments = [], isOnline, offlineQueue = [], syncOffline } = useData();
  const { openSendModalWithRdo } = useGmail();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<DailyLog | null>(null);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  // Field Team Chief logs safely filtered
  const myTeamLogs = (dailyLogs || []).filter(
    (l) => l && (l.teamId === currentUser?.teamId || l.leaderName === currentUser?.name)
  );

  const handleOpenNewRDO = () => {
    setEditingLog(null);
    setActiveTab('new-rdo');
  };

  const handleOpenNewRDOWithAppointment = (app: Appointment) => {
    const matchedHelpers = (helpers || [])
      .filter((h) => (app.helperIds || []).includes(h.id))
      .map((h) => ({ id: h.id, name: h.name, role: h.role }));

    const teamObj = (teams || []).find((t) => t.id === app.teamId);

    const templateLog: Partial<DailyLog> = {
      teamId: app.teamId,
      leaderName: app.leaderName,
      leaderPhone: teamObj?.leaderPhone || '(41) 99988-1122',
      worksiteId: app.worksiteId || '',
      worksiteName: app.worksiteName,
      city: app.city,
      state: app.state,
      worksiteLocationDetail: app.address || '',
      services: app.services || ['Instalação de placas'],
      date: new Date().toISOString().split('T')[0],
      helpersPresent: matchedHelpers,
      observations: app.notes ? `[Agendamento] ${app.notes}` : '',
      status: 'EM_ANDAMENTO',
    };

    setEditingLog(templateLog as DailyLog);
    setActiveTab('new-rdo');
  };

  const handleEditRDO = (log: DailyLog) => {
    setEditingLog(log);
    setActiveTab('new-rdo');
  };

  const handleRDOSuccess = (log: DailyLog) => {
    setEditingLog(null);
    if (isAdmin) {
      setActiveTab('daily-overview');
    } else {
      setActiveTab('my-logs');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          setEditingLog(null);
          setActiveTab(tab);
        }}
        onOpenNewRDO={handleOpenNewRDO}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewRDO={handleOpenNewRDO}
          onNavigate={(tab) => {
            setEditingLog(null);
            setActiveTab(tab);
          }}
        />

        {/* Scrollable Main Section */}
        <section className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50 space-y-6">
          {/* Offline Banner alert if any items in queue */}
          {(offlineQueue?.length || 0) > 0 && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl shadow-xs font-medium text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>
                  Você possui <strong>{(offlineQueue?.length || 0)}</strong> registro(s) salvo(s) localmente aguardando conexão com a internet.
                </span>
              </div>
              <button
                onClick={syncOffline}
                className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-xs font-bold transition-colors"
              >
                Sincronizar Agora
              </button>
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {isAdmin ? (
                <AdminDashboard
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenNewRDO={handleOpenNewRDO}
                  onViewLogDetail={(log) => setSelectedLogDetail(log)}
                />
              ) : (
                /* Field Leader Dashboard */
                <div className="space-y-6 animate-fade-in">
                  {/* Field Chief Welcome Card */}
                  <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                          Modo Campo • Chefe de Equipe
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <h1 className="text-2xl font-bold text-white mt-1">
                        Bem-vindo, {currentUser?.name || 'Chefe de Equipe'}
                      </h1>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Registre as atividades diárias da sua equipe na obra de hoje, selecione os ajudantes presentes e relate ocorrências.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenNewRDO}
                      id="btn-field-new-rdo"
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-xs flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Obra de Hoje</span>
                    </button>
                  </div>

                  {/* Quick Action Cards for Field Leader */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div
                      onClick={() => setActiveTab('my-schedule')}
                      className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-xl border border-blue-700/50 shadow-xs hover:border-blue-400 transition-all cursor-pointer flex items-center space-x-4 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                        <CalendarRange className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block">
                          Itinerário & Destinos
                        </span>
                        <h3 className="text-sm font-bold text-white">Minha Programação</h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Obras, cidades e próximo destino.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={handleOpenNewRDO}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 transition-colors cursor-pointer flex items-center space-x-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Novo Registro de Obra</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Preencher dados de hoje e ajudantes.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveTab('my-logs')}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 transition-colors cursor-pointer flex items-center space-x-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Meus Registros de Obras</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Consulte os registros salvos ({(myTeamLogs || []).length} registros).
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveTab('teams')}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 transition-colors cursor-pointer flex items-center space-x-4"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Minha Equipe & Ajudantes</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Visualizar integrantes e ajudantes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Logs of this leader's team */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center">
                        <HardHat className="w-4 h-4 text-blue-600 mr-2" />
                        Últimos Registros da Sua Equipe
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {(myTeamLogs || []).length} registros no sistema
                      </span>
                    </div>

                    {(myTeamLogs || []).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        Nenhum registro anterior encontrado. Clique no botão acima para registrar a obra de hoje.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {(myTeamLogs || []).slice(0, 5).map((log) => (
                          <div
                            key={log.id}
                            onClick={() => setSelectedLogDetail(log)}
                            className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                                  {log.date ? log.date.split('-').reverse().join('/') : ''}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{log.worksiteName}</span>
                                {log.hasOccurrence && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase">
                                    OCORRÊNCIA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {log.city} • {(log.services || []).join(', ')}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Ajudantes: {(log.helpersPresent || []).map((h) => h.name).join(', ') || 'Apenas o chefe'}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportSingleRDOtoPDF(log);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
                                title="Baixar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: FOTOS DOS SERVIÇOS (GALERIA GERAL DE FOTOS) */}
          {activeTab === 'service-photos' && (
            <ServicePhotosGallery onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {/* TAB: APPOINTMENTS / PLANEJAMENTO */}
          {activeTab === 'appointments' && (
            <AppointmentsManagement
              onOpenNewRDOWithAppointment={handleOpenNewRDOWithAppointment}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB: MY SCHEDULE (FIELD TEAM VIEW) */}
          {activeTab === 'my-schedule' && (
            <MyScheduleView
              onOpenNewRDOWithAppointment={handleOpenNewRDOWithAppointment}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB: DAILY OVERVIEW */}
          {activeTab === 'daily-overview' && (
            <DailyOverview
              onViewLogDetail={(log) => setSelectedLogDetail(log)}
              onEditLog={handleEditRDO}
            />
          )}

          {/* TAB: WORKSITES */}
          {activeTab === 'worksites' && <WorksitesManagement />}

          {/* TAB: TEAMS */}
          {activeTab === 'teams' && <TeamsManagement />}

          {/* TAB: OCCURRENCES */}
          {activeTab === 'occurrences' && <OccurrencesAlertCenter compact={false} />}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <HistoryAndFilter onSelectLogDetail={(log) => setSelectedLogDetail(log)} />
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && <ReportsView />}

          {/* TAB: AUDIT */}
          {activeTab === 'audit' && <AuditLogView />}

          {/* TAB: USUARIOS E PERMISSOES (ADMIN & GESTOR) */}
          {activeTab === 'users-permissions' && <UsersAndPermissionsManagement />}

          {/* TAB: CENTRAL GMAIL */}
          {activeTab === 'gmail' && (
            <GmailCenterView onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {/* TAB: ROTAS DAS EQUIPES / TRAJETO REAL GPS */}
          {(activeTab === 'team-routes' || activeTab === 'routes') && (
            <TeamRouteHistory />
          )}

          {/* TAB: NEW / EDIT RDO FORM */}
          {activeTab === 'new-rdo' && (
            <DailyActivityForm
              initialLog={editingLog}
              onSuccess={handleRDOSuccess}
              onCancel={() => {
                setEditingLog(null);
                setActiveTab('dashboard');
              }}
            />
          )}

          {/* TAB: MY LOGS (FIELD CHIEF HISTORY) */}
          {activeTab === 'my-logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Histórico de Obras da Minha Equipe</h2>
                <button
                  onClick={handleOpenNewRDO}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Obra</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 divide-y divide-slate-100">
                {(myTeamLogs || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nenhum registro de obra preenchido ainda.</p>
                ) : (
                  (myTeamLogs || []).map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLogDetail(log)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">
                            {log.date ? log.date.split('-').reverse().join('/') : ''}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-blue-700">{log.worksiteName}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {log.city} • {(log.services || []).join(', ')}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ajudantes presentes: {(log.helpersPresent || []).map((h) => h.name).join(', ') || 'Nenhum'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSingleRDOtoPDF(log);
                          }}
                          className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold flex items-center space-x-1 hover:bg-slate-800 transition-colors"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* RDO DETAIL MODAL (GLOBAL) */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                  Registro de Obra
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedLogDetail.teamName} — {selectedLogDetail.date ? selectedLogDetail.date.split('-').reverse().join('/') : ''}
                </h2>
                <p className="text-xs text-slate-500">
                  Chefe de Equipe: <strong>{selectedLogDetail.leaderName}</strong> ({selectedLogDetail.leaderPhone})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openSendModalWithRdo(selectedLogDetail)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold flex items-center space-x-1 transition-colors"
                  title="Transmitir este relatório por Gmail"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Transmitir via Gmail</span>
                </button>
                <button
                  onClick={() => exportSingleRDOtoPDF(selectedLogDetail)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center space-x-1 transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  onClick={() => setSelectedLogDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-base font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Obra & Local</p>
                <p className="font-bold text-slate-900">{selectedLogDetail.worksiteName}</p>
                <p className="text-slate-600">{selectedLogDetail.city}/{selectedLogDetail.state || 'PR'}</p>
                {selectedLogDetail.worksiteLocationDetail && (
                  <p className="text-slate-500 mt-0.5">Trecho: {selectedLogDetail.worksiteLocationDetail}</p>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Status e Clima</p>
                <p className="font-bold text-slate-900">{selectedLogDetail.status}</p>
                <p className="text-slate-600">Clima: {selectedLogDetail.weather || 'Ensolarado'}</p>
                <p className="text-slate-500 mt-0.5">
                  Horário: {selectedLogDetail.workHours?.start || '07:30'} às {selectedLogDetail.workHours?.end || '17:00'}
                </p>
              </div>
            </div>

            {/* Ajudantes presentes salvos */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ajudantes Presentes neste dia ({(selectedLogDetail.helpersPresent || []).length}):
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(selectedLogDetail.helpersPresent || []).map((h) => (
                  <div key={h.id} className="p-2 bg-slate-100 rounded-lg text-xs flex justify-between">
                    <span className="font-bold text-slate-800">{h.name}</span>
                    <span className="text-[10px] text-slate-500">{h.role || 'Ajudante'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Serviços Realizados:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedLogDetail.services || []).map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-md text-xs">
                    {s}
                  </span>
                ))}
              </div>
              {selectedLogDetail.serviceDescription && (
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                  {selectedLogDetail.serviceDescription}
                </p>
              )}
            </div>

            {/* Occurrences if any */}
            {selectedLogDetail.hasOccurrence && selectedLogDetail.occurrence && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Ocorrência: {selectedLogDetail.occurrence.category} ({selectedLogDetail.occurrence.urgency})</span>
                </div>
                <p className="text-red-900">{selectedLogDetail.occurrence.description}</p>
                {selectedLogDetail.occurrence.adminObservation && (
                  <p className="text-slate-800 font-semibold pt-1 border-t border-red-200">
                    Tratativa Administrativa: {selectedLogDetail.occurrence.adminObservation}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            {(selectedLogDetail.photos || []).length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fotos da Obra ({(selectedLogDetail.photos || []).length}):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(selectedLogDetail.photos || []).map((p) => (
                    <div key={p.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                      <img src={p.url} alt="Foto da obra" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => openSendModalWithRdo(selectedLogDetail)}
                className="px-4 py-2 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md transition-colors flex items-center space-x-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Enviar para Diretoria por Gmail</span>
              </button>

              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Gmail Dispatcher Modal */}
      <SendEmailModal />

      {/* Global GPS Permission Modal for Field Leaders */}
      <GpsPermissionModal />

      {/* Global GPS Mobile Background Architecture Details Modal */}
      <GpsMobileArchitectureModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <GmailProvider>
          <GpsTrackingProvider>
            <MainAppContent />
          </GpsTrackingProvider>
        </GmailProvider>
      </DataProvider>
    </AuthProvider>
  );
}
