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
  Printer,
  History,
  FileText,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
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

function toDateInputFormat(dateStr?: string | Date) {
  if (!dateStr) return '';
  const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  return s.split('T')[0];
}

function getTodayInputDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ReunionesPage() {
  // Main view selector: Operación En Vivo vs Historial Completo
  const [activeMainSection, setActiveMainSection] = useState<'EN_VIVO' | 'HISTORIAL'>('EN_VIVO');

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
  const [editStatus, setEditStatus] = useState('PROGRAMADA');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter & search states for En Vivo
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  // History section filters
  const [historyYear, setHistoryYear] = useState<string>('2026');
  const [historyMonth, setHistoryMonth] = useState<string>('ALL');
  const [historyStatus, setHistoryStatus] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Manual attendance input
  const [manualQr, setManualQr] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // New Meeting Modal state (allows backdates from Jan 2026 onwards)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayInputDate());
  const [newTime, setNewTime] = useState('09:00');
  const [newLocation, setNewLocation] = useState('Auditorio Central del Mercado');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('PROGRAMADA');
  const [isCreating, setIsCreating] = useState(false);

  // Fines and attendance feedback state
  const [attendanceFeedback, setAttendanceFeedback] = useState<{ message: string; isLate?: boolean; fineAmount?: number } | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const cleanUtf8 = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/Pavimentaci[^\s\w]?n/gi, 'Pavimentación')
      .replace(/Aprobaci[^\s\w]?n/gi, 'Aprobación')
      .replace(/renovaci[^\s\w]?n/gi, 'renovación')
      .replace(/Ordinara/gi, 'Ordinaria')
      .replace(/\uFFFD/g, 'ó');
  };

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
  }, [selectedMeetingId, fetchMeetingDetail, fetchFines]);

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
      alert('✓ Asamblea creada con éxito.');
      await fetchMeetings(created.id);
      setActiveMainSection('EN_VIVO');
    } catch (err: any) {
      alert(err.message || 'Error al programar reunión');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (m: any) => {
    setEditId(m.id);
    setEditTitle(cleanUtf8(m.title));
    setEditDate(toDateInputFormat(m.date));
    setEditTime(m.time || '09:00');
    setEditLocation(cleanUtf8(m.location) || 'Auditorio Central del Mercado');
    setEditDescription(cleanUtf8(m.description) || '');
    setEditStatus(m.status || 'PROGRAMADA');
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
          status: editStatus,
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
    if (!confirm('¿Estás seguro de que deseas eliminar esta asamblea? Si tiene multas contables ya cobradas en caja, la eliminación no procederá.')) return;
    try {
      await apiRequest(`/meetings/${id}`, { method: 'DELETE' });
      alert('✓ Asamblea eliminada con éxito');
      await fetchMeetings();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar asamblea');
    }
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

  // Official Printable Padron (A4)
  const handlePrintAssemblyPadron = async (meetingToPrint?: any) => {
    let targetMeeting = meetingToPrint || meetingDetail;
    if (!targetMeeting) return;

    let targetSocios = targetMeeting.allSocios;
    if (!targetSocios || targetSocios.length === 0) {
      try {
        const full = await apiRequest(`/meetings/${targetMeeting.id}`);
        targetSocios = full.allSocios;
        targetMeeting = full;
      } catch (e) {
        alert('No se pudo cargar la lista completa para impresión');
        return;
      }
    }

    const win = window.open('', '_blank');
    if (!win) {
      alert('Por favor permita ventanas emergentes para imprimir el padrón oficial.');
      return;
    }

    const dateFormatted = formatDateNoTimezone(targetMeeting.date);
    const total = targetSocios?.length || 107;
    const attendedCount = targetSocios?.filter((s: any) => s.isPresent)?.length || 0;
    const absentCount = total - attendedCount;
    const quorumPercent = total > 0 ? ((attendedCount / total) * 100).toFixed(1) : '0';

    const rowsHtml = (targetSocios || [])
      .sort((a: any, b: any) => {
        const aName = `${a.lastName || ''} ${a.firstName || ''}`;
        const bName = `${b.lastName || ''} ${b.firstName || ''}`;
        return aName.localeCompare(bName, 'es');
      })
      .map((s: any, idx: number) => {
        const isPresent = Boolean(s.isPresent);
        const condition = s.memberCondition === 'SOCIO_REGULAR' ? 'Titular' : (s.memberCondition === 'SOCIO_EN_PRUEBA' ? 'En Prueba' : 'Titular');
        return `
          <tr>
            <td style="text-align: center; font-weight: bold; font-family: monospace;">${idx + 1}</td>
            <td style="font-weight: 600; text-transform: uppercase;">${s.lastName || ''}, ${s.firstName || ''}</td>
            <td style="text-align: center; font-family: monospace;">${s.dni || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${s.stall?.code || 'S/P'}</td>
            <td style="text-align: center; font-size: 8.5px; text-transform: uppercase;">${condition}</td>
            <td style="text-align: center; font-weight: bold; font-size: 8.5px; color: ${isPresent ? '#059669' : '#dc2626'};">
              ${isPresent ? '✓ PRESENTE' : '✗ AUSENTE'}
            </td>
            <td style="border-bottom: 1px dotted #94a3b8; width: 110px;"></td>
            <td style="border: 1px solid #cbd5e1; width: 45px; height: 30px; background: #f8fafc;"></td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Padrón de Asistencia - ${targetMeeting.title}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 10mm 12mm 10mm; }
          body { font-family: Arial, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
          .header h1 { font-size: 12px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { font-size: 10.5px; font-weight: 800; margin: 2px 0 0 0; color: #1e293b; text-transform: uppercase; }
          .header p { font-size: 8.5px; margin: 2px 0 0 0; color: #475569; }
          .meta-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; background: #f8fafc; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 6px; font-size: 8.5px; }
          .meta-item strong { display: block; font-size: 7.5px; text-transform: uppercase; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #0f172a; color: white; border: 1px solid #0f172a; padding: 3px 4px; text-align: left; font-size: 8px; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 2.5px 4px; }
          .signatures { margin-top: 25px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center; page-break-inside: avoid; }
          .sign-line { border-top: 1px solid #0f172a; padding-top: 3px; font-weight: bold; font-size: 8.5px; text-transform: uppercase; }
          .sign-sub { font-size: 7.5px; color: #64748b; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS “MICAELA BASTIDAS”</h1>
          <h2>PADRÓN DE SOCIOS ASISTENTES A LA ASAMBLEA GENERAL</h2>
          <p>MERCADO DE ABASTOS MICAELA BASTIDAS - VILLA EL SALVADOR | RUC: 20481234567 | FUNDADO EL 28/10/1994</p>
        </div>

        <div class="meta-box">
          <div class="meta-item">
            <strong>Asamblea:</strong>
            <span>${cleanUtf8(targetMeeting.title)}</span>
          </div>
          <div class="meta-item">
            <strong>Fecha y Hora:</strong>
            <span>${dateFormatted} - ${targetMeeting.time || '09:00'} hrs</span>
          </div>
          <div class="meta-item">
            <strong>Lugar:</strong>
            <span>${cleanUtf8(targetMeeting.location) || 'Auditorio Central'}</span>
          </div>
          <div class="meta-item">
            <strong>Quórum Legal (50%+1):</strong>
            <span>${quorumPercent}% (${attendedCount} de ${total} Socios)</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 20px; text-align: center;">N°</th>
              <th>Apellidos y Nombres</th>
              <th style="width: 55px; text-align: center;">DNI</th>
              <th style="width: 45px; text-align: center;">Puesto</th>
              <th style="width: 55px; text-align: center;">Condición</th>
              <th style="width: 60px; text-align: center;">Asistencia</th>
              <th style="width: 100px; text-align: center;">Firma</th>
              <th style="width: 45px; text-align: center;">Huella</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div style="height: 40px;"></div>
            <div class="sign-line">PRESIDENTE DEL CONSEJO DIRECTIVO</div>
            <div class="sign-sub">Asociación Micaela Bastidas</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sign-line">SECRETARIO(A) DE ACTAS</div>
            <div class="sign-sub">Asociación Micaela Bastidas</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sign-line">TESORERO(A) / FISCAL</div>
            <div class="sign-sub">Asociación Micaela Bastidas</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const attendedList = meetingDetail?.attended || meetingDetail?.attendances || [];
  const absentList = meetingDetail?.absent || [];
  const quorum = meetingDetail?.quorum || {
    totalSocios: (attendedList.length + absentList.length) || 107,
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

  // Filtered list for the HISTORIAL section
  const filteredHistoryMeetings = useMemo(() => {
    return meetings.filter((m: any) => {
      // Filter year
      if (historyYear !== 'ALL') {
        const mYear = (m.date ? String(m.date).slice(0, 4) : '');
        if (mYear !== historyYear) return false;
      }
      // Filter month
      if (historyMonth !== 'ALL') {
        const mMonth = m.date ? String(new Date(m.date).getMonth() + 1) : '';
        if (mMonth !== historyMonth) return false;
      }
      // Filter status
      if (historyStatus !== 'ALL') {
        if (m.status !== historyStatus) return false;
      }
      // Filter search
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const titleMatch = (m.title || '').toLowerCase().includes(q);
        const locMatch = (m.location || '').toLowerCase().includes(q);
        if (!titleMatch && !locMatch) return false;
      }
      return true;
    });
  }, [meetings, historyYear, historyMonth, historyStatus, historySearch]);

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
            Reuniones y Asistencia de Socios (107 Socios)
          </h1>
          <p className="text-xs text-slate-500">
            Control estatutario de asambleas ordinarias y extraordinarias, quórum legal (50%+1) e historial cronológico desde enero 2026.
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
            onClick={() => {
              setNewDate(getTodayInputDate());
              setShowCreateModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Programar / Cargar Asamblea
          </button>
        </div>
      </div>

      {/* Main Section Navigation: En Vivo vs Historial Completo */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMainSection('EN_VIVO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeMainSection === 'EN_VIVO'
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Asamblea en Curso / Toma de Asistencia
        </button>
        <button
          onClick={() => setActiveMainSection('HISTORIAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeMainSection === 'HISTORIAL'
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Historial Completo de Asambleas ({meetings.length})
        </button>
      </div>

      {/* VIEW 1: EN VIVO / OPERACIÓN DETALLADA */}
      {activeMainSection === 'EN_VIVO' && (
        <div className="space-y-6">
          {/* Quick Date Filter & Horizontal Meeting Selector */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar Fecha:</span>
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
                Todas las Asambleas
              </button>
              <button
                onClick={() => {
                  const today = getTodayInputDate();
                  setFilterDate(today);
                  fetchMeetings(undefined, today);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterDate === getTodayInputDate()
                    ? 'bg-emerald-700 text-white shadow'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Hoy ({formatDateNoTimezone(getTodayInputDate())})
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
                {filterDate ? `No hay reuniones registradas para el ${filterDate}` : 'No hay reuniones registradas'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Puede registrar asambleas ordinarias o extraordinarias anteriores desde enero 2026 o programar una nueva fecha.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                + Programar / Cargar Primera Asamblea
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
                    <span>{cleanUtf8(m.title)}</span>
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

                    {/* Status & CRUD action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePrintAssemblyPadron()}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition border border-slate-200"
                        title="Imprimir Padrón Oficial de Asistencia (A4 con Huella y Firma)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(meetingDetail)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                        title="Editar asamblea"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(meetingDetail.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                        title="Eliminar asamblea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {meetingDetail.status === 'PROGRAMADA' && (
                        <button
                          onClick={() => handleUpdateStatus('EN_CURSO')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Iniciar
                        </button>
                      )}
                      {meetingDetail.status === 'EN_CURSO' && (
                        <button
                          onClick={() => handleUpdateStatus('FINALIZADA')}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Finalizar
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
                        {cleanUtf8(meetingDetail.location)}
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
                          Socios Ausentes:
                        </span>
                        <span className="font-bold text-slate-600">{quorum.absentCount}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 font-bold">
                        <span className="text-slate-700">Padrón de Socios Habilitados:</span>
                        <span className="text-slate-800 font-mono">{quorum.totalSocios} Socios</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Attendance Management & Grid */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Registration Input */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center">
                    <QrCode className="w-4 h-4 text-emerald-600 mr-2" />
                    Registrar Asistencia en Sala (Escanear Credencial o DNI)
                  </h3>

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
                      placeholder="Escanee código de barras del carnet o ingrese DNI..."
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
                            title="Marcar a todos los 107 socios como presentes"
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
                              <th className="py-2.5 px-4">Socio Titular (Padrón 107)</th>
                              <th className="py-2.5 px-3">DNI</th>
                              <th className="py-2.5 px-3">Puesto / Giro</th>
                              <th className="py-2.5 px-3">Condición</th>
                              <th className="py-2.5 px-4 text-center">Asistencia (Alternar)</th>
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
                      activeTab === 'AUSENTES' && (
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
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: HISTORIAL COMPLETO DE ASAMBLEAS */}
      {activeMainSection === 'HISTORIAL' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Filter */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Año:</span>
                <select
                  value={historyYear}
                  onChange={(e) => setHistoryYear(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">Todos los Años</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Mes:</span>
                <select
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">Todos los Meses</option>
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Estado:</span>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="EN_CURSO">EN CURSO</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>
            </div>

            {/* History Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por título o lugar..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* History Aggregated Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Asambleas</span>
                <div className="text-xl font-black text-slate-800">{filteredHistoryMeetings.length} Registradas</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Padrón de Socios</span>
                <div className="text-xl font-black text-slate-800">107 Socios Habilitados</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Asambleas Concluidas</span>
                <div className="text-xl font-black text-slate-800">
                  {filteredHistoryMeetings.filter((m) => m.status === 'FINALIZADA').length} Finalizadas
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Listado Cronológico de Asambleas (Desde Enero 2026)
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {filteredHistoryMeetings.length} asamblea(s) encontrada(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Título de la Convocatoria</th>
                    <th className="py-3 px-4">Lugar</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Asistencia / Quórum</th>
                    <th className="py-3 px-4 text-right">Acciones Directas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No se encontraron asambleas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryMeetings.map((m: any) => {
                      const totalS = m.totalEligible || 107;
                      const attendedC = m.attendedCount || 0;
                      const pct = totalS > 0 ? ((attendedC / totalS) * 100).toFixed(1) : '0';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold font-mono text-slate-800">
                              {formatDateNoTimezone(m.date)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {m.time || '09:00'} hrs
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <div>{cleanUtf8(m.title)}</div>
                            {m.description && (
                              <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                {cleanUtf8(m.description)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {cleanUtf8(m.location) || 'Auditorio Central'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                m.status === 'EN_CURSO'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                                  : m.status === 'PROGRAMADA'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-bold text-slate-800">
                              {attendedC} / {totalS} socios
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {pct}% ({Number(pct) >= 50.0 ? '✓ Quórum' : 'Sin quórum'})
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedMeetingId(m.id);
                                  setActiveMainSection('EN_VIVO');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-xs flex items-center gap-1 transition"
                                title="Abrir y gestionar toma de asistencia"
                              >
                                <span>Ver / Marcar</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handlePrintAssemblyPadron(m)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Imprimir Padrón Oficial A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Editar datos"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMeeting(m.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                                title="Eliminar registro"
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
          </div>
        </div>
      )}

      {/* Modal Programar / Cargar Nueva Reunión (Permite fechas desde enero 2026) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Programar / Cargar Asamblea General
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
                  placeholder="ej. Asamblea General Ordinaria - Balance Enero 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha (Desde Enero 2026) *
                  </label>
                  <input
                    type="date"
                    required
                    min="2025-01-01"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado Inicial
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="PROGRAMADA">PROGRAMADA (Para fecha futura)</option>
                  <option value="EN_CURSO">EN CURSO (Activar para pasar lista hoy)</option>
                  <option value="FINALIZADA">FINALIZADA (Asamblea anterior ya ejecutada)</option>
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                  {isCreating ? 'Guardando...' : 'Guardar Asamblea'}
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado de la Asamblea</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="PROGRAMADA">PROGRAMADA</option>
                    <option value="EN_CURSO">EN CURSO</option>
                    <option value="FINALIZADA">FINALIZADA</option>
                  </select>
                </div>
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
                  Las multas quedarán registradas de inmediato en el sistema contable y aparecerán al escanear el carnet QR de cada socio en cobranzas.
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
