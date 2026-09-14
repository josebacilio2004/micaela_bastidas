'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, LogOut, ShieldCheck, Clock, AlertTriangle, Wallet, Smartphone, X, PanelLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface NavbarProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Navbar({ isSidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [time, setTime] = useState('');
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [isPast5PM, setIsPast5PM] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  // Time and 5:00 PM alert check
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('es-PE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) + ' | ' + now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      );

      // Check if past or at 17:00 (5:00 PM)
      const hours = now.getHours();
      setIsPast5PM(hours >= 17);
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active register status
  useEffect(() => {
    if (user) {
      apiRequest('/cash-registers/current')
        .then((reg) => setActiveRegister(reg))
        .catch(() => setActiveRegister(null));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const showClosingAlert = isPast5PM && activeRegister && !snoozed;

  return (
    <div className="flex flex-col flex-shrink-0 z-30 sticky top-0">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? 'Expandir menú lateral' : 'Ocultar menú lateral'}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-sm"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full capitalize">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            {time || 'Cargando fecha...'}
          </div>

          {activeRegister ? (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Caja Activa: {activeRegister.name}</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] text-amber-800 font-bold">
              <span>Sin Caja Abierta</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName}</p>
                <div className="flex items-center justify-end space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {user.roles.join(', ')}
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow">
                {user.fullName.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* Alerta Automática de Fin de Turno a las 5:00 PM */}
      {showClosingAlert && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-white/20 rounded-lg animate-bounce">
              <AlertTriangle className="w-4 h-4 text-white" />
            </span>
            <span>
              <b>ATENCIÓN (Fin de Jornada 5:00 PM):</b> La caja <i>"{activeRegister.name}"</i> sigue abierta. Por favor solicita al personal de recaudación y SSHH sincronizar sus terminales y realiza el arqueo de cierre diario.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/caja')}
              className="px-2.5 py-1 bg-white text-amber-900 rounded-lg text-[11px] font-black hover:bg-amber-50 shadow transition flex items-center space-x-1"
            >
              <Wallet className="w-3 h-3 text-amber-700" />
              <span>Ir a Caja</span>
            </button>
            <button
              onClick={() => router.push('/sincronizacion')}
              className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
            >
              <Smartphone className="w-3 h-3" />
              <span>Sincronizar</span>
            </button>
            <button
              onClick={() => setSnoozed(true)}
              title="Posponer recordatorio"
              className="p-1 text-white/80 hover:text-white rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
