import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Mercado de Abastos Micaela Bastidas - Sistema de Recaudación y Cobranzas',
  description: 'Plataforma administrativa integral para control de recaudación, padrón de comerciantes, puestos, servicios higiénicos y rendiciones contables.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
