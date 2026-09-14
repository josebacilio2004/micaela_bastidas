'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Coins,
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
} from 'lucide-react';

export default function AlcabalaPage() {
  const [activeTab, setActiveTab] = useState<'SOCIOS' | 'AMBULANTES' | 'HISTORIAL'>('SOCIOS');

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

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Search & Secondary Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'MOROSO'>('ALL');
  const [ambulanteSubtypeFilter, setAmbulanteSubtypeFilter] = useState<'ALL' | 'AMBULANTE_FIJO' | 'AMBULANTE_TEMPORAL'>('ALL');

  // Quick Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [merchantSearchInModal, setMerchantSearchInModal] = useState('');
  const [payAmount, setPayAmount] = useState('0.00');
  const [payPeriod, setPayPeriod] = useState('');
  const [payNotes, setPayNotes] = useState('');
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
        apiRequest('/payments?take=300').catch(() => ({ items: [] })),
        apiRequest('/concepts').catch(() => []),
        apiRequest('/cash-registers/current').catch(() => null),
      ]);

      setMerchants(Array.isArray(merchantsRes) ? merchantsRes : []);
      setPayments(Array.isArray(paymentsRes?.items) ? paymentsRes.items : []);
      setConcepts(Array.isArray(conceptsRes) ? conceptsRes : []);
      setActiveRegister(currentRegRes);
    } catch (err) {
      console.error('Error cargando datos de alcabala:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcut to close modals on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPayModalOpen(false);
        setReceiptModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Concept IDs resolution
  const socioConcept = useMemo(() => {
    return (
      concepts.find((c) => c.code === 'CUOTA_MANTENIMIENTO') ||
      concepts.find((c) => c.code.includes('ALCABALA_MENSUAL')) ||
      concepts.find((c) => c.name.toLowerCase().includes('mantenimiento') || c.name.toLowerCase().includes('alcabala')) ||
      null
    );
  }, [concepts]);

  const ambulanteConcept = useMemo(() => {
    return (
      concepts.find((c) => c.code === 'ALCABALA_DIARIA') ||
      concepts.find((c) => c.code.includes('ALCABALA')) ||
      null
    );
  }, [concepts]);

  // Separate and sort merchants alphabetically by lastName, firstName
  const sociosList = useMemo(() => {
    return merchants
      .filter((m) => m.merchantType?.code === 'SOCIO')
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
  }, [merchants]);

  const ambulantesList = useMemo(() => {
    return merchants
      .filter((m) => m.merchantType?.code === 'AMBULANTE_FIJO' || m.merchantType?.code === 'AMBULANTE_TEMPORAL')
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
  }, [merchants]);

  // Helper to find payment for a merchant in a given period/date
  const getMerchantPaymentForPeriod = (merchantId: string, period: string, isDaily: boolean) => {
    return payments.find((p) => {
      if (p.merchantId !== merchantId || p.isVoided) return false;
      const code = (p.concept?.code || '').toUpperCase();
      const name = (p.concept?.name || '').toUpperCase();
      const isAlcabala = code.includes('ALCABALA') || code.includes('MANTENIMIENTO') || name.includes('ALCABALA') || name.includes('MANTENIMIENTO');
      if (!isAlcabala) return false;

      if (isDaily) {
        const paidDate = new Date(p.paidAt).toISOString().split('T')[0];
        return p.period === period || paidDate === period;
      } else {
        return p.period === period || p.period.startsWith(period);
      }
    });
  };

  // Semáforo de Morosidad para Socios
  const getSocioMorosidad = (merchantId: string) => {
    const isCurrentPaid = !!getMerchantPaymentForPeriod(merchantId, selectedMonth, false);
    if (isCurrentPaid) {
      return { status: 'AL_DIA', label: 'Al Día', color: 'emerald', monthsOwed: 0 };
    }

    // Calcular mes previo
    const [yearStr, monthStr] = selectedMonth.split('-');
    const prevMonthNum = parseInt(monthStr, 10) - 1;
    const prevMonthStr = prevMonthNum === 0 ? `${parseInt(yearStr, 10) - 1}-12` : `${yearStr}-${String(prevMonthNum).padStart(2, '0')}`;
    const isPrevPaid = !!getMerchantPaymentForPeriod(merchantId, prevMonthStr, false);

    if (!isPrevPaid) {
      return { status: 'MOROSO', label: 'Moroso (2+ meses)', color: 'rose', monthsOwed: 2 };
    }
    return { status: 'PENDIENTE', label: 'Pendiente (1 mes)', color: 'amber', monthsOwed: 1 };
  };

  // Filtered Socios according to search & statusFilter
  const filteredSocios = useMemo(() => {
    return sociosList.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.dni?.toLowerCase().includes(q) ||
        s.stall?.code?.toLowerCase().includes(q) ||
        s.businessCategory?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const morosidad = getSocioMorosidad(s.id);
      if (statusFilter === 'PAID') return morosidad.status === 'AL_DIA';
      if (statusFilter === 'PENDING') return morosidad.status === 'PENDIENTE';
      if (statusFilter === 'MOROSO') return morosidad.status === 'MOROSO';
      return true;
    });
  }, [sociosList, search, statusFilter, selectedMonth, payments]);

  // Filtered Ambulantes according to search, subtype & statusFilter
  const filteredAmbulantes = useMemo(() => {
    return ambulantesList.filter((a) => {
      if (ambulanteSubtypeFilter !== 'ALL' && a.merchantType?.code !== ambulanteSubtypeFilter) {
        return false;
      }

      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.firstName?.toLowerCase().includes(q) ||
        a.lastName?.toLowerCase().includes(q) ||
        a.dni?.toLowerCase().includes(q) ||
        a.stall?.code?.toLowerCase().includes(q) ||
        a.businessCategory?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const payment = getMerchantPaymentForPeriod(a.id, selectedDate, true);
      if (statusFilter === 'PAID') return !!payment;
      if (statusFilter === 'PENDING') return !payment;
      return true;
    });
  }, [ambulantesList, search, ambulanteSubtypeFilter, statusFilter, selectedDate, payments]);

  // Alcabala Payments History
  const alcabalaPaymentsHistory = useMemo(() => {
    return payments
      .filter((p) => {
        const code = (p.concept?.code || '').toUpperCase();
        const name = (p.concept?.name || '').toUpperCase();
        return code.includes('ALCABALA') || code.includes('MANTENIMIENTO') || name.includes('ALCABALA') || name.includes('MANTENIMIENTO');
      })
      .filter((p) => {
        const q = search.toLowerCase();
        return (
          !q ||
          p.operationNumber?.toLowerCase().includes(q) ||
          p.merchant?.dni?.toLowerCase().includes(q) ||
          p.merchant?.firstName?.toLowerCase().includes(q) ||
          p.merchant?.lastName?.toLowerCase().includes(q) ||
          p.concept?.name?.toLowerCase().includes(q) ||
          p.collectedBy?.fullName?.toLowerCase().includes(q)
        );
      });
  }, [payments, search]);

  // Metrics
  const sociosPaidCount = useMemo(() => {
    return sociosList.filter((s) => !!getMerchantPaymentForPeriod(s.id, selectedMonth, false)).length;
  }, [sociosList, selectedMonth, payments]);

  const ambulantesPaidCount = useMemo(() => {
    return ambulantesList.filter((a) => !!getMerchantPaymentForPeriod(a.id, selectedDate, true)).length;
  }, [ambulantesList, selectedDate, payments]);

  const todayAlcabalaCollected = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return payments
      .filter((p) => {
        const code = (p.concept?.code || '').toUpperCase();
        const name = (p.concept?.name || '').toUpperCase();
        const isAlcabala = code.includes('ALCABALA') || code.includes('MANTENIMIENTO') || name.includes('ALCABALA') || name.includes('MANTENIMIENTO');
        if (!isAlcabala || p.isVoided) return false;
        const paidDate = new Date(p.paidAt).toISOString().split('T')[0];
        return paidDate === todayStr;
      })
      .reduce((acc, p) => acc + Number(p.amount), 0);
  }, [payments]);

  // Open Quick Pay Modal
  const openQuickPay = (merchant: any | null = null, isSocio: boolean = true) => {
    setSelectedMerchant(merchant);
    setMerchantSearchInModal('');
    if (merchant) {
      const isSocioType = merchant.merchantType?.code === 'SOCIO';
      setPayAmount(isSocioType ? '10.00' : '3.00');
      setPayPeriod(isSocioType ? selectedMonth : selectedDate);
    } else {
      setPayAmount(activeTab === 'AMBULANTES' ? '3.00' : '10.00');
      setPayPeriod(activeTab === 'AMBULANTES' ? selectedDate : selectedMonth);
    }
    setPayNotes('');
    setPayModalOpen(true);
  };

  // Process Quick Payment
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) {
      alert('Por favor selecciona un comerciante del padrón.');
      return;
    }

    const isSocio = selectedMerchant.merchantType?.code === 'SOCIO';
    const targetConcept = isSocio ? socioConcept : ambulanteConcept;

    if (!targetConcept) {
      alert('No se encontró el concepto tarifario correspondiente.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          merchantId: selectedMerchant.id,
          conceptId: targetConcept.id,
          amount: Number(payAmount),
          period: payPeriod,
          paymentMethod: 'EFECTIVO',
          notes: payNotes.trim() || undefined,
        }),
      });

      setPayModalOpen(false);
      await fetchData();

      const created = res.payment || res;
      setActivePaymentReceipt({
        ...created,
        merchant: selectedMerchant,
        concept: targetConcept,
        collectedBy: { fullName: 'Personal de Recaudación' },
      });
      setReceiptModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error al registrar el cobro de alcabala');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Merchants matched in modal search
  const modalFilteredMerchants = useMemo(() => {
    if (!merchantSearchInModal.trim()) return [];
    const q = merchantSearchInModal.toLowerCase();
    return merchants
      .filter((m) => m.firstName?.toLowerCase().includes(q) || m.lastName?.toLowerCase().includes(q) || m.dni?.includes(q) || m.stall?.code?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [merchants, merchantSearchInModal]);

  return (
    <div className="space-y-6">
      {/* Estilos específicos para tickets térmicos POS en impresión */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-ticket, #printable-ticket * {
              visibility: visible !important;
            }
            #printable-ticket {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 78mm !important;
              max-width: 78mm !important;
              padding: 4mm !important;
              margin: 0 !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 11px !important;
              line-height: 1.3 !important;
              color: black !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `,
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <Coins className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cobranza de Alcabala</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión particionada: Socios Titulares (S/ 10.00 / mes) y Comerciantes Ambulantes (S/ 3.00 / día), ordenados alfabéticamente.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Botón Principal de Cobro Rápido */}
          <button
            onClick={() => openQuickPay(null, activeTab === 'SOCIOS')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Cobro Rápido</span>
          </button>

          {/* Caja Status Badge */}
          {activeRegister ? (
            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">{activeRegister.name}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-xs text-amber-800 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Sin Caja Abierta</span>
            </div>
          )}

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-sm bg-white"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recaudado Hoy */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Alcabala Recaudada Hoy</span>
            <Coins className="w-5 h-5 text-amber-200" />
          </div>
          <p className="text-2xl font-black font-mono mt-2">S/ {todayAlcabalaCollected.toFixed(2)}</p>
          <p className="text-[11px] text-amber-100 mt-1">Ingresos del día en caja activa</p>
        </div>

        {/* Socios Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Socios • Período {selectedMonth}</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-black text-emerald-700 font-mono">{sociosPaidCount}</p>
            <span className="text-xs text-slate-400 font-semibold">de {sociosList.length} socios al día</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${sociosList.length ? (sociosPaidCount / sociosList.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Ambulantes Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ambulantes • Día {selectedDate}</span>
            <Store className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-black text-indigo-700 font-mono">{ambulantesPaidCount}</p>
            <span className="text-xs text-slate-400 font-semibold">de {ambulantesList.length} cobrados hoy</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${ambulantesList.length ? (ambulantesPaidCount / ambulantesList.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 pt-3 bg-slate-50/50 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('SOCIOS');
              setStatusFilter('ALL');
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'SOCIOS'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Socios Titulares (S/ 10.00 / Mes)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {sociosList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('AMBULANTES');
              setStatusFilter('ALL');
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'AMBULANTES'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>2. Comerciantes Ambulantes (S/ 3.00 / Día)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {ambulantesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORIAL')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'HISTORIAL'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>3. Historial de Comprobantes Emitidos</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {alcabalaPaymentsHistory.length}
            </span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por Apellido, Nombre, DNI o Puesto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Date/Period Selector */}
            {activeTab === 'SOCIOS' && (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-[11px] font-bold text-slate-600">Mes:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {activeTab === 'AMBULANTES' && (
              <>
                <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="text-[11px] font-bold text-slate-600">Día:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-bold">
                  <button
                    onClick={() => setAmbulanteSubtypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      ambulanteSubtypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setAmbulanteSubtypeFilter('AMBULANTE_FIJO')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      ambulanteSubtypeFilter === 'AMBULANTE_FIJO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Fijos (S/ 3)
                  </button>
                  <button
                    onClick={() => setAmbulanteSubtypeFilter('AMBULANTE_TEMPORAL')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      ambulanteSubtypeFilter === 'AMBULANTE_TEMPORAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Temporales (S/ 4)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Semáforo Filters */}
          {activeTab !== 'HISTORIAL' && (
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🟢 Al Día
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🟡 Pendientes
              </button>
              {activeTab === 'SOCIOS' && (
                <button
                  onClick={() => setStatusFilter('MOROSO')}
                  className={`px-3 py-1 rounded-lg transition ${
                    statusFilter === 'MOROSO' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔴 Morosos
                </button>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: SOCIOS TITULARES */}
        {activeTab === 'SOCIOS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Socio Titular (Orden Alfabético)</th>
                  <th className="py-3 px-4">Puesto</th>
                  <th className="py-3 px-4">Rubro Comercial</th>
                  <th className="py-3 px-4">Cuota Mensual</th>
                  <th className="py-3 px-4">Semáforo de Morosidad</th>
                  <th className="py-3 px-4 text-center">Acciones de Cobranza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSocios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron socios con el criterio de búsqueda seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredSocios.map((socio, idx) => {
                    const payment = getMerchantPaymentForPeriod(socio.id, selectedMonth, false);
                    const morosidad = getSocioMorosidad(socio.id);

                    return (
                      <tr key={socio.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs flex-shrink-0">
                              {socio.lastName?.charAt(0)}
                              {socio.firstName?.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">
                                {socio.lastName}, {socio.firstName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">DNI: {socio.dni}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {socio.stall?.code || 'Sin puesto'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {socio.businessCategory || 'Comercio General'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          S/ 10.00
                        </td>
                        <td className="py-3 px-4">
                          {morosidad.status === 'AL_DIA' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Al Día ({selectedMonth})
                            </span>
                          )}
                          {morosidad.status === 'PENDIENTE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1 text-amber-600" />
                              Pendiente ({selectedMonth})
                            </span>
                          )}
                          {morosidad.status === 'MOROSO' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
                              Moroso (2+ meses)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {payment ? (
                              <button
                                onClick={() => {
                                  setActivePaymentReceipt(payment);
                                  setReceiptModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Ver Recibo</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => openQuickPay(socio, true)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition inline-flex items-center space-x-1 ${
                                payment
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{payment ? 'Otro Mes' : 'Cobrar S/ 10'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: COMERCIANTES AMBULANTES */}
        {activeTab === 'AMBULANTES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Comerciante Ambulante (Orden Alfabético)</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Puesto / Pasaje</th>
                  <th className="py-3 px-4">Rubro Comercial</th>
                  <th className="py-3 px-4">Tarifa Diaria</th>
                  <th className="py-3 px-4">Estado Hoy ({selectedDate})</th>
                  <th className="py-3 px-4 text-center">Acciones de Cobranza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAmbulantes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron comerciantes ambulantes con el criterio de búsqueda seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredAmbulantes.map((amb, idx) => {
                    const payment = getMerchantPaymentForPeriod(amb.id, selectedDate, true);
                    const isFijo = amb.merchantType?.code === 'AMBULANTE_FIJO';
                    const dailyRate = isFijo ? '3.00' : '4.00';

                    return (
                      <tr key={amb.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-xs flex-shrink-0">
                              {amb.lastName?.charAt(0)}
                              {amb.firstName?.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">
                                {amb.lastName}, {amb.firstName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">DNI: {amb.dni}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFijo ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {isFijo ? 'Ambulante Fijo' : 'Temporal / Rotativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {amb.stall?.code || 'Pasaje'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {amb.businessCategory || 'Ambulante'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          S/ {dailyRate}
                        </td>
                        <td className="py-3 px-4">
                          {payment ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Cobrado ({payment.operationNumber})
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {new Date(payment.paidAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente Hoy (S/ {dailyRate})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {payment && (
                              <button
                                onClick={() => {
                                  setActivePaymentReceipt(payment);
                                  setReceiptModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition inline-flex items-center space-x-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Ticket</span>
                              </button>
                            )}

                            <button
                              onClick={() => openQuickPay(amb, false)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition inline-flex items-center space-x-1 ${
                                payment
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{payment ? 'Otro Cobro' : `Cobrar S/ ${dailyRate}`}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: HISTORIAL DE COMPROBANTES DE ALCABALA */}
        {activeTab === 'HISTORIAL' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">N° Operación</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Comerciante</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Puesto</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4 text-right">Monto (S/)</th>
                  <th className="py-3 px-4">Cobrado Por</th>
                  <th className="py-3 px-4 text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alcabalaPaymentsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron comprobantes de alcabala emitidos.
                    </td>
                  </tr>
                ) : (
                  alcabalaPaymentsHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">{p.operationNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(p.paidAt).toLocaleDateString('es-PE')} {new Date(p.paidAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        {p.merchant ? (
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {p.merchant.lastName}, {p.merchant.firstName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {p.merchant.dni}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Varios</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">
                        {p.merchant?.merchantType?.name || 'Comerciante'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {p.merchant?.stall?.code || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {p.concept?.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.period}</td>
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                        S/ {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {p.collectedBy?.fullName || 'Personal'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setActivePaymentReceipt(p);
                            setReceiptModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-lg transition"
                          title="Imprimir Ticket Térmico"
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
        )}
      </div>

      {/* MODAL 1: REGISTRAR COBRO RÁPIDO (Z-[9999] con Backdrop seguro) */}
      {payModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl my-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPayModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Cobro de Alcabala</h2>
                <p className="text-xs text-slate-500">Emisión de comprobante oficial directo a caja activa</p>
              </div>
            </div>

            {/* Merchant Selection or Preview */}
            {selectedMerchant ? (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-4 space-y-1.5 relative">
                <button
                  type="button"
                  onClick={() => setSelectedMerchant(null)}
                  className="absolute right-3 top-3 text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Cambiar
                </button>
                <div className="flex justify-between pr-14">
                  <span className="text-slate-500">Comerciante:</span>
                  <span className="font-bold text-slate-800">{selectedMerchant.lastName}, {selectedMerchant.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DNI:</span>
                  <span className="font-mono font-semibold text-slate-700">{selectedMerchant.dni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo:</span>
                  <span className="font-semibold text-emerald-800">{selectedMerchant.merchantType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Puesto / Espacio:</span>
                  <span className="font-bold text-slate-800">{selectedMerchant.stall?.code || 'Pasaje Asignado'}</span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="font-bold text-slate-700 block mb-1 text-xs">Seleccionar Comerciante del Padrón</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Escribe DNI o Apellidos para buscar..."
                    value={merchantSearchInModal}
                    onChange={(e) => setMerchantSearchInModal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {modalFilteredMerchants.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {modalFilteredMerchants.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMerchant(m);
                          const isSocio = m.merchantType?.code === 'SOCIO';
                          setPayAmount(isSocio ? '10.00' : '3.00');
                          setPayPeriod(isSocio ? selectedMonth : selectedDate);
                          setMerchantSearchInModal('');
                        }}
                        className="w-full text-left p-2.5 hover:bg-emerald-50 transition text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{m.lastName}, {m.firstName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">DNI: {m.dni} • {m.stall?.code || 'Sin puesto'}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                          {m.merchantType?.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!selectedMerchant && !merchantSearchInModal && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Escribe para buscar o selecciona directamente desde la lista de la tabla.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto a Cobrar (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 pl-8 text-base font-black text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Período de Cobro</label>
                <input
                  type="text"
                  required
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="YYYY-MM (mensual) o YYYY-MM-DD (diario)"
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones / Notas (Opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej. Cobro en efectivo en puesto, cuota regular..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !selectedMerchant}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingPayment ? 'Procesando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET / COMPROBANTE TÉRMICO POS (Z-[9999] listo para impresión) */}
      {receiptModalOpen && activePaymentReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl my-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 print:hidden p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ticket Térmico POS Container */}
            <div id="printable-ticket" className="text-center text-xs space-y-2 text-slate-900 font-mono">
              <img
                src="/logo.png"
                alt="Logo Institucional"
                className="w-16 h-16 mx-auto rounded-full shadow-sm mb-1.5 object-cover"
              />
              <h2 className="font-black text-sm uppercase tracking-tight">Mercado de Abastos</h2>
              <p className="font-extrabold text-xs text-emerald-800 uppercase">Micaela Bastidas</p>
              <p className="text-[10px] text-slate-500 border-b border-dashed border-slate-400 pb-2">
                Sistema Oficial de Recaudación y Cobranzas
              </p>

              <div className="text-left py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <p><b>Comprobante:</b> {activePaymentReceipt.operationNumber}</p>
                <p><b>Fecha/Hora:</b> {new Date(activePaymentReceipt.paidAt || Date.now()).toLocaleString('es-PE')}</p>
                <p>
                  <b>Comerciante:</b>{' '}
                  {activePaymentReceipt.merchant
                    ? `${activePaymentReceipt.merchant.lastName}, ${activePaymentReceipt.merchant.firstName}`
                    : 'Público General'}
                </p>
                <p><b>DNI:</b> {activePaymentReceipt.merchant?.dni || 'N/A'}</p>
                <p><b>Puesto:</b> {activePaymentReceipt.merchant?.stall?.code || 'Pasaje'}</p>
                <p><b>Concepto:</b> {activePaymentReceipt.concept?.name || 'Alcabala'}</p>
                <p><b>Período:</b> {activePaymentReceipt.period}</p>
                <p><b>Método:</b> {activePaymentReceipt.paymentMethod || 'EFECTIVO'}</p>
                {activePaymentReceipt.notes && (
                  <p><b>Notas:</b> {activePaymentReceipt.notes}</p>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 flex justify-between items-center text-sm font-black">
                <span>TOTAL COBRADO:</span>
                <span className="text-base text-emerald-800">S/ {Number(activePaymentReceipt.amount || 0).toFixed(2)}</span>
              </div>

              <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
                <p>Caja: {activePaymentReceipt.cashRegister?.name || activeRegister?.name || 'Caja Principal'}</p>
                <p>Recaudador: {activePaymentReceipt.collectedBy?.fullName || 'Personal de Recaudación'}</p>
                <p className="font-bold text-slate-700 mt-1">¡Gracias por su contribución puntual!</p>
              </div>
            </div>

            {/* Modal Actions (Hidden in Print) */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket POS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
