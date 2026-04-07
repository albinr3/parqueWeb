'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Calendar } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface User {
  id: string;
  name: string;
}

interface Closure {
  id: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  totalTickets: number;
  normalTickets: number;
  lostTickets: number;
  totalAmount: number;
  normalAmount: number;
  lostAmount: number;
  notes: string | null;
  user: { name: string };
}

export default function CierresPage() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userId, setUserId] = useState('');

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/closures?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setClosures(json);
      }
    } catch (error) {
      console.error('Error cargando cierres:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setEmployees).catch(() => {});
    fetchClosures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClosures();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-50)' }}>
          Cierres por Turno
        </h1>
        <p style={{ color: 'var(--dark-400)', fontSize: '0.9rem', marginTop: 4 }}>
          Historial de cierres de caja con totales por turno
        </p>
      </div>

      {/* Filtros */}
      <form className="filters-bar" onSubmit={handleFilter}>
        <input
          type="date"
          className="form-input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="form-input"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <select
          className="form-input"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Todos los empleados</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          <Calendar size={18} />
          Filtrar
        </button>
      </form>

      {/* Lista de Cierres */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : closures.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {closures.map((closure) => (
            <div key={closure.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Barra superior de color */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'var(--primary-500)',
              }} />

              <div className="flex-between" style={{ marginBottom: 16 }}>
                <div className="flex-gap">
                  <span className="badge badge-primary" style={{ fontSize: '0.85rem' }}>
                    {closure.shiftLabel}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--dark-100)' }}>
                    {closure.user.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                  {formatDateTime(closure.endTime)}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16,
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dark-400)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Total Motos
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark-50)' }}>
                    {closure.totalTickets}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dark-400)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Normales
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                    {closure.normalTickets} × {formatCurrency(closure.normalAmount / (closure.normalTickets || 1))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dark-400)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Perdidos
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
                    {closure.lostTickets}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dark-400)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Total Recaudado
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-400)' }}>
                    {formatCurrency(closure.totalAmount)}
                  </div>
                </div>
              </div>

              {closure.notes && (
                <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--dark-300)', fontStyle: 'italic' }}>
                  📝 {closure.notes}
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                Horario: {formatDateTime(closure.startTime)} — {formatDateTime(closure.endTime)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No se encontraron cierres con estos filtros</p>
        </div>
      )}
    </div>
  );
}
