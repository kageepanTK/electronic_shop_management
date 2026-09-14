import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const Expenses = () => {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: '', note: '' });
  const [error, setError] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/expenses');
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.amount) { setError('Title and amount are required'); return; }
    try {
      await axios.post('/api/expenses', form);
      setForm({ title: '', amount: '', category: '', note: '' });
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>Expenses</h2>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div style={styles.summaryCard}>
        <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px' }}>Total Expenses</p>
        <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>${total.toFixed(2)}</p>
      </div>

      <div style={styles.panel}>
        {loading ? <p>Loading...</p> : expenses.length === 0 ? (
          <p style={{ color: '#888' }}>No expenses recorded yet.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Date</th>
                {canDelete && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={styles.td}>{e.title}</td>
                  <td style={styles.td}>{e.category || '-'}</td>
                  <td style={styles.td}>${e.amount}</td>
                  <td style={styles.td}>{new Date(e.createdAt).toLocaleDateString()}</td>
                  {canDelete && (
                    <td style={styles.td}>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(e.id)}>
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
              <h3 style={{ margin: 0 }}>Add Expense</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={styles.input} />
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={styles.input} />
            <input placeholder="Category (e.g. Rent, Utility)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input} />
            <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={styles.input} />
            <button type="submit" style={styles.submitBtn}>Save Expense</button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  summaryCard: { backgroundColor: '#fee2e2', borderRadius: '12px', padding: '16px', marginBottom: '16px', maxWidth: '220px' },
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

export default Expenses;