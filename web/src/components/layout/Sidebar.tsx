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
  Coins,
  Droplets,
  FolderOpen,
  Sparkles,
  Megaphone,
  HandCoins,
  UserCog,
  Video,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navigationSections: NavSection[] = [
  {
    title: '1. Administración',
    items: [
      { name: 'Padrón Comerciantes', href: '/padron', icon: Users },
      { name: 'Puestos y Espacios', href: '/puestos', icon: Store },
      { name: 'Gestión Documental', href: '/documentos', icon: FolderOpen },
      { name: 'Reuniones y Asambleas', href: '/reuniones', icon: Calendar },
      { name: 'Faenas de Limpieza', href: '/faenas', icon: Sparkles },
      { name: 'Publicidad & J.A.R.V.I.S', href: '/publicidad', icon: Megaphone },
      { name: 'Personal y Planilla', href: '/personal', icon: UserCog },
    ],
  },
  {
    title: '2. Tesorería y Caja',
    items: [
      { name: 'Caja y Cierres Diarios', href: '/caja', icon: Wallet },
      { name: 'Cobranza Alcabala', href: '/alcabala', icon: Coins },
      { name: 'Cobranza de Agua', href: '/agua', icon: Droplets },
      { name: 'Servicios Higiénicos', href: '/servicios-higienicos', icon: Bath },
      { name: 'Fondo Rotatorio', href: '/fondo-rotatorio', icon: HandCoins },
      { name: 'Historial de Pagos', href: '/pagos', icon: Receipt },
      { name: 'Tarifas Vigentes', href: '/tarifas', icon: Sliders },
    ],
  },
  {
    title: '3. Seguridad y Monitoreo',
    items: [
      { name: 'Cámaras de Seguridad CCTV', href: '/camaras', icon: Video },
    ],
  },
  {
    title: '4. Reportes y Gobierno',
    items: [
      { name: 'Dashboard General', href: '/', icon: LayoutDashboard },
      { name: 'Reportes y Balances', href: '/reportes', icon: FileSpreadsheet },
      { name: 'Auditoría del Sistema', href: '/auditoria', icon: History },
      { name: 'Sincronización Móvil', href: '/sincronizacion', icon: Smartphone },
      { name: 'Gestión Usuarios', href: '/usuarios', icon: Shield },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 h-screen border-r border-slate-800 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-slate-800 bg-slate-950 flex-shrink-0 transition-all ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <img
            src="/logo.png"
            alt="Logo Micaela Bastidas"
            className="w-9 h-9 rounded-full shadow-md border border-amber-400/40 object-cover flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-black uppercase tracking-wider text-white truncate">Micaela Bastidas</h1>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wide truncate">MERCADO DE ABASTOS</p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expandir menú lateral' : 'Ocultar menú lateral'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex-shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav Menu por Categorías */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {navigationSections.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'pt-2 border-t border-slate-800/70' : ''}>
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>{section.title}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center rounded-xl text-xs font-medium transition ${
                      isCollapsed ? 'justify-center py-2.5 px-0' : 'px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-2.5'} ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 text-center flex-shrink-0">
        {!isCollapsed ? (
          <>
            <p className="font-semibold text-slate-300">Sistema de Gestión v1.0</p>
            <p className="text-[10px] text-slate-500">Producción • 2026</p>
          </>
        ) : (
          <span className="text-[9px] font-bold text-slate-500">2026</span>
        )}
      </div>
    </aside>
  );
}
