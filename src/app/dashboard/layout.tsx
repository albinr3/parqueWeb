'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/historial', label: 'Historial', icon: Ticket },
  { href: '/dashboard/cierres', label: 'Cierres', icon: ClipboardList },
  { href: '/dashboard/empleados', label: 'Empleados', icon: Users },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = localStorage.getItem('dashboard-theme');
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });
  const today = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    localStorage.setItem('dashboard-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #EE8600, #CC7300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              flexShrink: 0,
            }}
          >
            🏍️
          </div>
          <div>
            <div className="sidebar-logo-text">Parqueo Badia</div>
            <div className="sidebar-logo-sub">Panel de Control</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="flex-gap">
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }}
              id="menu-toggle"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="header-title">
              {navItems.find(
                (item) =>
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
              )?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="header-right">
            <span className="header-date" suppressHydrationWarning>{today}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">{children}</div>
      </div>

      {/* Mostrar botón de menú en móvil */}
      <style>{`
        @media (max-width: 768px) {
          #menu-toggle { display: flex !important; }
          .theme-toggle-btn span { display: none; }
        }
      `}</style>
    </div>
  );
}
