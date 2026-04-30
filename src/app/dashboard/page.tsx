'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  DollarSign,
  AlertTriangle,
  ParkingCircle,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface KPIs {
  totalMotos: number;
  motosActivas: number;
  totalRecaudado: number;
  ticketsNormales: number;
  montoNormales: number;
  ticketsPerdidos: number;
  montoPerdidos: number;
}

interface Ticket {
  id: string;
  ticketNumber: number;
  plate: string | null;
  status: string;
  entryTime: string;
  exitTime: string | null;
  amountCharged: number | null;
  user: { name: string };
}

interface Closure {
  id: string;
  shiftLabel: string;
  totalTickets: number;
  totalAmount: number;
  normalTickets: number;
  lostTickets: number;
  endTime: string;
  user: { name: string };
}

interface ReportData {
  kpis: KPIs;
  ultimosTickets: Ticket[];
  cierres: Closure[];
}

export default function DashboardPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalMotos: 0,
    motosActivas: 0,
    totalRecaudado: 0,
    ticketsNormales: 0,
    montoNormales: 0,
    ticketsPerdidos: 0,
    montoPerdidos: 0,
  };

  return (
    <div>
      {/* Encabezado con botón de refrescar */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-50)' }}>
            Resumen del Día
          </h1>
          <p style={{ color: 'var(--dark-400)', fontSize: '0.9rem', marginTop: 4 }}>
            Vista general de la operación de hoy
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={fetchData}>
            <RefreshCw size={18} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-stats" style={{ marginBottom: 32 }}>
        <div className="stat-card stat-primary">
          <div className="stat-card-header">
            <span className="stat-card-label">Motos Hoy</span>
            <div className="stat-card-icon icon-primary">
              <Bike size={22} />
            </div>
          </div>
          <div className="stat-card-value">{kpis.totalMotos}</div>
          <div className="stat-card-change">
            {kpis.ticketsNormales} normales · {kpis.ticketsPerdidos} perdidos
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-card-header">
            <span className="stat-card-label">Recaudado</span>
            <div className="stat-card-icon icon-success">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="stat-card-value">{formatCurrency(kpis.totalRecaudado)}</div>
          <div className="stat-card-change">
            Normal: {formatCurrency(kpis.montoNormales)} · Perdidos: {formatCurrency(kpis.montoPerdidos)}
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-card-header">
            <span className="stat-card-label">Tickets Perdidos</span>
            <div className="stat-card-icon icon-danger">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div className="stat-card-value">{kpis.ticketsPerdidos}</div>
          <div className="stat-card-change">
            {formatCurrency(kpis.montoPerdidos)} recaudados
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-card-header">
            <span className="stat-card-label">Motos Activas</span>
            <div className="stat-card-icon icon-info">
              <ParkingCircle size={22} />
            </div>
          </div>
          <div className="stat-card-value">{kpis.motosActivas}</div>
          <div className="stat-card-change">Actualmente en el parqueo</div>
        </div>
      </div>

      {/* Cierres del día */}
      {data?.cierres && data.cierres.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-50)', marginBottom: 16 }}>
            Cierres de Hoy
          </h3>
          <div className="grid-stats">
            {data.cierres.map((closure) => (
              <div key={closure.id} className="card">
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <span className="badge badge-primary">{closure.shiftLabel}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                    {closure.user.name}
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-400)', marginBottom: 8 }}>
                  {formatCurrency(closure.totalAmount)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-300)' }}>
                  {closure.totalTickets} motos · {closure.normalTickets} normales · {closure.lostTickets} perdidos
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
