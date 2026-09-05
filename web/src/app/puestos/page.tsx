'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Store, User, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PuestosPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStalls = async () => {
    setLoading(true);
    try {
      const [sectorsRes, stallsRes] = await Promise.all([
        apiRequest('/sectors'),
        apiRequest(`/stalls${selectedSector ? '?sectorId=' + selectedSector : ''}`),
      ]);
      setSectors(sectorsRes);
      setStalls(stallsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStalls();
  }, [selectedSector]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Puestos y Espacios</h1>
        <p className="text-xs text-slate-500">Distribución física por sectores y asignación de comerciantes titulares.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSector('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            selectedSector === '' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'
          }`}
        >
          Todos los Sectores
        </button>
        {sectors.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSector(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedSector === s.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'
            }`}
          >
            {s.name} ({s._count?.stalls || 0})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Cargando puestos...</div>
        ) : stalls.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No hay puestos registrados en este sector.</div>
        ) : (
          stalls.map((st) => (
            <div key={st.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-lg text-slate-800">{st.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    st.status === 'OCUPADO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {st.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-3">{st.sector.name}</p>
                {st.assignedMerchant ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Comerciante Asignado:</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {st.assignedMerchant.lastName}, {st.assignedMerchant.firstName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">DNI: {st.assignedMerchant.dni}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-700">
                    <p className="font-bold">Puesto Disponible</p>
                    <p className="text-[11px]">Listo para asignar comerciante titular.</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
