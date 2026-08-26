import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FileDown,
  FileSpreadsheet,
  TrendingUp,
  HardHat,
  Building,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { exportConsolidatedReportToPDF } from '../services/pdfExport';
import { exportLogsToCSV } from '../services/csvExport';

const CHART_COLORS = ['#2563eb', '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#64748b'];

export const ReportsView: React.FC = () => {
  const { dailyLogs = [], teams = [], worksites = [], occurrences = [] } = useData();

  // Period filter
  const [period, setPeriod] = useState<'ALL' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CURRENT_MONTH'>('ALL');

  const filteredLogs = useMemo(() => {
    if (period === 'ALL') return dailyLogs || [];

    const now = new Date();
    if (period === 'LAST_7_DAYS') {
      const cut = new Date(now);
      cut.setDate(cut.getDate() - 7);
      const cutStr = cut.toISOString().split('T')[0];
      return (dailyLogs || []).filter((l) => l && l.date >= cutStr);
    }
    if (period === 'LAST_30_DAYS') {
      const cut = new Date(now);
      cut.setDate(cut.getDate() - 30);
      const cutStr = cut.toISOString().split('T')[0];
      return (dailyLogs || []).filter((l) => l && l.date >= cutStr);
    }
    if (period === 'CURRENT_MONTH') {
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return (dailyLogs || []).filter((l) => l && l.date && l.date.startsWith(currentYearMonth));
    }
    return dailyLogs || [];
  }, [dailyLogs, period]);

  // Aggregate by Services
  const servicesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      l.services.forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  // Aggregate by Team
  const teamProductionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      counts[l.teamName] = (counts[l.teamName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, rdos]) => ({ name: name.replace('Equipe ', ''), rdos }))
      .sort((a, b) => b.rdos - a.rdos);
  }, [filteredLogs]);

  // Aggregate by City
  const cityDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      counts[l.city] = (counts[l.city] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  // Aggregate Occurrences by Category
  const occurrencesByCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    occurrences.forEach((o) => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [occurrences]);

  return (
    <div className="space-y-6" id="reports-analytics-screen">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              Inteligência Operacional
            </span>
            <span className="text-xs text-slate-400">Relatórios & Métricas</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Relatórios e Desempenho Operacional
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Análises gerenciais de produtividade das equipes, volumetria de serviços executados e distribuição geográfica.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportConsolidatedReportToPDF(filteredLogs, `Relatório Consolidado (${period})`)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700 shadow-xs"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Exportar PDF Gerencial</span>
          </button>

          <button
            onClick={() => exportLogsToCSV(filteredLogs, `relatorio_gerencial_${period}.csv`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs gap-3">
        <span className="text-xs font-bold text-slate-700 flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1 text-blue-600" />
          Período de Análise:
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setPeriod('LAST_7_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'LAST_7_DAYS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Últimos 7 Dias
          </button>
          <button
            onClick={() => setPeriod('LAST_30_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'LAST_30_DAYS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Últimos 30 Dias
          </button>
          <button
            onClick={() => setPeriod('CURRENT_MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'CURRENT_MONTH' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => setPeriod('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todo o Histórico ({dailyLogs.length})
          </button>
        </div>
      </div>

      {/* 4 Summary Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Dias de Campo Registrados</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filteredLogs.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">RDOs consolidados no período</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Obras Atendidas</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {new Set(filteredLogs.map((l) => l.worksiteName)).size}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">diferentes contratos no período</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Cidades Alcançadas</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {new Set(filteredLogs.map((l) => l.city)).size}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">municípios atendidos</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Ocorrências Tratadas</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {occurrences.filter((o) => o.status === 'RESOLVIDO').length} / {occurrences.length}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {occurrences.length > 0
              ? `${Math.round(
                  (occurrences.filter((o) => o.status === 'RESOLVIDO').length / occurrences.length) * 100
                )}% taxa de resolução`
              : 'Sem ocorrências'}
          </p>
        </div>
      </div>

      {/* 2x2 Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Serviços Realizados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Serviços Mais Executados no Período
            </h3>
            <p className="text-xs text-slate-500">
              Frequência de registros por modalidade de serviço rodoviário/urbano.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Dias com este serviço" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: RDOs por Equipe */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Dias de Atuação por Equipe
            </h3>
            <p className="text-xs text-slate-500">
              Volume de registros diários de campo enviados por cada equipe.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamProductionData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rdos" fill="#0f172a" radius={[4, 4, 0, 0]} name="Registros (RDOs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Distribuição por Cidade */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Distribuição Geográfica por Cidade
            </h3>
            <p className="text-xs text-slate-500">
              Proporção de dias de trabalho alocados por município.
            </p>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cityDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {cityDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Ocorrências por Categoria */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tipologia das Ocorrências e Problemas
            </h3>
            <p className="text-xs text-slate-500">
              Incidência de problemas mecânicos, ferramentas, insumos e clima.
            </p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {occurrencesByCategoryData.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma ocorrência registrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occurrencesByCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {occurrencesByCategoryData.map((_, index) => (
                      <Cell key={`cell-occ-${index}`} fill={['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
