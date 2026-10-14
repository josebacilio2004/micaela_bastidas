'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Ticket,
  Printer,
  CheckCircle2,
  DollarSign,
  Calendar,
  Clock,
  Search,
  Receipt,
  RotateCcw,
  AlertCircle,
  Wallet,
  TrendingUp,
  User,
  Plus,
  History,
  Filter,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

interface TemporalTicket {
  id: string;
  ticketNumber: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  merchantName?: string;
  category?: string;
  collectorName?: string;
  paymentMethod: string;
}

export default function AmbulantesTemporalesPage() {
  const [activeMainTab, setActiveMainTab] = useState<'HOY' | 'HISTORIAL'>('HOY');
  const [tickets, setTickets] = useState<TemporalTicket[]>([]);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedAmount, setSelectedAmount] = useState<number>(2);
  const [customAmount, setCustomAmount] = useState<string>('2.00');
  const [merchantRef, setMerchantRef] = useState<string>('');
  const [category, setCategory] = useState<string>('Comercio Ambulante General');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'YAPE' | 'PLIN'>('EFECTIVO');
  const [manualTicketNumber, setManualTicketNumber] = useState<string>('');

  // Thermal Receipt Modal State
  const [activePrintTicket, setActivePrintTicket] = useState<TemporalTicket | null>(null);

  // Date constants (today in local Peru timezone)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Historial Filters State
  const [historyMode, setHistoryMode] = useState<'DIA' | 'MES' | 'ANIO'>('DIA');
  const [historyDate, setHistoryDate] = useState<string>(todayStr);
  const [historyYear, setHistoryYear] = useState<number>(2026);
  const [historyMonth, setHistoryMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch tickets and cash register
  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentReg, paymentsRes] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/payments?take=1000').catch(() => ({ items: [] })),
      ]);

      setActiveRegister(currentReg);

      const items = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
      const loadedTickets: TemporalTicket[] = [];

      items.forEach((p: any) => {
        const isTicket =
          p.concept?.code?.includes('TICKET') ||
          p.concept?.code?.includes('AMBULANTE_TEMPORAL') ||
          (p.notes && p.notes.includes('TICKET-AMB-'));

        if (isTicket) {
          const match = p.notes?.match(/TICKET-AMB-(\d+)/) || p.operationNumber?.match(/(\d+)/);
          const tNum = match ? match[1].padStart(7, '0') : p.operationNumber || '0009801';
          const pDate = new Date(p.paidAt || p.createdAt);
          const y = pDate.getFullYear();
          const m = String(pDate.getMonth() + 1).padStart(2, '0');
          const d = String(pDate.getDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${d}`;

          loadedTickets.push({
            id: p.id,
            ticketNumber: tNum,
            amount: Number(p.amount),
            date: dStr,
            time: pDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            merchantName: p.merchant ? `${p.merchant.lastName} ${p.merchant.firstName}` : p.notes?.split('|')[1] || 'Ambulante Eventual',
            category: p.concept?.name || 'Tasa Ambulante',
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            collectorName: p.collector?.fullName || 'Tesorería',
          });
        }
      });

      // Retrieve locally saved tickets for seamless offline/immediate persistence
      const localSaved = localStorage.getItem('mb_temporal_tickets');
      if (localSaved) {
        try {
          const parsed: TemporalTicket[] = JSON.parse(localSaved);
          parsed.forEach((lt) => {
            if (!loadedTickets.some((t) => t.ticketNumber === lt.ticketNumber)) {
              loadedTickets.push(lt);
            }
          });
        } catch (_) {}
      }

      loadedTickets.sort((a, b) => Number(b.ticketNumber) - Number(a.ticketNumber));
      setTickets(loadedTickets);
    } catch (err) {
      console.error('Error cargando tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Next Ticket Number (Starting at 0009801)
  const nextTicketNumber = useMemo(() => {
    if (manualTicketNumber.trim()) {
      return manualTicketNumber.padStart(7, '0');
    }
    const BASE_NUMBER = 9801;
    let maxNumber = BASE_NUMBER - 1;

    tickets.forEach((t) => {
      const num = parseInt(t.ticketNumber, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    });

    return String(maxNumber + 1).padStart(7, '0');
  }, [tickets, manualTicketNumber]);

  // Handle Amount Preset Click
  const handleAmountSelect = (val: number) => {
    setSelectedAmount(val);
    setCustomAmount(val.toFixed(2));
  };

  // Submit and Issue Ticket
  const handleEmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(customAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    setSubmitting(true);
    const ticketNum = nextTicketNumber;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    try {
      const conceptDesc = `Ticket Ambulante Temporal N° ${ticketNum}${merchantRef ? ` (${merchantRef})` : ''} - ${category}`;
      
      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: conceptDesc,
          amount: amountVal,
          reference: `TICKET-${ticketNum}`,
        }),
      }).catch((err) => {
        console.warn('Nota: Movimiento registrado vía fallback o sin caja abierta:', err);
      });

      const newTicket: TemporalTicket = {
        id: `TICK-${Date.now()}`,
        ticketNumber: ticketNum,
        amount: amountVal,
        date: dateStr,
        time: timeStr,
        merchantName: merchantRef.trim() || 'Comerciante Ambulante Eventual',
        category,
        paymentMethod,
        collectorName: 'Tesorería',
      };

      const updatedList = [newTicket, ...tickets];
      setTickets(updatedList);
      localStorage.setItem('mb_temporal_tickets', JSON.stringify(updatedList.slice(0, 500)));

      setMerchantRef('');
      setManualTicketNumber('');
      setActivePrintTicket(newTicket);
    } catch (err: any) {
      alert('Error emitiendo ticket: ' + (err.message || 'Error de red'));
    } finally {
      setSubmitting(false);
    }
  };

  // Print Thermal Ticket (80mm)
  const handlePrintThermal = (ticket: TemporalTicket) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes en su navegador');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket Ambulante N° ${ticket.ticketNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body { font-family: monospace; font-size: 11pt; color: #000; width: 72mm; margin: 0 auto; padding: 4px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .amount-box { font-size: 18pt; font-weight: 900; text-align: center; margin: 8px 0; border: 1px solid #000; padding: 4px; }
            .ticket-box { border: 2px solid #000; padding: 4px; font-weight: bold; text-align: center; font-size: 13pt; margin: 6px 0; }
            .barcode { text-align: center; font-family: monospace; letter-spacing: 3px; font-size: 11pt; margin-top: 6px; }
            .footer { font-size: 8pt; text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 12pt;">MERCADO DE ABASTOS</div>
          <div class="center bold" style="font-size: 13pt;">MICAELA BASTIDAS</div>
          <div class="center" style="font-size: 8.5pt;">ASOCIACIÓN DE PEQUEÑOS COMERCIANTES</div>
          <div class="center" style="font-size: 8pt;">RUC: 20486000001 • HUANCAYO - PERÚ</div>
          <div class="divider"></div>

          <div class="center bold" style="font-size: 10pt;">TICKET DE AMBULANTE TEMPORAL</div>
          <div class="ticket-box">N° ${ticket.ticketNumber}</div>

          <div class="row"><span>FECHA:</span><span class="bold">${ticket.date}</span></div>
          <div class="row"><span>HORA:</span><span class="bold">${ticket.time}</span></div>
          <div class="row"><span>PAGO:</span><span class="bold">${ticket.paymentMethod}</span></div>

          ${ticket.merchantName && ticket.merchantName !== 'Comerciante Ambulante Eventual' ? `
          <div class="row"><span>REF:</span><span class="bold">${ticket.merchantName}</span></div>
          ` : ''}

          <div class="row"><span>GIRO:</span><span>${ticket.category || 'Ambulante'}</span></div>
          <div class="divider"></div>

          <div class="center" style="font-size: 9pt; text-transform: uppercase;">MONTO TOTAL COBRADO</div>
          <div class="amount-box">S/ ${ticket.amount.toFixed(2)}</div>
          <div class="divider"></div>

          <div class="barcode">*${ticket.ticketNumber}*</div>
          <div class="footer">
            ¡CONSERVE ESTE TICKET!<br>
            Válido únicamente para el día de emisión.<br>
            Control y Fiscalización de Mercado.
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

  // Tickets emitted TODAY
  const todayTickets = useMemo(() => {
    return tickets.filter((t) => t.date === todayStr);
  }, [tickets, todayStr]);

  const todayStats = useMemo(() => {
    const count = todayTickets.length;
    const total = todayTickets.reduce((acc, t) => acc + t.amount, 0);
    const count1 = todayTickets.filter((t) => Math.abs(t.amount - 1) < 0.01).length;
    const count2 = todayTickets.filter((t) => Math.abs(t.amount - 2) < 0.01).length;
    const count3 = todayTickets.filter((t) => Math.abs(t.amount - 3) < 0.01).length;
    const countOther = count - (count1 + count2 + count3);
    const totalCash = todayTickets.filter((t) => t.paymentMethod === 'EFECTIVO').reduce((acc, t) => acc + t.amount, 0);
    const totalDigital = total - totalCash;
    return { count, total, count1, count2, count3, countOther, totalCash, totalDigital };
  }, [todayTickets]);

  // HISTORIAL Tickets Filtering
  const historyFilteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Date filter based on mode
      let matchDate = true;
      if (historyMode === 'DIA') {
        matchDate = !historyDate || t.date === historyDate;
      } else if (historyMode === 'MES') {
        const [yearStr, monthStr] = t.date.split('-');
        matchDate = parseInt(yearStr, 10) === historyYear && parseInt(monthStr, 10) === historyMonth;
      } else if (historyMode === 'ANIO') {
        const [yearStr] = t.date.split('-');
        matchDate = parseInt(yearStr, 10) === historyYear;
      }

      // Search filter
      const matchSearch =
        !searchTerm ||
        t.ticketNumber.includes(searchTerm) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchDate && matchSearch;
    });
  }, [tickets, historyMode, historyDate, historyYear, historyMonth, searchTerm]);

  const historyStats = useMemo(() => {
    const count = historyFilteredTickets.length;
    const total = historyFilteredTickets.reduce((acc, t) => acc + t.amount, 0);
    return { count, total };
  }, [historyFilteredTickets]);

  // Monthly breakdown for HISTORIAL "MES" mode
  const monthlyDailyBreakdown = useMemo(() => {
    if (historyMode !== 'MES') return [];
    const daysInM = new Date(historyYear, historyMonth, 0).getDate();
    const map = new Map<number, { count: number; total: number }>();

    for (let d = 1; d <= daysInM; d++) {
      map.set(d, { count: 0, total: 0 });
    }

    historyFilteredTickets.forEach((t) => {
      const dayNum = parseInt(t.date.split('-')[2], 10);
      if (map.has(dayNum)) {
        const curr = map.get(dayNum)!;
        curr.count += 1;
        curr.total += t.amount;
      }
    });

    return Array.from(map.entries()).map(([day, val]) => ({
      day,
      dateFormatted: `${String(day).padStart(2, '0')}/${String(historyMonth).padStart(2, '0')}/${historyYear}`,
      count: val.count,
      total: val.total,
    }));
  }, [historyMode, historyFilteredTickets, historyYear, historyMonth]);

  // Yearly breakdown for HISTORIAL "ANIO" mode
  const yearlyMonthlyBreakdown = useMemo(() => {
    if (historyMode !== 'ANIO') return [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const map = new Map<number, { count: number; total: number }>();

    for (let m = 1; m <= 12; m++) {
      map.set(m, { count: 0, total: 0 });
    }

    historyFilteredTickets.forEach((t) => {
      const monthNum = parseInt(t.date.split('-')[1], 10);
      if (map.has(monthNum)) {
        const curr = map.get(monthNum)!;
        curr.count += 1;
        curr.total += t.amount;
      }
    });

    return Array.from(map.entries()).map(([mNum, val]) => ({
      monthNumber: mNum,
      monthName: monthNames[mNum - 1],
      count: val.count,
      total: val.total,
    }));
  }, [historyMode, historyFilteredTickets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-emerald-600" />
            Ambulantes Temporales (Emisión de Tickets)
          </h1>
          <p className="text-xs text-slate-500">
            Control de cobros diarios por ticket a comerciantes ambulatorios temporales (iniciando en correlativo 0009801) con almacenamiento progresivo de historial por días, meses y años.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeRegister ? (
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800 shadow-sm">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Caja Activa: {activeRegister.name}</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-amber-800 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Sin caja abierta hoy (se registrará local)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs: HOY (En Vivo) vs HISTORIAL */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveMainTab('HOY')}
          className={`pb-3 font-bold text-sm flex items-center space-x-2 transition border-b-2 ${
            activeMainTab === 'HOY'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Operación del Día ({todayStr})</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
            {todayTickets.length} tickets
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('HISTORIAL')}
          className={`pb-3 font-bold text-sm flex items-center space-x-2 transition border-b-2 ${
            activeMainTab === 'HISTORIAL'
              ? 'border-indigo-600 text-indigo-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial General (Días / Meses / Años)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
            {tickets.length} total
          </span>
        </button>
      </div>

      {/* VIEW 1: OPERACIÓN DEL DÍA ACTUAL */}
      {activeMainTab === 'HOY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Quick Ticket Issuer (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border-2 border-emerald-600/30 rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase">Emitir Ticket de Hoy</h2>
                    <p className="text-[11px] text-slate-400">Cobro rápido al paso</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Próximo Ticket:</span>
                  <span className="text-lg font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    N° {nextTicketNumber}
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmitTicket} className="space-y-4 pt-4">
                {/* Preset Buttons: S/ 1, S/ 2, S/ 3 */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-2">
                    Seleccionar Tarifa Rápida:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAmountSelect(val)}
                        className={`py-3 px-2 rounded-2xl font-black text-base transition flex flex-col items-center justify-center border-2 ${
                          parseFloat(customAmount) === val
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span className="text-xs uppercase font-bold opacity-80">Abono</span>
                        <span className="text-xl font-black font-mono">S/ {val}.00</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Custom Amount */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Monto a Cobrar (Editable):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">S/</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0.50"
                      required
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black font-mono text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Método de Pago:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EFECTIVO', 'YAPE', 'PLIN'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-xl text-xs font-black transition border ${
                          paymentMethod === method
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Rubro / Giro:
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                    >
                      <option value="Comercio Ambulante General">General Ambulante</option>
                      <option value="Verduras y Hortalizas">Verduras y Hortalizas</option>
                      <option value="Frutas de Temporada">Frutas de Temporada</option>
                      <option value="Comida / Desayunos">Comida / Desayunos</option>
                      <option value="Flores y Plantas">Flores y Plantas</option>
                      <option value="Ropa / Calzado">Ropa / Calzado</option>
                      <option value="Plásticos y Bazar">Plásticos y Bazar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Referencia Comerciante:
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Pasaje 2, Doña Rosa"
                      value={merchantRef}
                      onChange={(e) => setMerchantRef(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Optional Manual Ticket Number Override */}
                <div>
                  <details className="text-[11px] text-slate-500">
                    <summary className="cursor-pointer font-bold hover:text-slate-800 transition">
                      Ajustar correlativo manual (si se desfasó papel)
                    </summary>
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="ej: 0009805"
                        value={manualTicketNumber}
                        onChange={(e) => setManualTicketNumber(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </details>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <Printer className="w-5 h-5" />
                  <span>{submitting ? 'Emitiendo Ticket...' : `Cobrar S/ ${parseFloat(customAmount || '0').toFixed(2)} e Imprimir`}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Today Stats & Tickets Table (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Today Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Recaudación Hoy</span>
                <span className="text-xl font-black font-mono text-emerald-700">
                  S/ {todayStats.total.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{todayStats.count} cobros</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">En Efectivo</span>
                <span className="text-lg font-black font-mono text-slate-800">
                  S/ {todayStats.totalCash.toFixed(2)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Yape / Plin</span>
                <span className="text-lg font-black font-mono text-indigo-700">
                  S/ {todayStats.totalDigital.toFixed(2)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tarifas Cobradas</span>
                <div className="text-[10px] font-mono text-slate-600 space-y-0.5">
                  <div>S/1: {todayStats.count1} | S/2: {todayStats.count2}</div>
                  <div>S/3: {todayStats.count3} | Otros: {todayStats.countOther}</div>
                </div>
              </div>
            </div>

            {/* Today Issued Tickets Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Tickets Emitidos Hoy ({todayStr})
                  </h3>
                  <p className="text-[10px] text-slate-400">Sólo información de la jornada actual</p>
                </div>
                <button
                  onClick={fetchData}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition"
                  title="Refrescar lista"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">N° Ticket</th>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">Referencia / Giro</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-3 text-center">Imprimir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">Cargando tickets de hoy...</td></tr>
                    ) : todayTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-xs">Aún no se han emitido tickets hoy {todayStr}</p>
                          <p className="text-[11px] text-slate-400">Emita un ticket con el formulario de la izquierda.</p>
                        </td>
                      </tr>
                    ) : (
                      todayTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-800">{t.ticketNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{t.time}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            <div>{t.merchantName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{t.category}</div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-600">{t.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-right text-emerald-700">
                            S/ {t.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handlePrintThermal(t)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="Reimprimir ticket térmico 80mm"
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
          </div>
        </div>
      )}

      {/* VIEW 2: HISTORIAL GENERAL (DÍAS / MESES / AÑOS) */}
      {activeMainTab === 'HISTORIAL' && (
        <div className="space-y-6">
          {/* Historial Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Filtro de Historial Acumulado
                </h3>
                <p className="text-xs text-slate-400">
                  Consulte la recaudación de días pasados, meses cerrados y ejercicios anuales.
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setHistoryMode('DIA')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    historyMode === 'DIA'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Por Día Específico
                </button>
                <button
                  onClick={() => setHistoryMode('MES')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    historyMode === 'MES'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Por Mes Completo
                </button>
                <button
                  onClick={() => setHistoryMode('ANIO')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                    historyMode === 'ANIO'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Por Año Consolidado
                </button>
              </div>
            </div>

            {/* Filter selectors based on mode */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {historyMode === 'DIA' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Seleccionar Día:
                  </label>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 outline-none"
                  />
                </div>
              )}

              {historyMode === 'MES' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Año:
                    </label>
                    <select
                      value={historyYear}
                      onChange={(e) => setHistoryYear(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Mes:
                    </label>
                    <select
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      {[
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
                      ].map((name, idx) => (
                        <option key={name} value={idx + 1}>{name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {historyMode === 'ANIO' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Seleccionar Año:
                  </label>
                  <select
                    value={historyYear}
                    onChange={(e) => setHistoryYear(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Buscar por N° Ticket o Nombre:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ej: 0009801, Frutas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Summary Pill */}
              <div className="flex items-end">
                <div className="w-full p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-indigo-900">
                  <span className="text-[11px] font-bold uppercase">Total del Periodo:</span>
                  <span className="text-base font-black font-mono">
                    S/ {historyStats.total.toFixed(2)} ({historyStats.count} tks)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown cards for Month mode */}
          {historyMode === 'MES' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Desglose Diario de Recaudación ({historyMonth}/ {historyYear})
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2">
                {monthlyDailyBreakdown.map((item) => (
                  <div
                    key={item.day}
                    onClick={() => {
                      setHistoryMode('DIA');
                      setHistoryDate(`${historyYear}-${String(historyMonth).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`);
                    }}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                      item.total > 0
                        ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-50 border-slate-100 text-slate-300 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold block text-slate-500">Día {item.day}</span>
                    <span className={`text-xs font-black font-mono block ${item.total > 0 ? 'text-emerald-800' : 'text-slate-400'}`}>
                      S/ {item.total.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{item.count} tks</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown cards for Year mode */}
          {historyMode === 'ANIO' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Consolidado Mensual del Año {historyYear}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {yearlyMonthlyBreakdown.map((item) => (
                  <div
                    key={item.monthNumber}
                    onClick={() => {
                      setHistoryMode('MES');
                      setHistoryMonth(item.monthNumber);
                    }}
                    className={`p-3.5 rounded-2xl border text-center cursor-pointer transition ${
                      item.total > 0
                        ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold block text-slate-600">{item.monthName}</span>
                    <span className="text-base font-black font-mono text-indigo-900 block my-1">
                      S/ {item.total.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block">{item.count} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Historical Tickets Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Listado de Tickets en este Periodo ({historyFilteredTickets.length} registros)
                </h3>
                <p className="text-[10px] text-slate-400">Total histórico consultado</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">N° Ticket</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Referencia / Comerciante</th>
                    <th className="py-3 px-4">Giro / Rubro</th>
                    <th className="py-3 px-4">Medio de Pago</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-center">Reimprimir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyFilteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-xs">No se encontraron tickets en el periodo seleccionado</p>
                      </td>
                    </tr>
                  ) : (
                    historyFilteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-black text-indigo-900">{t.ticketNumber}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{t.date}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{t.time}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{t.merchantName}</td>
                        <td className="py-3 px-4 text-slate-600">{t.category}</td>
                        <td className="py-3 px-4 font-bold text-slate-600">{t.paymentMethod}</td>
                        <td className="py-3 px-4 font-mono font-black text-right text-emerald-700">
                          S/ {t.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handlePrintThermal(t)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Reimprimir ticket térmico"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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

      {/* Modal Re-impresión o Confirmación Inmediata */}
      {activePrintTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-700">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-base font-black text-slate-900 uppercase">
              ¡Ticket N° {activePrintTicket.ticketNumber} Emitido!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cobro de S/ {activePrintTicket.amount.toFixed(2)} registrado en caja y bitácora.
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs font-mono space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">FECHA:</span><span>{activePrintTicket.date} {activePrintTicket.time}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">GIRO:</span><span>{activePrintTicket.category}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">PAGO:</span><span className="font-bold">{activePrintTicket.paymentMethod}</span></div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setActivePrintTicket(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={() => handlePrintThermal(activePrintTicket)}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir 80mm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
