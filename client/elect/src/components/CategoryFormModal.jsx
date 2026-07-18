import { useState } from 'react';
import axios from '../utils/axiosConfig';
import { X } from 'lucide-react';

const CategoryFormModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/categories', { name });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Add Category</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

        <div style={{ marginBottom: '16px' }}>
          <label style={styles.label}>Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bulb category"
            style={styles.input}
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Saving...' : 'Save Category'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '320px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: {
    background: '#f4f4f4', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', cursor: 'pointer',
  },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px',
  },
  submitBtn: {
    width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
  },
};

export default CategoryFormModal;