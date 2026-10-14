'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Calendar,
  Store,
  Droplets,
  Coins,
  CheckCircle2,
  X,
  Printer,
  Download,
  Filter,
  Search,
  Wallet,
  Receipt,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

interface AmbulanteFijo {
  id: string;
  num: number;
  firstName?: string;
  lastName?: string;
  name: string;
  cat: string;
  dailyRate: number;
  waterRate: number;
  dni?: string;
  phone?: string;
  internalCode?: string;
}

const DEFAULT_AMBULANTES_FALLBACK: AmbulanteFijo[] = [
  { id: 'af-1', num: 1, name: 'Maritza Riveros', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-2', num: 2, name: 'Jesusa Muñoz', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-3', num: 3, name: 'Jose Parejas', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-4', num: 4, name: 'Victoria Martinez', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-5', num: 5, name: 'Kely Picoy', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-6', num: 6, name: 'Bertha Rojas', cat: 'COMIDA', dailyRate: 5, waterRate: 4 },
  { id: 'af-7', num: 7, name: 'Esther Rojas', cat: 'FRUTA', dailyRate: 5, waterRate: 4 },
  { id: 'af-8', num: 8, name: 'Isabel Lapierre', cat: 'CARNE', dailyRate: 5, waterRate: 4 },
  { id: 'af-9', num: 9, name: 'Nelly Hurtado', cat: 'CARNE', dailyRate: 5, waterRate: 4 },
  { id: 'af-10', num: 10, name: 'Zenovia Cardenas', cat: 'CARNE', dailyRate: 5, waterRate: 4 },
  { id: 'af-11', num: 11, name: 'Sonia Ramos', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-12', num: 12, name: 'Miriam Rondinelli', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-13', num: 13, name: 'Emilia de la Cruz', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-14', num: 14, name: 'Martha Revollar', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-15', num: 15, name: 'Yobana Arroyo', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-16', num: 16, name: 'Juana Huayra', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-17', num: 17, name: 'Flor Blabin', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-18', num: 18, name: 'Teofila Rafael', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-19', num: 19, name: 'Bertha Perez', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
  { id: 'af-20', num: 20, name: 'Ninfa Ñaña', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-21', num: 21, name: 'Maria Taype', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-22', num: 22, name: 'Carmela Chilquillo', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-23', num: 23, name: 'Geronimo Bonifacio', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-24', num: 24, name: 'Francisca Ñahui', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-25', num: 25, name: 'Mercedes Villalobos', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-26', num: 26, name: 'Antonia Castellares', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-27', num: 27, name: 'Gillermina Vargas', cat: 'VERDURAS', dailyRate: 5, waterRate: 4 },
  { id: 'af-28', num: 28, name: 'Antonia Curi', cat: 'OTROS', dailyRate: 5, waterRate: 4 },
  { id: 'af-29', num: 29, name: 'Dionicia Mendez', cat: 'PAPA', dailyRate: 5, waterRate: 4 },
  { id: 'af-30', num: 30, name: 'Maura Curasma', cat: 'PAPA', dailyRate: 5, waterRate: 4 },
  { id: 'af-31', num: 31, name: 'YAHAIRA', cat: 'PAPA', dailyRate: 5, waterRate: 4 },
  { id: 'af-32', num: 32, name: 'Milda Riveros', cat: 'PAPA', dailyRate: 5, waterRate: 4 },
  { id: 'af-33', num: 33, name: 'Gricelda Romero', cat: 'PAPA', dailyRate: 5, waterRate: 4 },
  { id: 'af-34', num: 34, name: 'Santos Quispe', cat: 'VARIOS', dailyRate: 5, waterRate: 4 },
];

const MONTHS = [
  { val: 1, name: 'Enero' },
  { val: 2, name: 'Febrero' },
  { val: 3, name: 'Marzo' },
  { val: 4, name: 'Abril' },
  { val: 5, name: 'Mayo' },
  { val: 6, name: 'Junio' },
  { val: 7, name: 'Julio' },
  { val: 8, name: 'Agosto' },
  { val: 9, name: 'Setiembre' },
  { val: 10, name: 'Octubre' },
  { val: 11, name: 'Noviembre' },
  { val: 12, name: 'Diciembre' },
];

export default function AmbulantesFijosPage() {
  const [activeTab, setActiveTab] = useState<'CRONOGRAMA' | 'AGUA' | 'GESTION'>('CRONOGRAMA');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [search, setSearch] = useState('');
  
  const [merchantsList, setMerchantsList] = useState<AmbulanteFijo[]>([]);
  const [merchantTypeId, setMerchantTypeId] = useState<string>('');
  const [paymentsMap, setPaymentsMap] = useState<Record<string, { amount: number; op?: string }>>({});
  const [waterPaymentsMap, setWaterPaymentsMap] = useState<Record<string, { paid: boolean; op?: string }>>({});
  const [loading, setLoading] = useState(false);

  // CRUD Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<AmbulanteFijo | null>(null);

  // Form State
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState('COMIDA');
  const [formDailyRate, setFormDailyRate] = useState('5.00');
  const [formWaterRate, setFormWaterRate] = useState('4.00');
  const [savingMerchant, setSavingMerchant] = useState(false);

  // Modal para cobro
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    merchant: AmbulanteFijo | null;
    day?: number;
    conceptType: 'ALCABALA' | 'AGUA';
    amount: number;
    paymentMethod: string;
  }>({
    isOpen: false,
    merchant: null,
    conceptType: 'ALCABALA',
    amount: 5.0,
    paymentMethod: 'EFECTIVO',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cantidad de días en el mes seleccionado
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Cargar datos de la BD
  const loadData = async () => {
    setLoading(true);
    try {
      const [merchantsRes, typesRes, paymentsRes] = await Promise.all([
        apiRequest('/merchants').catch(() => []),
        apiRequest('/merchant-types').catch(() => []),
        apiRequest('/payments?take=1000').catch(() => ({ items: [] })),
      ]);

      const afType = Array.isArray(typesRes)
        ? typesRes.find((t: any) => t.code === 'AMBULANTE_FIJO')
        : null;
      if (afType) setMerchantTypeId(afType.id);

      let filteredMerchants: any[] = [];
      if (Array.isArray(merchantsRes)) {
        filteredMerchants = merchantsRes.filter(
          (m: any) =>
            m.merchantTypeId === afType?.id ||
            m.merchantType?.code === 'AMBULANTE_FIJO' ||
            m.internalCode?.includes('AF-')
        );
      }

      if (filteredMerchants.length > 0) {
        const mapped: AmbulanteFijo[] = filteredMerchants.map((m: any, idx: number) => ({
          id: m.id,
          num: idx + 1,
          firstName: m.firstName,
          lastName: m.lastName,
          name: `${m.lastName || ''} ${m.firstName || ''}`.trim() || m.name,
          cat: m.businessCategory || 'VARIOS',
          dailyRate: 5,
          waterRate: 4,
          dni: m.dni,
          phone: m.phone,
          internalCode: m.internalCode,
        }));
        setMerchantsList(mapped);
      } else {
        setMerchantsList(DEFAULT_AMBULANTES_FALLBACK);
      }

      // Map payments
      const periodStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      if (paymentsRes && Array.isArray(paymentsRes.items)) {
        const pMap: Record<string, { amount: number; op?: string }> = {};
        const wMap: Record<string, { paid: boolean; op?: string }> = {};

        paymentsRes.items.forEach((p: any) => {
          if (!p.isVoided) {
            const mId = p.merchantId;
            if (mId) {
              if (p.notes && p.notes.includes('DIA-')) {
                const match = p.notes.match(/DIA-(\d+)-(\d+)-(\d+)/);
                if (match) {
                  const [_, d, m, y] = match;
                  if (parseInt(y, 10) === selectedYear && parseInt(m, 10) === selectedMonth) {
                    pMap[`${mId}-${d}`] = { amount: Number(p.amount), op: p.operationNumber };
                  }
                }
              }
              if (p.period === periodStr && p.concept?.code?.includes('AGUA')) {
                wMap[mId] = { paid: true, op: p.operationNumber };
              }
            }
          }
        });

        setPaymentsMap(pMap);
        setWaterPaymentsMap(wMap);
      }
    } catch (e) {
      console.error('Error cargando ambulantes fijos:', e);
      setMerchantsList(DEFAULT_AMBULANTES_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Handle Create Ambulante Fijo
  const handleOpenCreate = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormDni('');
    setFormPhone('');
    setFormCategory('COMIDA');
    setFormDailyRate('5.00');
    setFormWaterRate('4.00');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim() || !formDni.trim()) {
      alert('Por favor complete Nombres, Apellidos y DNI.');
      return;
    }
    if (formDni.trim().length !== 8) {
      alert('El DNI debe tener exactamente 8 dígitos.');
      return;
    }

    setSavingMerchant(true);
    try {
      await apiRequest('/merchants', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formFirstName.trim().toUpperCase(),
          lastName: formLastName.trim().toUpperCase(),
          dni: formDni.trim(),
          phone: formPhone.trim() || undefined,
          businessCategory: formCategory,
          merchantTypeId: merchantTypeId || undefined,
        }),
      });

      alert('✓ Ambulante Fijo registrado exitosamente.');
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error al registrar ambulante: ' + (err.message || 'Error de servidor'));
    } finally {
      setSavingMerchant(false);
    }
  };

  // Handle Edit Ambulante Fijo
  const handleOpenEdit = (m: AmbulanteFijo) => {
    setEditingMerchant(m);
    setFormFirstName(m.firstName || m.name.split(' ')[1] || '');
    setFormLastName(m.lastName || m.name.split(' ')[0] || '');
    setFormDni(m.dni || '');
    setFormPhone(m.phone || '');
    setFormCategory(m.cat || 'COMIDA');
    setFormDailyRate('5.00');
    setFormWaterRate('4.00');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchant) return;

    setSavingMerchant(true);
    try {
      await apiRequest(`/merchants/${editingMerchant.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formFirstName.trim().toUpperCase(),
          lastName: formLastName.trim().toUpperCase(),
          dni: formDni.trim(),
          phone: formPhone.trim() || undefined,
          businessCategory: formCategory,
        }),
      });

      alert('✓ Datos de ambulante actualizados con éxito.');
      setIsEditModalOpen(false);
      setEditingMerchant(null);
      await loadData();
    } catch (err: any) {
      alert('Error al actualizar ambulante: ' + (err.message || 'Error de servidor'));
    } finally {
      setSavingMerchant(false);
    }
  };

  // Handle Delete Ambulante Fijo
  const handleDeleteMerchant = async (m: AmbulanteFijo) => {
    if (!confirm(`¿Está seguro de eliminar a ${m.name} de la lista de ambulantes fijos?`)) return;

    try {
      await apiRequest(`/merchants/${m.id}`, { method: 'DELETE' });
      alert('✓ Ambulante fijo dado de baja correctamente.');
      await loadData();
    } catch (err: any) {
      alert('Error al eliminar ambulante: ' + (err.message || 'Error de servidor'));
    }
  };

  // Filtrado de ambulantes
  const filteredMerchants = useMemo(() => {
    return merchantsList.filter((m) => {
      const matchCat = selectedCategory === 'TODOS' || m.cat === selectedCategory;
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.dni && m.dni.includes(search)) ||
        (m.internalCode && m.internalCode.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [merchantsList, selectedCategory, search]);

  // Click en casilla para cobrar
  const handleCellClick = (merchant: AmbulanteFijo, day: number) => {
    const key = `${merchant.id}-${day}`;
    const payment = paymentsMap[key];

    if (payment) {
      // Ya pagó: reimprimir recibo
      handlePrintThermal(merchant, 'ALCABALA', payment.amount, day, payment.op);
    } else {
      // Abrir modal de cobro
      setPaymentModal({
        isOpen: true,
        merchant,
        day,
        conceptType: 'ALCABALA',
        amount: 5.0,
        paymentMethod: 'EFECTIVO',
      });
    }
  };

  // Click en cobrar agua
  const handleWaterClick = (merchant: AmbulanteFijo) => {
    const isPaid = waterPaymentsMap[merchant.id]?.paid;
    if (isPaid) {
      handlePrintThermal(merchant, 'AGUA', 4.0, undefined, waterPaymentsMap[merchant.id]?.op);
    } else {
      setPaymentModal({
        isOpen: true,
        merchant,
        conceptType: 'AGUA',
        amount: 4.0,
        paymentMethod: 'EFECTIVO',
      });
    }
  };

  // Confirmar cobro
  const handleConfirmPayment = async () => {
    if (!paymentModal.merchant) return;
    setIsSubmitting(true);

    try {
      const { merchant, day, conceptType, amount, paymentMethod } = paymentModal;
      const opNum = `REC-AF-${Date.now().toString().slice(-6)}`;
      const periodStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const notes =
        conceptType === 'ALCABALA'
          ? `DIA-${day}-${selectedMonth}-${selectedYear} | Alcabala Ambulante Fijo: ${merchant.name}`
          : `AGUA | Ambulante Fijo: ${merchant.name} (${periodStr})`;

      // 1. Registrar movimiento en caja
      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: notes,
          amount,
          reference: opNum,
        }),
      }).catch((e) => console.warn('Caja fallback:', e));

      // 2. Registrar en estado local
      if (conceptType === 'ALCABALA' && day) {
        setPaymentsMap((prev) => ({
          ...prev,
          [`${merchant.id}-${day}`]: { amount, op: opNum },
        }));
      } else if (conceptType === 'AGUA') {
        setWaterPaymentsMap((prev) => ({
          ...prev,
          [merchant.id]: { paid: true, op: opNum },
        }));
      }

      setPaymentModal((prev) => ({ ...prev, isOpen: false }));
      handlePrintThermal(merchant, conceptType, amount, day, opNum);
    } catch (e: any) {
      alert('Error registrando cobro: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Impresión de ticket térmico 80mm
  const handlePrintThermal = (
    merchant: AmbulanteFijo,
    concept: 'ALCABALA' | 'AGUA',
    amount: number,
    day?: number,
    opNumber?: string
  ) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const op = opNumber || `REC-AF-${Date.now().toString().slice(-6)}`;
    const dateFormatted = `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    const monthName = MONTHS.find((m) => m.val === selectedMonth)?.name;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo Ambulante Fijo - ${op}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body { font-family: monospace; font-size: 11pt; color: #000; width: 72mm; margin: 0 auto; padding: 4px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .amount { font-size: 16pt; font-weight: 900; text-align: center; margin: 8px 0; }
            .footer { font-size: 8.5pt; text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="center bold">MERCADO MICAELA BASTIDAS</div>
          <div class="center" style="font-size: 8.5pt;">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES</div>
          <div class="center" style="font-size: 8pt;">RUC: 20486000001 • HUANCAYO</div>
          <div class="divider"></div>

          <div class="center bold">${concept === 'ALCABALA' ? 'ALCABALA DIARIA (AMBULANTE FIJO)' : 'CUOTA MENSUAL DE AGUA'}</div>
          <div class="row"><span>RECIBO:</span><span class="bold">${op}</span></div>
          <div class="row"><span>FECHA:</span><span>${dateFormatted}</span></div>
          <div class="row"><span>PERIODO:</span><span class="bold">${concept === 'ALCABALA' && day ? `Día ${day} de ${monthName} ${selectedYear}` : `${monthName} ${selectedYear}`}</span></div>
          <div class="divider"></div>

          <div class="row"><span>COMERCIANTE:</span><span class="bold">${merchant.name}</span></div>
          <div class="row"><span>DNI:</span><span>${merchant.dni || '-'}</span></div>
          <div class="row"><span>GIRO:</span><span class="bold">${merchant.cat}</span></div>
          <div class="divider"></div>

          <div class="center" style="font-size: 9pt;">TOTAL CANCELADO</div>
          <div class="amount">S/ ${amount.toFixed(2)}</div>
          <div class="divider"></div>

          <div class="footer">
            ¡Gracias por su contribución puntual!<br>
            Administración del Mercado
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
    }, 200);
  };

  // Calcular total recaudado en el mes
  const totalAlcabalaMonth = useMemo(() => {
    return Object.values(paymentsMap).reduce((acc, curr) => acc + curr.amount, 0);
  }, [paymentsMap]);

  const totalWaterMonth = useMemo(() => {
    return Object.keys(waterPaymentsMap).length * 4;
  }, [waterPaymentsMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Store className="w-7 h-7 text-amber-600" />
            Ambulantes Fijos (Alcabala & Agua)
          </h1>
          <p className="text-xs text-slate-500">
            Control integral de cobros diarios (Alcabala S/ 5.00/día desde enero 2026) y cuota mensual de agua (S/ 4.00) con gestión CRUD de comerciantes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Ambulante Fijo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('CRONOGRAMA')}
          className={`pb-3 font-bold text-sm flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'CRONOGRAMA'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Cuadrícula Alcabala Diaria (S/ 5.00)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
            S/ {totalAlcabalaMonth.toFixed(2)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('AGUA')}
          className={`pb-3 font-bold text-sm flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'AGUA'
              ? 'border-cyan-600 text-cyan-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>Padrón de Agua Ambulantes (S/ 4.00)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-mono">
            S/ {totalWaterMonth.toFixed(2)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('GESTION')}
          className={`pb-3 font-bold text-sm flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'GESTION'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Gestión y CRUD de Ambulantes ({merchantsList.length})</span>
        </button>
      </div>

      {/* Bar Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* Month */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Giro / Rubro */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Giro:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="TODOS">Todos los Giros</option>
              <option value="COMIDA">Comida</option>
              <option value="FRUTA">Fruta</option>
              <option value="CARNE">Carne</option>
              <option value="VERDURAS">Verduras</option>
              <option value="PAPA">Papa</option>
              <option value="VARIOS">Varios</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ambulante, DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* TAB 1: CUADRÍCULA DE COBRO DIARIO (ALCABALA) */}
      {activeTab === 'CRONOGRAMA' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="py-2.5 px-3 border border-slate-200 text-center sticky left-0 bg-slate-100 z-30 w-10">N°</th>
                  <th className="py-2.5 px-3 border border-slate-200 sticky left-10 bg-slate-100 z-30 min-w-[200px]">Apellidos y Nombres</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center sticky left-[240px] bg-slate-100 z-30 min-w-[90px]">Giro</th>

                  {/* Días 1..31 */}
                  {daysArray.map((day) => (
                    <th key={day} className="py-2.5 px-1 border border-slate-200 text-center min-w-[34px] w-[34px]">
                      {day}
                    </th>
                  ))}

                  <th className="py-2.5 px-3 border border-slate-200 text-right min-w-[90px] sticky right-0 bg-slate-100 z-30">
                    Total S/
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.map((merchant, index) => {
                  let merchantTotal = 0;

                  return (
                    <tr key={merchant.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-2 px-3 border border-slate-200 text-center font-bold text-slate-500 sticky left-0 bg-white z-10">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 font-bold text-slate-800 truncate sticky left-10 bg-white z-10">
                        <div className="flex items-center justify-between">
                          <span>{merchant.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">{merchant.dni || ''}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 border border-slate-200 text-center sticky left-[240px] bg-white z-10">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {merchant.cat}
                        </span>
                      </td>

                      {/* Casilleros de días 1..31 */}
                      {daysArray.map((day) => {
                        const key = `${merchant.id}-${day}`;
                        const pay = paymentsMap[key];
                        const isPaid = !!pay;
                        if (isPaid) merchantTotal += pay.amount;

                        return (
                          <td
                            key={day}
                            onClick={() => handleCellClick(merchant, day)}
                            title={isPaid ? `Pagado S/ ${pay.amount.toFixed(2)} - Click para reimprimir recibo` : `Click para cobrar Día ${day} (S/ 5.00)`}
                            className={`py-2 px-1 border border-slate-200 text-center font-bold font-mono text-[11px] cursor-pointer transition select-none ${
                              isPaid
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'hover:bg-amber-100 text-slate-300'
                            }`}
                          >
                            {isPaid ? '5' : '·'}
                          </td>
                        );
                      })}

                      <td className="py-2 px-3 border border-slate-200 text-right font-black font-mono text-emerald-800 sticky right-0 bg-white z-10">
                        S/ {merchantTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COBRO DE AGUA AMBULANTES */}
      {activeTab === 'AGUA' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Padrón de Cobranza de Agua - Ambulantes Fijos ({MONTHS.find((m) => m.val === selectedMonth)?.name} {selectedYear})
              </h3>
              <p className="text-[11px] text-slate-400">Cuota fija mensual de S/ 4.00 (editable por comerciante)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">N°</th>
                  <th className="py-3 px-4">Comerciante</th>
                  <th className="py-3 px-4">Giro</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Cuota Agua</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.map((merchant, idx) => {
                  const isPaid = !!waterPaymentsMap[merchant.id]?.paid;

                  return (
                    <tr key={merchant.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{merchant.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {merchant.cat}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{merchant.dni || '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">S/ 4.00</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleWaterClick(merchant)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 mx-auto ${
                            isPaid
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm'
                          }`}
                        >
                          {isPaid ? <Printer className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                          <span>{isPaid ? 'Imprimir Recibo' : 'Cobrar S/ 4.00'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CRUD COMPLETO DE AMBULANTES FIJOS */}
      {activeTab === 'GESTION' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Directorio y CRUD de Ambulantes Fijos Registrados
              </h3>
              <p className="text-[11px] text-slate-400">Edición, alta y baja de comerciantes ambulantes autorizados</p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Ambulante</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código / N°</th>
                  <th className="py-3 px-4">Apellidos y Nombres</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Giro / Rubro</th>
                  <th className="py-3 px-4">Tarifa Alcabala</th>
                  <th className="py-3 px-4">Tarifa Agua</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.map((merchant, idx) => (
                  <tr key={merchant.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                      {merchant.internalCode || `MB-AF-${String(idx + 1).padStart(4, '0')}`}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{merchant.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{merchant.dni || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{merchant.phone || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {merchant.cat}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">S/ 5.00 / día</td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-800">S/ 4.00 / mes</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(merchant)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Editar datos de ambulante"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMerchant(merchant)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                          title="Dar de baja / eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL COBRO RÁPIDO */}
      {paymentModal.isOpen && paymentModal.merchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Registrar Cobro
                </h3>
                <p className="text-[11px] text-slate-400">
                  {paymentModal.conceptType === 'ALCABALA' ? `Alcabala Día ${paymentModal.day}` : 'Cuota Mensual Agua'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-800">{paymentModal.merchant.name}</div>
              <div className="text-[11px] text-slate-500">Giro: {paymentModal.merchant.cat}</div>
              <div className="text-[11px] text-slate-500">
                Periodo: {MONTHS.find((m) => m.val === selectedMonth)?.name} {selectedYear}
              </div>
            </div>

            <div className="space-y-3 text-xs mb-5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto a Cobrar (S/)</label>
                <input
                  type="number"
                  step="0.50"
                  value={paymentModal.amount}
                  onChange={(e) =>
                    setPaymentModal((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-base font-black text-emerald-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['EFECTIVO', 'YAPE'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentModal((prev) => ({ ...prev, paymentMethod: m }))}
                      className={`py-2 rounded-xl text-xs font-black transition border ${
                        paymentModal.paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Cobrando...' : 'Cobrar e Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR AMBULANTE FIJO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-700" />
              <span>Nuevo Ambulante Fijo</span>
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: María Elena"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Quispe Huamán"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DNI (8 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="45123456"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="ej: 984123456"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Giro / Rubro Comercial</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 font-bold text-slate-800 outline-none"
                >
                  <option value="COMIDA">Comida</option>
                  <option value="FRUTA">Fruta</option>
                  <option value="CARNE">Carne</option>
                  <option value="VERDURAS">Verduras</option>
                  <option value="PAPA">Papa</option>
                  <option value="VARIOS">Varios</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMerchant}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  {savingMerchant ? 'Guardando...' : 'Guardar Ambulante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR AMBULANTE FIJO */}
      {isEditModalOpen && editingMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-700" />
              <span>Editar Ambulante Fijo</span>
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DNI</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Giro / Rubro Comercial</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 font-bold text-slate-800 outline-none"
                >
                  <option value="COMIDA">Comida</option>
                  <option value="FRUTA">Fruta</option>
                  <option value="CARNE">Carne</option>
                  <option value="VERDURAS">Verduras</option>
                  <option value="PAPA">Papa</option>
                  <option value="VARIOS">Varios</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMerchant}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold"
                >
                  {savingMerchant ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
