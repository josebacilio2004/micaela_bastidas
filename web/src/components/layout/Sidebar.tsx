'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  Receipt,
  Bath,
  Wallet,
  FileSpreadsheet,
  Sliders,
  History,
  Shield,
  Calendar,
  Smartphone,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Padrón Comerciantes', href: '/padron', icon: Users },
  { name: 'Puestos y Espacios', href: '/puestos', icon: Store },
  { name: 'Cobranza y Pagos', href: '/pagos', icon: Receipt },
  { name: 'Servicios Higiénicos', href: '/servicios-higienicos', icon: Bath },
  { name: 'Caja y Cierres', href: '/caja', icon: Wallet },
  { name: 'Reuniones y Asistencia', href: '/reuniones', icon: Calendar },
  { name: 'Sincronización Móvil', href: '/sincronizacion', icon: Smartphone },
  { name: 'Reportes y Exportación', href: '/reportes', icon: FileSpreadsheet },
  { name: 'Tarifas Vigentes', href: '/tarifas', icon: Sliders },
  { name: 'Auditoría del Sistema', href: '/auditoria', icon: History },
  { name: 'Gestión Usuarios', href: '/usuarios', icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow mr-3">
          MB
        </div>
        <div>
          <h1 className="text-xs font-bold uppercase tracking-wider text-white">Micaela Bastidas</h1>
          <p className="text-[10px] text-emerald-400 font-medium">Mercado de Abastos</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Módulos Principales
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 text-center">
        <p className="font-semibold text-slate-300">Sistema de Gestión v1.0</p>
        <p className="text-[10px] text-slate-500">Producción • 2026</p>
      </div>
    </aside>
  );
}
