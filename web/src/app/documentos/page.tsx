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
} from 'lucide-react';

const CONCEPTS = [
  { id: 'ALL', label: 'Todos los Documentos' },
  { id: 'CONTRATO', label: 'Contratos de Puesto / Alquiler' },
  { id: 'ACTA', label: 'Actas de Asamblea y Reunión' },
  { id: 'OFICIO', label: 'Oficios y Comunicaciones' },
  { id: 'RESOLUCION', label: 'Resoluciones Directivas' },
  { id: 'RECIBO_SERVICIO', label: 'Recibos y Facturas de Servicios' },
  { id: 'INFORME', label: 'Informes Contables / Balances' },
  { id: 'OTROS', label: 'Otros Documentos Oficiales' },
];

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConcept, setSelectedConcept] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [merchants, setMerchants] = useState<any[]>([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    concept: 'CONTRATO',
    description: '',
    merchantId: '',
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = `/documents?${selectedConcept !== 'ALL' ? 'concept=' + selectedConcept + '&' : ''}${search ? 'search=' + encodeURIComponent(search) : ''}`;
      const res = await apiRequest(url);
      setDocuments(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async () => {
    try {
      const res = await apiRequest('/merchants');
      setMerchants(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedConcept]);

  useEffect(() => {
    fetchMerchants();
  }, []);

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
      alert('Por favor selecciona un archivo para subir');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', uploadForm.title.trim());
      formData.append('concept', uploadForm.concept);
      if (uploadForm.description) formData.append('description', uploadForm.description.trim());
      if (uploadForm.merchantId) formData.append('merchantId', uploadForm.merchantId);

      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');

      const res = await fetch(`${apiUrl}/documents/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir documento');
      }

      alert('✓ Documento subido y clasificado exitosamente');
      setIsUploadModalOpen(false);
      setFileToUpload(null);
      setUploadForm({ title: '', concept: 'CONTRATO', description: '', merchantId: '' });
      fetchDocuments();
    } catch (e: any) {
      alert(e.message || 'Error en la subida');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento del repositorio?')) return;
    try {
      await apiRequest(`/documents/${id}`, { method: 'DELETE' });
      alert('Documento eliminado');
      fetchDocuments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/D';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getConceptColor = (concept: string) => {
    switch (concept) {
      case 'CONTRATO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACTA':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OFICIO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLUCION':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RECIBO_SERVICIO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INFORME':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión Documental del Mercado</h1>
          <p className="text-xs text-slate-500">
            Almacenamiento oficial, clasificación automática por conceptos, contratos y trazabilidad legal.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Subir Nuevo Documento</span>
        </button>
      </div>

      {/* Concept Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CONCEPTS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedConcept(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedConcept === c.id
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, código (DOC-...) o contenido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
        >
          Buscar
        </button>
      </form>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando repositorio documental...</div>
      ) : documents.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No se encontraron documentos en este concepto</p>
          <p className="text-xs text-slate-400 mt-1">Haz clic en &quot;Subir Nuevo Documento&quot; para archivar actas, contratos o recibos.</p>
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
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${getConceptColor(doc.concept)}`}>
                    {doc.concept}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-400">{doc.code}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">{doc.title}</h3>
                {doc.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{doc.description}</p>}

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
                  <span>{doc.fileType}</span>
                  <span>•</span>
                  <span>{formatSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                    title="Ver / Descargar"
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

      {/* Modal Subir Documento */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Subir Documento al Repositorio</h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título del Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Contrato Arrendamiento Puesto A-11 2026"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Concepto / Categoría *</label>
                  <select
                    value={uploadForm.concept}
                    onChange={(e) => setUploadForm({ ...uploadForm, concept: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CONCEPTS.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Comerciante Vinculado (Opcional)</label>
                  <select
                    value={uploadForm.merchantId}
                    onChange={(e) => setUploadForm({ ...uploadForm, merchantId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Sin vincular --</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.lastName}, {m.firstName} ({m.dni})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre resolución, número de folios, firmas, etc."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Archivo (PDF, Imagen, Documento) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">Formatos admitidos: PDF, Word, Excel, JPG, PNG (Hasta 30MB).</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Subiendo...' : 'Guardar en Repositorio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
