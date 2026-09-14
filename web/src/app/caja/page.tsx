'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  FileText,
  Banknote,
  Droplets,
  Coins,
  Bath,
  Search,
  Calendar,
  AlertTriangle,
  Receipt,
  ShieldAlert,
} from 'lucide-react';

export default function CajaPage() {
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [allRegisters, setAllRegisters] = useState<any[]>([]);
  const [consolidated, setConsolidated] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Filter for Consolidated Report
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Search & Filter for Payments in Active Cash Register
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentConceptFilter, setPaymentConceptFilter] = useState('ALL'); // 'ALL' | 'ALCABALA' | 'AGUA' | 'SSHH'

  // Open Modal State
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [openName, setOpenName] = useState('Caja General del Día');
  const [customName, setCustomName] = useState('');
  const [openAmount, setOpenAmount] = useState('0.00');

  // Movement Modal State
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [movementConcept, setMovementConcept] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReference, setMovementReference] = useState('');

  // Close Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closingObservations, setClosingObservations] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  // Reopen Modal State
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const fetchCajaData = async (dateParam?: string) => {
    setLoading(true);
    const dateQuery = dateParam || selectedDate;
    try {
      const [current, all, cons] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/cash-registers').catch(() => []),
        apiRequest(`/cash-registers/daily-consolidated?date=${dateQuery}`).catch(() => null),
      ]);
      setCurrentRegister(current);
      setAllRegisters(Array.isArray(all) ? all : []);
      setConsolidated(cons);

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
  }, [selectedDate]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = openName === 'OTRO' ? customName.trim() : openName;
    if (!finalName) {
      alert('Debe especificar un nombre para la caja');
      return;
    }

    try {
      await apiRequest('/cash-registers/open', {
        method: 'POST',
        body: JSON.stringify({
          name: finalName,
          openingAmount: Number(openAmount) || 0,
        }),
      });
      setIsOpenModalOpen(false);
      setOpenAmount('0.00');
      setCustomName('');
      fetchCajaData();
    } catch (err: any) {
      alert(err.message || 'Error al abrir la caja');
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister) return;
    try {
      await apiRequest(`/cash-registers/${currentRegister.id}/movements`, {
        method: 'POST',
        body: JSON.stringify({
          type: movementType,
          concept: movementConcept,
          amount: Number(movementAmount),
          reference: movementReference || undefined,
        }),
      });
      setIsMovementModalOpen(false);
      setMovementConcept('');
      setMovementAmount('');
      setMovementReference('');
      fetchCajaData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar movimiento');
    }
  };

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
      alert(err.message || 'Error al cerrar caja');
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
      alert(err.message || 'Error al reabrir caja');
    }
  };

  const difference = countedCash !== '' && summary
    ? Number(countedCash) - summary.expectedCash
    : 0;

  // Filter payments in active cash register
  const filteredPayments = (summary?.payments || []).filter((p: any) => {
    const q = paymentSearch.toLowerCase();
    const matchesQuery =
      !q ||
      p.operationNumber?.toLowerCase().includes(q) ||
      p.merchant?.dni?.toLowerCase().includes(q) ||
      p.merchant?.firstName?.toLowerCase().includes(q) ||
      p.merchant?.lastName?.toLowerCase().includes(q) ||
      p.concept?.name?.toLowerCase().includes(q) ||
      p.collectedBy?.fullName?.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (paymentConceptFilter === 'ALCABALA') {
      const c = (p.concept?.code || '').toUpperCase();
      const n = (p.concept?.name || '').toUpperCase();
      return c.includes('ALCABALA') || c.includes('MANTENIMIENTO') || n.includes('ALCABALA') || n.includes('MANTENIMIENTO');
    }
    if (paymentConceptFilter === 'AGUA') {
      const c = (p.concept?.code || '').toUpperCase();
      return c.includes('AGUA');
    }
    return true;
  });

  // Check if open register is from a previous date
  const isRegisterFromPast = currentRegister && (() => {
    const openedDate = new Date(currentRegister.openedAt).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return openedDate < today;
  })();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Caja y Arqueo Diario</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Apertura y cierre diario, consolidación de cobros (Alcabala, Agua, SS.HH.) y arqueo con control de diferencias.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchCajaData()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-sm bg-white"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!currentRegister && (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Nueva Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Resumen Consolidado del Día (Top Metrics) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-700 pb-3 gap-3">
          <div className="flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Reporte General Diario Consolidado
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800/90 border border-slate-600 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none text-xs cursor-pointer"
              />
            </div>
            <div className="text-right border-l border-slate-700 pl-3">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Recaudado</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                S/ {Number(consolidated?.breakdown?.totalCollected || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card Alcabala */}
          <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
            <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold mb-1">
              <Coins className="w-4 h-4" />
              <span>Alcabala / Cuotas</span>
            </div>
            <p className="text-xl font-black text-white font-mono">
              S/ {Number(consolidated?.breakdown?.alcabala || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {consolidated?.counts?.alcabala || 0} cobros (Socios y Ambulantes)
            </p>
          </div>

          {/* Card Agua */}
          <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
            <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-bold mb-1">
              <Droplets className="w-4 h-4" />
              <span>Servicio de Agua</span>
            </div>
            <p className="text-xl font-black text-white font-mono">
              S/ {Number(consolidated?.breakdown?.water || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {consolidated?.counts?.water || 0} cuotas recaudadas
            </p>
          </div>

          {/* Card SSHH */}
          <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
            <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold mb-1">
              <Bath className="w-4 h-4" />
              <span>Servicios Higiénicos</span>
            </div>
            <p className="text-xl font-black text-white font-mono">
              S/ {Number(consolidated?.breakdown?.sanitary || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {consolidated?.counts?.sanitarySessions || 0} turnos de tickets
            </p>
          </div>

          {/* Card Efectivo Total */}
          <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-500/40">
            <div className="flex items-center space-x-1.5 text-emerald-300 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Efectivo Total Consolidado</span>
            </div>
            <p className="text-xl font-black text-emerald-300 font-mono">
              S/ {Number(consolidated?.breakdown?.expectedTotal || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">
              Apertura (S/ {Number(consolidated?.breakdown?.openingTotal || 0).toFixed(2)}) + Cobros
            </p>
          </div>
        </div>
      </div>

      {/* 2. Caja Activa en Operación */}
      {currentRegister ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          {/* Advertencia si la caja es de fecha anterior */}
          {isRegisterFromPast && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-xl text-amber-900 flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm text-amber-900">
                    Caja Abierta de Fecha Anterior ({new Date(currentRegister.openedAt).toLocaleDateString('es-PE')})
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Esta caja fue abierta el {new Date(currentRegister.openedAt).toLocaleDateString('es-PE')} a las {new Date(currentRegister.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} y no fue cerrada al finalizar esa jornada. Se recomienda realizar el arqueo y cierre para iniciar la caja con la fecha de hoy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl whitespace-nowrap shadow-sm"
              >
                Cerrar Caja Ahora
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Caja Abierta para Cobranzas</span>
              </div>
              <h2 className="text-xl font-black text-slate-800 mt-1">{currentRegister.name}</h2>
              <p className="text-xs text-slate-500">
                Apertura por: <span className="font-semibold text-slate-700">{currentRegister.openedBy?.fullName || 'Personal'}</span> • {new Date(currentRegister.openedAt).toLocaleDateString('es-PE')} {new Date(currentRegister.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Movimiento Extra</span>
              </button>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
              >
                Arqueo y Cierre de Caja
              </button>
            </div>
          </div>

          {summary && (
            <div className="space-y-5">
              {/* Tarjetas de Desglose de Caja Activa */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {/* Monto Inicial */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Monto Apertura</span>
                  <p className="text-lg font-black text-slate-800 mt-1 font-mono">S/ {summary.openingAmount.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fondo para sencillo</p>
                </div>

                {/* Recaudación Alcabala */}
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
                  <span className="text-amber-800 font-bold uppercase text-[10px] block">Recaudación Alcabala</span>
                  <p className="text-lg font-black text-amber-700 mt-1 font-mono">S/ {summary.alcabalaSum.toFixed(2)}</p>
                  <p className="text-[10px] text-amber-600/90 mt-0.5">{summary.counts?.alcabala || 0} cuotas cobradas</p>
                </div>

                {/* Recaudación Agua */}
                <div className="p-3.5 bg-cyan-50/50 rounded-xl border border-cyan-200/80">
                  <span className="text-cyan-800 font-bold uppercase text-[10px] block">Recaudación Agua</span>
                  <p className="text-lg font-black text-cyan-700 mt-1 font-mono">S/ {summary.waterSum.toFixed(2)}</p>
                  <p className="text-[10px] text-cyan-600/90 mt-0.5">{summary.counts?.water || 0} pagos de agua</p>
                </div>

                {/* Recaudación SSHH */}
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
                  <span className="text-indigo-800 font-bold uppercase text-[10px] block">Recaudación SS.HH.</span>
                  <p className="text-lg font-black text-indigo-700 mt-1 font-mono">S/ {summary.sanitarySum.toFixed(2)}</p>
                  <p className="text-[10px] text-indigo-600/90 mt-0.5">{summary.sanitarySessionsCount || 0} turnos ingresados</p>
                </div>

                {/* Efectivo Total en Caja */}
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300">
                  <span className="text-emerald-800 font-bold uppercase text-[10px] block">Total Efectivo en Caja</span>
                  <p className="text-xl font-black text-emerald-900 mt-1 font-mono">S/ {summary.expectedCash.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-0.5">{summary.paymentsCount} cobros + {summary.sanitarySessionsCount} turnos</p>
                </div>
              </div>

              {/* Movimientos extraordinarios si hubiesen */}
              {summary.register?.movements && summary.register.movements.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-2">Movimientos Extraordinarios en esta Caja</span>
                  <div className="space-y-1.5">
                    {summary.register.movements.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                        <span className={`font-bold ${m.type === 'INGRESO' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {m.type === 'INGRESO' ? '+ INGRESO' : '- EGRESO'}: {m.concept} {m.reference ? `(${m.reference})` : ''}
                        </span>
                        <span className="font-mono font-black">S/ {Number(m.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TABLA: DETALLE DE COBRANZAS REGISTRADAS EN ESTA CAJA */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Detalle de Cobranzas en esta Caja ({filteredPayments.length} de {summary.payments?.length || 0})
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Filter por Concepto */}
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
                      <button
                        onClick={() => setPaymentConceptFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md transition ${paymentConceptFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Todos ({summary.payments?.length || 0})
                      </button>
                      <button
                        onClick={() => setPaymentConceptFilter('ALCABALA')}
                        className={`px-2.5 py-1 rounded-md transition ${paymentConceptFilter === 'ALCABALA' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Alcabala ({summary.counts?.alcabala || 0})
                      </button>
                      <button
                        onClick={() => setPaymentConceptFilter('AGUA')}
                        className={`px-2.5 py-1 rounded-md transition ${paymentConceptFilter === 'AGUA' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Agua ({summary.counts?.water || 0})
                      </button>
                    </div>

                    {/* Buscador */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por DNI, N° Op o nombre..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:w-60 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">N° Operación</th>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Comerciante</th>
                        <th className="py-2.5 px-3">Puesto</th>
                        <th className="py-2.5 px-3">Concepto</th>
                        <th className="py-2.5 px-3">Período</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3">Cobrador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400">
                            No se encontraron cobranzas registradas con el criterio de búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((p: any) => {
                          const isAlcabala = (p.concept?.code || '').includes('ALCABALA') || (p.concept?.code || '').includes('MANTENIMIENTO');
                          const isWater = (p.concept?.code || '').includes('AGUA');

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{p.operationNumber}</td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                                {new Date(p.paidAt).toLocaleDateString('es-PE')}, {new Date(p.paidAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="py-2 px-3">
                                {p.merchant ? (
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      {p.merchant.lastName}, {p.merchant.firstName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">DNI: {p.merchant.dni}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Público General</span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-600">
                                {p.merchant?.stall?.code || '-'}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAlcabala
                                    ? 'bg-amber-100 text-amber-800'
                                    : isWater
                                    ? 'bg-cyan-100 text-cyan-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {p.concept?.name}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{p.period}</td>
                              <td className="py-2 px-3 text-right font-black font-mono text-slate-900">
                                S/ {Number(p.amount).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">
                                {p.collectedBy?.fullName || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
              No existe una caja abierta en este momento
            </h3>
            <p className="text-xs text-amber-800 mt-1">
              La tesorera o administrador debe abrir la caja del día para iniciar el registro de cobros y rendiciones.
            </p>
          </div>
          <button
            onClick={() => setIsOpenModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition whitespace-nowrap"
          >
            + Abrir Caja del Día
          </button>
        </div>
      )}

      {/* 3. Historial de Cajas y Cierres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Historial de Cajas y Cierres</h3>
          <span className="text-xs text-slate-400 font-semibold">{allRegisters.length} cajas registradas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Caja / Servicio</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Apertura</th>
                <th className="py-3 px-4">Cierre</th>
                <th className="py-3 px-4 text-right">Efectivo Esperado</th>
                <th className="py-3 px-4 text-right">Efectivo Contado</th>
                <th className="py-3 px-4 text-right">Diferencia</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRegisters.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No hay cajas registradas en el historial. Abra la primera caja del sistema.
                  </td>
                </tr>
              ) : (
                allRegisters.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{reg.name}</td>
                    <td className="py-3 px-4 text-slate-600">{reg.openedBy?.fullName || 'Personal'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(reg.openedAt).toLocaleDateString('es-PE')} {new Date(reg.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {reg.closedAt ? (
                        `${new Date(reg.closedAt).toLocaleDateString('es-PE')} ${new Date(reg.closedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                      ) : (
                        <span className="text-emerald-600 font-bold">En curso</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black font-mono text-right text-slate-800">
                      S/ {Number(reg.expectedCash || reg.openingAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-black font-mono text-right text-slate-800">
                      {reg.countedCash !== null ? `S/ ${Number(reg.countedCash).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {reg.difference !== null && reg.difference !== undefined ? (
                        <span className={`font-black font-mono ${Number(reg.difference) === 0 ? 'text-emerald-700' : Number(reg.difference) > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                          S/ {Number(reg.difference).toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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
                          title="Reabrir caja con motivo justificado (solo Administrador)"
                        >
                          Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ABRIR CAJA */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsOpenModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase">Apertura de Caja Diaria</h2>
                <p className="text-xs text-slate-500">Inicie la jornada registrando el monto inicial para cambio</p>
              </div>
            </div>

            <form onSubmit={handleOpenRegister} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre / Servicio de la Caja</label>
                <select
                  value={openName}
                  onChange={(e) => setOpenName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value={`Caja General del Día - ${new Date().toLocaleDateString('es-PE')}`}>
                    Caja General del Día (Todos los servicios)
                  </option>
                  <option value={`Caja Servicio de Alcabala y Cuotas - ${new Date().toLocaleDateString('es-PE')}`}>
                    Caja Servicio de Alcabala y Cuotas
                  </option>
                  <option value={`Caja Servicio de Agua Potable - ${new Date().toLocaleDateString('es-PE')}`}>
                    Caja Servicio de Agua Potable
                  </option>
                  <option value={`Caja Servicios Higiénicos - ${new Date().toLocaleDateString('es-PE')}`}>
                    Caja Servicios Higiénicos (SS.HH.)
                  </option>
                  <option value="OTRO">Otro nombre personalizado...</option>
                </select>
              </div>

              {openName === 'OTRO' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre Personalizado de la Caja</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej. Caja Diaria - Sector Central"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto Inicial en Sencillo / Cambio (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={openAmount}
                    onChange={(e) => setOpenAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-8 text-base font-black text-slate-800 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Efectivo inicial en monedas o billetes pequeños disponible para vueltos.</p>
              </div>

              <div className="flex space-x-2 pt-1">
                {[0, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpenAmount(amt.toFixed(2))}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
                  >
                    S/ {amt}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2.5 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO DE CAJA */}
      {isMovementModalOpen && currentRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsMovementModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-black text-slate-800 mb-1 uppercase">Movimiento Extraordinario de Caja</h2>
            <p className="text-xs text-slate-500 mb-4">Registre entradas o salidas de efectivo durante la jornada</p>

            <form onSubmit={handleAddMovement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('INGRESO')}
                  className={`py-2 rounded-xl font-bold border text-center ${
                    movementType === 'INGRESO'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  + Ingreso Extra
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('EGRESO')}
                  className={`py-2 rounded-xl font-bold border text-center ${
                    movementType === 'EGRESO'
                      ? 'bg-red-50 border-red-500 text-red-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  - Egreso / Gasto
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Concepto / Motivo</label>
                <input
                  type="text"
                  required
                  value={movementConcept}
                  onChange={(e) => setMovementConcept(e.target.value)}
                  placeholder="Ej. Compra de útiles de limpieza, Pago de recojo de basura..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto (S/)</label>
                <input
                  type="number"
                  step="0.50"
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-bold font-mono text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Referencia / N° Comprobante (Opcional)</label>
                <input
                  type="text"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  placeholder="Ej. Boleta 001-456"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CIERRE Y ARQUEO */}
      {isCloseModalOpen && summary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsCloseModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Arqueo y Cierre de Caja</h2>
            <p className="text-xs text-slate-500 mb-4">Conteo de efectivo físico contra recaudación registrada en sistema</p>

            {/* Desglose previo de recaudación */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2 mb-4">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Composición del Efectivo Esperado:</span>
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Monto Inicial Apertura (Sencillo):</span>
                  <span className="font-mono font-semibold">S/ {summary.openingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>(+) Recaudación Alcabala y Cuotas ({summary.counts?.alcabala || 0} pagos):</span>
                  <span className="font-mono">S/ {summary.alcabalaSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-cyan-800 font-semibold">
                  <span>(+) Recaudación Agua Potable ({summary.counts?.water || 0} pagos):</span>
                  <span className="font-mono">S/ {summary.waterSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-800 font-semibold">
                  <span>(+) Recaudación SS.HH. ({summary.sanitarySessionsCount || 0} turnos):</span>
                  <span className="font-mono">S/ {summary.sanitarySum.toFixed(2)}</span>
                </div>
                {summary.movementsIncome > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Movimientos Ingreso Extraordinario:</span>
                    <span className="font-mono">S/ {summary.movementsIncome.toFixed(2)}</span>
                  </div>
                )}
                {summary.movementsExpense > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>(-) Movimientos Egreso / Gastos:</span>
                    <span className="font-mono">- S/ {summary.movementsExpense.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-black text-slate-900 text-sm">
                <span>Efectivo Total Esperado:</span>
                <span className="text-emerald-800 font-mono text-base">S/ {summary.expectedCash.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseRegister} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Efectivo Físico Contado en Caja (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-8 text-base font-black text-slate-800 font-mono"
                  />
                </div>
              </div>

              {countedCash !== '' && (
                <div className={`p-3 rounded-xl border text-xs ${
                  Math.abs(difference) <= 0.01
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : difference > 0
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="font-bold flex items-center">
                    {Math.abs(difference) <= 0.01 ? (
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                    )}
                    {Math.abs(difference) <= 0.01
                      ? '¡Cuadre Exacto! Efectivo contado coincide perfectamente con el sistema.'
                      : difference > 0
                          ? `Sobrante en Caja: S/ ${difference.toFixed(2)}`
                          : `Faltante en Caja: S/ ${Math.abs(difference).toFixed(2)}`}
                  </p>

                  {Math.abs(difference) > 0.01 && (
                    <div className="mt-2">
                      <label className="font-bold block mb-1">Motivo / Explicación del Descuadre (Obligatorio):</label>
                      <textarea
                        required
                        value={discrepancyReason}
                        onChange={(e) => setDiscrepancyReason(e.target.value)}
                        placeholder="Detalle la causa de la diferencia encontrada..."
                        className="w-full border border-red-300 rounded p-2 text-xs"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones Generales de Cierre</label>
                <textarea
                  value={closingObservations}
                  onChange={(e) => setClosingObservations(e.target.value)}
                  placeholder="Comentarios sobre la jornada o caja..."
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsCloseModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md">
                  Confirmar Cierre y Arqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REABRIR CAJA */}
      {reopenId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setReopenId(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Reapertura de Caja</h2>
            <p className="text-xs text-slate-500 mb-4">Esta acción solo está autorizada para Administradores y queda registrada en auditoría.</p>

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
                <button type="button" onClick={() => setReopenId(null)} className="px-4 py-2 border rounded font-bold">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold">
                  Reabrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
