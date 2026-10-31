'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { Search, Receipt, Printer, X, CheckCircle2, AlertTriangle, Ban, FileText, Check, FileSpreadsheet, Filter, DollarSign, Wallet } from 'lucide-react';

export default function PagosPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [conceptFilter, setConceptFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Modal anulación
  const [voidPaymentItem, setVoidPaymentItem] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [res, conceptsRes] = await Promise.all([
        apiRequest(`/payments?take=1000&search=${encodeURIComponent(search)}`),
        apiRequest('/payment-concepts').catch(() => []),
      ]);
      setPayments(res.items || []);
      setTotal(res.total || 0);
      setConcepts(conceptsRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search]);

  // Helper para resolver los datos del pagador (Comerciante, Inquilino, Cochera, SSHH, etc.)
  const getPaymentClientInfo = (p: any) => {
    if (p.merchant) {
      return {
        name: `${p.merchant.lastName}, ${p.merchant.firstName}`,
        dni: p.merchant.dni || '-',
        stall: p.merchant.stall?.code || 'Puesto Asociado',
        type: 'Socio / Comerciante',
      };
    }
    if (p.notes) {
      if (p.notes.includes('Servicio de Cochera:')) {
        const namePart = p.notes.split('Servicio de Cochera:')[1]?.split('(')[0]?.trim();
        const vehiclePart = p.notes.split('(')[1]?.replace(')', '')?.trim();
        return {
          name: namePart || 'Cliente Cochera',
          dni: '-',
          stall: `Cochera (${vehiclePart || 'Vehículo'})`,
          type: 'Cochera / Parqueo',
        };
      }
      if (p.notes.includes('Alquiler Puesto')) {
        const stallMatch = p.notes.match(/Alquiler Puesto ([^\s]+)/);
        const nameMatch = p.notes.match(/\(([^)]+)\)/);
        return {
          name: nameMatch ? nameMatch[1].trim() : 'Inquilino de Puesto',
          dni: '-',
          stall: stallMatch ? `Puesto ${stallMatch[1]}` : 'Inquilino',
          type: 'Inquilino Puesto',
        };
      }
      if (p.notes.includes('Agua Potable Inquilinos:')) {
        const match = p.notes.match(/Agua Potable Inquilinos:\s*([^(]+)\(([^)]+)\)/);
        return {
          name: match ? match[1].trim() : 'Inquilino Agua',
          dni: '-',
          stall: match ? match[2].trim() : 'Inquilino',
          type: 'Agua Inquilino',
        };
      }
      if (p.notes.includes('Fondo Rotatorio')) {
        return {
          name: p.notes.split('|')[1]?.trim() || 'Beneficiario Crédito',
          dni: '-',
          stall: 'Fondo Rotatorio',
          type: 'Fondo Rotatorio',
        };
      }
    }
    return {
      name: p.notes?.split('|')[1]?.trim() || p.concept?.name || 'Público General / Varios',
      dni: '-',
      stall: p.concept?.code?.includes('SSHH') || p.concept?.code?.includes('RETRETE') || p.concept?.code?.includes('MICCIONARIO')
        ? 'SSHH'
        : p.concept?.code?.includes('TICKET')
        ? 'Ambulante Temporal'
        : p.concept?.code === 'COCHERA'
        ? 'Cochera'
        : '-',
      type: p.concept?.name || 'General',
    };
  };

  // Filtrado en memoria por concepto y método
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (conceptFilter !== 'ALL') {
        const cCode = p.concept?.code || '';
        if (conceptFilter === 'ALQUILER' && !cCode.includes('ALQUILER')) return false;
        if (conceptFilter === 'AGUA_INQ' && !cCode.includes('AGUA_INQUILINO')) return false;
        if (conceptFilter === 'COCHERA' && cCode !== 'COCHERA' && !p.notes?.includes('COCHERA')) return false;
        if (conceptFilter === 'ALCABALA' && cCode !== 'ALCABALA') return false;
        if (conceptFilter === 'AGUA' && (cCode !== 'AGUA' || cCode.includes('INQUILINO'))) return false;
        if (conceptFilter === 'TICKETS' && !cCode.includes('TICKET')) return false;
        if (conceptFilter === 'SSHH' && !cCode.includes('MICCIONARIO') && !cCode.includes('RETRETE') && !cCode.includes('SSHH')) return false;
        if (conceptFilter === 'FONDO_ROTATORIO' && !cCode.includes('FONDO_ROTATORIO') && !p.notes?.includes('Fondo Rotatorio')) return false;
        if (conceptFilter === 'MULTAS' && !cCode.includes('MULTA')) return false;
        if (conceptFilter === 'MANTENIMIENTO' && !cCode.includes('MANTENIMIENTO')) return false;
      }
      if (methodFilter !== 'ALL') {
        if (p.paymentMethod !== methodFilter) return false;
      }
      return true;
    });
  }, [payments, conceptFilter, methodFilter]);

  // Totales
  const stats = useMemo(() => {
    const valid = filteredPayments.filter((p) => !p.isVoided);
    const totalAmount = valid.reduce((acc, p) => acc + Number(p.amount), 0);
    const efectivoAmount = valid.filter((p) => p.paymentMethod === 'EFECTIVO').reduce((acc, p) => acc + Number(p.amount), 0);
    const digitalAmount = totalAmount - efectivoAmount;
    return {
      totalAmount,
      totalCount: valid.length,
      voidCount: filteredPayments.filter((p) => p.isVoided).length,
      efectivoAmount,
      digitalAmount,
    };
  }, [filteredPayments]);

  const handleExportCSV = () => {
    const headers = ['N° Operación', 'Fecha y Hora', 'Pagador / Comerciante', 'DNI', 'Puesto / Ubicación', 'Concepto', 'Período', 'Monto S/', 'Método', 'Recaudado Por', 'Estado'];
    const rows = filteredPayments.map((p) => {
      const info = getPaymentClientInfo(p);
      return [
        p.operationNumber,
        new Date(p.paidAt).toLocaleString('es-PE'),
        `"${info.name}"`,
        info.dni,
        `"${info.stall}"`,
        `"${p.concept?.name || ''}"`,
        `"${p.period || ''}"`,
        Number(p.amount).toFixed(2),
        p.paymentMethod,
        `"${p.collectedBy?.fullName || ''}"`,
        p.isVoided ? 'ANULADO' : 'PAGADO',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Historial_Pagos_Micaela_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleVoidPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidPaymentItem) return;
    if (!voidReason.trim()) {
      alert('Debe ingresar un motivo para anular este pago.');
      return;
    }

    setVoidLoading(true);
    try {
      await apiRequest(`/payments/${voidPaymentItem.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      alert(`✓ El pago ${voidPaymentItem.operationNumber} ha sido ANULADO exitosamente y la deuda restituida a PENDIENTE.`);
      setVoidPaymentItem(null);
      setVoidReason('');
      await fetchPayments();
    } catch (err: any) {
      alert('Error al anular pago: ' + (err.message || err));
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <span>Historial Consolidado de Pagos</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {filteredPayments.length} Registros
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Control de cobranzas de todos los rubros: Alquileres, Cuotas Socios, Ambulantes (Alcabala & Agua), Cochera, Tickets, SSHH, Fondo Rotatorio y Multas.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar a Excel / CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Total Recaudado</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {stats.totalAmount.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 font-bold">{stats.totalCount} operaciones válidas</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Cobrado en Efectivo</span>
          <p className="text-2xl font-black text-slate-800 font-mono mt-1">S/ {stats.efectivoAmount.toFixed(2)}</p>
          <span className="text-[10px] text-emerald-600 font-bold">Caja física</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Cobrado Digital (Yape/Plin)</span>
          <p className="text-2xl font-black text-indigo-700 font-mono mt-1">S/ {stats.digitalAmount.toFixed(2)}</p>
          <span className="text-[10px] text-indigo-600 font-bold">Billeteras electrónicas</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Pagos Anulados</span>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">{stats.voidCount}</p>
          <span className="text-[10px] text-rose-500 font-bold">Revertidos a deuda</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por N° Operación (REC/MB-...), DNI, Nombre o Puesto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={conceptFilter}
              onChange={(e) => setConceptFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Rubros y Conceptos</option>
              <option value="ALQUILER">Alquiler de Puesto (Inquilinos)</option>
              <option value="AGUA_INQ">Agua Potable Inquilinos</option>
              <option value="COCHERA">Cochera y Estacionamiento</option>
              <option value="ALCABALA">Alcabala (Ambulantes Fijos)</option>
              <option value="AGUA">Agua Potable (Ambulantes Fijos / Socios)</option>
              <option value="TICKETS">Tickets Ambulantes Temporales</option>
              <option value="SSHH">Servicios Higiénicos (SSHH)</option>
              <option value="FONDO_ROTATORIO">Fondo Rotatorio (Créditos)</option>
              <option value="MULTAS">Multas (Asambleas & Faenas)</option>
              <option value="MANTENIMIENTO">Cuotas Mantenimiento Socios</option>
            </select>
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Todos los Medios</option>
            <option value="EFECTIVO">💵 Efectivo</option>
            <option value="YAPE">📱 Yape / Digital</option>
            <option value="TRANSFERENCIA">🏦 Transferencia</option>
          </select>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">N° Operación</th>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Pagador / Cliente</th>
              <th className="py-3 px-4">Puesto / Rubro</th>
              <th className="py-3 px-4">Concepto</th>
              <th className="py-3 px-4">Período / Detalle</th>
              <th className="py-3 px-4 text-right">Monto (S/)</th>
              <th className="py-3 px-4 text-center">Medio</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {loading ? (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400 font-sans">Cargando pagos...</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400 font-sans">No se encontraron pagos registrados para los filtros seleccionados.</td></tr>
            ) : (
              filteredPayments.map((p) => {
                const info = getPaymentClientInfo(p);

                return (
                  <tr key={p.id} className={`hover:bg-slate-50 transition ${p.isVoided ? 'bg-rose-50/40 text-slate-400' : ''}`}>
                    <td className="py-3 px-4 font-mono font-black text-emerald-800">
                      <span className={p.isVoided ? 'line-through text-slate-400' : ''}>{p.operationNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                      {new Date(p.paidAt).toLocaleString('es-PE')}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      <p className="leading-tight">{info.name}</p>
                      {info.dni !== '-' && <p className="text-[10px] text-slate-400 font-mono font-normal">DNI: {info.dni}</p>}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                        {info.stall}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        {p.concept?.name || 'Cobranza General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[10px] truncate max-w-[140px]" title={p.period}>
                      {p.period}
                    </td>
                    <td className={`py-3 px-4 font-mono font-black text-right text-sm ${p.isVoided ? 'line-through text-rose-500' : 'text-slate-900'}`}>
                      S/ {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        {p.paymentMethod || 'EFECTIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {p.isVoided ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          ANULADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          PAGADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition"
                          title="Ver e Imprimir Comprobante Oficial"
                        >
                          <Printer className="w-4 h-4 mx-auto" />
                        </button>

                        {!p.isVoided && (
                          <button
                            onClick={() => {
                              setVoidPaymentItem(p);
                              setVoidReason('');
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Anular Pago"
                          >
                            <Ban className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TICKET / COMPROBANTE DE PAGO */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setSelectedPayment(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center border-b pb-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 font-bold">
                MB
              </div>
              <h3 className="font-black text-sm uppercase text-slate-800">Mercado de Abastos Micaela Bastidas</h3>
              <p className="text-[10px] text-slate-500 font-bold">COMPROBANTE INTERNO DE PAGO</p>
              <p className="font-mono font-bold text-xs text-emerald-700 mt-1">{selectedPayment.operationNumber}</p>
              {selectedPayment.isVoided && (
                <div className="mt-2 py-1 px-3 bg-rose-100 text-rose-800 font-black text-xs rounded border border-rose-300">
                  ⚠️ PAGO ANULADO - NO VÁLIDO
                </div>
              )}
            </div>

            {(() => {
              const info = getPaymentClientInfo(selectedPayment);
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Fecha y Hora:</span><span className="font-mono font-medium">{new Date(selectedPayment.paidAt).toLocaleString('es-PE')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Pagador / Cliente:</span><span className="font-bold">{info.name}</span></div>
                  {info.dni !== '-' && (
                    <div className="flex justify-between"><span className="text-slate-500">DNI:</span><span className="font-mono">{info.dni}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Puesto / Rubro:</span><span className="font-bold">{info.stall}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Concepto:</span><span className="font-bold">{selectedPayment.concept?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Período:</span><span className="font-mono">{selectedPayment.period}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Método de Pago:</span><span className="font-bold">{selectedPayment.paymentMethod}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Recaudado Por:</span><span className="font-medium">{selectedPayment.collectedBy?.fullName || 'Sistema'}</span></div>
                  {selectedPayment.notes && (
                    <div className="pt-2 border-t text-[11px] text-slate-600">
                      <span className="text-slate-400 block font-bold text-[9px] uppercase">Detalle / Notas:</span>
                      {selectedPayment.notes}
                    </div>
                  )}

                  <div className="border-t border-dashed my-3 pt-3 flex justify-between items-center text-sm">
                    <span className="font-black uppercase text-slate-800">Total Pagado:</span>
                    <span className={`font-black text-lg ${selectedPayment.isVoided ? 'line-through text-rose-600' : 'text-emerald-700'}`}>
                      S/ {Number(selectedPayment.amount).toFixed(2)}
                    </span>
                  </div>

                  {selectedPayment.isVoided && selectedPayment.voidedReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800">
                      <b>Motivo de anulación:</b> {selectedPayment.voidedReason}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-5 text-center">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow flex items-center justify-center space-x-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante Térmico</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANULAR PAGO */}
      {voidPaymentItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-800">Anular Pago Oficial</h3>
                <p className="text-xs text-slate-500 font-mono">{voidPaymentItem.operationNumber} - S/ {Number(voidPaymentItem.amount).toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción revertirá el pago de <b>{getPaymentClientInfo(voidPaymentItem).name}</b> y restaurará la obligación del período <b>{voidPaymentItem.period}</b> a estado <b>PENDIENTE</b>.
            </p>

            <form onSubmit={handleVoidPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo obligatorio de anulación *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej: Error al registrar el monto, se digitó S/ 50 en lugar de S/ 5..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidPaymentItem(null)}
                  disabled={voidLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={voidLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>{voidLoading ? 'Anulando...' : 'Confirmar Anulación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
