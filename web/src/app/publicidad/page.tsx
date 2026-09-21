'use client';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Megaphone,
  Radio,
  Play,
  Pause,
  Plus,
  Volume2,
  Clock,
  Calendar,
  Sparkles,
  Bot,
  DollarSign,
  Upload,
  CheckCircle2,
  ShieldAlert,
  Printer,
  FileText,
  FileCheck2,
  Pencil,
  Trash2,
  X,
  Layers,
} from 'lucide-react';

export default function PublicidadPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SPOTS' | 'GUIONES' | 'JARVIS' | 'TARIFAS'>('SPOTS');

  // Reproductor en vivo
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // JARVIS Text-to-Speech State
  const [jarvisText, setJarvisText] = useState('');
  const [jarvisAdvertiser, setJarvisAdvertiser] = useState('');
  const [jarvisTitle, setJarvisTitle] = useState('');
  const [jarvisAmount, setJarvisAmount] = useState(5.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jarvisStatus, setJarvisStatus] = useState<string | null>(null);

  // Modal nueva publicidad
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdForm, setNewAdForm] = useState({
    title: '',
    advertiserName: '',
    type: 'PERIFONEO_AUDIO',
    rateId: '',
    conceptCode: 'PUBLICIDAD_PERIFONEO',
    amount: 10.0,
    textScript: '',
    audioUrl: '',
    playbackTimes: ['09:00', '12:00', '16:00'],
  });

  // Modal nuevo guión
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [scriptForm, setScriptForm] = useState({
    title: '',
    category: 'ASAMBLEA',
    content: '',
    estimatedDurationSeconds: 30,
  });

  // Ticket para imprimir
  const [printTicketData, setPrintTicketData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adsRes, scriptsRes, ratesRes] = await Promise.all([
        apiRequest('/advertising'),
        apiRequest('/advertising/scripts'),
        apiRequest('/rates'),
      ]);
      setAds(adsRes || []);
      setScripts(scriptsRes || []);

      // Filtrar tarifas de publicidad
      const pubRates = (ratesRes || []).filter(
        (r: any) => r.concept?.code?.includes('PUBLICIDAD') || r.concept?.code?.includes('PERIFONEO'),
      );
      setRates(pubRates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlayAudio = (url: string, id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(console.error);
        setPlayingId(id);
      }
    }
  };

  // JARVIS Speech Synthesis
  const speakWithJarvis = (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-MX';
      utterance.rate = 0.95;
      utterance.pitch = 0.92;

      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang.includes('es-MX') || v.lang.includes('es-ES') || v.lang.includes('es'));
      if (esVoice) utterance.voice = esVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setJarvisStatus('✓ Transmitiendo anuncio con el sintetizador neuronal de J.A.R.V.I.S');
    } else {
      alert('Tu navegador no soporta síntesis de voz Web Speech API');
    }
  };

  const handleSelectScriptTemplate = (script: any) => {
    setNewAdForm((prev) => ({
      ...prev,
      title: script.title,
      textScript: script.content,
    }));
    setIsModalOpen(true);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/advertising', {
        method: 'POST',
        body: JSON.stringify(newAdForm),
      });

      setIsModalOpen(false);
      setNewAdForm({
        title: '',
        advertiserName: '',
        type: 'PERIFONEO_AUDIO',
        rateId: '',
        conceptCode: 'PUBLICIDAD_PERIFONEO',
        amount: 10.0,
        textScript: '',
        audioUrl: '',
        playbackTimes: ['09:00', '12:00', '16:00'],
      });

      await fetchData();

      // Abrir ticket automáticamente
      if (res?.ticket) {
        setPrintTicketData(res.ticket);
      } else {
        alert('✓ Publicidad registrada exitosamente');
      }
    } catch (e: any) {
      alert('Error al registrar publicidad: ' + e.message);
    }
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/advertising/scripts', {
        method: 'POST',
        body: JSON.stringify(scriptForm),
      });
      setIsScriptModalOpen(false);
      setScriptForm({
        title: '',
        category: 'ASAMBLEA',
        content: '',
        estimatedDurationSeconds: 30,
      });
      const scriptsRes = await apiRequest('/advertising/scripts');
      setScripts(scriptsRes || []);
      alert('✓ Guión pre-escrito guardado en la biblioteca');
    } catch (e: any) {
      alert('Error al guardar guión: ' + e.message);
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este guión?')) return;
    try {
      await apiRequest(`/advertising/scripts/${id}`, { method: 'DELETE' });
      const scriptsRes = await apiRequest('/advertising/scripts');
      setScripts(scriptsRes || []);
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const handleToggleStatus = async (ad: any) => {
    const nextStatus = ad.status === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';
    try {
      await apiRequest(`/advertising/${ad.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchData();
    } catch (e) {
      alert('Error al cambiar estado');
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta publicidad?')) return;
    try {
      await apiRequest(`/advertising/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const handlePrintExistingTicket = async (adId: string) => {
    try {
      const ticket = await apiRequest(`/advertising/${adId}/ticket`);
      setPrintTicketData(ticket);
    } catch (e) {
      alert('Error al cargar ticket');
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <span>Publicidad, Perifoneo & J.A.R.V.I.S</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Voz Neuronal Activa
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Control de spots de audio en altavoces, guiones pre-escritos para asambleas y faenas, emisión de tickets y cobro tarifado.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Crear Guión</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Publicidad</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SPOTS')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'SPOTS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Campañas Activas ({ads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('GUIONES')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'GUIONES' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Guiones Pre-escritos ({scripts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('JARVIS')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'JARVIS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Locución J.A.R.V.I.S</span>
        </button>

        <button
          onClick={() => setActiveTab('TARIFAS')}
          className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'TARIFAS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Tarifario Oficial</span>
        </button>
      </div>

      {/* CONTENIDO TAB 1: SPOTS ACTIVOS */}
      {activeTab === 'SPOTS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Cargando publicidad...</div>
          ) : ads.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <Radio className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No hay campañas publicitarias registradas</p>
              <p className="text-xs text-slate-400 mt-1">Registra un nuevo spot de perifoneo o utiliza un guión pre-escrito.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          ad.status === 'ACTIVO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {ad.status}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-400">{ad.code}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mb-1">{ad.title}</h3>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Anunciante: {ad.advertiserName}</p>

                    {ad.textScript && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3 line-clamp-3 italic">
                        &quot;{ad.textScript}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 mb-3 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 text-[11px] font-sans">Tarifa Cobrada:</span>
                      <span className="text-emerald-700 text-sm font-black">S/ {Number(ad.amount).toFixed(2)}</span>
                    </div>

                    {ad.playbackTimes && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">
                          {Array.isArray(ad.playbackTimes) ? ad.playbackTimes.join(' • ') : ad.playbackTimes}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {ad.audioUrl && (
                        <button
                          onClick={() => handlePlayAudio(ad.audioUrl, ad.id)}
                          className={`p-2 rounded-xl transition flex items-center space-x-1 text-xs font-bold ${
                            playingId === ad.id ? 'bg-amber-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {playingId === ad.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{playingId === ad.id ? 'Pausar' : 'Escuchar'}</span>
                        </button>
                      )}

                      {ad.textScript && (
                        <button
                          onClick={() => speakWithJarvis(ad.textScript)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                          title="Locución con J.A.R.V.I.S"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>J.A.R.V.I.S</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handlePrintExistingTicket(ad.id)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                        title="Ver / Imprimir Ticket"
                      >
                        <Printer className="w-4 h-4 text-emerald-700" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(ad)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition text-xs font-bold"
                        title={ad.status === 'ACTIVO' ? 'Pausar' : 'Activar'}
                      >
                        {ad.status === 'ACTIVO' ? 'Pausar' : 'Activar'}
                      </button>

                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 2: GUIONES PRE-ESCRITOS */}
      {activeTab === 'GUIONES' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <div>
              <p className="font-bold">Plantillas Oficiales de Locución y Perifoneo</p>
              <p className="text-[11px] text-emerald-700">
                Selecciona cualquier guión predeterminado para citar a asambleas, convocar a faenas comunales o promocionar puestos.
              </p>
            </div>
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-700 text-white rounded-xl font-bold shadow hover:bg-emerald-800 transition"
            >
              + Nuevo Guión
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scripts.map((script) => (
              <div key={script.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {script.category}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{script.title}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => speakWithJarvis(script.content)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                      title="Probar con J.A.R.V.I.S"
                    >
                      <Bot className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed italic border border-slate-100">
                  &quot;{script.content}&quot;
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">~{script.estimatedDurationSeconds} segundos</span>
                  <button
                    onClick={() => handleSelectScriptTemplate(script)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center space-x-1"
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>Emitir / Publicar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 3: LOCUCIÓN J.A.R.V.I.S */}
      {activeTab === 'JARVIS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-indigo-300">J.A.R.V.I.S Voice System</h2>
                <p className="text-xs text-slate-400 font-mono">Red Neuronal de Locución para Altavoces del Mercado</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título de la Campaña</label>
                <input
                  type="text"
                  placeholder="Ej: Anuncio Citación Urgente Faena"
                  value={jarvisTitle}
                  onChange={(e) => setJarvisTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Anunciante / Puesto</label>
                <input
                  type="text"
                  placeholder="Ej: Junta Directiva o Puesto 14 Carnes"
                  value={jarvisAdvertiser}
                  onChange={(e) => setJarvisAdvertiser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Texto del Guión Publicitario</label>
                <textarea
                  rows={4}
                  placeholder="Escribe el mensaje que J.A.R.V.I.S transmitirá en los altavoces..."
                  value={jarvisText}
                  onChange={(e) => setJarvisText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => speakWithJarvis(jarvisText)}
                  disabled={isSpeaking || !jarvisText.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'Transmitiendo...' : 'Probar Locución en Altavoces'}</span>
                </button>
              </div>

              {jarvisStatus && (
                <p className="text-xs text-indigo-300 font-mono text-center bg-indigo-950/60 p-2 rounded-xl border border-indigo-800/40">
                  {jarvisStatus}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase mb-2">Instrucciones de Perifoneo Automatizado</h3>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>
                  Los anuncios se difunden a través de los amplificadores conectados en la computadora del mercado.
                </li>
                <li>
                  J.A.R.V.I.S utiliza entonación formal y modulación clara para superar el ruido ambiental del mercado de abastos.
                </li>
                <li>
                  Para citaciones oficiales de asambleas o faenas comunales, el costo tarifario puede ser exento o cargarse a la cuenta institucional.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Plantilla Rápida de Ejemplo:</span>
              <p className="text-xs text-slate-700 italic">
                &quot;Señores comerciantes del Mercado Micaela Bastidas: Se les recuerda que la Asamblea General iniciará en 15 minutos en el pabellón central. La asistencia es obligatoria.&quot;
              </p>
              <button
                onClick={() =>
                  setJarvisText(
                    'Señores comerciantes del Mercado Micaela Bastidas: Se les recuerda que la Asamblea General iniciará en 15 minutos en el patio central. La asistencia es obligatoria con DNI.',
                  )
                }
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Copiar al sintetizador →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: TARIFARIO OFICIAL */}
      {activeTab === 'TARIFAS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-800">Tarifas Oficiales de Publicidad y Perifoneo</h2>
            <p className="text-xs text-slate-400">Tarifas aprobadas por la asamblea general de comerciantes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rates.length > 0 ? (
              rates.map((r: any) => (
                <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{r.concept?.code}</span>
                  <h4 className="font-bold text-slate-800 text-sm">{r.concept?.name}</h4>
                  <div className="text-xl font-black font-mono text-emerald-700">S/ {Number(r.amount).toFixed(2)}</div>
                  <p className="text-[11px] text-slate-500">{r.concept?.description || 'Emisión por altavoz del mercado'}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PUBLICIDAD_PERIFONEO</span>
                  <h4 className="font-bold text-slate-800 text-sm">Perifoneo por Spot / Turno</h4>
                  <div className="text-xl font-black font-mono text-emerald-700">S/ 5.00</div>
                  <p className="text-[11px] text-slate-500">Emisión de 3 repeticiones en horarios de mayor afluencia.</p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PUBLICIDAD_BANNER</span>
                  <h4 className="font-bold text-slate-800 text-sm">Exhibición de Banners en Pasajes</h4>
                  <div className="text-xl font-black font-mono text-emerald-700">S/ 30.00 / Mes</div>
                  <p className="text-[11px] text-slate-500">Carteles y gigantografías en columnas y techos autorizados.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PUBLICIDAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Registrar Publicidad / Perifoneo</h3>
                <p className="text-xs text-slate-400">Aplica la tarifa oficial y emite el comprobante de cobro.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Título de la Campaña *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Oferta de Carnes Puesto 04"
                  value={newAdForm.title}
                  onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre del Anunciante / Puesto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Quispe - Puesto P-004"
                  value={newAdForm.advertiserName}
                  onChange={(e) => setNewAdForm({ ...newAdForm, advertiserName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Tarifario Oficial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Concepto Tarifario *</label>
                  <select
                    value={newAdForm.conceptCode}
                    onChange={(e) => {
                      const selCode = e.target.value;
                      const matchRate = rates.find((r) => r.concept?.code === selCode);
                      setNewAdForm({
                        ...newAdForm,
                        conceptCode: selCode,
                        amount: matchRate ? Number(matchRate.amount) : newAdForm.amount,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="PUBLICIDAD_PERIFONEO">Perifoneo por Altavoces</option>
                    <option value="PUBLICIDAD_BANNER">Banners y Carteles</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Monto a Cobrar (S/) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={newAdForm.amount}
                    onChange={(e) => setNewAdForm({ ...newAdForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Texto del Guión Publicitario *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mensaje de audio que se emitirá..."
                  value={newAdForm.textScript}
                  onChange={(e) => setNewAdForm({ ...newAdForm, textScript: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow">
                  Guardar y Emitir Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO GUIÓN */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-800 uppercase mb-3">Nuevo Guión Pre-escrito</h3>
            <form onSubmit={handleCreateScript} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Título del Guión *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Citación a Faena del Pabellón B"
                  value={scriptForm.title}
                  onChange={(e) => setScriptForm({ ...scriptForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Categoría *</label>
                  <select
                    value={scriptForm.category}
                    onChange={(e) => setScriptForm({ ...scriptForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ASAMBLEA">Asamblea</option>
                    <option value="FAENA">Faena</option>
                    <option value="AVISO_COBRANZA">Aviso de Cobranza</option>
                    <option value="PROMOCION_SOCIO">Promoción Comercial</option>
                    <option value="COMUNICADO_GENERAL">Comunicado General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Duración Est. (Segundos)</label>
                  <input
                    type="number"
                    value={scriptForm.estimatedDurationSeconds}
                    onChange={(e) => setScriptForm({ ...scriptForm, estimatedDurationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Contenido del Guión *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Texto oficial a locutar..."
                  value={scriptForm.content}
                  onChange={(e) => setScriptForm({ ...scriptForm, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScriptModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Guardar Guión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TICKET POS IMPRIMIBLE */}
      {printTicketData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-slate-100 text-center space-y-3 font-sans">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xs font-black uppercase text-slate-900">{printTicketData.title}</h3>
              <p className="text-[10px] text-slate-500 font-bold tracking-wider">{printTicketData.subtitle}</p>
              <p className="text-xs font-mono font-black text-emerald-700 mt-1">{printTicketData.ticketNumber}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-3 text-left space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Anunciante:</span>
                <span className="font-bold text-slate-800 truncate max-w-[150px]">{printTicketData.advertiser}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campaña:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[150px]">{printTicketData.campaignTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Servicio:</span>
                <span className="text-slate-700">{printTicketData.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emisión:</span>
                <span className="font-mono text-slate-700">{printTicketData.playbackSchedule}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 text-sm font-black">
                <span>TOTAL:</span>
                <span className="text-emerald-700 font-mono">S/ {printTicketData.amount}</span>
              </div>
              <div className="text-[10px] text-slate-400 text-center pt-2">{printTicketData.issuedAt}</div>
            </div>

            <p className="text-[9px] text-slate-400 leading-tight">{printTicketData.legalNote}</p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setPrintTicketData(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
