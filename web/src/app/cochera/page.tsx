'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Car,
  Calendar,
  CheckCircle2,
  DollarSign,
  Printer,
  FileSpreadsheet,
  Wallet,
  Search,
  RefreshCw,
  Plus,
  X,
  CreditCard,
  Edit2,
  Check,
} from 'lucide-react';

interface CocheraUser {
  id: string;
  name: string;
  defaultDailyFee: number;
  vehicleType?: string;
  plate?: string;
}

const INITIAL_COCHERA_USERS: CocheraUser[] = [
  { id: 'COC-01', name: 'CLAUDIA ROJAS', defaultDailyFee: 3.00, vehicleType: 'Auto' },
  { id: 'COC-02', name: 'ROCIO RAMOS', defaultDailyFee: 4.00, vehicleType: 'Camioneta' },
  { id: 'COC-03', name: 'DINA CONOVILCA', defaultDailyFee: 3.00, vehicleType: 'Auto' },
  { id: 'COC-04', name: 'DEYSI ARAUJO', defaultDailyFee: 4.00, vehicleType: 'Camioneta' },
  { id: 'COC-05', name: 'LEONA ANCASI', defaultDailyFee: 4.00, vehicleType: 'Camioneta' },
  { id: 'COC-06', name: 'MARI CAMPOS', defaultDailyFee: 3.00, vehicleType: 'Auto' },
  { id: 'COC-07', name: 'RUTH FELIX', defaultDailyFee: 2.00, vehicleType: 'Moto / Triciclo' },
  { id: 'COC-08', name: 'CLARA DE LA CRUZ', defaultDailyFee: 2.00, vehicleType: 'Moto / Triciclo' },
  { id: 'COC-09', name: 'FELICIANA HUAMANI', defaultDailyFee: 3.00, vehicleType: 'Auto' },
  { id: 'COC-10', name: 'WENDY', defaultDailyFee: 2.00, vehicleType: 'Moto' },
  { id: 'COC-11', name: 'YESICA HINOSTROZA', defaultDailyFee: 2.00, vehicleType: 'Moto' },
  { id: 'COC-12', name: 'ESTHER DE LA CRUZ', defaultDailyFee: 1.50, vehicleType: 'Bicicleta / Pequeño' },
  { id: 'COC-13', name: 'LETICIA', defaultDailyFee: 3.00, vehicleType: 'Auto' },
];

export default function CocheraPage() {
  const [users, setUsers] = useState<CocheraUser[]>(INITIAL_COCHERA_USERS);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Period
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // 1 = Enero

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Daily payments map: key = `${userId}-${year}-${month}-${day}` -> { paid: boolean, amount: number, paymentId?: string }
  const [paymentsMap, setPaymentsMap] = useState<Record<string, { paid: boolean; amount: number; paymentId?: string }>>({});

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [modalTargetUser, setModalTargetUser] = useState<CocheraUser | null>(null);
  const [modalDay, setModalDay] = useState<number>(1);
  const [modalAmount, setModalAmount] = useState<number>(3.00);
  const [modalPaymentMethod, setModalPaymentMethod] = useState<'EFECTIVO' | 'YAPE'>('EFECTIVO');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Month days count (28, 29, 30, 31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Load Data from Backend & Local Storage
  const loadData = async () => {
    setLoading(true);
    try {
      const [currentReg, paymentsRes] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/payments?take=800').catch(() => ({ items: [] })),
      ]);

      setActiveRegister(currentReg);

      const newMap: Record<string, { paid: boolean; amount: number; paymentId?: string }> = {};

      // Match backend payments
      const items = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
      items.forEach((p: any) => {
        if (p.notes && p.notes.includes('COCHERA-')) {
          // format: COCHERA-[userId]-[day]-[month]-[year]
          const match = p.notes.match(/COCHERA-([A-Za-z0-9_-]+)-(\d+)-(\d+)-(\d+)/);
          if (match) {
            const [, uId, d, m, y] = match;
            const key = `${uId}-${y}-${m}-${d}`;
            newMap[key] = { paid: true, amount: Number(p.amount), paymentId: p.id };
          }
        }
      });

      // Load local cache as well
      const localCache = localStorage.getItem('mb_cochera_payments');
      if (localCache) {
        try {
          const parsed = JSON.parse(localCache);
          Object.assign(newMap, parsed);
        } catch (_) {}
      }

      setPaymentsMap(newMap);
    } catch (err) {
      console.error('Error cargando cochera:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Open modal or direct toggle
  const handleCellClick = (user: CocheraUser, day: number) => {
    const key = `${user.id}-${selectedYear}-${selectedMonth}-${day}`;
    const current = paymentsMap[key];

    if (current?.paid) {
      // Toggle off / remove
      if (confirm(`¿Anular el cobro de Cochera del día ${day} para ${user.name}?`)) {
        const next = { ...paymentsMap };
        delete next[key];
        setPaymentsMap(next);
        localStorage.setItem('mb_cochera_payments', JSON.stringify(next));
      }
    } else {
      // Open quick pay modal
      setModalTargetUser(user);
      setModalDay(day);
      setModalAmount(user.defaultDailyFee);
      setModalPaymentMethod('EFECTIVO');
      setPayModalOpen(true);
    }
  };

  // Submit payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTargetUser) return;

    setProcessingPayment(true);
    const key = `${modalTargetUser.id}-${selectedYear}-${selectedMonth}-${modalDay}`;
    const dayStr = String(modalDay).padStart(2, '0');
    const monthStr = String(selectedMonth).padStart(2, '0');

    try {
      const conceptDesc = `Cochera: ${modalTargetUser.name} - Día ${dayStr}/${monthStr}/${selectedYear}`;
      const notesRef = `COCHERA-${modalTargetUser.id}-${modalDay}-${selectedMonth}-${selectedYear}`;

      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: conceptDesc,
          amount: modalAmount,
          reference: notesRef,
        }),
      }).catch((err) => {
        console.warn('Nota: Movimiento registrado vía fallback:', err);
      });

      const updated = {
        ...paymentsMap,
        [key]: { paid: true, amount: modalAmount },
      };
      setPaymentsMap(updated);
      localStorage.setItem('mb_cochera_payments', JSON.stringify(updated));

      setPayModalOpen(false);
    } catch (err: any) {
      alert('Error registrando pago: ' + (err.message || 'Error de red'));
    } finally {
      setProcessingPayment(false);
    }
  };

  // Edit user default fee
  const handleUpdateFee = (userId: string, newFee: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, defaultDailyFee: newFee } : u))
    );
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.vehicleType && u.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  // Compute Totals
  const userTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    users.forEach((u) => {
      let sum = 0;
      daysArray.forEach((d) => {
        const key = `${u.id}-${selectedYear}-${selectedMonth}-${d}`;
        if (paymentsMap[key]?.paid) {
          sum += paymentsMap[key].amount;
        }
      });
      totals[u.id] = sum;
    });
    return totals;
  }, [users, paymentsMap, selectedYear, selectedMonth, daysArray]);

  const dailyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    daysArray.forEach((d) => {
      let sum = 0;
      users.forEach((u) => {
        const key = `${u.id}-${selectedYear}-${selectedMonth}-${d}`;
        if (paymentsMap[key]?.paid) {
          sum += paymentsMap[key].amount;
        }
      });
      totals[d] = sum;
    });
    return totals;
  }, [users, paymentsMap, selectedYear, selectedMonth, daysArray]);

  const grandTotal = useMemo(() => {
    return Object.values(userTotals).reduce((a, b) => a + b, 0);
  }, [userTotals]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    let csv = `\uFEFFASOCIACIÓN DE COMERCIANTES MERCADO MICAELA BASTIDAS\r\n`;
    csv += `CONTROL DE COCHERA Y ESTACIONAMIENTO - ${monthNames[selectedMonth - 1].toUpperCase()} ${selectedYear}\r\n\r\n`;
    csv += `N°,APELLIDOS Y NOMBRES,TARIFA DIA,VEHICULO,${daysArray.join(',')},TOTAL RECAUDADO (S/)\r\n`;

    users.forEach((u, idx) => {
      const daysCols = daysArray.map((d) => {
        const key = `${u.id}-${selectedYear}-${selectedMonth}-${d}`;
        return paymentsMap[key]?.paid ? paymentsMap[key].amount.toFixed(2) : '0';
      });
      csv += `${idx + 1},"${u.name}",${u.defaultDailyFee.toFixed(2)},"${u.vehicleType || ''}",${daysCols.join(',')},${(userTotals[u.id] || 0).toFixed(2)}\r\n`;
    });

    const daySums = daysArray.map((d) => (dailyTotals[d] || 0).toFixed(2));
    csv += `,,TOTALES DIARIOS (S/),,${daySums.join(',')},${grandTotal.toFixed(2)}\r\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cochera_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Car className="w-7 h-7 text-emerald-600" />
            Control de Cochera y Estacionamiento
          </h1>
          <p className="text-xs text-slate-500">
            Registro diario de cobranza por estacionamiento para los comerciantes autorizados (días 1 al 31). Tarifas editables por vehículo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-sm font-bold">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <span className="text-slate-300">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Total Usuarios Cochera</span>
          <p className="text-2xl font-black text-slate-800 font-mono mt-1">{users.length} personas</p>
          <span className="text-[11px] text-slate-400">hoja oficial COCHERA</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-emerald-800 block">Recaudación {monthNames[selectedMonth - 1]} {selectedYear}</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {grandTotal.toFixed(2)}</p>
          <span className="text-[11px] text-emerald-600 font-bold">total cobrado en el mes</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase text-slate-400 block">Estado de Caja</span>
          <p className="text-base font-black text-slate-800 mt-1 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            {activeRegister ? activeRegister.name : 'Caja Cerrada (registro local)'}
          </p>
          <span className="text-[11px] text-slate-400">cobros ingresan directamente</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o tipo de vehículo..."
            className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Mostrando {filteredUsers.length} de {users.length} autorizados
        </span>
      </div>

      {/* Grid Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-white font-black text-[10px] uppercase">
              <tr>
                <th className="p-2.5 border-r border-slate-800 w-8 text-center sticky left-0 bg-slate-900 z-10">N°</th>
                <th className="p-2.5 border-r border-slate-800 min-w-[200px] sticky left-8 bg-slate-900 z-10">
                  Apellidos y Nombres
                </th>
                <th className="p-2.5 border-r border-slate-800 w-24 text-center">Tarifa (S/)</th>
                {daysArray.map((d) => (
                  <th key={d} className="p-1 border-r border-slate-800 text-center w-8 min-w-[32px]">
                    {d}
                  </th>
                ))}
                <th className="p-2.5 text-right min-w-[90px] bg-emerald-950 text-emerald-200">Total (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredUsers.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-400 sticky left-0 bg-white z-10">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-100 sticky left-8 bg-white z-10 font-sans">
                    <p className="font-bold text-slate-900 leading-tight">{u.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{u.vehicleType}</p>
                  </td>
                  <td className="p-1 border-r border-slate-100 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-slate-400 text-[10px]">S/</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={u.defaultDailyFee}
                        onChange={(e) => handleUpdateFee(u.id, parseFloat(e.target.value) || 0)}
                        className="w-12 text-center font-black font-mono bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </td>
                  {daysArray.map((d) => {
                    const key = `${u.id}-${selectedYear}-${selectedMonth}-${d}`;
                    const isPaid = paymentsMap[key]?.paid;
                    const paidAmount = paymentsMap[key]?.amount;

                    return (
                      <td
                        key={d}
                        onClick={() => handleCellClick(u, d)}
                        className={`p-1 border-r border-slate-100 text-center cursor-pointer transition select-none ${
                          isPaid
                            ? 'bg-emerald-500 text-white font-black hover:bg-emerald-600'
                            : 'hover:bg-emerald-50 text-slate-300 hover:text-emerald-700'
                        }`}
                        title={isPaid ? `Día ${d}: Pagado S/ ${paidAmount}` : `Día ${d}: Clic para cobrar S/ ${u.defaultDailyFee}`}
                      >
                        {isPaid ? '✓' : '•'}
                      </td>
                    );
                  })}
                  <td className="p-2 font-black text-right text-emerald-700 bg-emerald-50/50">
                    S/ {(userTotals[u.id] || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot className="bg-slate-100 font-mono font-black text-[11px] border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="p-2.5 text-slate-700 uppercase font-sans sticky left-0 bg-slate-100 z-10">
                  Total Diario Recaudado
                </td>
                <td className="p-2.5 text-center text-slate-500">—</td>
                {daysArray.map((d) => (
                  <td key={d} className="p-1 border-r border-slate-200 text-center text-[10px] text-slate-800">
                    {(dailyTotals[d] || 0) > 0 ? (dailyTotals[d] || 0).toFixed(0) : ''}
                  </td>
                ))}
                <td className="p-2.5 text-right font-black text-sm text-emerald-800 bg-emerald-100">
                  S/ {grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* QUICK PAYMENT MODAL */}
      {payModalOpen && modalTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Cobro de Cochera</h3>
                <p className="text-xs text-slate-400">
                  Día {modalDay} de {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">Usuario Autorizado:</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">{modalTargetUser.name}</span>
                <span className="text-[11px] text-slate-500 font-mono block mt-0.5">{modalTargetUser.vehicleType}</span>
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1">
                  Monto a Cobrar (Editable):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={modalAmount}
                    onChange={(e) => setModalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-black text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Medio de Pago</label>
                <select
                  value={modalPaymentMethod}
                  onChange={(e) => setModalPaymentMethod(e.target.value as any)}
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
                  className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md shadow-emerald-200 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{processingPayment ? 'Registrando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
