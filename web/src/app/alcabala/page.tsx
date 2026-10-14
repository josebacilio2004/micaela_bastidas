'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Pencil,
  Trash2,
  History,
  FileText,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function SociosMantenimientoAguaPage() {
  const [activeTab, setActiveTab] = useState<'MANTENIMIENTO' | 'AGUA' | 'HISTORIAL_GENERAL'>('MANTENIMIENTO');

  // Core Data
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
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

  // History Modal State (Historial de Pagos por Socio individual)
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyMerchant, setHistoryMerchant] = useState<any>(null);
  const [merchantPaymentsList, setMerchantPaymentsList] = useState<any[]>([]);
  const [loadingMerchantPayments, setLoadingMerchantPayments] = useState(false);
  const [historyConceptFilter, setHistoryConceptFilter] = useState('ALL');

  // Create Socio Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    address: '',
    memberCondition: 'SOCIO_REGULAR',
    stallId: '',
    businessCategory: '',
  });
  const [creatingSocio, setCreatingSocio] = useState(false);

  // Edit Socio Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    address: '',
    memberCondition: 'SOCIO_REGULAR',
    stallId: '',
    businessCategory: '',
    status: 'ACTIVO',
  });
  const [updatingSocio, setUpdatingSocio] = useState(false);

  // Delete Socio Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSocio, setDeletingSocio] = useState<any>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [merchantsRes, paymentsRes, conceptsRes, currentRegRes, stallsRes, catsRes, typesRes] = await Promise.all([
        apiRequest('/merchants').catch(() => []),
        apiRequest('/payments?take=1000').catch(() => ({ items: [] })),
        apiRequest('/concepts').catch(() => []),
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/stalls').catch(() => []),
        apiRequest('/categories').catch(() => []),
        apiRequest('/merchant-types').catch(() => []),
      ]);

      setMerchants(Array.isArray(merchantsRes) ? merchantsRes : []);
      setPayments(Array.isArray(paymentsRes?.items) ? paymentsRes.items : []);
      setConcepts(Array.isArray(conceptsRes) ? conceptsRes : []);
      setActiveRegister(currentRegRes);
      setStalls(Array.isArray(stallsRes) ? stallsRes : []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
      setTypes(Array.isArray(typesRes) ? typesRes : []);
    } catch (err) {
      console.error('Error cargando datos de socios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Filter strictly for SOCIOS (Exactamente los 107 socios: Titulares y En Prueba)
  const socios = useMemo(() => {
    return merchants.filter((m) => {
      const typeCode = typeof m.merchantType === 'object' ? m.merchantType?.code : m.merchantType;
      const isSocio = typeCode === 'SOCIO' || m.internalCode?.startsWith('MB-COM-') || (!m.internalCode?.includes('AF-') && !m.internalCode?.includes('INQ-') && !m.internalCode?.includes('COC-'));
      if (!isSocio) return false;

      const isPrueba = m.memberCondition === 'SOCIO_EN_PRUEBA';

      if (memberTypeFilter === 'TITULAR') {
        return !isPrueba;
      }
      if (memberTypeFilter === 'PRUEBA') {
        return isPrueba;
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

  // Filtered rows for current active tab (MANTENIMIENTO vs AGUA)
  const rows = useMemo(() => {
    const concept = activeTab === 'MANTENIMIENTO' ? mantenimientoConcept : aguaConcept;
    const defaultFee = activeTab === 'MANTENIMIENTO' ? parseFloat(mantenimientoFee) || 15 : parseFloat(waterFee) || 4;

    return socios
      .map((socio) => {
        const paymentKey1 = `${socio.id}_${selectedMonth}_${concept?.id || ''}`;
        const paymentKey2 = `${socio.id}_${selectedMonth}_${concept?.code || ''}`;

        let payment = paymentsMap.get(paymentKey1) || paymentsMap.get(paymentKey2);
        if (!payment) {
          payment = payments.find(
            (p) =>
              p.merchantId === socio.id &&
              p.period === selectedMonth &&
              (activeTab === 'MANTENIMIENTO' ? !p.concept?.code?.includes('AGUA') : p.concept?.code?.includes('AGUA'))
          );
        }

        const isPaid = !!payment;
        const amount = payment ? Number(payment.amount) : defaultFee;

        // Count total historical payments for this socio
        const totalHistoricalPayments = payments.filter((p) => p.merchantId === socio.id).length;

        return {
          socio,
          isPaid,
          payment,
          amount,
          totalHistoricalPayments,
        };
      })
      .filter((row) => {
        if (statusFilter === 'PAID' && !row.isPaid) return false;
        if (statusFilter === 'PENDING' && row.isPaid) return false;

        if (search) {
          const s = search.toLowerCase();
          const fullName = `${row.socio.firstName || ''} ${row.socio.lastName || ''}`.toLowerCase();
          const dni = (row.socio.dni || '').toLowerCase();
          const stall = (row.socio.stall?.code || row.socio.stalls?.[0]?.stall?.code || row.socio.stallNumber || '').toLowerCase();
          return fullName.includes(s) || dni.includes(s) || stall.includes(s);
        }

        return true;
      });
  }, [socios, activeTab, selectedMonth, mantenimientoConcept, aguaConcept, mantenimientoFee, waterFee, paymentsMap, payments, statusFilter, search]);

  // General History Payments for Tab 3
  const generalHistoryList = useMemo(() => {
    const socioIds = new Set(socios.map((s) => s.id));
    return payments
      .filter((p) => socioIds.has(p.merchantId))
      .filter((p) => {
        if (search) {
          const s = search.toLowerCase();
          const sName = `${p.merchant?.lastName || ''} ${p.merchant?.firstName || ''}`.toLowerCase();
          const dni = (p.merchant?.dni || '').toLowerCase();
          const op = (p.operationNumber || '').toLowerCase();
          return sName.includes(s) || dni.includes(s) || op.includes(s);
        }
        return true;
      })
      .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());
  }, [payments, socios, search]);

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

  // Open Individual Socio Payment History
  const handleOpenSocioHistory = async (socio: any) => {
    setHistoryMerchant(socio);
    setLoadingMerchantPayments(true);
    setHistoryModalOpen(true);
    try {
      const res = await apiRequest(`/payments?merchantId=${socio.id}&take=200`);
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setMerchantPaymentsList(items);
    } catch (err) {
      // Fallback: filter from preloaded payments
      const local = payments.filter((p) => p.merchantId === socio.id);
      setMerchantPaymentsList(local);
    } finally {
      setLoadingMerchantPayments(false);
    }
  };

  // Filtered payments inside the Socio History modal
  const filteredMerchantPayments = useMemo(() => {
    return merchantPaymentsList.filter((p) => {
      if (historyConceptFilter === 'MANTENIMIENTO') {
        return !p.concept?.code?.includes('AGUA') && !p.concept?.code?.includes('MULTA');
      }
      if (historyConceptFilter === 'AGUA') {
        return p.concept?.code?.includes('AGUA');
      }
      if (historyConceptFilter === 'MULTAS') {
        return p.concept?.code?.includes('MULTA') || p.concept?.code?.includes('FALTA');
      }
      return true;
    });
  }, [merchantPaymentsList, historyConceptFilter]);

  // CRUD: Open Create Socio Modal
  const handleOpenCreateSocio = () => {
    setCreateForm({
      firstName: '',
      lastName: '',
      dni: '',
      phone: '',
      address: '',
      memberCondition: 'SOCIO_REGULAR',
      stallId: '',
      businessCategory: categories[0]?.name || 'Abarrotes y Verduras',
    });
    setCreateModalOpen(true);
  };

  // CRUD: Submit Create Socio
  const handleSubmitCreateSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.dni.trim()) {
      alert('Nombres, apellidos y DNI son obligatorios');
      return;
    }
    setCreatingSocio(true);
    try {
      const socioType = types.find((t) => t.code === 'SOCIO');
      if (!socioType) throw new Error('No se encontró el tipo de comerciante SOCIO en el sistema');

      const payload: any = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        dni: createForm.dni.trim(),
        phone: createForm.phone.trim() || undefined,
        address: createForm.address.trim() || undefined,
        merchantTypeId: socioType.id,
        memberCondition: createForm.memberCondition,
        stallId: createForm.stallId || undefined,
        businessCategory: createForm.businessCategory.trim() || undefined,
      };

      await apiRequest('/merchants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('✓ Socio agregado exitosamente al padrón');
      setCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al crear socio');
    } finally {
      setCreatingSocio(false);
    }
  };

  // CRUD: Open Edit Socio Modal
  const handleOpenEditSocio = (socio: any) => {
    setEditingSocio(socio);
    setEditForm({
      firstName: socio.firstName || '',
      lastName: socio.lastName || '',
      dni: socio.dni || '',
      phone: socio.phone || '',
      address: socio.address || '',
      memberCondition: socio.memberCondition || 'SOCIO_REGULAR',
      stallId: socio.stallId || socio.stall?.id || '',
      businessCategory: socio.businessCategory || '',
      status: socio.status || 'ACTIVO',
    });
    setEditModalOpen(true);
  };

  // CRUD: Submit Update Socio
  const handleSubmitUpdateSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocio) return;
    setUpdatingSocio(true);
    try {
      const socioType = types.find((t) => t.code === 'SOCIO');
      const payload: any = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        dni: editForm.dni.trim(),
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
        merchantTypeId: socioType?.id || editingSocio.merchantTypeId,
        memberCondition: editForm.memberCondition,
        stallId: editForm.stallId || null,
        businessCategory: editForm.businessCategory.trim() || undefined,
        status: editForm.status,
      };

      await apiRequest(`/merchants/${editingSocio.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      alert('✓ Datos del socio actualizados exitosamente');
      setEditModalOpen(false);
      setEditingSocio(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar socio');
    } finally {
      setUpdatingSocio(false);
    }
  };

  // CRUD: Open Delete Socio Modal
  const handleOpenDeleteSocio = (socio: any) => {
    setDeletingSocio(socio);
    setDeleteModalOpen(true);
  };

  // CRUD: Confirm Delete Socio
  const handleConfirmDeleteSocio = async () => {
    if (!deletingSocio) return;
    setDeletingLoading(true);
    try {
      await apiRequest(`/merchants/${deletingSocio.id}`, {
        method: 'DELETE',
      });
      alert(`✓ Socio ${deletingSocio.lastName} ${deletingSocio.firstName} dado de baja exitosamente.`);
      setDeleteModalOpen(false);
      setDeletingSocio(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al dar de baja al socio');
    } finally {
      setDeletingLoading(false);
    }
  };

  // Print Thermal 80mm Receipt Dialog
  const handlePrintReceipt = (payment: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const opNum = payment.operationNumber || `REC-${Date.now().toString().slice(-6)}`;
    const fecha = new Date(payment.paidAt || Date.now()).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const sName = `${payment.merchant?.lastName || ''} ${payment.merchant?.firstName || ''}`.trim();
    const stall = payment.merchant?.stall?.code || payment.merchant?.stallNumber || 'Pab. Central';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo de Cobranza - ${opNum}</title>
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
          <div class="center" style="font-size: 8.5pt;">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES</div>
          <div class="center" style="font-size: 8.5pt;">RUC: 20481234567 • VILLA EL SALVADOR</div>
          <div class="divider"></div>
          <div class="center bold">${payment.concept?.name || 'RECIBO DE COBRANZA - SOCIO'}</div>
          <div class="row"><span>RECIBO:</span><span class="bold">${opNum}</span></div>
          <div class="row"><span>FECHA:</span><span>${fecha}</span></div>
          <div class="row"><span>PERIODO:</span><span class="bold">${payment.period || selectedMonth}</span></div>
          <div class="row"><span>MEDIO:</span><span>${payment.paymentMethod || 'EFECTIVO'}</span></div>
          <div class="divider"></div>
          <div class="row"><span>SOCIO:</span><span class="bold">${sName}</span></div>
          <div class="row"><span>DNI:</span><span>${payment.merchant?.dni || '-'}</span></div>
          <div class="row"><span>PUESTO:</span><span class="bold">${stall}</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9pt;">TOTAL CANCELADO</div>
          <div class="amount">S/ ${Number(payment.amount).toFixed(2)}</div>
          <div class="divider"></div>
          <div class="center" style="font-size: 8.5pt;">¡Gracias por su puntual aporte!<br>Consejo Directivo</div>
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

  // Stats calculation
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
            Mantenimiento de Socios & Agua Potable
          </h1>
          <p className="text-xs text-slate-500">
            Control de cuotas de mantenimiento, servicio de agua potable, gestión completa (CRUD) e historial de pagos de los 107 socios.
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

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreateSocio}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Socio</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
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

        <button
          onClick={() => setActiveTab('HISTORIAL_GENERAL')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'HISTORIAL_GENERAL'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>3. Historial General de Pagos</span>
        </button>
      </div>

      {/* TAB 1 & 2: MANTENIMIENTO / AGUA */}
      {activeTab !== 'HISTORIAL_GENERAL' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <span className="text-[11px] font-black uppercase text-slate-400 block">Total Socios en Padrón</span>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.totalSocios}</p>
              <span className="text-[11px] text-slate-400">102 titulares • 5 en prueba</span>
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
            {/* Filters Bar */}
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
                  <option value="TITULAR">Titulares</option>
                  <option value="PRUEBA">En Prueba</option>
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
                  placeholder="Buscar por socio, DNI o puesto..."
                  className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-64"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[550px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">N°</th>
                    <th className="p-3">Socio / Comerciante</th>
                    <th className="p-3">DNI</th>
                    <th className="p-3">Puesto / Espacio</th>
                    <th className="p-3">Condición</th>
                    <th className="p-3 text-right">Monto (S/)</th>
                    <th className="p-3 text-center">Estado Mes</th>
                    <th className="p-3 text-center">Acciones y Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                        No se encontraron socios que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const s = row.socio;
                      const stallName = s.stall?.code || s.stalls?.[0]?.stall?.code || s.stallNumber || 'Pab. Central';
                      const isTitular = s.memberCondition === 'SOCIO_REGULAR';

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
                            <div className="flex items-center justify-center gap-1.5 font-sans">
                              {/* Cobrar o Imprimir Recibo del mes */}
                              {row.isPaid ? (
                                <button
                                  onClick={() => handlePrintReceipt(row.payment)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                  title="Imprimir Recibo de este mes"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenPay(s, activeTab === 'AGUA' ? 'AGUA' : 'MANTENIMIENTO')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1"
                                  title="Cobrar cuota mensual"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Cobrar</span>
                                </button>
                              )}

                              {/* Historial de Pagos del Socio */}
                              <button
                                onClick={() => handleOpenSocioHistory(s)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition"
                                title="Ver Historial Completo de Pagos de este Socio"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Socio (CRUD) */}
                              <button
                                onClick={() => handleOpenEditSocio(s)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                                title="Editar Socio"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Borrar Socio (CRUD) */}
                              <button
                                onClick={() => handleOpenDeleteSocio(s)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition"
                                title="Dar de baja / Borrar Socio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </>
      )}

      {/* TAB 3: HISTORIAL GENERAL DE PAGOS */}
      {activeTab === 'HISTORIAL_GENERAL' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Historial General de Pagos Realizados por Socios
              </h3>
              <p className="text-xs text-slate-500">
                Registro cronológico consolidado de cobros de mantenimiento, agua y sanciones de los 107 socios.
              </p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por socio, DNI o N° Recibo..."
                className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-72"
              />
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[550px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">N° Recibo</th>
                  <th className="p-3">Socio</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Medio de Pago</th>
                  <th className="p-3 text-right">Monto (S/)</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {generalHistoryList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                      No se encontraron registros de pagos.
                    </td>
                  </tr>
                ) : (
                  generalHistoryList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {new Date(p.paidAt).toLocaleDateString('es-PE', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{p.operationNumber || '-'}</td>
                      <td className="p-3 font-sans">
                        <span className="font-bold text-slate-900 block">
                          {p.merchant?.lastName} {p.merchant?.firstName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">DNI: {p.merchant?.dni || '-'}</span>
                      </td>
                      <td className="p-3 font-sans text-slate-700">
                        {p.concept?.name || 'Aporte de Socio'}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{p.period || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.paymentMethod || 'EFECTIVO'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-emerald-800 text-sm">
                        S/ {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handlePrintReceipt(p)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Reimprimir Recibo Térmico"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE PAGOS DE UN SOCIO INDIVIDUAL */}
      {historyModalOpen && historyMerchant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Historial de Pagos y Aportes
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">
                  {historyMerchant.lastName} {historyMerchant.firstName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>DNI: <strong className="font-mono text-slate-700">{historyMerchant.dni}</strong></span>
                  <span>Puesto: <strong className="text-slate-700">{historyMerchant.stall?.code || historyMerchant.stallNumber || 'S/P'}</strong></span>
                  <span>Condición: <strong className="text-slate-700">{historyMerchant.memberCondition === 'SOCIO_REGULAR' ? 'Titular' : 'En Prueba'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aggregated Stats for this Socio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Aportado en el Sistema</span>
                <span className="text-lg font-black text-emerald-800 font-mono block mt-0.5">
                  S/ {filteredMerchantPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Comprobantes Emitidos</span>
                <span className="text-lg font-black text-slate-800 font-mono block mt-0.5">
                  {filteredMerchantPayments.length} Pagos Registrados
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Último Pago</span>
                <span className="text-xs font-bold text-slate-700 block mt-1">
                  {filteredMerchantPayments.length > 0
                    ? new Date(filteredMerchantPayments[0].paidAt).toLocaleDateString('es-PE')
                    : 'Sin registros'}
                </span>
              </div>
            </div>

            {/* Filter buttons inside modal */}
            <div className="flex gap-1.5 border-b border-slate-100 pb-2">
              <button
                onClick={() => setHistoryConceptFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  historyConceptFilter === 'ALL'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos los Pagos ({merchantPaymentsList.length})
              </button>
              <button
                onClick={() => setHistoryConceptFilter('MANTENIMIENTO')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  historyConceptFilter === 'MANTENIMIENTO'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Mantenimiento
              </button>
              <button
                onClick={() => setHistoryConceptFilter('AGUA')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  historyConceptFilter === 'AGUA'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Agua Potable
              </button>
              <button
                onClick={() => setHistoryConceptFilter('MULTAS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  historyConceptFilter === 'MULTAS'
                    ? 'bg-rose-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sanciones / Multas
              </button>
            </div>

            {/* Payments List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Fecha y Hora</th>
                    <th className="p-2.5">N° Recibo</th>
                    <th className="p-2.5">Concepto</th>
                    <th className="p-2.5">Periodo</th>
                    <th className="p-2.5">Medio</th>
                    <th className="p-2.5 text-right">Monto (S/)</th>
                    <th className="p-2.5 text-center">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {loadingMerchantPayments ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                        Cargando historial de pagos...
                      </td>
                    </tr>
                  ) : filteredMerchantPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                        No se registran pagos en este concepto para este socio.
                      </td>
                    </tr>
                  ) : (
                    filteredMerchantPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">
                          {new Date(p.paidAt).toLocaleDateString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{p.operationNumber || '-'}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-700">
                          {p.concept?.name || 'Aporte de Socio'}
                        </td>
                        <td className="p-2.5 font-bold text-slate-600">{p.period || '-'}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.paymentMethod || 'EFECTIVO'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-800 text-sm">
                          S/ {Number(p.amount).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handlePrintReceipt(p)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Reimprimir Comprobante Térmico"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO SOCIO (CRUD) */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Agregar Nuevo Socio al Mercado
                </h3>
                <p className="text-xs text-slate-500">Incorpore un socio titular o en prueba al padrón oficial.</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateSocio} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Juan Carlos"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Pérez Gómez"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI (8 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    placeholder="12345678"
                    value={createForm.dni}
                    onChange={(e) => setCreateForm({ ...createForm, dni: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="999888777"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condición Estatutaria *</label>
                  <select
                    value={createForm.memberCondition}
                    onChange={(e) => setCreateForm({ ...createForm, memberCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SOCIO_REGULAR">Socio Titular</option>
                    <option value="SOCIO_EN_PRUEBA">Socio en Prueba</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puesto Asignado</label>
                  <select
                    value={createForm.stallId}
                    onChange={(e) => setCreateForm({ ...createForm, stallId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sin Puesto Asignado (General)</option>
                    {stalls
                      .filter((st) => st.status === 'LIBRE' || st.id === createForm.stallId)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.code} ({st.sector?.name || 'Sector'}) - S/ {st.dailyRate || '5.00'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Giro / Rubro Comercial</label>
                <input
                  type="text"
                  placeholder="ej. Verduras, Carnicería, Abarrotes..."
                  value={createForm.businessCategory}
                  onChange={(e) => setCreateForm({ ...createForm, businessCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección de Domicilio (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Mz. A Lt. 12 Sector 2 Grupo 15, Villa El Salvador"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingSocio}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  {creatingSocio ? 'Guardando...' : 'Registrar Socio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR SOCIO (CRUD) */}
      {editModalOpen && editingSocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Editar Datos del Socio
                </h3>
                <p className="text-xs text-slate-500">
                  Actualice información de padrón para {editingSocio.internalCode}
                </p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUpdateSocio} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI *</label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    value={editForm.dni}
                    onChange={(e) => setEditForm({ ...editForm, dni: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condición *</label>
                  <select
                    value={editForm.memberCondition}
                    onChange={(e) => setEditForm({ ...editForm, memberCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SOCIO_REGULAR">Titular</option>
                    <option value="SOCIO_EN_PRUEBA">En Prueba</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puesto Asignado</label>
                  <select
                    value={editForm.stallId}
                    onChange={(e) => setEditForm({ ...editForm, stallId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sin Puesto (General)</option>
                    {stalls
                      .filter((st) => st.status === 'LIBRE' || st.id === editForm.stallId)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.code} ({st.sector?.name || 'Sector'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Giro / Rubro Comercial</label>
                <input
                  type="text"
                  value={editForm.businessCategory}
                  onChange={(e) => setEditForm({ ...editForm, businessCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingSocio}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  {updatingSocio ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR SOCIO (CRUD) */}
      {deleteModalOpen && deletingSocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  ¿Dar de baja o Borrar Socio?
                </h3>
                <p className="text-xs text-rose-600 font-bold">Acción sobre el padrón del mercado</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Está seguro de que desea dar de baja al socio{' '}
              <strong className="text-slate-900">
                {deletingSocio.lastName} {deletingSocio.firstName}
              </strong>{' '}
              (DNI: <span className="font-mono">{deletingSocio.dni}</span>)? El puesto asignado quedará libre en el sistema.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={handleConfirmDeleteSocio}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingLoading ? 'Eliminando...' : 'Sí, Dar de Baja'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-[10px] text-slate-500 font-normal">RUC: 20481234567</p>
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
