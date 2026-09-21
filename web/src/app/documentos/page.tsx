'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Clock,
  X,
} from 'lucide-react';

const YEARS = ['ALL', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];

const MONTHS = [
  { id: 'ALL', name: 'Todos los Meses' },
  { id: '1', name: 'Enero' },
  { id: '2', name: 'Febrero' },
  { id: '3', name: 'Marzo' },
  { id: '4', name: 'Abril' },
  { id: '5', name: 'Mayo' },
  { id: '6', name: 'Junio' },
  { id: '7', name: 'Julio' },
  { id: '8', name: 'Agosto' },
  { id: '9', name: 'Setiembre' },
  { id: '10', name: 'Octubre' },
  { id: '11', name: 'Noviembre' },
  { id: '12', name: 'Diciembre' },
];

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState<'DOCUMENTOS' | 'TAXONOMIA'>('DOCUMENTOS');
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedConcept, setSelectedConcept] = useState('ALL');
  const [selectedDirection, setSelectedDirection] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Form de subida / edición
  const [uploadForm, setUploadForm] = useState({
    title: '',
    categoryId: '',
    conceptId: '',
    concept: 'OTROS',
    direction: 'INTERNO',
    documentDate: new Date().toISOString().split('T')[0],
    senderReceiver: '',
    externalNumber: '',
    description: '',
    merchantId: '',
  });

  // Modal de Categoría nueva
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    direction: 'INTERNO',
    description: '',
  });

  // Modal de Concepto nuevo
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [conceptForm, setConceptForm] = useState({
    name: '',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, concsRes, merchsRes] = await Promise.all([
        apiRequest('/documents/categories'),
        apiRequest('/documents/concepts'),
        apiRequest('/merchants'),
      ]);
      setCategories(catsRes || []);
      setConcepts(concsRes || []);
      setMerchants(merchsRes || []);
      await fetchDocuments();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'ALL') params.append('year', selectedYear);
      if (selectedMonth !== 'ALL') params.append('month', selectedMonth);
      if (selectedCategory !== 'ALL') params.append('categoryId', selectedCategory);
      if (selectedConcept !== 'ALL') params.append('concept', selectedConcept);
      if (selectedDirection !== 'ALL') params.append('direction', selectedDirection);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiRequest(`/documents?${params.toString()}`);
      setDocuments(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedYear, selectedMonth, selectedCategory, selectedConcept, selectedDirection]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileToUpload(file);
      if (!uploadForm.title) {
        setUploadForm((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', uploadForm.title.trim());
      formData.append('concept', uploadForm.concept || 'OTROS');
      if (uploadForm.conceptId) formData.append('conceptId', uploadForm.conceptId);
      if (uploadForm.categoryId) formData.append('categoryId', uploadForm.categoryId);
      formData.append('direction', uploadForm.direction);
      formData.append('documentDate', uploadForm.documentDate);
      if (uploadForm.senderReceiver) formData.append('senderReceiver', uploadForm.senderReceiver.trim());
      if (uploadForm.externalNumber) formData.append('externalNumber', uploadForm.externalNumber.trim());
      if (uploadForm.description) formData.append('description', uploadForm.description.trim());
      if (uploadForm.merchantId) formData.append('merchantId', uploadForm.merchantId);

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir el archivo');
      }

      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setUploadForm({
        title: '',
        categoryId: '',
        conceptId: '',
        concept: 'OTROS',
        direction: 'INTERNO',
        documentDate: new Date().toISOString().split('T')[0],
        senderReceiver: '',
        externalNumber: '',
        description: '',
        merchantId: '',
      });
      await fetchDocuments();
      alert('✓ Documento archivado exitosamente');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/documents/categories', {
        method: 'POST',
        body: JSON.stringify(categoryForm),
      });
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', direction: 'INTERNO', description: '' });
      const cats = await apiRequest('/documents/categories');
      setCategories(cats || []);
      alert('✓ Categoría creada con éxito');
    } catch (e: any) {
      alert('Error al crear categoría: ' + e.message);
    }
  };

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/documents/concepts', {
        method: 'POST',
        body: JSON.stringify(conceptForm),
      });
      setIsConceptModalOpen(false);
      setConceptForm({ name: '', description: '' });
      const concs = await apiRequest('/documents/concepts');
      setConcepts(concs || []);
      alert('✓ Concepto creado con éxito');
    } catch (e: any) {
      alert('Error al crear concepto: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este documento? Esta acción no se puede deshacer.')) return;
    try {
      await apiRequest(`/documents/${id}`, { method: 'DELETE' });
      await fetchDocuments();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/D';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case 'RECIBIDO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
            Recibido
          </span>
        );
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            Enviado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Building2 className="w-3 h-3 text-slate-500" />
            Interno
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión Documental del Mercado</h1>
          <p className="text-xs text-slate-500">
            Archivo oficial, trayectoria histórica desde 2018, clasificación por categorías (Cartas, Oficios, Solicitudes) y conceptos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'DOCUMENTOS' ? 'TAXONOMIA' : 'DOCUMENTOS')}
            className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>{activeTab === 'DOCUMENTOS' ? 'Administrar Categorías' : 'Ver Documentos'}</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Subir Documento</span>
          </button>
        </div>
      </div>

      {activeTab === 'TAXONOMIA' ? (
        /* VISTA DE GESTIÓN DE CATEGORÍAS Y CONCEPTOS (CRUD) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categorías */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-slate-800">Categorías de Documentos</h2>
                <p className="text-xs text-slate-400">Cartas Recibidas/Enviadas, Oficios, Memorándum, etc.</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Categoría</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{cat.name}</span>
                      {getDirectionBadge(cat.direction)}
                    </div>
                    {cat.description && <p className="text-[11px] text-slate-400">{cat.description}</p>}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{cat.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conceptos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-slate-800">Conceptos y Asuntos</h2>
                <p className="text-xs text-slate-400">Asambleas, Faenas, Legal, Trámites Municipales, etc.</p>
              </div>
              <button
                onClick={() => setIsConceptModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Concepto</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {concepts.map((con) => (
                <div key={con.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{con.name}</span>
                    {con.description && <p className="text-[11px] text-slate-400">{con.description}</p>}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{con.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA PRINCIPAL DE DOCUMENTOS CON TRAYECTORIA HISTÓRICA */
        <div className="space-y-4">
          {/* Barra de Trayectoria Histórica (Años desde 2018 a 2026) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Trayectoria Histórica por Año:
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Total: {documents.length} archivos</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {YEARS.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {yr === 'ALL' ? 'Todos los Años' : yr}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros Secundarios: Mes, Categoría, Dirección y Búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Mes */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Dirección */}
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todas las Direcciones</option>
              <option value="RECIBIDO">📥 Recibidos</option>
              <option value="ENVIADO">📤 Enviados</option>
              <option value="INTERNO">🏢 Internos</option>
            </select>

            {/* Buscador */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, remitente, N°..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </form>
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Cargando repositorio documental...</div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No se encontraron documentos con los filtros seleccionados</p>
              <p className="text-xs text-slate-400 mt-1">Haz clic en &quot;Subir Documento&quot; para registrar actas, oficios o contratos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getDirectionBadge(doc.direction)}
                        {doc.category && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {doc.category.name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {doc.code}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">{doc.title}</h3>

                    {/* Metadatos históricos */}
                    <div className="space-y-1 my-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          Fecha Documento:
                        </span>
                        <span className="font-bold font-mono text-slate-700">
                          {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString('es-PE') : 'N/D'}
                        </span>
                      </div>

                      {doc.senderReceiver && (
                        <div className="flex items-center justify-between text-slate-500 truncate">
                          <span className="text-[11px] text-slate-400">Interesado / Remitente:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">{doc.senderReceiver}</span>
                        </div>
                      )}

                      {doc.externalNumber && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="text-[11px] text-slate-400">N° Oficio / Referencia:</span>
                          <span className="font-mono font-bold text-slate-700">{doc.externalNumber}</span>
                        </div>
                      )}
                    </div>

                    {doc.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2 bg-slate-50/70 p-2 rounded-lg">{doc.description}</p>}

                    {doc.merchant && (
                      <div className="flex items-center space-x-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg mb-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">
                          {doc.merchant.lastName}, {doc.merchant.firstName} (DNI: {doc.merchant.dni})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="font-bold text-slate-600">{doc.fileType}</span>
                      <span>•</span>
                      <span>{formatSize(doc.fileSize)}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                        title="Ver / Descargar Documento"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
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

      {/* Modal Subir Documento */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Subir Documento Oficial</h3>
                <p className="text-xs text-slate-400">Permite registrar archivos históricos desde el 2018 en adelante.</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Archivo */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Archivo (PDF, Imagen, Word) *</label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título del Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carta Solicitud de Puesto P-045"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Categoría y Dirección */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Categoría *</label>
                  <select
                    value={uploadForm.categoryId}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.id === e.target.value);
                      setUploadForm({
                        ...uploadForm,
                        categoryId: e.target.value,
                        direction: cat ? cat.direction : uploadForm.direction,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Seleccione Categoría --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.direction})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dirección *</label>
                  <select
                    value={uploadForm.direction}
                    onChange={(e) => setUploadForm({ ...uploadForm, direction: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none font-bold"
                  >
                    <option value="RECIBIDO">📥 Recibido (Entrada)</option>
                    <option value="ENVIADO">📤 Enviado (Salida)</option>
                    <option value="INTERNO">🏢 Interno del Mercado</option>
                  </select>
                </div>
              </div>

              {/* Fecha Histórica y N° de Oficio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha del Documento *</label>
                  <input
                    type="date"
                    required
                    value={uploadForm.documentDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">N° Documento / Oficio</label>
                  <input
                    type="text"
                    placeholder="Ej: Oficio N° 045-2021"
                    value={uploadForm.externalNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, externalNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Remitente / Destinatario */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remitente / Destinatario</label>
                <input
                  type="text"
                  placeholder="Ej: Municipalidad Provincial de Huancayo / Vecinos Sector B"
                  value={uploadForm.senderReceiver}
                  onChange={(e) => setUploadForm({ ...uploadForm, senderReceiver: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Socio / Comerciante asociado (opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Comerciante Asociado (Opcional)</label>
                <select
                  value={uploadForm.merchantId}
                  onChange={(e) => setUploadForm({ ...uploadForm, merchantId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">-- Ninguno (Documento General) --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} (DNI: {m.dni})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción / Resumen</label>
                <textarea
                  rows={2}
                  placeholder="Breve resumen o contenido del documento..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Botones */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow disabled:opacity-50"
                >
                  {uploading ? 'Archivando...' : 'Archivar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-800 uppercase mb-3">Nueva Categoría</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Solicitudes de Socios"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Dirección Predeterminada *</label>
                <select
                  value={categoryForm.direction}
                  onChange={(e) => setCategoryForm({ ...categoryForm, direction: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="RECIBIDO">📥 Recibido (Entrada)</option>
                  <option value="ENVIADO">📤 Enviado (Salida)</option>
                  <option value="INTERNO">🏢 Interno</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Notas sobre el uso de esta categoría..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Concepto */}
      {isConceptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-800 uppercase mb-3">Nuevo Concepto / Asunto</h3>
            <form onSubmit={handleCreateConcept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Obras de Techado"
                  value={conceptForm.name}
                  onChange={(e) => setConceptForm({ ...conceptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Alcance temático del concepto..."
                  value={conceptForm.description}
                  onChange={(e) => setConceptForm({ ...conceptForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConceptModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Guardar Concepto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
