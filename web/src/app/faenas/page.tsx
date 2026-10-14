'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  History,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  UserX,
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

export default function FaenasPage() {
  // Main view selector: Operación En Vivo vs Historial Completo
  const [activeMainSection, setActiveMainSection] = useState<'EN_VIVO' | 'HISTORIAL'>('EN_VIVO');

  const [faenas, setFaenas] = useState<any[]>([]);
  const [selectedFaena, setSelectedFaena] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active sub-tab inside En Vivo
  const [activeTab, setActiveTab] = useState<'GRID' | 'ASISTENTES' | 'AUSENTES' | 'MULTAS'>('GRID');

  // Form nueva faena (Permite fechas anteriores desde enero 2026)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFaenaForm, setNewFaenaForm] = useState({
    title: '',
    date: getTodayInputDate(),
    time: '06:00',
    sectorToClean: 'Todos los Sectores y Pasajes',
    fineAmount: 30.00,
    status: 'PROGRAMADA',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fines state
  const [finesList, setFinesList] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  // Edit Faena Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFaenaForm, setEditFaenaForm] = useState({
    id: '',
    title: '',
    date: '',
    time: '06:00',
    sectorToClean: '',
    fineAmount: 30.00,
    status: 'PROGRAMADA',
    description: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Scanner & feedback state
  const [dniOrCode, setDniOrCode] = useState('');
  const [scanMessage, setScanMessage] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // History filters
  const [historyYear, setHistoryYear] = useState<string>('2026');
  const [historyMonth, setHistoryMonth] = useState<string>('ALL');
  const [historyStatus, setHistoryStatus] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

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
      const res = await apiRequest(`/faenas/${id}/fines`);
      setFinesList(res || []);
    } catch (e) {
      console.error('Error fetching faena fines:', e);
    } finally {
      setLoadingFines(false);
    }
  }, []);

  const fetchFaenas = useCallback(async (selectId?: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/faenas');
      setFaenas(res || []);
      if (res && res.length > 0) {
        if (selectId) {
          fetchFaenaDetails(selectId);
        } else if (!selectedFaena || !res.some((f: any) => f.id === selectedFaena?.id)) {
          fetchFaenaDetails(res[0].id);
        }
      } else {
        setSelectedFaena(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFaena]);

  const fetchFaenaDetails = useCallback(async (id: string) => {
    try {
      const res = await apiRequest(`/faenas/${id}`);
      setSelectedFaena(res);
      fetchFines(id);
    } catch (e) {
      console.error(e);
    }
  }, [fetchFines]);

  useEffect(() => {
    fetchFaenas();
  }, []);

  const handleOpenEdit = (f: any) => {
    setEditFaenaForm({
      id: f.id,
      title: cleanUtf8(f.title),
      date: toDateInputFormat(f.date),
      time: f.time || '06:00',
      sectorToClean: cleanUtf8(f.sectorToClean) || 'Todos los Sectores',
      fineAmount: Number(f.fineAmount) || 30.00,
      status: f.status || 'PROGRAMADA',
      description: cleanUtf8(f.description) || '',
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
      await fetchFaenas(editFaenaForm.id);
      await fetchFaenaDetails(editFaenaForm.id);
    } catch (e: any) {
      alert(e.message || 'Error al actualizar faena');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFaena = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta faena comunal? Si tiene multas cobradas en caja, la eliminación será bloqueada.')) return;
    try {
      await apiRequest(`/faenas/${id}`, { method: 'DELETE' });
      alert('✓ Faena eliminada con éxito');
      await fetchFaenas();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar faena');
    }
  };

  const handleCreateFaena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaenaForm.title.trim()) return;
    setIsCreating(true);
    try {
      const created = await apiRequest('/faenas', {
        method: 'POST',
        body: JSON.stringify(newFaenaForm),
      });
      alert('✓ Faena programada / cargada con éxito');
      setIsNewModalOpen(false);
      setNewFaenaForm({
        title: '',
        date: getTodayInputDate(),
        time: '06:00',
        sectorToClean: 'Todos los Sectores y Pasajes',
        fineAmount: 30.00,
        status: 'PROGRAMADA',
        description: '',
      });
      await fetchFaenas(created.id);
      setActiveMainSection('EN_VIVO');
    } catch (e: any) {
      alert(e.message || 'Error al registrar faena');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegisterAttendance = async (code: string) => {
    if (!selectedFaena || !code.trim()) return;
    setIsRegistering(true);
    setScanMessage(null);
    try {
      const res = await apiRequest(`/faenas/${selectedFaena.id}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ dniOrCode: code.trim() }),
      });
      setScanMessage({
        type: 'success',
        text: `Asistencia registrada: ${res.merchant?.firstName} ${res.merchant?.lastName} (DNI: ${res.merchant?.dni})`,
      });
      setDniOrCode('');
      await fetchFaenaDetails(selectedFaena.id);
    } catch (e: any) {
      setScanMessage({
        type: 'error',
        text: e.message || 'Error al registrar asistencia en faena',
      });
    } finally {
      setIsRegistering(false);
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
    } catch (e: any) {
      alert(e.message || 'Error al alternar asistencia');
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
    } catch (err: any) {
      alert(err.message || 'Error al actualizar asistencia en bloque');
    }
  };

  const handleFinalizeFaena = async () => {
    if (!selectedFaena) return;
    if (!confirm(`¿Está seguro de FINALIZAR la faena "${selectedFaena.title}"? Se aplicará automáticamente una multa de S/ ${Number(selectedFaena.fineAmount).toFixed(2)} a todos los socios ausentes.`)) {
      return;
    }
    try {
      const res = await apiRequest(`/faenas/${selectedFaena.id}/finalize`, {
        method: 'POST',
      });
      alert(`✓ ${res.message || 'Faena finalizada con éxito'}. Se generaron ${res.multasGeneradas || 0} multas.`);
      await fetchFaenas(selectedFaena.id);
      await fetchFaenaDetails(selectedFaena.id);
      setActiveTab('MULTAS');
    } catch (e: any) {
      alert(e.message || 'Error al finalizar faena');
    }
  };

  // Official Printable Padron (A4)
  const handlePrintFaenaPadron = async (faenaToPrint?: any) => {
    let target = faenaToPrint || selectedFaena;
    if (!target) return;

    let targetSocios = target.allSocios;
    if (!targetSocios || targetSocios.length === 0) {
      try {
        const full = await apiRequest(`/faenas/${target.id}`);
        targetSocios = full.allSocios;
        target = full;
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

    const dateFormatted = formatDateNoTimezone(target.date);
    const total = targetSocios?.length || 107;
    const attendedCount = targetSocios?.filter((s: any) => s.isPresent)?.length || 0;
    const absentCount = total - attendedCount;
    const pct = total > 0 ? ((attendedCount / total) * 100).toFixed(1) : '0';

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
              ${isPresent ? '✓ PARTICIPÓ' : '✗ AUSENTE'}
            </td>
            <td style="border-bottom: 1px dotted #94a3b8; width: 100px;"></td>
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
        <title>Padrón de Faena Comunal - ${target.title}</title>
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
          <h2>PADRÓN OFICIAL DE SOCIOS PARTICIPANTES EN LA FAENA COMUNAL</h2>
          <p>MERCADO DE ABASTOS MICAELA BASTIDAS - VILLA EL SALVADOR | RUC: 20481234567 | FUNDADO EL 28/10/1994</p>
        </div>

        <div class="meta-box">
          <div class="meta-item">
            <strong>Faena / Convocatoria:</strong>
            <span>${cleanUtf8(target.title)}</span>
          </div>
          <div class="meta-item">
            <strong>Fecha y Hora:</strong>
            <span>${dateFormatted} - ${target.time || '06:00'} hrs</span>
          </div>
          <div class="meta-item">
            <strong>Sector a Limpiar:</strong>
            <span>${cleanUtf8(target.sectorToClean) || 'Todos los Pasajes'}</span>
          </div>
          <div class="meta-item">
            <strong>Participación / Socios:</strong>
            <span>${pct}% (${attendedCount} de ${total} Socios)</span>
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
              <th style="width: 60px; text-align: center;">Participación</th>
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
            <div class="sign-line">SECRETARIO(A) DE DISCIPLINA / VIGILANCIA</div>
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

  const sociosGrid = selectedFaena?.allSocios || [];
  const attendancesList = selectedFaena?.attendances || [];
  const absentList = selectedFaena?.absent || [];
  const totalSocios = selectedFaena?.totalSocios || 107;
  const attendedCount = attendancesList.length;
  const absentCount = totalSocios - attendedCount;
  const attendanceRate = totalSocios > 0 ? ((attendedCount / totalSocios) * 100).toFixed(1) : '0';

  const filteredSociosGrid = useMemo(() => {
    return sociosGrid
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
  }, [sociosGrid, searchTerm]);

  const filteredAttendances = useMemo(() => {
    return attendancesList.filter((a: any) => {
      const q = searchTerm.toLowerCase();
      const s = a.merchant;
      const fullName = `${s?.lastName || ''} ${s?.firstName || ''}`.toLowerCase();
      const dni = (s?.dni || a.dni || '').toLowerCase();
      const stall = (s?.stall?.code || '').toLowerCase();
      return fullName.includes(q) || dni.includes(q) || stall.includes(q);
    });
  }, [attendancesList, searchTerm]);

  const filteredAbsent = useMemo(() => {
    return absentList.filter((s: any) => {
      const q = searchTerm.toLowerCase();
      const fullName = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
      const dni = (s.dni || '').toLowerCase();
      const stall = (s.stall?.code || '').toLowerCase();
      return fullName.includes(q) || dni.includes(q) || stall.includes(q);
    });
  }, [absentList, searchTerm]);

  const filteredFines = useMemo(() => {
    return finesList.filter((f: any) => {
      const q = searchTerm.toLowerCase();
      const sName = `${f.merchant?.lastName || ''} ${f.merchant?.firstName || ''}`.toLowerCase();
      const dni = (f.merchant?.dni || '').toLowerCase();
      const stall = (f.merchant?.stall?.code || '').toLowerCase();
      return sName.includes(q) || dni.includes(q) || stall.includes(q);
    });
  }, [finesList, searchTerm]);

  // Filtered faenas for Historial section
  const filteredHistoryFaenas = useMemo(() => {
    return faenas.filter((f: any) => {
      if (historyYear !== 'ALL') {
        const fYear = f.date ? String(f.date).slice(0, 4) : '';
        if (fYear !== historyYear) return false;
      }
      if (historyMonth !== 'ALL') {
        const fMonth = f.date ? String(new Date(f.date).getMonth() + 1) : '';
        if (fMonth !== historyMonth) return false;
      }
      if (historyStatus !== 'ALL') {
        if (f.status !== historyStatus) return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const titleMatch = (f.title || '').toLowerCase().includes(q);
        const secMatch = (f.sectorToClean || '').toLowerCase().includes(q);
        if (!titleMatch && !secMatch) return false;
      }
      return true;
    });
  }, [faenas, historyYear, historyMonth, historyStatus, historySearch]);

  const pieData = [
    { name: 'Presentes', value: attendedCount, color: '#059669' },
    { name: 'Ausentes', value: Math.max(0, absentCount), color: '#CBD5E1' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Faenas Comunales de Limpieza (107 Socios)
          </h1>
          <p className="text-xs text-slate-500">
            Control obligatorio de participación en jornadas de limpieza, padrón de socios e historial desde enero 2026.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchFaenas();
              if (selectedFaena) fetchFaenaDetails(selectedFaena.id);
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setNewFaenaForm({
                title: '',
                date: getTodayInputDate(),
                time: '06:00',
                sectorToClean: 'Todos los Sectores y Pasajes',
                fineAmount: 30.00,
                status: 'PROGRAMADA',
                description: '',
              });
              setIsNewModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Programar / Cargar Faena
          </button>
        </div>
      </div>

      {/* Main Section Navigation: En Vivo vs Historial */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMainSection('EN_VIVO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeMainSection === 'EN_VIVO'
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Faena en Curso / Toma de Asistencia
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
          Historial Completo de Faenas ({faenas.length})
        </button>
      </div>

      {/* SECTION 1: EN VIVO */}
      {activeMainSection === 'EN_VIVO' && (
        <div className="space-y-6">
          {/* Faena Pill Selectors */}
          {faenas.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-700">No hay faenas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Puede cargar faenas pasadas desde enero 2026 o programar una nueva jornada comunal.
              </p>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                + Programar Primera Faena
              </button>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {faenas.map((f) => {
                const isSel = selectedFaena?.id === f.id;
                const isFinal = f.status === 'FINALIZADA';
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      fetchFaenaDetails(f.id);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                      isSel
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFinal ? 'bg-slate-400' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span>{cleanUtf8(f.title)}</span>
                    <span className="opacity-70 font-mono text-[10px]">
                      ({formatDateNoTimezone(f.date)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Faena Dashboard */}
          {selectedFaena && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Faena Info & Participation Stats */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        selectedFaena.status === 'FINALIZADA'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      }`}
                    >
                      {selectedFaena.status === 'FINALIZADA' ? 'FINALIZADA' : '🟢 JORNADA ACTIVA'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePrintFaenaPadron()}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition border border-slate-200"
                        title="Imprimir Padrón Oficial A4 (Huella y Firma)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(selectedFaena)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                        title="Editar faena"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaena(selectedFaena.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                        title="Eliminar faena"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {selectedFaena.status !== 'FINALIZADA' && (
                        <button
                          onClick={handleFinalizeFaena}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Finalizar
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-800 leading-snug">{cleanUtf8(selectedFaena.title)}</h2>
                    <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateNoTimezone(selectedFaena.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {selectedFaena.time || '06:00'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {cleanUtf8(selectedFaena.sectorToClean) || 'Todos los Pasajes'}
                      </span>
                    </div>
                    {selectedFaena.description && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {cleanUtf8(selectedFaena.description)}
                      </p>
                    )}
                  </div>

                  {/* Participation Donut */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">Participación General</span>
                      <span className="text-xs font-black text-emerald-700">
                        {attendanceRate}% Asistencia
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

                    {/* Stats */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                          Socios que Participaron:
                        </span>
                        <span className="font-black text-emerald-800 text-sm">{attendedCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                          Socios Faltantes / Ausentes:
                        </span>
                        <span className="font-bold text-slate-600">{absentCount}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 font-bold">
                        <span className="text-slate-700">Padrón de Socios Habilitados:</span>
                        <span className="text-slate-800 font-mono">{totalSocios} Socios</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700 font-bold">
                        <span>Multa por Inasistencia:</span>
                        <span>S/ {Number(selectedFaena.fineAmount || 30).toFixed(2)}</span>
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
                    Registrar Asistencia en Faena (Escanear Credencial o DNI)
                  </h3>

                  {scanMessage && (
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                        scanMessage.type === 'error'
                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {scanMessage.type === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                        <span>{scanMessage.text}</span>
                      </div>
                      <button
                        onClick={() => setScanMessage(null)}
                        className="text-slate-400 hover:text-slate-600 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRegisterAttendance(dniOrCode);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Escanee con lector de código de barras o ingrese DNI..."
                      value={dniOrCode}
                      onChange={(e) => setDniOrCode(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      {isRegistering ? 'Marcando...' : 'Marcar Asistencia'}
                    </button>
                  </form>
                </div>

                {/* Tabs & Attendance Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                        Cuadrícula de Socios ({sociosGrid.length || 107})
                      </button>
                      <button
                        onClick={() => setActiveTab('ASISTENTES')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          activeTab === 'ASISTENTES'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Asistentes ({attendancesList.length})
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
                      {selectedFaena.status === 'FINALIZADA' && (
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

                  {/* Tab Body */}
                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    {activeTab === 'MULTAS' && (
                      <div>
                        <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex flex-wrap gap-4 items-center justify-between text-xs">
                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <span className="text-slate-500 font-bold block text-[10px] uppercase">Sanciones de Faena</span>
                              <span className="font-black text-slate-800 text-sm">{finesList.length} ausentes</span>
                            </div>
                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                            <div>
                              <span className="text-slate-500 font-bold block text-[10px] uppercase">Monto Total</span>
                              <span className="font-black text-rose-700 text-sm">
                                S/ {(finesList.reduce((acc, f) => acc + Number(f.amount), 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                            <div>
                              <span className="text-slate-500 font-bold block text-[10px] uppercase">Pendiente</span>
                              <span className="font-black text-amber-700 text-sm">
                                S/ {(finesList.filter((f: any) => f.status === 'PENDIENTE').reduce((acc: number, f: any) => acc + Number(f.amount), 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                            <div>
                              <span className="text-slate-500 font-bold block text-[10px] uppercase">Cobrado en Caja</span>
                              <span className="font-black text-emerald-700 text-sm">
                                S/ {(finesList.filter((f: any) => f.status === 'PAGADO').reduce((acc: number, f: any) => acc + Number(f.amount), 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] font-black text-rose-800 bg-rose-100/80 px-3 py-1.5 rounded-xl border border-rose-200">
                            Tarifa faena: S/ {Number(selectedFaena.fineAmount || 30).toFixed(2)}
                          </div>
                        </div>

                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                            <tr>
                              <th className="py-2.5 px-4">Socio Ausente</th>
                              <th className="py-2.5 px-4">DNI</th>
                              <th className="py-2.5 px-4">Puesto</th>
                              <th className="py-2.5 px-4">Período / Código</th>
                              <th className="py-2.5 px-4">Monto Multa</th>
                              <th className="py-2.5 px-4">Estado</th>
                              <th className="py-2.5 px-4">Vencimiento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {loadingFines ? (
                              <tr>
                                <td colSpan={7} className="py-10 text-center text-slate-400">
                                  Cargando sanciones...
                                </td>
                              </tr>
                            ) : filteredFines.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-10 text-center text-slate-400">
                                  No se registran multas aplicadas para esta faena.
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
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">N°</th>
                            <th className="py-2.5 px-4">Socio Titular (Padrón 107)</th>
                            <th className="py-2.5 px-3">DNI</th>
                            <th className="py-2.5 px-3">Puesto</th>
                            <th className="py-2.5 px-3">Sector</th>
                            <th className="py-2.5 px-4 text-center">Participación en Faena</th>
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
                                  <td className="py-2 px-3 font-mono font-bold text-slate-600">{s.dni}</td>
                                  <td className="py-2 px-3 font-bold text-slate-700">
                                    {s.stall?.code || 'S/P'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500">
                                    {s.sector?.name || 'Mercado'}
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
                                          <span>PARTICIPÓ</span>
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
                    )}
                    {activeTab === 'ASISTENTES' && (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-4">Hora Registro</th>
                            <th className="py-2.5 px-4">Socio Titular</th>
                            <th className="py-2.5 px-4">DNI</th>
                            <th className="py-2.5 px-4">Puesto</th>
                            <th className="py-2.5 px-4">Registrado Por</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAttendances.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-400">
                                No hay socios registrados en esta lista.
                              </td>
                            </tr>
                          ) : (
                            filteredAttendances.map((att: any, idx: number) => (
                              <tr key={att.id || idx} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                                  {new Date(att.scannedAt).toLocaleTimeString('es-PE')}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">
                                  {att.merchant?.lastName}, {att.merchant?.firstName}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">{att.dni}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-700">
                                  {att.merchant?.stall?.code || '-'}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                                  {att.registeredBy?.fullName || 'Terminal'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                    {activeTab === 'AUSENTES' && (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50">
                          <tr>
                            <th className="py-2.5 px-4">Socio Titular</th>
                            <th className="py-2.5 px-4">DNI</th>
                            <th className="py-2.5 px-4">Puesto</th>
                            <th className="py-2.5 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAbsent.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-slate-400">
                                ¡Participación 100%! No hay socios ausentes.
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
        </div>
      )}

      {/* SECTION 2: HISTORIAL COMPLETO */}
      {activeMainSection === 'HISTORIAL' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
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

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Estado:</span>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por título o sector..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Aggregated Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Faenas</span>
                <div className="text-xl font-black text-slate-800">{filteredHistoryFaenas.length} Jornadas</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Padrón de Socios</span>
                <div className="text-xl font-black text-slate-800">107 Socios Convocados</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Faenas Concluidas</span>
                <div className="text-xl font-black text-slate-800">
                  {filteredHistoryFaenas.filter((f) => f.status === 'FINALIZADA').length} Finalizadas
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Listado Cronológico de Faenas Comunales (Desde Enero 2026)
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {filteredHistoryFaenas.length} faena(s) encontrada(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Título de la Jornada</th>
                    <th className="py-3 px-4">Sector a Limpiar</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Participación</th>
                    <th className="py-3 px-4 text-center">Monto Multa</th>
                    <th className="py-3 px-4 text-right">Acciones Directas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryFaenas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No se encontraron faenas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryFaenas.map((f: any) => {
                      const totalS = f.totalEligible || 107;
                      const attendedC = f.attendedCount || 0;
                      const pct = totalS > 0 ? ((attendedC / totalS) * 100).toFixed(1) : '0';

                      return (
                        <tr key={f.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold font-mono text-slate-800">
                              {formatDateNoTimezone(f.date)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {f.time || '06:00'} hrs
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <div>{cleanUtf8(f.title)}</div>
                            {f.description && (
                              <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                {cleanUtf8(f.description)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {cleanUtf8(f.sectorToClean) || 'Todos los Pasajes'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                f.status === 'FINALIZADA'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                              }`}
                            >
                              {f.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-bold text-slate-800">
                              {attendedC} / {totalS} socios
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {pct}% Asistencia
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">
                            S/ {Number(f.fineAmount || 30).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  fetchFaenaDetails(f.id);
                                  setActiveMainSection('EN_VIVO');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-xs flex items-center gap-1 transition"
                                title="Abrir y gestionar toma de asistencia"
                              >
                                <span>Ver / Marcar</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handlePrintFaenaPadron(f)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Imprimir Padrón Oficial A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(f)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                title="Editar datos"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFaena(f.id)}
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

      {/* Modal Nueva Faena (Permite fechas desde enero 2026) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Programar / Cargar Faena Comunal
              </h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFaena} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Faena *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Gran Faena de Baldeo General y Desinfección"
                  value={newFaenaForm.title}
                  onChange={(e) => setNewFaenaForm({ ...newFaenaForm, title: e.target.value })}
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
                    value={newFaenaForm.date}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={newFaenaForm.time}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, time: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sector a Limpiar *</label>
                  <input
                    type="text"
                    required
                    value={newFaenaForm.sectorToClean}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, sectorToClean: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Multa por Falta (S/) *</label>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    required
                    value={newFaenaForm.fineAmount}
                    onChange={(e) => setNewFaenaForm({ ...newFaenaForm, fineAmount: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado Inicial</label>
                <select
                  value={newFaenaForm.status}
                  onChange={(e) => setNewFaenaForm({ ...newFaenaForm, status: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="PROGRAMADA">PROGRAMADA (Por realizarse)</option>
                  <option value="FINALIZADA">FINALIZADA (Faena histórica ya ejecutada)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instrucciones / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Materiales requeridos, escobillones, detergente..."
                  value={newFaenaForm.description}
                  onChange={(e) => setNewFaenaForm({ ...newFaenaForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition"
                >
                  {isCreating ? 'Guardando...' : 'Guardar Faena'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Faena */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-600" />
                Editar Faena de Limpieza
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFaena} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Faena *</label>
                <input
                  type="text"
                  required
                  value={editFaenaForm.title}
                  onChange={(e) => setEditFaenaForm({ ...editFaenaForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
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
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={editFaenaForm.time}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, time: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sector *</label>
                  <input
                    type="text"
                    required
                    value={editFaenaForm.sectorToClean}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, sectorToClean: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Multa (S/) *</label>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    required
                    value={editFaenaForm.fineAmount}
                    onChange={(e) => setEditFaenaForm({ ...editFaenaForm, fineAmount: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado de la Faena</label>
                <select
                  value={editFaenaForm.status}
                  onChange={(e) => setEditFaenaForm({ ...editFaenaForm, status: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instrucciones</label>
                <textarea
                  rows={2}
                  value={editFaenaForm.description}
                  onChange={(e) => setEditFaenaForm({ ...editFaenaForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
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