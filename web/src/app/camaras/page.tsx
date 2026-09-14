'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Video,
  Camera,
  Maximize2,
  Minimize2,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Grid,
  Settings,
  Tv,
  Power,
  Sliders,
  ShieldCheck,
  Disc,
} from 'lucide-react';

interface CameraItem {
  id: string;
  name: string;
  location: string;
  deviceId?: string | null;
  streamUrl?: string | null;
  streamType: string;
  resolution: string;
  isActive: boolean;
  notes?: string | null;
}

export default function CamarasPage() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedDevices, setConnectedDevices] = useState<MediaDeviceInfo[]>([]);
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3 | 4>(2);
  const [fullscreenCamId, setFullscreenCamId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    deviceId: '',
    streamUrl: '',
    streamType: 'LOCAL_USB',
    resolution: 'HD_720P',
    isActive: true,
    notes: '',
  });

  // Snapshot flash state
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);

  // Fetch registered cameras
  const fetchCameras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/cameras');
      setCameras(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Enumerate computer video devices
  const detectLocalDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      // Solicitar permiso inicial para obtener etiquetas legibles de las cámaras
      await navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setConnectedDevices(videoInputs);
    } catch (e) {
      console.warn('Dispositivos de video no accesibles:', e);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    detectLocalDevices();
  }, [fetchCameras, detectLocalDevices]);

  // Form handlers
  const handleOpenCreateModal = () => {
    setEditingCamera(null);
    setFormData({
      name: `Cámara ${String(cameras.length + 1).padStart(2, '0')} - `,
      location: '',
      deviceId: connectedDevices[0]?.deviceId || '',
      streamUrl: '',
      streamType: 'LOCAL_USB',
      resolution: 'HD_720P',
      isActive: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cam: CameraItem) => {
    setEditingCamera(cam);
    setFormData({
      name: cam.name,
      location: cam.location,
      deviceId: cam.deviceId || '',
      streamUrl: cam.streamUrl || '',
      streamType: cam.streamType,
      resolution: cam.resolution,
      isActive: cam.isActive,
      notes: cam.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await apiRequest(`/cameras/${editingCamera.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/cameras', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la cámara');
    }
  };

  const handleDeleteCamera = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar la "${name}"?`)) return;
    try {
      await apiRequest(`/cameras/${id}`, { method: 'DELETE' });
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiRequest(`/cameras/${id}/toggle`, { method: 'PATCH' });
      fetchCameras();
    } catch (err: any) {
      alert(err.message || 'Error al alternar estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              Control de Cámaras de Seguridad (CCTV)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de puertas de acceso, pasajes comerciales, servicios higiénicos y caja central.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grid selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setGridColumns(1)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                gridColumns === 1 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Vista 1x1 (Individual)"
            >
              1x1
            </button>
            <button
              onClick={() => setGridColumns(2)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                gridColumns === 2 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Cuadrícula 2x2 (4 Cámaras)"
            >
              2x2
            </button>
            <button
              onClick={() => setGridColumns(3)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                gridColumns === 3 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Cuadrícula 3x3 (9 Cámaras)"
            >
              3x3
            </button>
            <button
              onClick={() => setGridColumns(4)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                gridColumns === 4 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Cuadrícula 4x4 (16 Cámaras)"
            >
              4x4
            </button>
          </div>

          <button
            onClick={detectLocalDevices}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
            title="Escanear dispositivos de video conectados"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Dispositivos ({connectedDevices.length})</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Cámara</span>
          </button>
        </div>
      </div>

      {/* Snapshot Feedback Toast */}
      {snapshotFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{snapshotFeedback}</span>
        </div>
      )}

      {/* Cameras Monitor Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-bold">Cargando canales de video CCTV...</p>
        </div>
      ) : cameras.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-6">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-black text-slate-700 uppercase">No hay cámaras registradas</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Registre las cámaras conectadas a la computadora o transmisiones RTSP para iniciar el monitoreo.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
          >
            Registrar Primera Cámara
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            gridColumns === 1
              ? 'grid-cols-1 max-w-4xl mx-auto'
              : gridColumns === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : gridColumns === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {cameras.map((cam, idx) => (
            <CameraStreamCard
              key={cam.id}
              camera={cam}
              channelIndex={idx + 1}
              connectedDevices={connectedDevices}
              onEdit={() => handleOpenEditModal(cam)}
              onDelete={() => handleDeleteCamera(cam.id, cam.name)}
              onToggle={() => handleToggleActive(cam.id)}
              onSnapshot={(msg) => {
                setSnapshotFeedback(msg);
                setTimeout(() => setSnapshotFeedback(null), 3500);
              }}
              onFullscreen={() => setFullscreenCamId(cam.id)}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Modal View */}
      {fullscreenCamId && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col p-4">
          <div className="flex justify-between items-center text-white pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
              <h3 className="text-sm font-black uppercase tracking-wider">
                {cameras.find((c) => c.id === fullscreenCamId)?.name} • PANTALLA COMPLETA
              </h3>
            </div>
            <button
              onClick={() => setFullscreenCamId(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {(() => {
              const cam = cameras.find((c) => c.id === fullscreenCamId);
              if (!cam) return null;
              return (
                <div className="w-full h-full max-w-6xl max-h-[85vh]">
                  <CameraStreamCard
                    camera={cam}
                    channelIndex={cameras.indexOf(cam) + 1}
                    connectedDevices={connectedDevices}
                    isFullscreen
                    onEdit={() => handleOpenEditModal(cam)}
                    onDelete={() => handleDeleteCamera(cam.id, cam.name)}
                    onToggle={() => handleToggleActive(cam.id)}
                    onSnapshot={(msg) => {
                      setSnapshotFeedback(msg);
                      setTimeout(() => setSnapshotFeedback(null), 3500);
                    }}
                    onFullscreen={() => setFullscreenCamId(null)}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR CÁMARA */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {editingCamera ? 'Modificar Parámetros de Cámara' : 'Registrar Nueva Cámara de Seguridad'}
                </h3>
                <p className="text-xs text-slate-500">Configuración de fuente de video conectada o IP</p>
              </div>
            </div>

            <form onSubmit={handleSaveCamera} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre / Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cámara 05 - Puerta de Descarga"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ubicación / Sector en el Mercado</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pasaje Verduras / Cabecera Puesto V-01"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Transmisión</label>
                  <select
                    value={formData.streamType}
                    onChange={(e) => setFormData({ ...formData, streamType: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="LOCAL_USB">Cámara Conectada (USB / Webcam)</option>
                    <option value="RTSP">Transmisión RTSP (Cámara IP)</option>
                    <option value="MJPEG">Flujo MJPEG / HTTP</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Resolución</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="HD_720P">HD (1280x720)</option>
                    <option value="HD_1080P">Full HD (1920x1080)</option>
                    <option value="VGA_480P">VGA (640x480)</option>
                  </select>
                </div>
              </div>

              {formData.streamType === 'LOCAL_USB' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Dispositivo de Video Local Conectado ({connectedDevices.length})
                  </label>
                  {connectedDevices.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                      No se detectaron dispositivos de video locales en el navegador o se requiere conceder permisos de cámara.
                    </div>
                  ) : (
                    <select
                      value={formData.deviceId}
                      onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-700"
                    >
                      <option value="">-- Dispositivo Predeterminado --</option>
                      {connectedDevices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Cámara USB ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">URL de Streaming (RTSP/HTTP)</label>
                  <input
                    type="text"
                    placeholder="rtsp://admin:pass@192.168.1.120:554/ch1"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Cámara con visión nocturna infrarroja"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCam"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <label htmlFor="isActiveCam" className="font-bold text-slate-700">
                  Cámara Habilitada para Monitoreo Activo
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow transition"
                >
                  {editingCamera ? 'Actualizar Cámara' : 'Guardar Cámara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Componente de Tarjeta de Transmisión de Cámara Individual
// ----------------------------------------------------
function CameraStreamCard({
  camera,
  channelIndex,
  connectedDevices,
  isFullscreen = false,
  onEdit,
  onDelete,
  onToggle,
  onSnapshot,
  onFullscreen,
}: {
  camera: CameraItem;
  channelIndex: number;
  connectedDevices: MediaDeviceInfo[];
  isFullscreen?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onSnapshot: (msg: string) => void;
  onFullscreen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Live timestamp overlay
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().slice(0, 10) +
          ' ' +
          now.toLocaleTimeString('es-PE', { hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebRTC Stream from Local Device
  useEffect(() => {
    let localStream: MediaStream | null = null;

    const startLocalStream = async () => {
      if (!camera.isActive || camera.streamType !== 'LOCAL_USB') return;
      try {
        const constraints: MediaStreamConstraints = {
          video: camera.deviceId
            ? { deviceId: { exact: camera.deviceId } }
            : { facingMode: 'user' },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setStreamActive(true);
        }
      } catch (err) {
        // Si el dispositivo exacto no está disponible, intentar cualquier dispositivo de video
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          localStream = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
            setStreamActive(true);
          }
        } catch (_) {
          setStreamActive(false);
        }
      }
    };

    startLocalStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [camera.isActive, camera.deviceId, camera.streamType]);

  // Snapshot capture with timestamp watermark
  const captureSnapshot = () => {
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (videoRef.current && streamActive) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback synthetic security snapshot
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('MERCADO MICAELA BASTIDAS - SISTEMA CCTV', 50, 100);
      }

      // Security watermark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(
        `${camera.name.toUpperCase()} • ${camera.location.toUpperCase()}`,
        30,
        canvas.height - 38
      );

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(currentTime, canvas.width - 240, canvas.height - 38);

      // Download
      const link = document.createElement('a');
      link.download = `cctv-snapshot-${camera.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();

      onSnapshot(`✓ Instantánea capturada y guardada: ${camera.name}`);
    } catch (e) {
      alert('Error al capturar instantánea');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex flex-col justify-between group transition-all ${
        isFullscreen ? 'w-full h-full' : 'aspect-video'
      }`}
    >
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
      />

      {/* Synthetic surveillance radar when physical camera is offline / waiting */}
      {!streamActive && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden p-6 text-center select-none">
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>

          <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500/30 flex items-center justify-center mb-3 animate-pulse">
            <Disc className="w-8 h-8 text-emerald-400/80 animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <p className="font-mono text-xs font-black text-emerald-400 tracking-wider uppercase">
            CANAL {channelIndex} • {camera.name}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{camera.location}</p>

          <span className="mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
            {camera.isActive ? 'Señal en Espera / Transmisión Lista' : 'Canal Desactivado'}
          </span>
        </div>
      )}

      {/* Top Overlay: Camera Details & Status */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex justify-between items-start text-white pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                camera.isActive ? 'bg-rose-400' : 'bg-slate-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                camera.isActive ? 'bg-rose-500' : 'bg-slate-500'
              }`}
            ></span>
          </span>
          <div>
            <p className="font-mono font-black text-xs uppercase tracking-tight text-white drop-shadow">
              CAM {String(channelIndex).padStart(2, '0')} • {camera.name}
            </p>
            <p className="text-[10px] text-slate-300 font-mono leading-none drop-shadow">
              {camera.location}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-right font-mono text-[11px] text-emerald-400 font-bold drop-shadow">
          {currentTime}
        </div>
      </div>

      {/* Bottom Overlay: Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-center opacity-90 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
          <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
            {camera.resolution}
          </span>
          <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
            {camera.streamType}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Captura Instantánea */}
          <button
            onClick={captureSnapshot}
            disabled={isCapturing}
            title="Tomar fotografía de seguridad (Snapshot)"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Alternar Activa */}
          <button
            onClick={onToggle}
            title={camera.isActive ? 'Desactivar cámara' : 'Activar cámara'}
            className={`p-1.5 rounded-lg border transition ${
              camera.isActive
                ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          {/* Editar Configuración */}
          <button
            onClick={onEdit}
            title="Editar parámetros"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onFullscreen}
            title="Ver pantalla completa"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Eliminar */}
          <button
            onClick={onDelete}
            title="Eliminar cámara"
            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
