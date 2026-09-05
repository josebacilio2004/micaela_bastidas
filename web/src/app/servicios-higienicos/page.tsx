'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Bath, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function ServiciosHigienicosPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSSHH = async () => {
    setLoading(true);
    try {
      const [histRes, activeRes] = await Promise.all([
        apiRequest('/sanitary-services/history'),
        apiRequest('/sanitary-services/active').catch(() => null),
      ]);
      setHistory(histRes || []);
      setActiveSession(activeRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSSHH();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Servicios Higiénicos</h1>
        <p className="text-xs text-slate-500">Control de turnos, conteo de miccionarios (S/ 0.50), retretes (S/ 1.00) y control de boletos/tickets.</p>
      </div>

      {activeSession && (
        <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Turno en Curso
            </span>
            <h2 className="text-xl font-black mt-2">Operador: {activeSession.operator.fullName}</h2>
            <p className="text-xs text-slate-300 font-mono">
              Inicio: {new Date(activeSession.startTime).toLocaleTimeString('es-PE')}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-800/80 px-4 py-2 rounded-xl text-center">
              <p className="text-[10px] uppercase text-emerald-200">Miccionarios (0.50)</p>
              <p className="text-xl font-black">{activeSession.urinalCount}</p>
            </div>
            <div className="bg-emerald-800/80 px-4 py-2 rounded-xl text-center">
              <p className="text-[10px] uppercase text-emerald-200">Retretes (1.00)</p>
              <p className="text-xl font-black">{activeSession.toiletCount}</p>
            </div>
            <div className="bg-white text-emerald-900 px-4 py-2 rounded-xl text-center font-black">
              <p className="text-[10px] uppercase text-slate-500">Recaudado</p>
              <p className="text-xl">S/ {Number(activeSession.totalCollected).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Historial de Turnos de SSHH</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Miccionarios (S/ 0.50)</th>
              <th className="py-3 px-4">Retretes (S/ 1.00)</th>
              <th className="py-3 px-4">Total Recaudado</th>
              <th className="py-3 px-4">Ticket Inicio - Fin</th>
              <th className="py-3 px-4">Discrepancia</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Cargando turnos...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin historial de turnos registrado.</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono">{new Date(h.startTime).toLocaleDateString('es-PE')}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{h.operator.fullName}</td>
                  <td className="py-3 px-4 font-medium">{h.urinalCount} usos (S/ {Number(h.urinalTotal).toFixed(2)})</td>
                  <td className="py-3 px-4 font-medium">{h.toiletCount} usos (S/ {Number(h.toiletTotal).toFixed(2)})</td>
                  <td className="py-3 px-4 font-black text-emerald-700">S/ {Number(h.totalCollected).toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono">{h.initialTicketNumber || '-'} al {h.finalTicketNumber || '-'}</td>
                  <td className="py-3 px-4">
                    {h.ticketDiscrepancy !== 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 flex items-center w-max">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {h.ticketDiscrepancy} tickets
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conforme
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      h.status === 'ABIERTO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {h.status}
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
