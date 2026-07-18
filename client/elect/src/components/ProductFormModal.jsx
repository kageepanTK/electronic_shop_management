import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { X } from 'lucide-react';

const ProductFormModal = ({ onClose, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    stockQty: '',
    lowStockAlert: '5',
    image: null,
  });

  useEffect(() => {
    axios.get('/api/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.categoryId || !formData.sellingPrice) {
      setError('Please fill in name, category, and selling price');
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== '') payload.append(key, value);
      });

      await axios.post('/api/products', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Add Product</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

        {/* Image upload */}
        <label style={styles.imageUpload}>
          {preview ? (
            <img src={preview} alt="preview" style={styles.previewImg} />
          ) : (
            <span style={{ fontSize: '13px', color: '#888' }}>Click to upload image</span>
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </label>

        <div style={styles.field}>
          <label style={styles.label}>Product Name</label>
          <input name="name" value={formData.name} onChange={handleChange} style={styles.input} required />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Brand</label>
          <input name="brand" value={formData.brand} onChange={handleChange} style={styles.input} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select name="categoryId" value={formData.categoryId} onChange={handleChange} style={styles.input} required>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Cost Price</label>
            <input type="number" step="0.01" name="costPrice" value={formData.costPrice} onChange={handleChange} style={styles.input} />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Selling Price</label>
            <input type="number" step="0.01" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} style={styles.input} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Stock Quantity</label>
            <input type="number" name="stockQty" value={formData.stockQty} onChange={handleChange} style={styles.input} />
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Low Stock Alert</label>
            <input type="number" name="lowStockAlert" value={formData.lowStockAlert} onChange={handleChange} style={styles.input} />
          </div>
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Saving...' : 'Save Product'}
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
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    width: '360px', maxHeight: '90vh', overflowY: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  closeBtn: {
    background: '#f4f4f4', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', cursor: 'pointer',
  },
  imageUpload: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '120px', backgroundColor: '#f4f4f4',
    borderRadius: '8px', marginBottom: '14px', cursor: 'pointer',
    overflow: 'hidden', border: '1px dashed #ccc',
  },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  field: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px',
  },
  submitBtn: {
    width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '8px',
  },
};

export default ProductFormModal;