'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('micaela_sidebar_collapsed');
      if (saved === 'true') {
        setIsSidebarCollapsed(true);
      }
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('micaela_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && (!user || !token) && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, token, loading, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading || (!user || !token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
