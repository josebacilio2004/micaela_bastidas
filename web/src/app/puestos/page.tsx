'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Store,
  User,
  CheckCircle2,
  AlertCircle,
  Printer,
  QrCode,
  X,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  ArrowUpDown,
  Building,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PuestosPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [giros, setGiros] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedGiro, setSelectedGiro] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modales CRUD
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<any>(null);
  const [deletingStall, setDeletingStall] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [stallForm, setStallForm] = useState({
    code: '',
    sectorId: '',
    giro: 'Carnes y Pescados',
    customGiro: '',
    stallNumber: 1,
    locationDescription: '',
    status: 'LIBRE',
    observations: '',
    merchantId: '',
  });

  // Mass QR Carnet Print Modal States
  const [isMassCarnetModalOpen, setIsMassCarnetModalOpen] = useState(false);
  const [massCarnetSectorId, setMassCarnetSectorId] = useState('');
  const [massCarnetGiro, setMassCarnetGiro] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectorsRes, stallsRes, girosRes, merchantsRes] = await Promise.all([
        apiRequest('/sectors'),
        apiRequest('/stalls'),
        apiRequest('/stalls/giros'),
        apiRequest('/merchants'),
      ]);
      setSectors(sectorsRes || []);
      setStalls(stallsRes || []);
      setGiros(girosRes || []);
      setMerchants(merchantsRes || []);
    } catch (e) {
      console.error('Error al cargar puestos y sectores:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Giros disponibles para selector
  const availableGiros = useMemo(() => {
    const defaultList = [
      'Carnes y Pescados',
      'Frutas y Verduras',
      'Abarrotes y Granos',
      'Comidas y Jugos',
      'Zona Ambulatoria Externa',
    ];
    const fromApi = giros.map((g) => g.giro).filter(Boolean);
    const set = new Set([...defaultList, ...fromApi]);
    return Array.from(set);
  }, [giros]);

  // Filtrado de puestos en frontend para fluidez inmediata
  const filteredStalls = useMemo(() => {
    return stalls.filter((st) => {
      // Filtro por Giro
      if (selectedGiro) {
        const stallGiro = st.giro || st.sector?.name || '';
        if (stallGiro.toLowerCase() !== selectedGiro.toLowerCase()) {
          return false;
        }
      }

      // Filtro por Sector físico
      if (selectedSector && st.sectorId !== selectedSector) {
        return false;
      }

      // Filtro por Estado
      if (selectedStatus && st.status !== selectedStatus) {
        return false;
      }

      // Filtro por Búsqueda (Código, número, comerciante, dni)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (st.code || '').toLowerCase();
        const num = String(st.stallNumber || '');
        const giroStr = (st.giro || '').toLowerCase();
        const merchantName = st.assignedMerchant
          ? `${st.assignedMerchant.lastName} ${st.assignedMerchant.firstName}`.toLowerCase()
          : '';
        const dni = (st.assignedMerchant?.dni || '').toLowerCase();
        const desc = (st.locationDescription || '').toLowerCase();

        return (
          code.includes(q) ||
          num.includes(q) ||
          giroStr.includes(q) ||
          merchantName.includes(q) ||
          dni.includes(q) ||
          desc.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      // Orden principal: Giro alfabético
      const giroA = (a.giro || a.sector?.name || '').toLowerCase();
      const giroB = (b.giro || b.sector?.name || '').toLowerCase();
      if (giroA !== giroB) return giroA.localeCompare(giroB);

      // Orden secundario: stallNumber correlativo ascendente dentro del giro
      const numA = Number(a.stallNumber) || 0;
      const numB = Number(b.stallNumber) || 0;
      if (numA !== numB) return numA - numB;

      // Orden terciario: código
      return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
    });
  }, [stalls, selectedGiro, selectedSector, selectedStatus, searchQuery]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = stalls.length;
    const occupied = stalls.filter((s) => s.status === 'OCUPADO').length;
    const free = stalls.filter((s) => s.status === 'LIBRE').length;
    const reserved = stalls.filter((s) => s.status === 'RESERVADO' || s.status === 'INACTIVO').length;
    return { total, occupied, free, reserved };
  }, [stalls]);

  // Manejo de Creación
  const handleOpenCreateModal = (giroPreselected?: string) => {
    const targetGiro = giroPreselected || selectedGiro || availableGiros[0] || 'Carnes y Pescados';
    const stallsInGiro = stalls.filter(
      (s) => (s.giro || s.sector?.name || '').toLowerCase() === targetGiro.toLowerCase()
    );
    const maxNumber = stallsInGiro.reduce((max, s) => Math.max(max, Number(s.stallNumber) || 0), 0);
    const nextNum = maxNumber + 1;

    // Sugerencia de código
    let prefix = 'P-';
    if (targetGiro.includes('Carnes')) prefix = 'CAR-';
    else if (targetGiro.includes('Frutas')) prefix = 'FV-';
    else if (targetGiro.includes('Abarrotes')) prefix = 'AB-';
    else if (targetGiro.includes('Comidas')) prefix = 'CJ-';
    else if (targetGiro.includes('Ambulant')) prefix = 'AMB-';

    const suggestedCode = `${prefix}${String(nextNum).padStart(2, '0')}`;

    // Buscar sector acorde al giro
    const matchedSector = sectors.find(
      (sec) => sec.name.toLowerCase().includes(targetGiro.toLowerCase().split(' ')[0])
    ) || sectors[0];

    setStallForm({
      code: suggestedCode,
      sectorId: matchedSector?.id || '',
      giro: targetGiro,
      customGiro: '',
      stallNumber: nextNum,
      locationDescription: '',
      status: 'LIBRE',
      observations: '',
      merchantId: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stallForm.code || !stallForm.sectorId) {
      alert('Por favor ingrese el código del puesto y seleccione el sector.');
      return;
    }

    const finalGiro = stallForm.giro === 'OTRO' ? stallForm.customGiro.trim() : stallForm.giro;
    if (!finalGiro) {
      alert('Por favor especifique el Giro comercial del puesto.');
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/stalls', {
        method: 'POST',
        body: JSON.stringify({
          code: stallForm.code.trim().toUpperCase(),
          sectorId: stallForm.sectorId,
          giro: finalGiro,
          stallNumber: Number(stallForm.stallNumber) || 1,
          locationDescription: stallForm.locationDescription,
          status: stallForm.status,
          observations: stallForm.observations,
          merchantId: stallForm.merchantId || undefined,
        }),
      });

      alert(`✓ Puesto "${stallForm.code.toUpperCase()}" creado exitosamente en el giro "${finalGiro}".`);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al crear puesto');
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Edición
  const handleOpenEditModal = (stall: any) => {
    setEditingStall(stall);
    const currentGiro = stall.giro || stall.sector?.name || 'Carnes y Pescados';
    const isCustom = !availableGiros.includes(currentGiro);

    setStallForm({
      code: stall.code || '',
      sectorId: stall.sectorId || '',
      giro: isCustom ? 'OTRO' : currentGiro,
      customGiro: isCustom ? currentGiro : '',
      stallNumber: stall.stallNumber || 1,
      locationDescription: stall.locationDescription || '',
      status: stall.status || 'LIBRE',
      observations: stall.observations || '',
      merchantId: stall.assignedMerchant?.id || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStall) return;

    const finalGiro = stallForm.giro === 'OTRO' ? stallForm.customGiro.trim() : stallForm.giro;

    try {
      setSubmitting(true);
      await apiRequest(`/stalls/${editingStall.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: stallForm.code.trim().toUpperCase(),
          sectorId: stallForm.sectorId,
          giro: finalGiro,
          stallNumber: Number(stallForm.stallNumber) || 1,
          locationDescription: stallForm.locationDescription,
          status: stallForm.status,
          observations: stallForm.observations,
          merchantId: stallForm.merchantId || null,
        }),
      });

      alert(`✓ Puesto "${stallForm.code.toUpperCase()}" actualizado correctamente.`);
      setIsEditModalOpen(false);
      setEditingStall(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar puesto');
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Eliminación
  const handleOpenDeleteModal = (stall: any) => {
    setDeletingStall(stall);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingStall) return;

    try {
      setSubmitting(true);
      await apiRequest(`/stalls/${deletingStall.id}`, {
        method: 'DELETE',
      });

      alert(`✓ Puesto "${deletingStall.code}" eliminado exitosamente.`);
      setIsDeleteModalOpen(false);
      setDeletingStall(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar puesto');
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Reordenamiento / Renumeración por Giro
  const handleReorderSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await apiRequest('/stalls/reorder-by-giro', {
        method: 'POST',
        body: JSON.stringify({ giro: selectedGiro || undefined }),
      });

      alert(`✓ ${res.message || 'Renumeración completada con éxito.'}`);
      setIsReorderModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al renumerar puestos');
    } finally {
      setSubmitting(false);
    }
  };

  // Stalls filtered for mass carnet printing
  const massPrintStalls = useMemo(() => {
    return stalls
      .filter((st) => {
        if (massCarnetSectorId && st.sectorId !== massCarnetSectorId) return false;
        if (massCarnetGiro) {
          const sg = st.giro || st.sector?.name || '';
          if (sg.toLowerCase() !== massCarnetGiro.toLowerCase()) return false;
        }
        return !!st.assignedMerchant;
      })
      .sort((a, b) => {
        const numA = Number(a.stallNumber) || 0;
        const numB = Number(b.stallNumber) || 0;
        if (numA !== numB) return numA - numB;
        const nameA = `${a.assignedMerchant?.lastName || ''} ${a.assignedMerchant?.firstName || ''}`.trim();
        const nameB = `${b.assignedMerchant?.lastName || ''} ${b.assignedMerchant?.firstName || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
  }, [stalls, massCarnetSectorId, massCarnetGiro]);

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

      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Store className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              Gestión de Puestos y Espacios
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Control físico y comercial por <b className="text-slate-800">Giros Comerciales</b>. Cada giro mantiene su orden
            correlativo independiente (Puesto #1, #2, #3...) con asignación de comerciantes titulares.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Puesto</span>
          </button>

          <button
            onClick={() => setIsReorderModalOpen(true)}
            title="Renumerar puestos de cada giro correlativamente desde el 1"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Renumerar por Giro</span>
          </button>

          <button
            onClick={() => {
              setMassCarnetSectorId(selectedSector);
              setMassCarnetGiro(selectedGiro);
              setIsMassCarnetModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Carnets QR A4</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Numérico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Puestos</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-600">Ocupados</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.occupied}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-amber-600">Libres / Vacantes</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">{stats.free}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-indigo-600">Giros Activos</p>
            <p className="text-2xl font-black text-indigo-700 mt-0.5">{availableGiros.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Selector de Giros (Pestañas Rápidas con Conteo) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Filtrar por Giro Comercial (Cada giro comienza en el orden #1):
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedGiro('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              selectedGiro === ''
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Todos los Giros</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">{stalls.length}</span>
          </button>

          {availableGiros.map((g) => {
            const countInGiro = stalls.filter(
              (s) => (s.giro || s.sector?.name || '').toLowerCase() === g.toLowerCase()
            ).length;
            const isSelected = selectedGiro.toLowerCase() === g.toLowerCase();

            return (
              <button
                key={g}
                onClick={() => setSelectedGiro(isSelected ? '' : g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{g}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {countInGiro}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros secundarios y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, N°, titular..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filtro Sector */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Todos los Sectores / Pabellones</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Filtro Estado */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="OCUPADO">Ocupados</option>
            <option value="LIBRE">Libres / Vacantes</option>
            <option value="RESERVADO">Reservados</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>

        {/* Toggle Vista Cuadrícula / Tabla */}
        <div className="flex items-center space-x-1 border border-slate-200 p-0.5 rounded-xl">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${
              viewMode === 'GRID' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 ${
              viewMode === 'TABLE' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vista Tabla"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LISTADO DE PUESTOS */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm font-bold bg-white rounded-3xl border border-slate-200">
          Cargando puestos y espacios del mercado...
        </div>
      ) : filteredStalls.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No se encontraron puestos con los filtros seleccionados.</p>
          <p className="text-xs text-slate-400 mt-1">Pruebe limpiando la búsqueda o cambie de giro comercial.</p>
          <button
            onClick={() => {
              setSelectedGiro('');
              setSelectedSector('');
              setSelectedStatus('');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* VISTA DE CUADRÍCULA */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStalls.map((st) => {
            const currentGiro = st.giro || st.sector?.name || 'Giro General';
            const m = st.assignedMerchant;

            return (
              <div
                key={st.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-black tracking-tight">
                          ORDEN #{st.stallNumber || 1}
                        </span>
                        <span className="font-mono font-black text-lg text-slate-900">{st.code}</span>
                      </div>
                      <p className="text-[11px] font-bold text-indigo-900 mt-1 truncate max-w-[170px]" title={currentGiro}>
                        {currentGiro}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        st.status === 'OCUPADO'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : st.status === 'LIBRE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>

                  {/* Sector y Ubicación */}
                  <p className="text-[11px] text-slate-500 mb-2 truncate">
                    📍 {st.sector?.name} {st.locationDescription ? `• ${st.locationDescription}` : ''}
                  </p>

                  {/* Titular del puesto */}
                  {m ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Titular Asignado:</p>
                      <p className="font-bold text-slate-800 truncate" title={`${m.lastName}, ${m.firstName}`}>
                        {m.lastName}, {m.firstName}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>DNI: {m.dni}</span>
                        <span className="text-emerald-700 font-bold">{m.merchantType?.name || 'Socio'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-800">
                      <p className="font-bold text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Puesto Disponible
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">Listo para asignar socio o alquilar.</p>
                    </div>
                  )}

                  {st.observations && (
                    <p className="text-[10px] text-slate-400 italic mt-2 truncate" title={st.observations}>
                      Nota: {st.observations}
                    </p>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(st)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                      title="Modificar puesto y titular"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modificar</span>
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(st)}
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition"
                      title="Eliminar puesto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {m && (
                    <button
                      onClick={() => {
                        setMassCarnetSectorId(st.sectorId);
                        setMassCarnetGiro(currentGiro);
                        setIsMassCarnetModalOpen(true);
                      }}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                      title="Ver Carnet QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA DETALLADA */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 text-center">N° en Giro</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Giro Comercial</th>
                  <th className="p-3">Sector / Pabellón</th>
                  <th className="p-3">Comerciante Titular</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStalls.map((st) => {
                  const currentGiro = st.giro || st.sector?.name || 'General';
                  const m = st.assignedMerchant;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-center font-black font-mono text-indigo-700">
                        #{st.stallNumber || 1}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{st.code}</td>
                      <td className="p-3 font-semibold text-slate-800">{currentGiro}</td>
                      <td className="p-3 text-slate-600">{st.sector?.name}</td>
                      <td className="p-3">
                        {m ? (
                          <span className="font-bold text-slate-800">
                            {m.lastName}, {m.firstName}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold italic">Disponible</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{m?.dni || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            st.status === 'OCUPADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.status === 'LIBRE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(st)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition"
                            title="Editar puesto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(st)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition"
                            title="Eliminar puesto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREAR NUEVO PUESTO                                                 */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Registrar Nuevo Puesto
                  </h2>
                  <p className="text-xs text-slate-500">Configuración de orden y giro comercial.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {/* Giro Comercial */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Giro Comercial del Puesto:</label>
                <select
                  value={stallForm.giro}
                  onChange={(e) => {
                    const g = e.target.value;
                    const stallsInG = stalls.filter(
                      (s) => (s.giro || s.sector?.name || '').toLowerCase() === g.toLowerCase()
                    );
                    const maxN = stallsInG.reduce((m, s) => Math.max(m, Number(s.stallNumber) || 0), 0);
                    const nextN = maxN + 1;

                    let prefix = 'P-';
                    if (g.includes('Carnes')) prefix = 'CAR-';
                    else if (g.includes('Frutas')) prefix = 'FV-';
                    else if (g.includes('Abarrotes')) prefix = 'AB-';
                    else if (g.includes('Comidas')) prefix = 'CJ-';
                    else if (g.includes('Ambulant')) prefix = 'AMB-';

                    setStallForm((prev) => ({
                      ...prev,
                      giro: g,
                      stallNumber: nextN,
                      code: `${prefix}${String(nextN).padStart(2, '0')}`,
                    }));
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {availableGiros.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="OTRO">+ Otro Giro Comercial Personalizado</option>
                </select>
              </div>

              {stallForm.giro === 'OTRO' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Giro Personalizado:</label>
                  <input
                    type="text"
                    required
                    value={stallForm.customGiro}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, customGiro: e.target.value }))}
                    placeholder="Ej. Ropa y Calzado, Florería, etc."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Número en el Giro y Código */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    N° de Puesto en el Giro:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stallForm.stallNumber}
                    onChange={(e) =>
                      setStallForm((prev) => ({ ...prev, stallNumber: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Orden secuencial del giro</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código del Puesto:</label>
                  <input
                    type="text"
                    required
                    value={stallForm.code}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="Ej. CAR-01, P-001..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Identificador físico único</span>
                </div>
              </div>

              {/* Sector Físico y Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sector / Pabellón Físico:</label>
                  <select
                    value={stallForm.sectorId}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, sectorId: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado Inicial:</label>
                  <select
                    value={stallForm.status}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LIBRE">LIBRE (Vacante)</option>
                    <option value="OCUPADO">OCUPADO</option>
                    <option value="RESERVADO">RESERVADO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              {/* Asignar Comerciante Titular (Opcional) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asignar Comerciante Titular (Opcional):
                </label>
                <select
                  value={stallForm.merchantId}
                  onChange={(e) =>
                    setStallForm((prev) => ({
                      ...prev,
                      merchantId: e.target.value,
                      status: e.target.value ? 'OCUPADO' : prev.status,
                    }))
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sin Comerciante (Puesto Libre) --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} - DNI {m.dni} ({m.businessCategory || 'Comercio'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción de Ubicación */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ubicación Física Específica:</label>
                <input
                  type="text"
                  value={stallForm.locationDescription}
                  onChange={(e) => setStallForm((prev) => ({ ...prev, locationDescription: e.target.value }))}
                  placeholder="Ej. Pasaje Central, frente a Puerta 2, Nivel 1"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas:</label>
                <textarea
                  rows={2}
                  value={stallForm.observations}
                  onChange={(e) => setStallForm((prev) => ({ ...prev, observations: e.target.value }))}
                  placeholder="Medidas, conexión eléctrica, agua..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow transition flex items-center space-x-1.5"
                >
                  <span>{submitting ? 'Guardando...' : 'Guardar Puesto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDITAR / MODIFICAR PUESTO                                          */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingStall && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Modificar Puesto {editingStall.code}
                  </h2>
                  <p className="text-xs text-slate-500">Ajustar orden por giro, sector o comerciante titular.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              {/* Giro Comercial */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Giro Comercial del Puesto:</label>
                <select
                  value={stallForm.giro}
                  onChange={(e) => setStallForm((prev) => ({ ...prev, giro: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {availableGiros.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="OTRO">+ Otro Giro Comercial Personalizado</option>
                </select>
              </div>

              {stallForm.giro === 'OTRO' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Giro Personalizado:</label>
                  <input
                    type="text"
                    required
                    value={stallForm.customGiro}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, customGiro: e.target.value }))}
                    placeholder="Ej. Ropa y Calzado, Florería, etc."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Número en el Giro y Código */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    N° de Puesto en el Giro:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stallForm.stallNumber}
                    onChange={(e) =>
                      setStallForm((prev) => ({ ...prev, stallNumber: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Orden secuencial en este giro</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código del Puesto:</label>
                  <input
                    type="text"
                    required
                    value={stallForm.code}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Identificador físico</span>
                </div>
              </div>

              {/* Sector Físico y Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sector / Pabellón Físico:</label>
                  <select
                    value={stallForm.sectorId}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, sectorId: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado del Puesto:</label>
                  <select
                    value={stallForm.status}
                    onChange={(e) => setStallForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LIBRE">LIBRE (Vacante)</option>
                    <option value="OCUPADO">OCUPADO</option>
                    <option value="RESERVADO">RESERVADO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              {/* Comerciante Titular Asignado */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-800">Comerciante Titular Asignado:</label>
                  {stallForm.merchantId && (
                    <button
                      type="button"
                      onClick={() =>
                        setStallForm((prev) => ({
                          ...prev,
                          merchantId: '',
                          status: 'LIBRE',
                        }))
                      }
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline"
                    >
                      Liberar Puesto
                    </button>
                  )}
                </div>

                <select
                  value={stallForm.merchantId}
                  onChange={(e) =>
                    setStallForm((prev) => ({
                      ...prev,
                      merchantId: e.target.value,
                      status: e.target.value ? 'OCUPADO' : prev.status,
                    }))
                  }
                  className="w-full p-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Puesto Libre (Sin comerciante) --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} - DNI {m.dni} ({m.businessCategory || 'Comercio'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción de Ubicación */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ubicación Física Específica:</label>
                <input
                  type="text"
                  value={stallForm.locationDescription}
                  onChange={(e) => setStallForm((prev) => ({ ...prev, locationDescription: e.target.value }))}
                  placeholder="Ej. Pasaje Central, frente a Puerta 2"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas:</label>
                <textarea
                  rows={2}
                  value={stallForm.observations}
                  onChange={(e) => setStallForm((prev) => ({ ...prev, observations: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow transition flex items-center space-x-1.5"
                >
                  <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ELIMINAR PUESTO                                                    */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deletingStall && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                ¿Eliminar puesto {deletingStall.code}?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta acción eliminará el registro físico del puesto en el sistema. Si el puesto tiene un comerciante asignado, este será desvinculado automáticamente.
              </p>
              {deletingStall.assignedMerchant && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] text-left">
                  <span className="font-bold">Atención:</span> El comerciante{' '}
                  <b>
                    {deletingStall.assignedMerchant.lastName}, {deletingStall.assignedMerchant.firstName}
                  </b>{' '}
                  quedará sin puesto asignado.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow transition"
              >
                {submitting ? 'Eliminando...' : 'Sí, Eliminar Puesto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL RENUMERAR PUESTOS POR GIRO                                         */}
      {/* ========================================================================= */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Renumerar Puestos por Giro
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta acción reordenará automáticamente la numeración secuencial (
                <b>#1, #2, #3...</b>) de cada puesto dentro de su giro comercial respectivo, asegurando que ningún giro tenga números repetidos ni desordenados.
              </p>
              {selectedGiro && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 text-xs font-bold">
                  Se renumerará el giro seleccionado: "{selectedGiro}"
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReorderSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow transition"
              >
                {submitting ? 'Renumerando...' : 'Confirmar Renumeración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPRESIÓN MASIVA DE CARNETS QR EN HOJA A4                         */}
      {/* ========================================================================= */}
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

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={massCarnetGiro}
                  onChange={(e) => setMassCarnetGiro(e.target.value)}
                  className="py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos los Giros</option>
                  {availableGiros.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>

                <select
                  value={massCarnetSectorId}
                  onChange={(e) => setMassCarnetSectorId(e.target.value)}
                  className="py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos los Sectores</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir ({massPrintStalls.length})</span>
                </button>
              </div>
            </div>

            {/* A4 Printable Container */}
            <div id="printable-mass-carnets" className="space-y-6">
              {massPrintStalls.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay comerciantes asignados con los filtros seleccionados para generar carnets.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {massPrintStalls.map((st) => {
                    const m = st.assignedMerchant;
                    const qrVal = m.qrCode || `MB-QR-${m.dni}`;
                    const stallGiro = st.giro || st.sector?.name || 'Comercio';

                    return (
                      <div
                        key={st.id}
                        className="carnet-grid-card border-2 border-dashed border-emerald-600/70 p-4 rounded-2xl bg-white relative flex flex-col justify-between shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                          <div className="flex items-center space-x-2">
                            <img
                              src="/logo.png"
                              alt="Logo"
                              className="w-8 h-8 rounded-full border border-amber-400/50 object-cover"
                            />
                            <div>
                              <p className="font-black text-[11px] text-slate-900 leading-tight uppercase">
                                Micaela Bastidas
                              </p>
                              <p className="text-[9px] font-bold text-emerald-700 uppercase">
                                Mercado de Abastos
                              </p>
                            </div>
                          </div>
                          <div className="bg-emerald-700 text-white px-3 py-1 rounded-xl text-right">
                            <p className="text-[8px] uppercase font-bold text-emerald-200 leading-tight">
                              ORDEN #{st.stallNumber || 1} • PUESTO
                            </p>
                            <p className="text-xl font-black font-mono leading-tight">{st.code}</p>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex items-center gap-3 py-1">
                          {/* Foto */}
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
                              <span className="text-[9px] font-bold uppercase text-slate-400 block">Giro Comercial</span>
                              <span className="font-semibold text-slate-700 block truncate text-[11px]">
                                {stallGiro} • {m.merchantType?.name || 'Socio'}
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

                        {/* Footer */}
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
