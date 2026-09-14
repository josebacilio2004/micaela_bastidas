'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Search,
  Plus,
  X,
  QrCode,
  Printer,
  ShieldCheck,
  UserCheck,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Camera,
  Upload,
  ExternalLink,
  FileCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PadronPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Semáforo de Morosidad y Requerimientos de Pago
  const [morosidadFilter, setMorosidadFilter] = useState<'ALL' | 'AL_DIA' | 'PENDIENTE' | 'MOROSO'>('ALL');
  const [requerimientoMerchant, setRequerimientoMerchant] = useState<any>(null);
  const [loadingRequerimiento, setLoadingRequerimiento] = useState(false);

  // Carnet QR Individual Modal State
  const [carnetMerchant, setCarnetMerchant] = useState<any>(null);

  // Create modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    merchantTypeId: '',
    stallId: '',
    businessCategory: '',
  });

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    merchantTypeId: '',
    stallId: '',
    businessCategory: '',
    status: 'ACTIVO',
  });

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMerchant, setDeletingMerchant] = useState<any>(null);

  // Detail and Carnet states
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  // Categories states
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SOCIO' | 'AMBULANTE_FIJO' | 'AMBULANTE_TEMPORAL'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [merchantsRes, typesRes, stallsRes, catsRes] = await Promise.all([
        apiRequest(`/merchants?search=${encodeURIComponent(search)}${typeFilter ? '&typeId=' + typeFilter : ''}`),
        apiRequest('/merchant-types'),
        apiRequest('/stalls?status=LIBRE'),
        apiRequest('/categories'),
      ]);
      const sorted = Array.isArray(merchantsRes)
        ? [...merchantsRes].sort((a, b) =>
            (a.lastName || '').localeCompare(b.lastName || '', 'es') ||
            (a.firstName || '').localeCompare(b.firstName || '', 'es')
          )
        : [];
      setMerchants(sorted);
      setTypes(typesRes);
      setStalls(stallsRes);
      setCategories(catsRes || []);
      if (!formData.merchantTypeId && typesRes.length > 0) {
        setFormData((prev) => ({ ...prev, merchantTypeId: typesRes[0].id }));
      }
      if (!formData.businessCategory && catsRes && catsRes.length > 0) {
        setFormData((prev) => ({ ...prev, businessCategory: catsRes[0].name }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (merchantId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');
      const res = await fetch(`${apiUrl}/uploads/merchant/${merchantId}/photo`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir foto');
      }
      const data = await res.json();
      alert('✓ Foto de perfil actualizada con éxito');
      fetchData();
      if (selectedMerchant && selectedMerchant.id === merchantId) {
        setSelectedMerchant((prev: any) => ({ ...prev, photoUrl: data.photoUrl }));
      }
    } catch (e: any) {
      alert(e.message || 'Error al subir foto');
    }
  };

  const handleUploadUtilityDocument = async (merchantId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');
      const res = await fetch(`${apiUrl}/uploads/merchant/${merchantId}/utility-document`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir recibo');
      }
      const data = await res.json();
      alert('✓ Recibo de luz y agua subido exitosamente para auditoría y trazabilidad');
      fetchData();
      if (selectedMerchant && selectedMerchant.id === merchantId) {
        setSelectedMerchant((prev: any) => ({
          ...prev,
          utilityBillPdfUrl: data.utilityBillPdfUrl,
          utilityBillUploadedAt: data.uploadedAt,
        }));
      }
    } catch (e: any) {
      alert(e.message || 'Error al subir recibo de luz y agua');
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, typeFilter]);

  const handleTabChange = (tabCode: string) => {
    setActiveTab(tabCode);
    if (tabCode === 'ALL') {
      setTypeFilter('');
    } else {
      const match = types.find((t) => t.code === tabCode);
      if (match) {
        setTypeFilter(match.id);
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, businessCategory: created.name }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRequerimientoModal = async (merchant: any) => {
    setLoadingRequerimiento(true);
    try {
      const fullData = await apiRequest(`/merchants/${merchant.id}`);
      setRequerimientoMerchant(fullData);
    } catch (err: any) {
      alert(err.message || 'Error al obtener datos de deuda del comerciante');
    } finally {
      setLoadingRequerimiento(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dni: formData.dni.trim(),
        phone: formData.phone?.trim() || undefined,
        merchantTypeId: formData.merchantTypeId,
        stallId: formData.stallId && formData.stallId.trim().length > 0 ? formData.stallId.trim() : undefined,
        businessCategory: formData.businessCategory?.trim() || undefined,
      };

      await apiRequest('/merchants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        dni: '',
        phone: '',
        merchantTypeId: types[0]?.id || '',
        stallId: '',
        businessCategory: categories[0]?.name || '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (merchant: any) => {
    setEditingMerchant(merchant);
    setEditFormData({
      firstName: merchant.firstName || '',
      lastName: merchant.lastName || '',
      dni: merchant.dni || '',
      phone: merchant.phone || '',
      merchantTypeId: merchant.merchantTypeId || merchant.merchantType?.id || '',
      stallId: merchant.stallId || merchant.stall?.id || '',
      businessCategory: merchant.businessCategory || '',
      status: merchant.status || 'ACTIVO',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchant) return;

    try {
      const payload: any = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        dni: editFormData.dni.trim(),
        phone: editFormData.phone?.trim() || undefined,
        merchantTypeId: editFormData.merchantTypeId,
        stallId: editFormData.stallId && editFormData.stallId.trim().length > 0 ? editFormData.stallId.trim() : null,
        businessCategory: editFormData.businessCategory?.trim() || undefined,
        status: editFormData.status,
      };

      await apiRequest(`/merchants/${editingMerchant.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setIsEditModalOpen(false);
      setEditingMerchant(null);
      fetchData();
      if (selectedMerchant?.id === editingMerchant.id) {
        viewDetails(editingMerchant.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openDeleteModal = (merchant: any) => {
    setDeletingMerchant(merchant);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMerchant) return;

    try {
      await apiRequest(`/merchants/${deletingMerchant.id}`, {
        method: 'DELETE',
      });
      setIsDeleteModalOpen(false);
      setDeletingMerchant(null);
      if (selectedMerchant?.id === deletingMerchant.id) {
        setSelectedMerchant(null);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const full = await apiRequest(`/merchants/${id}`);
      setSelectedMerchant(full);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCarnet = (merchant: any) => {
    setCarnetMerchant(merchant);
  };

  const handlePrintCarnet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Padrón de Comerciantes</h1>
          <p className="text-xs text-slate-500">
            Administración integral (CRUD), asignación de puestos, credencial digital QR y periodicidades de cobro diferenciadas.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Comerciante</span>
        </button>
      </div>

      {/* Subdivisión por Periodicidad de Cobro */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleTabChange('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Todos los Comerciantes
        </button>
        <button
          onClick={() => handleTabChange('SOCIO')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'SOCIO'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <span>🏛️ Socios Titulares</span>
          <span className="text-[10px] bg-emerald-100/50 text-current px-1.5 py-0.2 rounded">Mensual</span>
        </button>
        <button
          onClick={() => handleTabChange('AMBULANTE_FIJO')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'AMBULANTE_FIJO'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span>🛒 Ambulantes Fijos</span>
          <span className="text-[10px] bg-amber-100/50 text-current px-1.5 py-0.2 rounded">Diario (+ Agua mes)</span>
        </button>
        <button
          onClick={() => handleTabChange('AMBULANTE_TEMPORAL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'AMBULANTE_TEMPORAL'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
          }`}
        >
          <span>🎪 Ambulantes Temporales</span>
          <span className="text-[10px] bg-sky-100/50 text-current px-1.5 py-0.2 rounded">Diario</span>
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombres, Puesto o Código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              const t = types.find((x) => x.id === e.target.value);
              setActiveTab(t ? t.code : 'ALL');
            }}
            className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs font-medium"
          >
            <option value="">Todos los Tipos</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Semáforo de Morosidad Histórica Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-slate-400 uppercase text-[10px] tracking-wider mr-1">Semáforo de Deuda:</span>
          <button
            onClick={() => setMorosidadFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition ${
              morosidadFilter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({merchants.length})
          </button>
          <button
            onClick={() => setMorosidadFilter('AL_DIA')}
            className={`px-3 py-1.5 rounded-xl transition ${
              morosidadFilter === 'AL_DIA' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            🟢 Al Día ({merchants.filter((m) => (m._count?.obligations || 0) === 0).length})
          </button>
          <button
            onClick={() => setMorosidadFilter('PENDIENTE')}
            className={`px-3 py-1.5 rounded-xl transition ${
              morosidadFilter === 'PENDIENTE' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            🟡 1 Mes Retraso ({merchants.filter((m) => (m._count?.obligations || 0) === 1).length})
          </button>
          <button
            onClick={() => setMorosidadFilter('MOROSO')}
            className={`px-3 py-1.5 rounded-xl transition ${
              morosidadFilter === 'MOROSO' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            🔴 Morosos (+2 meses) ({merchants.filter((m) => (m._count?.obligations || 0) >= 2).length})
          </button>
        </div>
        <p className="text-[11px] text-slate-400 italic hidden sm:block">
          Cuentas por cobrar para control previo a Asambleas Generales
        </p>
      </div>

      {/* Tabla del Padrón con Acciones CRUD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Comerciante</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Puesto</th>
              <th className="py-3 px-4">Rubro</th>
              <th className="py-3 px-4">Recibo Luz / Agua</th>
              <th className="py-3 px-4">Semáforo Deuda</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Cargando padrón...</td></tr>
            ) : merchants.filter((m) => {
                const count = m._count?.obligations || 0;
                if (morosidadFilter === 'AL_DIA') return count === 0;
                if (morosidadFilter === 'PENDIENTE') return count === 1;
                if (morosidadFilter === 'MOROSO') return count >= 2;
                return true;
              }).length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">No se encontraron comerciantes con este filtro.</td></tr>
            ) : (
              merchants
                .filter((m) => {
                  const count = m._count?.obligations || 0;
                  if (morosidadFilter === 'AL_DIA') return count === 0;
                  if (morosidadFilter === 'PENDIENTE') return count === 1;
                  if (morosidadFilter === 'MOROSO') return count >= 2;
                  return true;
                })
                .map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{m.internalCode}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative group flex-shrink-0">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={`${m.lastName}`}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {m.lastName?.[0] || 'C'}
                          </div>
                        )}
                        <label
                          htmlFor={`photo-upload-${m.id}`}
                          className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Subir / Cambiar Foto"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </label>
                        <input
                          id={`photo-upload-${m.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadPhoto(m.id, file);
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{m.lastName}, {m.firstName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono">{m.dni}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {m.merchantType.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {m.stall ? (
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {m.stall.code}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Ambulatorio</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{m.businessCategory || '-'}</td>
                  <td className="py-3 px-4">
                    {m.utilityBillPdfUrl ? (
                      <div className="flex items-center space-x-1.5">
                        <a
                          href={m.utilityBillPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition"
                          title="Abrir Recibo de Luz y Agua (PDF)"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-sky-600" />
                          <span>Ver PDF</span>
                        </a>
                        <label
                          htmlFor={`doc-replace-${m.id}`}
                          className="cursor-pointer p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Reemplazar Recibo"
                        >
                          <Upload className="w-3 h-3" />
                        </label>
                        <input
                          id={`doc-replace-${m.id}`}
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadUtilityDocument(m.id, file);
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor={`doc-upload-${m.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer hover:bg-amber-100 transition"
                          title="Subir Recibo de Luz y Agua en PDF"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          <span>+ Recibo PDF</span>
                        </label>
                        <input
                          id={`doc-upload-${m.id}`}
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadUtilityDocument(m.id, file);
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {(m._count?.obligations || 0) === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        Al día
                      </span>
                    ) : (m._count?.obligations || 0) === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                        1 mes pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                        Moroso ({m._count.obligations} meses)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Carnet QR */}
                      <button
                        onClick={() => openCarnet(m)}
                        title="Ver e Imprimir Carnet QR"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      {/* Carta de Requerimiento de Pago para Asambleas */}
                      <button
                        onClick={() => openRequerimientoModal(m)}
                        title="Emitir Carta de Requerimiento de Pago para Asamblea"
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {/* Detalle / Cta Cte */}
                      <button
                        onClick={() => viewDetails(m.id)}
                        title="Ver Cuenta Corriente y Pagos"
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-[11px]"
                      >
                        Cta. Cte.
                      </button>
                      {/* Editar Comerciante */}
                      <button
                        onClick={() => openEditModal(m)}
                        title="Editar datos del comerciante"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {/* Dar de Baja / Eliminar */}
                      <button
                        onClick={() => openDeleteModal(m)}
                        title="Dar de baja comerciante"
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Crear Nuevo Comerciante */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Nuevo Registro de Comerciante</h2>
            <p className="text-xs text-slate-500 mb-4">Se generarán automáticamente sus obligaciones pendientes del período según su periodicidad.</p>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold text-slate-700 block mb-1">Nombres</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" /></div>
                <div><label className="font-bold text-slate-700 block mb-1">Apellidos</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold text-slate-700 block mb-1">DNI (8 dígitos)</label><input type="text" required maxLength={8} value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-mono" /></div>
                <div><label className="font-bold text-slate-700 block mb-1">Teléfono</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Comerciante</label>
                  <select value={formData.merchantTypeId} onChange={(e) => setFormData({ ...formData, merchantTypeId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-medium">
                    {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label>
                  <select value={formData.stallId} onChange={(e) => setFormData({ ...formData, stallId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 font-medium">
                    <option value="">Sin puesto (Ambulante)</option>
                    {stalls.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.sector.name}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Rubro / Giro Comercial</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    {isAddingCategory ? 'Cancelar nuevo' : '+ Crear nuevo rubro'}
                  </button>
                </div>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre del nuevo rubro..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 border border-emerald-300 rounded-lg p-2 bg-emerald-50/30 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.businessCategory}
                    onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Seleccione un rubro...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow hover:bg-emerald-700">Guardar Comerciante</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Comerciante (UPDATE CRUD) */}
      {isEditModalOpen && editingMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Editar Comerciante</h2>
            <p className="text-xs text-slate-500 mb-4">
              Código: <span className="font-mono font-bold text-emerald-700">{editingMerchant.internalCode}</span> • Actualice los datos personales y de ubicación.
            </p>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DNI (8 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={editFormData.dni}
                    onChange={(e) => setEditFormData({ ...editFormData, dni: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Comerciante</label>
                  <select
                    value={editFormData.merchantTypeId}
                    onChange={(e) => setEditFormData({ ...editFormData, merchantTypeId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label>
                  <select
                    value={editFormData.stallId}
                    onChange={(e) => setEditFormData({ ...editFormData, stallId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Sin puesto (Ambulante)</option>
                    {editingMerchant.stall && (
                      <option value={editingMerchant.stall.id}>
                        {editingMerchant.stall.code} (Actual)
                      </option>
                    )}
                    {stalls
                      .filter((s) => s.id !== editingMerchant.stallId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.sector?.name || 'Sector'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rubro / Giro Comercial</label>
                  <select
                    value={editFormData.businessCategory}
                    onChange={(e) => setEditFormData({ ...editFormData, businessCategory: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Seleccione un rubro...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estado de Operación</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="ACTIVO">ACTIVO (Habilitado)</option>
                    <option value="INACTIVO">INACTIVO (Suspendido temporalmente)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Eliminar / Dar de Baja Lógica (DELETE CRUD) */}
      {isDeleteModalOpen && deletingMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase">Dar de Baja Comerciante</h3>
                <p className="text-xs text-slate-500">Confirmación de baja administrativa</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100 text-xs">
              <p className="font-bold text-slate-800">{deletingMerchant.lastName}, {deletingMerchant.firstName}</p>
              <p className="text-slate-500 font-mono mt-0.5">DNI: {deletingMerchant.dni} • Puesto: {deletingMerchant.stall?.code || 'Ambulatorio'}</p>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ¿Está seguro de dar de baja a este comerciante? Esta acción <strong className="text-red-700">liberará inmediatamente su puesto asignado</strong> pero conservará de forma segura su historial contable de pagos y asistencias para fines de auditoría.
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow hover:bg-red-700 text-xs"
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Detalle del Comerciante y Cuenta Corriente */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedMerchant(null)} className="absolute right-4 top-4 text-slate-400"><X className="w-5 h-5" /></button>
            
            <div className="flex justify-between items-start mb-4 pr-6">
              <div className="flex items-start space-x-3">
                <div className="relative group flex-shrink-0">
                  {selectedMerchant.photoUrl ? (
                    <img
                      src={selectedMerchant.photoUrl}
                      alt={selectedMerchant.lastName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center font-black text-xl shadow-md">
                      {selectedMerchant.lastName?.[0] || 'C'}
                    </div>
                  )}
                  <label
                    htmlFor={`modal-photo-${selectedMerchant.id}`}
                    className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Subir / Cambiar Foto"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Cambiar</span>
                  </label>
                  <input
                    id={`modal-photo-${selectedMerchant.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPhoto(selectedMerchant.id, file);
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase">
                    {selectedMerchant.lastName}, {selectedMerchant.firstName}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 font-mono mt-1">
                    <span>DNI: {selectedMerchant.dni}</span>
                    <span>•</span>
                    <span>Cód: {selectedMerchant.internalCode}</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-800">{selectedMerchant.merchantType?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(selectedMerchant)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => openCarnet(selectedMerchant)}
                  className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                >
                  <QrCode className="w-3.5 h-3.5" /> Carnet QR
                </button>
              </div>
            </div>

            {/* Ficha de Trazabilidad Documental (Recibo de Luz y Agua) */}
            <div className="bg-sky-50/60 border border-sky-200 p-3.5 rounded-2xl mb-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sky-700" />
                  <span className="font-black text-slate-800 uppercase tracking-tight text-[11px]">
                    Trazabilidad de Trayectoria • Recibo de Luz y Agua (PDF)
                  </span>
                </div>
                {selectedMerchant.utilityBillPdfUrl && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Documento Verificado
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-sky-100">
                <div className="text-[11px] text-slate-600">
                  {selectedMerchant.utilityBillPdfUrl ? (
                    <p>
                      Comprobante digital adjunto. Trazabilidad de operación activa para fiscalización.
                    </p>
                  ) : (
                    <p className="text-amber-700 font-semibold">
                      ⚠️ Este socio aún no ha presentado su recibo de servicios (luz/agua) para su legajo histórico.
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {selectedMerchant.utilityBillPdfUrl && (
                    <a
                      href={selectedMerchant.utilityBillPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs shadow-sm flex items-center space-x-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Recibo PDF</span>
                    </a>
                  )}

                  <label
                    htmlFor={`modal-doc-${selectedMerchant.id}`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedMerchant.utilityBillPdfUrl ? 'Reemplazar PDF' : 'Subir Recibo PDF'}</span>
                  </label>
                  <input
                    id={`modal-doc-${selectedMerchant.id}`}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadUtilityDocument(selectedMerchant.id, file);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Puesto Asignado</span>
                <span className="font-bold text-slate-800 text-sm">{selectedMerchant.stall ? selectedMerchant.stall.code : 'Sin Puesto'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Rubro / Giro</span>
                <span className="font-bold text-slate-800 text-sm">{selectedMerchant.businessCategory || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Teléfono de Contacto</span>
                <span className="font-bold text-slate-800 text-sm">{selectedMerchant.phone || 'No registrado'}</span>
              </div>
            </div>

            <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 mb-2">Obligaciones de Pago (Cuenta Corriente)</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Período</th>
                    <th className="p-2.5">Concepto</th>
                    <th className="p-2.5">Monto</th>
                    <th className="p-2.5">Vencimiento</th>
                    <th className="p-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMerchant.obligations?.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin obligaciones registradas.</td></tr>
                  ) : (
                    selectedMerchant.obligations?.map((ob: any) => (
                      <tr key={ob.id}>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{ob.period}</td>
                        <td className="p-2.5">{ob.concept.name}</td>
                        <td className="p-2.5 font-black text-slate-800 font-mono">S/ {Number(ob.amount).toFixed(2)}</td>
                        <td className="p-2.5 font-mono text-slate-500">{new Date(ob.dueDate).toLocaleDateString('es-PE')}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ob.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {ob.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="font-black text-xs uppercase tracking-wider text-slate-700 mb-2">Historial de Cobranzas Recibidas</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-2.5">Operación</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Concepto</th>
                    <th className="p-2.5">Monto</th>
                    <th className="p-2.5">Cajero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMerchant.payments?.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin pagos registrados.</td></tr>
                  ) : (
                    selectedMerchant.payments?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">{p.operationNumber}</td>
                        <td className="p-2.5 font-mono text-slate-500">{new Date(p.paidAt).toLocaleDateString('es-PE')}</td>
                        <td className="p-2.5">{p.concept?.name}</td>
                        <td className="p-2.5 font-black text-slate-800 font-mono">S/ {Number(p.amount).toFixed(2)}</td>
                        <td className="p-2.5 text-slate-500">{p.collectedBy?.fullName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Carnet Digital QR Imprimible */}
      {carnetMerchant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCarnetMerchant(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Carnet Card */}
            <div id="printable-carnet" className="border-2 border-emerald-600 rounded-2xl p-5 bg-gradient-to-b from-emerald-50/50 via-white to-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600" />
              
              <div className="flex items-center justify-center space-x-2 mb-2 pt-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Mercado de Abastos Micaela Bastidas
                </span>
              </div>
              
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Credencial Oficial de Comerciante
              </p>

              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-black text-lg mx-auto flex items-center justify-center border-2 border-emerald-400 mb-2 shadow-inner">
                {carnetMerchant.firstName[0]}{carnetMerchant.lastName[0]}
              </div>

              <h3 className="font-black text-slate-900 text-sm leading-snug">
                {carnetMerchant.lastName}, {carnetMerchant.firstName}
              </h3>
              
              <div className="inline-block mt-1 mb-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                {carnetMerchant.merchantType?.name || 'Socio'}
              </div>

              <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-2.5 rounded-xl text-[11px] mb-3 border border-slate-100">
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 block uppercase">DNI</span>
                  <span className="font-mono font-bold text-slate-800">{carnetMerchant.dni}</span>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 block uppercase">Código</span>
                  <span className="font-mono font-bold text-emerald-700">{carnetMerchant.internalCode}</span>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 block uppercase">Puesto</span>
                  <span className="font-bold text-slate-800">{carnetMerchant.stall ? carnetMerchant.stall.code : 'Ambulante'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-slate-400 block uppercase">Rubro</span>
                  <span className="font-medium text-slate-700 truncate block">{carnetMerchant.businessCategory || 'Venta'}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-sm">
                <QRCodeSVG
                  value={carnetMerchant.qrCode || `MB-QR-${carnetMerchant.dni}`}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="mt-2 font-mono text-[9px] font-bold text-slate-500 tracking-wider">
                {carnetMerchant.qrCode || `MB-QR-${carnetMerchant.dni}`}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[8px] text-slate-400 leading-tight">
                Válido para cobros en puesto, pagos directos y asistencia a Asambleas Generales con Quórum en tiempo real.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-4 flex space-x-2 print:hidden">
              <button
                onClick={handlePrintCarnet}
                className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Credencial</span>
              </button>
              <button
                onClick={() => setCarnetMerchant(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 font-bold text-slate-600 rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Carta de Requerimiento de Pago (A4 Imprimible) */}
      {requerimientoMerchant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRequerimientoMerchant(null);
          }}
        >
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl my-8 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setRequerimientoMerchant(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 print:hidden p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Document Container (A4 layout) */}
            <div id="printable-requerimiento" className="text-slate-900 text-xs leading-relaxed space-y-4">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src="/logo.png" alt="Logo" className="w-14 h-14 rounded-full border border-amber-400/40 object-cover" />
                  <div>
                    <h1 className="font-black text-sm uppercase tracking-wide">Asociación de Comerciantes del Mercado</h1>
                    <h2 className="font-extrabold text-base text-emerald-800 uppercase tracking-tight">Micaela Bastidas</h2>
                    <p className="text-[10px] text-slate-500 italic">Personería Jurídica N° 2026-MB • Fundado para el progreso y abasto popular</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-600">
                  <p className="font-bold text-slate-900">NOTIFICACIÓN OFICIAL</p>
                  <p>N° REQ-2026-{requerimientoMerchant.dni?.slice(-4) || '0001'}</p>
                  <p>{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Subject & Recipient */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><b>SEÑOR(A):</b> {requerimientoMerchant.lastName}, {requerimientoMerchant.firstName}</p>
                <p><b>DNI:</b> <span className="font-mono">{requerimientoMerchant.dni}</span> | <b>CÓDIGO:</b> <span className="font-mono">{requerimientoMerchant.internalCode}</span></p>
                <p><b>CONDICIÓN:</b> {requerimientoMerchant.merchantType?.name} | <b>PUESTO / ESPACIO:</b> {requerimientoMerchant.stall?.code || 'Puesto Ambulatorio'}</p>
                <p className="pt-1 text-red-700 font-bold">
                  <b>ASUNTO:</b> REQUERIMIENTO FORMAL DE REGULARIZACIÓN DE CUOTAS IMPAGAS PREVIO A ASAMBLEA GENERAL ORDINARIA
                </p>
              </div>

              {/* Letter Body */}
              <div className="text-justify text-xs space-y-2 leading-relaxed">
                <p>De nuestra consideración:</p>
                <p>
                  Por medio del presente documento, la <b>Junta Directiva y la Tesorería General del Mercado Micaela Bastidas</b> ponen en su conocimiento formal que, habiéndose revisado el estado de cuenta corriente individual en el Sistema Oficial de Cobranza, a la fecha registra obligaciones vencidas pendientes de pago:
                </p>
              </div>

              {/* Table of Obligations */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">Período</th>
                      <th className="p-2.5">Concepto</th>
                      <th className="p-2.5">Vencimiento</th>
                      <th className="p-2.5 text-right">Importe (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {requerimientoMerchant.obligations?.filter((o: any) => o.status === 'PENDIENTE').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                          El comerciante se encuentra actualmente al día sin cuotas pendientes.
                        </td>
                      </tr>
                    ) : (
                      requerimientoMerchant.obligations?.filter((o: any) => o.status === 'PENDIENTE').map((ob: any) => (
                        <tr key={ob.id}>
                          <td className="p-2.5 font-mono font-bold">{ob.period}</td>
                          <td className="p-2.5">{ob.concept?.name}</td>
                          <td className="p-2.5 font-mono text-slate-500">{new Date(ob.dueDate).toLocaleDateString('es-PE')}</td>
                          <td className="p-2.5 text-right font-black font-mono">S/ {Number(ob.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-slate-50 font-black">
                      <td colSpan={3} className="p-2.5 text-right uppercase">TOTAL DEUDA EXIGIBLE:</td>
                      <td className="p-2.5 text-right font-mono text-sm text-red-700">
                        S/ {requerimientoMerchant.obligations?.filter((o: any) => o.status === 'PENDIENTE').reduce((acc: number, o: any) => acc + Number(o.amount), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Warning & Statutory terms */}
              <div className="text-xs text-justify space-y-2">
                <p>
                  <b>PLAZO Y CONSECUENCIAS ESTATUTARIAS:</b> Se le concede un plazo perentorio de <b>cuarenta y ocho (48) horas hábiles</b> a partir de la recepción de la presente para apersonarse a la ventanilla de Tesorería a subsanar el adeudo pendiente.
                </p>
                <p className="text-[11px] text-slate-600 italic">
                  Se recuerda que, de acuerdo con el Art. 24 del Estatuto de la Asociación, los comerciantes con 2 o más cuotas en condición de morosidad quedarán inhabilitados para ejercer su derecho a voz y voto en la próxima Asamblea General, así como pasibles de las sanciones administrativas reglamentarias.
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-700 pt-1.5 font-bold">
                    PRESIDENTE DE LA ASOCIACIÓN
                  </div>
                  <p className="text-[10px] text-slate-400">Junta Directiva General</p>
                </div>
                <div>
                  <div className="border-t border-slate-700 pt-1.5 font-bold">
                    TESORERÍA GENERAL
                  </div>
                  <p className="text-[10px] text-slate-400">Control y Recaudación</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setRequerimientoMerchant(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Carta Notificatoria (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARNET QR INDIVIDUAL CON FOTO Y QR */}
      {carnetMerchant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCarnetMerchant(null);
          }}
        >
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <button
              onClick={() => setCarnetMerchant(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 print:hidden p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4 print:hidden">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Credencial Oficial de Comerciante
                </h3>
                <p className="text-[11px] text-slate-500">Carnet con Foto y Código QR para identificación y cobranza</p>
              </div>
            </div>

            {/* Carnet Card Frame */}
            <div className="border-2 border-dashed border-emerald-600/70 p-5 rounded-2xl bg-white shadow-md relative">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <div className="flex items-center space-x-2.5">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-9 h-9 rounded-full border border-amber-400/50 object-cover"
                  />
                  <div>
                    <p className="font-black text-xs text-slate-900 leading-tight uppercase">
                      MERCADO DE ABASTOS
                    </p>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">
                      MICAELA BASTIDAS
                    </p>
                  </div>
                </div>
                <div className="bg-emerald-700 text-white px-3 py-1 rounded-xl text-right">
                  <p className="text-[8px] uppercase font-bold text-emerald-200 leading-tight">PUESTO</p>
                  <p className="text-lg font-black font-mono leading-tight">
                    {carnetMerchant.stall?.code || 'AMB'}
                  </p>
                </div>
              </div>

              {/* Body: Foto Izquierda, Datos Centro, QR Derecha */}
              <div className="flex items-center gap-3 py-1">
                {/* Foto Oficial */}
                <div className="flex-shrink-0">
                  {carnetMerchant.photoUrl ? (
                    <img
                      src={carnetMerchant.photoUrl}
                      alt={carnetMerchant.lastName}
                      className="w-24 h-28 object-cover rounded-xl border-2 border-emerald-600/40 shadow-sm bg-slate-50"
                    />
                  ) : (
                    <div className="w-24 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Camera className="w-7 h-7 text-slate-300 mb-1" />
                      <span className="text-[8px] font-bold leading-tight">Sin Foto Oficial</span>
                    </div>
                  )}
                </div>

                {/* Datos del Comerciante */}
                <div className="text-xs space-y-1 flex-1 min-w-0">
                  <div>
                    <p className="text-[8px] font-bold uppercase text-slate-400">Titular Identificado</p>
                    <p className="font-black text-slate-900 text-sm leading-snug truncate">
                      {carnetMerchant.lastName}, {carnetMerchant.firstName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-0.5">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-slate-400 block">DNI</span>
                      <span className="font-mono font-bold text-slate-800">{carnetMerchant.dni}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase text-slate-400 block">Código</span>
                      <span className="font-mono font-bold text-emerald-800">{carnetMerchant.internalCode}</span>
                    </div>
                  </div>

                  <div className="pt-0.5 text-[11px]">
                    <span className="text-[8px] font-bold uppercase text-slate-400 block">Giro / Condición</span>
                    <span className="font-semibold text-slate-700 block truncate">
                      {carnetMerchant.businessCategory || 'Comercio General'} • {carnetMerchant.merchantType?.name || 'Socio'}
                    </span>
                  </div>
                </div>

                {/* Código QR */}
                <div className="p-2 border-2 border-emerald-600/40 rounded-xl bg-slate-50 flex-shrink-0 flex flex-col items-center justify-center">
                  <QRCodeSVG
                    value={carnetMerchant.qrCode || `MB-QR-${carnetMerchant.dni}`}
                    size={95}
                    level="H"
                    includeMargin={false}
                  />
                  <p className="text-[8px] font-mono text-center text-slate-500 mt-1 font-black uppercase">
                    Escanear QR
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
                <span>Válido para Cobranza, Asambleas y Arqueo</span>
                <span className="font-mono font-bold text-emerald-700">QR Oficial 2026</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setCarnetMerchant(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Carnet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
