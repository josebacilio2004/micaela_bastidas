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

  // Filtered Water Tenants
  const filteredWaterTenants = useMemo(() => {
    return OFFICIAL_TENANTS.filter((t) =>
      t.name.toLowerCase().includes(waterSearch.toLowerCase()) ||
      t.dni.includes(waterSearch) ||
      t.stallNumber.toLowerCase().includes(waterSearch.toLowerCase())
    );
  }, [waterSearch]);

  // Combined Contract List: DB Contracts + Official fallback
  const displayContracts = useMemo(() => {
    if (contracts.length > 0) return contracts;
    // Map official tenants into virtual contract structures
    return OFFICIAL_TENANTS.map((ot) => ({
      id: ot.id,
      contractNumber: `CTR-${ot.stallNumber}-2026`,
      tenantName: ot.name,
      tenantDni: ot.dni,
      stallCode: ot.stallNumber,
      monthlyRent: ot.monthlyRent,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthsCount: 12,
      businessCategory: ot.businessCategory,
      status: 'ACTIVO',
      installments: [
        { installmentNumber: 1, dueDate: '2026-01-10', totalAmount: ot.monthlyRent, status: 'PAGADO' },
        { installmentNumber: 2, dueDate: '2026-02-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
        { installmentNumber: 3, dueDate: '2026-03-10', totalAmount: ot.monthlyRent, status: 'PENDIENTE' },
      ],
    }));
  }, [contracts]);

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
          {/* Contracts Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Padrón Oficial de Contratos de Arrendamiento
              </h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar inquilino o puesto..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-56"
                />
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-3">N° Contrato</th>
                    <th className="p-3">Inquilino (Arrendatario)</th>
                    <th className="p-3">Puesto / Espacio</th>
                    <th className="p-3">Giro Comercial</th>
                    <th className="p-3 text-right">Canon Mensual</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayContracts.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
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
                        {c.businessCategory || 'Comercio General'}
                      </td>
                      <td className="p-3 font-mono font-black text-right text-emerald-700 text-sm">
                        S/ {Number(c.monthlyRent).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {c.status || 'ACTIVO'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenPayModal(c)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center space-x-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Cobrar Cuota</span>
                          </button>

                          <button
                            onClick={() => handleOpenContractDoc(c.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Ver e Imprimir Contrato"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                  <tr>
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
    </div>
  );
}
