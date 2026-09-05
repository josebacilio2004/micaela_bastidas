'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Smartphone, RefreshCw, CheckCircle2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

export default function SincronizacionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSyncStatus = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/sync/status');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Monitoreo de Sincronización</h1>
          <p className="text-xs text-slate-500">Supervisión en tiempo real de terminales Android, lotes de datos y estado offline-first.</p>
        </div>
        <button
          onClick={fetchSyncStatus}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar Monitor</span>
        </button>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Terminales Móviles Vinculadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-slate-400">Consultando dispositivos...</div>
          ) : !data?.devices || data.devices.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">No hay dispositivos móviles registrados aún.</div>
          ) : (
            data.devices.map((d: any) => (
              <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{d.name}</h3>
                      <p className="text-[11px] font-mono text-slate-400">{d.deviceId}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {d.status}
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Usuario Asignado:</span>
                    <p className="font-semibold text-slate-700">{d.user?.fullName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Sistema y Versión:</span>
                    <p className="font-semibold text-slate-700">{d.os} • v{d.appVersion}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Último Enlace / Sincronización:</span>
                    <p className="font-mono text-emerald-700 font-bold">
                      {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString('es-PE') : 'Nunca sincronizado'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Lotes de Sincronización Procesados</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Dispositivo</th>
              <th className="py-3 px-4">Operaciones en Lote</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.recentBatches || data.recentBatches.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin lotes recientes registrados.</td></tr>
            ) : (
              data.recentBatches.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-slate-500">{new Date(b.startedAt).toLocaleString('es-PE')}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{b.device?.name || 'Móvil'}</td>
                  <td className="py-3 px-4 font-bold">{b.operationsCount} transacciones procesadas</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {b.status}
                    </span>
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
