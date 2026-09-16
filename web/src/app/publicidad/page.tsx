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
} from 'lucide-react';

export default function PublicidadPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SPOTS' | 'JARVIS' | 'TARIFAS'>('SPOTS');

  // Reproductor en vivo
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // JARVIS Text-to-Speech State
  const [jarvisText, setJarvisText] = useState('');
  const [jarvisAdvertiser, setJarvisAdvertiser] = useState('');
  const [jarvisTitle, setJarvisTitle] = useState('');
  const [jarvisAmount, setJarvisAmount] = useState(5.00);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jarvisStatus, setJarvisStatus] = useState<string | null>(null);

  // Modal nueva publicidad
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdForm, setNewAdForm] = useState({
    title: '',
    advertiserName: '',
    type: 'PERIFONEO_AUDIO',
    amount: 10.00,
    textScript: '',
    audioUrl: '',
    playbackTimes: ['09:00', '12:00', '16:00'],
  });

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/advertising');
      setAds(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
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

  // JARVIS Speech Synthesis (Browser Speech API with edge fallback)
  const speakWithJarvis = (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-MX'; // Mexican dub style for JARVIS
      utterance.rate = 0.95;
      utterance.pitch = 0.92;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang.includes('es-MX') || v.lang.includes('es-ES') || v.lang.includes('es'));
      if (esVoice) utterance.voice = esVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setJarvisStatus('✓ Transmitiendo anuncio con el sintetizador neuronal de J.A.R.V.I.S');
    } else {
      alert('Tu navegador no soporta el sintetizador de voz integrado.');
    }
  };

  const handleSaveJarvisSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jarvisTitle || !jarvisAdvertiser || !jarvisText) {
      alert('Completa los campos para guardar la cuña comercial.');
      return;
    }

    try {
      await apiRequest('/advertising', {
        method: 'POST',
        body: JSON.stringify({
          title: jarvisTitle,
          advertiserName: jarvisAdvertiser,
          type: 'PERIFONEO_AUDIO',
          textScript: jarvisText,
          amount: jarvisAmount,
          playbackTimes: ['09:00', '11:30', '16:00'],
        }),
      });

      alert('✓ Spot publicitario guardado e integrado al cronograma de perifoneo');
      setJarvisTitle('');
      setJarvisAdvertiser('');
      setJarvisText('');
      fetchAds();
      setActiveTab('SPOTS');
    } catch (e: any) {
      alert(e.message || 'Error al registrar spot');
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Publicidad y Perifoneo del Mercado</h1>
          <p className="text-xs text-slate-500">
            Control de cuñas publicitarias pagadas, horarios de emisión automática y locución por IA con J.A.R.V.I.S.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('JARVIS')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <Bot className="w-4 h-4" />
            <span>Locutor J.A.R.V.I.S</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('SPOTS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'SPOTS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Spots y Perifoneo Activo ({ads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('JARVIS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'JARVIS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Locución Virtual J.A.R.V.I.S</span>
        </button>

        <button
          onClick={() => setActiveTab('TARIFAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'TARIFAS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Tarifario de Publicidad</span>
        </button>
      </div>

      {/* Content Tabs */}
      {activeTab === 'SPOTS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando spots de perifoneo...</div>
          ) : ads.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-2">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No hay campañas publicitarias registradas</p>
              <p className="text-xs text-slate-400">Genera tu primer anuncio comercial con J.A.R.V.I.S o sube un archivo de audio MP3.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        {ad.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">S/ {Number(ad.amount).toFixed(2)}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mb-1">{ad.title}</h3>
                    <p className="text-xs text-emerald-800 font-bold mb-2">Anunciante: {ad.advertiserName}</p>

                    {ad.textScript && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl italic mb-3 line-clamp-3">
                        &quot;{ad.textScript}&quot;
                      </p>
                    )}

                    {ad.playbackTimes && (
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 mb-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Horarios: {Array.isArray(ad.playbackTimes) ? ad.playbackTimes.join(', ') : 'Programado'}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {ad.audioUrl ? (
                      <button
                        onClick={() => handlePlayAudio(ad.audioUrl, ad.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition ${
                          playingId === ad.id ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {playingId === ad.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{playingId === ad.id ? 'Pausar' : 'Emitir Audio'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => speakWithJarvis(ad.textScript || ad.title)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow transition"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Locución JARVIS</span>
                      </button>
                    )}

                    <span className="text-[10px] font-mono text-slate-400">{ad.code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JARVIS AI Module */}
      {activeTab === 'JARVIS' && (
        <div className="max-w-2xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-indigo-500/20 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-wider uppercase">J.A.R.V.I.S. Core</h2>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full animate-pulse">
                  EN LÍNEA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistema de Locución Neural y Perifoneo para el Mercado Micaela Bastidas
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveJarvisSpot} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-300 tracking-wider mb-1">
                  Título de la Campaña *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Oferta de Pescado Fresco Jueves"
                  value={jarvisTitle}
                  onChange={(e) => setJarvisTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-300 tracking-wider mb-1">
                  Puesto / Anunciante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Puesto A-04 (Pescadería Don Lucho)"
                  value={jarvisAdvertiser}
                  onChange={(e) => setJarvisAdvertiser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-indigo-300 tracking-wider mb-1">
                Guión de Locución Publicitaria *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Atención distinguidos caseros y caseras: En el puesto 14 de Carnes y Embutidos, hoy tenemos oferta especial de lomo fino a solo veinticinco soles el kilo. Acérquense con total confianza, calidad garantizada para su hogar."
                value={jarvisText}
                onChange={(e) => setJarvisText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-300 tracking-wider mb-1">
                  Costo del Servicio (S/)
                </label>
                <input
                  type="number"
                  step="1"
                  value={jarvisAmount}
                  onChange={(e) => setJarvisAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => speakWithJarvis(jarvisText)}
                  disabled={isSpeaking || !jarvisText.trim()}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center space-x-2 transition ${
                    isSpeaking
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'Locutando en Vivo...' : 'Probar Locución J.A.R.V.I.S'}</span>
                </button>
              </div>
            </div>

            {jarvisStatus && (
              <p className="text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
                {jarvisStatus}
              </p>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Programar y Guardar Spot</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tarifas Tab */}
      {activeTab === 'TARIFAS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-800 uppercase">Tarifas Oficiales de Publicidad en el Mercado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-1">
              <p className="text-xs font-bold uppercase text-slate-500">Perifoneo Radial / Altavoz</p>
              <p className="text-2xl font-black text-emerald-700 font-mono">S/ 5.00</p>
              <p className="text-[11px] text-slate-400">Por spot diario emitido en los 3 horarios de mayor afluencia.</p>
            </div>

            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-1">
              <p className="text-xs font-bold uppercase text-slate-500">Publicidad Escrita / Volanteo</p>
              <p className="text-2xl font-black text-emerald-700 font-mono">S/ 10.00</p>
              <p className="text-[11px] text-slate-400">Autorización para reparto de volantes en pasajes interiores.</p>
            </div>

            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-1">
              <p className="text-xs font-bold uppercase text-slate-500">Banners y Letreros Fijos</p>
              <p className="text-2xl font-black text-emerald-700 font-mono">S/ 20.00</p>
              <p className="text-[11px] text-slate-400">Canon mensual por exhibición de cartel en cabeceras de sector.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
