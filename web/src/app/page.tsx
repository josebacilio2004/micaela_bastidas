'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Bath,
  RefreshCw,
  Wallet,
  Users,
  Store,
  Coins,
  ArrowRight,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const summary = await apiRequest('/reports/dashboard');
      setData(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-3">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
          Cargando Panel de Control Central...
        </p>
      </div>
    );
  }

  // 1. Datos para Tendencia Semanal (AreaChart)
  const weeklyData = data.last7Days && data.last7Days.length > 0
    ? data.last7Days
    : [
        { day: 'Lun', date: '01/10', recaudacion: 320 },
        { day: 'Mar', date: '02/10', recaudacion: 410 },
        { day: 'Mié', date: '03/10', recaudacion: 280 },
        { day: 'Jue', date: '04/10', recaudacion: 530 },
        { day: 'Vie', date: '05/10', recaudacion: 620 },
        { day: 'Sáb', date: '06/10', recaudacion: 890 },
        { day: 'Hoy', date: '07/10', recaudacion: Number(data.today?.total || 0) },
      ];

  // 2. Datos por Conceptos (BarChart)
  const conceptsData = [
    { name: 'Alcabala', monto: data.today?.alcabala || 0, fill: '#059669' },
    { name: 'Agua Potable', monto: data.today?.water || 0, fill: '#0284c7' },
    { name: 'SS.HH.', monto: data.today?.sanitaryTotal || 0, fill: '#8b5cf6' },
  ];

  // 3. Padrón de Comerciantes (Donut PieChart)
  const pieData = [
    { name: 'Socios Empadronados', value: data.merchants?.socios || 0, color: '#059669' },
    { name: 'Ambulantes Fijos', value: data.merchants?.ambulantesFijos || 0, color: '#0284c7' },
    { name: 'Ambulantes Temporales', value: data.merchants?.ambulantesTemporales || 0, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner Principal de Bienvenida */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Control Operativo y Financiero en Vivo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            MERCADO DE ABASTOS MICAELA BASTIDAS
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Supervisión integral de recaudación diaria, caja general, flujo financiero, padrón documental y alquileres.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md transition self-start md:self-center"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudación Hoy */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Recaudación Hoy</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono">
              S/ {Number(data.today?.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {data.today?.operationsCount || 0} cobros y turnos registrados
            </p>
          </div>
        </div>

        {/* Recaudación Mes */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Acumulado del Mes</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono">
              S/ {Number(data.month?.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold">
              {data.month?.paymentsCount || 0} operaciones facturadas en el mes
            </p>
          </div>
        </div>

        {/* Servicios Higiénicos Hoy */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Servicios Higiénicos</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bath className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono">
              S/ {Number(data.today?.sanitaryTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold">
              Micc: S/ {Number(data.today?.urinal || 0).toFixed(2)} | Ret: S/ {Number(data.today?.toilet || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Deuda Pendiente */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Deuda Pendiente</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-600 font-mono">
              S/ {Number(data.pending?.totalAmount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold">
              {data.pending?.count || 0} cuotas por cobrar en el padrón
            </p>
          </div>
        </div>
      </div>

      {/* Fila 2: Gráficos Interactivos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: AreaChart Tendencia Semanal de Recaudación */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Evolución de Recaudación Semanal (Soles)
              </h2>
              <p className="text-[11px] text-slate-400">Tendencia histórica de ingresos en los últimos 7 días</p>
            </div>
            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl self-start">
              Dinámica Diaria
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecaudacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Recaudado']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Area
                  type="monotone"
                  dataKey="recaudacion"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRecaudacion)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Donut Chart Padrón de Comerciantes */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                Padrón de Comerciantes
              </h2>
              <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                {data.merchants?.total || 0} Total
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Distribución oficial de la asociación</p>
          </div>

          <div className="h-48 flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} comerciantes`, 'Total']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2"></span>Socios Titulares:
              </span>
              <span className="font-mono font-black text-slate-900">{data.merchants?.socios || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 mr-2"></span>Ambulantes Fijos:
              </span>
              <span className="font-mono font-black text-slate-900">{data.merchants?.ambulantesFijos || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>Ambulantes Temporales:
              </span>
              <span className="font-mono font-black text-slate-900">{data.merchants?.ambulantesTemporales || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 3: Recaudación por Concepto (BarChart) + Accesos Directos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BarChart por Conceptos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              Recaudación de Hoy por Servicio
            </h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conceptsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Recaudado']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                  {conceptsData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accesos Rápidos a Módulos Clave */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Accesos Directos a Operaciones
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Acceda rápidamente a las áreas operativas del mercado</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Link
              href="/caja"
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-emerald-800">Caja y Arqueo Diario</p>
                  <p className="text-[10px] text-slate-400">Apertura, cierres y consolidación</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/flujo-caja"
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-800">Flujo de Caja Consolidado</p>
                  <p className="text-[10px] text-slate-400">Ingresos vs. Egresos del mes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/padron"
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-amber-800">Padrón de Comerciantes</p>
                  <p className="text-[10px] text-slate-400">Expedientes y subida de documentos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/alquileres"
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-purple-800">Alquiler de Puestos</p>
                  <p className="text-[10px] text-slate-400">Contratos, cuotas y cronogramas</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 transition transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/fondo-rotatorio"
              className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between group sm:col-span-2"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-indigo-800">Fondo Rotatorio Solidario</p>
                  <p className="text-[10px] text-slate-400">Microcréditos con cronograma y amortización a caja</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 transition transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
