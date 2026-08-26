import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyLog } from '../types';

export function exportSingleRDOtoPDF(log: DailyLog) {
  const doc = new jsPDF();

  // Primary Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DIÁRIO DE OBRA', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Registro #${log.id.slice(-8).toUpperCase()} | Data: ${formatDateBR(log.date)}`, 140, 15);

  let currentY = 32;

  // Company and general details
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DADOS GERAIS DA EQUIPE E LOCALIZAÇÃO', 14, currentY);
  currentY += 4;

  const generalData = [
    ['Equipe:', log.teamName, 'Chefe Responsável:', `${log.leaderName} (${log.leaderPhone})`],
    ['Cidade / UF:', `${log.city} / ${log.state || 'PR'}`, 'Data de Execução:', formatDateBR(log.date)],
    ['Obra / Projeto:', log.worksiteName, 'Local / Trecho:', log.worksiteLocationDetail || 'Não informado'],
    ['Condição Climática:', formatWeather(log.weather), 'Horário de Trabalho:', `${log.workHours?.start || '07:30'} às ${log.workHours?.end || '17:00'}`],
  ];

  autoTable(doc, {
    startY: currentY,
    body: generalData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [15, 23, 42] },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 38, textColor: [15, 23, 42] },
      3: { cellWidth: 52 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Helpers present on this specific day
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. EFETIVO DE CAMPO PRESENTE NO DIA (${log.helpersPresent.length} Ajudantes)`, 14, currentY);
  currentY += 4;

  const helpersData = log.helpersPresent.map((h, i) => [
    `${i + 1}`,
    h.name,
    h.role || 'Ajudante Geral',
    'Presente em campo',
  ]);

  if (helpersData.length === 0) {
    helpersData.push(['-', 'Apenas o Chefe de Equipe operou no dia', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Nome do Colaborador / Ajudante', 'Função / Especialidade', 'Status no Dia']],
    body: helpersData,
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Services Executed
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. SERVIÇOS EXECUTADOS', 14, currentY);
  currentY += 4;

  const servicesList = log.services.map((s) => `• ${s}`).join('   |   ');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(servicesList || 'Nenhum serviço selecionado', 14, currentY);
  currentY += 6;

  if (log.otherServiceDescription) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Outros serviços detalhados: ${log.otherServiceDescription}`, 14, currentY);
    currentY += 6;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detalhamento das Atividades:', 14, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const descLines = doc.splitTextToSize(log.serviceDescription || 'Sem detalhamento adicional.', 180);
  doc.text(descLines, 14, currentY);
  currentY += descLines.length * 4 + 6;

  if (log.observations) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observações Gerais:', 14, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(log.observations, 180);
    doc.text(obsLines, 14, currentY);
    currentY += obsLines.length * 4 + 6;
  }

  // 4. Occurrence / Alert block if present
  if (log.hasOccurrence && log.occurrence) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(239, 68, 68); // red-500
    doc.rect(14, currentY, 182, 38, 'FD');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`[ALERTA DE OCORRÊNCIA] - Status: ${log.occurrence.status}`, 18, currentY + 6);

    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    doc.text(`Categoria: ${log.occurrence.category}  |  Urgência: ${log.occurrence.urgency}`, 18, currentY + 12);

    doc.setTextColor(69, 10, 10);
    doc.setFont('helvetica', 'normal');
    const probLines = doc.splitTextToSize(`Descrição: ${log.occurrence.description}`, 174);
    doc.text(probLines, 18, currentY + 18);

    if (log.occurrence.adminObservation) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Tratativa Adm (${log.occurrence.assignedAdminName || 'Administração'}): ${log.occurrence.adminObservation}`, 18, currentY + 30);
    }

    currentY += 44;
  }

  // Signatures
  if (currentY > 240) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY += 10;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 15, 85, currentY + 15);
  doc.line(125, currentY + 15, 190, currentY + 15);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`Chefe de Equipe: ${log.leaderName}`, 52, currentY + 20, { align: 'center' });
  doc.text('Fiscalização / Coordenação de Obras', 157, currentY + 20, { align: 'center' });

  // Save
  doc.save(`Obra_${log.date}_${log.teamName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function exportConsolidatedReportToPDF(logs: DailyLog[], filterDescription: string = 'Relatório Geral') {
  const doc = new jsPDF('landscape');

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO CONSOLIDADO DE ATIVIDADES E EQUIPES DE CAMPO', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 220, 14);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(`Filtro aplicado: ${filterDescription}  |  Total de Registros: ${logs.length}`, 14, 29);

  const tableData = logs.map((log) => [
    formatDateBR(log.date),
    log.teamName,
    log.leaderName,
    log.city,
    log.worksiteName,
    log.helpersPresent.map((h) => h.name.split(' ')[0]).join(', ') || '-',
    log.services.join(', '),
    log.hasOccurrence ? `SIM (${log.occurrence?.status || 'PEND'})` : 'Não',
    log.status === 'CONCLUIDO_DIA' ? 'Concluído' : log.status === 'PARALISADO' ? 'Paralisado' : 'Em Andamento',
  ]);

  autoTable(doc, {
    startY: 33,
    head: [['Data', 'Equipe', 'Chefe', 'Cidade', 'Obra', 'Ajudantes', 'Serviços Realizados', 'Ocorrência?', 'Status']],
    body: tableData,
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 24 },
      4: { cellWidth: 38 },
      5: { cellWidth: 35 },
      6: { cellWidth: 50 },
      7: { cellWidth: 24 },
      8: { cellWidth: 22 },
    },
  });

  doc.save(`Relatorio_Consolidado_Equipes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function formatWeather(w?: string): string {
  switch (w) {
    case 'ENSOLARADO':
      return 'Ensolarado';
    case 'NUBLADO':
      return 'Nublado';
    case 'CHUVA_LEVE':
      return 'Chuva Leve';
    case 'CHUVA_FORTE':
      return 'Chuva Forte';
    default:
      return 'Bom / Estável';
  }
}
