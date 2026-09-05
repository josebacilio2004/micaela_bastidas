'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Search, Plus, X } from 'lucide-react';

export default function PadronPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    merchantTypeId: '',
    stallId: '',
    businessCategory: '',
  });

  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [merchantsRes, typesRes, stallsRes] = await Promise.all([
        apiRequest(`/merchants?search=${encodeURIComponent(search)}${typeFilter ? '&typeId=' + typeFilter : ''}`),
        apiRequest('/merchant-types'),
        apiRequest('/stalls?status=LIBRE'),
      ]);
      setMerchants(merchantsRes);
      setTypes(typesRes);
      setStalls(stallsRes);
      if (!formData.merchantTypeId && typesRes.length > 0) {
        setFormData((prev) => ({ ...prev, merchantTypeId: typesRes[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/merchants', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        dni: '',
        phone: '',
        merchantTypeId: types[0]?.id || '',
        stallId: '',
        businessCategory: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const full = await apiRequest(`/merchants/${id}`);
      setSelectedMerchant(full);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Padrón de Comerciantes</h1>
          <p className="text-xs text-slate-500">Registro oficial de socios titulares, ambulantes fijos y temporales.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Comerciante</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombres, Puesto o Código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs font-medium"
          >
            <option value="">Todos los Tipos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Comerciante</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Puesto</th>
              <th className="py-3 px-4">Rubro</th>
              <th className="py-3 px-4">Obligaciones</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Cargando padrón...</td></tr>
            ) : merchants.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">No se encontraron comerciantes.</td></tr>
            ) : (
              merchants.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{m.internalCode}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{m.lastName}, {m.firstName}</td>
                  <td className="py-3 px-4 font-mono">{m.dni}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{m.merchantType.name}</span></td>
                  <td className="py-3 px-4">{m.stall ? <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{m.stall.code}</span> : <span className="text-slate-400 italic">Ambulatorio</span>}</td>
                  <td className="py-3 px-4">{m.businessCategory || '-'}</td>
                  <td className="py-3 px-4">{m._count?.obligations > 0 ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">{m._count.obligations} pendiente(s)</span> : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Al día</span>}</td>
                  <td className="py-3 px-4 text-center"><button onClick={() => viewDetails(m.id)} className="text-xs bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-bold px-3 py-1 rounded transition">Estado de Cuenta</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-black text-slate-800 mb-4 uppercase">Nuevo Registro de Comerciante</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold text-slate-700 block mb-1">Nombres</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" /></div>
                <div><label className="font-bold text-slate-700 block mb-1">Apellidos</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold text-slate-700 block mb-1">DNI (8 dígitos)</label><input type="text" required maxLength={8} value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-mono" /></div>
                <div><label className="font-bold text-slate-700 block mb-1">Teléfono</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold text-slate-700 block mb-1">Tipo de Comerciante</label><select value={formData.merchantTypeId} onChange={(e) => setFormData({ ...formData, merchantTypeId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2">{types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                <div><label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label><select value={formData.stallId} onChange={(e) => setFormData({ ...formData, stallId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2"><option value="">Sin puesto (Ambulante)</option>{stalls.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.sector.name}</option>))}</select></div>
              </div>
              <div><label className="font-bold text-slate-700 block mb-1">Rubro</label><input type="text" placeholder="Ej: Carnes, Frutas, Abarrotes..." value={formData.businessCategory} onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" /></div>
              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg font-bold text-slate-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedMerchant(null)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{selectedMerchant.merchantType.name}</span>
              <h2 className="text-xl font-black text-slate-800 mt-1">{selectedMerchant.lastName}, {selectedMerchant.firstName}</h2>
              <p className="text-xs text-slate-500 font-mono">DNI: {selectedMerchant.dni} | Código: {selectedMerchant.internalCode} | Puesto: {selectedMerchant.stall?.code || 'Ambulatorio'}</p>
            </div>
            <h3 className="font-bold text-xs uppercase text-slate-700 mb-2">Obligaciones Registradas:</h3>
            <div className="space-y-2 mb-6">
              {selectedMerchant.obligations.length === 0 ? (<p className="text-xs text-slate-400 italic">Sin obligaciones pendientes.</p>) : (
                selectedMerchant.obligations.map((o: any) => (
                  <div key={o.id} className="p-3 border rounded-lg flex items-center justify-between text-xs bg-slate-50">
                    <div><p className="font-bold text-slate-800">{o.concept.name}</p><p className="text-[11px] text-slate-500">Período: {o.period}</p></div>
                    <div className="text-right"><p className="font-black text-slate-800">S/ {Number(o.amount).toFixed(2)}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{o.status}</span></div>
                  </div>
                ))
              )}
            </div>
            <h3 className="font-bold text-xs uppercase text-slate-700 mb-2">Últimos Pagos:</h3>
            <div className="space-y-2">
              {selectedMerchant.payments.length === 0 ? (<p className="text-xs text-slate-400 italic">No registra pagos anteriores.</p>) : (
                selectedMerchant.payments.map((p: any) => (
                  <div key={p.id} className="p-3 border border-emerald-100 rounded-lg flex items-center justify-between text-xs bg-emerald-50/40">
                    <div><p className="font-mono font-bold text-emerald-800">{p.operationNumber}</p><p className="text-[11px] text-slate-500">{p.concept.name} • {new Date(p.paidAt).toLocaleDateString('es-PE')}</p></div>
                    <div className="text-right"><p className="font-black text-emerald-700">S/ {Number(p.amount).toFixed(2)}</p><span className="text-[10px] text-slate-500">Por: {p.collectedBy.fullName}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
