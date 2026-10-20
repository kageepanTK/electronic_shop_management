import { useState, useEffect } from 'react';
import { Search, Trash2 } from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';

const REASONS = [
  'Damaged',
  'Expired',
  'Discontinued',
  'Lost or stolen',
  'Added by mistake',
  'Returned to supplier',
  'Other',
];

const productHasStock = (p) => (p?.stockQty || 0) > 0 || (parseFloat(p?.looseStock) || 0) > 0;

const RemoveProduct = () => {
  const [products, setProducts] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const [mode, setMode] = useState('stock');         // 'stock' | 'product'
  const [stockType, setStockType] = useState('whole'); // 'whole' | 'loose'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRemoved = async () => {
    try {
      const { data } = await axios.get('/api/products/removed');
      setRemoved(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRemoved();
  }, []);

  const matches = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  // ----- derived values -----
  const wholeQty = selected?.stockQty || 0;
  const looseQty = parseFloat(selected?.looseStock) || 0;
  const canLoose = !!selected?.allowLooseSales;
  const hasStock = productHasStock(selected);

  const available = stockType === 'loose' ? looseQty : wholeQty;
  const unitLabel =
    stockType === 'loose' ? selected?.looseUnit || 'units' : canLoose ? 'bag(s)' : 'unit(s)';
  const qtyNum = Number(quantity);

  const selectProduct = (p) => {
    setSelected(p);
    setSearch('');
    setMessage('');
    setError('');
    setReason('');
    setNote('');
    setQuantity('');
    setStockType('whole');
    setMode(productHasStock(p) ? 'stock' : 'product'); // nothing in stock -> only archiving makes sense
  };

  const clearSelected = () => {
    setSelected(null);
    setReason('');
    setNote('');
    setQuantity('');
  };

  const changeStockType = (type) => {
    setStockType(type);
    setQuantity('');
  };

  const askConfirm = () => {
    setError('');
    setMessage('');

    if (!selected) return setError('Select a product');

    if (mode === 'stock') {
      if (!quantity || !Number.isFinite(qtyNum) || qtyNum <= 0) {
        return setError('Enter how many to remove');
      }
      if (stockType === 'whole' && !Number.isInteger(qtyNum)) {
        return setError('Quantity must be a whole number');
      }
      if (qtyNum > available) {
        return setError(`Only ${available} ${unitLabel} available`);
      }
    }

    if (!reason) return setError('Select a reason for removal');
    if (reason === 'Other' && note.trim().length < 3) return setError('Please describe the reason');

    setConfirmOpen(true);
  };

  const doRemove = async () => {
    setSaving(true);
    try {
      if (mode === 'stock') {
        const { data } = await axios.post(`/api/products/${selected.id}/write-off`, {
          quantity: qtyNum,
          stockType,
          reason,
          note,
        });
        const left =
          stockType === 'loose'
            ? `${data.looseStock} ${data.looseUnit || ''} loose`
            : `${data.stockQty} ${canLoose ? 'whole bag(s)' : 'unit(s)'}`;
        setMessage(`Removed ${qtyNum} ${unitLabel} of "${data.name}". Remaining: ${left}.`);
      } else {
        await axios.post(`/api/products/${selected.id}/remove`, { reason, note });
        setMessage(`"${selected.name}" was removed.`);
      }
      clearSelected();
      fetchProducts();
      fetchRemoved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const confirmMessage = () => {
    if (!selected) return '';
    if (mode === 'stock') {
      return `Remove ${qtyNum} ${unitLabel} from "${selected.name}" (reason: ${reason})? Stock will go from ${available} to ${(available - qtyNum).toFixed(stockType === 'loose' ? 3 : 0)}. The product stays in the system.`;
    }
    return `Remove "${selected.name}" (reason: ${reason})? ${
      hasStock ? 'Its remaining stock will be written off. ' : ''
    }It will no longer appear in products, sales or loans. Past sales and loans keep their records.`;
  };

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '16px' }}>Remove Product</h2>

      <div style={styles.panel}>
        <p style={styles.panelTitle}>Select a product</p>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.errorText}>{error}</p>}

        {selected ? (
          <>
            <div style={styles.selected}>
              <div>
                <strong>{selected.name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {selected.Category?.name || 'Uncategorized'} ·{' '}
                  {wholeQty} {canLoose ? 'whole bag(s)' : 'in stock'}
                  {canLoose ? ` · ${looseQty} ${selected.looseUnit || ''} loose` : ''}
                </div>
              </div>
              <button style={styles.linkBtn} onClick={clearSelected}>Change</button>
            </div>

            {/* What to remove */}
            <label style={styles.label}>What do you want to remove?</label>
            <div style={styles.modeRow}>
              <div
                style={{
                  ...styles.modeCard,
                  ...(mode === 'stock' ? styles.modeActive : {}),
                  ...(!hasStock ? styles.modeDisabled : {}),
                }}
                onClick={() => hasStock && setMode('stock')}
              >
                <strong style={{ fontSize: '13px' }}>Some stock</strong>
                <span style={styles.modeText}>
                  {hasStock ? 'Remove a number of items. The product stays.' : 'No stock to remove.'}
                </span>
              </div>
              <div
                style={{ ...styles.modeCard, ...(mode === 'product' ? styles.modeActive : {}) }}
                onClick={() => setMode('product')}
              >
                <strong style={{ fontSize: '13px' }}>The whole product</strong>
                <span style={styles.modeText}>Archive it. It disappears from products and sales.</span>
              </div>
            </div>

            {mode === 'stock' && (
              <>
                {canLoose && (
                  <>
                    <label style={styles.label}>Remove from</label>
                    <select
                      value={stockType}
                      onChange={(e) => changeStockType(e.target.value)}
                      style={styles.input}
                    >
                      <option value="whole">Whole bags ({wholeQty} available)</option>
                      <option value="loose">
                        Loose stock ({looseQty} {selected.looseUnit || ''} available)
                      </option>
                    </select>
                  </>
                )}

                <label style={styles.label}>
                  How many {unitLabel} to remove (max {available})
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min={stockType === 'loose' ? '0.001' : '1'}
                    max={available}
                    step={stockType === 'loose' ? '0.001' : '1'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="e.g. 5"
                  />
                  <button
                    type="button"
                    style={styles.allBtn}
                    onClick={() => setQuantity(String(available))}
                    disabled={available <= 0}
                  >
                    All
                  </button>
                </div>
              </>
            )}

            {mode === 'product' && hasStock && (
              <p style={styles.warning}>
                This product still has {wholeQty} {canLoose ? 'whole bag(s)' : 'unit(s)'}
                {looseQty > 0 ? ` and ${looseQty} ${selected.looseUnit || ''} loose` : ''} in stock.
                Removing it writes all of it off.
              </p>
            )}

            <label style={styles.label}>Reason for removal</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.input}>
              <option value="">Select a reason</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label style={styles.label}>
              Note {reason === 'Other' ? '(required)' : '(optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
              placeholder="Add details..."
            />

            <button style={styles.removeBtn} onClick={askConfirm} disabled={saving}>
              <Trash2 size={15} /> {mode === 'stock' ? 'Remove Stock' : 'Remove Product'}
            </button>
          </>
        ) : (
          <>
            <div style={styles.searchBox}>
              <Search size={16} color="#888" />
              <input
                placeholder="Search for a product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            {matches.length > 0 && (
              <div style={styles.dropdown}>
                {matches.map((p) => (
                  <div key={p.id} style={styles.dropdownItem} onClick={() => selectProduct(p)}>
                    <span>{p.name}</span>
                    <span style={{ color: '#888' }}>{p.stockQty} in stock</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ ...styles.panel, maxWidth: 'none', marginTop: '16px' }}>
        <p style={styles.panelTitle}>Removed Products</p>
        {removed.length === 0 ? (
          <p style={{ color: '#888', fontSize: '14px' }}>No products have been removed.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Removed by</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {removed.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.Category?.name || '-'}</td>
                  <td style={styles.td}>
                    {p.removalReason}
                    {p.removalNote && <div style={styles.noteText}>{p.removalNote}</div>}
                  </td>
                  <td style={styles.td}>{p.removedBy?.name || '-'}</td>
                  <td style={styles.td}>{p.removedAt ? new Date(p.removedAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmOpen && selected && (
        <ConfirmModal
          title={mode === 'stock' ? 'Remove Stock' : 'Remove Product'}
          message={confirmMessage()}
          confirmLabel="Remove"
          danger
          onConfirm={doRemove}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </DashboardLayout>
  );
};

const styles = {
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', maxWidth: '560px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  success: { color: '#16a34a', fontSize: '13px', margin: '0 0 10px' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 10px' },
  warning: {
    fontSize: '12px', color: '#92400e', backgroundColor: '#fef3c7',
    padding: '8px 10px', borderRadius: '6px', margin: '0 0 12px',
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ddd',
    borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px' },
  dropdown: { border: '1px solid #eee', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' },
  dropdownItem: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
    cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f5f5f5',
  },
  selected: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0f4ff', padding: '10px 12px', borderRadius: '6px',
    fontSize: '14px', marginBottom: '14px',
  },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' },
  modeRow: { display: 'flex', gap: '10px', marginBottom: '14px' },
  modeCard: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px',
    border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff',
  },
  modeActive: { border: '2px solid #dc2626', backgroundColor: '#fff5f5' },
  modeDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  modeText: { fontSize: '11px', color: '#777' },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '12px', fontFamily: 'inherit',
  },
  allBtn: {
    height: '35px', padding: '0 14px', backgroundColor: '#f4f4f4', color: '#333',
    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
  },
  removeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    width: '100%', padding: '10px', backgroundColor: '#dc2626', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
  },
  th: { padding: '8px 0', fontWeight: 'normal' },
  td: { padding: '10px 0', verticalAlign: 'top' },
  noteText: { fontSize: '12px', color: '#888' },
};

export default RemoveProduct;