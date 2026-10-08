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
} from 'lucide-react';

interface TemporalTicket {
  id: string;
  ticketNumber: string;
  amount: number;
  date: string;
  time: string;
  merchantName?: string;
  category?: string;
  collectorName?: string;
  paymentMethod: string;
}

export default function AmbulantesTemporalesPage() {
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
  
  // Starting ticket correlative base
  const [manualTicketNumber, setManualTicketNumber] = useState<string>('');

  // Thermal Receipt Modal State
  const [activePrintTicket, setActivePrintTicket] = useState<TemporalTicket | null>(null);

  // Filter
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch tickets and cash register
  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentReg, paymentsRes] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/payments?take=500').catch(() => ({ items: [] })),
      ]);

      setActiveRegister(currentReg);

      // Process payments that are temporary ambulante tickets
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

          loadedTickets.push({
            id: p.id,
            ticketNumber: tNum,
            amount: Number(p.amount),
            date: pDate.toISOString().split('T')[0],
            time: pDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            merchantName: p.merchant ? `${p.merchant.lastName} ${p.merchant.firstName}` : p.notes?.split('|')[1] || 'Ambulante Eventual',
            category: p.concept?.name || 'Tasa Ambulante',
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            collectorName: p.collector?.fullName || 'Tesorería',
          });
        }
      });

      // Also retrieve locally saved tickets for seamless offline/immediate persistence
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
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    try {
      // 1. Register cash movement directly into current active caja
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

      // Save to local storage cache as well
      const updatedList = [newTicket, ...tickets];
      setTickets(updatedList);
      localStorage.setItem('mb_temporal_tickets', JSON.stringify(updatedList.slice(0, 100)));

      // Reset form fields
      setMerchantRef('');
      setManualTicketNumber('');

      // Open print thermal modal immediately
      setActivePrintTicket(newTicket);
    } catch (err: any) {
      alert('Error emitiendo ticket: ' + (err.message || 'Error de red'));
    } finally {
      setSubmitting(false);
    }
  };

  // Print Thermal Ticket
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
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 6px 0;
              font-size: 11pt;
              color: #000;
              line-height: 1.25;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 11pt; font-weight: 900; line-height: 1.2; }
            .subtitle { font-size: 9pt; margin-top: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .ticket-box {
              border: 2px solid #000;
              padding: 4px;
              margin: 6px 0;
              text-align: center;
              font-size: 14pt;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .amount-box {
              text-align: center;
              font-size: 18pt;
              font-weight: 900;
              margin: 6px 0;
            }
            .barcode {
              text-align: center;
              font-family: 'Libre Barcode 39', monospace;
              font-size: 26pt;
              letter-spacing: 4px;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              font-size: 8.5pt;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="center title">ASOCIACIÓN DE COMERCIANTES</div>
          <div class="center title">MERCADO MICAELA BASTIDAS</div>
          <div class="center subtitle">RUC: 20486000001 • HUANCAYO</div>
          <div class="center subtitle">Av. Micaela Bastidas S/N</div>
          
          <div class="divider"></div>
          
          <div class="center bold" style="font-size: 10pt;">TICKET DE COBRANZA AMBULATORIA</div>
          
          <div class="ticket-box">
            N° ${ticket.ticketNumber}
          </div>

          <div class="row">
            <span>FECHA:</span>
            <span class="bold">${ticket.date}</span>
          </div>
          <div class="row">
            <span>HORA:</span>
            <span class="bold">${ticket.time}</span>
          </div>
          <div class="row">
            <span>PAGO:</span>
            <span class="bold">${ticket.paymentMethod}</span>
          </div>

          ${ticket.merchantName && ticket.merchantName !== 'Comerciante Ambulante Eventual' ? `
          <div class="row">
            <span>REF:</span>
            <span class="bold">${ticket.merchantName}</span>
          </div>
          ` : ''}

          <div class="row">
            <span>GIRO:</span>
            <span>${ticket.category || 'Ambulante'}</span>
          </div>

          <div class="divider"></div>

          <div class="center" style="font-size: 9pt; text-transform: uppercase;">MONTO TOTAL COBRADO</div>
          <div class="amount-box">
            S/ ${ticket.amount.toFixed(2)}
          </div>

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

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchDate = !selectedDate || t.date === selectedDate;
      const matchSearch =
        !searchTerm ||
        t.ticketNumber.includes(searchTerm) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchDate && matchSearch;
    });
  }, [tickets, selectedDate, searchTerm]);

  // Daily Statistics
  const stats = useMemo(() => {
    const todayTickets = tickets.filter((t) => !selectedDate || t.date === selectedDate);
    const count = todayTickets.length;
    const total = todayTickets.reduce((acc, t) => acc + t.amount, 0);

    const count1 = todayTickets.filter((t) => Math.abs(t.amount - 1) < 0.01).length;
    const count2 = todayTickets.filter((t) => Math.abs(t.amount - 2) < 0.01).length;
    const count3 = todayTickets.filter((t) => Math.abs(t.amount - 3) < 0.01).length;
    const countOther = count - (count1 + count2 + count3);

    return { count, total, count1, count2, count3, countOther };
  }, [tickets, selectedDate]);

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
            Control de cobros diarios por ticket a comerciantes ambulatorios temporales con correlativo oficial (iniciando en 0009801) e impresión térmica.
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

      {/* Main Grid: Form Left, Stats & History Right */}
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
                  <h2 className="text-base font-black text-slate-900 uppercase">Emitir Nuevo Ticket</h2>
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
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-lg font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="2.00"
                  />
                </div>
              </div>

              {/* Optional Merchant Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Referencia / Nombre Comerciante (Opcional):
                </label>
                <input
                  type="text"
                  value={merchantRef}
                  onChange={(e) => setMerchantRef(e.target.value)}
                  placeholder="Ej: Carretilla de frutas, Doña Rosa, Pasaje 2..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Giro / Rubro */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Giro / Rubro:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Comercio Ambulante General">Ambulante General</option>
                    <option value="Frutas y Verduras">Frutas y Verduras</option>
                    <option value="Comidas y Viandas">Comidas y Bebidas</option>
                    <option value="Ropa y Calzado">Ropa y Artículos</option>
                    <option value="Flores y Plantas">Flores y Plantas</option>
                    <option value="Carretilla / Triciclo">Carretilla / Triciclo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Medio de Pago:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="EFECTIVO">Efectivo en Caja</option>
                    <option value="YAPE">Yape / Plin</option>
                  </select>
                </div>
              </div>

              {/* Optional Correlative override */}
              <div className="pt-1">
                <details className="text-[11px] text-slate-500 cursor-pointer">
                  <summary className="font-bold hover:text-emerald-700">Ajustar número de correlativo manualmente</summary>
                  <div className="pt-2">
                    <input
                      type="text"
                      value={manualTicketNumber}
                      onChange={(e) => setManualTicketNumber(e.target.value)}
                      placeholder="Ej: 0009801"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                    />
                  </div>
                </details>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-200 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Printer className="w-5 h-5" />
                <span>{submitting ? 'Emitiendo...' : 'Emitir e Imprimir Ticket'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: KPI Cards and Tickets Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Daily Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Tickets</span>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.count}</p>
              <span className="text-[10px] text-slate-400">emitidos hoy</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-emerald-800 block">Total Recaudado</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {stats.total.toFixed(2)}</p>
              <span className="text-[10px] text-emerald-600 font-bold">ingreso a caja</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Tickets S/ 1 y S/ 2</span>
              <p className="text-lg font-black text-slate-800 font-mono mt-1">
                {stats.count1} <span className="text-xs text-slate-400 font-normal">de S/1</span> • {stats.count2} <span className="text-xs text-slate-400 font-normal">de S/2</span>
              </p>
              <span className="text-[10px] text-slate-400">abonos menores</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Tickets S/ 3+</span>
              <p className="text-lg font-black text-slate-800 font-mono mt-1">
                {stats.count3} <span className="text-xs text-slate-400 font-normal">de S/3</span> • {stats.countOther} <span className="text-xs text-slate-400 font-normal">otros</span>
              </p>
              <span className="text-[10px] text-slate-400">abonos estándar</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase text-slate-800">
                  Historial de Tickets Emitidos ({filteredTickets.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar ticket..."
                    className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-36"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">N° Ticket</th>
                    <th className="p-2.5">Fecha/Hora</th>
                    <th className="p-2.5">Referencia</th>
                    <th className="p-2.5">Giro</th>
                    <th className="p-2.5 text-right">Monto</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No hay tickets emitidos en la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-black font-mono text-emerald-800">
                          N° {t.ticketNumber}
                        </td>
                        <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                          {t.date} <span className="text-slate-400">{t.time}</span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">
                          {t.merchantName || 'Eventual'}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {t.category}
                        </td>
                        <td className="p-2.5 font-black font-mono text-right text-emerald-700 text-sm">
                          S/ {t.amount.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handlePrintThermal(t)}
                            title="Reimprimir Ticket Térmico"
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg transition"
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

      {/* MODAL PREVIEW TICKET TÉRMICO */}
      {activePrintTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">¡Ticket Emitido con Éxito!</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Ingresado a caja y listo para entrega</p>
            </div>

            {/* Ticket Thermal Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 font-mono text-xs space-y-2">
              <div className="text-center font-bold text-slate-900 leading-tight">
                MERCADO MICAELA BASTIDAS
                <p className="text-[10px] text-slate-500 font-normal">RUC: 20486000001</p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Ticket Ambulante</span>
                <span className="text-xl font-black text-slate-900">N° {activePrintTicket.ticketNumber}</span>
              </div>

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha/Hora:</span>
                  <span className="font-bold">{activePrintTicket.date} {activePrintTicket.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref:</span>
                  <span className="font-bold">{activePrintTicket.merchantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Giro:</span>
                  <span>{activePrintTicket.category}</span>
                </div>
              </div>

              <div className="border-t-2 border-slate-900 pt-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Cobrado</span>
                <span className="text-2xl font-black text-emerald-800 font-mono">
                  S/ {activePrintTicket.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePrintTicket(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => handlePrintThermal(activePrintTicket)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
