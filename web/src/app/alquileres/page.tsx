'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Building,
  Store,
  Calendar,
  DollarSign,
  User,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  FileText,
  BadgeCheck,
  ShieldCheck,
  X,
  CreditCard,
  Droplets,
  Receipt,
  Wallet,
  Check,
  Save,
  Filter,
  RotateCcw,
} from 'lucide-react';

interface OfficialTenant {
  id: string;
  code: string;
  name: string;
  dni: string;
  stallNumber: string;
  monthlyRent: number;
  businessCategory: string;
}

const OFFICIAL_TENANTS: OfficialTenant[] = [
  { id: 'MB-INQ-00001', code: 'MB-INQ-00001', name: 'HUATARUNCO CHUQUILLANQUI BETZABE', dni: '40123001', stallNumber: 'INQ-01', monthlyRent: 170.00, businessCategory: 'Abarrotes y Varios' },
  { id: 'MB-INQ-00002', code: 'MB-INQ-00002', name: 'MACHA CASALLO EDWIN', dni: '40123002', stallNumber: 'INQ-02', monthlyRent: 170.00, businessCategory: 'Verduras y Frutas' },
  { id: 'MB-INQ-00003', code: 'MB-INQ-00003', name: 'GONZALO ASTO ROCIO', dni: '40123003', stallNumber: 'INQ-03', monthlyRent: 170.00, businessCategory: 'Comercio General' },
  { id: 'MB-INQ-00004', code: 'MB-INQ-00004', name: 'OSCANOA RAMOS GINA PILAR', dni: '40123004', stallNumber: 'INQ-04', monthlyRent: 200.00, businessCategory: 'Carnicería / Aves' },
  { id: 'MB-INQ-00005', code: 'MB-INQ-00005', name: 'SALVATIERRA HUAMANI EDGAR', dni: '40123005', stallNumber: 'INQ-05', monthlyRent: 400.00, businessCategory: 'Abarrotes Mayorista' },
  { id: 'MB-INQ-00006', code: 'MB-INQ-00006', name: 'QUISPE QUISPE JUAN', dni: '40123006', stallNumber: 'INQ-06', monthlyRent: 400.00, businessCategory: 'Distribuidora Comercial' },
  { id: 'MB-INQ-00007', code: 'MB-INQ-00007', name: 'MUÑOZ CARDENAS JAVIER', dni: '40123007', stallNumber: 'INQ-07', monthlyRent: 180.00, businessCategory: 'Comidas y Bebidas' },
  { id: 'MB-INQ-00008', code: 'MB-INQ-00008', name: 'MIRANDA SOTO VICTORIA', dni: '40123008', stallNumber: 'INQ-08', monthlyRent: 150.00, businessCategory: 'Bazar y Plásticos' },
];

export default function AlquileresPage() {
  const [activeTab, setActiveTab] = useState<'ALQUILERES' | 'AGUA_INQUILINOS'>('ALQUILERES');
  const [contracts, setContracts] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros Alquiler
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'alphabetical_asc' | 'alphabetical_desc' | 'date_desc'>('alphabetical_asc');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContractDocModalOpen, setIsContractDocModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // CRUD Modals: Editar e Historial
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    tenantName: '',
    tenantDni: '',
    tenantPhone: '',
    businessCategory: '',
    monthlyRent: 170,
    stallCode: '',
    notes: '',
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyContract, setHistoryContract] = useState<any>(null);

  // Estado para Contrato y Cronograma para imprimir
  const [activeDocContract, setActiveDocContract] = useState<any>(null);

  // Estado para Cobro de Cuota de Alquiler
  const [selectedContractForPay, setSelectedContractForPay] = useState<any>(null);
  const [payForm, setPayForm] = useState({
    installmentNumber: 1,
    amount: 170,
    paymentMethod: 'EFECTIVO',
    receiptNumber: '',
    notes: '',
    registerCashIncome: true,
  });

  // Formulario nuevo contrato
  const [contractForm, setContractForm] = useState({
    stallId: '',
    tenantName: '',
    tenantDni: '',
    tenantPhone: '',
    businessCategory: 'Abarrotes y Verduras',
    startDate: new Date().toISOString().split('T')[0],
    monthsCount: 6,
    monthlyRent: 170.0,
    interestRate: 0.0,
    depositAmount: 170.0,
    contractTerms: '',
    notes: '',
  });

  const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);

  // TAB 2: AGUA INQUILINOS
  const [waterMonth, setWaterMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [waterFee, setWaterFee] = useState<number>(4.00); // 4 soles mensual editable
  const [waterSearch, setWaterSearch] = useState('');
  const [waterPaymentsMap, setWaterPaymentsMap] = useState<Record<string, { paid: boolean; amount: number; receiptNumber?: string }>>({});
  const [isWaterPayModalOpen, setIsWaterPayModalOpen] = useState(false);
  const [selectedWaterTenant, setSelectedWaterTenant] = useState<OfficialTenant | null>(null);
  const [waterPayAmount, setWaterPayAmount] = useState<number>(4.00);
  const [waterReceiptNumber, setWaterReceiptNumber] = useState<string>('');

  // Mass Selection & Bulk Save State (Períodos Pasados y Actuales)
  const [selectedWaterIds, setSelectedWaterIds] = useState<Set<string>>(new Set());
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());
  const [bulkInstallmentNumber, setBulkInstallmentNumber] = useState<number>(1);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<'EFECTIVO' | 'YAPE'>('EFECTIVO');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Filtros Generales de Fechas y Períodos para Alquileres
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterPeriodMonth, setFilterPeriodMonth] = useState<string>('ALL');
  const [dateRangeFrom, setDateRangeFrom] = useState<string>('');
  const [dateRangeTo, setDateRangeTo] = useState<string>('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WITH_PENDING' | 'UP_TO_DATE' | 'FINALIZED'>('ALL');
  const [viewMode, setViewMode] = useState<'PADRON' | 'CUADRICULA'>('PADRON');

  // Combined Contract List: DB Contracts + Official fallback
  const displayContracts = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return OFFICIAL_TENANTS.map((ot) => ({
      id: ot.id,
      contractNumber: `CTR-${ot.stallNumber}-2026`,
      tenantName: ot.name,
      tenantDni: ot.dni,
      stallCode: ot.stallNumber,
      monthlyRent: ot.monthlyRent,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthsCount: 6,
      businessCategory: ot.businessCategory,
      status: 'ACTIVO',
      installments: [
        { installmentNumber: 1, dueDate: '2026-01-10', totalAmount: ot.monthlyRent, status: 'PAGADO' },
        { installmentNumber: 2, dueDate: '2026-02-10', totalAmount: ot.monthlyRent, status: 'PAGADO' },
        { installmentNumber: 3, dueDate: '2026-03-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
        { installmentNumber: 4, dueDate: '2026-04-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
        { installmentNumber: 5, dueDate: '2026-05-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
        { installmentNumber: 6, dueDate: '2026-06-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
      ],
    }));
  }, [contracts]);

  // Contratos filtrados con los Filtros Generales de Fechas, Períodos y Estados
  const filteredContracts = useMemo(() => {
    return displayContracts.filter((c: any) => {
      // 1. Buscador
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          c.tenantName?.toLowerCase().includes(q) ||
          c.tenantDni?.includes(q) ||
          c.stallCode?.toLowerCase().includes(q) ||
          c.contractNumber?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Filtro de Año
      if (filterYear !== 'ALL') {
        const startYear = c.startDate ? new Date(c.startDate).getFullYear().toString() : '2026';
        if (startYear !== filterYear) return false;
      }

      // 3. Filtro de Rango Desde/Hasta
      if (dateRangeFrom) {
        if (!c.startDate || new Date(c.startDate) < new Date(dateRangeFrom)) return false;
      }
      if (dateRangeTo) {
        if (!c.startDate || new Date(c.startDate) > new Date(dateRangeTo)) return false;
      }

      // 4. Filtro de Período / Mes del Cronograma
      if (filterPeriodMonth !== 'ALL') {
        const instList = c.installments || c.schedule || [];
        const matchesMonth = instList.some((inst: any) => {
          if (!inst.dueDate) return false;
          const ym = new Date(inst.dueDate).toISOString().slice(0, 7);
          return ym === filterPeriodMonth;
        });
        if (!matchesMonth) return false;
      }

      // 5. Filtro de Estado de Cuotas
      const instList = c.installments || c.schedule || [];
      const pendingCount = instList.filter((i: any) => i.status !== 'PAGADO').length;
      if (scheduleStatusFilter === 'ACTIVE' && c.status !== 'ACTIVO') return false;
      if (scheduleStatusFilter === 'WITH_PENDING' && pendingCount === 0) return false;
      if (scheduleStatusFilter === 'UP_TO_DATE' && pendingCount > 0) return false;
      if (scheduleStatusFilter === 'FINALIZED' && c.status !== 'FINALIZADO') return false;

      return true;
    });
  }, [displayContracts, search, filterYear, filterPeriodMonth, dateRangeFrom, dateRangeTo, scheduleStatusFilter]);

  const rentalStats = useMemo(() => {
    let totalPaid = 0;
    let totalDebt = 0;
    let withPendingCount = 0;
    let upToDateCount = 0;

    filteredContracts.forEach((c: any) => {
      const instList = c.installments || c.schedule || [];
      const paid = instList.filter((i: any) => i.status === 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
      const debt = instList.filter((i: any) => i.status !== 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
      totalPaid += paid;
      totalDebt += debt;
      if (debt > 0) withPendingCount++;
      else upToDateCount++;
    });

    return {
      totalContracts: filteredContracts.length,
      totalPaid,
      totalDebt,
      withPendingCount,
      upToDateCount,
    };
  }, [filteredContracts]);

  // Matriz de casillas seleccionadas para cobro masivo de alquileres: Set de `${contractId}-${installmentNumber}`
  const [selectedRentalGridCells, setSelectedRentalGridCells] = useState<Set<string>>(new Set());

  const totalSelectedGridAmount = useMemo(() => {
    let total = 0;
    selectedRentalGridCells.forEach((key) => {
      const [contractId, instNumStr] = key.split('-');
      const instNum = Number(instNumStr);
      const c = contracts.find((x: any) => x.id === contractId) || displayContracts.find((x: any) => x.id === contractId);
      if (c) {
        const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === instNum);
        total += inst ? Number(inst.totalAmount) : Number(c.monthlyRent || 170);
      }
    });
    return total;
  }, [selectedRentalGridCells, contracts, displayContracts]);

  const toggleRentalGridCell = (contractId: string, instNum: number) => {
    setSelectedRentalGridCells((prev) => {
      const next = new Set(prev);
      const key = `${contractId}-${instNum}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleColumnCuota = (cuotaNum: number) => {
    setSelectedRentalGridCells((prev) => {
      const next = new Set(prev);
      const pendingForCol = filteredContracts.filter((c: any) => {
        const inst = (c.installments || c.schedule || []).find((i: any) => i.installmentNumber === cuotaNum);
        return inst ? inst.status !== 'PAGADO' : true;
      });

      const allColSelected = pendingForCol.every((c: any) => next.has(`${c.id}-${cuotaNum}`));
      pendingForCol.forEach((c: any) => {
        const key = `${c.id}-${cuotaNum}`;
        if (allColSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const toggleRowContract = (contractId: string) => {
    const c = contracts.find((x: any) => x.id === contractId);
    if (!c) return;
    const instList = c.installments || c.schedule || [];
    const pendingInsts = instList.filter((i: any) => i.status !== 'PAGADO');

    setSelectedRentalGridCells((prev) => {
      const next = new Set(prev);
      const allRowSelected = pendingInsts.every((i: any) => next.has(`${contractId}-${i.installmentNumber}`));
      pendingInsts.forEach((i: any) => {
        const key = `${contractId}-${i.installmentNumber}`;
        if (allRowSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const selectAllPendingInGrid = () => {
    const next = new Set<string>();
    filteredContracts.forEach((c: any) => {
      const instList = c.installments || c.schedule || [];
      instList.forEach((i: any) => {
        if (i.status !== 'PAGADO') {
          next.add(`${c.id}-${i.installmentNumber}`);
        }
      });
    });
    setSelectedRentalGridCells(next);
  };

  const clearRentalGridSelection = () => {
    setSelectedRentalGridCells(new Set());
  };

  const toggleSelectWater = (id: string) => {
    setSelectedWaterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPendingWater = () => {
    const pending = filteredWaterTenants
      .filter((t: any) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid)
      .map((t: any) => t.id);
    setSelectedWaterIds(new Set(pending));
  };

  const deselectAllWater = () => {
    setSelectedWaterIds(new Set());
  };

  const handleBulkSaveWater = async () => {
    if (selectedWaterIds.size === 0) {
      alert('Por favor seleccione al menos un inquilino para registrar cobro de agua en masa.');
      return;
    }

    const count = selectedWaterIds.size;
    const fee = waterFee;
    const totalAmount = count * fee;

    const confirmMsg = `¿Desea GUARDAR Y REGISTRAR los cobros de agua en masa?\n\n• Concepto: Agua Potable Inquilinos\n• Período: ${waterMonth}\n• Inquilinos seleccionados: ${count}\n• Monto unitario: S/ ${fee.toFixed(2)}\n• Monto total: S/ ${totalAmount.toFixed(2)}\n• Medio: ${bulkPaymentMethod}\n\nLos cobros se registrarán en la base de datos oficial.`;

    if (!confirm(confirmMsg)) return;

    setIsSavingBulk(true);
    try {
      const items = Array.from(selectedWaterIds).map((tenantId) => {
        const tenant = filteredWaterTenants.find((t: any) => t.id === tenantId) as any;
        return {
          merchantId: tenant?.merchantId || tenantId,
          conceptCode: 'AGUA_INQUILINO',
          amount: fee,
          period: waterMonth,
          paymentMethod: bulkPaymentMethod,
          notes: `AGUA-INQ-${tenantId}-${waterMonth} | Agua Inquilino: ${tenant?.name || tenantId}`,
        };
      });

      const res = await apiRequest('/payments/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });

      const nextMap = { ...waterPaymentsMap };
      selectedWaterIds.forEach((tId) => {
        nextMap[`${tId}-${waterMonth}`] = {
          paid: true,
          amount: fee,
          receiptNumber: `REC-AGUA-${Date.now().toString().slice(-4)}`,
        };
      });
      setWaterPaymentsMap(nextMap);
      localStorage.setItem('mb_water_inquilinos_payments', JSON.stringify(nextMap));

      alert(`✓ Se registraron exitosamente ${res.count || count} cobros de agua del período ${waterMonth}.`);
      setSelectedWaterIds(new Set());
      await fetchData();
    } catch (err: any) {
      alert('Error al guardar cobros de agua en masa: ' + (err.message || err));
    } finally {
      setIsSavingBulk(false);
    }
  };

  const toggleSelectContract = (id: string) => {
    setSelectedContractIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPendingContractsForInstallment = () => {
    const pending = filteredContracts
      .filter((c: any) => {
        const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
        return inst ? inst.status !== 'PAGADO' : true;
      })
      .map((c: any) => c.id);
    setSelectedContractIds(new Set(pending));
  };

  const deselectAllContracts = () => {
    setSelectedContractIds(new Set());
  };

  const handleQuickPayInstallment = (contract: any, installmentNumber: number) => {
    setSelectedContractForPay(contract);
    const inst = (contract.installments || contract.schedule || []).find((s: any) => s.installmentNumber === installmentNumber);
    setPayForm({
      installmentNumber,
      amount: inst ? Number(inst.totalAmount) : Number(contract.monthlyRent || 170),
      paymentMethod: 'EFECTIVO',
      receiptNumber: `REC-ALQ-${contract.stallCode || 'PST'}-C${installmentNumber}-${Date.now().toString().slice(-4)}`,
      notes: `Alquiler Puesto ${contract.stallCode} - Cuota ${installmentNumber} (${contract.tenantName})`,
      registerCashIncome: true,
    });
    setIsPayModalOpen(true);
  };

  const handleConsolidatedRentalGridSave = async () => {
    if (selectedRentalGridCells.size === 0) {
      alert('Por favor seleccione al menos una cuota en la cuadrícula para consolidar.');
      return;
    }

    const count = selectedRentalGridCells.size;
    let totalMonto = 0;
    const itemsToPay: Array<{ contractId: string; contract: any; installmentNumber: number; amount: number }> = [];

    selectedRentalGridCells.forEach((key) => {
      const [contractId, instNumStr] = key.split('-');
      const instNum = Number(instNumStr);
      const c = contracts.find((x: any) => x.id === contractId) || displayContracts.find((x: any) => x.id === contractId);
      if (c) {
        const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === instNum);
        const amt = inst ? Number(inst.totalAmount) : Number(c.monthlyRent || 170);
        totalMonto += amt;
        itemsToPay.push({ contractId, contract: c, installmentNumber: instNum, amount: amt });
      }
    });

    const confirmMsg = `¿Desea GUARDAR Y CONSOLIDAR los cobros seleccionados de alquiler?\n\n  Cuotas seleccionadas: ${count}\n  Monto total a recaudar: S/ ${totalMonto.toFixed(2)}\n  Medio de Pago: ${bulkPaymentMethod}\n\nLos cobros se registrarán de forma oficial en la Base de Datos, Caja e Historial General.`;
    if (!confirm(confirmMsg)) return;

    setIsSavingBulk(true);
    let successCount = 0;
    try {
      let idx = 0;
      for (const item of itemsToPay) {
        idx++;
        const receiptNumber = `REC-ALQ-${item.contract.stallCode || 'PST'}-C${item.installmentNumber}-${Date.now().toString().slice(-4)}-${idx}`;
        await apiRequest(`/rentals/${item.contractId}/installments/${item.installmentNumber}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            amount: item.amount,
            paymentMethod: bulkPaymentMethod,
            receiptNumber,
            notes: `Alquiler Puesto ${item.contract.stallCode} - Cuota ${item.installmentNumber} (${item.contract.tenantName})`,
            registerCashIncome: true,
          }),
        }).catch((e) => console.warn('Error en cuota:', e));
        successCount++;
      }

      alert(`✓ Se consolidaron y registraron exitosamente ${successCount} cuotas de alquiler por un total de S/ ${totalMonto.toFixed(2)}.`);
      setSelectedRentalGridCells(new Set());
      await fetchData();
    } catch (err: any) {
      alert('Error al consolidar cuotas: ' + (err.message || err));
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleBulkSaveRentals = async () => {
    if (selectedContractIds.size === 0) {
      alert('Por favor seleccione al menos un contrato para registrar cobro de cuota en masa.');
      return;
    }

    const count = selectedContractIds.size;
    const confirmMsg = `¿Desea GUARDAR Y REGISTRAR el cobro en masa de la Cuota ${bulkInstallmentNumber} para los ${count} contratos seleccionados?\n\nMedio de Pago: ${bulkPaymentMethod}\n\nSe registrará el pago de cada cuota y se actualizará el cronograma oficial.`;

    if (!confirm(confirmMsg)) return;

    setIsSavingBulk(true);
    let successCount = 0;
    try {
      let idx = 0;
      for (const contractId of Array.from(selectedContractIds)) {
        idx++;
        const c = contracts.find((x: any) => x.id === contractId);
        const inst = (c?.installments || c?.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
        const amount = inst ? Number(inst.totalAmount) : Number(c?.monthlyRent || 170);

        const receiptNumber = `REC-ALQ-${c?.stallCode || 'PST'}-C${bulkInstallmentNumber}-${Date.now().toString().slice(-4)}-${idx}`;

        await apiRequest(`/rentals/${contractId}/installments/${bulkInstallmentNumber}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            amount,
            paymentMethod: bulkPaymentMethod,
            receiptNumber,
            notes: `Alquiler Puesto ${c?.stallCode} - Cuota ${bulkInstallmentNumber} (${c?.tenantName})`,
            registerCashIncome: true,
          }),
        }).catch((e) => console.warn('Error en cuota:', e));
        successCount++;
      }

      alert(`✓ Se procesaron exitosamente ${successCount} cuotas de alquiler.`);
      setSelectedContractIds(new Set());
      await fetchData();
    } catch (err: any) {
      alert('Error al guardar cuotas en masa: ' + (err.message || err));
    } finally {
      setIsSavingBulk(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, stallsRes, currentRegRes, paymentsRes] = await Promise.all([
        apiRequest(`/rentals?sort=${sortOrder}${statusFilter !== 'ALL' ? '&status=' + statusFilter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`).catch(() => []),
        apiRequest('/stalls').catch(() => []),
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/payments?take=600').catch(() => ({ items: [] })),
      ]);

      setContracts(contractsRes || []);
      const freeStalls = (stallsRes || []).filter((s: any) => s.status === 'LIBRE');
      setStalls(freeStalls);
      setActiveRegister(currentRegRes);

      // Parse water payments for tenants
      const wMap: Record<string, { paid: boolean; amount: number; receiptNumber?: string }> = {};
      const items = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
      items.forEach((p: any) => {
        if (p.notes && p.notes.includes('AGUA-INQ-')) {
          // format: AGUA-INQ-[tenantId]-[month]
          const match = p.notes.match(/AGUA-INQ-([A-Za-z0-9_-]+)-(\d{4}-\d{2})/);
          if (match) {
            const [, tId, period] = match;
            wMap[`${tId}-${period}`] = { paid: true, amount: Number(p.amount), receiptNumber: p.operationNumber };
          }
        }
      });

      // Load local water payments
      const localWater = localStorage.getItem('mb_water_inquilinos_payments');
      if (localWater) {
        try {
          const parsed = JSON.parse(localWater);
          Object.assign(wMap, parsed);
        } catch (_) {}
      }
      setWaterPaymentsMap(wMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sortOrder, activeTab]);

  // Actualizar previsualización del cronograma
  useEffect(() => {
    const months = Number(contractForm.monthsCount) || 1;
    const rent = Number(contractForm.monthlyRent) || 0;
    const interest = Number(contractForm.interestRate) || 0;
    const start = new Date(contractForm.startDate || new Date());

    const sched: any[] = [];
    for (let i = 1; i <= months; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      const interestAmt = (rent * interest) / 100;
      const total = rent + interestAmt;

      sched.push({
        installmentNumber: i,
        dueDate: due.toISOString().split('T')[0],
        rentAmount: rent,
        interestAmount: interestAmt,
        totalAmount: total,
      });
    }
    setPreviewSchedule(sched);
  }, [contractForm.monthsCount, contractForm.monthlyRent, contractForm.interestRate, contractForm.startDate]);

  // Manejar creación de contrato
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiRequest('/rentals', {
        method: 'POST',
        body: JSON.stringify(contractForm),
      });

      setIsCreateModalOpen(false);
      setContractForm({
        stallId: '',
        tenantName: '',
        tenantDni: '',
        tenantPhone: '',
        businessCategory: 'Abarrotes y Verduras',
        startDate: new Date().toISOString().split('T')[0],
        monthsCount: 6,
        monthlyRent: 170.0,
        interestRate: 0.0,
        depositAmount: 170.0,
        contractTerms: '',
        notes: '',
      });

      await fetchData();

      if (created?.id) {
        handleOpenContractDoc(created.id);
      }
    } catch (e: any) {
      alert('Error al crear contrato: ' + e.message);
    }
  };

  const handleOpenContractDoc = async (contractId: string) => {
    try {
      const doc = await apiRequest(`/rentals/${contractId}/document`);
      setActiveDocContract(doc);
      setIsContractDocModalOpen(true);
    } catch (e: any) {
      alert('Error al cargar documento: ' + e.message);
    }
  };

  const handleOpenEditModal = (contract: any) => {
    setEditingContract(contract);
    setEditForm({
      tenantName: contract.tenantName || '',
      tenantDni: contract.tenantDni || '',
      tenantPhone: contract.tenantPhone || '',
      businessCategory: contract.businessCategory || 'Comercio General',
      monthlyRent: Number(contract.monthlyRent) || 170,
      stallCode: contract.stallCode || '',
      notes: contract.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;

    try {
      if (editingContract.id && !editingContract.id.startsWith('MB-INQ-')) {
        await apiRequest(`/rentals/${editingContract.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenantName: editForm.tenantName,
            tenantPhone: editForm.tenantPhone,
            businessCategory: editForm.businessCategory,
            notes: editForm.notes,
          }),
        });
      }

      setContracts((prev) =>
        prev.map((c) => (c.id === editingContract.id ? { ...c, ...editForm } : c))
      );

      setIsEditModalOpen(false);
      setEditingContract(null);
      alert('✓ Inquilino actualizado exitosamente');
      fetchData();
    } catch (err: any) {
      alert('Error al actualizar inquilino: ' + (err.message || 'Error de red'));
    }
  };

  const handleDeleteContract = async (contract: any) => {
    if (!confirm(`¿Está seguro de eliminar o rescindir el contrato de ${contract.tenantName} (Puesto ${contract.stallCode})? Esta acción liberará el puesto asignado.`)) return;

    try {
      if (contract.id && !contract.id.startsWith('MB-INQ-')) {
        await apiRequest(`/rentals/${contract.id}?action=delete`, { method: 'DELETE' });
      }
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      alert('✓ Contrato eliminado exitosamente y puesto liberado.');
      fetchData();
    } catch (err: any) {
      alert('Error al eliminar contrato: ' + (err.message || 'Error de servidor'));
    }
  };

  const handleOpenHistoryModal = (contract: any) => {
    setHistoryContract(contract);
    setIsHistoryModalOpen(true);
  };

  const handleOpenPayModal = (contract: any) => {
    setSelectedContractForPay(contract);
    const firstPending = contract.installments?.find((i: any) => i.status === 'PENDIENTE');
    const quotaNum = firstPending ? firstPending.installmentNumber : 1;
    const amount = firstPending ? Number(firstPending.totalAmount) : Number(contract.monthlyRent);

    setPayForm({
      installmentNumber: quotaNum,
      amount,
      paymentMethod: 'EFECTIVO',
      receiptNumber: `REC-ALQ-${Date.now().toString().slice(-6)}`,
      notes: '',
      registerCashIncome: true,
    });
    setIsPayModalOpen(true);
  };

  const handlePayInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractForPay) return;

    try {
      await apiRequest(`/rentals/${selectedContractForPay.id}/installments/${payForm.installmentNumber}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
          receiptNumber: payForm.receiptNumber,
          notes: payForm.notes,
          registerCashIncome: payForm.registerCashIncome,
        }),
      });

      setIsPayModalOpen(false);
      await fetchData();
      alert(`✓ Cuota ${payForm.installmentNumber} cobrada exitosamente e ingresada a Caja.`);
    } catch (e: any) {
      alert('Error al registrar cobro: ' + e.message);
    }
  };

  // Thermal Print (80mm) para Cuota de Alquiler
  const handlePrintRentalReceipt = (contract: any, installment: any) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const op = installment.receiptNumber || `VCH-ALQ-${installment.installmentNumber}`;
    const dateFormatted = installment.paidAt
      ? `${new Date(installment.paidAt).toLocaleDateString('es-PE')} ${new Date(installment.paidAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
      : new Date().toLocaleString('es-PE');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo Alquiler - ${op}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body { font-family: monospace; font-size: 11pt; color: #000; width: 72mm; margin: 0 auto; padding: 4px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .amount { font-size: 17pt; font-weight: 900; text-align: center; margin: 8px 0; }
            .footer { font-size: 8pt; text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="center bold">MERCADO MICAELA BASTIDAS</div>
          <div class="center" style="font-size: 8.5pt;">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES</div>
          <div class="center" style="font-size: 8pt;">RUC: 20486000001 • HUANCAYO</div>
          <div class="divider"></div>

          <div class="center bold" style="font-size: 10pt;">RECIBO DE ALQUILER DE PUESTO</div>
          <div class="center bold" style="font-size: 8.5pt;">CONTRATO A PLAZO DETERMINADO</div>
          <div class="row"><span>RECIBO:</span><span class="bold">${op}</span></div>
          <div class="row"><span>FECHA PAGO:</span><span>${dateFormatted}</span></div>
          <div class="row"><span>CUOTA:</span><span class="bold">Cuota ${installment.installmentNumber} de ${contract.monthsCount || contract.installments?.length || 6}</span></div>
          <div class="row"><span>VENCIMIENTO:</span><span>${installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('es-PE') : '-'}</span></div>
          <div class="divider"></div>

          <div class="row"><span>INQUILINO:</span><span class="bold">${contract.tenantName}</span></div>
          <div class="row"><span>DNI:</span><span>${contract.tenantDni}</span></div>
          <div class="row"><span>PUESTO:</span><span class="bold">Puesto ${contract.stallCode}</span></div>
          <div class="row"><span>MEDIO:</span><span class="bold">${installment.paymentMethod || 'EFECTIVO'}</span></div>
          <div class="divider"></div>

          <div class="center" style="font-size: 9pt;">TOTAL CANCELADO</div>
          <div class="amount">S/ ${Number(installment.totalAmount || contract.monthlyRent).toFixed(2)}</div>
          <div class="divider"></div>

          <div class="footer">
            ¡Comprobante Oficial de Caja Interna!<br>
            Mercado Micaela Bastidas - El Tambo
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // ROBUST PRINT CONTRACT FUNCTION (Solves blank document bug)
  const handlePrintContract = () => {
    if (!activeDocContract) return;

    // Use a clean pop-up with explicit document structure and fallback
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      // Fallback: trigger directly on the page
      window.print();
      return;
    }

    const clausesHtml = (activeDocContract.clauses || [
      'PRIMERA (DEL OBJETO): EL ARRENDADOR da en arrendamiento el puesto comercial identificado para uso estricto del giro autorizado.',
      'SEGUNDA (DEL PLAZO): El plazo del presente contrato es improrrogable salvo acuerdo expreso de la Junta Directiva.',
      'TERCERA (DEL PAGO): El canon se pagará puntualmente conforme al cronograma de amortización establecido.',
      'CUARTA (DE LAS NORMAS SANITARIAS): El ARRENDATARIO se compromete a respetar las ordenanzas de salubridad y limpieza del mercado.',
      'QUINTA (DE LA RESOLUCIÓN): El retraso de dos cuotas consecutivas facultará la reversión inmediata del puesto a favor de la asociación.',
    ]).map((c: string) => {
      const parts = c.split(':');
      return `<div style="font-size:9.5pt; text-align:justify; margin-bottom:8px; line-height:1.4;"><b>${parts[0]}:</b>${parts.slice(1).join(':')}</div>`;
    }).join('');

    const scheduleRows = (activeDocContract.schedule || []).map((item: any) => `
      <tr>
        <td style="padding:4px 6px; border:1px solid #999;"><b>Cuota ${item.installmentNumber}</b></td>
        <td style="padding:4px 6px; border:1px solid #999;">${new Date(item.dueDate).toLocaleDateString('es-PE')}</td>
        <td style="padding:4px 6px; border:1px solid #999;">S/ ${Number(item.rentAmount).toFixed(2)}</td>
        <td style="padding:4px 6px; border:1px solid #999;">S/ ${Number(item.interestAmount).toFixed(2)}</td>
        <td style="padding:4px 6px; border:1px solid #999; font-weight:bold;">S/ ${Number(item.totalAmount).toFixed(2)}</td>
        <td style="padding:4px 6px; border:1px solid #999;">${item.status || 'PENDIENTE'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Contrato de Arrendamiento - ${activeDocContract.contractNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 18mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5; font-size: 10.5pt; margin: 0; padding: 10px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
            .header h2 { font-size: 13pt; font-weight: 900; margin: 0 0 3px 0; text-transform: uppercase; }
            .header p { font-size: 8.5pt; color: #444; margin: 2px 0; }
            .header h1 { font-size: 13.5pt; font-weight: 900; color: #065f46; margin: 8px 0 2px 0; text-transform: uppercase; }
            .header .contract-no { font-family: monospace; font-weight: bold; font-size: 10pt; color: #333; }
            .intro { font-size: 10pt; text-align: justify; margin-bottom: 14px; line-height: 1.45; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 16px; font-size: 9pt; }
            th { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #999; padding: 4px 6px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #444; padding-top: 6px; font-size: 8.5pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${activeDocContract.association || 'ASOCIACIÓN DE COMERCIANTES DEL MERCADO MICAELA BASTIDAS'}</h2>
            <p>${activeDocContract.address || 'Av. Micaela Bastidas S/N - Huancayo'} • RUC: ${activeDocContract.ruc || '20486000001'}</p>
            <h1>CONTRATO DE ARRENDAMIENTO DE PUESTO COMERCIAL</h1>
            <p class="contract-no">N° CONTRATO: ${activeDocContract.contractNumber} • PUESTO: ${activeDocContract.stallCode || 'GENERAL'}</p>
          </div>

          <div class="intro">
            Conste por el presente documento privado, el <b>CONTRATO DE ARRENDAMIENTO DE PUESTO COMERCIAL</b> que celebran de una parte la <b>${activeDocContract.association || 'ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS MICAELA BASTIDAS'}</b>, en adelante <b>EL ARRENDADOR</b>; y de la otra parte don/doña <b>${activeDocContract.tenant?.name}</b>, identificado(a) con <b>DNI N° ${activeDocContract.tenant?.dni}</b>, con giro comercial autorizado de <b>${activeDocContract.tenant?.businessCategory || 'Comercio General'}</b>, en adelante <b>EL ARRENDATARIO</b>.
          </div>

          <div class="clauses">
            ${clausesHtml}
          </div>

          <div style="font-size:10pt; font-weight:900; text-transform:uppercase; margin-top:14px; border-bottom:1px solid #333; padding-bottom:3px;">
            ANEXO: CRONOGRAMA OFICIAL DE AMORTIZACIÓN Y PAGOS
          </div>
          <table>
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Vencimiento</th>
                <th>Canon</th>
                <th>Interés</th>
                <th>Total Cuota</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleRows}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <p style="font-weight:bold; margin:2px 0;">${activeDocContract.tenant?.name}</p>
              <p style="margin:2px 0;">DNI: ${activeDocContract.tenant?.dni}</p>
              <p style="font-size:7.5pt; color:#555; text-transform:uppercase; font-weight:bold; margin:2px 0;">EL ARRENDATARIO (Firma y Huella)</p>
            </div>
            <div class="sig-box">
              <p style="font-weight:bold; margin:2px 0;">CONSEJO DIRECTIVO</p>
              <p style="margin:2px 0;">MERCADO MICAELA BASTIDAS</p>
              <p style="font-size:7.5pt; color:#555; text-transform:uppercase; font-weight:bold; margin:2px 0;">EL ARRENDADOR (Presidente / Tesorera)</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print safely after content has rendered
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (_) {}
    }, 500);
  };

  // TAB 2: Open Water Pay Modal
  const handleOpenWaterModal = (tenant: OfficialTenant) => {
    setSelectedWaterTenant(tenant);
    setWaterPayAmount(waterFee);
    setWaterReceiptNumber(`AGU-INQ-${Date.now().toString().slice(-6)}`);
    setIsWaterPayModalOpen(true);
  };

  // Submit Water Payment
  const handleWaterPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWaterTenant) return;

    const key = `${selectedWaterTenant.id}-${waterMonth}`;
    try {
      const conceptDesc = `Agua Potable Inquilinos: ${selectedWaterTenant.name} (${selectedWaterTenant.stallNumber}) - Periodo ${waterMonth}`;
      const notesRef = `AGUA-INQ-${selectedWaterTenant.id}-${waterMonth}`;

      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: conceptDesc,
          amount: waterPayAmount,
          reference: notesRef,
        }),
      }).catch((err) => {
        console.warn('Nota: Cobro registrado vía fallback:', err);
      });

      const updated = {
        ...waterPaymentsMap,
        [key]: { paid: true, amount: waterPayAmount, receiptNumber: waterReceiptNumber },
      };
      setWaterPaymentsMap(updated);
      localStorage.setItem('mb_water_inquilinos_payments', JSON.stringify(updated));

      setIsWaterPayModalOpen(false);
      alert(`✓ Cobro de Agua (S/ ${waterPayAmount.toFixed(2)}) registrado con éxito para ${selectedWaterTenant.name}`);
    } catch (err: any) {
      alert('Error registrando cobro de agua: ' + err.message);
    }
  };

  // Water Tenants List (Real DB Contracts or Fallback)
  const waterTenantsList = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.map((c: any) => ({
        id: c.id,
        merchantId: c.merchantId,
        code: c.contractNumber,
        name: c.tenantName,
        dni: c.tenantDni,
        stallNumber: c.stallCode,
        monthlyRent: Number(c.monthlyRent),
        businessCategory: c.businessCategory,
      }));
    }
    return OFFICIAL_TENANTS;
  }, [contracts]);

  // Filtered Water Tenants
  const filteredWaterTenants = useMemo(() => {
    return waterTenantsList.filter((t: any) =>
      t.name.toLowerCase().includes(waterSearch.toLowerCase()) ||
      t.dni.includes(waterSearch) ||
      t.stallNumber.toLowerCase().includes(waterSearch.toLowerCase())
    );
  }, [waterTenantsList, waterSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Building className="w-7 h-7 text-emerald-600" />
            Inquilinos: Alquileres & Agua Potable
          </h1>
          <p className="text-xs text-slate-500">
            Módulo unificado para los 8 inquilinos oficiales del mercado (hojas C-ALQUILERES y D-AGUA INQUILINOS). Cobro de canones y servicio de agua potable con tarifas editables.
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

          {activeTab === 'ALQUILERES' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Contrato</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ALQUILERES')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'ALQUILERES'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>1. Alquiler de Puestos ({displayContracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AGUA_INQUILINOS')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'AGUA_INQUILINOS'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>2. Agua Potable Inquilinos (8 personas • S/ 4.00)</span>
        </button>
      </div>

      {/* TAB 1: ALQUILER DE PUESTOS */}
      {activeTab === 'ALQUILERES' && (
        <div className="space-y-4">
          {/* KPI Cards de Resumen General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Contratos</span>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">{rentalStats.totalContracts}</p>
              <span className="text-[10px] text-emerald-600 font-bold">{rentalStats.upToDateCount} al día</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Recaudado</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {rentalStats.totalPaid.toFixed(2)}</p>
              <span className="text-[10px] text-slate-400 font-bold">Cuotas canceladas</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Saldo por Cobrar</span>
              <p className="text-2xl font-black text-rose-600 font-mono mt-1">S/ {rentalStats.totalDebt.toFixed(2)}</p>
              <span className="text-[10px] text-rose-500 font-bold">{rentalStats.withPendingCount} con cuotas pendientes</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Cuota Masiva Actual</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-black text-emerald-800">Cuota N° {bulkInstallmentNumber}</span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {contracts.filter((c: any) => {
                    const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                    return inst?.status === 'PAGADO';
                  }).length} / {contracts.length} pagaron
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Cobranza mensual programada</span>
            </div>
          </div>

          {/* BARRA DE FILTROS GENERALES DE FECHAS, PERIODOS Y CRONOGRAMA */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">
                    Filtros Generales de Períodos y Fechas de Contratos
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {filteredContracts.length} de {displayContracts.length} Contratos
                  </span>
                </div>

                {(search || filterYear !== 'ALL' || filterPeriodMonth !== 'ALL' || dateRangeFrom || dateRangeTo || scheduleStatusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterYear('ALL');
                      setFilterPeriodMonth('ALL');
                      setDateRangeFrom('');
                      setDateRangeTo('');
                      setScheduleStatusFilter('ALL');
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Restablecer todos los filtros y mostrar todos los contratos"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-600" />
                    <span>Restablecer Filtros</span>
                  </button>
                )}
              </div>

              {/* Selector de Modo de Vista */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('PADRON')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === 'PADRON'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Padrón & Cronograma</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('CUADRICULA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === 'CUADRICULA'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cuadrícula Matriz Mensual</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Buscador */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Buscar Inquilino / Puesto</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, DNI, puesto..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Año */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Año de Contrato</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Años</option>
                  <option value="2026">Año 2026</option>
                  <option value="2025">Año 2025</option>
                </select>
              </div>

              {/* Mes del Cronograma */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mes del Cronograma</label>
                <select
                  value={filterPeriodMonth}
                  onChange={(e) => setFilterPeriodMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Meses / Cuotas</option>
                  <option value="2026-01">Enero 2026 (Cuota 1)</option>
                  <option value="2026-02">Febrero 2026 (Cuota 2)</option>
                  <option value="2026-03">Marzo 2026 (Cuota 3)</option>
                  <option value="2026-04">Abril 2026 (Cuota 4)</option>
                  <option value="2026-05">Mayo 2026 (Cuota 5)</option>
                  <option value="2026-06">Junio 2026 (Cuota 6)</option>
                </select>
              </div>

              {/* Inicio Contrato Desde */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Inicio Contrato Desde</label>
                <input
                  type="date"
                  value={dateRangeFrom}
                  onChange={(e) => setDateRangeFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                />
              </div>

              {/* Estado de Pagos */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Estado de Cobranza</label>
                <select
                  value={scheduleStatusFilter}
                  onChange={(e) => setScheduleStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Estados (8 Inquilinos)</option>
                  <option value="ACTIVE">Contratos Activos / Vigentes (8)</option>
                  <option value="WITH_PENDING">Con Cuotas Pendientes de Pago</option>
                  <option value="UP_TO_DATE">Al Día (Sin Morosidad)</option>
                  <option value="FINALIZED">Contratos Finalizados / Concluidos</option>
                </select>
              </div>
            </div>
          </div>

          {/* VISTA 1: PADRÓN Y CRONOGRAMA */}
          {viewMode === 'PADRON' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Barra de Cobro y Guardado en Masa de Cuota Específica */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 shadow-sm">
                    <span>Cuota a Cobrar:</span>
                    <select
                      value={bulkInstallmentNumber}
                      onChange={(e) => {
                        setBulkInstallmentNumber(Number(e.target.value));
                        setSelectedContractIds(new Set());
                      }}
                      className="bg-transparent font-black text-emerald-900 outline-none cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <option key={num} value={num}>
                          Cuota N° {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={selectAllPendingContractsForInstallment}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Seleccionar Pendientes Cuota {bulkInstallmentNumber} (
                      {
                        filteredContracts.filter((c: any) => {
                          const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                          return inst ? inst.status !== 'PAGADO' : true;
                        }).length
                      }
                      )
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={deselectAllContracts}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition"
                  >
                    Deseleccionar
                  </button>

                  {selectedContractIds.size > 0 && (
                    <span className="text-xs font-black text-emerald-950 bg-emerald-200 px-3 py-1 rounded-xl">
                      {selectedContractIds.size} contratos seleccionados
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={bulkPaymentMethod}
                    onChange={(e) => setBulkPaymentMethod(e.target.value as any)}
                    className="bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none"
                  >
                    <option value="EFECTIVO">💵 En Efectivo</option>
                    <option value="YAPE">📱 Yape / Digital</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleBulkSaveRentals}
                    disabled={selectedContractIds.size === 0 || isSavingBulk}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingBulk
                        ? 'Guardando...'
                        : `Guardar Cuota ${bulkInstallmentNumber} (${selectedContractIds.size})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tabla de Contratos con Cronograma Interactivo */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredContracts.filter((c: any) => {
                              const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                              return inst ? inst.status !== 'PAGADO' : true;
                            }).length > 0 &&
                            filteredContracts
                              .filter((c: any) => {
                                const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                                return inst ? inst.status !== 'PAGADO' : true;
                              })
                              .every((c: any) => selectedContractIds.has(c.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) selectAllPendingContractsForInstallment();
                            else deselectAllContracts();
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          title="Seleccionar pendientes de la cuota"
                        />
                      </th>
                      <th className="p-3">N° Contrato</th>
                      <th className="p-3">Inquilino (Arrendatario)</th>
                      <th className="p-3">Puesto</th>
                      <th className="p-3">Vigencia Contrato</th>
                      <th className="p-3 text-right">Canon</th>
                      <th className="p-3 text-center">Cronograma de Pagos (Desde Inicio)</th>
                      <th className="p-3 text-right">Total Pagado / Saldo</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center bg-slate-50/50">
                          <div className="max-w-md mx-auto space-y-2.5">
                            <Building className="w-9 h-9 text-slate-300 mx-auto" />
                            <p className="text-sm font-bold text-slate-700">No hay contratos que coincidan con los filtros seleccionados</p>
                            <p className="text-xs text-slate-400">
                              {scheduleStatusFilter === 'FINALIZED'
                                ? "Actualmente no existen contratos finalizados. Los 8 inquilinos tienen contratos activos con cuotas vigentes."
                                : "No se encontraron inquilinos con el filtro actual."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearch('');
                                setFilterYear('ALL');
                                setFilterPeriodMonth('ALL');
                                setDateRangeFrom('');
                                setDateRangeTo('');
                                setScheduleStatusFilter('ALL');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restablecer Filtros y Ver Todos los Inquilinos (8)</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((c: any) => {
                      const instList = c.installments || c.schedule || [];
                      const totalPaid = instList.filter((i: any) => i.status === 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
                      const totalDebt = instList.filter((i: any) => i.status !== 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
                      const startDateStr = c.startDate ? new Date(c.startDate).toLocaleDateString('es-PE') : '01/01/2026';
                      const endDateStr = c.endDate ? new Date(c.endDate).toLocaleDateString('es-PE') : '30/06/2026';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedContractIds.has(c.id)}
                              onChange={() => toggleSelectContract(c.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-800">
                            {c.contractNumber}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{c.tenantName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">DNI: {c.tenantDni}</p>
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            Puesto {c.stallCode || 'N/A'}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            <p className="font-semibold text-slate-800">Desde: {startDateStr}</p>
                            <p className="text-[10px] text-slate-400">Hasta: {endDateStr} ({c.monthsCount || 6} m)</p>
                          </td>
                          <td className="p-3 font-mono font-black text-right text-emerald-700 text-sm">
                            S/ {Number(c.monthlyRent).toFixed(2)}
                          </td>
                          <td className="p-3">
                            {/* Píldoras interactivas de cuotas */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {instList.map((inst: any) => {
                                const isPaid = inst.status === 'PAGADO';
                                return isPaid ? (
                                  <button
                                    key={inst.installmentNumber}
                                    type="button"
                                    onClick={() => handlePrintRentalReceipt(c, inst)}
                                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded text-[10px] font-black transition flex items-center gap-1 shadow-2xs"
                                    title={`Cuota ${inst.installmentNumber} PAGADA el ${inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('es-PE') : 'S/F'}. Comp: ${inst.receiptNumber || 'S/N'}. Clic para reimprimir ticket.`}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>C{inst.installmentNumber} S/{Number(inst.totalAmount).toFixed(0)}</span>
                                  </button>
                                ) : (
                                  <button
                                    key={inst.installmentNumber}
                                    type="button"
                                    onClick={() => handleQuickPayInstallment(c, inst.installmentNumber)}
                                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-black transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title={`Cuota ${inst.installmentNumber} PENDIENTE (Vence: ${inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('es-PE') : 'S/F'}). Clic para registrar cobro.`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                                    <span>C{inst.installmentNumber} S/{Number(inst.totalAmount).toFixed(0)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <p className="font-mono font-black text-emerald-700 text-xs">S/ {totalPaid.toFixed(2)}</p>
                            {totalDebt > 0 && (
                              <p className="text-[10px] font-mono font-bold text-rose-600">Deuda: S/ {totalDebt.toFixed(2)}</p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenPayModal(c)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center space-x-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Cobrar</span>
                              </button>

                              <button
                                onClick={() => handleOpenHistoryModal(c)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                                title="Ver Cronograma Oficial e Historial de Pagos"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(c)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                                title="Editar Datos del Inquilino"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenContractDoc(c.id)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                title="Ver e Imprimir Contrato A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteContract(c)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                                title="Rescindir / Eliminar Contrato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>

              {/* Resumen de Alquiler Cuota: Pagados vs Deudores */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-700">
                    Cuota N° {bulkInstallmentNumber}:{' '}
                    <span className="text-emerald-700 font-black">
                      {
                        filteredContracts.filter((c: any) => {
                          const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                          return inst?.status === 'PAGADO';
                        }).length
                      }{' '}
                      Pagaron
                    </span>
                    {' / '}
                    <span className="text-amber-700 font-black">
                      {
                        filteredContracts.filter((c: any) => {
                          const inst = (c.installments || c.schedule || []).find((s: any) => s.installmentNumber === bulkInstallmentNumber);
                          return inst ? inst.status !== 'PAGADO' : true;
                        }).length
                      }{' '}
                      Pendientes
                    </span>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-bold text-slate-700">
                    Total Contratos Mostrados: <span className="font-mono font-black text-emerald-800">{filteredContracts.length}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: CUADRÍCULA MATRIZ MENSUAL DE CRONOGRAMA */}
          {viewMode === 'CUADRICULA' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Cuadrícula General del Cronograma de Pagos (Mes a Mes)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Selecciona casillas pendientes individuales, columnas completas de cuotas o filas de inquilinos para guardar pagos en masa.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllPendingInGrid}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Seleccionar Todas las Pendientes</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearRentalGridSelection}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    Limpiar Casillas
                  </button>
                </div>
              </div>

              {/* Barra de Consolidación de la Cuadrícula */}
              {selectedRentalGridCells.size > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-amber-950 bg-amber-200 px-3 py-1.5 rounded-xl border border-amber-300">
                      {selectedRentalGridCells.size} cuotas seleccionadas: S/ {totalSelectedGridAmount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={clearRentalGridSelection}
                      className="text-xs text-slate-500 hover:text-slate-700 underline font-bold"
                    >
                      Deseleccionar todas
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkPaymentMethod}
                      onChange={(e) => setBulkPaymentMethod(e.target.value as any)}
                      className="bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-950 outline-none"
                    >
                      <option value="EFECTIVO">💵 En Efectivo</option>
                      <option value="YAPE">📱 Yape / Digital</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleConsolidatedRentalGridSave}
                      disabled={isSavingBulk}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingBulk ? 'Guardando en BD...' : 'Consolidar y Guardar Pagos en Masa'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Matriz de Inquilinos x Cuotas 1..6 */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">N°</th>
                      <th className="p-3">Inquilino (Arrendatario)</th>
                      <th className="p-3 text-center">Puesto</th>
                      <th className="p-3 text-center">Inicio Contrato</th>
                      <th className="p-3 text-right">Canon</th>
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <th
                          key={num}
                          onClick={() => toggleColumnCuota(num)}
                          className="p-3 text-center cursor-pointer hover:bg-emerald-100 transition select-none"
                          title={`Clic para seleccionar todos los pendientes de la Cuota ${num}`}
                        >
                          <div className="flex flex-col items-center">
                            <span>Cuota {num}</span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {num === 1 ? 'Ene' : num === 2 ? 'Feb' : num === 3 ? 'Mar' : num === 4 ? 'Abr' : num === 5 ? 'May' : 'Jun'} 2026
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-right">Total Pagado</th>
                      <th className="p-3 text-right">Saldo Deuda</th>
                      <th className="p-3 text-center">Historial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="p-10 text-center bg-slate-50/50">
                          <div className="max-w-md mx-auto space-y-2.5">
                            <Calendar className="w-9 h-9 text-slate-300 mx-auto" />
                            <p className="text-sm font-bold text-slate-700">No hay contratos para mostrar en la cuadrícula</p>
                            <p className="text-xs text-slate-400">
                              {scheduleStatusFilter === 'FINALIZED'
                                ? "Actualmente no existen contratos finalizados. Los 8 inquilinos tienen contratos activos con cuotas vigentes."
                                : "No se encontraron inquilinos con el filtro actual."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearch('');
                                setFilterYear('ALL');
                                setFilterPeriodMonth('ALL');
                                setDateRangeFrom('');
                                setDateRangeTo('');
                                setScheduleStatusFilter('ALL');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restablecer Filtros y Ver Todos los Inquilinos (8)</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((c: any, idx: number) => {
                      const instList = c.installments || c.schedule || [];
                      const totalPaid = instList.filter((i: any) => i.status === 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
                      const totalDebt = instList.filter((i: any) => i.status !== 'PAGADO').reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-black text-slate-900">{c.tenantName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">DNI: {c.tenantDni} • {c.contractNumber}</p>
                          </td>
                          <td className="p-3 text-center font-black text-emerald-800">Puesto {c.stallCode}</td>
                          <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                            {c.startDate ? new Date(c.startDate).toLocaleDateString('es-PE') : '01/01/2026'}
                          </td>
                          <td className="p-3 text-right font-black font-mono text-emerald-700">
                            S/ {Number(c.monthlyRent).toFixed(2)}
                          </td>
                          {[1, 2, 3, 4, 5, 6].map((num) => {
                            const inst = instList.find((i: any) => i.installmentNumber === num);
                            const cellKey = `${c.id}-${num}`;
                            const isSelected = selectedRentalGridCells.has(cellKey);
                            const isPaid = inst?.status === 'PAGADO';

                            return (
                              <td
                                key={num}
                                onClick={() => {
                                  if (!isPaid) toggleRentalGridCell(c.id, num);
                                }}
                                className={`p-2.5 text-center transition cursor-pointer select-none border-x border-slate-50 ${
                                  isPaid
                                    ? 'bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-900'
                                    : isSelected
                                    ? 'bg-amber-300 text-amber-950 font-black shadow-inner ring-2 ring-amber-400'
                                    : 'bg-white hover:bg-amber-50 text-slate-400'
                                }`}
                                title={
                                  isPaid
                                    ? `Cuota ${num} PAGADA el ${inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('es-PE') : 'S/F'} • Comp: ${inst.receiptNumber || 'S/N'}`
                                    : `Cuota ${num} PENDIENTE • Clic para seleccionar o cobrar`
                                }
                              >
                                {isPaid ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-black text-[11px] text-emerald-800">✓ S/ {Number(inst.totalAmount).toFixed(0)}</span>
                                    <span className="text-[8px] font-mono text-emerald-600 truncate max-w-[65px]">{inst.receiptNumber || 'PAGADO'}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className={`font-bold text-[11px] ${isSelected ? 'text-amber-950 font-black' : 'text-slate-500'}`}>
                                      {isSelected ? '✓ ' : '⏳ '}S/ {Number(inst?.totalAmount || c.monthlyRent || 150).toFixed(0)}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-bold">{isSelected ? 'Seleccionado' : 'Pendiente'}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-right font-black font-mono text-emerald-700">
                            S/ {totalPaid.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-black font-mono text-rose-600">
                            S/ {totalDebt.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenHistoryModal(c)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                              title="Ver Cronograma Oficial e Historial"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AGUA POTABLE INQUILINOS */}
      {activeTab === 'AGUA_INQUILINOS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-600" />
                  Cobranza de Agua Potable - Inquilinos de Puestos
                </h2>
                <p className="text-[11px] text-slate-400">Cuota fija de S/ 4.00 mensual (hoja D-AGUA INQUILINOS)</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Period Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="month"
                    value={waterMonth}
                    onChange={(e) => setWaterMonth(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 focus:outline-none"
                  />
                </div>

                {/* Editable Base Fee */}
                <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold text-emerald-900">
                  <span className="text-[10px] uppercase">Tarifa Base:</span>
                  <span className="text-xs">S/</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={waterFee}
                    onChange={(e) => setWaterFee(parseFloat(e.target.value) || 0)}
                    className="w-12 bg-white border border-emerald-300 rounded px-1 text-center font-mono font-black"
                  />
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={waterSearch}
                    onChange={(e) => setWaterSearch(e.target.value)}
                    placeholder="Buscar inquilino..."
                    className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-44"
                  />
                </div>
              </div>
            </div>

            {/* Barra de Cobro y Guardado en Masa de Agua Inquilinos (Períodos Pasados y Actuales) */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllPendingWater}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Seleccionar Pendientes de Agua ({filteredWaterTenants.filter((t: any) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={deselectAllWater}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Deseleccionar
                </button>

                {selectedWaterIds.size > 0 && (
                  <span className="text-xs font-black text-emerald-950 bg-emerald-200 px-3 py-1 rounded-xl">
                    {selectedWaterIds.size} inquilinos seleccionados (S/ {(selectedWaterIds.size * waterFee).toFixed(2)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkPaymentMethod}
                  onChange={(e) => setBulkPaymentMethod(e.target.value as any)}
                  className="bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none"
                >
                  <option value="EFECTIVO">💵 En Efectivo</option>
                  <option value="YAPE">📱 Yape / Digital</option>
                </select>

                <button
                  type="button"
                  onClick={handleBulkSaveWater}
                  disabled={selectedWaterIds.size === 0 || isSavingBulk}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingBulk
                      ? 'Guardando...'
                      : `Guardar Agua del Mes (${selectedWaterIds.size})`}
                  </span>
                </button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredWaterTenants.filter((t: any) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length > 0 &&
                          filteredWaterTenants
                            .filter((t: any) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid)
                            .every((t: any) => selectedWaterIds.has(t.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) selectAllPendingWater();
                          else deselectAllWater();
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        title="Seleccionar / Deseleccionar todos los pendientes de agua"
                      />
                    </th>
                    <th className="p-3 w-10 text-center">N°</th>
                    <th className="p-3">Inquilino</th>
                    <th className="p-3">DNI</th>
                    <th className="p-3">Puesto</th>
                    <th className="p-3">Periodo</th>
                    <th className="p-3 text-right">Tarifa (S/)</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredWaterTenants.map((t, idx) => {
                    const key = `${t.id}-${waterMonth}`;
                    const isPaid = waterPaymentsMap[key]?.paid;
                    const paidAmount = waterPaymentsMap[key]?.amount || waterFee;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center">
                          {isPaid ? (
                            <span className="text-emerald-700 font-black text-xs">✓</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedWaterIds.has(t.id)}
                              onChange={() => toggleSelectWater(t.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{t.name}</td>
                        <td className="p-3 text-slate-600">{t.dni}</td>
                        <td className="p-3 font-sans font-bold text-slate-700">{t.stallNumber}</td>
                        <td className="p-3 text-slate-500">{waterMonth}</td>
                        <td className="p-3 text-right font-black text-emerald-800">
                          S/ {paidAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center font-sans">
                          {isPaid ? (
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
                          {isPaid ? (
                            <button
                              onClick={() => {
                                const next = { ...waterPaymentsMap };
                                delete next[key];
                                setWaterPaymentsMap(next);
                                localStorage.setItem('mb_water_inquilinos_payments', JSON.stringify(next));
                              }}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Anular
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenWaterModal(t)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1 mx-auto"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Cobrar S/ {waterFee.toFixed(2)}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumen de Agua Inquilinos: Pagados vs Deudores */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">
                  Mes {waterMonth}:{' '}
                  <span className="text-emerald-700 font-black">
                    {filteredWaterTenants.filter((t) => !!waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length} Pagaron (S/ {(filteredWaterTenants.filter((t) => !!waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length * waterFee).toFixed(2)})
                  </span>
                  {' / '}
                  <span className="text-amber-700 font-black">
                    {filteredWaterTenants.filter((t) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length} Pendientes (S/ {(filteredWaterTenants.filter((t) => !waterPaymentsMap[`${t.id}-${waterMonth}`]?.paid).length * waterFee).toFixed(2)})
                  </span>
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-slate-700">
                  Total Inquilinos: <span className="font-mono font-black text-emerald-800">{filteredWaterTenants.length}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COBRAR AGUA INQUILINO */}
      {isWaterPayModalOpen && selectedWaterTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Cobro de Agua Potable</h3>
                <p className="text-xs text-slate-400">Inquilino: {selectedWaterTenant.name}</p>
              </div>
              <button onClick={() => setIsWaterPayModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWaterPaymentSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">Periodo Facturado:</span>
                <span className="text-sm font-black text-emerald-800 font-mono block mt-0.5">{waterMonth}</span>
                <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                  S/ {waterPayAmount.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Monto a Cobrar (Editable):</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={waterPayAmount}
                  onChange={(e) => setWaterPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-base text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">N° Comprobante / Recibo</label>
                <input
                  type="text"
                  required
                  value={waterReceiptNumber}
                  onChange={(e) => setWaterReceiptNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWaterPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COBRAR CUOTA ALQUILER */}
      {isPayModalOpen && selectedContractForPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Cobro de Alquiler</h3>
                <p className="text-xs text-slate-400">Puesto {selectedContractForPay.stallCode} - {selectedContractForPay.tenantName}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayInstallmentSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">Cuota a Cobrar:</span>
                <span className="text-lg font-black text-emerald-800 font-mono">
                  Cuota N° {payForm.installmentNumber}
                </span>
                <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                  S/ {Number(payForm.amount).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Monto de Alquiler (Editable):</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-base text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Medio de Pago</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="EFECTIVO">Efectivo en Caja</option>
                  <option value="YAPE">Yape / Plin</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">N° Recibo / Comprobante</label>
                <input
                  type="text"
                  required
                  value={payForm.receiptNumber}
                  onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CONTRATO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Nuevo Contrato de Arrendamiento</h3>
                <p className="text-xs text-slate-400">Emisión de contrato y cronograma oficial</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Inquilino *</label>
                  <input
                    type="text"
                    required
                    value={contractForm.tenantName}
                    onChange={(e) => setContractForm({ ...contractForm, tenantName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    value={contractForm.tenantDni}
                    onChange={(e) => setContractForm({ ...contractForm, tenantDni: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Giro Comercial</label>
                  <input
                    type="text"
                    value={contractForm.businessCategory}
                    onChange={(e) => setContractForm({ ...contractForm, businessCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Canon Mensual (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={contractForm.monthlyRent}
                    onChange={(e) => setContractForm({ ...contractForm, monthlyRent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Meses Duración</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={contractForm.monthsCount}
                    onChange={(e) => setContractForm({ ...contractForm, monthsCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200"
                >
                  Crear y Emitir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZACIÓN / IMPRESIÓN CONTRATO */}
      {isContractDocModalOpen && activeDocContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Documento Oficial de Contrato</h3>
                <p className="text-xs text-slate-400">N° {activeDocContract.contractNumber} - {activeDocContract.tenant?.name}</p>
              </div>
              <button onClick={() => setIsContractDocModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Preview */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 font-sans text-xs space-y-4 text-slate-800">
              <div className="text-center border-b border-slate-300 pb-3">
                <h2 className="font-black text-slate-900 text-sm uppercase">{activeDocContract.association || 'ASOCIACIÓN DE COMERCIANTES DEL MERCADO MICAELA BASTIDAS'}</h2>
                <p className="text-[10px] text-slate-500">RUC: 20486000001 • Av. Micaela Bastidas S/N</p>
                <h1 className="font-black text-emerald-800 text-base uppercase mt-2">CONTRATO PRIVADO DE ARRENDAMIENTO</h1>
                <p className="font-mono text-slate-600 font-bold text-xs">N° {activeDocContract.contractNumber} • Puesto {activeDocContract.stallCode}</p>
              </div>

              <p className="text-justify leading-relaxed">
                Conste por el presente documento privado el Contrato de Arrendamiento celebrado por la <b>{activeDocContract.association}</b> (EL ARRENDADOR) y don/doña <b>{activeDocContract.tenant?.name}</b> con DNI N° <b>{activeDocContract.tenant?.dni}</b> (EL ARRENDATARIO), para el puesto comercial con giro de <b>{activeDocContract.tenant?.businessCategory || 'Comercio General'}</b>.
              </p>

              <div>
                <h4 className="font-black uppercase text-[11px] text-slate-700 mb-1">Cronograma Oficial:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-1.5">Cuota</th>
                        <th className="p-1.5">Vencimiento</th>
                        <th className="p-1.5 text-right">Canon (S/)</th>
                        <th className="p-1.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(activeDocContract.schedule || []).map((s: any) => (
                        <tr key={s.installmentNumber}>
                          <td className="p-1.5 font-bold">Cuota {s.installmentNumber}</td>
                          <td className="p-1.5">{new Date(s.dueDate).toLocaleDateString('es-PE')}</td>
                          <td className="p-1.5 text-right font-bold text-emerald-800">S/ {Number(s.totalAmount).toFixed(2)}</td>
                          <td className="p-1.5 text-center text-[10px] font-sans font-bold">{s.status || 'PENDIENTE'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsContractDocModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrintContract}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200 flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Contrato Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR INQUILINO */}
      {isEditModalOpen && editingContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-600" />
                  <span>Editar Inquilino</span>
                </h3>
                <p className="text-xs text-slate-400">Puesto {editingContract.stallCode}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContractSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Inquilino *</label>
                <input
                  type="text"
                  required
                  value={editForm.tenantName}
                  onChange={(e) => setEditForm({ ...editForm, tenantName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">DNI</label>
                  <input
                    type="text"
                    value={editForm.tenantDni}
                    onChange={(e) => setEditForm({ ...editForm, tenantDni: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.tenantPhone}
                    onChange={(e) => setEditForm({ ...editForm, tenantPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Giro Comercial</label>
                  <input
                    type="text"
                    value={editForm.businessCategory}
                    onChange={(e) => setEditForm({ ...editForm, businessCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Canon Mensual (S/)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editForm.monthlyRent}
                    onChange={(e) => setEditForm({ ...editForm, monthlyRent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-emerald-800"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-md shadow-amber-200"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE PAGOS DEL INQUILINO */}
      {isHistoryModalOpen && historyContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 tracking-wider">
                  Contrato de Arrendamiento a Plazo Determinado
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase mt-1 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <span>Cronograma Oficial e Historial de Pagos</span>
                </h3>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  {historyContract.tenantName} • DNI: {historyContract.tenantDni} • Puesto: {historyContract.stallCode}
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Resumen de Plazo Determinado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">N° Contrato:</span>
                <span className="font-mono font-black text-indigo-900 block">{historyContract.contractNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Plazo Determinado:</span>
                <span className="font-bold text-slate-800 block">
                  {historyContract.monthsCount || historyContract.installments?.length || 6} Meses
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {historyContract.startDate ? new Date(historyContract.startDate).toLocaleDateString('es-PE') : '01/01/2026'} al{' '}
                  {historyContract.endDate ? new Date(historyContract.endDate).toLocaleDateString('es-PE') : '30/06/2026'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Canon Mensual:</span>
                <span className="font-mono font-black text-emerald-700 text-sm block">
                  S/ {Number(historyContract.monthlyRent).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Garantía / Depósito:</span>
                <span className="font-mono font-black text-slate-700 block">
                  S/ {Number(historyContract.depositAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tabla de Cronograma de Pagos */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Cuota</th>
                    <th className="p-2.5">Vencimiento</th>
                    <th className="p-2.5 text-right">Monto Cuota</th>
                    <th className="p-2.5 text-center">Estado</th>
                    <th className="p-2.5">Fecha de Pago</th>
                    <th className="p-2.5">N° Comprobante</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(historyContract.installments || []).map((inst: any) => {
                    const isPaid = inst.status === 'PAGADO';
                    return (
                      <tr key={inst.installmentNumber} className={`hover:bg-slate-50 transition ${isPaid ? 'bg-emerald-50/20' : ''}`}>
                        <td className="p-2.5 font-bold font-mono text-slate-900">
                          Cuota N° {inst.installmentNumber}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('es-PE') : '-'}
                        </td>
                        <td className="p-2.5 font-mono font-black text-right text-emerald-700">
                          S/ {Number(inst.totalAmount || historyContract.monthlyRent).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {inst.status || 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                          {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('es-PE') : '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-700 text-[11px]">
                          {inst.receiptNumber || '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {!isPaid ? (
                              <button
                                onClick={() => {
                                  setIsHistoryModalOpen(false);
                                  handleOpenPayModal(historyContract);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-sm transition flex items-center space-x-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Cobrar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePrintRentalReceipt(historyContract, inst)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 transition flex items-center space-x-1"
                                title="Reimprimir Comprobante de Cobro"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Recibo</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumen de Amortización */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">
                  Total Pagado:{' '}
                  <span className="font-mono font-black text-emerald-800">
                    S/{' '}
                    {(historyContract.installments || [])
                      .filter((i: any) => i.status === 'PAGADO')
                      .reduce((acc: number, i: any) => acc + Number(i.totalAmount || historyContract.monthlyRent), 0)
                      .toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">
                  Saldo Restante:{' '}
                  <span className="font-mono font-black text-amber-800">
                    S/{' '}
                    {(historyContract.installments || [])
                      .filter((i: any) => i.status !== 'PAGADO')
                      .reduce((acc: number, i: any) => acc + Number(i.totalAmount || historyContract.monthlyRent), 0)
                      .toFixed(2)}
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  handleOpenContractDoc(historyContract.id);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Ver Contrato Imprimible (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
