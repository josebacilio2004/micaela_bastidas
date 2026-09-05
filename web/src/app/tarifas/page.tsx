'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Sliders, CheckCircle2 } from 'lucide-react';

export default function TarifasPage() {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcepts = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/payment-concepts');
        setConcepts(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchConcepts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Catálogo de Conceptos y Tarifas</h1>
        <p className="text-xs text-slate-500">Tarifas iniciales configurables según periodicidad y tipo de comerciante con vigencia temporal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {concepts.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-slate-800 text-sm">{c.name}</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {c.periodicity}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{c.description}</p>

            <div className="space-y-2 border-t pt-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Tarifas Vigentes:</p>
              {c.rates.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay tarifas configuradas.</p>
              ) : (
                c.rates.map((r: any) => (
                  <div key={r.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                    <span className="font-bold text-slate-700">{r.merchantType?.name || 'Público General / Usuario'}</span>
                    <span className="font-black text-emerald-800 text-sm">S/ {Number(r.amount).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
