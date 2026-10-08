'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Sparkles,
  Pencil,
  Trash2,
  Coins,
  AlertCircle,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  QrCode,
  Users,
  Plus,
  ArrowRight,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';

function formatDateNoTimezone(dateStr?: string | Date) {
  if (!dateStr) return '';
  const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const datePart = s.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return datePart;
}

export default function FaenasPage() {
  const [faenas, setFaenas] = useState<any[]>([]);
  const [selectedFaena, setSelectedFaena] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form nueva faena
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFaenaForm, setNewFaenaForm] = useState({
    title: '',
    date: new Date().toISOString().substring(0, 10),
    time: '06:00',
    sectorToClean: 'Todos los Sectores y Pasajes',
    fineAmount: 30.00,
    description: '',
  });

  // Escáner de asistencia
  // Fines state
  const [finesList, setFinesList] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [activeTab, setActiveTab] = useState<'GRID' | 'ASISTENTES' | 'MULTAS'>('GRID');

  // Edit Faena Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFaenaForm, setEditFaenaForm] = useState({
    id: '',
    title: '',
    date: '',
    time: '06:00',
    sectorToClean: '',
    fineAmount: 30.00,
    description: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFines = async (id: string) => {
    if (!id) return;
    setLoadingFines(true);
    try {
      const res = await apiRequest(`/faenas/${id}/fines`);
      setFinesList(res || []);
    } catch (e) {
      console.error('Error fetching faena fines:', e);
    } finally {
      setLoadingFines(false);
    }
  };

  const [dniOrCode, setDniOrCode] = useState('');
  const [scanMessage, setScanMessage] = useState<any>(null);

  const fetchFaenas = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/faenas');
      setFaenas(res || []);
      if (res && res.length > 0 && !selectedFaena) {
        fetchFaenaDetails(res[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaenaDetails = async (id: string) => {
    try {
      const res = await apiRequest(`/faenas/${id}`);
      setSelectedFaena(res);
      fetchFines(id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFaenas();
  }, []);

    const handleOpenEdit = (f: any) => {
    setEditFaenaForm({
      id: f.id,
      title: f.title,
      date: f.date ? new Date(f.date).toISOString().substring(0, 10) : '',
      time: f.time || '06:00',
      sectorToClean: f.sectorToClean || '',
      fineAmount: Number(f.fineAmount) || 30.00,
      description: f.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateFaena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFaenaForm.title.trim() || !editFaenaForm.id) return;
    setIsUpdating(true);
    try {
      await apiRequest(`/faenas/${editFaenaForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editFaenaForm),
      });
      alert('✓ Faena de limpieza actualizada con éxito');
      setIsEditModalOpen(false);
      await fetchFaenas();
      await fetchFaenaDetails(editFaenaForm.id);
    } catch (e: any) {
      alert(e.message || 'Error al actualizar faena');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFaena = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta faena programada? Esta acción es irreversible.')) return;
    try {
      await apiRequest(`/faenas/${id}`, { method: 'DELETE' });
      alert('✓ Faena eliminada con éxito');
      setSelectedFaena(null);
      await fetchFaenas();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar faena');
    }
  };

  const handleCreateFaena = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/faenas', {
        method: 'POST',
        body: JSON.stringify(newFaenaForm),
      });
      alert('✓ Faena de limpieza programada exitosamente');
      setIsNewModalOpen(false);
      fetchFaenas();
    } catch (e: any) {
      alert(e.message || 'Error al programar faena');
    }
  };

  const handleRegisterAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniOrCode.trim() || !selectedFaena) return;

    try {
      const res = await apiRequest(`/faenas/${selectedFaena.id}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ dniOrCode: dniOrCode.trim() }),
      });
      setScanMessage({
        type: 'success',
        text: `✓ Asistencia confirmada: ${res.merchant.lastName}, ${res.merchant.firstName}`,
      });
      setDniOrCode('');
      await fetchFaenaDetails(selectedFaena.id);
      await fetchFines(selectedFaena.id);
      setActiveTab('MULTAS');
    } catch (e: any) {
      setScanMessage({
        type: 'error',
        text: e.message || 'Error al registrar asistencia',
      });
    }
  };

  const handleToggleAttendance = async (merchantId: string, currentPresent: boolean) => {
    if (!selectedFaena) return;
    try {
      await apiRequest(`/faenas/${selectedFaena.id}/toggle-attendance`, {
        method: 'POST',
        body: JSON.stringify({ merchantId, present: !currentPresent }),
      });
      await fetchFaenaDetails(selectedFaena.id);
      await fetchFaenas();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencia a faena');
    }
  };

  const handleBulkAttendance = async (markAllPresent: boolean) => {
    const socios = selectedFaena?.allSocios || [];
    if (!selectedFaena || !socios.length) return;
    const confirmMsg = markAllPresent
      ? `¿Marcar a todos los ${socios.length} socios como PRESENTES en esta faena?`
      : '¿Marcar a todos los socios como AUSENTES en esta faena?';
    if (!confirm(confirmMsg)) return;
    try {
      const items = socios.map((s: any) => ({
        merchantId: s.id,
        present: markAllPresent,
      }));
      await apiRequest(`/faenas/${selectedFaena.id}/bulk-attendance`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      await fetchFaenaDetails(selectedFaena.id);
      await fetchFaenas();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencias en lote');
    }
  };

  const filteredSociosGrid = React.useMemo(() => {
    const list = selectedFaena?.allSocios || [];
    return list
      .filter((s: any) => {
        const q = searchTerm.toLowerCase();
        const fullName = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
        const dni = (s.dni || '').toLowerCase();
        const stall = (s.stall?.code || '').toLowerCase();
        return fullName.includes(q) || dni.includes(q) || stall.includes(q);
      })
      .sort((a: any, b: any) => {
        const aName = `${a.lastName || ''} ${a.firstName || ''}`;
        const bName = `${b.lastName || ''} ${b.firstName || ''}`;
        return aName.localeCompare(bName, 'es');
      });
  }, [selectedFaena?.allSocios, searchTerm]);

  const handleFinalizeFaena = async () => {
    if (!selectedFaena) return;
    if (
      !confirm(
        `¿Deseas finalizar la faena "${selectedFaena.title}"?\n\nSe calcularán los socios ausentes y se generará automáticamente una multa de S/ ${selectedFaena.fineAmount} para cada uno.`
      )
    ) {
      return;
    }

    try {
      const res = await apiRequest(`/faenas/${selectedFaena.id}/finalize`, {
        method: 'POST',
      });
      alert(
        `✓ Faena Finalizada con éxito:\n- Total Socios: ${res.totalSocios}\n- Presentes: ${res.presentes}\n- Ausentes: ${res.ausentes}\n- Multas generadas: ${res.multasGeneradas} (S/ ${res.montoMulta} c/u)`
      );
      fetchFaenas();
      fetchFaenaDetails(selectedFaena.id);
    } catch (e: any) {
      alert(e.message || 'Error al finalizar faena');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Faenas Comunales de Limpieza</h1>
          <p className="text-xs text-slate-500">
            Organización de jornadas de limpieza del mercado, registro biométrico/QR de socios y sanción automática por inasistencia.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Nueva Faena</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Faenas List */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">Jornadas Registradas</h2>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando faenas...</div>
          ) : faenas.length === 0 ? (
            <div className="p-6 text-center border border-slate-200 rounded-2xl bg-white text-xs text-slate-400">
              No hay faenas programadas.
            </div>
          ) : (
            faenas.map((f) => (
              <div
                key={f.id}
                onClick={() => fetchFaenaDetails(f.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedFaena?.id === f.id
                    ? 'bg-emerald-50/60 border-emerald-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      f.status === 'FINALIZADA'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {f.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-600">Multa: S/ {f.fineAmount}</span>
                </div>

                <h3 className="font-bold text-slate-800 text-sm mb-1">{f.title}</h3>

                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDateNoTimezone(f.date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{f.time}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    <span>{f._count?.attendances || 0} asist.</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Attendance & Control Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedFaena ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Selected Faena Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      {selectedFaena.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Fecha: {formatDateNoTimezone(selectedFaena.date)} ({selectedFaena.time})
                    </span>
                    <span className="text-xs text-slate-400">• Sector: {selectedFaena.sectorToClean || 'General'}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{selectedFaena.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedFaena.description || 'Jornada comunal obligatoria para socios.'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedFaena)}
                    className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                    title="Editar faena"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {selectedFaena.status !== 'FINALIZADA' && (
                    <button
                      onClick={() => handleDeleteFaena(selectedFaena.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                      title="Eliminar faena programada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {selectedFaena.status !== 'FINALIZADA' && (
                    <button
                      onClick={handleFinalizeFaena}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Finalizar Faena y Multar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance Scanner Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Registro Rápido de Asistencia en Puerta (Lector QR / DNI)</span>
                  </h4>
                  {selectedFaena.status === 'FINALIZADA' && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      Modo Registro Retroactivo Habilitado
                    </span>
                  )}
                </div>

                <form onSubmit={handleRegisterAttendance} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escanear carnet QR o tipear DNI del socio..."
                    value={dniOrCode}
                    onChange={(e) => setDniOrCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition"
                  >
                    Registrar
                  </button>
                </form>

                {scanMessage && (
                  <div
                    className={`text-xs p-2.5 rounded-xl font-bold flex items-center space-x-2 ${
                      scanMessage.type === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {scanMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{scanMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Attendance Tabs: GRID vs ASISTENTES vs MULTAS */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setActiveTab('GRID')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'GRID'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Cuadrícula de Socios ({selectedFaena.allSocios?.length || 107})
                    </button>
                    <button
                      onClick={() => setActiveTab('ASISTENTES')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'ASISTENTES'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Presentes ({selectedFaena.attendances?.length || 0})
                    </button>
                    {selectedFaena.status === 'FINALIZADA' && (
                      <button
                        onClick={() => setActiveTab('MULTAS')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          activeTab === 'MULTAS'
                            ? 'bg-rose-700 text-white shadow-sm'
                            : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Multas ({finesList.length})
                      </button>
                    )}
                  </div>

                  {/* Actions & Search */}
                  <div className="flex items-center gap-2">
                    {activeTab === 'GRID' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBulkAttendance(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
                          title="Marcar a todos como presentes"
                        >
                          ✓ Todos Presentes
                        </button>
                        <button
                          onClick={() => handleBulkAttendance(false)}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
                          title="Marcar a todos como ausentes"
                        >
                          ✗ Desmarcar Todos
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar socio, DNI..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-full sm:w-44 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tab 1: GRID VIEW OF ALL 107 SOCIOS */}
                {activeTab === 'GRID' && (
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">N°</th>
                          <th className="py-2.5 px-4">Socio Titular</th>
                          <th className="py-2.5 px-3">DNI</th>
                          <th className="py-2.5 px-3">Puesto / Giro</th>
                          <th className="py-2.5 px-4 text-center">Asistencia a Faena</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSociosGrid.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              No se encontraron socios con el criterio ingresado.
                            </td>
                          </tr>
                        ) : (
                          filteredSociosGrid.map((s: any, idx: number) => {
                            const isPresent = Boolean(s.isPresent);
                            return (
                              <tr
                                key={s.id}
                                className={`transition cursor-pointer select-none ${
                                  isPresent ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => handleToggleAttendance(s.id, isPresent)}
                              >
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-4">
                                  <div className="font-bold text-slate-800">
                                    {s.lastName}, {s.firstName}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-slate-600">
                                  {s.dni}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded text-[10px]">
                                      {s.stall?.code || 'S/P'}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                      {s.businessCategory || s.stall?.giro || '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleAttendance(s.id, isPresent);
                                    }}
                                    className={`px-3 py-1 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 mx-auto transition shadow-sm ${
                                      isPresent
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                                    }`}
                                  >
                                    {isPresent ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 fill-current text-white" />
                                        <span>PRESENTE</span>
                                      </>
                                    ) : (
                                      <>
                                        <Square className="w-3.5 h-3.5 text-slate-400" />
                                        <span>AUSENTE</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 2: ASISTENTES */}
                {activeTab === 'ASISTENTES' && (
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    {selectedFaena.attendances?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-10 text-center">Aún no se registran asistencias en esta jornada.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Socio Titular</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Puesto</th>
                            <th className="p-3">Hora de Escaneo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedFaena.attendances.map((att: any, idx: number) => (
                            <tr key={att.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-800">
                                {att.merchant?.lastName}, {att.merchant?.firstName}
                              </td>
                              <td className="p-3 font-mono text-slate-600">{att.dni}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono font-bold rounded-md">
                                  {att.merchant?.stall?.code || 'S/P'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-mono">
                                {new Date(att.scannedAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 3: MULTAS */}
                {activeTab === 'MULTAS' && (
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    {finesList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-10 text-center">No hay multas pendientes para esta faena.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-50/60 text-slate-600 font-bold border-b border-rose-100 sticky top-0">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Socio Ausente</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Puesto</th>
                            <th className="p-3">Monto Multa</th>
                            <th className="p-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {finesList.map((f: any, idx: number) => (
                            <tr key={f.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-800">
                                {f.merchant?.lastName}, {f.merchant?.firstName}
                              </td>
                              <td className="p-3 font-mono text-slate-600">{f.merchant?.dni || '-'}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded-md">
                                  {f.merchant?.stall?.code || 'S/P'}
                                </span>
                              </td>
                              <td className="p-3 font-bold font-mono text-rose-700">
                                S/ {Number(f.amount).toFixed(2)}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  f.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">Selecciona una faena para ver su control de asistencia.</div>
          )}
        </div>
      </div>

      {/* Modal Programar Faena */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Programar Faena de Limpieza</h2>

            <form onSubmit={handleCreateFaena} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Motivo / Título de la Faena *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Faena de Desinfección y Baldeo General"
                  value={newFaenaForm.title}
                  onChange={(e) => setNewFaenaForm({ ...newFaenaForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={newFaenaForm.date}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={newFaenaForm.time}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sector a Limpiar</label>
                  <input
                    type="text"
                    placeholder="Ej: Pabellón Carnes y Pasaje Central"
                    value={newFaenaForm.sectorToClean}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, sectorToClean: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monto de Multa (S/)</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={newFaenaForm.fineAmount}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, fineAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Programar Faena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Faena */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-emerald-600" />
                <span>Editar Faena de Limpieza</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFaena} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Jornada *</label>
                <input
                  type="text"
                  required
                  value={editFaenaForm.title}
                  onChange={(e) => setEditFaenaForm({ ...editFaenaForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={editFaenaForm.date}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={editFaenaForm.time}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, time: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sector a Limpiar *</label>
                  <input
                    type="text"
                    required
                    value={editFaenaForm.sectorToClean}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, sectorToClean: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto Multa (S/) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editFaenaForm.fineAmount}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, fineAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instrucciones / Materiales</label>
                <textarea
                  rows={2}
                  value={editFaenaForm.description}
                  onChange={(e) => setEditFaenaForm({ ...editFaenaForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition"
                >
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}