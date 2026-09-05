'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Calendar, Users, CheckCircle2, UserCheck, Plus, X, Search, QrCode } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function ReunionesPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [meetingDetail, setMeetingDetail] = useState<any>(null);
  const [quorum, setQuorum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualQr, setManualQr] = useState('');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/meetings');
      setMeetings(res);
      if (res.length > 0 && !selectedMeetingId) {
        setSelectedMeetingId(res[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingData = async (id: string) => {
    if (!id) return;
    try {
      const [detail, q] = await Promise.all([
        apiRequest(`/meetings/${id}`),
        apiRequest(`/meetings/${id}/quorum`),
      ]);
      setMeetingDetail(detail);
      setQuorum(q);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (selectedMeetingId) {
      fetchMeetingData(selectedMeetingId);
    }
  }, [selectedMeetingId]);

  const handleRegisterManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQr.trim() || !selectedMeetingId) return;
    try {
      const idempotencyKey = 'att-web-' + Date.now();
      await apiRequest(`/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          merchantIdentifier: manualQr.trim(),
          idempotencyKey,
        }),
      });
      setManualQr('');
      fetchMeetingData(selectedMeetingId);
    } catch (err: any) {
      alert(err.message || 'Error al registrar asistencia');
    }
  };

  const pieData = quorum
    ? [
        { name: 'Presentes', value: quorum.attendedCount, color: '#059669' },
        { name: 'Ausentes', value: quorum.absentCount, color: '#cbd5e1' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Reuniones y Asistencia</h1>
          <p className="text-xs text-slate-500">Control de asistencia por QR en Asambleas Generales y quórum oficial de socios titulares.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {meetings.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMeetingId(m.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedMeetingId === m.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m.title} ({new Date(m.date).toLocaleDateString('es-PE')})
          </button>
        ))}
      </div>

      {meetingDetail && quorum && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {meetingDetail.status}
              </span>
              <h2 className="text-lg font-black text-slate-800 mt-2">{meetingDetail.title}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Lugar: {meetingDetail.location} • Hora: {meetingDetail.time}
              </p>
            </div>

            <div className="h-44 flex items-center justify-center my-3">
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

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Socios Presentes:</span>
                <span className="font-bold text-emerald-700">{quorum.attendedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Socios Ausentes:</span>
                <span className="font-bold text-slate-600">{quorum.absentCount}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-black">
                <span>Quórum:</span>
                <span className={quorum.hasQuorum ? 'text-emerald-700' : 'text-amber-600'}>
                  {quorum.quorumPercentage}% {quorum.hasQuorum ? '(CON QUÓRUM)' : '(SIN QUÓRUM)'}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                <QrCode className="w-4 h-4 text-emerald-600 mr-2" />
                Escanear / Registrar Asistencia de Socio
              </h3>
              <form onSubmit={handleRegisterManualAttendance} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Escanee QR o ingrese DNI / Código del Socio..."
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
                >
                  Registrar Asistencia
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">
                  Lista de Socios que Asistieron ({meetingDetail.attendances?.length || 0})
                </h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Socio Titular</th>
                    <th className="py-3 px-4">DNI</th>
                    <th className="py-3 px-4">Puesto</th>
                    <th className="py-3 px-4">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!meetingDetail.attendances || meetingDetail.attendances.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">Aún no se registran asistencias para esta reunión.</td></tr>
                  ) : (
                    meetingDetail.attendances.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {new Date(att.scannedAt).toLocaleTimeString('es-PE')}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {att.merchant?.lastName}, {att.merchant?.firstName}
                        </td>
                        <td className="py-3 px-4 font-mono">{att.dni}</td>
                        <td className="py-3 px-4 font-bold">{att.merchant?.stall?.code || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{att.registeredBy?.fullName || 'Terminal'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
