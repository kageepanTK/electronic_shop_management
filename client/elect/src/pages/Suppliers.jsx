import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const Suppliers = () => {
  const { user } = useAuth();
  const canAdd = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [error, setError] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    try {
      await axios.post('/api/suppliers', form);
      setForm({ name: '', phone: '', email: '', address: '' });
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await axios.delete(`/api/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>Suppliers</h2>
        {canAdd && (
          <button style={styles.addBtn} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      <div style={styles.panel}>
        {loading ? <p>Loading...</p> : suppliers.length === 0 ? (
          <p style={{ color: '#888' }}>No suppliers yet.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Email</th>
                {canDelete && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>{s.phone || '-'}</td>
                  <td style={styles.td}>{s.email || '-'}</td>
                  {canDelete && (
                    <td style={styles.td}>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Add Supplier</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={styles.input} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={styles.input} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={styles.input} />
            <button type="submit" style={styles.submitBtn}>Save Supplier</button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  th: { padding: '8px 0' },
  td: { padding: '10px 0' },
  deleteBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '340px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: { background: '#f4f4f4', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' },
  input: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px' },
  submitBtn: { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
};

export default Suppliers;