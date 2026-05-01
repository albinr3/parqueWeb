'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime, formatCurrency, translateStatus, statusColor } from '@/lib/utils';

interface Ticket {
  id: string;
  ticketNumber: number;
  plate: string | null;
  status: string;
  entryTime: string;
  exitTime: string | null;
  amountCharged: number | null;
  isLostTicket: boolean;
  user: { name: string };
}

interface User {
  id: string;
  name: string;
}

export default function HistorialPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros — por defecto muestra los tickets del día actual
  const today = new Date().toISOString().split('T')[0];
  const [ticketNumber, setTicketNumber] = useState('');
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (ticketNumber) params.set('ticketNumber', ticketNumber);
      if (plate) params.set('plate', plate);
      if (status) params.set('status', status);
      if (userId) params.set('userId', userId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTickets(json.tickets);
        setTotalPages(json.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [page, ticketNumber, plate, status, userId, dateFrom, dateTo]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleExport = async () => {
    // Construir CSV de los datos actuales
    const params = new URLSearchParams();
    params.set('limit', '10000');
    if (ticketNumber) params.set('ticketNumber', ticketNumber);
    if (plate) params.set('plate', plate);
    if (status) params.set('status', status);
    if (userId) params.set('userId', userId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    if (!res.ok) return;
    const json = await res.json();

    const headers = ['# Ticket', 'Placa', 'Entrada', 'Salida', 'Estado', 'Monto', 'Empleado'];
    const rows = json.tickets.map((t: Ticket) => [
      t.ticketNumber,
      t.plate || '',
      t.entryTime,
      t.exitTime || '',
      translateStatus(t.status),
      t.amountCharged || '',
      t.user.name,
    ]);

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_${dateFrom || 'todos'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-50)' }}>
            Historial de Tickets
          </h1>
          <p style={{ color: 'var(--dark-400)', fontSize: '0.9rem', marginTop: 4 }}>
            Consulta y filtra todos los tickets registrados
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <form className="filters-bar" onSubmit={handleSearch}>
        <input
          type="number"
          className="form-input compact-input"
          placeholder="# Ticket"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
        />
        <input
          type="text"
          className="form-input compact-input"
          placeholder="Placa"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
        <select
          className="form-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">En parqueo</option>
          <option value="PAID">Completado</option>
          <option value="LOST_PAID">Perdido</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
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
        <button type="submit" className="btn btn-primary">
          <Search size={18} />
          Buscar
        </button>
      </form>

      {/* Tabla */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : tickets.length > 0 ? (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th># Ticket</th>
                  <th>Placa</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Empleado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-400)' }}>
                      #{ticket.ticketNumber}
                    </td>
                    <td>{ticket.plate || '—'}</td>
                    <td>{formatDateTime(ticket.entryTime)}</td>
                    <td>
                      {ticket.exitTime ? formatDateTime(ticket.exitTime) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${statusColor(ticket.status)}`}>
                        {translateStatus(ticket.status)}
                      </span>
                    </td>
                    <td>
                      {ticket.amountCharged != null
                        ? formatCurrency(ticket.amountCharged)
                        : '—'}
                    </td>
                    <td>{ticket.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Search size={48} />
          <p>No se encontraron tickets con estos filtros</p>
        </div>
      )}
    </div>
  );
}
