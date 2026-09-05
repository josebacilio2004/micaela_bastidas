'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Wallet, CheckCircle2, AlertCircle, RefreshCw, X, Unlock } from 'lucide-react';

export default function CajaPage() {
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [allRegisters, setAllRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Close Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closingObservations, setClosingObservations] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  // Reopen Modal State
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const fetchCajaData = async () => {
    setLoading(true);
    try {
      const [current, all] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/cash-registers'),
      ]);
      setCurrentRegister(current);
      setAllRegisters(all);

      if (current) {
        const sum = await apiRequest(`/cash-registers/${current.id}/summary`);
        setSummary(sum);
      } else {
        setSummary(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCajaData();
  }, []);

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister) return;
    try {
      await apiRequest(`/cash-registers/${currentRegister.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          countedCash: Number(countedCash),
          closingObservations,
          discrepancyReason,
        }),
      });
      setIsCloseModalOpen(false);
      setCountedCash('');
      setClosingObservations('');
      setDiscrepancyReason('');
      fetchCajaData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenId) return;
    try {
      await apiRequest(`/cash-registers/${reopenId}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason: reopenReason }),
      });
      setReopenId(null);
      setReopenReason('');
      fetchCajaData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const difference = summary && countedCash !== '' ? Number(countedCash) - summary.expectedCash : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Caja y Arqueos Diarios</h1>
          <p className="text-xs text-slate-500">Control estricto de aperturas, recaudación esperada vs efectivo contado, y cierres autorizados.</p>
        </div>
      </div>

      {currentRegister ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 mb-4 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Caja en Operación</span>
              </div>
              <h2 className="text-xl font-black text-slate-800 mt-1">{currentRegister.name}</h2>
              <p className="text-xs text-slate-500">
                Apertura por: <span className="font-semibold text-slate-700">{currentRegister.openedBy.fullName}</span> • {new Date(currentRegister.openedAt).toLocaleTimeString('es-PE')}
              </p>
            </div>
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
            >
              Realizar Cierre de Caja
            </button>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Monto Inicial Apertura</span>
                <p className="text-lg font-black text-slate-800 mt-1">S/ {summary.openingAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Recaudación Cobranzas</span>
                <p className="text-lg font-black text-emerald-700 mt-1">S/ {(summary.alcabalaSum + summary.waterSum).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Recaudación SSHH</span>
                <p className="text-lg font-black text-emerald-700 mt-1">S/ {summary.sanitarySum.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 font-bold uppercase text-[10px]">Efectivo Total Esperado</span>
                <p className="text-lg font-black text-emerald-900 mt-1">S/ {summary.expectedCash.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-amber-900">
          <h3 className="font-bold text-sm">No existe una caja abierta en este momento.</h3>
          <p className="text-xs mt-1">La tesorera o administrador debe abrir una caja para recibir pagos y registrar turnos.</p>
        </div>
      )}

      {/* Historial de Cierres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Historial de Cajas y Cierres</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Caja</th>
              <th className="py-3 px-4">Apertura</th>
              <th className="py-3 px-4">Cierre</th>
              <th className="py-3 px-4">Efectivo Esperado</th>
              <th className="py-3 px-4">Efectivo Contado</th>
              <th className="py-3 px-4">Diferencia</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allRegisters.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-slate-800">{reg.name}</td>
                <td className="py-3 px-4 font-mono">{new Date(reg.openedAt).toLocaleDateString('es-PE')}</td>
                <td className="py-3 px-4 font-mono">{reg.closedAt ? new Date(reg.closedAt).toLocaleTimeString('es-PE') : '-'}</td>
                <td className="py-3 px-4 font-black">S/ {Number(reg.expectedCash || 0).toFixed(2)}</td>
                <td className="py-3 px-4 font-black">S/ {Number(reg.countedCash || 0).toFixed(2)}</td>
                <td className="py-3 px-4">
                  {reg.difference !== null && reg.difference !== undefined ? (
                    <span className={`font-bold ${Number(reg.difference) === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      S/ {Number(reg.difference).toFixed(2)}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    reg.status === 'ABIERTO' ? 'bg-emerald-100 text-emerald-800' : reg.status === 'CERRADO' ? 'bg-slate-100 text-slate-700' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {reg.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {reg.status === 'CERRADO' && (
                    <button
                      onClick={() => setReopenId(reg.id)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded transition"
                      title="Reabrir caja con motivo justificado"
                    >
                      Reabrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Cierre */}
      {isCloseModalOpen && summary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsCloseModalOpen(false)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-black text-slate-800 mb-4 uppercase">Arqueo y Cierre de Caja</h2>
            <form onSubmit={handleCloseRegister} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <span className="font-bold text-slate-600">Efectivo Esperado según Sistema:</span>
                <span className="font-black text-base text-emerald-800">S/ {summary.expectedCash.toFixed(2)}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Efectivo Físico Contado (S/)</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-base font-black text-slate-800 font-mono"
                />
              </div>

              {countedCash !== '' && Math.abs(difference) > 0.01 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <p className="font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    Diferencia detectada: S/ {difference.toFixed(2)}
                  </p>
                  <label className="font-bold block mt-2 mb-1">Motivo / Explicación del Descuadre (Obligatorio):</label>
                  <textarea
                    required
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    placeholder="Detalle el motivo por el cual existe diferencia..."
                    className="w-full border border-red-300 rounded p-2 text-xs"
                    rows={2}
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones Generales</label>
                <textarea
                  value={closingObservations}
                  onChange={(e) => setClosingObservations(e.target.value)}
                  placeholder="Comentarios adicionales sobre el turno o caja..."
                  className="w-full border border-slate-200 rounded p-2"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsCloseModalOpen(false)} className="px-4 py-2 border rounded-lg font-bold text-slate-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold">Confirmar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reabrir */}
      {reopenId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setReopenId(null)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-black text-slate-800 mb-2 uppercase">Reapertura de Caja Cerrada</h2>
            <p className="text-xs text-slate-500 mb-4">Esta acción solo está autorizada para Administradores y será registrada en la bitácora de auditoría.</p>
            <form onSubmit={handleReopen} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Justificación Detallada de Reapertura</label>
                <textarea
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Ingrese el motivo formal de la reapertura..."
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setReopenId(null)} className="px-4 py-2 border rounded font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold">Reabrir Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
