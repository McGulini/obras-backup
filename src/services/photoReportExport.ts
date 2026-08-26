import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServicePhotoItem, User } from '../types';

export interface PhotoReportOptions {
  title?: string;
  generatedBy?: User | null;
  filtersDescription?: string;
  selectedDate?: string;
  selectedTeam?: string;
  selectedWorksite?: string;
}

export function generatePhotoReportPdf(
  photos: ServicePhotoItem[],
  options: PhotoReportOptions = {}
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTORCAMPO • OBRAS TOTAL', margin, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO FOTOGRÁFICO DE EXECUÇÃO DE SERVIÇOS', margin, 20);

  // Emission date & user
  const emitDate = new Date().toLocaleDateString('pt-BR');
  const emitTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const emitUser = options.generatedBy?.name || 'Administrador / Gestor';

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${emitDate} às ${emitTime}`, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Emitido por: ${emitUser}`, pageWidth - margin, 20, { align: 'right' });

  let currentY = 36;

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('RESUMO DO RELATÓRIO', margin + 4, currentY + 6);

  const uniqueTeams = Array.from(new Set(photos.map((p) => p.teamName))).length;
  const uniqueWorksites = Array.from(new Set(photos.map((p) => p.worksiteName))).length;
  const uniqueDates = Array.from(new Set(photos.map((p) => p.date))).length;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total de Registros Fotográficos: ${photos.length} fotos  |  Datas: ${uniqueDates}  |  Equipes: ${uniqueTeams}  |  Obras: ${uniqueWorksites}`,
    margin + 4,
    currentY + 12
  );

  if (options.filtersDescription) {
    doc.text(`Filtros aplicados: ${options.filtersDescription}`, margin + 4, currentY + 18);
  }

  currentY += 28;

  // Table of Photo Items
  const tableData = photos.map((p, idx) => [
    `${idx + 1}`,
    p.date ? p.date.split('-').reverse().join('/') : '-',
    p.timeFormatted || '-',
    p.teamName || '-',
    p.leaderName || '-',
    `${p.worksiteName || '-'} (${p.city || '-'})`,
    p.service || '-',
    p.latitude && p.longitude ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : 'Não registrado',
    p.caption || 'Sem legenda',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Data', 'Hora', 'Equipe', 'Chefe', 'Obra / Cidade', 'Serviço', 'GPS', 'Legenda']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16 },
      2: { cellWidth: 12 },
      3: { cellWidth: 26 },
      4: { cellWidth: 18 },
      5: { cellWidth: 32 },
      6: { cellWidth: 28 },
      7: { cellWidth: 22 },
      8: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer page number
      const pageCount = (doc.internal as any).getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} — Relatório de Fotos de Serviços — Confidencial`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  const fileName = `Relatorio_Fotos_Servicos_${emitDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
