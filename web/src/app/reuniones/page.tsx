'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Calendar,
  Pencil,
  Trash2,
  Coins,
  Users,
  CheckCircle2,
  CheckSquare,
  UserCheck,
  UserX,
  Plus,
  X,
  Search,
  QrCode,
  Play,
  Square,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

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

export default function ReunionesPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [meetingDetail, setMeetingDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'GRID' | 'PRESENTES' | 'AUSENTES' | 'MULTAS'>('GRID');
  // Fines state
  const [finesList, setFinesList] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  // Edit Meeting Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFines = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingFines(true);
    try {
      const res = await apiRequest(`/meetings/${id}/fines`);
      setFinesList(res || []);
    } catch (e) {
      console.error('Error fetching fines:', e);
    } finally {
      setLoadingFines(false);
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Manual attendance input
  const [manualQr, setManualQr] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // New Meeting Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('09:00');
  const [newLocation, setNewLocation] = useState('Auditorio Central del Mercado');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('PROGRAMADA');
  const [isCreating, setIsCreating] = useState(false);

  const fetchMeetings = useCallback(async (selectId?: string, dateParam?: string) => {
    try {
      const activeDate = dateParam !== undefined ? dateParam : filterDate;
      const url = activeDate ? `/meetings?date=${activeDate}` : '/meetings';
      const res = await apiRequest(url);
      setMeetings(res || []);
      if (res && res.length > 0) {
        if (selectId) {
          setSelectedMeetingId(selectId);
        } else if (!selectedMeetingId || !res.some((m: any) => m.id === selectedMeetingId)) {
          setSelectedMeetingId(res[0].id);
        }
      } else {
        setSelectedMeetingId('');
        setMeetingDetail(null);
      }
    } catch (e) {
      console.error('Error fetching meetings:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMeetingId, filterDate]);

  const fetchMeetingDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const detail = await apiRequest(`/meetings/${id}`);
      setMeetingDetail(detail);
    } catch (e) {
      console.error('Error fetching meeting detail:', e);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    if (selectedMeetingId) {
      fetchMeetingDetail(selectedMeetingId);
      fetchFines(selectedMeetingId);
    }
  }, [selectedMeetingId, fetchMeetingDetail]);

  // Auto-refresh when meeting is EN_CURSO
  useEffect(() => {
    if (!selectedMeetingId || meetingDetail?.status !== 'EN_CURSO') return;
    const interval = setInterval(() => {
      fetchMeetingDetail(selectedMeetingId);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedMeetingId, meetingDetail?.status, fetchMeetingDetail]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const created = await apiRequest('/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          date: newDate,
          time: newTime,
          location: newLocation.trim(),
          description: newDescription.trim(),
          status: newStatus,
        }),
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      await fetchMeetings(created.id);
    } catch (err: any) {
      alert(err.message || 'Error al programar reunión');
    } finally {
      setIsCreating(false);
    }
  };

  // Fines and attendance feedback state
  const [attendanceFeedback, setAttendanceFeedback] = useState<{ message: string; isLate?: boolean; fineAmount?: number } | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

    const handleOpenEdit = (m: any) => {
    setEditId(m.id);
    setEditTitle(cleanUtf8(m.title));
    setEditDate(m.date ? new Date(m.date).toISOString().split('T')[0] : '');
    setEditTime(m.time || '09:00');
    setEditLocation(cleanUtf8(m.location) || 'Auditorio Central del Mercado');
    setEditDescription(cleanUtf8(m.description) || '');
    setShowEditModal(true);
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editId) return;
    setIsUpdating(true);
    try {
      await apiRequest(`/meetings/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          date: editDate,
          time: editTime,
          location: editLocation.trim(),
          description: editDescription.trim(),
        }),
      });
      setShowEditModal(false);
      alert('✓ Asamblea actualizada con éxito');
      await fetchMeetings(editId);
      await fetchMeetingDetail(editId);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asamblea');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asamblea programada? Esta acción es irreversible.')) return;
    try {
      await apiRequest(`/meetings/${id}`, { method: 'DELETE' });
      alert('✓ Asamblea eliminada con éxito');
      await fetchMeetings();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar asamblea');
    }
  };

  const cleanUtf8 = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/Pavimentaci[^\s\w]?n/gi, 'Pavimentación')
      .replace(/Aprobaci[^\s\w]?n/gi, 'Aprobación')
      .replace(/renovaci[^\s\w]?n/gi, 'renovación')
      .replace(/Ordinara/gi, 'Ordinaria')
      .replace(/\uFFFD/g, 'ó');
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedMeetingId) return;
    if (status === 'FINALIZADA' && !showFinalizeModal) {
      setShowFinalizeModal(true);
      return;
    }
    try {
      const res = await apiRequest(`/meetings/${selectedMeetingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setShowFinalizeModal(false);
      if (res?.message) {
        alert(res.message);
      }
      await fetchMeetingDetail(selectedMeetingId);
      await fetchMeetings(selectedMeetingId);
      if (status === 'FINALIZADA') {
        await fetchFines(selectedMeetingId);
        setActiveTab('MULTAS');
      }
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleRegisterAttendance = async (identifier: string) => {
    if (!identifier.trim() || !selectedMeetingId) return;
    setIsRegistering(true);
    setAttendanceFeedback(null);
    try {
      const idempotencyKey = 'att-web-' + Date.now();
      const res = await apiRequest(`/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          merchantIdentifier: identifier.trim(),
          idempotencyKey,
        }),
      });
      setManualQr('');
      setAttendanceFeedback(res);
      await fetchMeetingDetail(selectedMeetingId);
    } catch (err: any) {
      alert(err.message || 'Error al registrar asistencia');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleToggleAttendance = async (merchantId: string, currentPresent: boolean) => {
    if (!selectedMeetingId) return;
    try {
      await apiRequest(`/meetings/${selectedMeetingId}/toggle-attendance`, {
        method: 'POST',
        body: JSON.stringify({ merchantId, present: !currentPresent }),
      });
      await fetchMeetingDetail(selectedMeetingId);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencia');
    }
  };

  const handleBulkAttendance = async (markAllPresent: boolean) => {
    const socios = meetingDetail?.allSocios || [];
    if (!selectedMeetingId || !socios.length) return;
    const confirmMsg = markAllPresent
      ? `¿Marcar a todos los ${socios.length} socios como PRESENTES en esta asamblea?`
      : '¿Marcar a todos los socios como AUSENTES en esta asamblea?';
    if (!confirm(confirmMsg)) return;
    try {
      const items = socios.map((s: any) => ({
        merchantId: s.id,
        present: markAllPresent,
      }));
      await apiRequest(`/meetings/${selectedMeetingId}/bulk-attendance`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      await fetchMeetingDetail(selectedMeetingId);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencia en bloque');
    }
  };

  const attendedList = meetingDetail?.attended || meetingDetail?.attendances || [];
  const absentList = meetingDetail?.absent || [];
  const quorum = meetingDetail?.quorum || {
    totalSocios: (attendedList.length + absentList.length) || 1,
    attendedCount: attendedList.length,
    absentCount: absentList.length,
    quorumPercentage: 0,
    hasQuorum: false,
  };

  const filteredSociosGrid = useMemo(() => {
    const list = meetingDetail?.allSocios || [];
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
  }, [meetingDetail?.allSocios, searchTerm]);

  // Alphabetical sort: lastName, firstName
  const filteredAttended = useMemo(() => {
    return attendedList
      .filter((a: any) => {
        const q = searchTerm.toLowerCase();
        const fullName = `${a.merchant?.lastName || ''} ${a.merchant?.firstName || ''}`.toLowerCase();
        const dni = (a.dni || a.merchant?.dni || '').toLowerCase();
        const stall = (a.merchant?.stall?.code || '').toLowerCase();
        return fullName.includes(q) || dni.includes(q) || stall.includes(q);
      })
      .sort((a: any, b: any) => {
        const aName = `${a.merchant?.lastName || ''} ${a.merchant?.firstName || ''}`;
        const bName = `${b.merchant?.lastName || ''} ${b.merchant?.firstName || ''}`;
        return aName.localeCompare(bName, 'es');
      });
  }, [attendedList, searchTerm]);

    const filteredFines = useMemo(() => {
    return finesList.filter((f: any) => {
      const q = searchTerm.toLowerCase();
      const sName = `${f.merchant?.lastName || ''} ${f.merchant?.firstName || ''}`.toLowerCase();
      const dni = (f.merchant?.dni || '').toLowerCase();
      const stall = (f.merchant?.stall?.code || '').toLowerCase();
      return sName.includes(q) || dni.includes(q) || stall.includes(q);
    });
  }, [finesList, searchTerm]);

  const filteredAbsent = useMemo(() => {
    return absentList
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
  }, [absentList, searchTerm]);

  const isLateAttendance = (scannedAt: string, meetingDate: string, meetingTime: string) => {
    try {
      const [hStr, mStr] = (meetingTime || '00:00').split(':');
      const start = new Date(meetingDate);
      start.setHours(parseInt(hStr, 10) || 0, parseInt(mStr, 10) || 0, 0, 0);
      const scan = new Date(scannedAt);
      const diff = Math.floor((scan.getTime() - start.getTime()) / 60000);
      return diff > 15;
    } catch {
      return false;
    }
  };

  const pieData = [
    { name: 'Presentes', value: quorum.attendedCount || 0, color: '#059669' },
    { name: 'Ausentes', value: Math.max(0, quorum.absentCount || 0), color: '#CBD5E1' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Reuniones y Asistencia de Socios
          </h1>
          <p className="text-xs text-slate-500">
            Programación de asambleas, control de quórum oficial (50%+1) y listas de presentes y ausentes en vivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchMeetings();
              if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Programar Nueva Reunión
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar por Fecha:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFilterDate('');
              fetchMeetings(undefined, '');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterDate === ''
                ? 'bg-slate-900 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas las Fechas
          </button>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setFilterDate(today);
              fetchMeetings(undefined, today);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterDate === new Date().toISOString().split('T')[0]
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Hoy ({new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })})
          </button>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                const val = e.target.value;
                setFilterDate(val);
                fetchMeetings(undefined, val);
              }}
              className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
            />
            {filterDate && (
              <button
                onClick={() => {
                  setFilterDate('');
                  fetchMeetings(undefined, '');
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar filtro de fecha"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Selectors */}
      {meetings.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-700">
            {filterDate ? `No hay reuniones programadas para el ${filterDate}` : 'No hay reuniones programadas'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {filterDate
              ? 'Intente seleccionando otra fecha o limpie el filtro para ver todas las reuniones del padrón.'
              : 'Cree una nueva asamblea ordinaria o extraordinaria para que aparezca en el sistema y en los celulares de los cobradores.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
          >
            + Programar Primera Asamblea
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {meetings.map((m) => {
            const isSel = selectedMeetingId === m.id;
            const isLive = m.status === 'EN_CURSO';
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMeetingId(m.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                  isSel
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLive ? 'bg-green-400 animate-pulse' : m.status === 'PROGRAMADA' ? 'bg-blue-400' : 'bg-slate-400'
                  }`}
                />
                <span>{m.title}</span>
                <span className="opacity-70 font-mono text-[10px]">
                  ({formatDateNoTimezone(m.date)})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Meeting Dashboard */}
      {meetingDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Meeting Info & Quorum */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                    meetingDetail.status === 'EN_CURSO'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : meetingDetail.status === 'PROGRAMADA'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {meetingDetail.status === 'EN_CURSO'
                    ? '🔴 EN CURSO (EN VIVO)'
                    : meetingDetail.status}
                </span>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(meetingDetail)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                    title="Editar asamblea"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {meetingDetail.status === 'PROGRAMADA' && (
                    <button
                      onClick={() => handleDeleteMeeting(meetingDetail.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                      title="Eliminar asamblea programada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                {meetingDetail.status === 'PROGRAMADA' && (
                  <button
                    onClick={() => handleUpdateStatus('EN_CURSO')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Iniciar Asamblea
                  </button>
                )}
                {meetingDetail.status === 'EN_CURSO' && (
                  <button
                    onClick={() => handleUpdateStatus('FINALIZADA')}
                    className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Finalizar Asamblea
                  </button>
                )}
                </div>
              </div>

              <div>
                <h2 className="text-base font-black text-slate-800 leading-snug">{cleanUtf8(meetingDetail.title)}</h2>
                <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateNoTimezone(meetingDetail.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {meetingDetail.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {meetingDetail.location}
                  </span>
                </div>
                {meetingDetail.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {cleanUtf8(meetingDetail.description)}
                  </p>
                )}
              </div>

              {/* Quorum Donut */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">Estado del Quórum</span>
                  <span
                    className={`text-xs font-black ${
                      quorum.hasQuorum ? 'text-emerald-700' : 'text-amber-600'
                    }`}
                  >
                    {quorum.quorumPercentage}% {quorum.hasQuorum ? '✓ QUÓRUM LEGAL' : '⚠ PENDIENTE'}
                  </span>
                </div>

                <div className="h-44 flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Quorum Stats */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      Socios Presentes:
                    </span>
                    <span className="font-black text-emerald-800 text-sm">{quorum.attendedCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                      Socios Ausentes / Faltantes:
                    </span>
                    <span className="font-bold text-slate-600">{quorum.absentCount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 font-bold">
                    <span className="text-slate-700">Padrón Habilitado Total:</span>
                    <span className="text-slate-800">{quorum.totalSocios} Socios</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scanner & Lists (Presentes vs Ausentes) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Registration Input */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center">
                <QrCode className="w-4 h-4 text-emerald-600 mr-2" />
                Registrar Asistencia en Sala (Escanear Credencial o DNI)
              </h3>

              {/* Feedback Alert Banner */}
              {attendanceFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                    attendanceFeedback.isLate
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {attendanceFeedback.isLate ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                    <span>{attendanceFeedback.message}</span>
                  </div>
                  <button
                    onClick={() => setAttendanceFeedback(null)}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRegisterAttendance(manualQr);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Escanee con lector de código de barras o ingrese DNI..."
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  {isRegistering ? 'Marcando...' : 'Marcar Ingreso'}
                </button>
              </form>
            </div>

            {/* Attendance Tabs: Grid vs Presentes vs Ausentes vs Multas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Tab Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => setActiveTab('GRID')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'GRID'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Cuadrícula de Socios ({meetingDetail?.allSocios?.length || 107})
                  </button>
                  <button
                    onClick={() => setActiveTab('PRESENTES')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'PRESENTES'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Presentes ({attendedList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('AUSENTES')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'AUSENTES'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Ausentes ({absentList.length})
                  </button>
                  {meetingDetail.status === 'FINALIZADA' && (
                    <button
                      onClick={() => setActiveTab('MULTAS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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

                {/* Search & Bulk actions */}
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
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-full sm:w-48 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                {activeTab === 'MULTAS' && (
                  <div>
                    {/* Summary Bar */}
                    <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex flex-wrap gap-4 items-center justify-between text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px] uppercase">Sanciones Registradas</span>
                          <span className="font-black text-slate-800 text-sm">{finesList.length} socios ausentes</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px] uppercase">Monto Total Sanciones</span>
                          <span className="font-black text-rose-700 text-sm">
                            S/ {(finesList.reduce((acc, f) => acc + Number(f.amount), 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px] uppercase">Pendiente por Cobrar</span>
                          <span className="font-black text-amber-700 text-sm">
                            S/ {(finesList.filter((f: any) => f.status === 'PENDIENTE').reduce((acc: number, f: any) => acc + Number(f.amount), 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px] uppercase">Recaudado en Caja</span>
                          <span className="font-black text-emerald-700 text-sm">
                            S/ {(finesList.filter((f: any) => f.status === 'PAGADO').reduce((acc: number, f: any) => acc + Number(f.amount), 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] font-black text-rose-800 bg-rose-100/80 px-3 py-1.5 rounded-xl border border-rose-200">
                        Tarifa estatutaria: S/ 50.00 c/u
                      </div>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                        <tr>
                          <th className="py-2.5 px-4">Socio Ausente</th>
                          <th className="py-2.5 px-4">DNI</th>
                          <th className="py-2.5 px-4">Puesto</th>
                          <th className="py-2.5 px-4">Código / Período</th>
                          <th className="py-2.5 px-4">Monto Multa</th>
                          <th className="py-2.5 px-4">Estado Contable</th>
                          <th className="py-2.5 px-4">Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingFines ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400">
                              Cargando registro de multas...
                            </td>
                          </tr>
                        ) : filteredFines.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400">
                              {finesList.length === 0
                                ? (meetingDetail.status === 'FINALIZADA'
                                    ? 'No se registran multas aplicadas para esta sesión.'
                                    : 'Las multas se calcularán y registrarán automáticamente para todos los ausentes al Finalizar la Asamblea.')
                                : 'No se encontraron multas con el criterio de búsqueda.'}
                            </td>
                          </tr>
                        ) : (
                          filteredFines.map((f: any) => (
                            <tr key={f.id} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-4 font-bold text-slate-800">
                                {f.merchant?.lastName}, {f.merchant?.firstName}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{f.merchant?.dni || '-'}</td>
                              <td className="py-2.5 px-4 font-bold text-slate-700">{f.merchant?.stall?.code || '-'}</td>
                              <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{f.period}</td>
                              <td className="py-2.5 px-4 font-bold font-mono text-rose-700">
                                S/ {Number(f.amount).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4">
                                {f.status === 'PAGADO' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3 h-3" />
                                    COBRADO EN CAJA
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                    <AlertCircle className="w-3 h-3" />
                                    PENDIENTE
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                {f.dueDate ? formatDateNoTimezone(f.dueDate) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {activeTab === 'GRID' && (
                  <div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">N°</th>
                          <th className="py-2.5 px-4">Socio Titular</th>
                          <th className="py-2.5 px-3">DNI</th>
                          <th className="py-2.5 px-3">Puesto / Giro</th>
                          <th className="py-2.5 px-3">Condición</th>
                          <th className="py-2.5 px-4 text-center">Asistencia (Cuadrícula)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSociosGrid.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400">
                              No se encontraron socios con el término de búsqueda.
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
                                    <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                                      {s.businessCategory || s.stall?.giro || '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      s.memberCondition === 'SOCIO_REGULAR'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {s.memberCondition === 'SOCIO_REGULAR' ? 'Titular' : 'En Prueba'}
                                  </span>
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
                {activeTab === 'PRESENTES' ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-4">Hora Ingreso</th>
                        <th className="py-2.5 px-4">Socio Titular</th>
                        <th className="py-2.5 px-4">DNI</th>
                        <th className="py-2.5 px-4">Puntualidad</th>
                        <th className="py-2.5 px-4">Puesto</th>
                        <th className="py-2.5 px-4">Registrado Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttended.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            No hay socios registrados en esta lista.
                          </td>
                        </tr>
                      ) : (
                        filteredAttended.map((att: any, idx: number) => {
                          const late = isLateAttendance(
                            att.scannedAt || att.createdAt,
                            meetingDetail.date,
                            meetingDetail.time,
                          );

                          return (
                            <tr key={att.id || idx} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {new Date(att.scannedAt || att.createdAt).toLocaleTimeString('es-PE')}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-800">
                                {att.merchant?.lastName}, {att.merchant?.firstName}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{att.dni || att.merchant?.dni}</td>
                              <td className="py-2.5 px-4">
                                {late ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    🟡 Tardanza (Multa S/ 20)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    🟢 Puntual
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-700">
                                {att.merchant?.stall?.code || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                                {att.registeredBy?.fullName || 'Terminal'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-4">Socio Titular</th>
                        <th className="py-2.5 px-4">DNI</th>
                        <th className="py-2.5 px-4">Puesto</th>
                        <th className="py-2.5 px-4">Giro / Rubro</th>
                        <th className="py-2.5 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAbsent.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-400">
                            {searchTerm ? 'No se encontraron ausentes con esa búsqueda.' : '¡Asistencia 100%! No hay socios ausentes.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAbsent.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {s.lastName}, {s.firstName}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{s.dni}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-700">{s.stall?.code || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-500">{s.businessCategory || '-'}</td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => handleRegisterAttendance(s.dni)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
                              >
                                + Marcar Asistencia
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Programar Nueva Reunión */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Programar Nueva Asamblea
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Asamblea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Asamblea General Ordinaria - Balance 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha Programada *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lugar o Recinto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Auditorio Central del Mercado"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado Inicial
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="PROGRAMADA">PROGRAMADA (Para fecha futura)</option>
                  <option value="EN_CURSO">EN CURSO (Activar lectura hoy)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Orden del Día (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Temas a tratar, agenda y puntos de debate..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition"
                >
                  {isCreating ? 'Guardando...' : 'Programar Asamblea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Asamblea */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-600" />
                Editar Datos de la Asamblea
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMeeting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Asamblea *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lugar de Convocatoria *</label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Agenda / Orden del Día</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Cierre y Carga de Multas por Inasistencia */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  ¿Finalizar y Cerrar Asamblea?
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  Acción irreversible con generación de sanciones
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <p className="text-slate-700">
                Al dar por finalizada la asamblea general:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Se computará el quórum legal definitivo de la sesión.</li>
                <li>
                  <strong className="text-rose-700">
                    Se generará automáticamente una multa de S/ 50.00
                  </strong>{' '}
                  por inasistencia injustificada a todos los{' '}
                  <strong>{absentList.length} socios ausentes</strong>.
                </li>
                <li>
                  Las multas quedarán registradas de inmediato en el sistema y aparecerán al escanear el carnet QR de cada socio en cobranzas.
                </li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateStatus('FINALIZADA')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Confirmar Cierre y Aplicar Multas (S/ 50)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

