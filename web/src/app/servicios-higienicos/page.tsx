'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Bath,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Lock,
  Printer,
  FileText,
  X,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  QrCode,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ServiciosHigienicosPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // QR Scanner Modal State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [validatingScan, setValidatingScan] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: any } | null>(null);
  const [sessionTickets, setSessionTickets] = useState<any[]>([]);

  // Form states
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [startNotes, setStartNotes] = useState('');

  // Close form
  const [closeInitialTicket, setCloseInitialTicket] = useState<number | ''>('');
  const [closeFinalTicket, setCloseFinalTicket] = useState<number | ''>('');
  const [closeDeclaredTickets, setCloseDeclaredTickets] = useState<number | ''>('');
  const [closeDiscrepancyReason, setCloseDiscrepancyReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Report state
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // POS Thermal Ticket State
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeSSHHReceipt, setActiveSSHHReceipt] = useState<any>(null);
  const [isPast5PM, setIsPast5PM] = useState(false);

  useEffect(() => {
    const checkHour = () => {
      const hours = new Date().getHours();
      setIsPast5PM(hours >= 17);
    };
    checkHour();
    const interval = setInterval(checkHour, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSSHH = async () => {
    setLoading(true);
    try {
      const [histRes, activeRes, usersRes] = await Promise.all([
        apiRequest('/sanitary-services/history'),
        apiRequest('/sanitary-services/active').catch(() => null),
        apiRequest('/users').catch(() => []),
      ]);
      setHistory(histRes || []);
      setActiveSession(activeRes);
      setUsers(usersRes || []);
      if (usersRes && usersRes.length > 0 && !selectedOperatorId) {
        setSelectedOperatorId(usersRes[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSSHH();
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/sanitary-services/start', {
        method: 'POST',
        body: JSON.stringify({
          date: startDate,
          operatorId: selectedOperatorId || undefined,
          notes: startNotes.trim() || undefined,
        }),
      });
      setIsStartModalOpen(false);
      setStartNotes('');
      fetchSSHH();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCounts = async (urinalDelta = 0, toiletDelta = 0) => {
    if (!activeSession) return;
    try {
      const updated = await apiRequest(`/sanitary-services/${activeSession.id}/counts`, {
        method: 'POST',
        body: JSON.stringify({
          urinalDelta,
          toiletDelta,
        }),
      });
      setActiveSession(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchSessionTickets = async (sessionId: string) => {
    try {
      const res = await apiRequest(`/sanitary-services/${sessionId}/tickets`);
      setSessionTickets(Array.isArray(res) ? res : []);
    } catch (_) {}
  };

  useEffect(() => {
    if (activeSession?.id) {
      fetchSessionTickets(activeSession.id);
    }
  }, [activeSession?.id]);

  const handleIssueEntryTicket = async () => {
    if (!activeSession) return;
    try {
      const res = await apiRequest(`/sanitary-services/${activeSession.id}/issue-ticket`, {
        method: 'POST',
      });
      if (res?.ticket) {
        setActiveSSHHReceipt({
          operationNumber: res.ticket.ticketCode,
          ticketNumber: res.ticket.ticketNumber,
          conceptName: 'Ingreso SSHH - Tarifa Única',
          amount: 0.50,
          paidAt: res.ticket.issuedAt,
          operatorName: activeSession.operator?.fullName || 'Operador de Turno',
          qrCodeData: res.ticket.ticketCode,
        });
        setTicketModalOpen(true);
        if (res.session) {
          setActiveSession((prev: any) => ({
            ...prev,
            urinalCount: res.session.urinalCount,
            totalCollected: res.session.totalCollected,
          }));
        }
        fetchSessionTickets(activeSession.id);
      }
    } catch (err: any) {
      alert(err.message || 'Error al emitir boleto');
    }
  };

  const handleValidateTicket = async (code: string) => {
    if (!code || !code.trim()) return;
    setValidatingScan(true);
    setScanResult(null);
    try {
      const res = await apiRequest('/sanitary-services/validate-ticket', {
        method: 'POST',
        body: JSON.stringify({ ticketCode: code.trim() }),
      });
      setScanResult({
        success: true,
        message: res.message || '✓ INGRESO AUTORIZADO',
        ticket: res.ticket,
      });
      setScanCodeInput('');
      if (activeSession) fetchSessionTickets(activeSession.id);
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Error al validar boleto',
      });
    } finally {
      setValidatingScan(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      await apiRequest(`/sanitary-services/${activeSession.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          initialTicketNumber: closeInitialTicket !== '' ? Number(closeInitialTicket) : undefined,
          finalTicketNumber: closeFinalTicket !== '' ? Number(closeFinalTicket) : undefined,
          declaredTicketCount: closeDeclaredTickets !== '' ? Number(closeDeclaredTickets) : undefined,
          discrepancyReason: closeDiscrepancyReason.trim() || undefined,
          notes: closeNotes.trim() || undefined,
        }),
      });

      setIsCloseModalOpen(false);
      setCloseInitialTicket('');
      setCloseFinalTicket('');
      setCloseDeclaredTickets('');
      setCloseDiscrepancyReason('');
      setCloseNotes('');
      fetchSSHH();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchDailyReport = async (targetDate: string) => {
    setLoadingReport(true);
    try {
      const res = await apiRequest(`/sanitary-services/daily-report?date=${targetDate}`);
      setDailyReportData(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const openReportModal = () => {
    setReportDate(new Date().toISOString().split('T')[0]);
    fetchDailyReport(new Date().toISOString().split('T')[0]);
    setIsReportModalOpen(true);
  };

  const calculatedTickets =
    closeInitialTicket !== '' && closeFinalTicket !== '' && Number(closeFinalTicket) >= Number(closeInitialTicket)
      ? Number(closeFinalTicket) - Number(closeInitialTicket) + 1
      : 0;

  const ticketDiff =
    closeDeclaredTickets !== '' && calculatedTickets > 0 ? Number(closeDeclaredTickets) - calculatedTickets : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Servicios Higiénicos</h1>
          <p className="text-xs text-slate-500">
            Control de sesión diaria, conteo de miccionarios (S/ 0.50) y retretes (S/ 1.00), arqueo de tickets y reporte diario contable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openReportModal}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Reporte Diario Contable</span>
          </button>
          {!activeSession ? (
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir SSHH del Día</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Día y Arqueo</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta 5:00 PM Fin de Turno */}
      {isPast5PM && activeSession && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-sm animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-amber-200 rounded-xl">
              <Clock className="w-5 h-5 text-amber-800" />
            </span>
            <div>
              <p className="text-xs font-black uppercase">Recordatorio de Fin de Turno (5:00 PM)</p>
              <p className="text-xs text-amber-800">
                Es momento de realizar el corte diario. Verifique el último boleto entregado, coteje el efectivo recaudado (S/ {Number(activeSession.totalCollected).toFixed(2)}) y proceda al cierre y entrega de caja.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCloseModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition whitespace-nowrap ml-4"
          >
            Cerrar Día y Arqueo
          </button>
        </div>
      )}

      {/* Active Daily Session Banner */}
      {activeSession ? (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
                  Sesión del Día Activa
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {new Date(activeSession.startTime).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Operador Responsable: {activeSession.operator?.fullName || 'Operador Asignado'}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Apertura: {new Date(activeSession.startTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {activeSession.notes || 'Control Diario de SSHH'}
              </p>
            </div>

            {/* Counters & Quick Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
              {/* Tarifa Única S/ 0.50 - Emisión de Boletos */}
              <div className="bg-emerald-800/60 border border-emerald-700/60 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Tarifa Única: S/ 0.50</p>
                    <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Flat</span>
                  </div>
                  <p className="text-2xl font-black mt-1 text-white">
                    {activeSession.urinalCount + activeSession.toiletCount}{' '}
                    <span className="text-xs font-normal text-slate-300">ingresos</span>
                  </p>
                  <p className="text-xs text-emerald-200 font-mono">
                    S/ {Number(activeSession.totalCollected).toFixed(2)}
                  </p>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleUpdateCounts(1, 0)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-1.5 rounded-lg shadow transition"
                      title="Registrar 1 ingreso rápido"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleUpdateCounts(5, 0)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs py-1.5 rounded-lg shadow transition"
                      title="Registrar 5 ingresos rápidos"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => handleUpdateCounts(10, 0)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs py-1.5 rounded-lg shadow transition"
                      title="Registrar 10 ingresos rápidos"
                    >
                      +10
                    </button>
                  </div>
                  <button
                    onClick={handleIssueEntryTicket}
                    className="w-full bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs py-2 rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Cobrar y Emitir Boleto QR</span>
                  </button>
                </div>
              </div>

              {/* Control de Acceso en Puerta con Escáner QR */}
              <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Control de Acceso</p>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black mt-1 text-white">
                    {sessionTickets.filter((t) => t.isValidated).length}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {sessionTickets.length} validados
                    </span>
                  </p>
                  <p className="text-xs text-slate-300">
                    {sessionTickets.length - sessionTickets.filter((t) => t.isValidated).length} boletos pendientes de uso
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setScanCodeInput('');
                      setIsScannerModalOpen(true);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white border border-slate-600 font-bold text-xs py-2 rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Escanear y Validar QR</span>
                  </button>
                </div>
              </div>

              {/* Total Recaudado */}
              <div className="bg-white text-emerald-950 p-4 rounded-2xl flex flex-col justify-center items-center shadow-lg border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Recaudado Hoy</p>
                <p className="text-3xl font-black text-emerald-800 my-1 font-mono">
                  S/ {Number(activeSession.totalCollected).toFixed(2)}
                </p>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Tarifa Plana S/ 0.50
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Bath className="w-7 h-7" />
          </div>
          <h3 className="font-black text-base text-slate-700 uppercase tracking-tight">No hay sesión de SSHH abierta para hoy</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Abra la sesión del día para iniciar el registro de usos de miccionarios y retretes. El control se realiza de forma consolidada por día.
          </p>
          <button
            onClick={() => setIsStartModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Sesión de SSHH del Día</span>
          </button>
        </div>
      )}

      {/* Historial de Turnos Diarios */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Historial de Sesiones Diarias de SSHH</h3>
          <span className="text-xs text-slate-400 font-bold">{history.length} registro(s)</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Miccionarios (S/ 0.50)</th>
              <th className="py-3 px-4">Retretes (S/ 1.00)</th>
              <th className="py-3 px-4">Total Recaudado</th>
              <th className="py-3 px-4">Boletos Emitidos</th>
              <th className="py-3 px-4">Discrepancia</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Cargando sesiones...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin historial de turnos registrado.</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {new Date(h.startTime).toLocaleDateString('es-PE')}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{h.operator.fullName}</td>
                  <td className="py-3 px-4 font-medium">{h.urinalCount} usos (S/ {Number(h.urinalTotal).toFixed(2)})</td>
                  <td className="py-3 px-4 font-medium">{h.toiletCount} usos (S/ {Number(h.toiletTotal).toFixed(2)})</td>
                  <td className="py-3 px-4 font-black text-emerald-700">S/ {Number(h.totalCollected).toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono">
                    {h.initialTicketNumber && h.finalTicketNumber ? `${h.initialTicketNumber} al ${h.finalTicketNumber}` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {h.ticketDiscrepancy !== 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 flex items-center w-max">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {h.ticketDiscrepancy} tickets
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conforme
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      h.status === 'ABIERTO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Abrir Sesión Diaria */}
      {isStartModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsStartModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">
              Abrir Sesión SSHH del Día
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Apertura consolidada para la recaudación del día en servicios higiénicos.
            </p>

            <form onSubmit={handleStartSession} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha del Día</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operador Responsable</label>
                <select
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones / Notas</label>
                <input
                  type="text"
                  placeholder="Ej: Inicio de operaciones del mercado"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow transition"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cerrar Día y Arqueo de Tickets */}
      {isCloseModalOpen && activeSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">
              Cierre de Día y Arqueo de Tickets
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Conciliación física de boletos vendidos frente al dinero recaudado en el día.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Total a Entregar en Caja</p>
                <p className="text-2xl font-black text-emerald-800 font-mono">
                  S/ {Number(activeSession.totalCollected).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700">
                  {activeSession.urinalCount} micc. • {activeSession.toiletCount} retretes
                </p>
                <p className="text-[10px] text-slate-400">
                  Operador: {activeSession.operator?.fullName}
                </p>
              </div>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Boleto Inicial (#)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 1001"
                    value={closeInitialTicket}
                    onChange={(e) => setCloseInitialTicket(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Boleto Final (#)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 1150"
                    value={closeFinalTicket}
                    onChange={(e) => setCloseFinalTicket(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Boletos Declarados</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Cantidad contada"
                    value={closeDeclaredTickets}
                    onChange={(e) => setCloseDeclaredTickets(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Boletos Calculados</label>
                  <input
                    type="text"
                    readOnly
                    value={calculatedTickets > 0 ? `${calculatedTickets} boletos` : '-'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              {ticketDiff !== 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Discrepancia detectada: {ticketDiff > 0 ? `+${ticketDiff}` : ticketDiff} boleto(s)
                  </p>
                  <label className="font-bold block mt-2 mb-1 text-[11px]">
                    Motivo obligatorio de la discrepancia:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Boletos dañados por humedad o error correlativo"
                    value={closeDiscrepancyReason}
                    onChange={(e) => setCloseDiscrepancyReason(e.target.value)}
                    className="w-full border border-amber-300 rounded-lg p-2 text-xs bg-white"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones Finales</label>
                <input
                  type="text"
                  placeholder="Notas de cierre"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow transition"
                >
                  Confirmar Cierre y Arqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / REPORTE IMPRIMIBLE: Liquidación Diaria Contable */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none print:p-6 print:rounded-none">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase">Reporte Diario de SSHH para Contabilidad</h3>
                  <p className="text-[11px] text-slate-400">Verifique la recaudación del día y proceda con la firma contable</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => {
                    setReportDate(e.target.value);
                    fetchDailyReport(e.target.value);
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            {loadingReport ? (
              <div className="py-12 text-center text-slate-400 text-xs">Generando reporte contable...</div>
            ) : dailyReportData ? (
              <div className="space-y-6">
                {/* Official Letterhead */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                    MERCADO DE ABASTOS MICAELA BASTIDAS
                  </h2>
                  <p className="text-xs font-bold text-emerald-800 tracking-wide uppercase mt-0.5">
                    LIQUIDACIÓN DIARIA DE RECAUDACIÓN — SERVICIOS HIGIÉNICOS
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Fecha de Operación: {new Date(`${dailyReportData.date}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Summary Financial Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Miccionarios (S/ 0.50)</p>
                    <p className="text-lg font-black text-slate-800">{dailyReportData.summary.totalUrinals} usos</p>
                    <p className="text-xs font-bold text-emerald-700 font-mono">S/ {dailyReportData.summary.totalUrinalsAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Retretes (S/ 1.00)</p>
                    <p className="text-lg font-black text-slate-800">{dailyReportData.summary.totalToilets} usos</p>
                    <p className="text-xs font-bold text-emerald-700 font-mono">S/ {dailyReportData.summary.totalToiletsAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Recaudado en Efectivo</p>
                    <p className="text-2xl font-black text-emerald-900 font-mono">
                      S/ {dailyReportData.summary.totalCollected.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold">100% EFECTIVO</p>
                  </div>
                </div>

                {/* Audit & Ticket Control */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px] mb-2">Control de Boletos y Arqueo Físico</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 text-[11px]">Rango de Boletos Emitidos:</p>
                      <p className="font-mono font-bold text-slate-800">{dailyReportData.summary.ticketRange}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[11px]">Discrepancia Total de Boletos:</p>
                      <p className={`font-mono font-bold ${dailyReportData.summary.totalDiscrepancy !== 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {dailyReportData.summary.totalDiscrepancy !== 0 ? `${dailyReportData.summary.totalDiscrepancy} tickets de diferencia` : '0 (Conforme)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Session Table */}
                <div>
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px] mb-2">Detalle de Sesión del Día</h4>
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Operador</th>
                        <th className="p-2.5">Hora Inicio</th>
                        <th className="p-2.5">Hora Cierre</th>
                        <th className="p-2.5">Miccionarios</th>
                        <th className="p-2.5">Retretes</th>
                        <th className="p-2.5 text-right">Total (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyReportData.sessions.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-slate-400">Sin movimientos en esta fecha.</td></tr>
                      ) : (
                        dailyReportData.sessions.map((s: any) => (
                          <tr key={s.id}>
                            <td className="p-2.5 font-bold text-slate-800">{s.operator.fullName}</td>
                            <td className="p-2.5 font-mono">{new Date(s.startTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="p-2.5 font-mono">{s.endTime ? new Date(s.endTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'En curso'}</td>
                            <td className="p-2.5">{s.urinalCount}</td>
                            <td className="p-2.5">{s.toiletCount}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-800 font-mono">S/ {Number(s.totalCollected).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Section */}
                <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                      Operador de SSHH
                    </div>
                    <p className="text-[10px] text-slate-400">Responsable de Recaudación</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                      Tesorería General
                    </div>
                    <p className="text-[10px] text-slate-400">Recepción de Efectivo</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                      Contabilidad / Auditoría
                    </div>
                    <p className="text-[10px] text-slate-400">Verificación y Cierre</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: TICKET TÉRMICO POS SSHH (58mm/80mm) */}
      {ticketModalOpen && activeSSHHReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTicketModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl my-8 border border-slate-100">
            <button
              onClick={() => setTicketModalOpen(false)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 print:hidden p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ticket Térmico Container */}
            <div id="printable-ticket" className="text-center text-xs space-y-1.5 text-slate-900 font-mono">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-12 h-12 mx-auto rounded-full shadow-sm mb-1 object-cover"
              />
              <h2 className="font-black text-xs uppercase tracking-tight">MERCADO DE ABASTOS</h2>
              <p className="font-black text-[11px] text-emerald-800 uppercase">MICAELA BASTIDAS</p>
              <p className="text-[9px] text-slate-500 border-b border-dashed border-slate-400 pb-1.5 uppercase font-bold">
                Control de Servicios Higiénicos
              </p>

              <div className="text-left py-1.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <p><b>Boleto:</b> {activeSSHHReceipt.operationNumber}</p>
                <p><b>Fecha/Hora:</b> {new Date(activeSSHHReceipt.paidAt).toLocaleString('es-PE')}</p>
                <p><b>Concepto:</b> {activeSSHHReceipt.conceptName}</p>
                <p><b>Operador:</b> {activeSSHHReceipt.operatorName}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 flex justify-between items-center text-sm font-black">
                <span>IMPORTE:</span>
                <span className="text-base text-emerald-800">S/ {Number(activeSSHHReceipt.amount).toFixed(2)}</span>
              </div>

              {/* Código QR para validación en puerta */}
              <div className="my-2 p-2 bg-white flex flex-col items-center justify-center border border-slate-200 rounded-lg">
                <QRCodeSVG
                  value={activeSSHHReceipt.operationNumber}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">
                  Acceso SSHH • Pase Único
                </span>
              </div>

              <div className="pt-1.5 text-[9px] text-slate-600 space-y-0.5">
                <p className="font-bold uppercase text-slate-800">Ticket válido para 1 ingreso</p>
                <p className="italic">Presente este QR en la puerta de acceso para ingresar</p>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir POS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCÁNER Y VALIDACIÓN QR DE BOLETOS EN PUERTA */}
      {isScannerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsScannerModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <button
              onClick={() => setIsScannerModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Control de Acceso en Puerta
                </h3>
                <p className="text-xs text-slate-500">
                  Validación instantánea de boletos QR para evitar pérdidas y reusos
                </p>
              </div>
            </div>

            {/* Input Escáner / Lector de Código de Barras */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Escanear Código QR o Ingresar Número de Boleto
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Escanee con lector o escriba (ej. SSHH-2026...)"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleValidateTicket(scanCodeInput);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={validatingScan || !scanCodeInput.trim()}
                  onClick={() => handleValidateTicket(scanCodeInput)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{validatingScan ? 'Validando...' : 'Validar'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Presione Enter en el teclado o gatille la pistola lectora láser para validar automáticamente.
              </p>
            </div>

            {/* Resultado de Validación */}
            {scanResult && (
              <div
                className={`p-4 rounded-2xl mb-4 border transition-all ${
                  scanResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {scanResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-wide">
                      {scanResult.success ? '✓ ACCESO AUTORIZADO' : '✗ ACCESO DENEGADO'}
                    </p>
                    <p className="text-xs font-semibold mt-0.5">{scanResult.message}</p>
                    {scanResult.ticket && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] font-mono grid grid-cols-2 gap-1 text-slate-600">
                        <p><b>Boleto:</b> {scanResult.ticket.ticketCode}</p>
                        <p><b>Tarifa:</b> S/ {Number(scanResult.ticket.amount).toFixed(2)}</p>
                        <p>
                          <b>Emisión:</b>{' '}
                          {new Date(scanResult.ticket.issuedAt).toLocaleTimeString('es-PE')}
                        </p>
                        <p>
                          <b>Validación:</b>{' '}
                          {scanResult.ticket.validatedAt
                            ? new Date(scanResult.ticket.validatedAt).toLocaleTimeString('es-PE')
                            : 'Ahora'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Listado de Últimos Boletos de la Sesión */}
            <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  Boletos Emitidos en Turno ({sessionTickets.length})
                </p>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {sessionTickets.filter((t) => t.isValidated).length} validados
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {sessionTickets.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-3">No hay boletos emitidos aún en este turno.</p>
                ) : (
                  sessionTickets.slice(0, 20).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-xs shadow-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {t.ticketCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(t.issuedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {t.isValidated ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ingresó {new Date(t.validatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Pendiente</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleValidateTicket(t.ticketCode)}
                              className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded hover:bg-slate-800 transition"
                            >
                              Validar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
