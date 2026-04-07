'use client';

import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';

interface Config {
  parkingName: string;
  normalRate: number;
  lostTicketRate: number;
  shift1Start: string;
  shift1End: string;
  shift2Start: string;
  shift2End: string;
  ticketHeader: string | null;
}

// Convierte "14:00" → { hour: 2, minute: 0, period: 'PM' }
function to12h(time24: string): { hour: number; minute: number; period: string } {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

// Convierte { hour: 2, minute: 0, period: 'PM' } → "14:00"
function to24h(hour: number, minute: number, period: string): string {
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Componente selector de hora en formato 12h con AM/PM
function TimePicker12h({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  id: string;
}) {
  const parsed = to12h(value);

  const handleChange = (field: 'hour' | 'minute' | 'period', newVal: string) => {
    let { hour, minute, period } = parsed;
    if (field === 'hour') hour = parseInt(newVal);
    if (field === 'minute') minute = parseInt(newVal);
    if (field === 'period') period = newVal;
    onChange(to24h(hour, minute, period));
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        id={id}
        className="form-input"
        value={parsed.hour}
        onChange={(e) => handleChange('hour', e.target.value)}
        style={{ width: 75, textAlign: 'center' }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span style={{ color: 'var(--dark-300)', fontWeight: 700, fontSize: '1.1rem' }}>:</span>
      <select
        className="form-input"
        value={parsed.minute}
        onChange={(e) => handleChange('minute', e.target.value)}
        style={{ width: 75, textAlign: 'center' }}
      >
        {[0, 15, 30, 45].map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <select
        className="form-input"
        value={parsed.period}
        onChange={(e) => handleChange('period', e.target.value)}
        style={{
          width: 80,
          textAlign: 'center',
          fontWeight: 600,
          color: parsed.period === 'AM' ? 'var(--info)' : 'var(--primary-400)',
        }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Config>({
    parkingName: 'Parqueo Moto Badia',
    normalRate: 25,
    lostTicketRate: 100,
    shift1Start: '06:00',
    shift1End: '14:00',
    shift2Start: '14:00',
    shift2End: '22:00',
    ticketHeader: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const json = await res.json();
        setConfig(json);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        showToast('success', 'Configuración guardada correctamente');
      } else {
        showToast('error', 'Error al guardar configuración');
      }
    } catch {
      showToast('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setConfig({
      parkingName: 'Parqueo Moto Badia',
      normalRate: 25,
      lostTicketRate: 100,
      shift1Start: '06:00',
      shift1End: '14:00',
      shift2Start: '14:00',
      shift2End: '22:00',
      ticketHeader: '',
    });
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-50)' }}>
            Configuración
          </h1>
          <p style={{ color: 'var(--dark-400)', fontSize: '0.9rem', marginTop: 4 }}>
            Tarifas, turnos y datos del parqueo
          </p>
        </div>
        <button className="btn btn-ghost" onClick={resetDefaults}>
          <RotateCcw size={18} />
          Valores por defecto
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Datos del Parqueo */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-50)', marginBottom: 20 }}>
              🏍️ Datos del Parqueo
            </h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="parking-name">
                  Nombre del Parqueo
                </label>
                <input
                  id="parking-name"
                  type="text"
                  className="form-input"
                  value={config.parkingName}
                  onChange={(e) => setConfig({ ...config, parkingName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ticket-header">
                  Texto adicional en ticket (opcional)
                </label>
                <input
                  id="ticket-header"
                  type="text"
                  className="form-input"
                  placeholder="Ej: ¡Conserve su ticket!"
                  value={config.ticketHeader || ''}
                  onChange={(e) => setConfig({ ...config, ticketHeader: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Tarifas */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-50)', marginBottom: 20 }}>
              💰 Tarifas
            </h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="normal-rate">
                  Tarifa Normal (pesos)
                </label>
                <input
                  id="normal-rate"
                  type="number"
                  className="form-input"
                  min={0}
                  value={config.normalRate}
                  onChange={(e) => setConfig({ ...config, normalRate: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                  Cobro por cada moto estacionada
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lost-rate">
                  Tarifa Ticket Perdido (pesos)
                </label>
                <input
                  id="lost-rate"
                  type="number"
                  className="form-input"
                  min={0}
                  value={config.lostTicketRate}
                  onChange={(e) => setConfig({ ...config, lostTicketRate: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                  Cobro cuando el cliente pierde el ticket
                </span>
              </div>
            </div>
          </div>

          {/* Turnos */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-50)', marginBottom: 20 }}>
              🕐 Turnos
            </h3>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--dark-200)', marginBottom: 12 }}>
                  Turno 1
                </h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift1-start">Hora Inicio</label>
                    <TimePicker12h
                      id="shift1-start"
                      value={config.shift1Start}
                      onChange={(val) => setConfig({ ...config, shift1Start: val })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift1-end">Hora Fin</label>
                    <TimePicker12h
                      id="shift1-end"
                      value={config.shift1End}
                      onChange={(val) => setConfig({ ...config, shift1End: val })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--dark-200)', marginBottom: 12 }}>
                  Turno 2
                </h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift2-start">Hora Inicio</label>
                    <TimePicker12h
                      id="shift2-start"
                      value={config.shift2Start}
                      onChange={(val) => setConfig({ ...config, shift2Start: val })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift2-end">Hora Fin</label>
                    <TimePicker12h
                      id="shift2-end"
                      value={config.shift2End}
                      onChange={(val) => setConfig({ ...config, shift2End: val })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}
