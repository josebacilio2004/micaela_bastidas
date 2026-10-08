'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Coins,
  Droplets,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  Users,
  Store,
  Receipt,
  Calendar,
  RefreshCw,
  Plus,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Wallet,
  Check,
  DollarSign,
} from 'lucide-react';

export default function SociosMantenimientoAguaPage() {
  const [activeTab, setActiveTab] = useState<'MANTENIMIENTO' | 'AGUA' | 'HISTORIAL'>('MANTENIMIENTO');

  // Core Data
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Period / Date Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  // Search & Secondary Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'ALL' | 'TITULAR' | 'PRUEBA'>('ALL');

  // Fees (Editable)
  const [mantenimientoFee, setMantenimientoFee] = useState<string>('15.00');
  const [waterFee, setWaterFee] = useState<string>('4.00');

  // Quick Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [payConceptType, setPayConceptType] = useState<'MANTENIMIENTO' | 'AGUA'>('MANTENIMIENTO');
  const [payAmount, setPayAmount] = useState('15.00');
  const [payPeriod, setPayPeriod] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'YAPE'>('EFECTIVO');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activePaymentReceipt, setActivePaymentReceipt] = useState<any>(null);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [merchantsRes, paymentsRes, conceptsRes, currentRegRes] = await Promise.all([
        apiRequest('/merchants').catch(() => []),
        apiRequest('/payments?take=600').catch(() => ({ items: [] })),
        apiRequest('/concepts').catch(() => []),
        apiRequest('/cash-registers/current').catch(() => null),
      ]);

      setMerchants(Array.isArray(merchantsRes) ? merchantsRes : []);
      setPayments(Array.isArray(paymentsRes?.items) ? paymentsRes.items : []);
      setConcepts(Array.isArray(conceptsRes) ? conceptsRes : []);
      setActiveRegister(currentRegRes);
    } catch (err) {
      console.error('Error cargando datos de socios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter strictly for SOCIOS (Titulares 1-88 and En Prueba 89-107)
  const socios = useMemo(() => {
    return merchants.filter((m) => {
      // Type SOCIO or fallback if not ambulante/inquilino
      const isSocio = m.merchantType === 'SOCIO' || (!m.merchantType && !m.internalCode?.includes('AF-') && !m.internalCode?.includes('INQ-'));
      if (!isSocio) return false;

      if (memberTypeFilter === 'TITULAR') {
        return m.memberCategory === 'TITULAR' || (m.internalCode && parseInt(m.internalCode.replace(/\D/g, ''), 10) <= 88);
      }
      if (memberTypeFilter === 'PRUEBA') {
        return m.memberCategory === 'PRUEBA' || (m.internalCode && parseInt(m.internalCode.replace(/\D/g, ''), 10) > 88);
      }
      return true;
    });
  }, [merchants, memberTypeFilter]);

  // Map Payments by merchantId and period
  const paymentsMap = useMemo(() => {
    const map = new Map<string, any>();
    payments.forEach((p) => {
      if (p.merchantId && p.period) {
        const key = `${p.merchantId}_${p.period}_${p.conceptId || p.concept?.code || ''}`;
        map.set(key, p);
      }
    });
    return map;
  }, [payments]);

  // Concept IDs
  const mantenimientoConcept = useMemo(() => {
    return (
      concepts.find((c) => c.code === 'MANTENIMIENTO_SOCIO') ||
      concepts.find((c) => c.code === 'ALCABALA') ||
      concepts.find((c) => c.code.includes('MANTENIMIENTO')) ||
      null
    );
  }, [concepts]);

  const aguaConcept = useMemo(() => {
    return (
      concepts.find((c) => c.code === 'AGUA_SOCIO') ||
      concepts.find((c) => c.code === 'CUOTA_AGUA') ||
      concepts.find((c) => c.code.includes('AGUA')) ||
      null
    );
  }, [concepts]);

  // Filtered rows for current active tab
  const rows = useMemo(() => {
    const concept = activeTab === 'MANTENIMIENTO' ? mantenimientoConcept : aguaConcept;
    const defaultFee = activeTab === 'MANTENIMIENTO' ? parseFloat(mantenimientoFee) || 15 : parseFloat(waterFee) || 4;

    return socios
      .map((socio) => {
        const paymentKey1 = `${socio.id}_${selectedMonth}_${concept?.id || ''}`;
        const paymentKey2 = `${socio.id}_${selectedMonth}_${concept?.code || ''}`;
        const paymentKey3 = `${socio.id}_${selectedMonth}_`;

        let payment = paymentsMap.get(paymentKey1) || paymentsMap.get(paymentKey2);
        if (!payment) {
          // Fallback search in payments list
          payment = payments.find(
            (p) =>
              p.merchantId === socio.id &&
              p.period === selectedMonth &&
              (activeTab === 'MANTENIMIENTO' ? (!p.concept?.code?.includes('AGUA')) : p.concept?.code?.includes('AGUA'))
          );
        }

        const isPaid = !!payment;
        const amount = payment ? Number(payment.amount) : defaultFee;

        return {
          socio,
          isPaid,
          payment,
          amount,
        };
      })
      .filter((row) => {
        // Status filter
        if (statusFilter === 'PAID' && !row.isPaid) return false;
        if (statusFilter === 'PENDING' && row.isPaid) return false;

        // Search filter
        if (search) {
          const s = search.toLowerCase();
          const fullName = `${row.socio.firstName || ''} ${row.socio.lastName || ''}`.toLowerCase();
          const dni = (row.socio.dni || '').toLowerCase();
          const stall = (row.socio.stalls?.[0]?.stall?.code || row.socio.stallNumber || '').toLowerCase();
          return fullName.includes(s) || dni.includes(s) || stall.includes(s);
        }

        return true;
      });
  }, [socios, activeTab, selectedMonth, mantenimientoConcept, aguaConcept, mantenimientoFee, waterFee, paymentsMap, payments, statusFilter, search]);

  // Open Quick Pay Modal
  const handleOpenPay = (socio: any, conceptType: 'MANTENIMIENTO' | 'AGUA') => {
    setSelectedMerchant(socio);
    setPayConceptType(conceptType);
    const amount = conceptType === 'MANTENIMIENTO' ? mantenimientoFee : waterFee;
    setPayAmount(amount);
    setPayPeriod(selectedMonth);
    setPayNotes(`Cobro de ${conceptType === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Agua'} - Periodo ${selectedMonth}`);
    setPayModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    setSubmittingPayment(true);
    const conceptObj = payConceptType === 'MANTENIMIENTO' ? mantenimientoConcept : aguaConcept;
    const amountNum = parseFloat(payAmount);

    try {
      // Register payment
      const paymentData: any = {
        merchantId: selectedMerchant.id,
        conceptId: conceptObj?.id,
        amount: amountNum,
        period: payPeriod,
        paymentMethod,
        notes: payNotes,
        cashRegisterId: activeRegister?.id,
      };

      const res = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      // Also ensure cash movement is created in active register
      const desc = `${payConceptType === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Agua'}: ${selectedMerchant.lastName} ${selectedMerchant.firstName} (${payPeriod})`;
      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: desc,
          amount: amountNum,
          reference: res?.operationNumber || `REC-${Date.now().toString().slice(-6)}`,
        }),
      }).catch(() => null);

      setPayModalOpen(false);
      await fetchData();

      // Show receipt
      setActivePaymentReceipt({
        ...res,
        merchant: selectedMerchant,
        concept: { name: payConceptType === 'MANTENIMIENTO' ? 'Mantenimiento de Puesto' : 'Agua Potable' },
        period: payPeriod,
        amount: amountNum,
      });
      setReceiptModalOpen(true);
    } catch (err: any) {
      alert('Error registrando pago: ' + (err.message || 'Error de red'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Print Receipt Dialog
  const handlePrintReceipt = (payment: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo de Cobranza - ${payment.operationNumber || 'MICAELA'}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body { font-family: monospace; font-size: 11pt; color: #000; width: 72mm; margin: 0 auto; padding: 4px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .amount { font-size: 16pt; font-weight: bold; text-align: center; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center bold">MERCADO MICAELA BASTIDAS</div>
          <div class="center" style="font-size: 9pt;">RUC: 20486000001 • HUANCAYO</div>
          <div class="divider"></div>
          <div class="center bold">${payment.concept?.name || 'RECIBO DE COBRANZA'}</div>
          <div class="row"><span>RECIBO:</span><span class="bold">${payment.operationNumber || 'REC-' + Date.now().toString().slice(-6)}</span></div>
          <div class="row"><span>FECHA:</span><span>${new Date(payment.paidAt || Date.now()).toLocaleDateString('es-PE')}</span></div>
          <div class="row"><span>PERIODO:</span><span class="bold">${payment.period || selectedMonth}</span></div>
          <div class="divider"></div>
          <div class="row"><span>SOCIO:</span><span class="bold">${payment.merchant?.lastName || ''} ${payment.merchant?.firstName || ''}</span></div>
          <div class="row"><span>DNI:</span><span>${payment.merchant?.dni || '-'}</span></div>
          <div class="row"><span>PUESTO:</span><span class="bold">${payment.merchant?.stalls?.[0]?.stall?.code || payment.merchant?.stallNumber || 'Sector'}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9pt;">TOTAL CANCELADO</div>
          <div class="amount">S/ ${Number(payment.amount).toFixed(2)}</div>
          <div class="divider"></div>
          <div class="center" style="font-size: 8.5pt;">¡Gracias por su puntualidad!<br>Consejo Directivo</div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Stats
  const stats = useMemo(() => {
    const totalSocios = socios.length;
    const paidCount = rows.filter((r) => r.isPaid).length;
    const pendingCount = totalSocios - paidCount;
    const totalCollected = rows
      .filter((r) => r.isPaid)
      .reduce((acc, r) => acc + (r.payment ? Number(r.payment.amount) : 0), 0);

    return { totalSocios, paidCount, pendingCount, totalCollected };
  }, [socios, rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Coins className="w-7 h-7 text-emerald-600" />
            Socios: Mantenimiento & Agua Potable
          </h1>
          <p className="text-xs text-slate-500">
            Control de cuotas mensuales de mantenimiento de puestos y servicio de agua potable para los 107 socios (88 Titulares y 19 en Prueba). Tarifas editables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeRegister ? (
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800 shadow-sm">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Caja Activa: {activeRegister.name}</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-amber-800 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Sin caja abierta hoy</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('MANTENIMIENTO')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'MANTENIMIENTO'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>1. Cuota de Mantenimiento de Puestos</span>
        </button>

        <button
          onClick={() => setActiveTab('AGUA')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'AGUA'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>2. Agua Potable Socios (S/ 4.00)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Total Socios</span>
          <p className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.totalSocios}</p>
          <span className="text-[11px] text-slate-400">88 titulares • 19 prueba</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-emerald-800 block">Socios al Día</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">{stats.paidCount}</p>
          <span className="text-[11px] text-emerald-600 font-bold">cancelaron cuota {selectedMonth}</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-amber-800 block">Socios Pendientes</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">{stats.pendingCount}</p>
          <span className="text-[11px] text-amber-600 font-bold">por regularizar en el mes</span>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-emerald-400 block">Total Recaudado</span>
          <p className="text-2xl font-black text-white font-mono mt-1">S/ {stats.totalCollected.toFixed(2)}</p>
          <span className="text-[11px] text-slate-400">ingreso neto a caja</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none"
              />
            </div>

            {/* Editable Fee */}
            <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold text-emerald-900">
              <span className="text-[10px] uppercase">Tarifa Cuota:</span>
              <span>S/</span>
              <input
                type="number"
                step="0.5"
                min="1"
                value={activeTab === 'MANTENIMIENTO' ? mantenimientoFee : waterFee}
                onChange={(e) => {
                  if (activeTab === 'MANTENIMIENTO') setMantenimientoFee(e.target.value);
                  else setWaterFee(e.target.value);
                }}
                className="w-14 bg-white border border-emerald-300 rounded px-1 text-center font-mono font-black"
              />
            </div>

            {/* Category Filter */}
            <select
              value={memberTypeFilter}
              onChange={(e) => setMemberTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">Todos los Socios (107)</option>
              <option value="TITULAR">Titulares (1 - 88)</option>
              <option value="PRUEBA">En Prueba (89 - 107)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PAID">Pagados</option>
              <option value="PENDING">Pendientes</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar socio por nombre, DNI o puesto..."
              className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[550px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3 w-10 text-center">N°</th>
                <th className="p-3">Socio / Comerciante</th>
                <th className="p-3">DNI</th>
                <th className="p-3">Puesto / Espacio</th>
                <th className="p-3">Categoría</th>
                <th className="p-3 text-right">Monto (S/)</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {rows.map((row, idx) => {
                const s = row.socio;
                const stallName = s.stalls?.[0]?.stall?.code || s.stallNumber || 'Pab. General';
                const isTitular = s.memberCategory === 'TITULAR' || idx < 88;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-sans">
                      <p className="font-bold text-slate-900 leading-tight">
                        {s.lastName} {s.firstName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.internalCode}</p>
                    </td>
                    <td className="p-3 text-slate-600">{s.dni || '-'}</td>
                    <td className="p-3 font-sans font-bold text-slate-700">{stallName}</td>
                    <td className="p-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isTitular
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {isTitular ? 'Titular' : 'En Prueba'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-emerald-800 text-sm">
                      S/ {row.amount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-sans">
                      {row.isPaid ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] flex items-center justify-center gap-1 w-fit mx-auto">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          PAGADO
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] flex items-center justify-center gap-1 w-fit mx-auto">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDIENTE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.isPaid ? (
                        <button
                          onClick={() => handlePrintReceipt(row.payment)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Imprimir Recibo"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPay(s, activeTab === 'AGUA' ? 'AGUA' : 'MANTENIMIENTO')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1 mx-auto"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Cobrar S/ {row.amount.toFixed(2)}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PAY MODAL */}
      {payModalOpen && selectedMerchant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">
                  Cobro de {payConceptType === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Agua Potable'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedMerchant.lastName} {selectedMerchant.firstName}
                </p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">Periodo a Cancelar:</span>
                <span className="text-sm font-black text-emerald-800 font-mono block mt-0.5">{payPeriod}</span>
                <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                  S/ {parseFloat(payAmount).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Monto a Cobrar (Editable):</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-base text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="EFECTIVO">Efectivo en Caja</option>
                  <option value="YAPE">Yape / Plin</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  {submittingPayment ? 'Registrando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receiptModalOpen && activePaymentReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">¡Cobranza Exitosa!</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Recibo registrado e ingresado a caja</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 font-mono text-xs space-y-2">
              <div className="text-center font-bold text-slate-900">
                MERCADO MICAELA BASTIDAS
                <p className="text-[10px] text-slate-500 font-normal">RUC: 20486000001</p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Comprobante</span>
                <span className="text-lg font-black text-slate-900">{activePaymentReceipt.operationNumber || 'REC-' + Date.now().toString().slice(-6)}</span>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Socio:</span>
                  <span className="font-bold">{activePaymentReceipt.merchant?.lastName} {activePaymentReceipt.merchant?.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Concepto:</span>
                  <span>{activePaymentReceipt.concept?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periodo:</span>
                  <span className="font-bold">{activePaymentReceipt.period}</span>
                </div>
              </div>

              <div className="border-t-2 border-slate-900 pt-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Cancelado</span>
                <span className="text-xl font-black text-emerald-800 font-mono">
                  S/ {Number(activePaymentReceipt.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handlePrintReceipt(activePaymentReceipt)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
