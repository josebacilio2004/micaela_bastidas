'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest, getAuthToken } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  DollarSign,
  Search,
  Plus,
  Filter,
  FileText,
  Printer,
  Upload,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
  Trash2,
} from 'lucide-react';

export default function FlujoCajaPage() {
  const [activeTab, setActiveTab] = useState<'RESUMEN' | 'LIBRO_DIARIO' | 'EGRESOS'>('RESUMEN');
  const [loading, setLoading] = useState(true);

  // Filtro Fechas General
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    startDate: firstDayOfMonth,
    endDate: todayStr,
  });

  // Resumen Data
  const [summary, setSummary] = useState<any>(null);

  // Libro Diario Data
  const [cashbookDate, setCashbookDate] = useState(todayStr);
  const [cashbook, setCashbook] = useState<any>(null);

  // Egresos Data
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Modal Registrar Egreso
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [uploadingVoucher, setUploadingVoucher] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'SERVICIOS_BASICOS',
    concept: '',
    beneficiary: '',
    amount: '',
    date: todayStr,
    documentType: 'FACTURA',
    documentNumber: '',
    voucherUrl: '',
    paymentMethod: 'EFECTIVO',
    deductFromCashRegister: true,
    notes: '',
  });

  // Modal Registrar Otro Ingreso
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    concept: '',
    amount: '',
    date: todayStr,
    receiptNumber: '',
    paymentMethod: 'EFECTIVO',
    notes: '',
  });

  // Modal Preview Voucher
  const [previewVoucherUrl, setPreviewVoucherUrl] = useState<string | null>(null);

  // Carga de datos
  const fetchSummary = async () => {
    try {
      const q = new URLSearchParams();
      if (dateRange.startDate) q.append('startDate', dateRange.startDate);
      if (dateRange.endDate) q.append('endDate', dateRange.endDate);
      const res = await apiRequest(`/cashflow/summary?${q.toString()}`);
      setSummary(res);
    } catch (e) {
      console.error('Error fetching summary:', e);
    }
  };

  const fetchCashbook = async () => {
    try {
      const res = await apiRequest(`/cashflow/cashbook?date=${cashbookDate}`);
      setCashbook(res);
    } catch (e) {
      console.error('Error fetching cashbook:', e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const q = new URLSearchParams();
      if (expenseFilterCategory && expenseFilterCategory !== 'ALL') q.append('category', expenseFilterCategory);
      if (expenseSearch) q.append('search', expenseSearch);
      if (dateRange.startDate) q.append('startDate', dateRange.startDate);
      if (dateRange.endDate) q.append('endDate', dateRange.endDate);
      const res = await apiRequest(`/cashflow/expenses?${q.toString()}`);
      setExpenses(res || []);
    } catch (e) {
      console.error('Error fetching expenses:', e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchCashbook(), fetchExpenses()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [dateRange]);

  useEffect(() => {
    fetchCashbook();
  }, [cashbookDate]);

  useEffect(() => {
    fetchExpenses();
  }, [expenseFilterCategory, expenseSearch]);

  // Manejo de carga de archivo voucher
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingVoucher(true);
      const token = getAuthToken();
      const res = await fetch('/api/cashflow/expenses/upload-voucher', {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Error al subir el comprobante');
      }

      const data = await res.json();
      setExpenseForm((prev) => ({ ...prev, voucherUrl: data.fileUrl }));
      alert('✓ Comprobante adjuntado con éxito');
    } catch (err: any) {
      alert(err.message || 'Error al subir archivo');
    } finally {
      setUploadingVoucher(false);
    }
  };

  // Guardar Egreso
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.concept || !expenseForm.amount) {
      alert('Por favor ingrese el concepto y el monto');
      return;
    }

    try {
      await apiRequest('/cashflow/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expenseForm.category,
          concept: expenseForm.concept,
          beneficiary: expenseForm.beneficiary,
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
          documentType: expenseForm.documentType,
          documentNumber: expenseForm.documentNumber || undefined,
          fileUrl: expenseForm.voucherUrl || undefined,
          paymentMethod: expenseForm.paymentMethod,
          registerCashExpense: expenseForm.deductFromCashRegister,
          notes: expenseForm.notes || undefined,
        }),
      });

      alert('✓ Egreso registrado con éxito');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category: 'SERVICIOS_BASICOS',
        concept: '',
        beneficiary: '',
        amount: '',
        date: todayStr,
        documentType: 'FACTURA',
        documentNumber: '',
        voucherUrl: '',
        paymentMethod: 'EFECTIVO',
        deductFromCashRegister: true,
        notes: '',
      });
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Error al registrar egreso');
    }
  };

  // Anular Egreso
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Está seguro de anular este egreso? El estado cambiará a ANULADO.')) return;
    try {
      await apiRequest(`/cashflow/expenses/${id}`, { method: 'DELETE' });
      alert('✓ Egreso anulado');
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Error al anular');
    }
  };

  // Registrar Otro Ingreso
  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incomeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    try {
      setSubmittingIncome(true);
      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: incomeForm.concept.trim(),
          amount: amt,
          reference: incomeForm.receiptNumber?.trim() || `ING-${Date.now().toString().slice(-6)}`,
        }),
      });

      setIsIncomeModalOpen(false);
      setIncomeForm({
        concept: '',
        amount: '',
        date: todayStr,
        receiptNumber: '',
        paymentMethod: 'EFECTIVO',
        notes: '',
      });
      alert('✓ Otro Ingreso registrado exitosamente en Caja y Flujo.');
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Error al registrar ingreso');
    } finally {
      setSubmittingIncome(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600" />
            Flujo de Caja Consolidado
          </h1>
          <p className="text-xs text-slate-500">
            Control integral de ingresos (Alcabala, Agua, SSHH, Alquileres, Publicidad, Fondo Rotatorio) y egresos (Servicios, Planilla, Obras) del mercado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Rango de Fechas */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="font-bold text-slate-700 bg-transparent focus:outline-none"
            />
            <span className="text-slate-300">|</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="font-bold text-slate-700 bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Otro Ingreso</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-200 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Egreso</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Total Ingresos</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700 font-mono mt-2">
              S/ {Number(summary.totalIncome || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Recaudación acumulada en el rango</p>
          </div>

          <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase text-rose-600 tracking-wider">Total Egresos</span>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-700 font-mono mt-2">
              S/ {Number(summary.totalExpenses || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Gastos operativos y desembolsos</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Balance Neto (Superávit)</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  summary.netBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl font-black font-mono mt-2 ${
                summary.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              S/ {Number(summary.netBalance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Ingresos menos egresos netos</p>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">Saldo en Caja Activa</span>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white font-mono mt-2">
              S/ {Number(summary.activeCashRegisterBalance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Dinero físico disponible hoy</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('RESUMEN')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'RESUMEN'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Resumen y Desglose Financiero</span>
        </button>

        <button
          onClick={() => setActiveTab('LIBRO_DIARIO')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'LIBRO_DIARIO'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>2. Libro Diario de Movimientos</span>
        </button>

        <button
          onClick={() => setActiveTab('EGRESOS')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'EGRESOS'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Registro de Egresos y Comprobantes ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: RESUMEN Y DESGLOSE */}
      {activeTab === 'RESUMEN' && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingresos Desglosados */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase text-emerald-800 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Desglose de Ingresos Registrados
              </h2>
              <span className="text-xs font-mono font-black text-emerald-700">
                Total: S/ {Number(summary.totalIncome).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">1. Alcabala de Camiones y Descargas</p>
                  <p className="text-[11px] text-slate-400">Cobro de peaje y descarga en plataforma</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.alcabala || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">2. Consumo y Mantenimiento de Agua</p>
                  <p className="text-[11px] text-slate-400">Cuota fija y lecturas de medidores</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.water || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">3. Servicios Higiénicos (SSHH)</p>
                  <p className="text-[11px] text-slate-400">Recaudación por turnos de operadores</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.sshh || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">4. Alquileres de Puestos de la Asociación</p>
                  <p className="text-[11px] text-slate-400">Puestos P-108 a P-120 arrendados</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.rentals || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">5. Publicidad por Altavoces</p>
                  <p className="text-[11px] text-slate-400">Menciones publicitarias y comunicados</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.advertising || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">6. Amortizaciones Fondo Rotatorio</p>
                  <p className="text-[11px] text-slate-400">Cobranza de capital e intereses ganados</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.loanCollections || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">7. Multas de Asambleas y Faenas</p>
                  <p className="text-[11px] text-slate-400">Inasistencias y sanciones estatutarias</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.incomeBreakdown?.fines || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Egresos Desglosados */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase text-rose-800 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Desglose de Egresos Operativos
              </h2>
              <span className="text-xs font-mono font-black text-rose-700">
                Total: S/ {Number(summary.totalExpenses).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">1. Planilla y Remuneraciones de Personal</p>
                  <p className="text-[11px] text-slate-400">Vigilancia, limpieza, administración</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.payroll || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">2. Servicios Básicos (Sedam, Electrocentro)</p>
                  <p className="text-[11px] text-slate-400">Recibos de energía eléctrica y agua pública</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.utilities || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">3. Mantenimiento, Infraestructura y Obras</p>
                  <p className="text-[11px] text-slate-400">Reparaciones de techos, desagües, pintura</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.maintenanceAndWorks || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">4. Préstamos Otorgados (Fondo Rotatorio)</p>
                  <p className="text-[11px] text-slate-400">Desembolsos de créditos solidarios a socios</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.loansDisbursed || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">5. Gastos Administrativos, Notaría y Legales</p>
                  <p className="text-[11px] text-slate-400">Asesoría jurídica, Sunarp, trámites munis</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.adminAndLegal || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-800">6. Otros Gastos Operativos y de Caja Chica</p>
                  <p className="text-[11px] text-slate-400">Artículos de escritorio, eventos, movilidad</p>
                </div>
                <span className="font-mono font-black text-slate-800 text-sm">
                  S/ {Number(summary.expenseBreakdown?.others || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIBRO DIARIO */}
      {activeTab === 'LIBRO_DIARIO' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black uppercase text-slate-600">Fecha del Libro Diario:</span>
              <input
                type="date"
                value={cashbookDate}
                onChange={(e) => setCashbookDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Folio Diario</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Hora / Fecha</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Rubro / Categoría</th>
                    <th className="p-3">Detalle del Movimiento</th>
                    <th className="p-3">Referencia</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-right">Saldo Progresivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!cashbook || cashbook.entries?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No hay movimientos registrados para el día seleccionado ({cashbookDate})
                      </td>
                    </tr>
                  ) : (
                    cashbook.entries.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                              item.type === 'INGRESO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.type === 'INGRESO' ? '+' : '-'} {item.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{item.category}</td>
                        <td className="p-3 text-slate-800 max-w-xs truncate">{item.description}</td>
                        <td className="p-3 font-mono text-slate-500">{item.reference}</td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${
                            item.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {item.type === 'INGRESO' ? '+' : '-'} S/ {Number(item.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-800">
                          S/ {Number(item.runningBalance).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {cashbook && cashbook.entries?.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Total de Asientos del Día: {cashbook.totalEntries}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">Saldo Final del Día:</span>
                  <span
                    className={`font-mono font-black text-sm ${
                      cashbook.finalBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    S/ {Number(cashbook.finalBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REGISTRO DE EGRESOS */}
      {activeTab === 'EGRESOS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por concepto, beneficiario, código..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <select
                value={expenseFilterCategory}
                onChange={(e) => setExpenseFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="SERVICIOS_BASICOS">Servicios Básicos (Luz/Agua)</option>
                <option value="PLANILLA_PERSONAL">Planilla de Personal</option>
                <option value="FONDO_ROTATORIO_CREDITO">Préstamos Fondo Rotatorio</option>
                <option value="MANTENIMIENTO_OBRAS">Mantenimiento y Obras</option>
                <option value="ADMINISTRATIVOS_LEGALES">Administrativos y Legales</option>
                <option value="PUBLICIDAD_PERIFONEO">Publicidad y Perifoneo</option>
                <option value="IMPREVISTOS_OTROS">Otros Gastos</option>
              </select>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Egreso</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Concepto / Motivo</th>
                    <th className="p-3">Beneficiario</th>
                    <th className="p-3">Comprobante</th>
                    <th className="p-3 text-right">Monto (S/)</th>
                    <th className="p-3 text-center">Caja</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No se encontraron egresos registrados
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-rose-700">{exp.code}</td>
                        <td className="p-3 text-slate-600">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.category === 'PLANILLA_PERSONAL'
                              ? 'bg-purple-100 text-purple-800'
                              : exp.category === 'FONDO_ROTATORIO_CREDITO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {exp.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-xs truncate">{exp.concept}</td>
                        <td className="p-3 text-slate-700 font-semibold">{exp.beneficiary}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[11px] text-slate-600">
                              {exp.documentType}: {exp.documentNumber || 'S/N'}
                            </span>
                            {exp.fileUrl && (
                              <button
                                onClick={() => setPreviewVoucherUrl(exp.fileUrl)}
                                className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                title="Ver comprobante adjunto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700 text-sm">
                          S/ {Number(exp.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {exp.cashRegister ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              Caja Activa
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Banco / Externo</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              exp.status === 'PAGADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {exp.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {exp.status === 'PAGADO' && !exp.source && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Anular Egreso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {exp.source && (
                            <span className="text-[10px] text-slate-400 font-medium italic">
                              {exp.source === 'STAFF_PAYMENT' ? 'Desde Personal' : 'Desde F. Rotatorio'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR EGRESO */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                Registrar Egreso Operativo
              </h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Categoría *</label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="SERVICIOS_BASICOS">Servicios Básicos (Luz/Agua)</option>
                    <option value="PLANILLA_PERSONAL">Planilla de Personal</option>
                    <option value="MANTENIMIENTO_OBRAS">Mantenimiento y Obras</option>
                    <option value="ADMINISTRATIVOS_LEGALES">Administrativos y Legales</option>
                    <option value="OTROS">Otros Gastos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fecha del Gasto *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Concepto / Motivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de recibo de luz Electrocentro de febrero 2026"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Beneficiario / Proveedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Electrocentro S.A."
                    value={expenseForm.beneficiary}
                    onChange={(e) => setExpenseForm({ ...expenseForm, beneficiary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Monto (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-rose-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tipo de Comprobante</label>
                  <select
                    value={expenseForm.documentType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, documentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="FACTURA">Factura</option>
                    <option value="BOLETA">Boleta de Venta</option>
                    <option value="RECIBO_HONORARIOS">Recibo por Honorarios</option>
                    <option value="DECLARACION_JURADA">Declaración Jurada</option>
                    <option value="VALE_CAJA">Vale de Caja Chica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">N° Comprobante / Recibo</label>
                  <input
                    type="text"
                    placeholder="Ej: F001-0004523"
                    value={expenseForm.documentNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload Comprobante Digital */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Comprobante Digital (Voucher / Foto)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs text-slate-600 flex items-center justify-center space-x-2 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>{uploadingVoucher ? 'Subiendo archivo...' : expenseForm.voucherUrl ? '✓ Archivo cargado (Click para cambiar)' : 'Adjuntar factura / foto / PDF'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                  </label>
                  {expenseForm.voucherUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewVoucherUrl(expenseForm.voucherUrl)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold"
                    >
                      Ver
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Descontar de Caja */}
              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100 flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="deductCash"
                  checked={expenseForm.deductFromCashRegister}
                  onChange={(e) => setExpenseForm({ ...expenseForm, deductFromCashRegister: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="deductCash" className="text-xs text-slate-700 font-bold cursor-pointer">
                  Descontar este monto directamente de la Caja Física Activa
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow"
                >
                  Guardar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW COMPROBANTE */}
      {previewVoucherUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-sm font-black uppercase text-slate-800">Comprobante de Egreso Adjunto</h3>
              <button onClick={() => setPreviewVoucherUrl(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex justify-center items-center max-h-[70vh] overflow-auto">
              {previewVoucherUrl.endsWith('.pdf') ? (
                <iframe src={previewVoucherUrl} className="w-full h-96 rounded-xl border border-slate-200" />
              ) : (
                <img
                  src={previewVoucherUrl}
                  alt="Comprobante"
                  className="max-w-full max-h-[60vh] object-contain rounded-xl border border-slate-200 shadow-sm"
                />
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <a
                href={previewVoucherUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Abrir en pestaña nueva
              </a>
              <button
                onClick={() => setPreviewVoucherUrl(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR OTRO INGRESO */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Registrar Otro Ingreso Extraordinario</h3>
                <p className="text-xs text-slate-400">Ingresos varios a caja física (alquiler de patio, eventos, multas, reciclaje, etc.)</p>
              </div>
              <button
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Concepto / Motivo de Ingreso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alquiler eventual de patio, Venta de cartón, Donación..."
                  value={incomeForm.concept}
                  onChange={(e) => setIncomeForm({ ...incomeForm, concept: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Monto en Soles (S/) *</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    required
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-emerald-800 text-base focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Medio de Pago</label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="EFECTIVO">Efectivo en Caja</option>
                    <option value="YAPE">Yape / Plin</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">N° Recibo / Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej: REC-0045"
                    value={incomeForm.receiptNumber}
                    onChange={(e) => setIncomeForm({ ...incomeForm, receiptNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales..."
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingIncome}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  {submittingIncome ? 'Registrando...' : 'Ingresar a Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
