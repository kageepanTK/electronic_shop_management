import { useState } from 'react';
import axios from '../utils/axiosConfig';
import { X } from 'lucide-react';


const ProductModal = ({ product, onClose, onUpdated }) => {
  const [currentProduct, setCurrentProduct] = useState(product);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleOpenBag = async () => {
    setError('');
    setMessage('');
    setOpening(true);

    try {
      const { data } = await axios.post(`/api/products/${currentProduct.id}/open-bag`);
      setCurrentProduct(data);
      setMessage('Bag opened successfully — loose stock updated.');
      if (onUpdated) onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open bag');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <div style={styles.imageWrap}>
          {currentProduct.imageUrl ? (
            <img
              src={`http://localhost:5000${currentProduct.imageUrl}`}
              alt={currentProduct.name}
              style={styles.image}
            />
          ) : (
            <div style={styles.noImage}>No Image</div>
          )}
        </div>

        <h3 style={{ margin: '16px 0 4px' }}>{currentProduct.name}</h3>
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px' }}>
          {currentProduct.brand} · {currentProduct.Category?.name || 'Uncategorized'}
        </p>

        <div style={styles.detailRow}>
          <span style={styles.label}>Selling Price</span>
          <span style={styles.value}>${currentProduct.sellingPrice}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.label}>Cost Price</span>
          <span style={styles.value}>${currentProduct.costPrice}</span>
        </div>

        {currentProduct.allowLooseSales ? (
          <>
            <div style={styles.detailRow}>
              <span style={styles.label}>Whole Bags</span>
              <span
                style={{
                  ...styles.value,
                  color: currentProduct.stockQty <= currentProduct.lowStockAlert ? '#dc2626' : '#16a34a',
                }}
              >
                {currentProduct.stockQty}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Loose Stock</span>
              <span style={styles.value}>
                {currentProduct.looseStock} {currentProduct.looseUnit}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Loose Price</span>
              <span style={styles.value}>
                ${currentProduct.loosePrice || currentProduct.sellingPrice} / {currentProduct.looseUnit}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.label}>Bag Size</span>
              <span style={styles.value}>
                {currentProduct.bagSize} {currentProduct.looseUnit} per bag
              </span>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}
            {message && <p style={styles.successText}>{message}</p>}

            <button
              style={styles.openBagBtn}
              onClick={handleOpenBag}
              disabled={opening || currentProduct.stockQty < 1}
            >
              {opening
                ? 'Opening...'
                : currentProduct.stockQty < 1
                ? 'No Bags Available'
                : 'Open 1 Bag → Add to Loose Stock'}
            </button>
          </>
        ) : (
          <div style={styles.detailRow}>
            <span style={styles.label}>Stock Balance</span>
            <span
              style={{
                ...styles.value,
                color: currentProduct.stockQty <= currentProduct.lowStockAlert ? '#dc2626' : '#16a34a',
              }}
            >
              {currentProduct.stockQty} units
            </span>
          </div>
        )}
      </div>
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
    width: '320px', position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '12px',
    background: '#f4f4f4', border: 'none', borderRadius: '50%',
    width: '28px', height: '28px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  imageWrap: {
    width: '100%', height: '160px', borderRadius: '8px',
    overflow: 'hidden', backgroundColor: '#f4f4f4',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#aaa',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px',
  },
  label: { color: '#888' },
  value: { fontWeight: 'bold' },
  errorText: { color: '#dc2626', fontSize: '12px', margin: '8px 0 0' },
  successText: { color: '#16a34a', fontSize: '12px', margin: '8px 0 0' },
  openBagBtn: {
    width: '100%', padding: '10px', marginTop: '14px',
    backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
  },
};

export default ProductModal;