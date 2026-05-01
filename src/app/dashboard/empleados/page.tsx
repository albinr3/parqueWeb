'use client';

import { useState, useEffect } from 'react';
import { Plus, UserCheck, UserX, Pencil, Trash2, X } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  shift: 'SHIFT_1' | 'SHIFT_2';
  active: boolean;
  createdAt: string;
}

interface ParkingConfig {
  shift1Start: string;
  shift1End: string;
  shift2Start: string;
  shift2End: string;
}

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<ParkingConfig>({
    shift1Start: '06:00',
    shift1End: '14:00',
    shift2Start: '14:00',
    shift2End: '22:00',
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formShift, setFormShift] = useState<'SHIFT_1' | 'SHIFT_2'>('SHIFT_1');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setEmployees(json);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetch('/api/config')
      .then((r) => r.json())
      .then((json) =>
        setConfig({
          shift1Start: json.shift1Start || '06:00',
          shift1End: json.shift1End || '14:00',
          shift2Start: json.shift2Start || '14:00',
          shift2End: json.shift2End || '22:00',
        })
      )
      .catch(() => {});
  }, []);

  const shiftText = (shift: 'SHIFT_1' | 'SHIFT_2') =>
    shift === 'SHIFT_1'
      ? `Turno 1 (${config.shift1Start} - ${config.shift1End})`
      : `Turno 2 (${config.shift2Start} - ${config.shift2End})`;

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormPin('');
    setFormShift('SHIFT_1');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingId(emp.id);
    setFormName(emp.name);
    setFormPin('');
    setFormShift(emp.shift);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('El nombre es requerido');
      return;
    }

    if (!formShift) {
      setFormError('Selecciona un turno');
      return;
    }

    // Para crear: PIN obligatorio. Para editar: PIN opcional
    if (!editingId && (!formPin || formPin.length !== 4)) {
      setFormError('El PIN debe ser de 4 dígitos');
      return;
    }

    if (formPin && (formPin.length !== 4 || !/^\d{4}$/.test(formPin))) {
      setFormError('El PIN debe ser exactamente 4 dígitos numéricos');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PATCH' : 'POST';
      const body: Record<string, string> = { name: formName.trim(), shift: formShift };
      if (formPin) body.pin = formPin;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast('success', editingId ? 'Empleado actualizado' : 'Empleado creado');
        setShowModal(false);
        fetchEmployees();
      } else {
        const json = await res.json();
        setFormError(json.error || 'Error al guardar');
      }
    } catch {
      setFormError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/users/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !emp.active }),
      });

      if (res.ok) {
        showToast('success', emp.active ? 'Empleado desactivado' : 'Empleado activado');
        fetchEmployees();
      }
    } catch {
      showToast('error', 'Error al cambiar estado');
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    if (!confirm(`¿Estás seguro de eliminar a ${emp.name}?`)) return;

    try {
      const res = await fetch(`/api/users/${emp.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Empleado eliminado');
        fetchEmployees();
      }
    } catch {
      showToast('error', 'Error al eliminar');
    }
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
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-50)' }}>
            Empleados
          </h1>
          <p style={{ color: 'var(--dark-400)', fontSize: '0.9rem', marginTop: 4 }}>
            Gestiona los encargados del parqueo y sus PINs de acceso
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Lista de empleados */}
      {employees.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="card employee-card"
              style={{ opacity: emp.active ? 1 : 0.5 }}
            >
              <div className="flex-gap">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: emp.active
                      ? 'rgba(238, 134, 0, 0.15)'
                      : 'rgba(152, 152, 166, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: emp.active ? 'var(--primary-400)' : 'var(--dark-400)',
                  }}
                >
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--dark-50)', fontSize: '1rem' }}>
                    {emp.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                    {emp.active ? (
                      <span className="badge badge-success" style={{ padding: '2px 8px' }}>Activo</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ padding: '2px 8px' }}>Inactivo</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-400)', marginTop: 4 }}>
                    {shiftText(emp.shift)}
                  </div>
                </div>
              </div>

              <div className="employee-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleActive(emp)}
                  title={emp.active ? 'Desactivar' : 'Activar'}
                >
                  {emp.active ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => openEditModal(emp)}
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => deleteEmployee(emp)}
                  title="Eliminar"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Plus size={48} />
          <p>No hay empleados registrados. Crea el primero.</p>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="login-error">{formError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-name">
                    Nombre del Empleado
                  </label>
                  <input
                    id="emp-name"
                    type="text"
                    className="form-input"
                    placeholder="Ej: Juan Pérez"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-shift">
                    Turno Asignado
                  </label>
                  <select
                    id="emp-shift"
                    className="form-input"
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as 'SHIFT_1' | 'SHIFT_2')}
                  >
                    <option value="SHIFT_1">{shiftText('SHIFT_1')}</option>
                    <option value="SHIFT_2">{shiftText('SHIFT_2')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-pin">
                    PIN de Acceso (4 dígitos)
                    {editingId && (
                      <span style={{ color: 'var(--dark-400)', fontWeight: 400 }}>
                        {' '}— dejar vacío para no cambiar
                      </span>
                    )}
                  </label>
                  <input
                    id="emp-pin"
                    type="password"
                    className="form-input"
                    placeholder="••••"
                    maxLength={4}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="\d{4}"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Empleado'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}
