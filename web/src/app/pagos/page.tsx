'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Search, Receipt, Printer, X, CheckCircle2 } from 'lucide-react';

export default function PagosPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/payments?search=${encodeURIComponent(search)}`);
      setPayments(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cobranzas y Comprobantes</h1>
          <p className="text-xs text-slate-500">Historial transaccional de pagos de Alcabala y Agua con comprobante único.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por N° Operación (MB-...), DNI o Nombre de comerciante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">N° Operación</th>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Comerciante</th>
              <th className="py-3 px-4">Puesto</th>
              <th className="py-3 px-4">Concepto</th>
              <th className="py-3 px-4">Período</th>
              <th className="py-3 px-4">Monto (S/)</th>
              <th className="py-3 px-4">Recaudado Por</th>
              <th className="py-3 px-4 text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Cargando pagos...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">No se encontraron pagos registrados.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{p.operationNumber}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{new Date(p.paidAt).toLocaleString('es-PE')}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {p.merchant ? `${p.merchant.lastName}, ${p.merchant.firstName}` : 'Ambulatorio / Varios'}
                    {p.merchant && <p className="text-[10px] text-slate-400 font-normal">DNI: {p.merchant.dni}</p>}
                  </td>
                  <td className="py-3 px-4 font-bold">{p.merchant?.stall?.code || '-'}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{p.concept.name}</span></td>
                  <td className="py-3 px-4 font-mono">{p.period}</td>
                  <td className="py-3 px-4 font-black text-slate-800">S/ {Number(p.amount).toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-600">{p.collectedBy.fullName}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedPayment(p)}
                      className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition"
                      title="Ver Comprobante"
                    >
                      <Printer className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setSelectedPayment(null)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <div className="text-center border-b pb-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold">
                MB
              </div>
              <h3 className="font-black text-sm uppercase text-slate-800">Mercado de Abastos Micaela Bastidas</h3>
              <p className="text-[10px] text-slate-500">Comprobante Interno de Pago</p>
              <p className="font-mono font-bold text-xs text-emerald-700 mt-1">{selectedPayment.operationNumber}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Fecha y Hora:</span><span className="font-mono font-medium">{new Date(selectedPayment.paidAt).toLocaleString('es-PE')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Comerciante:</span><span className="font-bold">{selectedPayment.merchant?.lastName}, {selectedPayment.merchant?.firstName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">DNI:</span><span className="font-mono">{selectedPayment.merchant?.dni || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Puesto:</span><span className="font-bold">{selectedPayment.merchant?.stall?.code || 'Ambulatorio'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Concepto:</span><span className="font-bold">{selectedPayment.concept.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Período:</span><span className="font-mono">{selectedPayment.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Método de Pago:</span><span className="font-bold">{selectedPayment.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Recaudado Por:</span><span className="font-medium">{selectedPayment.collectedBy.fullName}</span></div>
              
              <div className="border-t border-dashed my-3 pt-3 flex justify-between items-center text-sm">
                <span className="font-black uppercase text-slate-800">Total Pagado:</span>
                <span className="font-black text-lg text-emerald-700">S/ {Number(selectedPayment.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
