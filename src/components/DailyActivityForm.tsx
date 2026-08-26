import React, { useState, useEffect, useRef } from 'react';
import {
  HardHat,
  Calendar,
  MapPin,
  Building,
  Users,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Camera,
  AlertTriangle,
  Clock,
  Sun,
  CloudRain,
  Cloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  HelpCircle,
  X,
  Mail,
} from 'lucide-react';
import {
  DailyLog,
  STANDARD_SERVICES,
  OCCURRENCE_CATEGORIES,
  DailyLogStatus,
  WeatherType,
  PresentHelper,
  DailyLogPhoto,
  OccurrenceUrgency,
  OccurrenceStatus,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useGmail } from '../context/GmailContext';

interface DailyActivityFormProps {
  initialLog?: DailyLog | null;
  onSuccess?: (log: DailyLog) => void;
  onCancel?: () => void;
}

export const DailyActivityForm: React.FC<DailyActivityFormProps> = ({
  initialLog,
  onSuccess,
  onCancel,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { teams = [], helpers = [], worksites = [], addDailyLog, updateDailyLog, isOnline } = useData();
  const { openSendModalWithRdo } = useGmail();
  const [transmitViaEmailAfterSave, setTransmitViaEmailAfterSave] = useState(false);

  // Current user's team or first available team
  const defaultTeam = (teams || []).find((t) => t.id === currentUser?.teamId) || teams[0] || null;

  // Form State
  const [date, setDate] = useState<string>(
    initialLog?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialLog?.teamId || defaultTeam?.id || ''
  );
  const [leaderName, setLeaderName] = useState<string>(
    initialLog?.leaderName || (currentUser?.role === 'CHEFE_EQUIPE' ? currentUser.name : defaultTeam?.leaderName || '')
  );
  const [leaderPhone, setLeaderPhone] = useState<string>(
    initialLog?.leaderPhone || defaultTeam?.leaderPhone || currentUser?.phone || '(41) 99988-1122'
  );

  // Present Helpers list (strictly preserved for this log instance)
  const [presentHelpers, setPresentHelpers] = useState<PresentHelper[]>(() => {
    if (initialLog?.helpersPresent) return initialLog.helpersPresent;
    if (defaultTeam && defaultTeam.defaultHelperIds) {
      return (helpers || [])
        .filter((h) => defaultTeam.defaultHelperIds?.includes(h.id))
        .map((h) => ({ id: h.id, name: h.name, role: h.role }));
    }
    return [];
  });

  // Modal / inline input for adding temporary helper
  const [newHelperName, setNewHelperName] = useState('');
  const [newHelperRole, setNewHelperRole] = useState('Ajudante Geral');
  const [showAddHelperModal, setShowAddHelperModal] = useState(false);

  // Location & Worksite
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>(
    initialLog?.worksiteId || (worksites[0]?.id ?? '')
  );
  const [customWorksiteName, setCustomWorksiteName] = useState<string>(
    initialLog?.worksiteName || ''
  );
  const [city, setCity] = useState<string>(
    initialLog?.city || worksites[0]?.city || 'Curitiba'
  );
  const [state, setState] = useState<string>(
    initialLog?.state || worksites[0]?.state || 'PR'
  );
  const [worksiteLocationDetail, setWorksiteLocationDetail] = useState<string>(
    initialLog?.worksiteLocationDetail || ''
  );

  // Services Multiselect
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialLog?.services || ['Instalação de placas']
  );
  const [otherServiceDescription, setOtherServiceDescription] = useState<string>(
    initialLog?.otherServiceDescription || ''
  );
  const [serviceDescription, setServiceDescription] = useState<string>(
    initialLog?.serviceDescription || ''
  );

  // Work Details & Weather
  const [activityStatus, setActivityStatus] = useState<DailyLogStatus>(
    initialLog?.status || 'CONCLUIDO_DIA'
  );
  const [weather, setWeather] = useState<WeatherType>(
    initialLog?.weather || 'ENSOLARADO'
  );
  const [workHours, setWorkHours] = useState({
    start: initialLog?.workHours?.start || '07:30',
    end: initialLog?.workHours?.end || '17:00',
    breakMinutes: initialLog?.workHours?.breakMinutes || 60,
  });
  const [observations, setObservations] = useState<string>(
    initialLog?.observations || ''
  );

  // Occurrence / Problem Alert
  const [hasOccurrence, setHasOccurrence] = useState<boolean>(
    initialLog?.hasOccurrence || false
  );
  const [occurrenceCategory, setOccurrenceCategory] = useState<string>(
    initialLog?.occurrence?.category || OCCURRENCE_CATEGORIES[0]
  );
  const [occurrenceDescription, setOccurrenceDescription] = useState<string>(
    initialLog?.occurrence?.description || ''
  );
  const [occurrenceUrgency, setOccurrenceUrgency] = useState<OccurrenceUrgency>(
    initialLog?.occurrence?.urgency || 'ALTA'
  );
  const [occurrenceStatus, setOccurrenceStatus] = useState<OccurrenceStatus>(
    initialLog?.occurrence?.status || 'PENDENTE'
  );

  // Photos
  const [photos, setPhotos] = useState<DailyLogPhoto[]>(
    initialLog?.photos || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Sync team change
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    const tm = teams.find((t) => t.id === teamId);
    if (tm) {
      setLeaderName(tm.leaderName);
      setLeaderPhone(tm.leaderPhone);
      if (!initialLog) {
        // Pre-fill with team's default helpers
        const defaults = helpers
          .filter((h) => (tm.defaultHelperIds || []).includes(h.id))
          .map((h) => ({ id: h.id, name: h.name, role: h.role }));
        setPresentHelpers(defaults);
      }
    }
  };

  // Sync worksite change
  const handleWorksiteSelect = (wsId: string) => {
    setSelectedWorksiteId(wsId);
    if (wsId === 'CUSTOM') {
      setCustomWorksiteName('');
    } else {
      const ws = worksites.find((w) => w.id === wsId);
      if (ws) {
        setCustomWorksiteName(ws.name);
        setCity(ws.city);
        setState(ws.state);
        if (ws.defaultServices && ws.defaultServices.length > 0 && selectedServices.length === 0) {
          setSelectedServices(ws.defaultServices);
        }
      }
    }
  };

  // Toggle helper presence for this day
  const toggleHelperPresence = (helper: { id: string; name: string; role?: string }) => {
    const isPresent = presentHelpers.some((h) => h.id === helper.id);
    if (isPresent) {
      setPresentHelpers((prev) => prev.filter((h) => h.id !== helper.id));
    } else {
      setPresentHelpers((prev) => [...prev, { id: helper.id, name: helper.name, role: helper.role }]);
    }
  };

  // Add temporary helper
  const handleAddTempHelper = () => {
    if (!newHelperName.trim()) return;
    const tempHelper: PresentHelper = {
      id: `temp-help-${Date.now()}`,
      name: newHelperName.trim(),
      role: newHelperRole.trim() || 'Ajudante Geral',
    };
    setPresentHelpers((prev) => [...prev, tempHelper]);
    setNewHelperName('');
    setNewHelperRole('Ajudante Geral');
    setShowAddHelperModal(false);
  };

  // Toggle service checkbox
  const toggleService = (svc: string) => {
    if (selectedServices.includes(svc)) {
      setSelectedServices((prev) => prev.filter((s) => s !== svc));
    } else {
      setSelectedServices((prev) => [...prev, svc]);
    }
  };

  // Photo upload handling (supports mobile camera / local files)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPhoto: DailyLogPhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: event.target.result as string,
            caption: `Foto registrada em ${new Date().toLocaleTimeString('pt-BR')}`,
            timestamp: new Date().toISOString(),
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Add demo sample photo
  const addSamplePhoto = (sampleUrl: string, sampleCaption: string) => {
    setPhotos((prev) => [
      ...prev,
      {
        id: `sample-${Date.now()}`,
        url: sampleUrl,
        caption: sampleCaption,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Submit Daily Log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedServices.length === 0) {
      alert('Por favor, selecione ao menos um tipo de serviço realizado.');
      return;
    }

    if (selectedServices.includes('Outros serviços') && !otherServiceDescription.trim()) {
      alert('Por favor, descreva o que foi realizado na opção "Outros serviços".');
      return;
    }

    const teamObj = teams.find((t) => t.id === selectedTeamId);
    const worksiteObj = worksites.find((w) => w.id === selectedWorksiteId);
    const finalWorksiteName =
      selectedWorksiteId === 'CUSTOM' || !worksiteObj
        ? customWorksiteName.trim() || 'Obra Avulsa / Local de Campo'
        : worksiteObj.name;

    setIsSubmitting(true);

    try {
      const logPayload: Partial<DailyLog> = {
        date,
        teamId: selectedTeamId || defaultTeam?.id || 'team-1',
        teamName: teamObj?.name || 'Equipe Geral',
        leaderId: currentUser.id,
        leaderName: leaderName || currentUser.name,
        leaderPhone: leaderPhone,
        helpersPresent: presentHelpers,
        city: city || 'Curitiba',
        state: state || 'PR',
        worksiteId: selectedWorksiteId !== 'CUSTOM' ? selectedWorksiteId : undefined,
        worksiteName: finalWorksiteName,
        worksiteLocationDetail,
        services: selectedServices,
        otherServiceDescription: selectedServices.includes('Outros serviços') ? otherServiceDescription : undefined,
        serviceDescription: serviceDescription || 'Serviços de sinalização e demarcação viária executados conforme programação.',
        observations,
        status: activityStatus,
        weather,
        hasOccurrence,
        workHours,
        photos,
        createdBy: currentUser.name,
      };

      if (hasOccurrence) {
        logPayload.occurrence = {
          id: initialLog?.occurrence?.id || `occ-${Date.now()}`,
          dailyLogId: initialLog?.id || '',
          date,
          teamId: selectedTeamId,
          teamName: teamObj?.name || 'Equipe de Campo',
          leaderId: currentUser.id,
          leaderName: leaderName || currentUser.name,
          leaderPhone: leaderPhone,
          city,
          worksiteId: selectedWorksiteId !== 'CUSTOM' ? selectedWorksiteId : undefined,
          worksiteName: finalWorksiteName,
          category: occurrenceCategory,
          description: occurrenceDescription || 'Ocorrência registrada no fechamento do dia.',
          urgency: occurrenceUrgency,
          status: occurrenceStatus,
          createdAt: initialLog?.occurrence?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      let result: DailyLog;
      if (initialLog?.id) {
        result = await updateDailyLog(initialLog.id, logPayload);
      } else {
        result = await addDailyLog(logPayload);
      }

      setFormSuccessMessage(
        isOnline
          ? '✓ Registro Diário de Obra (RDO) salvo com sucesso!'
          : '✓ RDO salvo no dispositivo (Modo Offline). Será sincronizado assim que a conexão retornar.'
      );

      setTimeout(() => {
        if (transmitViaEmailAfterSave) {
          openSendModalWithRdo(result);
        }
        if (onSuccess) onSuccess(result);
      }, 1000);
    } catch (err: any) {
      alert('Erro ao salvar RDO: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12" id="daily-activity-form-container">
      {/* Top Back Navigation */}
      {onCancel && (
        <div className="mb-2 sm:mb-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
            id="btn-rdo-top-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Voltar</span>
          </button>
        </div>
      )}

      {/* Header & Mode Notice */}
      <div className="bg-slate-900 text-white rounded-t-xl p-3.5 sm:p-6 shadow-xs border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black uppercase bg-blue-600 text-white">
                RDO Digital
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                {initialLog ? 'Editando Registro Diário' : 'Novo Registro Diário de Atividade'}
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-bold text-white mt-1">
              Registro de Atividades da Equipe em Campo
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Preencha os dados do dia. A composição de ajudantes presente hoje será salva de forma independente no histórico.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              📅 {date.split('-').reverse().join('/')}
            </span>
          </div>
        </div>
      </div>

      {formSuccessMessage && (
        <div className="bg-emerald-600 text-white p-3 sm:p-4 font-bold text-xs sm:text-sm text-center flex items-center justify-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{formSuccessMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-3.5 sm:p-6 space-y-6 sm:space-y-8">
        {/* SEÇÃO 1: DATA E EQUIPE */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Data e Identificação da Equipe
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data do Trabalho *</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            {/* Equipe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Equipe Responsável *</label>
              <select
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {!t.active ? '(Inativa)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Chefe de Equipe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chefe de Equipe *</label>
              <input
                type="text"
                required
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: AJUDANTES PRESENTES HOJE (COMPOSIÇÃO DINÂMICA) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ajudantes Presentes Hoje em Campo ({presentHelpers.length} Confirmados)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAddHelperModal(true)}
              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Ajudante / Reforço</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Marque abaixo exatamente quem está trabalhando na obra nesta data. Este registro fica salvo exclusivamente para o dia {date.split('-').reverse().join('/')}, mantendo o histórico inalterado para os dias anteriores e posteriores.
          </p>

          {/* Helpers Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {helpers.filter((h) => h.active !== false).map((helper) => {
              const isSelected = presentHelpers.some((h) => h.id === helper.id);
              return (
                <button
                  type="button"
                  key={helper.id}
                  onClick={() => toggleHelperPresence(helper)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white font-bold' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{helper.name}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{helper.role}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Custom/Temporary helpers added for today */}
            {presentHelpers
              .filter((h) => !helpers.some((reg) => reg.id === h.id))
              .map((temp) => (
                <div
                  key={temp.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-blue-50 border-blue-300 text-slate-900"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-950">{temp.name} (Reforço do dia)</p>
                      <p className="text-[10px] text-slate-600">{temp.role || 'Ajudante Geral'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPresentHelpers((prev) => prev.filter((p) => p.id !== temp.id))}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>

          {/* Quick Add Helper Inline Modal */}
          {showAddHelperModal && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-950">Adicionar Ajudante ou Diarista para o Dia de Hoje</h4>
                <button
                  type="button"
                  onClick={() => setShowAddHelperModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕ Fechar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nome completo do ajudante"
                  value={newHelperName}
                  onChange={(e) => setNewHelperName(e.target.value)}
                  className="text-xs px-3 py-2 border rounded-lg bg-white border-blue-300 text-slate-900"
                />
                <input
                  type="text"
                  placeholder="Função (ex: Pintor, Ajudante Geral, Banderinha)"
                  value={newHelperRole}
                  onChange={(e) => setNewHelperRole(e.target.value)}
                  className="text-xs px-3 py-2 border rounded-lg bg-white border-blue-300 text-slate-900"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTempHelper}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Inserir na Equipe de Hoje
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 3: LOCALIZAÇÃO, CIDADE E OBRA */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Localização e Obra do Dia
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Obra Cadastrada */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Obra / Projeto *</label>
              <select
                value={selectedWorksiteId}
                onChange={(e) => handleWorksiteSelect(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                {worksites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.city}/{w.state} ({w.client})
                  </option>
                ))}
                <option value="CUSTOM">+ Outra Obra / Local Avulso não listado</option>
              </select>
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cidade Atual *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Curitiba, Araucária, São Paulo..."
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          {/* Nome da obra se custom */}
          {selectedWorksiteId === 'CUSTOM' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome ou Identificação da Obra Avulsa *</label>
              <input
                type="text"
                required
                value={customWorksiteName}
                onChange={(e) => setCustomWorksiteName(e.target.value)}
                placeholder="Ex: Manutenção Emergencial BR-116 Km 72"
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-blue-400 rounded-lg text-slate-900"
              />
            </div>
          )}

          {/* Local específico / Trecho */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Local Específico / Trecho / Estaqueamento (Opcional)
            </label>
            <input
              type="text"
              value={worksiteLocationDetail}
              onChange={(e) => setWorksiteLocationDetail(e.target.value)}
              placeholder="Ex: Km 14+200 pista sentido Litoral, próximo ao trevo da Av. Brasil"
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        {/* SEÇÃO 4: TIPOS DE SERVIÇOS REALIZADOS (MULTI-SELECT) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tipos de Serviços Realizados no Dia (Múltipla Escolha) *
            </h2>
          </div>

          <p className="text-xs text-slate-500">
            Selecione uma ou mais atividades realizadas simultaneamente pela equipe nesta obra e data:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STANDARD_SERVICES.map((service) => {
              const isChecked = selectedServices.includes(service);
              return (
                <button
                  type="button"
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`flex items-center space-x-2.5 p-3 rounded-xl border text-left transition ${
                    isChecked
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold ${
                      isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked ? '✓' : ''}
                  </div>
                  <span className="text-xs font-semibold">{service}</span>
                </button>
              );
            })}
          </div>

          {/* Campo específico se 'Outros serviços' selecionado */}
          {selectedServices.includes('Outros serviços') && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2 animate-fade-in">
              <label className="block text-xs font-bold text-blue-950">
                Descreva detalhadamente qual outro serviço foi realizado: *
              </label>
              <input
                type="text"
                required
                value={otherServiceDescription}
                onChange={(e) => setOtherServiceDescription(e.target.value)}
                placeholder="Ex: Fresagem mecânica de asfalto, instalação de prismas de concreto, limpeza de pista..."
                className="w-full text-xs px-3 py-2.5 bg-white border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          )}

          {/* Detalhamento do Serviço */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detalhamento dos Serviços e Metragens / Quantidades Executadas *
            </label>
            <textarea
              required
              rows={3}
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Ex: Instalação de 14 placas R-19; Pintura de 2.200 metros lineares com termoplástico hot spray 2mm; Demarcação de 4 faixas de pedestres..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
        </div>

        {/* SEÇÃO 5: HORÁRIOS, CLIMA E STATUS DA ATIVIDADE */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              5
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Status da Atividade, Clima e Horários
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status da Atividade no Dia</label>
              <select
                value={activityStatus}
                onChange={(e) => setActivityStatus(e.target.value as DailyLogStatus)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="CONCLUIDO_DIA">✓ Concluído no Dia</option>
                <option value="EM_ANDAMENTO">⏳ Em Andamento (Continuará amanhã)</option>
                <option value="PARALISADO">⛔ Paralisado (Chuva / Intercorrência)</option>
              </select>
            </div>

            {/* Clima */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Condição Climática</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as WeatherType)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="ENSOLARADO">☀️ Ensolarado / Seco</option>
                <option value="NUBLADO">⛅ Nublado</option>
                <option value="CHUVA_LEVE">🌦️ Chuva Leve / Garoa</option>
                <option value="CHUVA_FORTE">🌧️ Chuva Forte (Impediu pintura)</option>
              </select>
            </div>

            {/* Horário */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Trabalho</label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={workHours.start}
                  onChange={(e) => setWorkHours({ ...workHours, start: e.target.value })}
                  className="w-1/2 text-xs px-2 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-center"
                />
                <span className="text-xs text-slate-400">às</span>
                <input
                  type="time"
                  value={workHours.end}
                  onChange={(e) => setWorkHours({ ...workHours, end: e.target.value })}
                  className="w-1/2 text-xs px-2 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-center"
                />
              </div>
            </div>
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Gerais do Dia (Opcional)
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informações adicionais sobre o trânsito, apoio de batedores, condições da pista..."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        {/* SEÇÃO 6: OCORRÊNCIAS E PROBLEMAS (ALERTA DE ATENÇÃO) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                6
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ocorrências, Problemas e Alertas do Dia
              </h2>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition">
              <input
                type="checkbox"
                checked={hasOccurrence}
                onChange={(e) => setHasOccurrence(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-xs font-bold text-red-800">
                🚨 Requer Atenção do Administrador
              </span>
            </label>
          </div>

          {hasOccurrence ? (
            <div className="p-4 bg-red-50/90 rounded-xl border-2 border-red-400 space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2 text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                <p className="text-xs font-bold">
                  Esta ocorrência gerará um destaque visual imediato no painel dos administradores.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-red-950 mb-1">
                    Tipo de Problema ou Ocorrência *
                  </label>
                  <select
                    value={occurrenceCategory}
                    onChange={(e) => setOccurrenceCategory(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-red-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                  >
                    {OCCURRENCE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-950 mb-1">
                    Nível de Urgência *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOccurrenceUrgency('ALTA')}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        occurrenceUrgency === 'ALTA'
                          ? 'bg-red-600 text-white border-red-600 shadow'
                          : 'bg-white text-red-700 border-red-200'
                      }`}
                    >
                      Alta
                    </button>
                    <button
                      type="button"
                      onClick={() => setOccurrenceUrgency('MEDIA')}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        occurrenceUrgency === 'MEDIA'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow font-extrabold'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Média
                    </button>
                    <button
                      type="button"
                      onClick={() => setOccurrenceUrgency('BAIXA')}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        occurrenceUrgency === 'BAIXA'
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Baixa
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-950 mb-1">
                  Descrição do Problema (Veículo quebrado, falta de placas, ferramentas defeituosas, etc.) *
                </label>
                <textarea
                  required={hasOccurrence}
                  rows={3}
                  value={occurrenceDescription}
                  onChange={(e) => setOccurrenceDescription(e.target.value)}
                  placeholder="Ex: Veículo apresentou problema mecânico no sistema de freios e precisa de guincho antes de amanhã; Máquina extrusora com bico entupido; Falta de 10 placas de Pare..."
                  className="w-full text-xs p-3 bg-white border border-red-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Nenhum problema grave que necessite de suporte emergencial relatado.</span>
              <button
                type="button"
                onClick={() => setHasOccurrence(true)}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                + Relatar Ocorrência
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO 7: FOTOS DA OBRA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                7
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Fotos dos Serviços Executados ({photos.length} Anexadas)
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Tirar Foto / Anexar</span>
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-100 aspect-video sm:aspect-square">
                <img src={photo.url} alt="Foto da obra" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90 p-2 flex flex-col justify-between">
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="self-end p-1 bg-red-600/90 text-white rounded hover:bg-red-700"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <p className="text-[10px] text-slate-200 line-clamp-1">{photo.caption || 'Foto da obra'}</p>
                </div>
              </div>
            ))}

            {photos.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="col-span-2 sm:col-span-4 p-6 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition"
              >
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">Clique para tirar foto ou selecionar da galeria</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Fotos comprovam a execução dos serviços e auxiliam a administração</p>
              </div>
            )}
          </div>

          {/* Quick sample photo inserter for instant demo testing */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
            <span>Inserir fotos de exemplo:</span>
            <button
              type="button"
              onClick={() =>
                addSamplePhoto(
                  'https://images.unsplash.com/photo-1541888946425-d0fbb18086f7?w=800&auto=format&fit=crop&q=80',
                  'Instalação de novas placas regulamentares'
                )
              }
              className="text-blue-600 hover:underline"
            >
              + Exemplo Placas
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() =>
                addSamplePhoto(
                  'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80',
                  'Demarcação e pintura de faixas viárias'
                )
              }
              className="text-blue-600 hover:underline"
            >
              + Exemplo Pintura
            </button>
          </div>
        </div>

        {/* SUBMIT ACTIONS BAR */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {isOnline ? 'Conexão ativa — sincronização em tempo real' : 'Modo offline — salvará no dispositivo'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              onClick={() => setTransmitViaEmailAfterSave(true)}
              disabled={isSubmitting}
              className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-colors flex items-center justify-center space-x-1.5"
              title="Salvar RDO e abrir transmissor de e-mail via Gmail"
            >
              <Mail className="w-4 h-4 text-white" />
              <span>Salvar & Transmitir por Gmail</span>
            </button>

            <button
              type="submit"
              onClick={() => setTransmitViaEmailAfterSave(false)}
              disabled={isSubmitting}
              id="submit-rdo-button"
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'Gravando...' : 'Salvar e Finalizar RDO'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
