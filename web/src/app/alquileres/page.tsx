'use client';
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function AlquileresPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'alphabetical_asc' | 'alphabetical_desc' | 'date_desc'>('alphabetical_asc');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContractDocModalOpen, setIsContractDocModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Estado para Contrato y Cronograma para imprimir
  const [activeDocContract, setActiveDocContract] = useState<any>(null);

  // Estado para Cobro de Cuota
  const [selectedContractForPay, setSelectedContractForPay] = useState<any>(null);
  const [payForm, setPayForm] = useState({
    installmentNumber: 1,
    amount: 150,
    paymentMethod: 'EFECTIVO',
    receiptNumber: '',
    notes: '',
    registerCashIncome: true,
  });

  // Formulario nuevo contrato con pre-visualizador de cronograma
  const [contractForm, setContractForm] = useState({
    stallId: '',
    tenantName: '',
    tenantDni: '',
    tenantPhone: '',
    businessCategory: 'Abarrotes y Verduras',
    startDate: new Date().toISOString().split('T')[0],
    monthsCount: 6,
    monthlyRent: 150.0,
    interestRate: 0.0,
    depositAmount: 150.0,
    contractTerms: '',
    notes: '',
  });

  // Cronograma calculado en tiempo real para el modal de creación
  const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, stallsRes] = await Promise.all([
        apiRequest(`/rentals?sort=${sortOrder}${statusFilter !== 'ALL' ? '&status=' + statusFilter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`),
        apiRequest('/stalls'),
      ]);
      setContracts(contractsRes || []);
      // Filtrar puestos libres o disponibles
      const freeStalls = (stallsRes || []).filter((s: any) => s.status === 'LIBRE');
      setStalls(freeStalls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sortOrder]);

  // Actualizar previsualización del cronograma
  useEffect(() => {
    const months = Number(contractForm.monthsCount) || 1;
    const rent = Number(contractForm.monthlyRent) || 0;
    const rate = Number(contractForm.interestRate) || 0;
    const interestPerMonth = Number((rent * (rate / 100)).toFixed(2));
    const totalPerMonth = Number((rent + interestPerMonth).toFixed(2));

    const start = new Date(contractForm.startDate);
    const list = [];
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + i - 1);
      list.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        rentAmount: rent,
        interestAmount: interestPerMonth,
        totalAmount: totalPerMonth,
      });
    }
    setPreviewSchedule(list);
  }, [contractForm.startDate, contractForm.monthsCount, contractForm.monthlyRent, contractForm.interestRate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.stallId) {
      alert('Por favor selecciona un puesto disponible');
      return;
    }
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
        monthlyRent: 150.0,
        interestRate: 0.0,
        depositAmount: 150.0,
        contractTerms: '',
        notes: '',
      });

      await fetchData();

      // Abrir contrato oficial generado inmediatamente
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
        body: JSON.stringify(payForm),
      });

      setIsPayModalOpen(false);
      await fetchData();
      alert(`✓ Cuota ${payForm.installmentNumber} cobrada exitosamente e ingresada a Caja.`);
    } catch (e: any) {
      alert('Error al registrar cobro: ' + e.message);
    }
  };

  const handleTerminateContract = async (contractId: string, stallCode: string) => {
    const reason = prompt(`¿Motivo para finalizar o rescindir el contrato del puesto ${stallCode}?`);
    if (reason === null) return;

    try {
      await apiRequest(`/rentals/${contractId}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });
      await fetchData();
      alert(`✓ Contrato rescindido y puesto ${stallCode} liberado para nuevo alquiler.`);
    } catch (e: any) {
      alert('Error al rescindir contrato: ' + e.message);
    }
  };

  const handlePrintContract = () => {
    if (!activeDocContract) return;
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('Por favor permita las ventanas emergentes en su navegador para imprimir');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Contrato de Arrendamiento - ${activeDocContract.contractNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 18mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              line-height: 1.5;
              font-size: 10.5pt;
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .header h2 {
              font-size: 13pt;
              font-weight: 900;
              margin: 0 0 3px 0;
              text-transform: uppercase;
            }
            .header p {
              font-size: 8.5pt;
              color: #444;
              margin: 2px 0;
            }
            .header h1 {
              font-size: 13.5pt;
              font-weight: 900;
              color: #065f46;
              margin: 8px 0 2px 0;
              text-transform: uppercase;
            }
            .header .contract-no {
              font-family: monospace;
              font-weight: bold;
              font-size: 10pt;
              color: #333;
            }
            .intro {
              font-size: 10pt;
              text-align: justify;
              margin-bottom: 12px;
              line-height: 1.45;
            }
            .clauses {
              margin-bottom: 12px;
            }
            .clause {
              font-size: 9.5pt;
              text-align: justify;
              margin-bottom: 7px;
              line-height: 1.4;
            }
            .clause b {
              color: #000;
            }
            .schedule-title {
              font-size: 10pt;
              font-weight: 900;
              text-transform: uppercase;
              margin-top: 14px;
              margin-bottom: 6px;
              border-bottom: 1px solid #333;
              padding-bottom: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              font-size: 9pt;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 5px 7px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8pt;
            }
            .signatures {
              margin-top: 35px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-box {
              width: 45%;
              text-align: center;
              border-top: 1px solid #444;
              padding-top: 5px;
              font-size: 8.5pt;
            }
            .sig-box p {
              margin: 2px 0;
            }
            .sig-box .name {
              font-weight: bold;
            }
            .sig-box .role {
              font-size: 7.5pt;
              color: #555;
              text-transform: uppercase;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${activeDocContract.association || 'ASOCIACIÓN DE COMERCIANTES DEL MERCADO MICAELA BASTIDAS'}</h2>
            <p>${activeDocContract.address || 'Av. Micaela Bastidas S/N - Huancayo'} • RUC: ${activeDocContract.ruc || '20486253109'}</p>
            <h1>${activeDocContract.title || 'CONTRATO DE ARRENDAMIENTO DE PUESTO COMERCIAL'}</h1>
            <p class="contract-no">N° CONTRATO: ${activeDocContract.contractNumber}</p>
          </div>

          <div class="intro">
            Conste por el presente documento privado, el <b>CONTRATO DE ARRENDAMIENTO DE PUESTO COMERCIAL</b> que celebran de una parte la <b>${activeDocContract.association}</b>, en adelante <b>EL ARRENDADOR</b>; y de la otra parte don/doña <b>${activeDocContract.tenant?.name}</b>, identificado(a) con <b>DNI N° ${activeDocContract.tenant?.dni}</b>, con giro comercial autorizado de <b>${activeDocContract.tenant?.businessCategory}</b>, en adelante <b>EL ARRENDATARIO</b>.
          </div>

          <div class="clauses">
            ${(activeDocContract.clauses || []).map((c: string) => {
              const parts = c.split(':');
              return `<div class="clause"><b>${parts[0]}:</b>${parts.slice(1).join(':')}</div>`;
            }).join('')}
          </div>

          <div class="schedule-title">ANEXO: CRONOGRAMA OFICIAL DE AMORTIZACIÓN Y PAGOS</div>
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
              ${(activeDocContract.schedule || []).map((item: any) => `
                <tr>
                  <td><b>Cuota ${item.installmentNumber}</b></td>
                  <td>${new Date(item.dueDate).toLocaleDateString('es-PE')}</td>
                  <td>S/ ${Number(item.rentAmount).toFixed(2)}</td>
                  <td>S/ ${Number(item.interestAmount).toFixed(2)}</td>
                  <td><b>S/ ${Number(item.totalAmount).toFixed(2)}</b></td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <p class="name">${activeDocContract.tenant?.name}</p>
              <p>DNI: ${activeDocContract.tenant?.dni}</p>
              <p class="role">EL ARRENDATARIO (Firma y Huella)</p>
            </div>
            <div class="sig-box">
              <p class="name">CONSEJO DIRECTIVO</p>
              <p>MERCADO MICAELA BASTIDAS</p>
              <p class="role">EL ARRENDADOR (Presidente / Tesorera)</p>
            </div>
          </div>
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

  // KPIs
  const activeCount = contracts.filter((c) => c.status === 'ACTIVO').length;
  const totalRecaudado = contracts.reduce((acc, c) => acc + (c.progress?.totalPaidAmount || 0), 0);
  const totalPendiente = contracts.reduce((acc, c) => acc + (c.progress?.totalPendingAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <Building className="w-7 h-7 text-emerald-700" />
            <span>Alquileres de Puestos (Tesorería)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Arrendamiento de puestos sobrantes de la asociación, emisión de contratos con cronograma, seguimiento de cuotas y cobranzas.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Contrato de Alquiler</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Puestos Alquilados</span>
            <span className="text-2xl font-black text-slate-800">{activeCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">Contratos vigentes</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Recaudado</span>
            <span className="text-2xl font-black text-emerald-700 font-mono">S/ {totalRecaudado.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Ingresado a caja</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pendiente por Cobrar</span>
            <span className="text-2xl font-black text-amber-600 font-mono">S/ {totalPendiente.toFixed(2)}</span>
            <span className="text-[10px] text-amber-600 font-semibold block">Cuotas en cronograma</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Puestos Libres</span>
            <span className="text-2xl font-black text-blue-700 font-mono">{stalls.length}</span>
            <span className="text-[10px] text-blue-600 font-semibold block">Disponibles para alquilar</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Ordenamiento */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por arrendatario, DNI, N° puesto o contrato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Orden Alfabético */}
          <select
            value={sortOrder}
            onChange={(e: any) => setSortOrder(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="alphabetical_asc">Arrendatario A - Z</option>
            <option value="alphabetical_desc">Arrendatario Z - A</option>
            <option value="date_desc">Más recientes primero</option>
            <option value="stall_asc">Puesto (P-001 al P-120)</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="FINALIZADO">Finalizados</option>
            <option value="RESCINDIDO">Rescindidos</option>
          </select>
        </div>
      </div>

      {/* Lista de Contratos con Marcadores de Cuotas */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando contratos de alquiler...</div>
      ) : contracts.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No se encontraron contratos de alquiler</p>
          <p className="text-xs text-slate-400 mt-1">Haz clic en &quot;Nuevo Contrato de Alquiler&quot; para registrar un arrendamiento de puesto.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-4 transition"
            >
              {/* Encabezado del Contrato */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm font-mono shadow">
                    {c.stallCode}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-slate-800 text-sm uppercase">{c.tenantName}</h3>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                        DNI: {c.tenantDni}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Giro: <span className="font-semibold text-slate-700">{c.businessCategory || 'Comercio General'}</span>
                      {c.tenantPhone && <span> • Tel: {c.tenantPhone}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                      c.status === 'ACTIVO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.status === 'FINALIZADO'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">{c.contractNumber}</span>
                </div>
              </div>

              {/* Parámetros Financieros y Avance de Cuotas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Parámetros */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100 font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Canon Mensual:</span>
                    <span className="font-mono font-bold text-slate-800">S/ {Number(c.monthlyRent).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tasa Interés Mensual:</span>
                    <span className="font-mono font-bold text-slate-800">{Number(c.interestRate)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duración:</span>
                    <span className="font-bold text-slate-800">{c.monthsCount} Meses</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-600">Total Contrato:</span>
                    <span className="text-emerald-700 font-mono">S/ {Number(c.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Marcador de Check de Cuotas */}
                <div className="md:col-span-2 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-black text-xs text-emerald-950 uppercase tracking-wide">
                        Progreso de Cuotas: Cuota {c.progress?.paidCount} de {c.progress?.totalInstallments} Pagada
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                      Faltan {c.progress?.pendingCount} cuotas
                    </span>
                  </div>

                  {/* Checklist visual interactivo de cuotas */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 py-1">
                    {c.installments?.map((inst: any) => (
                      <div
                        key={inst.id}
                        className={`p-1.5 rounded-lg text-center border text-[11px] flex flex-col justify-between ${
                          inst.status === 'PAGADO'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1 font-bold">
                          {inst.status === 'PAGADO' ? (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-500" />
                          )}
                          <span>Cuota {inst.installmentNumber}</span>
                        </div>
                        <span className="font-mono text-[10px] mt-0.5 font-semibold">
                          S/ {Number(inst.totalAmount).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Vigencia: {new Date(c.startDate).toLocaleDateString()} al {new Date(c.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenContractDoc(c.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition flex items-center space-x-1 shadow-xs"
                    title="Ver e Imprimir Contrato Legal Oficial"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Contrato Legal & Cronograma</span>
                  </button>

                  {c.status === 'ACTIVO' && c.progress?.pendingCount > 0 && (
                    <button
                      onClick={() => handleOpenPayModal(c)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition flex items-center space-x-1 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cobrar Cuota {c.progress?.currentQuota}</span>
                    </button>
                  )}

                  {c.status === 'ACTIVO' && (
                    <button
                      onClick={() => handleTerminateContract(c.id, c.stallCode)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Rescindir Contrato y Liberar Puesto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR CONTRATO CON PREVISUALIZACIÓN DE CRONOGRAMA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Nuevo Contrato de Alquiler de Puesto</h3>
                <p className="text-xs text-slate-400">Puestos sobrantes de la asociación con cronograma amortizado.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
              {/* Selección de Puesto Disponible */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <label className="block font-bold text-emerald-900 uppercase mb-1">
                  Seleccionar Puesto Disponible de la Asociación *
                </label>
                <select
                  required
                  value={contractForm.stallId}
                  onChange={(e) => setContractForm({ ...contractForm, stallId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="">-- Seleccionar puesto libre ({stalls.length} disponibles) --</option>
                  {stalls.map((s) => (
                    <option key={s.id} value={s.id}>
                      Puesto {s.code} - {s.sector?.name || 'Sector General'} (Libre)
                    </option>
                  ))}
                </select>
              </div>

              {/* Datos del Arrendatario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Completo del Arrendatario *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: MARÍA LUZMILA HUAMÁN"
                    value={contractForm.tenantName}
                    onChange={(e) => setContractForm({ ...contractForm, tenantName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">DNI del Arrendatario *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="8 dígitos"
                    value={contractForm.tenantDni}
                    onChange={(e) => setContractForm({ ...contractForm, tenantDni: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="987654321"
                    value={contractForm.tenantPhone}
                    onChange={(e) => setContractForm({ ...contractForm, tenantPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Giro Comercial Autorizado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Verduras y Hortalizas"
                    value={contractForm.businessCategory}
                    onChange={(e) => setContractForm({ ...contractForm, businessCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Parámetros del Cronograma y Financiamiento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Plazo (Meses) *</label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    required
                    value={contractForm.monthsCount}
                    onChange={(e) => setContractForm({ ...contractForm, monthsCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Canon Mensual (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    min={1}
                    required
                    value={contractForm.monthlyRent}
                    onChange={(e) => setContractForm({ ...contractForm, monthlyRent: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Interés Mensual (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={50}
                    value={contractForm.interestRate}
                    onChange={(e) => setContractForm({ ...contractForm, interestRate: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* TABLA DE PREVISUALIZACIÓN DEL CRONOGRAMA */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-black uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Previsualización del Cronograma Oficial ({previewSchedule.length} Cuotas):
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    Total a Cancelar: S/ {(previewSchedule.reduce((acc, p) => acc + p.totalAmount, 0)).toFixed(2)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">N° Cuota</th>
                        <th className="p-2">Vencimiento</th>
                        <th className="p-2">Canon Base</th>
                        <th className="p-2">Interés</th>
                        <th className="p-2 text-right">Cuota Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSchedule.map((item) => (
                        <tr key={item.installmentNumber} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-800">Cuota {item.installmentNumber}</td>
                          <td className="p-2 font-mono text-slate-600">{item.dueDate}</td>
                          <td className="p-2 font-mono">S/ {item.rentAmount.toFixed(2)}</td>
                          <td className="p-2 font-mono text-amber-600">S/ {item.interestAmount.toFixed(2)}</td>
                          <td className="p-2 font-mono font-black text-emerald-700 text-right">S/ {item.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botones */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow flex items-center space-x-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Crear y Emitir Contrato</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COBRAR CUOTA */}
      {isPayModalOpen && selectedContractForPay && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Cobranza de Alquiler</h3>
                <p className="text-xs text-slate-400">Puesto {selectedContractForPay.stallCode} - {selectedContractForPay.tenantName}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayInstallmentSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">Cuota a Cobrar:</span>
                <span className="text-lg font-black text-emerald-800 font-mono">
                  Cuota N° {payForm.installmentNumber} de {selectedContractForPay.monthsCount}
                </span>
                <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                  S/ {Number(payForm.amount).toFixed(2)}
                </span>
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

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="registerCash"
                  checked={payForm.registerCashIncome}
                  onChange={(e) => setPayForm({ ...payForm, registerCashIncome: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="registerCash" className="text-xs font-semibold text-slate-700">
                  Registrar ingreso en Caja Principal de Tesorería
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl font-bold shadow"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONTRATO LEGAL Y CRONOGRAMA IMPRIMIBLE */}
      {isContractDocModalOpen && activeDocContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="printable-rental-contract" className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5 font-serif text-slate-900">
            {/* Cabecera Oficial */}
            <div className="text-center border-b-2 border-slate-900 pb-4 font-sans">
              <h2 className="text-base font-black uppercase tracking-wider">{activeDocContract.association}</h2>
              <p className="text-xs text-slate-600 font-semibold">{activeDocContract.address} • RUC: {activeDocContract.ruc}</p>
              <h1 className="text-lg font-black uppercase text-emerald-800 mt-2">{activeDocContract.title}</h1>
              <p className="font-mono font-bold text-xs text-slate-500 mt-0.5">N° CONTRATO: {activeDocContract.contractNumber}</p>
            </div>

            {/* Partes */}
            <div className="text-xs leading-relaxed space-y-2 text-justify">
              <p>
                Conste por el presente documento privado, el <b>CONTRATO DE ARRENDAMIENTO DE PUESTO COMERCIAL</b> que celebran de una parte la <b>{activeDocContract.association}</b>, en adelante <b>EL ARRENDADOR</b>; y de la otra parte don/doña <b>{activeDocContract.tenant?.name}</b>, identificado(a) con <b>DNI N° {activeDocContract.tenant?.dni}</b>, con giro comercial autorizado de <b>{activeDocContract.tenant?.businessCategory}</b>, en adelante <b>EL ARRENDATARIO</b>.
              </p>
            </div>

            {/* Cláusulas */}
            <div className="text-xs space-y-2 text-justify font-sans">
              {activeDocContract.clauses?.map((c: string, idx: number) => (
                <p key={idx} className="leading-relaxed">
                  <b>{c.split(':')[0]}:</b>{c.split(':')[1]}
                </p>
              ))}
            </div>

            {/* Cronograma Anexo */}
            <div className="font-sans pt-2">
              <h3 className="text-xs font-black uppercase mb-2 text-slate-800 border-b pb-1">
                ANEXO: CRONOGRAMA OFICIAL DE AMORTIZACIÓN Y PAGOS
              </h3>
              <table className="w-full text-xs text-left border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-1.5 border-r">Cuota</th>
                    <th className="p-1.5 border-r">Vencimiento</th>
                    <th className="p-1.5 border-r">Canon</th>
                    <th className="p-1.5 border-r">Interés</th>
                    <th className="p-1.5 border-r">Total Cuota</th>
                    <th className="p-1.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {activeDocContract.schedule?.map((item: any) => (
                    <tr key={item.installmentNumber} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r font-bold font-sans">Cuota {item.installmentNumber}</td>
                      <td className="p-1.5 border-r">{new Date(item.dueDate).toLocaleDateString('es-PE')}</td>
                      <td className="p-1.5 border-r">S/ {item.rentAmount}</td>
                      <td className="p-1.5 border-r">S/ {item.interestAmount}</td>
                      <td className="p-1.5 border-r font-bold text-emerald-800">S/ {item.totalAmount}</td>
                      <td className="p-1.5 font-sans font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center font-sans text-xs">
              <div className="space-y-1">
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold">{activeDocContract.tenant?.name}</p>
                  <p className="text-slate-500 font-mono">DNI: {activeDocContract.tenant?.dni}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">EL ARRENDATARIO (Firma y Huella)</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold">CONSEJO DIRECTIVO</p>
                  <p className="text-slate-500 font-mono">MERCADO MICAELA BASTIDAS</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">EL ARRENDADOR (Presidente / Tesorera)</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 font-sans">
              <button
                onClick={() => setIsContractDocModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrintContract}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Contrato y Cronograma</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
