import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Parqueo Moto Badia — Panel de Administración',
  description: 'Sistema de gestión y reportes para Parqueo Moto Badia. Control de tickets, cierres de turno y recaudación.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
