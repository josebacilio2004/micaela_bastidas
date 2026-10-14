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
  Pencil,
  Trash2,
  Receipt,
  User,
} from 'lucide-react';

interface CocheraUser {
  id: string;
  name: string;
  defaultDailyFee: number;
  vehicleType?: string;
  plate?: string;
  phone?: string;
  notes?: string;
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

  // CRUD Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CocheraUser | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<CocheraUser | null>(null);

  // Form State for Create/Edit User
  const [formName, setFormName] = useState('');
  const [formDailyFee, setFormDailyFee] = useState('3.00');
  const [formVehicleType, setFormVehicleType] = useState('Auto');
  const [formPlate, setFormPlate] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Month days count
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
      // Load saved users from local storage if available
      const savedUsers = localStorage.getItem('mb_cochera_users_list');
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsers(parsed);
          }
        } catch (_) {}
      }

      const [currentReg, paymentsRes] = await Promise.all([
        apiRequest('/cash-registers/current').catch(() => null),
        apiRequest('/payments?take=800').catch(() => ({ items: [] })),
      ]);

      setActiveRegister(currentReg);

      const newMap: Record<string, { paid: boolean; amount: number; paymentId?: string }> = {};

      const items = Array.isArray(paymentsRes?.items) ? paymentsRes.items : [];
      items.forEach((p: any) => {
        if (p.notes && p.notes.includes('COCHERA-')) {
          const match = p.notes.match(/COCHERA-([A-Za-z0-9_-]+)-(\d+)-(\d+)-(\d+)/);
          if (match) {
            const [_, uId, d, m, y] = match;
            newMap[`${uId}-${y}-${m}-${d}`] = {
              paid: true,
              amount: Number(p.amount),
              paymentId: p.operationNumber || p.id,
            };
          }
        }
      });

      const localPayments = localStorage.getItem('mb_cochera_payments');
      if (localPayments) {
        try {
          const parsedLocal = JSON.parse(localPayments);
          Object.assign(newMap, parsedLocal);
        } catch (_) {}
      }

      setPaymentsMap(newMap);
    } catch (e) {
      console.error('Error loading cochera data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Save users helper
  const saveUsersList = (newUsers: CocheraUser[]) => {
    setUsers(newUsers);
    localStorage.setItem('mb_cochera_users_list', JSON.stringify(newUsers));
  };

  // Create User
  const handleOpenCreateUser = () => {
    setFormName('');
    setFormDailyFee('3.00');
    setFormVehicleType('Auto');
    setFormPlate('');
    setFormPhone('');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }

    const newUser: CocheraUser = {
      id: `COC-${String(users.length + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
      name: formName.trim().toUpperCase(),
      defaultDailyFee: parseFloat(formDailyFee) || 3.0,
      vehicleType: formVehicleType,
      plate: formPlate.trim().toUpperCase(),
      phone: formPhone.trim(),
      notes: formNotes.trim(),
    };

    const updated = [...users, newUser];
    saveUsersList(updated);
    setIsCreateModalOpen(false);
    alert('✓ Cliente de cochera registrado exitosamente');
  };

  // Edit User
  const handleOpenEditUser = (u: CocheraUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormDailyFee(String(u.defaultDailyFee));
    setFormVehicleType(u.vehicleType || 'Auto');
    setFormPlate(u.plate || '');
    setFormPhone(u.phone || '');
    setFormNotes(u.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated = users.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: formName.trim().toUpperCase(),
          defaultDailyFee: parseFloat(formDailyFee) || 3.0,
          vehicleType: formVehicleType,
          plate: formPlate.trim().toUpperCase(),
          phone: formPhone.trim(),
          notes: formNotes.trim(),
        };
      }
      return u;
    });

    saveUsersList(updated);
    setIsEditModalOpen(false);
    setEditingUser(null);
    alert('✓ Datos de cochera actualizados correctamente');
  };

  // Delete User
  const handleDeleteUser = (u: CocheraUser) => {
    if (!confirm(`¿Está seguro de eliminar a ${u.name} de la lista de cochera?`)) return;
    const updated = users.filter((x) => x.id !== u.id);
    saveUsersList(updated);
    alert('✓ Cliente eliminado');
  };

  // History User
  const handleOpenHistory = (u: CocheraUser) => {
    setHistoryUser(u);
    setIsHistoryModalOpen(true);
  };

  // Update Daily Fee inline
  const handleUpdateFee = (userId: string, newFee: number) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, defaultDailyFee: newFee } : u));
    saveUsersList(updated);
  };

  // Click cell to pay or reprint
  const handleCellClick = (user: CocheraUser, day: number) => {
    const key = `${user.id}-${selectedYear}-${selectedMonth}-${day}`;
    const payment = paymentsMap[key];

    if (payment?.paid) {
      handlePrintReceipt(user, day, payment.amount, payment.paymentId);
    } else {
      setModalTargetUser(user);
      setModalDay(day);
      setModalAmount(user.defaultDailyFee);
      setModalPaymentMethod('EFECTIVO');
      setPayModalOpen(true);
    }
  };

  // Confirm Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTargetUser) return;

    setProcessingPayment(true);
    const key = `${modalTargetUser.id}-${selectedYear}-${selectedMonth}-${modalDay}`;
    const opNumber = `REC-COC-${Date.now().toString().slice(-6)}`;

    try {
      const notes = `COCHERA-${modalTargetUser.id}-${modalDay}-${selectedMonth}-${selectedYear} | Servicio de Cochera: ${modalTargetUser.name} (${modalTargetUser.vehicleType || 'Vehículo'})`;

      await apiRequest('/cash-registers/current/movements', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INGRESO',
          concept: notes,
          amount: modalAmount,
          reference: opNumber,
        }),
      }).catch((err) => {
        console.warn('Caja fallback:', err);
      });

      const updatedMap = {
        ...paymentsMap,
        [key]: { paid: true, amount: modalAmount, paymentId: opNumber },
      };
      setPaymentsMap(updatedMap);
      localStorage.setItem('mb_cochera_payments', JSON.stringify(updatedMap));

      setPayModalOpen(false);
      handlePrintReceipt(modalTargetUser, modalDay, modalAmount, opNumber);
    } catch (err: any) {
      alert('Error registrando cobro: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Thermal Print (80mm)
  const handlePrintReceipt = (user: CocheraUser, day: number, amount: number, opNumber?: string) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const op = opNumber || `REC-COC-${Date.now().toString().slice(-6)}`;
    const dateFormatted = `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo Cochera - ${op}</title>
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

          <div class="center bold" style="font-size: 10pt;">SERVICIO DE COCHERA / ESTACIONAMIENTO</div>
          <div class="row"><span>RECIBO:</span><span class="bold">${op}</span></div>
          <div class="row"><span>FECHA:</span><span>${dateFormatted}</span></div>
          <div class="row"><span>DÍA SERVICIO:</span><span class="bold">Día ${day} de ${monthNames[selectedMonth - 1]} ${selectedYear}</span></div>
          <div class="divider"></div>

          <div class="row"><span>CLIENTE:</span><span class="bold">${user.name}</span></div>
          <div class="row"><span>VEHÍCULO:</span><span>${user.vehicleType || 'Vehículo'}</span></div>
          ${user.plate ? `<div class="row"><span>PLACA:</span><span class="bold font-mono">${user.plate}</span></div>` : ''}
          <div class="divider"></div>

          <div class="center" style="font-size: 9pt;">TOTAL CANCELADO</div>
          <div class="amount">S/ ${amount.toFixed(2)}</div>
          <div class="divider"></div>

          <div class="footer">
            ¡Gracias por su preferencia!<br>
            Cochera y Vigilancia del Mercado
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

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.vehicleType && u.vehicleType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.plate && u.plate.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  // Statistics
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
  }, [users, daysArray, paymentsMap, selectedYear, selectedMonth]);

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
  }, [daysArray, users, paymentsMap, selectedYear, selectedMonth]);

  const grandTotal = useMemo(() => {
    return Object.values(userTotals).reduce((a, b) => a + b, 0);
  }, [userTotals]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['N°', 'Apellidos y Nombres', 'Vehículo', 'Tarifa (S/)', ...daysArray.map((d) => `Día ${d}`), 'Total (S/)'];
    const rows = filteredUsers.map((u, idx) => {
      const daysCols = daysArray.map((d) => {
        const key = `${u.id}-${selectedYear}-${selectedMonth}-${d}`;
        return paymentsMap[key]?.paid ? paymentsMap[key].amount : 0;
      });
      return [idx + 1, u.name, u.vehicleType || '', u.defaultDailyFee, ...daysCols, userTotals[u.id] || 0];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cochera_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Car className="w-7 h-7 text-indigo-600" />
            Control Diario de Cochera y Estacionamiento
          </h1>
          <p className="text-xs text-slate-500">
            Registro y cobro de clientes de cochera con CRUD interactivo, cuadrícula de días e impresión térmica de comprobantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCreateUser}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Cliente Cochera</span>
          </button>

          {/* Period selector */}
          <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
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
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
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
                <th className="p-2.5 text-center min-w-[90px] bg-slate-800 text-white">Acciones</th>
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
                    <p className="text-[10px] text-slate-400 font-mono">
                      {u.vehicleType} {u.plate ? `• ${u.plate}` : ''}
                    </p>
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
                  <td className="p-2 text-center font-sans">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => handleOpenHistory(u)}
                        className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition"
                        title="Ver historial de cobros"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition"
                        title="Editar datos del cliente"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                <td className="p-2.5 bg-slate-100"></td>
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

      {/* CREATE COCHERA USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Nuevo Cliente Cochera</span>
                </h3>
                <p className="text-xs text-slate-400">Asignar tarifa y tipo de vehículo</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej: CARLOS MENDOZA"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Tipo Vehículo</label>
                  <select
                    value={formVehicleType}
                    onChange={(e) => setFormVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Auto">Auto</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Moto / Triciclo">Moto / Triciclo</option>
                    <option value="Bicicleta / Pequeño">Bicicleta / Pequeño</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Tarifa Diaria (S/)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formDailyFee}
                    onChange={(e) => setFormDailyFee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Placa (Opcional)</label>
                  <input
                    type="text"
                    placeholder="W1A-123"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="984123456"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COCHERA USER MODAL */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-600" />
                  <span>Editar Cliente Cochera</span>
                </h3>
                <p className="text-xs text-slate-400">{editingUser.id}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Tipo Vehículo</label>
                  <select
                    value={formVehicleType}
                    onChange={(e) => setFormVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Auto">Auto</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Moto / Triciclo">Moto / Triciclo</option>
                    <option value="Bicicleta / Pequeño">Bicicleta / Pequeño</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Tarifa Diaria (S/)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formDailyFee}
                    onChange={(e) => setFormDailyFee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Placa</label>
                  <input
                    type="text"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORIAL PAGOS MODAL */}
      {isHistoryModalOpen && historyUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <span>Historial de Cochera - {historyUser.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {historyUser.vehicleType} • Tarifa: S/ {historyUser.defaultDailyFee.toFixed(2)} por día
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Día</th>
                    <th className="p-2.5">Periodo</th>
                    <th className="p-2.5 text-right">Monto</th>
                    <th className="p-2.5 text-center">Estado</th>
                    <th className="p-2.5 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {daysArray.map((d) => {
                    const key = `${historyUser.id}-${selectedYear}-${selectedMonth}-${d}`;
                    const pay = paymentsMap[key];
                    const isPaid = !!pay?.paid;

                    return (
                      <tr key={d} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-800">Día {d}</td>
                        <td className="p-2 text-slate-500 font-sans">{monthNames[selectedMonth - 1]} {selectedYear}</td>
                        <td className="p-2 text-right font-black text-emerald-800">
                          {isPaid ? `S/ ${pay.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-2 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isPaid ? 'PAGADO' : 'NO REGISTRADO'}
                          </span>
                        </td>
                        <td className="p-2 text-center font-sans">
                          {isPaid ? (
                            <button
                              onClick={() => handlePrintReceipt(historyUser, d, pay.amount, pay.paymentId)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Recibo</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsHistoryModalOpen(false);
                                handleCellClick(historyUser, d);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                            >
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
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
