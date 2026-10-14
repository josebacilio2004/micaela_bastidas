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
  AlertCircle,
  RefreshCw,
  Filter,
  Wallet,
  Tag,
  Settings2,
  Check,
} from 'lucide-react';

export default function PublicidadPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [activeCashRegister, setActiveCashRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SPOTS' | 'GUIONES' | 'JARVIS' | 'TARIFAS'>('SPOTS');

  // Filtro de categorías para guiones
  const [selectedScriptCategory, setSelectedScriptCategory] = useState<string>('ALL');

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
    amount: 5.0,
    paymentMethod: 'EFECTIVO',
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

  // Modal editar guión
  const [isEditScriptModalOpen, setIsEditScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);

  // Modal nueva tarifa / concepto
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateFormMode, setRateFormMode] = useState<'EXISTING_CONCEPT' | 'NEW_CONCEPT'>('EXISTING_CONCEPT');
  const [rateForm, setRateForm] = useState({
    conceptId: '',
    newConceptCode: '',
    newConceptName: '',
    newConceptDesc: '',
    periodicity: 'EVENTUAL',
    amount: 5.0,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Modal editar tarifa
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  // Ticket para imprimir
  const [printTicketData, setPrintTicketData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adsRes, scriptsRes, ratesRes, conceptsRes, activeCashRes] = await Promise.all([
        apiRequest('/advertising').catch(() => []),
        apiRequest('/advertising/scripts').catch(() => []),
        apiRequest('/rates').catch(() => []),
        apiRequest('/payment-concepts').catch(() => []),
        apiRequest('/cash-registers/active').catch(() => null),
      ]);

      setAds(Array.isArray(adsRes) ? adsRes : []);
      setScripts(Array.isArray(scriptsRes) ? scriptsRes : []);

      const validRates = Array.isArray(ratesRes) ? ratesRes : [];
      setRates(validRates);

      const validConcepts = Array.isArray(conceptsRes) ? conceptsRes : [];
      setConcepts(validConcepts);

      setActiveCashRegister(activeCashRes);
    } catch (e) {
      console.error('Error cargando módulo de publicidad:', e);
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

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
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

  const handleTransferJarvisToAdModal = () => {
    setNewAdForm((prev) => ({
      ...prev,
      title: jarvisTitle.trim() || 'Perifoneo por Altavoces',
      advertiserName: jarvisAdvertiser.trim() || 'Administración / Comerciante',
      textScript: jarvisText.trim(),
      amount: jarvisAmount > 0 ? jarvisAmount : 5.0,
    }));
    setIsModalOpen(true);
  };

  const handleSaveJarvisAsScript = async () => {
    if (!jarvisText.trim()) {
      alert('Por favor ingrese el texto que desea guardar como guión.');
      return;
    }
    try {
      await apiRequest('/advertising/scripts', {
        method: 'POST',
        body: JSON.stringify({
          title: jarvisTitle.trim() || 'Guión de Locución Rápida',
          category: 'COMUNICADO_GENERAL',
          content: jarvisText.trim(),
          estimatedDurationSeconds: 25,
        }),
      });
      alert('✓ Guardado exitosamente en la biblioteca de guiones pre-escritos');
      await fetchData();
    } catch (e: any) {
      alert('Error al guardar guión: ' + (e.message || e));
    }
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
        amount: 5.0,
        paymentMethod: 'EFECTIVO',
        textScript: '',
        audioUrl: '',
        playbackTimes: ['09:00', '12:00', '16:00'],
      });

      await fetchData();

      // Abrir ticket automáticamente
      if (res?.ticket) {
        setPrintTicketData(res.ticket);
      } else {
        alert('✓ Publicidad y cobro registrados exitosamente');
      }
    } catch (e: any) {
      alert('Error al registrar publicidad: ' + (e.message || e));
    }
  };

  // --- CRUD GUIONES ---
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
      await fetchData();
      alert('✓ Guión pre-escrito guardado en la biblioteca');
    } catch (e: any) {
      alert('Error al guardar guión: ' + (e.message || e));
    }
  };

  const handleOpenEditScript = (script: any) => {
    setEditingScript(script);
    setIsEditScriptModalOpen(true);
  };

  const handleUpdateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;
    try {
      await apiRequest(`/advertising/scripts/${editingScript.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingScript.title,
          category: editingScript.category,
          content: editingScript.content,
          estimatedDurationSeconds: Number(editingScript.estimatedDurationSeconds) || 30,
        }),
      });
      setIsEditScriptModalOpen(false);
      setEditingScript(null);
      await fetchData();
      alert('✓ Guión pre-escrito actualizado correctamente');
    } catch (e: any) {
      alert('Error al actualizar guión: ' + (e.message || e));
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este guión de la biblioteca?')) return;
    try {
      await apiRequest(`/advertising/scripts/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (e) {
      alert('Error al eliminar guión');
    }
  };

  // --- CRUD TARIFAS Y CONCEPTOS ---
  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let conceptId = rateForm.conceptId;

      // Si es un concepto nuevo, primero crearlo
      if (rateFormMode === 'NEW_CONCEPT') {
        const newConcept = await apiRequest('/payment-concepts', {
          method: 'POST',
          body: JSON.stringify({
            code: rateForm.newConceptCode.trim().toUpperCase(),
            name: rateForm.newConceptName.trim(),
            description: rateForm.newConceptDesc.trim(),
            periodicity: rateForm.periodicity,
          }),
        });
        conceptId = newConcept.id;
      }

      if (!conceptId) {
        alert('Debe seleccionar o especificar un concepto de cobro');
        return;
      }

      await apiRequest('/rates', {
        method: 'POST',
        body: JSON.stringify({
          conceptId,
          amount: Number(rateForm.amount),
          startDate: rateForm.startDate || new Date().toISOString().split('T')[0],
        }),
      });

      setIsRateModalOpen(false);
      setRateForm({
        conceptId: '',
        newConceptCode: '',
        newConceptName: '',
        newConceptDesc: '',
        periodicity: 'EVENTUAL',
        amount: 5.0,
        startDate: new Date().toISOString().split('T')[0],
      });
      await fetchData();
      alert('✓ Tarifa registrada exitosamente');
    } catch (e: any) {
      alert('Error al registrar tarifa: ' + (e.message || e));
    }
  };

  const handleOpenEditRate = (rate: any) => {
    setEditingRate({
      ...rate,
      amount: Number(rate.amount),
    });
    setIsEditRateModalOpen(true);
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;
    try {
      await apiRequest(`/rates/${editingRate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: Number(editingRate.amount),
          isActive: editingRate.isActive,
        }),
      });
      setIsEditRateModalOpen(false);
      setEditingRate(null);
      await fetchData();
      alert('✓ Tarifa actualizada correctamente');
    } catch (e: any) {
      alert('Error al actualizar tarifa: ' + (e.message || e));
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('¿Deseas desactivar esta tarifa?')) return;
    try {
      await apiRequest(`/rates/${rateId}`, { method: 'DELETE' });
      await fetchData();
    } catch (e: any) {
      alert('Error al desactivar tarifa: ' + (e.message || e));
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
    if (!confirm('¿Seguro que deseas eliminar este registro de publicidad?')) return;
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

  // Filtrado de tarifas publicitarias vs generales
  const advertisingRates = rates.filter(
    (r: any) =>
      r.concept?.code?.includes('PUB') ||
      r.concept?.code?.includes('PERIFONEO') ||
      r.concept?.code?.includes('BANNER') ||
      r.concept?.name?.toLowerCase().includes('publicidad') ||
      r.concept?.name?.toLowerCase().includes('perifoneo'),
  );

  // Filtrado de guiones por categoría
  const filteredScripts = scripts.filter((s: any) => {
    if (selectedScriptCategory === 'ALL') return true;
    return s.category === selectedScriptCategory;
  });

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* Header con Indicador de Caja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center space-x-2">
            <span>Publicidad, Perifoneo & J.A.R.V.I.S</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Voz Neuronal Activa
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Control de spots de audio en altavoces, guiones pre-escritos para asambleas y faenas, emisión de tickets y cobro tarifado integrado a Caja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Estado de Caja */}
          {activeCashRegister ? (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-1.5 text-xs text-emerald-800 font-bold">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Caja Activa: {activeCashRegister.name || 'Abierta'}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-1.5 text-xs text-amber-800 font-bold" title="Sin caja abierta. Los cobros se registrarán pero debe abrir caja en Tesorería.">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sin Caja Abierta</span>
            </div>
          )}

          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Crear Guión</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cobro / Publicidad</span>
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
          <span>Tarifario Oficial ({advertisingRates.length > 0 ? advertisingRates.length : rates.length})</span>
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

      {/* CONTENIDO TAB 2: GUIONES PRE-ESCRITOS (CRUD COMPLETO) */}
      {activeTab === 'GUIONES' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold">Biblioteca de Guiones Pre-escritos para Altavoces</p>
              <p className="text-[11px] text-emerald-700">
                Selecciona, edita o crea plantillas predeterminadas para citar a asambleas, convocar a faenas o promocionar puestos.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsScriptModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Guión</span>
              </button>
            </div>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Categoría:
            </span>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ASAMBLEA', label: 'Asambleas' },
              { id: 'FAENA', label: 'Faenas Comunales' },
              { id: 'AVISO_COBRANZA', label: 'Avisos de Cobro' },
              { id: 'PROMOCION_SOCIO', label: 'Promociones' },
              { id: 'COMUNICADO_GENERAL', label: 'Comunicados' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedScriptCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedScriptCategory === cat.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScripts.map((script) => (
              <div key={script.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
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
                        onClick={() => handleOpenEditScript(script)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                        title="Editar Guión"
                      >
                        <Pencil className="w-4 h-4" />
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

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed italic border border-slate-100 mt-2">
                    &quot;{script.content}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">~{script.estimatedDurationSeconds} seg</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => speakWithJarvis(script.content)}
                      className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl font-bold text-xs flex items-center space-x-1 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Locutar</span>
                    </button>
                    <button
                      onClick={() => handleSelectScriptTemplate(script)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center space-x-1 transition"
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Cobrar / Publicar</span>
                    </button>
                  </div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Anunciante / Puesto</label>
                  <input
                    type="text"
                    placeholder="Ej: Junta Directiva o Puesto 14"
                    value={jarvisAdvertiser}
                    onChange={(e) => setJarvisAdvertiser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monto a Cobrar (S/)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={jarvisAmount}
                    onChange={(e) => setJarvisAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
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

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => speakWithJarvis(jarvisText)}
                  disabled={isSpeaking || !jarvisText.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'Transmitiendo...' : 'Probar Locución en Altavoces'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTransferJarvisToAdModal}
                  disabled={!jarvisText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                  title="Cobrar y registrar como ingreso en caja"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Cobrar & Ticket</span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveJarvisAsScript}
                  disabled={!jarvisText.trim()}
                  className="text-xs text-indigo-300 hover:text-white underline transition disabled:opacity-40"
                >
                  + Guardar texto en la biblioteca de guiones
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
                  Al pulsar <b>&quot;Cobrar &amp; Ticket&quot;</b>, el monto ingresará directamente a la <b>Caja General del Día</b> activa en tesorería.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Plantilla Rápida de Ejemplo:</span>
              <p className="text-xs text-slate-700 italic">
                &quot;Señores comerciantes del Mercado Micaela Bastidas: Se les recuerda que la Asamblea General iniciará en 15 minutos en el patio central. La asistencia es obligatoria con DNI.&quot;
              </p>
              <button
                onClick={() => {
                  setJarvisTitle('Asamblea General Urgente');
                  setJarvisAdvertiser('Junta Directiva');
                  setJarvisText(
                    'Señores comerciantes del Mercado Micaela Bastidas: Se les recuerda que la Asamblea General iniciará en 15 minutos en el patio central. La asistencia es obligatoria con DNI.',
                  );
                }}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Copiar al sintetizador →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: TARIFARIO OFICIAL (CRUD COMPLETO) */}
      {activeTab === 'TARIFAS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-800">Tarifario y Conceptos de Publicidad y Cobranza</h2>
              <p className="text-xs text-slate-400">Catálogo oficial de conceptos y tarifas del mercado con montos editables y vigencia.</p>
            </div>
            <button
              onClick={() => setIsRateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarifa / Concepto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rates.length > 0 ? (
              rates.map((r: any) => (
                <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-2 py-0.5 bg-slate-200/60 rounded">
                        {r.concept?.code}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {r.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mt-1">{r.concept?.name}</h4>
                    <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                      S/ {Number(r.amount).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {r.concept?.description || 'Tarifa oficial del mercado de abastos'}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Periodicidad: {r.concept?.periodicity || 'EVENTUAL'}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenEditRate(r)}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      <span>Editar</span>
                    </button>
                    {r.isActive && (
                      <button
                        onClick={() => handleDeleteRate(r.id)}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-8 text-center text-slate-400 text-xs">
                No hay tarifas registradas. Haz clic en &quot;Nueva Tarifa / Concepto&quot; para registrar la primera.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PUBLICIDAD Y COBRO (CON INGRESO A CAJA) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Registrar Cobro de Publicidad</h3>
                <p className="text-xs text-slate-400">Aplica la tarifa oficial, asienta en caja y emite el comprobante ticket.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso de Caja Activa */}
            {activeCashRegister ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <b>Caja Activa:</b> {activeCashRegister.name}. Este cobro se asentará automáticamente como <b>INGRESO</b>.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  No hay caja abierta hoy. El cobro quedará guardado, pero recuerda abrir caja en Tesorería.
                </span>
              </div>
            )}

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
                  placeholder="Ej: Juan Quispe - Puesto P-004 o Junta Directiva"
                  value={newAdForm.advertiserName}
                  onChange={(e) => setNewAdForm({ ...newAdForm, advertiserName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Tarifario Oficial y Monto */}
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
                    {rates.length > 0 ? (
                      rates.map((r: any) => (
                        <option key={r.id} value={r.concept?.code}>
                          {r.concept?.name} (S/ {Number(r.amount).toFixed(2)})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="PUBLICIDAD_PERIFONEO">Perifoneo por Altavoces</option>
                        <option value="PUBLICIDAD_BANNER">Banners y Carteles</option>
                      </>
                    )}
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

              {/* Medio de Pago */}
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Medio de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {['EFECTIVO', 'YAPE', 'PLIN'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setNewAdForm({ ...newAdForm, paymentMethod: method })}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        newAdForm.paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Texto del Guión Publicitario</label>
                <textarea
                  rows={3}
                  placeholder="Mensaje de audio que se emitirá en altavoces..."
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
                  Cobrar y Emitir Ticket
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

      {/* MODAL EDITAR GUIÓN */}
      {isEditScriptModalOpen && editingScript && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-800 uppercase mb-3">Editar Guión Pre-escrito</h3>
            <form onSubmit={handleUpdateScript} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Título del Guión *</label>
                <input
                  type="text"
                  required
                  value={editingScript.title}
                  onChange={(e) => setEditingScript({ ...editingScript, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Categoría *</label>
                  <select
                    value={editingScript.category}
                    onChange={(e) => setEditingScript({ ...editingScript, category: e.target.value })}
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
                    value={editingScript.estimatedDurationSeconds}
                    onChange={(e) => setEditingScript({ ...editingScript, estimatedDurationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Contenido del Guión *</label>
                <textarea
                  rows={4}
                  required
                  value={editingScript.content}
                  onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditScriptModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Actualizar Guión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA TARIFA / CONCEPTO */}
      {isRateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Registrar Tarifa / Concepto</h3>
                <p className="text-xs text-slate-400">Configura tarifas oficiales de publicidad o cualquier concepto del mercado.</p>
              </div>
              <button onClick={() => setIsRateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 mb-3">
              <button
                type="button"
                onClick={() => setRateFormMode('EXISTING_CONCEPT')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center ${
                  rateFormMode === 'EXISTING_CONCEPT'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Concepto Existente
              </button>
              <button
                type="button"
                onClick={() => setRateFormMode('NEW_CONCEPT')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center ${
                  rateFormMode === 'NEW_CONCEPT'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500'
                }`}
              >
                + Crear Nuevo Concepto
              </button>
            </div>

            <form onSubmit={handleCreateRate} className="space-y-3 text-xs">
              {rateFormMode === 'EXISTING_CONCEPT' ? (
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Seleccionar Concepto *</label>
                  <select
                    required
                    value={rateForm.conceptId}
                    onChange={(e) => setRateForm({ ...rateForm, conceptId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">-- Seleccionar --</option>
                    {concepts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Código del Concepto *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: PUB_PARLANTE_DIARIO"
                        value={rateForm.newConceptCode}
                        onChange={(e) => setRateForm({ ...rateForm, newConceptCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Periodicidad</label>
                      <select
                        value={rateForm.periodicity}
                        onChange={(e) => setRateForm({ ...rateForm, periodicity: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="DIARIO">DIARIO</option>
                        <option value="SEMANAL">SEMANAL</option>
                        <option value="MENSUAL">MENSUAL</option>
                        <option value="EVENTUAL">EVENTUAL / POR SPOT</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 uppercase mb-1">Nombre Descriptivo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Perifoneo Diario en Altavoces"
                      value={rateForm.newConceptName}
                      onChange={(e) => setRateForm({ ...rateForm, newConceptName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 uppercase mb-1">Descripción / Regla</label>
                    <input
                      type="text"
                      placeholder="Ej: Cobro por 3 repeticiones en horarios matutinos"
                      value={rateForm.newConceptDesc}
                      onChange={(e) => setRateForm({ ...rateForm, newConceptDesc: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Monto Oficial (S/) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={rateForm.amount}
                    onChange={(e) => setRateForm({ ...rateForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={rateForm.startDate}
                    onChange={(e) => setRateForm({ ...rateForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Guardar Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TARIFA */}
      {isEditRateModalOpen && editingRate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-800 uppercase mb-2">Editar Tarifa</h3>
            <p className="text-xs text-slate-400 mb-3">{editingRate.concept?.name} ({editingRate.concept?.code})</p>

            <form onSubmit={handleUpdateRate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Monto de la Tarifa (S/) *</label>
                <input
                  type="number"
                  step="0.50"
                  required
                  value={editingRate.amount}
                  onChange={(e) => setEditingRate({ ...editingRate, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Estado</label>
                <select
                  value={editingRate.isActive ? 'ACTIVO' : 'INACTIVO'}
                  onChange={(e) => setEditingRate({ ...editingRate, isActive: e.target.value === 'ACTIVO' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditRateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Actualizar Tarifa
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
              {printTicketData.cashRegisterName && (
                <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>Caja de Ingreso:</span>
                  <span className="truncate max-w-[140px]">{printTicketData.cashRegisterName}</span>
                </div>
              )}
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
