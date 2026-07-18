import { X } from 'lucide-react';

const ProductModal = ({ product, onClose }) => {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <div style={styles.imageWrap}>
          {product.imageUrl ? (
            <img
              src={`http://localhost:5000${product.imageUrl}`}
              alt={product.name}
              style={styles.image}
            />
          ) : (
            <div style={styles.noImage}>No Image</div>
          )}
        </div>

        <h3 style={{ margin: '16px 0 4px' }}>{product.name}</h3>
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px' }}>
          {product.brand} · {product.Category?.name || 'Uncategorized'}
        </p>

        <div style={styles.detailRow}>
          <span style={styles.label}>Selling Price</span>
          <span style={styles.value}>${product.sellingPrice}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.label}>Cost Price</span>
          <span style={styles.value}>${product.costPrice}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.label}>Stock Balance</span>
          <span
            style={{
              ...styles.value,
              color: product.stockQty <= product.lowStockAlert ? '#dc2626' : '#16a34a',
            }}
          >
            {product.stockQty} units
          </span>
        </div>
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
};

export default ProductModal;