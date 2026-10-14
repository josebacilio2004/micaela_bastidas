'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest, downloadFileWithAuth, getDatabaseBackupUrl } from '@/lib/api';
import { History, ShieldCheck, Database, Download } from 'lucide-react';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/audit');
        setLogs(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleDownloadBackup = async () => {
    try {
      setDownloading(true);
      const filename = `backup_micaela_bastidas_${new Date().toISOString().split('T')[0]}.json`;
      await downloadFileWithAuth(getDatabaseBackupUrl(), filename);
    } catch (err: any) {
      alert(err.message || 'Error al descargar copia de seguridad');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Bitácora de Auditoría</h1>
          <p className="text-xs text-slate-500">Trazabilidad inmutable de inicios de sesión, cobros, aperturas, cierres de caja y modificaciones.</p>
        </div>
        <div>
          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="flex items-center space-x-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <Database className="w-4 h-4" />
            <span>{downloading ? 'Descargando Copia...' : 'Descargar Backup Base de Datos'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Acción</th>
              <th className="py-3 px-4">Módulo</th>
              <th className="py-3 px-4">Entidad Afectada</th>
              <th className="py-3 px-4">Detalle / Valores Nuevos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Cargando bitácora...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay registros de auditoría.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-slate-500">{new Date(l.timestamp).toLocaleString('es-PE')}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{l.user?.fullName || 'Sistema'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-600">{l.module}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{l.entityName} ({l.entityId ? l.entityId.substring(0, 8) : '-'})</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                    {l.newValues ? JSON.stringify(l.newValues) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
