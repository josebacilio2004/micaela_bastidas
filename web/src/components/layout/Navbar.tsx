'use client';
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, LogOut, ShieldCheck, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [time, setTime] = React.useState('');

  React.useEffect(() => {
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
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex items-center text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full capitalize">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
          {time || 'Cargando fecha...'}
        </div>
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
            <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-sm shadow">
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
            className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
}
