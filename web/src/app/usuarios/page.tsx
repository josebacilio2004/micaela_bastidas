'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { ShieldCheck, UserCheck, CheckCircle2 } from 'lucide-react';

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/users');
        setUsers(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Usuarios y Roles</h1>
        <p className="text-xs text-slate-500">Control RBAC: Administrador, Tesorera, Servicios Higiénicos y Consulta.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4">Nombre Completo</th>
              <th className="py-3 px-4">Correo</th>
              <th className="py-3 px-4">Teléfono</th>
              <th className="py-3 px-4">Rol Asignado</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Cargando usuarios...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-800">{u.username}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{u.fullName}</td>
                  <td className="py-3 px-4 text-slate-500">{u.email || '-'}</td>
                  <td className="py-3 px-4 font-mono">{u.phone || '-'}</td>
                  <td className="py-3 px-4">
                    {u.roles.map((r: any) => (
                      <span key={r.role.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 mr-1">
                        {r.role.name}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
