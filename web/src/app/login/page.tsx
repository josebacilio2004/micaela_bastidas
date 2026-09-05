'use client';
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { AlertCircle, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Micaela2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filledProfile, setFilledProfile] = useState<string>('admin');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      login(data.accessToken, data.refreshToken, data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const fill = (u: string) => {
    setUsername(u);
    setPassword('Micaela2026!');
    setFilledProfile(u);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-emerald-900/40">
          MB
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-white uppercase">
          Mercado de Abastos
        </h2>
        <p className="text-center text-sm font-semibold text-emerald-400">
          Micaela Bastidas • Sistema de Pagos y Recaudación
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tarjeta de Credenciales Visibles */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs mb-5">
            <div className="flex items-center text-emerald-800 font-bold mb-1.5">
              <KeyRound className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>Credenciales Oficiales del Sistema:</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-emerald-900">
              <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Administrador</span>
                <b>admin</b> / Micaela2026!
              </div>
              <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Tesorera</span>
                <b>tesorera</b> / Micaela2026!
              </div>
              <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-500 block uppercase font-sans">SS.HH.</span>
                <b>sshh_operador</b> / Micaela2026!
              </div>
              <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Auditor</span>
                <b>consulta</b> / Micaela2026!
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Clic para Cargar Perfil Automáticamente:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fill('admin')}
                className={`p-2 border rounded-lg font-semibold transition flex items-center justify-between ${filledProfile === 'admin' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:border-emerald-300 text-slate-700'}`}
              >
                <span>🛡️ Administrador</span>
                {filledProfile === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => fill('tesorera')}
                className={`p-2 border rounded-lg font-semibold transition flex items-center justify-between ${filledProfile === 'tesorera' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:border-emerald-300 text-slate-700'}`}
              >
                <span>💰 Tesorera</span>
                {filledProfile === 'tesorera' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => fill('sshh_operador')}
                className={`p-2 border rounded-lg font-semibold transition flex items-center justify-between ${filledProfile === 'sshh_operador' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:border-emerald-300 text-slate-700'}`}
              >
                <span>🚻 SSHH Operador</span>
                {filledProfile === 'sshh_operador' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => fill('consulta')}
                className={`p-2 border rounded-lg font-semibold transition flex items-center justify-between ${filledProfile === 'consulta' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:border-emerald-300 text-slate-700'}`}
              >
                <span>🔍 Auditor</span>
                {filledProfile === 'consulta' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
