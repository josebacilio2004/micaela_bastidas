'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Bath,
  RefreshCw,
} from 'lucide-react';
import {
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
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const chartData = [
    { name: 'Alcabala', recaudado: data.today.alcabala },
    { name: 'Agua Potable', recaudado: data.today.water },
    { name: 'Miccionarios', recaudado: data.today.urinal },
    { name: 'Retretes', recaudado: data.today.toilet },
  ];

  const pieData = [
    { name: 'Socios', value: data.merchants.socios, color: '#059669' },
    { name: 'Ambulantes Fijos', value: data.merchants.ambulantesFijos, color: '#0284c7' },
    { name: 'Ambulantes Temporales', value: data.merchants.ambulantesTemporales, color: '#d97706' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Control de Recaudación en Tiempo Real
          </span>
          <h1 className="text-2xl font-black mt-2">MERCADO DE ABASTOS MICAELA BASTIDAS</h1>
          <p className="text-slate-300 text-xs mt-1">
            Panel central para supervisión financiera, padrón y rendiciones contables.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-4 md:mt-0 flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recaudación Hoy</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">
              S/ {Number(data.today.total).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {data.today.operationsCount} cobros y turnos hoy
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recaudación Mes</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">
              S/ {Number(data.month.total).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Mes actual (Septiembre 2026)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Servicios Higiénicos</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bath className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">
              S/ {Number(data.today.sanitaryTotal).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Micc: S/ {data.today.urinal.toFixed(2)} | Ret: S/ {data.today.toilet.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deuda Pendiente</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-600">
              S/ {Number(data.pending.totalAmount).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {data.pending.count} cuotas por cobrar
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
            Recaudación de Hoy por Concepto (Soles)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Recaudado']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="recaudado" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">
              Padrón de Comerciantes
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Total activos: <span className="font-bold text-slate-800">{data.merchants.total}</span>
            </p>
          </div>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2"></span>Socios:</span>
              <span className="font-bold">{data.merchants.socios}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-sky-600 mr-2"></span>Ambulantes Fijos:</span>
              <span className="font-bold">{data.merchants.ambulantesFijos}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 mr-2"></span>Ambulantes Temporales:</span>
              <span className="font-bold">{data.merchants.ambulantesTemporales}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
