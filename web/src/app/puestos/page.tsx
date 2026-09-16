'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { Store, User, CheckCircle2, AlertCircle, Printer, QrCode, X, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PuestosPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [loading, setLoading] = useState(true);

  // Mass QR Carnet Print Modal States
  const [isMassCarnetModalOpen, setIsMassCarnetModalOpen] = useState(false);
  const [massCarnetSectorId, setMassCarnetSectorId] = useState('');

  const fetchStalls = async () => {
    setLoading(true);
    try {
      const [sectorsRes, stallsRes] = await Promise.all([
        apiRequest('/sectors'),
        apiRequest(`/stalls${selectedSector ? '?sectorId=' + selectedSector : ''}`),
      ]);
      setSectors(sectorsRes || []);
      setStalls(stallsRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStalls();
  }, [selectedSector]);

  // Stalls filtered for mass carnet printing (ordenados alfabéticamente por comerciante)
  const massPrintStalls = useMemo(() => {
    return stalls
      .filter((st) => {
        if (massCarnetSectorId && st.sectorId !== massCarnetSectorId) return false;
        return !!st.assignedMerchant; // Only stalls with assigned merchant
      })
      .sort((a, b) => {
        const nameA = `${a.assignedMerchant?.lastName || ''} ${a.assignedMerchant?.firstName || ''}`.trim();
        const nameB = `${b.assignedMerchant?.lastName || ''} ${b.assignedMerchant?.firstName || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
  }, [stalls, massCarnetSectorId]);

  return (
    <div className="space-y-6">
      {/* Estilos específicos para impresión de carnets A4 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-mass-carnets, #printable-mass-carnets * {
              visibility: visible !important;
            }
            #printable-mass-carnets {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 8mm !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .carnet-grid-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `,
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Puestos y Espacios</h1>
          <p className="text-xs text-slate-500">Distribución física por sectores y asignación de comerciantes titulares.</p>
        </div>

        <button
          onClick={() => {
            fetchStalls();
            setMassCarnetSectorId(selectedSector);
            setIsMassCarnetModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>🖨️ Imprimir Carnets QR por Sector (A4)</span>
        </button>
      </div>

      {/* Selector de Sectores */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSector('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            selectedSector === '' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'
          }`}
        >
          Todos los Sectores
        </button>
        {sectors.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSector(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedSector === s.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border hover:bg-slate-50'
            }`}
          >
            {s.name} ({s._count?.stalls || 0})
          </button>
        ))}
      </div>

      {/* Grilla de Puestos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Cargando puestos...</div>
        ) : stalls.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No hay puestos registrados en este sector.</div>
        ) : (
          stalls.map((st) => (
            <div key={st.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-lg text-slate-800">{st.code}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      st.status === 'OCUPADO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-3">{st.sector.name}</p>
                {st.assignedMerchant ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Comerciante Asignado:</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {st.assignedMerchant.lastName}, {st.assignedMerchant.firstName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">DNI: {st.assignedMerchant.dni}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Rubro: {st.assignedMerchant.businessCategory || 'Comercio'}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-700">
                    <p className="font-bold">Puesto Disponible</p>
                    <p className="text-[11px]">Listo para asignar comerciante titular.</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: IMPRESIÓN MASIVA DE CARNETS QR EN HOJA A4 */}
      {isMassCarnetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMassCarnetModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl my-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsMassCarnetModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 print:hidden p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 print:hidden">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  <span>Impresión Masiva de Carnets QR (Formato A4)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Credenciales con QR grande y borde de corte listas para plastificar y colocar en la cabecera de cada puesto.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={massCarnetSectorId}
                  onChange={(e) => setMassCarnetSectorId(e.target.value)}
                  className="py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos los Sectores</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Hojas A4 ({massPrintStalls.length})</span>
                </button>
              </div>
            </div>

            {/* A4 Printable Container */}
            <div id="printable-mass-carnets" className="space-y-6">
              {massPrintStalls.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay comerciantes asignados en este sector para generar carnets.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {massPrintStalls.map((st) => {
                    const m = st.assignedMerchant;
                    const qrVal = m.qrCode || `MB-QR-${m.dni}`;

                    return (
                      <div
                        key={st.id}
                        className="carnet-grid-card border-2 border-dashed border-emerald-600/70 p-4 rounded-2xl bg-white relative flex flex-col justify-between shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                          <div className="flex items-center space-x-2">
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full border border-amber-400/50 object-cover" />
                            <div>
                              <p className="font-black text-[11px] text-slate-900 leading-tight uppercase">Micaela Bastidas</p>
                              <p className="text-[9px] font-bold text-emerald-700 uppercase">Mercado de Abastos</p>
                            </div>
                          </div>
                          <div className="bg-emerald-700 text-white px-3 py-1 rounded-xl text-right">
                            <p className="text-[9px] uppercase font-bold text-emerald-200 leading-tight">PUESTO</p>
                            <p className="text-xl font-black font-mono leading-tight">{st.code}</p>
                          </div>
                        </div>

                        {/* Content Body: Foto Izquierda, Datos Centro, QR Derecha */}
                        <div className="flex items-center gap-3 py-1">
                          {/* Foto del Comerciante */}
                          <div className="flex-shrink-0">
                            {m.photoUrl ? (
                              <img
                                src={m.photoUrl}
                                alt={`${m.lastName}, ${m.firstName}`}
                                className="w-24 h-28 object-cover rounded-xl border-2 border-emerald-600/40 shadow-sm bg-slate-50"
                              />
                            ) : (
                              <div className="w-24 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                                <User className="w-8 h-8 text-slate-300 mb-1" />
                                <span className="text-[9px] font-bold leading-tight">Sin Foto Oficial</span>
                              </div>
                            )}
                          </div>

                          {/* Merchant Details */}
                          <div className="text-xs space-y-1 flex-1 min-w-0">
                            <div>
                              <p className="text-[9px] font-bold uppercase text-slate-400">Titular del Puesto</p>
                              <p className="font-black text-slate-900 text-sm truncate leading-snug">
                                {m.lastName}, {m.firstName}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[11px] pt-0.5">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">DNI</span>
                                <span className="font-mono font-bold text-slate-800">{m.dni}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Sector</span>
                                <span className="font-bold text-emerald-800 truncate block">{st.sector.name}</span>
                              </div>
                            </div>

                            <div className="pt-0.5">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block">Rubro / Condición</span>
                              <span className="font-semibold text-slate-700 block truncate text-[11px]">
                                {m.businessCategory || 'Comercio General'} • {m.merchantType?.name || 'Socio'}
                              </span>
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="p-2 border-2 border-emerald-600/40 rounded-xl bg-slate-50 flex-shrink-0 flex flex-col items-center justify-center">
                            <QRCodeSVG value={qrVal} size={100} level="H" includeMargin={false} />
                            <p className="text-[8px] font-mono text-center text-slate-500 mt-1 font-black uppercase">
                              Escanear QR
                            </p>
                          </div>
                        </div>

                        {/* Footer / Instructions */}
                        <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
                          <span>Credencial para plastificar y fijar en cabecera</span>
                          <span className="font-mono font-bold text-emerald-700">QR Oficial 2026</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setIsMassCarnetModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hojas A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
