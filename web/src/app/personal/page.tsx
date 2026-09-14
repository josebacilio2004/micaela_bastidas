'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  Briefcase,
  Phone,
  CreditCard,
  Building,
  UserCheck,
} from 'lucide-react';

export default function PersonalPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal: New / Edit Staff
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    role: 'Vigilante Diurno',
    salary: 1200,
    notes: '',
  });

  // Modal: Pay Salary
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingStaff, setPayingStaff] = useState<any>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'EFECTIVO',
    receiptNumber: '',
    notes: '',
    registerCashExpense: true,
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal: Printable Voucher
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, paymentsRes, regRes] = await Promise.all([
        apiRequest('/staff'),
        apiRequest(`/staff/payments?period=${selectedPeriod}`).catch(() => []),
        apiRequest('/cash-registers/current').catch(() => null),
      ]);
      setStaff(Array.isArray(staffRes) ? staffRes : []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
      setActiveRegister(regRes);
    } catch (err) {
      console.error('Error cargando personal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  // Roles list
  const availableRoles = [
    'Vigilante Diurno',
    'Vigilante Nocturno',
    'Encargada de Servicios Higiénicos',
    'Contadora / Asesora Contable',
    'Personal de Limpieza',
    'Mantenimiento General',
    'Administración / Tesorería',
  ];

  // Alphabetical sorting of staff members: lastName asc, firstName asc
  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) => {
      const aName = `${a.lastName || ''} ${a.firstName || ''}`;
      const bName = `${b.lastName || ''} ${b.firstName || ''}`;
      return aName.localeCompare(bName, 'es');
    });
  }, [staff]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return sortedStaff.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.dni?.includes(q) ||
        s.role?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [sortedStaff, search, roleFilter]);

  // Payment status mapping for the selected period
  const paymentsByStaffId = useMemo(() => {
    const map = new Map<string, any>();
    payments.forEach((p) => {
      map.set(p.staffMemberId, p);
    });
    return map;
  }, [payments]);

  // Financial KPIs
  const activeStaffList = sortedStaff.filter((s) => s.isActive);
  const totalPlanillaBudget = activeStaffList.reduce((sum, s) => sum + Number(s.salary || 0), 0);
  const totalPaidThisMonth = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingToPay = Math.max(0, totalPlanillaBudget - totalPaidThisMonth);

  // Open Pay Modal
  const handleOpenPayModal = (staffMember: any) => {
    setPayingStaff(staffMember);
    setPayForm({
      amount: Number(staffMember.salary || 0),
      paymentMethod: 'EFECTIVO',
      receiptNumber: `VCH-${Date.now().toString().slice(-6)}`,
      notes: `Pago de sueldo mes ${selectedPeriod}`,
      registerCashExpense: !!activeRegister,
    });
    setIsPayModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStaff) return;
    setSubmittingPayment(true);
    try {
      const res = await apiRequest('/staff/payments', {
        method: 'POST',
        body: JSON.stringify({
          staffMemberId: payingStaff.id,
          period: selectedPeriod,
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
          receiptNumber: payForm.receiptNumber,
          notes: payForm.notes,
          registerCashExpense: payForm.registerCashExpense,
        }),
      });

      setIsPayModalOpen(false);
      setActiveVoucher(res);
      setIsVoucherModalOpen(true);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al procesar pago de sueldo');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit Staff Form (Create / Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaffId) {
        await apiRequest(`/staff/${editingStaffId}`, {
          method: 'PUT',
          body: JSON.stringify(staffForm),
        });
      } else {
        await apiRequest('/staff', {
          method: 'POST',
          body: JSON.stringify(staffForm),
        });
      }
      setIsStaffModalOpen(false);
      setEditingStaffId(null);
      setStaffForm({
        firstName: '',
        lastName: '',
        dni: '',
        phone: '',
        role: 'Vigilante Diurno',
        salary: 1200,
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar personal');
    }
  };

  const handleEditStaff = (s: any) => {
    setEditingStaffId(s.id);
    setStaffForm({
      firstName: s.firstName,
      lastName: s.lastName,
      dni: s.dni,
      phone: s.phone || '',
      role: s.role,
      salary: Number(s.salary),
      notes: s.notes || '',
    });
    setIsStaffModalOpen(true);
  };

  const handleToggleActive = async (s: any) => {
    if (!confirm(`¿Está seguro de cambiar el estado de ${s.firstName} ${s.lastName}?`)) return;
    try {
      await apiRequest(`/staff/${s.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...s, isActive: !s.isActive }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              Personal y Pagos de Planilla
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Sueldos y Honorarios
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control de colaboradores (vigilancia, servicios higiénicos, contabilidad, administración), pagos mensuales y sincronización de egresos con caja.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingStaffId(null);
            setStaffForm({
              firstName: '',
              lastName: '',
              dni: '',
              phone: '',
              role: 'Vigilante Diurno',
              salary: 1200,
              notes: '',
            });
            setIsStaffModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Nuevo Colaborador</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Planilla Mensual</p>
            <p className="text-xl font-black text-slate-800">S/ {totalPlanillaBudget.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500">{activeStaffList.length} colaboradores activos</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Pagado ({selectedPeriod})</p>
            <p className="text-xl font-black text-emerald-700">S/ {totalPaidThisMonth.toFixed(2)}</p>
            <p className="text-[10px] text-emerald-600 font-semibold">{payments.length} sueldos abonados</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pendiente de Pago</p>
            <p className="text-xl font-black text-amber-700">S/ {pendingToPay.toFixed(2)}</p>
            <p className="text-[10px] text-amber-600 font-semibold">
              {Math.max(0, activeStaffList.length - payments.length)} colaboradores por pagar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Caja Diaria</p>
            <p className="text-sm font-black text-slate-800">
              {activeRegister ? (
                <span className="text-emerald-700 font-bold">🟢 Caja Abierta</span>
              ) : (
                <span className="text-rose-600 font-bold">🔴 Sin Caja Abierta</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">
              {activeRegister ? 'Egresos se descuentan en vivo' : 'Pagos manuales'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Mes y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Periodo:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-800 focus:outline-none"
            />
          </div>

          <div className="w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl bg-white focus:outline-none"
            >
              <option value="ALL">Todos los Cargos</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por apellido, nombre, DNI o cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h2 className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Nómina de Colaboradores (Orden Alfabético)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            {filteredStaff.length} de {staff.length} colaboradores
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Colaborador (Apellidos y Nombres)</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Cargo / Función</th>
              <th className="py-3 px-4">Teléfono</th>
              <th className="py-3 px-4">Sueldo / Honorario</th>
              <th className="py-3 px-4">Estado ({selectedPeriod})</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Cargando nómina de personal...
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No se encontraron colaboradores registrados con estos filtros.
                </td>
              </tr>
            ) : (
              filteredStaff.map((s) => {
                const payment = paymentsByStaffId.get(s.id);
                const isPaid = !!payment;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {s.lastName?.[0] || 'P'}
                          {s.firstName?.[0] || ''}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {s.lastName}, {s.firstName}
                          </p>
                          {!s.isActive && (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{s.dni}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{s.phone || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      S/ {Number(s.salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {isPaid ? (
                        <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="font-black text-[11px]">Pagado</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl w-fit">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-bold text-[11px]">Pendiente</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {isPaid ? (
                          <button
                            onClick={() => {
                              setActiveVoucher(payment);
                              setIsVoucherModalOpen(true);
                            }}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                            title="Ver Boleta de Pago"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>Voucher</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenPayModal(s)}
                            className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black shadow-sm transition"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pagar Sueldo</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleEditStaff(s)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                          title="Editar Colaborador"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`p-1 rounded-md hover:bg-slate-100 ${
                            s.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600'
                          }`}
                          title={s.isActive ? 'Desactivar' : 'Activar'}
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

      {/* Modal: Registrar o Editar Personal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                {editingStaffId ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
              </h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    placeholder="Ej. Carlos Alberto"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                    placeholder="Ej. Mendoza Quispe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI (8 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={staffForm.dni}
                    onChange={(e) => setStaffForm({ ...staffForm, dni: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="41208945"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="984512345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo / Puesto</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sueldo Mensual (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={staffForm.salary}
                    onChange={(e) => setStaffForm({ ...staffForm, salary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Horario</label>
                <textarea
                  rows={2}
                  value={staffForm.notes}
                  onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  placeholder="Ej. Turno mañana de 06:00 a 18:00"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow"
                >
                  {editingStaffId ? 'Guardar Cambios' : 'Registrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pagar Sueldo */}
      {isPayModalOpen && payingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Pago de Remuneración / Planilla
                </h3>
                <p className="text-[11px] text-emerald-700 font-bold">
                  Periodo: {selectedPeriod}
                </p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-sm">
                  {payingStaff.lastName}, {payingStaff.firstName}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>DNI: {payingStaff.dni}</span>
                  <span className="font-bold text-slate-700">{payingStaff.role}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto a Abonar (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-emerald-300 bg-emerald-50/40 rounded-xl text-base font-black text-emerald-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° Comprobante / Recibo</label>
                  <input
                    type="text"
                    value={payForm.receiptNumber}
                    onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                    placeholder="REC-0012"
                  />
                </div>
              </div>

              {/* Registro automático en caja */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="regExpense"
                  checked={payForm.registerCashExpense}
                  onChange={(e) => setPayForm({ ...payForm, registerCashExpense: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="regExpense" className="text-[11px] text-slate-700 select-none">
                  <span className="font-bold">Descontar automáticamente de Caja Diaria (Egreso)</span>
                  <p className="text-slate-500 text-[10px]">
                    {activeRegister
                      ? 'La caja activa registrará el movimiento de egreso para el cuadre contable.'
                      : '⚠️ No hay caja abierta hoy; el egreso se registrará contablemente sin afectar saldo en mano.'}
                  </p>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="Detalle adicional del pago"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow flex items-center space-x-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{submittingPayment ? 'Procesando...' : 'Confirmar y Pagar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Boleta / Comprobante de Pago Térmico */}
      {isVoucherModalOpen && activeVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase">
                Boleta de Pago de Sueldo
              </h3>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formato de Ticket POS 58mm / 80mm */}
            <div className="border border-dashed border-slate-300 p-4 rounded-xl bg-slate-50 font-mono text-[11px] text-slate-800 space-y-3 print-ticket">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <p className="font-bold text-xs uppercase">MERCADO MICAELA BASTIDAS</p>
                <p className="text-[10px] text-slate-500">RUC: 20456789123</p>
                <p className="text-[9px] text-slate-400">Huánuco, Perú</p>
                <p className="font-black mt-1 text-slate-900">BOLETA DE SUELDO</p>
                <p className="text-[10px]">Periodo: {activeVoucher.period}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Colaborador:</span>
                  <span className="font-bold text-right">
                    {activeVoucher.staffMember?.lastName}, {activeVoucher.staffMember?.firstName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DNI:</span>
                  <span className="font-bold">{activeVoucher.staffMember?.dni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cargo:</span>
                  <span className="font-bold">{activeVoucher.staffMember?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recibo/Ref:</span>
                  <span>{activeVoucher.receiptNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span>{new Date(activeVoucher.paymentDate).toLocaleDateString('es-PE')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Medio:</span>
                  <span className="font-bold">{activeVoucher.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 flex justify-between items-center text-sm font-black">
                <span>TOTAL ABONADO:</span>
                <span className="text-emerald-800">S/ {Number(activeVoucher.amount).toFixed(2)}</span>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[9px] text-slate-500">
                <div className="border-t border-slate-400 pt-1">
                  <span>Firma Tesorería</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <span>Firma Conforme</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket POS</span>
              </button>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
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
