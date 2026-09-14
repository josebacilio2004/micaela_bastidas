'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { ShieldCheck, UserCheck, CheckCircle2, Plus, X, UserPlus, Lock } from 'lucide-react';

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'TESORERA',
  });

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        email: formData.email.trim() ? formData.email.trim() : undefined,
        phone: formData.phone.trim() ? formData.phone.trim() : undefined,
        roles: [formData.role],
      };

      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'TESORERA',
      });
      fetchUsers();
      alert('Usuario creado exitosamente.');
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Usuarios y Roles</h1>
          <p className="text-xs text-slate-500">Control RBAC: Administrador, Tesorera, Servicios Higiénicos y Consulta.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-4 uppercase flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-emerald-700" />
              <span>Crear Nuevo Usuario</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  placeholder="ej: tesorera, sshh_operador"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres (ej: Micaela2026!)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej: María Elena Quispe Rojas"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="opcional@correo.pe"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="ej: 984123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rol en el Sistema</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                >
                  <option value="TESORERA">TESORERA (Cobros, Padrón, Caja y Arqueo)</option>
                  <option value="SERVICIOS_HIGIENICOS">SERVICIOS HIGIÉNICOS (Operador de SSHH y Turnos)</option>
                  <option value="CONSULTA">CONSULTA (Auditoría e Informes de Lectura)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total y Configuración)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

