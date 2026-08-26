import { DailyLog } from '../types';

export function exportLogsToCSV(logs: DailyLog[], filename: string = 'relatorio_atividades_equipes.csv') {
  const headers = [
    'ID Registro',
    'Data',
    'Equipe',
    'Chefe de Equipe',
    'Telefone Chefe',
    'Cidade',
    'Estado',
    'Obra / Projeto',
    'Local / Trecho',
    'Qtd Ajudantes',
    'Lista de Ajudantes Presentes',
    'Serviços Realizados',
    'Detalhamento Outros Serviços',
    'Descrição do Serviço',
    'Observações do Dia',
    'Status Atividade',
    'Condição Climática',
    'Tem Ocorrência?',
    'Categoria Ocorrência',
    'Descrição Ocorrência',
    'Status Ocorrência',
    'Tratativa Administrador',
    'Horário Início',
    'Horário Fim',
    'Criado Por',
  ];

  const rows = logs.map((log) => {
    const helpersStr = log.helpersPresent.map((h) => `${h.name} (${h.role || 'Ajudante'})`).join('; ');
    const servicesStr = log.services.join('; ');

    return [
      escapeCSV(log.id),
      escapeCSV(log.date),
      escapeCSV(log.teamName),
      escapeCSV(log.leaderName),
      escapeCSV(log.leaderPhone),
      escapeCSV(log.city),
      escapeCSV(log.state || 'PR'),
      escapeCSV(log.worksiteName),
      escapeCSV(log.worksiteLocationDetail || ''),
      escapeCSV(log.helpersPresent.length.toString()),
      escapeCSV(helpersStr),
      escapeCSV(servicesStr),
      escapeCSV(log.otherServiceDescription || ''),
      escapeCSV(log.serviceDescription || ''),
      escapeCSV(log.observations || ''),
      escapeCSV(log.status),
      escapeCSV(log.weather || ''),
      escapeCSV(log.hasOccurrence ? 'SIM' : 'NÃO'),
      escapeCSV(log.occurrence?.category || ''),
      escapeCSV(log.occurrence?.description || ''),
      escapeCSV(log.occurrence?.status || ''),
      escapeCSV(log.occurrence?.adminObservation || ''),
      escapeCSV(log.workHours?.start || ''),
      escapeCSV(log.workHours?.end || ''),
      escapeCSV(log.createdBy || log.leaderName),
    ].join(',');
  });

  // UTF-8 BOM for Microsoft Excel compatibility with Portuguese characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(val: string): string {
  if (!val) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
