'use client';
import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  Users,
  Building2,
  ShoppingBag,
  IdCard,
  FolderOpen,
  FileCheck2,
  Eye,
  Download,
  FolderPlus,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PadronPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Filtros de Clasificación
  // Grupo Principal: 'ALL' | 'SOCIO' | 'INQUILINO' | 'AMBULANTE'
  const [activeGroup, setActiveGroup] = useState<'ALL' | 'SOCIO' | 'INQUILINO' | 'AMBULANTE'>('ALL');
  // Subfiltro de Socios: 'ALL' | 'SOCIO_REGULAR' | 'SOCIO_EN_PRUEBA'
  const [socioConditionFilter, setSocioConditionFilter] = useState<'ALL' | 'SOCIO_REGULAR' | 'SOCIO_EN_PRUEBA'>('ALL');
  // Subfiltro de Ambulantes: 'ALL' | 'AMBULANTE_FIJO' | 'AMBULANTE_TEMPORAL'
  const [ambulanteTypeFilter, setAmbulanteTypeFilter] = useState<'ALL' | 'AMBULANTE_FIJO' | 'AMBULANTE_TEMPORAL'>('ALL');
  // Filtro por Giro / Rubro Comercial
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Semáforo de Morosidad
  const [morosidadFilter, setMorosidadFilter] = useState<'ALL' | 'AL_DIA' | 'PENDIENTE' | 'MOROSO'>('ALL');
  const [requerimientoMerchant, setRequerimientoMerchant] = useState<any>(null);
  const [loadingRequerimiento, setLoadingRequerimiento] = useState(false);

  // Carnet QR Individual Modal State
  const [carnetMerchant, setCarnetMerchant] = useState<any>(null);

  // Expediente / Legajo Digital de Documentos por Comerciante
  const [docMerchant, setDocMerchant] = useState<any>(null);
  const [merchantDocs, setMerchantDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docFilterConcept, setDocFilterConcept] = useState('ALL');
  const [docSearch, setDocSearch] = useState('');
  const [docYearFilter, setDocYearFilter] = useState('ALL');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocUploadForm, setShowDocUploadForm] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    title: '',
    concept: 'IDENTIDAD',
    externalNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Modal Padrón de Asamblea (Formato Imprimible / Excel)
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [assemblyTitle, setAssemblyTitle] = useState('ASAMBLEA GENERAL EXTRAORDINARIA');
  const [assemblyDate, setAssemblyDate] = useState('04-02-2022');

  // Create modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    merchantTypeId: '',
    memberCondition: 'SOCIO_REGULAR',
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
    memberCondition: 'SOCIO_REGULAR',
    stallId: '',
    businessCategory: '',
    status: 'ACTIVO',
  });

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMerchant, setDeletingMerchant] = useState<any>(null);

  // Detail modal state
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  // New Category inline creation
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [merchantsRes, typesRes, stallsRes, catsRes] = await Promise.all([
        apiRequest(`/merchants?search=${encodeURIComponent(search)}`),
        apiRequest('/merchant-types'),
        apiRequest('/stalls?status=LIBRE'),
        apiRequest('/categories'),
      ]);
      setMerchants(Array.isArray(merchantsRes) ? merchantsRes : []);
      setTypes(typesRes || []);
      setStalls(stallsRes || []);
      setCategories(catsRes || []);

      if (!formData.merchantTypeId && typesRes && typesRes.length > 0) {
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

  useEffect(() => {
    fetchData();
  }, [search]);

  // Subir Foto de Perfil
  const handleUploadPhoto = async (merchantId: string, file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');
      const res = await fetch(`${apiUrl}/uploads/merchant/${merchantId}/photo`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
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
      if (carnetMerchant && carnetMerchant.id === merchantId) {
        setCarnetMerchant((prev: any) => ({ ...prev, photoUrl: data.photoUrl }));
      }
    } catch (e: any) {
      alert(e.message || 'Error al subir foto');
    }
  };

  // Subir Recibo de Luz y Agua (PDF/JPG)
  const handleUploadUtilityDocument = async (merchantId: string, file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');
      const res = await fetch(`${apiUrl}/uploads/merchant/${merchantId}/utility-document`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
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

  // Subir Documento DNI (PDF/JPG)
  const handleUploadDniDocument = async (merchantId: string, file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');
      const res = await fetch(`${apiUrl}/uploads/merchant/${merchantId}/dni-document`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir DNI');
      }
      const data = await res.json();
      alert('✓ DNI digital escaneado y archivado exitosamente');
      fetchData();
      if (selectedMerchant && selectedMerchant.id === merchantId) {
        setSelectedMerchant((prev: any) => ({
          ...prev,
          dniDocumentUrl: data.dniDocumentUrl,
          dniDocumentUploadedAt: data.uploadedAt,
        }));
      }
    } catch (e: any) {
      alert(e.message || 'Error al subir documento DNI');
    }
  };

  // --- EXPEDIENTE Y LEGAJO DIGITAL POR COMERCIANTE ---
  const fetchMerchantDocs = async (merchantId: string) => {
    try {
      setLoadingDocs(true);
      const res = await apiRequest(`/documents?merchantId=${merchantId}`);
      setMerchantDocs(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching merchant docs:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const openMerchantDocsModal = (merchant: any) => {
    setDocMerchant(merchant);
    setShowDocUploadForm(false);
    setDocFilterConcept('ALL');
    setDocSearch('');
    setDocYearFilter('ALL');
    fetchMerchantDocs(merchant.id);
  };

  const handleUploadMerchantDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocFile || !docMerchant) {
      alert('Por favor seleccione un archivo para subir');
      return;
    }

    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', newDocFile);
      formData.append('title', newDocForm.title.trim() || newDocFile.name);
      formData.append('concept', newDocForm.concept);
      if (newDocForm.externalNumber.trim()) formData.append('externalNumber', newDocForm.externalNumber.trim());
      if (newDocForm.documentDate) formData.append('documentDate', newDocForm.documentDate);
      if (newDocForm.description.trim()) formData.append('description', newDocForm.description.trim());
      formData.append('merchantId', docMerchant.id);

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
        throw new Error(err.message || 'Error al subir documento al expediente');
      }

      alert('✓ Documento archivado correctamente en el expediente digital');
      setNewDocFile(null);
      setNewDocForm({
        title: '',
        concept: 'IDENTIDAD',
        externalNumber: '',
        documentDate: new Date().toISOString().split('T')[0],
        description: '',
      });
      setShowDocUploadForm(false);
      fetchMerchantDocs(docMerchant.id);
      fetchData(); // actualizar contador
    } catch (err: any) {
      alert(err.message || 'Error al subir documento');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteMerchantDoc = async (docId: string) => {
    if (!confirm('¿Está seguro de eliminar este documento del expediente?')) return;
    try {
      await apiRequest(`/documents/${docId}`, { method: 'DELETE' });
      alert('✓ Documento retirado del expediente');
      if (docMerchant) {
        fetchMerchantDocs(docMerchant.id);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
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

  const exportAssemblyExcel = () => {
    const socios = merchants
      .filter((m) => m.merchantType?.code === 'SOCIO')
      .sort((a, b) => {
        const condA = a.memberCondition === 'SOCIO_REGULAR' ? 0 : 1;
        const condB = b.memberCondition === 'SOCIO_REGULAR' ? 0 : 1;
        if (condA !== condB) return condA - condB;
        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      });

    let csvContent = '\uFEFF';
    csvContent += 'ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS\r\n';
    csvContent += '"MICAELA BASTIDAS"\r\n';
    csvContent += `PADRÓN DE SOCIOS ASISTENTES A LA ${assemblyTitle}       ${assemblyDate}\r\n\r\n`;
    csvContent += 'N°;APELLIDOS Y NOMBRES;DNI;CONDICION;FIRMA;HUELLA\r\n';

    socios.forEach((s, idx) => {
      const cond = s.memberCondition === 'SOCIO_REGULAR' ? 'TITULAR' : 'EN PRUEBA';
      const fullName = `${s.lastName || ''} ${s.firstName || ''}`.trim();
      csvContent += `${idx + 1};${fullName};${s.dni};${cond};;\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PADRON_ASAMBLEA_${assemblyDate.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const selectedType = types.find((t) => t.id === formData.merchantTypeId);
      const isSocio = selectedType?.code === 'SOCIO';

      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dni: formData.dni.trim(),
        phone: formData.phone?.trim() || undefined,
        merchantTypeId: formData.merchantTypeId,
        memberCondition: isSocio ? formData.memberCondition : 'NO_APLICA',
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
        memberCondition: 'SOCIO_REGULAR',
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
      memberCondition: merchant.memberCondition || 'SOCIO_REGULAR',
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
      const selectedType = types.find((t) => t.id === editFormData.merchantTypeId);
      const isSocio = selectedType?.code === 'SOCIO';

      const payload: any = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        dni: editFormData.dni.trim(),
        phone: editFormData.phone?.trim() || undefined,
        merchantTypeId: editFormData.merchantTypeId,
        memberCondition: isSocio ? editFormData.memberCondition : 'NO_APLICA',
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

  // Filtrado y Orden Alfabético Estricto (Apellidos, Nombres)
  const filteredAndSortedMerchants = useMemo(() => {
    return merchants
      .filter((m) => {
        const typeCode = m.merchantType?.code || '';

        // 1. Filtro por Grupo Principal
        if (activeGroup === 'SOCIO') {
          if (typeCode !== 'SOCIO') return false;
          if (socioConditionFilter === 'SOCIO_REGULAR' && m.memberCondition !== 'SOCIO_REGULAR') return false;
          if (socioConditionFilter === 'SOCIO_EN_PRUEBA' && m.memberCondition !== 'SOCIO_EN_PRUEBA') return false;
        } else if (activeGroup === 'INQUILINO') {
          if (typeCode !== 'INQUILINO') return false;
        } else if (activeGroup === 'AMBULANTE') {
          if (!['AMBULANTE_FIJO', 'AMBULANTE_TEMPORAL', 'AMBULANTE'].includes(typeCode)) return false;
          if (ambulanteTypeFilter === 'AMBULANTE_FIJO' && typeCode !== 'AMBULANTE_FIJO') return false;
          if (ambulanteTypeFilter === 'AMBULANTE_TEMPORAL' && typeCode !== 'AMBULANTE_TEMPORAL') return false;
        }

        // 2. Filtro por Giro Comercial / Rubro
        if (selectedCategory !== 'ALL') {
          if (m.businessCategory !== selectedCategory) return false;
        }

        // 3. Semáforo de Morosidad
        const pendingCount = m._count?.obligations || 0;
        if (morosidadFilter === 'AL_DIA' && pendingCount !== 0) return false;
        if (morosidadFilter === 'PENDIENTE' && pendingCount !== 1) return false;
        if (morosidadFilter === 'MOROSO' && pendingCount < 2) return false;

        return true;
      })
      .sort((a, b) => {
        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      });
  }, [merchants, activeGroup, socioConditionFilter, ambulanteTypeFilter, selectedCategory, morosidadFilter]);

  // Conteo de grupos
  const socioCount = useMemo(() => merchants.filter((m) => m.merchantType?.code === 'SOCIO').length, [merchants]);
  const inquilinoCount = useMemo(() => merchants.filter((m) => m.merchantType?.code === 'INQUILINO').length, [merchants]);
  const ambulanteCount = useMemo(() => merchants.filter((m) => ['AMBULANTE_FIJO', 'AMBULANTE_TEMPORAL', 'AMBULANTE'].includes(m.merchantType?.code)).length, [merchants]);

  return (
    <div className="space-y-6">
      {/* Estilos para impresión de carnet con colores e imágenes exactas */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-carnet, #printable-carnet *, #printable-requerimiento, #printable-requerimiento *, #printable-asamblea, #printable-asamblea * {
              visibility: visible !important;
            }
            #printable-carnet {
              position: absolute !important;
              left: 50% !important;
              top: 20mm !important;
              transform: translateX(-50%) !important;
              width: 95mm !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-requerimiento {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-asamblea {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
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
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Padrón General de Comerciantes</h1>
          <p className="text-xs text-slate-500">
            Clasificación oficial en <b>Socios (107)</b>, <b>Inquilinos</b> y <b>Ambulantes</b> • Orden alfabético estricto • Trazabilidad con DNI y Recibos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAssemblyModal(true)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Padrón Asamblea (Imprimir / Excel)</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Comerciante</span>
          </button>
        </div>
      </div>

      {/* Pestañas Principales: Todos, Socios, Inquilinos, Ambulantes */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeGroup === 'ALL'
              ? 'bg-slate-900 text-white shadow'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Todos los Comerciantes</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-200/50 text-current">
            {merchants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup('SOCIO')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeGroup === 'SOCIO'
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span>🏛️ Socios</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-200/50 text-current font-black">
            {socioCount}
          </span>
          <span className="text-[10px] opacity-80">(Mensual: Cuota + Agua)</span>
        </button>

        <button
          onClick={() => setActiveGroup('INQUILINO')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeGroup === 'INQUILINO'
              ? 'bg-blue-700 text-white shadow'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Inquilinos</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-blue-200/50 text-current font-black">
            {inquilinoCount}
          </span>
          <span className="text-[10px] opacity-80">(Alquiler + Agua)</span>
        </button>

        <button
          onClick={() => setActiveGroup('AMBULANTE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeGroup === 'AMBULANTE'
              ? 'bg-amber-600 text-white shadow'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>🛒 Ambulantes</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-200/50 text-current font-black">
            {ambulanteCount}
          </span>
          <span className="text-[10px] opacity-80">(Diario / Alcabala)</span>
        </button>
      </div>

      {/* Subfiltros Contextuales */}
      {activeGroup === 'SOCIO' && (
        <div className="flex items-center gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900">
          <span className="text-emerald-700 text-[11px] uppercase tracking-wider mr-1">Condición Estatutaria:</span>
          <button
            onClick={() => setSocioConditionFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition ${
              socioConditionFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Todos los Socios ({merchants.filter((m) => m.merchantType?.code === 'SOCIO').length})
          </button>
          <button
            onClick={() => setSocioConditionFilter('SOCIO_REGULAR')}
            className={`px-3 py-1 rounded-lg transition ${
              socioConditionFilter === 'SOCIO_REGULAR'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            ⭐ Socios Titulares / Regulares ({merchants.filter((m) => m.merchantType?.code === 'SOCIO' && m.memberCondition === 'SOCIO_REGULAR').length})
          </button>
          <button
            onClick={() => setSocioConditionFilter('SOCIO_EN_PRUEBA')}
            className={`px-3 py-1 rounded-lg transition ${
              socioConditionFilter === 'SOCIO_EN_PRUEBA'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            ⏳ Socios en Prueba de Admisión ({merchants.filter((m) => m.merchantType?.code === 'SOCIO' && m.memberCondition === 'SOCIO_EN_PRUEBA').length})
          </button>
        </div>
      )}

      {activeGroup === 'AMBULANTE' && (
        <div className="flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
          <span className="text-amber-700 text-[11px] uppercase tracking-wider mr-1">Tipo de Puesto Ambulatorio:</span>
          <button
            onClick={() => setAmbulanteTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition ${
              ambulanteTypeFilter === 'ALL'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Todos los Ambulantes ({ambulanteCount})
          </button>
          <button
            onClick={() => setAmbulanteTypeFilter('AMBULANTE_FIJO')}
            className={`px-3 py-1 rounded-lg transition ${
              ambulanteTypeFilter === 'AMBULANTE_FIJO'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Ambulantes Fijos (S/ 3 diario + Agua mes)
          </button>
          <button
            onClick={() => setAmbulanteTypeFilter('AMBULANTE_TEMPORAL')}
            className={`px-3 py-1 rounded-lg transition ${
              ambulanteTypeFilter === 'AMBULANTE_TEMPORAL'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-sky-800 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            Ambulantes Temporales (S/ 4 diario)
          </button>
        </div>
      )}

      {/* Buscador, Filtro por Giro Comercial y Semáforo */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
        {/* Buscador de texto */}
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar alfabéticamente por Apellidos, Nombres, DNI, Puesto o Código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        {/* Filtro por Giro / Rubro Comercial */}
        <div className="w-full md:w-64">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="ALL">Todos los Giros / Rubros</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Semáforo de Morosidad */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setMorosidadFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              morosidadFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setMorosidadFilter('AL_DIA')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              morosidadFilter === 'AL_DIA' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title="Socios al día con sus cuotas"
          >
            🟢 Al Día
          </button>
          <button
            onClick={() => setMorosidadFilter('PENDIENTE')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              morosidadFilter === 'PENDIENTE' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
            title="1 mes pendiente"
          >
            🟡 1 Mes
          </button>
          <button
            onClick={() => setMorosidadFilter('MOROSO')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
              morosidadFilter === 'MOROSO' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
            title="Morosos (+2 meses de retraso)"
          >
            🔴 Morosos
          </button>
        </div>
      </div>

      {/* Tabla del Padrón con Orden Alfabético y Gestión Documental */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Apellidos y Nombres (A-Z)</th>
              <th className="py-3 px-4">DNI</th>
              <th className="py-3 px-4">Condición / Tipo</th>
              <th className="py-3 px-4">Puesto</th>
              <th className="py-3 px-4">Giro / Rubro</th>
              <th className="py-3 px-4 text-center">Expediente / Docs</th>
              <th className="py-3 px-4">DNI Escaneado</th>
              <th className="py-3 px-4">Recibo Luz/Agua</th>
              <th className="py-3 px-4">Deuda</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  Cargando padrón oficial de comerciantes...
                </td>
              </tr>
            ) : filteredAndSortedMerchants.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  No se encontraron comerciantes registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredAndSortedMerchants.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  {/* Código interno */}
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    {m.internalCode}
                  </td>

                  {/* Foto y Nombre Alfabético */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative group flex-shrink-0">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={`${m.lastName}, ${m.firstName}`}
                            className="w-9 h-9 rounded-full object-cover border border-slate-300 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm">
                            {m.lastName?.[0] || 'C'}
                          </div>
                        )}
                        <label
                          htmlFor={`photo-upload-${m.id}`}
                          className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Subir / Actualizar Foto de Perfil"
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
                        <p className="font-bold text-slate-800 text-xs">
                          {m.lastName}, {m.firstName}
                        </p>
                        {m.memberCondition === 'SOCIO_EN_PRUEBA' && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            En Prueba de Admisión
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* DNI */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">
                    {m.dni}
                  </td>

                  {/* Tipo / Condición */}
                  <td className="py-3 px-4">
                    {m.merchantType?.code === 'SOCIO' ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        m.memberCondition === 'SOCIO_EN_PRUEBA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {m.memberCondition === 'SOCIO_EN_PRUEBA' ? 'Socio en Prueba' : 'Socio Titular'}
                      </span>
                    ) : m.merchantType?.code === 'INQUILINO' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        Inquilino
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        {m.merchantType?.name || 'Ambulante'}
                      </span>
                    )}
                  </td>

                  {/* Puesto */}
                  <td className="py-3 px-4">
                    {m.stall ? (
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {m.stall.code}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Ambulatorio</span>
                    )}
                  </td>

                  {/* Rubro / Giro Comercial */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700">
                      {m.businessCategory || '-'}
                    </span>
                  </td>

                  {/* Expediente Digital / Documentos */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => openMerchantDocsModal(m)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                        (m._count?.documents || 0) > 0
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                      title="Abrir Expediente y Legajo Digital del Comerciante"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{m._count?.documents || 0} Docs</span>
                    </button>
                  </td>

                  {/* DNI Digital Escaneado */}
                  <td className="py-3 px-4">
                    {m.dniDocumentUrl ? (
                      <div className="flex items-center space-x-1.5">
                        <a
                          href={m.dniDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition"
                          title="Ver DNI escaneado (PDF/Imagen)"
                        >
                          <IdCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span>DNI Listo</span>
                        </a>
                        <label
                          htmlFor={`dni-replace-${m.id}`}
                          className="cursor-pointer p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Reemplazar DNI"
                        >
                          <Upload className="w-3 h-3" />
                        </label>
                        <input
                          id={`dni-replace-${m.id}`}
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDniDocument(m.id, file);
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor={`dni-upload-${m.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                          title="Subir DNI escaneado en PDF o Imagen"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          <span>+ DNI</span>
                        </label>
                        <input
                          id={`dni-upload-${m.id}`}
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDniDocument(m.id, file);
                          }}
                        />
                      </div>
                    )}
                  </td>

                  {/* Recibo Luz / Agua (PDF) */}
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
                          <span>Recibo PDF</span>
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
                          <span>+ Recibo</span>
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

                  {/* Semáforo de Deuda */}
                  <td className="py-3 px-4">
                    {(m._count?.obligations || 0) === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        Al día
                      </span>
                    ) : (m._count?.obligations || 0) === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                        1 pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                        Moroso ({m._count.obligations})
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Carnet QR */}
                      <button
                        onClick={() => openCarnet(m)}
                        title="Ver e Imprimir Carnet QR con Foto Oficial"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      {/* Notificación de Deuda */}
                      <button
                        onClick={() => openRequerimientoModal(m)}
                        title="Emitir Carta de Requerimiento de Pago para Asambleas"
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* Cuenta Corriente */}
                      <button
                        onClick={() => viewDetails(m.id)}
                        title="Ver Cuenta Corriente y Legajo"
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

                      {/* Dar de Baja */}
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
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Nuevo Registro de Comerciante</h2>
            <p className="text-xs text-slate-500 mb-4">
              Se generarán automáticamente sus obligaciones pendientes del período según su periodicidad.
            </p>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Rosa Isabel"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Apellidos (Orden A-Z)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Quispe Flores"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                    placeholder="45891234"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="987654321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Comerciante</label>
                  <select
                    value={formData.merchantTypeId}
                    onChange={(e) => setFormData({ ...formData, merchantTypeId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {types.find((t) => t.id === formData.merchantTypeId)?.code === 'SOCIO' ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Condición de Socio</label>
                    <select
                      value={formData.memberCondition}
                      onChange={(e) => setFormData({ ...formData, memberCondition: e.target.value })}
                      className="w-full border border-emerald-300 rounded-lg p-2 font-medium bg-emerald-50/40"
                    >
                      <option value="SOCIO_REGULAR">⭐ Socio Titular / Regular</option>
                      <option value="SOCIO_EN_PRUEBA">⏳ Socio en Prueba de Admisión</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label>
                    <select
                      value={formData.stallId}
                      onChange={(e) => setFormData({ ...formData, stallId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                    >
                      <option value="">Sin puesto (Ambulante)</option>
                      {stalls.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.sector?.name || 'Sector'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {types.find((t) => t.id === formData.merchantTypeId)?.code === 'SOCIO' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label>
                  <select
                    value={formData.stallId}
                    onChange={(e) => setFormData({ ...formData, stallId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Sin puesto asignado aún</option>
                    {stalls.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.sector?.name || 'Sector'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow hover:bg-emerald-700"
                >
                  Guardar Comerciante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Comerciante (UPDATE CRUD) */}
      {isEditModalOpen && editingMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1 uppercase">Editar Comerciante</h2>
            <p className="text-xs text-slate-500 mb-4">
              Código: <span className="font-mono font-bold text-emerald-700">{editingMerchant.internalCode}</span> • Actualice los datos personales, condición y ubicación.
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
                  <label className="font-bold text-slate-700 block mb-1">Apellidos (A-Z)</label>
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
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {types.find((t) => t.id === editFormData.merchantTypeId)?.code === 'SOCIO' ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Condición de Socio</label>
                    <select
                      value={editFormData.memberCondition}
                      onChange={(e) => setEditFormData({ ...editFormData, memberCondition: e.target.value })}
                      className="w-full border border-emerald-300 rounded-lg p-2 font-medium bg-emerald-50/40"
                    >
                      <option value="SOCIO_REGULAR">⭐ Socio Titular / Regular</option>
                      <option value="SOCIO_EN_PRUEBA">⏳ Socio en Prueba de Admisión</option>
                    </select>
                  </div>
                ) : (
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
                )}
              </div>

              {types.find((t) => t.id === editFormData.merchantTypeId)?.code === 'SOCIO' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Puesto Asignado</label>
                  <select
                    value={editFormData.stallId}
                    onChange={(e) => setEditFormData({ ...editFormData, stallId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Sin puesto asignado</option>
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
              )}

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
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
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

      {/* MODAL 3: Eliminar / Dar de Baja Lógica */}
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

      {/* MODAL 4: Detalle del Comerciante, Legajo Documental y Cuenta Corriente */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedMerchant(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

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
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                    <span>DNI: {selectedMerchant.dni}</span>
                    <span>•</span>
                    <span>Cód: {selectedMerchant.internalCode}</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-800">{selectedMerchant.merchantType?.name}</span>
                    {selectedMerchant.memberCondition === 'SOCIO_EN_PRUEBA' && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-sans">
                        En Prueba
                      </span>
                    )}
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

            {/* Legajo Documental: DNI y Recibo de Luz y Agua */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* Recuadro 1: DNI Digital */}
              <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <IdCard className="w-4 h-4 text-emerald-700" />
                    <span className="font-black text-slate-800 uppercase tracking-tight text-[11px]">
                      DNI Digital Escaneado
                    </span>
                  </div>
                  {selectedMerchant.dniDocumentUrl && (
                    <span className="text-[9px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.2 rounded-full">
                      ✓ Archivador
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-100">
                  <span className="text-[11px] text-slate-600 truncate">
                    {selectedMerchant.dniDocumentUrl ? 'Documento de identidad oficial adjunto' : 'Sin DNI escaneado'}
                  </span>
                  <div className="flex items-center space-x-1">
                    {selectedMerchant.dniDocumentUrl && (
                      <a
                        href={selectedMerchant.dniDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver
                      </a>
                    )}
                    <label
                      htmlFor={`modal-dni-${selectedMerchant.id}`}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> {selectedMerchant.dniDocumentUrl ? 'Cambiar' : 'Subir'}
                    </label>
                    <input
                      id={`modal-dni-${selectedMerchant.id}`}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDniDocument(selectedMerchant.id, file);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recuadro 2: Recibo de Luz y Agua */}
              <div className="bg-sky-50/60 border border-sky-200 p-3 rounded-xl text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-sky-700" />
                    <span className="font-black text-slate-800 uppercase tracking-tight text-[11px]">
                      Recibo Luz / Agua (PDF)
                    </span>
                  </div>
                  {selectedMerchant.utilityBillPdfUrl && (
                    <span className="text-[9px] text-sky-700 bg-sky-100 font-bold px-1.5 py-0.2 rounded-full">
                      ✓ Verificado
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-sky-100">
                  <span className="text-[11px] text-slate-600 truncate">
                    {selectedMerchant.utilityBillPdfUrl ? 'Trazabilidad de servicios activa' : 'Sin recibo presentado'}
                  </span>
                  <div className="flex items-center space-x-1">
                    {selectedMerchant.utilityBillPdfUrl && (
                      <a
                        href={selectedMerchant.utilityBillPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver
                      </a>
                    )}
                    <label
                      htmlFor={`modal-recibo-${selectedMerchant.id}`}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> {selectedMerchant.utilityBillPdfUrl ? 'Cambiar' : 'Subir'}
                    </label>
                    <input
                      id={`modal-recibo-${selectedMerchant.id}`}
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
            </div>

            {/* Datos Resumen */}
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

      {/* MODAL 5: CARNET QR INDIVIDUAL CON FOTO Y QR */}
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
            <div id="printable-carnet" className="border-2 border-dashed border-emerald-600/70 p-5 rounded-2xl bg-white shadow-md relative">
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
                onClick={handlePrintCarnet}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Carnet</span>
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

      {/* MODAL 5: EXPEDIENTE Y LEGAJO DIGITAL POR COMERCIANTE */}
      {docMerchant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Header del Expediente */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {docMerchant.photoUrl ? (
                  <img
                    src={docMerchant.photoUrl}
                    alt={docMerchant.lastName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg border-2 border-emerald-400/50 shadow-md">
                    {docMerchant.lastName?.[0] || 'C'}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Legajo y Expediente Digital
                    </span>
                  </div>
                  <h2 className="text-base font-black uppercase text-white tracking-tight">
                    {docMerchant.lastName}, {docMerchant.firstName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-300">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded font-bold">DNI: {docMerchant.dni}</span>
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">Código: {docMerchant.internalCode}</span>
                    {docMerchant.stall && (
                      <span className="bg-emerald-800 text-white px-2 py-0.5 rounded font-bold">
                        Puesto {docMerchant.stall.code}
                      </span>
                    )}
                    <span className="bg-slate-700 px-2 py-0.5 rounded">
                      {docMerchant.merchantType?.name || 'Socio'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowDocUploadForm(!showDocUploadForm)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showDocUploadForm ? 'Cerrar Formulario' : 'Subir Documento'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocMerchant(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formulario de Carga de Documento (Colapsable) */}
            {showDocUploadForm && (
              <form onSubmit={handleUploadMerchantDoc} className="p-5 bg-emerald-50/60 border-b border-emerald-200 text-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-black uppercase text-emerald-900 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Archivar Nuevo Documento en el Expediente
                  </h3>
                  <span className="text-[11px] text-slate-500">Soporta PDF, JPG, PNG, WEBP (Hasta 30MB)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nombre / Título del Documento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carné de Sanidad 2026, Copia de DNI, Declaración Jurada..."
                      value={newDocForm.title}
                      onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {/* Sugerencias Rápidas */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['Copia DNI Titular', 'Carné de Sanidad', 'Contrato de Puesto', 'Declaración Jurada', 'Certificado Salud', 'Constancia No Adeudo'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setNewDocForm({ ...newDocForm, title: chip })}
                          className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold transition"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Concepto / Categoría *
                    </label>
                    <select
                      value={newDocForm.concept}
                      onChange={(e) => setNewDocForm({ ...newDocForm, concept: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="IDENTIDAD">Identidad (DNI / RUC)</option>
                      <option value="CONTRATO">Contratos y Arrendamientos</option>
                      <option value="SANITARIO">Sanitarios (Carné / Salud)</option>
                      <option value="SOLICITUD">Solicitudes y Trámites</option>
                      <option value="CONSTANCIA_PAGO">Constancias de Pago y Recibos</option>
                      <option value="DECLARACION_JURADA">Declaraciones Juradas</option>
                      <option value="ACTAS_SANCION">Notificaciones y Compromisos</option>
                      <option value="OTROS">Otros Documentos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      N° Documento Externo / Trámite
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 045-2024-MUNI o DNI-Titular"
                      value={newDocForm.externalNumber}
                      onChange={(e) => setNewDocForm({ ...newDocForm, externalNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Fecha Oficial del Documento
                    </label>
                    <input
                      type="date"
                      value={newDocForm.documentDate}
                      onChange={(e) => setNewDocForm({ ...newDocForm, documentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Seleccionar Archivo Digital *
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,image/*,.doc,.docx"
                      onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <input
                    type="text"
                    placeholder="Descripción u observaciones complementarias..."
                    value={newDocForm.description}
                    onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
                    className="flex-1 mr-3 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDocUploadForm(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isUploadingDoc}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black shadow transition flex items-center space-x-1"
                    >
                      {isUploadingDoc ? <span>Subiendo...</span> : <span>Archivar en Expediente</span>}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Barra de Filtros del Expediente */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Concept Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'IDENTIDAD', label: 'Identidad' },
                  { id: 'CONTRATO', label: 'Contratos' },
                  { id: 'SANITARIO', label: 'Sanitarios' },
                  { id: 'SOLICITUD', label: 'Solicitudes' },
                  { id: 'CONSTANCIA_PAGO', label: 'Pagos' },
                  { id: 'DECLARACION_JURADA', label: 'DDJJ' },
                  { id: 'OTROS', label: 'Otros' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDocFilterConcept(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      docFilterConcept === item.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {item.label}
                    {item.id === 'ALL'
                      ? ` (${merchantDocs.length})`
                      : ` (${merchantDocs.filter((d) => d.concept === item.id).length})`}
                  </button>
                ))}
              </div>

              {/* Search & Year */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por título, N°..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-48 focus:outline-none"
                  />
                </div>

                <select
                  value={docYearFilter}
                  onChange={(e) => setDocYearFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Años</option>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listado de Documentos del Expediente */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingDocs ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Cargando expediente digital del comerciante...
                </div>
              ) : merchantDocs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm text-slate-600">Este comerciante aún no tiene documentos en su legajo</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Haga clic en el botón <b>&quot;Subir Documento&quot;</b> arriba para archivar DNI, carné sanitario, contratos o declaraciones juradas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {merchantDocs
                    .filter((doc) => {
                      if (docFilterConcept !== 'ALL' && doc.concept !== docFilterConcept) return false;
                      if (
                        docYearFilter !== 'ALL' &&
                        String(doc.year) !== docYearFilter &&
                        !doc.documentDate?.startsWith(docYearFilter)
                      )
                        return false;
                      if (docSearch) {
                        const q = docSearch.toLowerCase();
                        const match =
                          doc.title?.toLowerCase().includes(q) ||
                          doc.externalNumber?.toLowerCase().includes(q) ||
                          doc.fileName?.toLowerCase().includes(q) ||
                          doc.description?.toLowerCase().includes(q);
                        if (!match) return false;
                      }
                      return true;
                    })
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-sm transition flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${
                              doc.fileType?.includes('PDF')
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {doc.fileType || 'DOC'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate" title={doc.title}>
                              {doc.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                              <span className="px-1.5 py-0.2 rounded font-black uppercase bg-slate-100 text-slate-700">
                                {doc.concept?.replace(/_/g, ' ')}
                              </span>
                              {doc.externalNumber && (
                                <span className="font-mono text-slate-500 font-bold">
                                  N° {doc.externalNumber}
                                </span>
                              )}
                              <span className="text-slate-400">
                                {new Date(doc.documentDate || doc.createdAt).toLocaleDateString('es-PE')}
                              </span>
                            </div>
                            {doc.description && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{doc.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Previsualizar en Pantalla"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={doc.fileName}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Descargar Documento"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteMerchantDoc(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar del Expediente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">
                Total de Documentos en Legajo: {merchantDocs.length}
              </span>
              <button
                type="button"
                onClick={() => setDocMerchant(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: VISOR Y PREVIEW DE DOCUMENTO */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">{previewDoc.title}</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Concepto: {previewDoc.concept} | {previewDoc.fileName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Nueva Pestaña</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center">
              {previewDoc.fileUrl?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  className="w-full h-[72vh] rounded-2xl border border-slate-200 bg-white"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-md border border-slate-200 bg-white"
                />
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Padrón Oficial para Asambleas (Impresión A4 / Excel) */}
      {showAssemblyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header no imprimible */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-sm uppercase">Padrón Oficial de Socios para Asamblea</h3>
                  <p className="text-[11px] text-slate-400">Formato A4 con cuadrículas para firmas y huellas dactilares</p>
                </div>
              </div>

              {/* Controles de Configuración */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={assemblyTitle}
                  onChange={(e) => setAssemblyTitle(e.target.value)}
                  placeholder="Tipo de asamblea..."
                  className="px-2.5 py-1 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 font-bold"
                  title="Título de la asamblea"
                />
                <input
                  type="text"
                  value={assemblyDate}
                  onChange={(e) => setAssemblyDate(e.target.value)}
                  placeholder="Fecha (DD-MM-AAAA)..."
                  className="px-2.5 py-1 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 font-bold w-28 text-center"
                  title="Fecha de la asamblea"
                />
                <button
                  type="button"
                  onClick={exportAssemblyExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition"
                  title="Descargar padrón en Excel (.csv)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition"
                  title="Imprimir documento en A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssemblyModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Documento Imprimible Neto */}
            <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white text-slate-900">
              <div id="printable-asamblea" className="bg-white max-w-3xl mx-auto space-y-4">
                {/* Membrete Institucional Oficial */}
                <div className="text-center space-y-1 pb-2 border-b-2 border-slate-900">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                    ASOCIACIÓN DE PEQUEÑOS COMERCIANTES DEL MERCADO DE ABASTOS
                  </h2>
                  <h3 className="text-lg font-black tracking-widest text-slate-900">
                    “MICAELA BASTIDAS”
                  </h3>
                  <div className="text-xs font-black uppercase tracking-wide bg-slate-100 py-1 px-3 rounded mt-1 border border-slate-300 inline-block">
                    PADRÓN DE SOCIOS ASISTENTES A LA {assemblyTitle} &nbsp;&nbsp;&nbsp;&nbsp; {assemblyDate}
                  </div>
                </div>

                {/* Subsección 1: Socios Titulares (1 al 88) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase bg-slate-200 px-3 py-1 rounded">
                    <span>I. SOCIOS TITULARES / FUNDADORES (N° 1 al 88)</span>
                    <span className="text-[10px] text-slate-600">88 Socios Titulares</span>
                  </div>

                  <table className="w-full text-[11px] border-collapse border border-slate-400">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-black uppercase">
                        <th className="border border-slate-400 p-1.5 text-center w-10">N°</th>
                        <th className="border border-slate-400 p-1.5 text-left">APELLIDOS Y NOMBRES</th>
                        <th className="border border-slate-400 p-1.5 text-center w-24">DNI</th>
                        <th className="border border-slate-400 p-1.5 text-center w-36">FIRMA</th>
                        <th className="border border-slate-400 p-1.5 text-center w-28">HUELLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchants
                        .filter((m) => m.merchantType?.code === 'SOCIO' && m.memberCondition === 'SOCIO_REGULAR')
                        .sort((a, b) => {
                          const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                          const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                        })
                        .map((s, idx) => (
                          <tr key={s.id} className="h-10 hover:bg-slate-50">
                            <td className="border border-slate-400 p-1 text-center font-bold text-slate-700">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-400 p-1 font-bold uppercase text-slate-900">
                              {s.lastName}, {s.firstName}
                            </td>
                            <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-800">
                              {s.dni}
                            </td>
                            <td className="border border-slate-400 p-1"></td>
                            <td className="border border-slate-400 p-1"></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Subsección 2: Socios en Prueba (89 al 107) */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase bg-slate-200 px-3 py-1 rounded">
                    <span>II. SOCIOS EN PRUEBA / CONDICIÓN ESPECIAL (N° 89 al 107)</span>
                    <span className="text-[10px] text-slate-600">19 Socios en Prueba</span>
                  </div>

                  <table className="w-full text-[11px] border-collapse border border-slate-400">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-black uppercase">
                        <th className="border border-slate-400 p-1.5 text-center w-10">N°</th>
                        <th className="border border-slate-400 p-1.5 text-left">APELLIDOS Y NOMBRES</th>
                        <th className="border border-slate-400 p-1.5 text-center w-24">DNI</th>
                        <th className="border border-slate-400 p-1.5 text-center w-36">FIRMA</th>
                        <th className="border border-slate-400 p-1.5 text-center w-28">HUELLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchants
                        .filter((m) => m.merchantType?.code === 'SOCIO' && m.memberCondition !== 'SOCIO_REGULAR')
                        .sort((a, b) => {
                          const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
                          const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
                          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
                        })
                        .map((s, idx) => (
                          <tr key={s.id} className="h-10 hover:bg-slate-50">
                            <td className="border border-slate-400 p-1 text-center font-bold text-slate-700">
                              {88 + idx + 1}
                            </td>
                            <td className="border border-slate-400 p-1 font-bold uppercase text-slate-900">
                              {s.lastName}, {s.firstName}
                            </td>
                            <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-800">
                              {s.dni}
                            </td>
                            <td className="border border-slate-400 p-1"></td>
                            <td className="border border-slate-400 p-1"></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Firmas de la Mesa Directiva */}
                <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
                  <div className="space-y-1 border-t border-slate-600 pt-2">
                    <p className="font-bold uppercase">Presidente(a)</p>
                    <p className="text-[10px] text-slate-500">Consejo Directivo</p>
                  </div>
                  <div className="space-y-1 border-t border-slate-600 pt-2">
                    <p className="font-bold uppercase">Secretario(a) de Actas</p>
                    <p className="text-[10px] text-slate-500">Consejo Directivo</p>
                  </div>
                  <div className="space-y-1 border-t border-slate-600 pt-2">
                    <p className="font-bold uppercase">Tesorero(a)</p>
                    <p className="text-[10px] text-slate-500">Consejo Directivo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
