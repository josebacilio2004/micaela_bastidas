'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Upload,
  Download,
  Wifi,
  Laptop,
  Building,
  ArrowRightLeft,
  FileCheck,
  Database,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';

export default function SincronizacionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'RED' | 'PAQUETE' | 'MOVILES'>('RED');

  // Direct Network Sync State
  const [remoteServerUrl, setRemoteServerUrl] = useState<string>('http://192.168.1.100');
  const [isSyncingDirect, setIsSyncingDirect] = useState(false);
  const [syncDirectReport, setSyncDirectReport] = useState<any>(null);
  const [directSyncDirection, setDirectSyncDirection] = useState<'TO_MARKET' | 'FROM_MARKET'>('TO_MARKET');

  // Package Export / Import State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchSyncStatus = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/sync/status');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    // Load last used market server IP from localStorage if available
    const savedIp = localStorage.getItem('mb_market_server_ip');
    if (savedIp) setRemoteServerUrl(savedIp);
  }, []);

  // 1. Export Package (.mbdata)
  const handleExportPackage = async () => {
    setIsExporting(true);
    try {
      const pkg = await apiRequest('/sync/export-package');
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const a = document.createElement('a');
      a.href = url;
      a.download = `micaela_sync_${nowStr}.mbdata`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✓ Paquete contable exportado exitosamente:\n\n• Comerciantes: ${pkg.counts?.merchants || 0}\n• Contratos Alquiler: ${pkg.counts?.rentalContracts || 0}\n• Cuotas: ${pkg.counts?.rentalInstallments || 0}\n• Pagos Oficiales: ${pkg.counts?.payments || 0}\n• Gastos: ${pkg.counts?.expenses || 0}\n• Créditos: ${pkg.counts?.loans || 0}\n\nGuarda este archivo para transferirlo a la máquina del mercado.`);
    } catch (err: any) {
      alert('Error al exportar paquete contable: ' + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Import Package (.mbdata)
  const handleImportPackage = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo .mbdata para importar.');
      return;
    }

    setIsImporting(true);
    setImportReport(null);
    try {
      const fileText = await selectedFile.text();
      const pkg = JSON.parse(fileText);

      const res = await apiRequest('/sync/import-package', {
        method: 'POST',
        body: JSON.stringify(pkg),
      });

      setImportReport(res);
      alert(`✓ ¡Migración de datos completada exitosamente!\n\n• Pagos nuevos registrados: ${res.stats?.paymentsCreated || 0}\n• Pagos ya existentes conservados: ${res.stats?.paymentsExisting || 0}\n• Cuotas de alquiler actualizadas: ${res.stats?.installmentsUpdated || 0}\n• Gastos migrados: ${res.stats?.expensesUpserted || 0}`);
      setSelectedFile(null);
      await fetchSyncStatus();
    } catch (err: any) {
      alert('Error al importar el paquete: ' + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  // 3. Direct Network Migration (Laptop -> Mercado or Mercado -> Laptop)
  const handleDirectNetworkSync = async () => {
    const cleanUrl = remoteServerUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      alert('Por favor ingresa la dirección IP de la máquina del mercado (ej. http://192.168.1.100)');
      return;
    }

    localStorage.setItem('mb_market_server_ip', cleanUrl);
    setIsSyncingDirect(true);
    setSyncDirectReport(null);

    try {
      if (directSyncDirection === 'TO_MARKET') {
        // Laptop -> Mercado:
        // 1. Obtener paquete contable de ESTA máquina (laptop)
        const localPackage = await apiRequest('/sync/export-package');

        // 2. Enviar a la máquina del mercado vía HTTP directo
        const token = localStorage.getItem('access_token') || '';
        const targetEndpoint = `${cleanUrl}/api/sync/import-package`;

        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(localPackage),
        });

        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.message || `Error ${response.status}: No se pudo comunicar con el servidor en ${cleanUrl}`);
        }

        const result = await response.json();
        setSyncDirectReport(result);
        alert(`✓ ¡MIGRACIÓN DIRECTA EXITOSA HACIA LA MÁQUINA DEL MERCADO!\n\n• Servidor Remoto: ${cleanUrl}\n• Pagos transferidos: ${result.stats?.paymentsCreated || 0}\n• Cuotas de alquiler sincronizadas: ${result.stats?.installmentsUpdated || 0}\n• Gastos migrados: ${result.stats?.expensesUpserted || 0}\n\nLa base de datos del mercado está 100% actualizada con los datos de tu laptop.`);
      } else {
        // Mercado -> Laptop:
        // 1. Obtener paquete contable de la máquina del mercado
        const token = localStorage.getItem('access_token') || '';
        const targetEndpoint = `${cleanUrl}/api/sync/export-package`;

        const response = await fetch(targetEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudo descargar datos desde ${cleanUrl}`);
        }

        const remotePackage = await response.json();

        // 2. Importar en ESTA máquina local
        const result = await apiRequest('/sync/import-package', {
          method: 'POST',
          body: JSON.stringify(remotePackage),
        });

        setSyncDirectReport(result);
        alert(`✓ ¡DATOS DESCARGADOS EXITOSAMENTE A TU LAPTOP!\n\n• Pagos incorporados: ${result.stats?.paymentsCreated || 0}\n• Cuotas sincronizadas: ${result.stats?.installmentsUpdated || 0}\n\nTu laptop ahora tiene todos los cobros recientes realizados en el mercado.`);
      }

      await fetchSyncStatus();
    } catch (err: any) {
      alert(`Error en la sincronización por red:\n\n${err.message}\n\nAsegúrate de que ambas máquinas estén conectadas al mismo Wi-Fi del mercado y que la IP sea correcta.`);
    } finally {
      setIsSyncingDirect(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-emerald-600" />
            Centro de Sincronización y Migración
          </h1>
          <p className="text-xs text-slate-500">
            Sincronización integral y migración inteligente: <b>Laptop de Contadora ⇄ Servidor Central del Mercado</b>.
          </p>
        </div>
        <button
          onClick={fetchSyncStatus}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar Estado</span>
        </button>
      </div>

      {/* Tabs Principales */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('RED')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
            activeTab === 'RED'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>Sincronización Directa por Red (Wi-Fi / LAN)</span>
        </button>

        <button
          onClick={() => setActiveTab('PAQUETE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
            activeTab === 'PAQUETE'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Paquete de Datos Offline (.mbdata / USB)</span>
        </button>

        <button
          onClick={() => setActiveTab('MOVILES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
            activeTab === 'MOVILES'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Terminales Android (Cobradores Móviles)</span>
        </button>
      </div>

      {/* PESTAÑA 1: SINCRONIZACIÓN DIRECTA POR RED */}
      {activeTab === 'RED' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-black uppercase">
                  Conexión Simultánea de Red
                </span>
                <h2 className="text-lg font-black text-slate-800">
                  Migración con 1 Clic entre Laptop y Servidor del Mercado
                </h2>
                <p className="text-xs text-slate-500">
                  Ideal para cuando la contadora llega al mercado con su laptop o ambas máquinas están en la misma red Wi-Fi / VPN.
                </p>
              </div>

              {/* Selector de Dirección */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDirectSyncDirection('TO_MARKET')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    directSyncDirection === 'TO_MARKET'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Laptop → Mercado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirectSyncDirection('FROM_MARKET')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    directSyncDirection === 'FROM_MARKET'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Mercado → Laptop</span>
                </button>
              </div>
            </div>

            {/* Configuración de IP Remota */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  Dirección IP de la Máquina del Mercado (o Servidor Central):
                </label>
                <input
                  type="text"
                  value={remoteServerUrl}
                  onChange={(e) => setRemoteServerUrl(e.target.value)}
                  placeholder="Ej. http://192.168.1.100 o http://100.x.x.x (Tailscale)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400">
                  Ingresa la IP local que tiene la computadora fija del mercado en el router Wi-Fi.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleDirectNetworkSync}
                  disabled={isSyncingDirect}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSyncingDirect ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : directSyncDirection === 'TO_MARKET' ? (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Migrar Datos a Máquina Mercado</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Traer Cobros a mi Laptop</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Reporte de Resultados */}
            {syncDirectReport && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resultado de la Migración Directa:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pagos Creados:</span>
                    <span className="font-mono font-black text-emerald-700">{syncDirectReport.stats?.paymentsCreated || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cuotas Actualizadas:</span>
                    <span className="font-mono font-black text-emerald-700">{syncDirectReport.stats?.installmentsUpdated || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Gastos Migrados:</span>
                    <span className="font-mono font-black text-emerald-700">{syncDirectReport.stats?.expensesUpserted || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pagos Ya Existentes:</span>
                    <span className="font-mono font-black text-slate-600">{syncDirectReport.stats?.paymentsExisting || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Guía para la Contadora */}
          <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-3xl p-6 text-white space-y-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm uppercase tracking-wide">
                Protocolo Recomendado para la Contadora
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
              <div className="bg-white/10 p-4 rounded-2xl space-y-1.5 border border-white/10">
                <span className="font-black text-emerald-400 text-sm block">Paso 1: Trabajo en Laptop</span>
                <p>Ingresa contratos, pagos de alquileres, recibos de agua, gastos y créditos en tu laptop con total normalidad desde tu casa o tu oficina.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl space-y-1.5 border border-white/10">
                <span className="font-black text-emerald-400 text-sm block">Paso 2: Conexión al Mercado</span>
                <p>Al llegar al mercado y conectarte al Wi-Fi del mercado, abre esta ventana de Sincronización y presiona <b>"Migrar Datos a Máquina Mercado"</b>.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl space-y-1.5 border border-white/10">
                <span className="font-black text-emerald-400 text-sm block">Paso 3: Fusión Inteligente</span>
                <p>El sistema fusiona tus datos automáticamente sin duplicar recibos ni borrar los cobros que los cobradores hicieron por celular durante el día.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: PAQUETE DE DATOS OFFLINE (.MBDATA) */}
      {activeTab === 'PAQUETE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exportar Paquete */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase">1. Exportar desde Laptop</h3>
                  <p className="text-[11px] text-slate-500">Genera un paquete contable descargable con todos los datos al día.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Utiliza esta opción cuando termines tu jornada en tu laptop y quieras transferir los datos al mercado sin estar en la misma red. El archivo generado se puede enviar por WhatsApp, correo o llevar en un USB.
              </p>

              <button
                type="button"
                onClick={handleExportPackage}
                disabled={isExporting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generando Paquete...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar Paquete Contable (.mbdata)</span>
                  </>
                )}
              </button>
            </div>

            {/* Importar Paquete */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase">2. Importar en Máquina Mercado</h3>
                  <p className="text-[11px] text-slate-500">Carga el archivo .mbdata de la contadora en la base de datos central.</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center space-y-2 bg-slate-50">
                <input
                  type="file"
                  accept=".mbdata,.json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-xs font-bold text-emerald-800">
                    Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleImportPackage}
                disabled={!selectedFile || isImporting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importando y Fusionando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Importar y Fusionar en la Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Reporte de Importación */}
          {importReport && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resultado de la Importación del Paquete:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pagos Incorporados:</span>
                  <span className="font-mono font-black text-emerald-700">{importReport.stats?.paymentsCreated || 0}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cuotas Actualizadas:</span>
                  <span className="font-mono font-black text-emerald-700">{importReport.stats?.installmentsUpdated || 0}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Gastos Incorporados:</span>
                  <span className="font-mono font-black text-emerald-700">{importReport.stats?.expensesUpserted || 0}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pagos Ya Existentes:</span>
                  <span className="font-mono font-black text-slate-600">{importReport.stats?.paymentsExisting || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: TERMINALES MÓVILES DE COBRADORES */}
      {activeTab === 'MOVILES' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Terminales Móviles Vinculadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-8 text-slate-400">Consultando dispositivos...</div>
              ) : !data?.devices || data.devices.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-400">No hay dispositivos móviles registrados aún.</div>
              ) : (
                data.devices.map((d: any) => (
                  <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">{d.name}</h3>
                          <p className="text-[11px] font-mono text-slate-400">{d.deviceId}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Usuario Asignado:</span>
                        <p className="font-semibold text-slate-700">{d.user?.fullName || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Sistema y Versión:</span>
                        <p className="font-semibold text-slate-700">{d.os} • v{d.appVersion}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Último Enlace / Sincronización:</span>
                        <p className="font-mono text-emerald-700 font-bold">
                          {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString('es-PE') : 'Nunca sincronizado'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Lotes de Sincronización Procesados</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Dispositivo</th>
                  <th className="py-3 px-4">Operaciones en Lote</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.recentBatches || data.recentBatches.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin lotes recientes registrados.</td></tr>
                ) : (
                  data.recentBatches.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{new Date(b.startedAt).toLocaleString('es-PE')}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{b.device?.name || 'Móvil'}</td>
                      <td className="py-3 px-4 font-bold">{b.operationsCount} transacciones procesadas</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
