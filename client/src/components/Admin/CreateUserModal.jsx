// client/src/components/Admin/CreateUserModal.jsx
import { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T } from '../../styles/darkTokens';

const DEPARTMENTS = ['IT', 'Finance', 'HR', 'Operations', 'Marketing', 'Sales'];

const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    department: 'IT',
    jobTitle: '',
    password: 'Employee123!',
    role: 'employee',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axiosInstance.post('/users', form); // Adjust route if needed
      onUserCreated(res.data);
      onClose();
      // Reset form
      setForm({
        fullName: '', email: '', department: 'IT', jobTitle: '',
        password: 'Employee123!', role: 'employee', isActive: true
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.surface, border: `1px solid ${T.borderH}`, borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: '800', marginBottom: '1.5rem' }}>Create New User</h3>

        {error && <p style={{ color: '#F87171', marginBottom: '1rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '.4rem', color: T.slate, fontSize: '.8rem' }}>Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required style={{ width: '100%', padding: '.7rem', borderRadius: '9px', border: `1px solid ${T.border}`, background: 'rgba(0,198,255,.05)', color: T.white }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '.4rem', color: T.slate, fontSize: '.8rem' }}>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={{ width: '100%', padding: '.7rem', borderRadius: '9px', border: `1px solid ${T.border}`, background: 'rgba(0,198,255,.05)', color: T.white }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.4rem', color: T.slate, fontSize: '.8rem' }}>Department</label>
              <select name="department" value={form.department} onChange={handleChange} style={{ width: '100%', padding: '.7rem', borderRadius: '9px', border: `1px solid ${T.border}`, background: 'rgba(0,198,255,.05)', color: T.white }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '.4rem', color: T.slate, fontSize: '.8rem' }}>Role</label>
              <select name="role" value={form.role} onChange={handleChange} style={{ width: '100%', padding: '.7rem', borderRadius: '9px', border: `1px solid ${T.border}`, background: 'rgba(0,198,255,.05)', color: T.white }}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '.4rem', color: T.slate, fontSize: '.8rem' }}>Job Title</label>
            <input name="jobTitle" value={form.jobTitle} onChange={handleChange} required style={{ width: '100%', padding: '.7rem', borderRadius: '9px', border: `1px solid ${T.border}`, background: 'rgba(0,198,255,.05)', color: T.white }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '.8rem', background: 'rgba(255,255,255,.05)', border: `1px solid ${T.border}`, color: T.slate, borderRadius: '10px', fontWeight: '600' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '.8rem', background: T.gradient, color: T.navy, border: 'none', borderRadius: '10px', fontWeight: '700' }}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;