'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest, getExcelDownloadUrl, getCsvDownloadUrl } from '@/lib/api';
import { FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';

export default function ReportesPage() {
  const [daily, setDaily] = useState<any>(null);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [dailyRes, defRes] = await Promise.all([
          apiRequest('/reports/daily'),
          apiRequest('/reports/defaulters'),
        ]);
        setDaily(dailyRes);
        setDefaulters(defRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Reportes y Exportaciones</h1>
          <p className="text-xs text-slate-500">Rendiciones contables, análisis de morosidad y descargas en formatos oficiales.</p>
        </div>
        <div className="flex gap-2">
          <a
            href={getExcelDownloadUrl()}
            target="_blank"
            className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel (XLSX)</span>
          </a>
          <a
            href={getCsvDownloadUrl()}
            target="_blank"
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </a>
        </div>
      </div>

      {daily && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4">
            Resumen de Recaudación del Día ({daily.date})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Alcabala</span>
              <p className="text-base font-black text-slate-800 mt-1">S/ {daily.alcabalaSum.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Agua Potable</span>
              <p className="text-base font-black text-slate-800 mt-1">S/ {daily.waterSum.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Servicios Higiénicos</span>
              <p className="text-base font-black text-slate-800 mt-1">S/ {daily.sanitarySum.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 font-bold uppercase text-[10px]">Total Recaudado</span>
              <p className="text-base font-black text-emerald-900 mt-1">S/ {daily.totalCollected.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Morosos Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center">
            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
            Comerciantes con Pagos Pendientes (Morosidad)
          </h3>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
            {defaulters.length} comerciantes en mora
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Comerciante</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Puesto</th>
              <th className="py-3 px-4">Concepto Adeudado</th>
              <th className="py-3 px-4">Período</th>
              <th className="py-3 px-4">Monto Adeudado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {defaulters.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">No hay comerciantes morosos actualmente.</td></tr>
            ) : (
              defaulters.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{m.lastName}, {m.firstName}</td>
                  <td className="py-3 px-4 font-mono">{m.dni}</td>
                  <td className="py-3 px-4">{m.merchantType.name}</td>
                  <td className="py-3 px-4 font-bold">{m.stall?.code || 'Ambulatorio'}</td>
                  <td className="py-3 px-4">{m.obligations[0]?.concept?.name || 'Alcabala/Agua'}</td>
                  <td className="py-3 px-4 font-mono">{m.obligations[0]?.period}</td>
                  <td className="py-3 px-4 font-black text-amber-600">
                    S/ {m.obligations.reduce((acc: number, o: any) => acc + Number(o.amount), 0).toFixed(2)}
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
