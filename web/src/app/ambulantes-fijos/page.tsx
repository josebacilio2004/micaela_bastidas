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
} from 'lucide-react';

interface AmbulanteFijo {
  id: string;
  num: number;
  name: string;
  cat: string;
  dailyRate: number;
  waterRate: number;
  dni?: string;
  internalCode?: string;
}

const DEFAULT_AMBULANTES: AmbulanteFijo[] = [
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
  const [activeTab, setActiveTab] = useState<'CRONOGRAMA' | 'AGUA'>('CRONOGRAMA');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [search, setSearch] = useState('');
  const [merchantsList, setMerchantsList] = useState<AmbulanteFijo[]>(DEFAULT_AMBULANTES);
  const [paymentsMap, setPaymentsMap] = useState<Record<string, { amount: number; op?: string }>>({});
  const [waterPaymentsMap, setWaterPaymentsMap] = useState<Record<string, { paid: boolean; op?: string }>>({});
  const [loading, setLoading] = useState(false);

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
      // 1. Obtener comerciantes ambulantes fijos del sistema
      const res = await apiRequest('/merchants?merchantType=AMBULANTE_FIJO');
      if (Array.isArray(res) && res.length > 0) {
        const mapped: AmbulanteFijo[] = res.map((m: any, idx: number) => ({
          id: m.id,
          num: idx + 1,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
          cat: m.businessCategory || 'VARIOS',
          dailyRate: 5,
          waterRate: 4,
          dni: m.dni,
          internalCode: m.internalCode,
        }));
        setMerchantsList(mapped);
      }

      // 2. Cargar pagos del periodo
      const periodStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const paymentsRes = await apiRequest(`/payments?take=1000`);
      if (paymentsRes && Array.isArray(paymentsRes.items)) {
        const pMap: Record<string, { amount: number; op?: string }> = {};
        const wMap: Record<string, { paid: boolean; op?: string }> = {};

        paymentsRes.items.forEach((p: any) => {
          if (!p.isVoided) {
            // Revisar notas o period
            const mId = p.merchantId;
            if (mId) {
              if (p.notes && p.notes.startsWith(`DIA-`)) {
                // e.g. DIA-5-1-2026
                pMap[`${mId}-${p.notes}`] = { amount: Number(p.amount), op: p.operationNumber };
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
    } catch (err) {
      console.error('Error loading ambulantes fijos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Filtrado de ambulantes
  const filteredAmbulantes = useMemo(() => {
    return merchantsList.filter((m) => {
      if (selectedCategory !== 'TODOS' && m.cat !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.dni && m.dni.includes(q));
      }
      return true;
    });
  }, [merchantsList, selectedCategory, search]);

  const categories = useMemo(() => {
    const set = new Set(merchantsList.map((m) => m.cat));
    return ['TODOS', ...Array.from(set)];
  }, [merchantsList]);

  // Manejar click en día
  const handleDayClick = (merchant: AmbulanteFijo, day: number) => {
    const key = `${merchant.id}-DIA-${day}-${selectedMonth}-${selectedYear}`;
    const existing = paymentsMap[key];
    if (existing) {
      alert(`✓ Cobro registrado para el día ${day}/${selectedMonth}/${selectedYear}\nMonto: S/ ${existing.amount.toFixed(2)}\nComprobante: ${existing.op || 'Generado'}`);
      return;
    }

    setPaymentModal({
      isOpen: true,
      merchant,
      day,
      conceptType: 'ALCABALA',
      amount: merchant.dailyRate || 5.0,
      paymentMethod: 'EFECTIVO',
    });
  };

  const handleWaterClick = (merchant: AmbulanteFijo) => {
    const existing = waterPaymentsMap[merchant.id];
    if (existing?.paid) {
      alert(`✓ El servicio de agua para ${merchant.name} ya está PAGADO en este mes (${selectedMonth}/${selectedYear}).\nComprobante: ${existing.op || 'Emitido'}`);
      return;
    }

    setPaymentModal({
      isOpen: true,
      merchant,
      conceptType: 'AGUA',
      amount: merchant.waterRate || 4.0,
      paymentMethod: 'EFECTIVO',
    });
  };

  // Registrar cobro
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal.merchant) return;
    setIsSubmitting(true);

    try {
      const isAlcabala = paymentModal.conceptType === 'ALCABALA';
      const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const noteTag = isAlcabala
        ? `DIA-${paymentModal.day}-${selectedMonth}-${selectedYear}`
        : `AGUA-AMBULANTE-${period}`;

      // Buscar id de concepto
      const concepts = await apiRequest('/concepts');
      let conceptId = '';
      if (Array.isArray(concepts)) {
        const targetCode = isAlcabala ? 'ALCABALA' : 'AGUA';
        const found = concepts.find((c: any) => c.code.includes(targetCode));
        if (found) conceptId = found.id;
      }

      const res = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          merchantId: paymentModal.merchant.id,
          conceptId: conceptId || (isAlcabala ? 'ALCABALA' : 'AGUA'),
          amount: Number(paymentModal.amount),
          period,
          paymentMethod: paymentModal.paymentMethod,
          notes: noteTag,
        }),
      });

      alert(`✓ Cobro registrado exitosamente en Caja.\nComprobante N°: ${res.operationNumber || 'Generado'}\nImporte: S/ ${Number(paymentModal.amount).toFixed(2)}`);

      // Actualizar estado local
      if (isAlcabala) {
        const key = `${paymentModal.merchant.id}-${noteTag}`;
        setPaymentsMap((prev) => ({
          ...prev,
          [key]: { amount: Number(paymentModal.amount), op: res.operationNumber },
        }));
      } else {
        setWaterPaymentsMap((prev) => ({
          ...prev,
          [paymentModal.merchant!.id]: { paid: true, op: res.operationNumber },
        }));
      }

      setPaymentModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(err.message || 'Error al registrar cobro');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar Excel
  const exportToExcel = () => {
    let csvContent = '\uFEFF';
    csvContent += `MERCADO DE ABASTOS MICAELA BASTIDAS\r\n`;
    csvContent += `CRONOGRAMA DE COBRANZA ALCABALA FIJO - ${MONTHS.find((m) => m.val === selectedMonth)?.name?.toUpperCase()} ${selectedYear}\r\n`;
    csvContent += `TARIFA DIARIA: S/ 5.00 (Vigente 2026)\r\n\r\n`;

    const headers = ['N°', 'APELLIDOS Y NOMBRES', 'GIRO / SECCION', 'TARIFA DIARIA'];
    daysArray.forEach((d) => headers.push(`D${d}`));
    headers.push('TOTAL MES S/');
    csvContent += headers.join(';') + '\r\n';

    filteredAmbulantes.forEach((m) => {
      const row = [m.num, m.name, m.cat, m.dailyRate.toFixed(2)];
      let totalRow = 0;
      daysArray.forEach((d) => {
        const key = `${m.id}-DIA-${d}-${selectedMonth}-${selectedYear}`;
        const p = paymentsMap[key];
        if (p) {
          row.push(p.amount.toFixed(2));
          totalRow += p.amount;
        } else {
          row.push('');
        }
      });
      row.push(totalRow.toFixed(2));
      csvContent += row.join(';') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALCABALA_AMBULANTES_FIJOS_${selectedMonth}_${selectedYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-600" />
            Ambulantes Fijos: Alcabala & Agua
          </h1>
          <p className="text-xs text-slate-500">
            Cronograma diario (días 1 al 31) a partir de <b>enero de 2026</b> con tarifa diaria de <b>S/ 5.00</b> editable y cobro de agua mensual de <b>S/ 4.00</b>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir Planilla</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas: Alcabala Diaria vs Agua Mensual */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('CRONOGRAMA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'CRONOGRAMA'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Cronograma Alcabala (Días 1 al 31)</span>
          </button>
          <button
            onClick={() => setActiveTab('AGUA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'AGUA'
                ? 'bg-blue-700 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Agua Potable Mensual (S/ 4.00)</span>
          </button>
        </div>

        {/* Selector de Periodo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-bold text-slate-500 mr-2">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-bold text-slate-500 mr-2">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtros de Categoría y Búsqueda */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Sección:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedCategory === c
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar ambulante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-48 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* TAB 1: CRONOGRAMA DIARIO ALCABALA */}
      {activeTab === 'CRONOGRAMA' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
                Planilla Diaria de Alcabala - {MONTHS.find((m) => m.val === selectedMonth)?.name} {selectedYear}
              </h3>
              <p className="text-[11px] text-slate-500">
                Haga clic en cualquier casilla de día (1 al {daysInMonth}) para registrar o verificar el pago diario.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cobrado en Caja
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                Día Libre / Pendiente
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
                <tr>
                  <th className="p-2 text-center w-10 border-r border-slate-200">N°</th>
                  <th className="p-2 min-w-[180px] border-r border-slate-200">Comerciante</th>
                  <th className="p-2 min-w-[100px] border-r border-slate-200">Giro</th>
                  <th className="p-2 text-center min-w-[70px] border-r border-slate-200">S/ Día</th>
                  {daysArray.map((d) => (
                    <th key={d} className="p-1.5 text-center w-9 border-r border-slate-200 text-[10px]">
                      {d}
                    </th>
                  ))}
                  <th className="p-2 text-right min-w-[90px] bg-slate-200 text-slate-900">Total S/</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAmbulantes.map((m) => {
                  let rowTotal = 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-2 text-center font-mono font-bold text-slate-400 border-r border-slate-200">
                        {m.num}
                      </td>
                      <td className="p-2 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                        {m.name}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {m.cat}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800 border-r border-slate-200">
                        S/ {m.dailyRate.toFixed(2)}
                      </td>

                      {/* Cuadrículas de días */}
                      {daysArray.map((d) => {
                        const key = `${m.id}-DIA-${d}-${selectedMonth}-${selectedYear}`;
                        const payment = paymentsMap[key];
                        if (payment) rowTotal += payment.amount;

                        return (
                          <td
                            key={d}
                            onClick={() => handleDayClick(m, d)}
                            className={`p-0 text-center border-r border-slate-200 cursor-pointer select-none transition ${
                              payment
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-black'
                                : 'hover:bg-slate-200/60 text-slate-300'
                            }`}
                            title={`Día ${d}: ${m.name} - ${payment ? `Cobrado S/ ${payment.amount.toFixed(2)}` : 'Clic para cobrar'}`}
                          >
                            <div className="w-8 h-8 flex items-center justify-center text-[10px]">
                              {payment ? '✓' : ''}
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-2 text-right font-mono font-black text-slate-900 bg-slate-50">
                        S/ {rowTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COBRANZA DE AGUA */}
      {activeTab === 'AGUA' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
                Padrón de Agua Potable Ambulantes Fijos - {MONTHS.find((m) => m.val === selectedMonth)?.name} {selectedYear}
              </h3>
              <p className="text-[11px] text-slate-500">
                Cuota mensual oficial de agua: <b>S/ 4.00</b> (con opción de editar importe en ventanilla).
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600">
              Total ambulantes: {filteredAmbulantes.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-12">N°</th>
                  <th className="p-3">Ambulante Titular</th>
                  <th className="p-3">Sección / Giro</th>
                  <th className="p-3 text-center">Tarifa Agua</th>
                  <th className="p-3 text-center">Estado del Mes</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAmbulantes.map((m) => {
                  const isPaid = Boolean(waterPaymentsMap[m.id]?.paid);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">{m.num}</td>
                      <td className="p-3 font-bold text-slate-800">{m.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {m.cat}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700">
                        S/ {m.waterRate.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isPaid ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleWaterClick(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                            isPaid
                              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isPaid ? 'Ver Pago' : 'Cobrar Agua (S/ 4)'}
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

      {/* Modal para Registrar Cobro con Monto Editable */}
      {paymentModal.isOpen && paymentModal.merchant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm uppercase text-slate-800">
                  {paymentModal.conceptType === 'ALCABALA'
                    ? `Cobro Alcabala Día ${paymentModal.day}`
                    : 'Cobro Agua Potable'}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500 font-bold uppercase text-[10px]">Ambulante Fijo:</p>
                <p className="font-black text-slate-800 text-sm">{paymentModal.merchant.name}</p>
                <p className="text-slate-600 font-medium">Giro: {paymentModal.merchant.cat}</p>
                <p className="text-slate-500 text-[11px]">
                  Período: {MONTHS.find((m) => m.val === selectedMonth)?.name} {selectedYear}
                  {paymentModal.day ? ` (Día ${paymentModal.day})` : ''}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto a Cobrar (S/ - Editable) *
                </label>
                <input
                  type="number"
                  step="0.50"
                  required
                  min="0.50"
                  value={paymentModal.amount}
                  onChange={(e) =>
                    setPaymentModal((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Método de Pago *
                </label>
                <select
                  value={paymentModal.paymentMethod}
                  onChange={(e) =>
                    setPaymentModal((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="EFECTIVO">💵 Efectivo (Caja)</option>
                  <option value="YAPE">📱 Yape</option>
                  <option value="PLIN">📱 Plin</option>
                  <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar Cobro en Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
