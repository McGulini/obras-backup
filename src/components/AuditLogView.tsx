import React, { useState } from 'react';
import { Shield, Clock, User, FileText, Search, Filter, History } from 'lucide-react';
import { useData } from '../context/DataContext';

export const AuditLogView: React.FC = () => {
  const { auditLogs = [] } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredAuditLogs = (auditLogs || []).filter((log) => {
    if (!log) return false;
    if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        (log.userName || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.entityId || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
            CRIAÇÃO
          </span>
        );
      case 'UPDATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
            ALTERAÇÃO
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
            EXCLUSÃO
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="audit-log-screen">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500 text-slate-950">
              Segurança & Rastreabilidade
            </span>
            <span className="text-xs text-slate-400">Trilha de Auditoria</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Log de Auditoria e Controle de Alterações
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro imutável de todas as inserções, edições de registros de obras, cadastros de equipes e tratativas de ocorrências.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">
            {auditLogs.length} Registros de Trilha
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuário, detalhes ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600">Entidade:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
          >
            <option value="ALL">Todas as Entidades</option>
            <option value="DAILY_LOG">Registros Diários de Obra</option>
            <option value="TEAM">Equipes</option>
            <option value="WORKSITE">Obras</option>
            <option value="HELPER">Ajudantes</option>
            <option value="OCCURRENCE">Ocorrências</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5">Usuário Responsável</th>
                <th className="p-3.5">Tipo de Ação</th>
                <th className="p-3.5">Entidade</th>
                <th className="p-3.5">O que foi Alterado (Detalhes)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {logDate.toLocaleDateString('pt-BR')} {logDate.toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold text-slate-800">{log.userName}</span>
                        </div>
                      </td>

                      <td className="p-3.5">{getActionBadge(log.action)}</td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {log.entityType}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <span className="font-medium">{log.details}</span>
                        {log.newData && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md font-mono">
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
