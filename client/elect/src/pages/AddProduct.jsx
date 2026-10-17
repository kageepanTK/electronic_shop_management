import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, FilePlus2, Search } from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ProductFormModal from '../components/ProductFormModal';
import { money } from '../utils/format';

const AddProduct = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [showNewModal, setShowNewModal] = useState(false);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const matches = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const selectProduct = (p) => {
    setSelected(p);
    setSearch('');
    setBuyPrice(String(parseFloat(p.costPrice)));       // pre-filled with the old buying price
    setSellPrice(String(parseFloat(p.sellingPrice)));   // pre-filled with the current selling price
  };

  const clearSelected = () => {
    setSelected(null);
    setBuyPrice('');
    setSellPrice('');
  };

  // ----- derived values -----
  const oldBuy = selected ? parseFloat(selected.costPrice) : 0;
  const oldSell = selected ? parseFloat(selected.sellingPrice) : 0;
  const qtyNum = parseInt(quantity, 10);
  const buyNum = parseFloat(buyPrice);
  const sellNum = parseFloat(sellPrice);

  const buyChanged = selected && Number.isFinite(buyNum) && buyNum !== oldBuy;
  const sellChanged = selected && Number.isFinite(sellNum) && sellNum !== oldSell;
  const belowCost = Number.isFinite(buyNum) && Number.isFinite(sellNum) && sellNum < buyNum;
  const totalCost = qtyNum > 0 && Number.isFinite(buyNum) ? qtyNum * buyNum : 0;

  const handleRestock = async () => {
    setError('');
    setMessage('');

    if (!selected) return setError('Select a product');
    if (!Number.isInteger(qtyNum) || qtyNum < 1) return setError('Enter a whole number of at least 1');
    if (!Number.isFinite(buyNum) || buyNum < 0) return setError('Enter a valid buying price');
    if (!Number.isFinite(sellNum) || sellNum <= 0) return setError('Selling price must be greater than 0');

    const changes = [];
    if (buyChanged) changes.push(`buying price ${money(oldBuy)} → ${money(buyNum)}`);
    if (sellChanged) changes.push(`selling price ${money(oldSell)} → ${money(sellNum)}`);

    setSaving(true);
    try {
      const { data } = await axios.post(`/api/products/${selected.id}/restock`, {
        quantity: qtyNum,
        buyPrice: buyNum,
        sellingPrice: sellNum,
        note,
      });
      setMessage(
        `Added ${qtyNum} to ${data.name}. New stock: ${data.stockQty}.` +
          (changes.length ? ` Updated ${changes.join(', ')}.` : '')
      );
      clearSelected();
      setQuantity('');
      setNote('');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '16px' }}>Add Product</h2>

      <div style={styles.optionRow}>
        <div
          style={{ ...styles.optionCard, ...(mode === 'existing' ? styles.optionActive : {}) }}
          onClick={() => setMode('existing')}
        >
          <PackagePlus size={22} />
          <p style={styles.optionTitle}>Existing Product</p>
          <p style={styles.optionText}>Add more stock to a product you already have.</p>
        </div>

        <div
          style={{ ...styles.optionCard, ...(mode === 'new' ? styles.optionActive : {}) }}
          onClick={() => { setMode('new'); setShowNewModal(true); }}
        >
          <FilePlus2 size={22} />
          <p style={styles.optionTitle}>New Product</p>
          <p style={styles.optionText}>Create a product that isn't in the system yet.</p>
        </div>
      </div>

      {mode === 'existing' && (
        <div style={styles.panel}>
          <p style={styles.panelTitle}>Add Stock to Existing Product</p>

          {message && <p style={styles.success}>{message}</p>}
          {error && <p style={styles.errorText}>{error}</p>}

          {selected ? (
            <>
              <div style={styles.selected}>
                <div>
                  <strong>{selected.name}</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Current stock: {selected.stockQty} {selected.allowLooseSales ? 'whole bags' : 'units'}
                  </div>
                </div>
                <button style={styles.linkBtn} onClick={clearSelected}>Change</button>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Previous buying price</span>
                  <span style={styles.infoValue}>{money(oldBuy)}</span>
                </div>
                <div style={styles.infoBox}>
                  <span style={styles.infoLabel}>Current selling price</span>
                  <span style={styles.infoValue}>{money(oldSell)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.searchBox}>
                <Search size={16} color="#888" />
                <input
                  placeholder="Search for an existing product..."
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

          <label style={styles.label}>
            Quantity to add{selected?.allowLooseSales ? ' (whole bags)' : ''}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={styles.input}
            placeholder="e.g. 20"
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>New buying price (per unit)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                style={styles.input}
                disabled={!selected}
              />
              {buyChanged && (
                <p style={styles.changed}>Changed from {money(oldBuy)}</p>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Selling price (per unit)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                style={styles.input}
                disabled={!selected}
              />
              {sellChanged && (
                <p style={styles.changed}>Changed from {money(oldSell)}</p>
              )}
            </div>
          </div>

          {belowCost && (
            <p style={styles.warning}>
              The selling price is lower than the buying price. You'd lose money on every sale.
            </p>
          )}

          {selected?.allowLooseSales && (
            <p style={styles.hint}>
              Prices are per whole bag. The loose price is not changed here.
            </p>
          )}

          {totalCost > 0 && (
            <p style={styles.hint}>
              Total purchase cost: <strong>{money(totalCost)}</strong> ({qtyNum} × {money(buyNum)})
            </p>
          )}

          <label style={styles.label}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={150}
            style={styles.input}
            placeholder="e.g. Delivery from supplier"
          />

          <button style={styles.primaryBtn} onClick={handleRestock} disabled={saving || !selected}>
            {saving ? 'Saving...' : 'Add to Stock'}
          </button>
        </div>
      )}

      {showNewModal && (
        <ProductFormModal
          onClose={() => { setShowNewModal(false); setMode('existing'); }}
          onSuccess={() => navigate('/products')}
        />
      )}
    </DashboardLayout>
  );
};

const styles = {
  optionRow: { display: 'flex', gap: '16px', marginBottom: '16px' },
  optionCard: {
    flex: 1, backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
    padding: '16px', cursor: 'pointer', color: '#333',
  },
  optionActive: { border: '2px solid #2563eb', backgroundColor: '#f5f8ff' },
  optionTitle: { fontWeight: 'bold', fontSize: '15px', margin: '8px 0 4px' },
  optionText: { fontSize: '13px', color: '#777', margin: 0 },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', maxWidth: '560px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  success: { color: '#16a34a', fontSize: '13px', margin: '0 0 10px' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 10px' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ddd',
    borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px' },
  dropdown: {
    border: '1px solid #eee', borderRadius: '8px', marginBottom: '12px',
    maxHeight: '200px', overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
    cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f5f5f5',
  },
  selected: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0f4ff', padding: '10px 12px', borderRadius: '6px',
    fontSize: '14px', marginBottom: '10px',
  },
  infoRow: { display: 'flex', gap: '12px', marginBottom: '14px' },
  infoBox: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
    backgroundColor: '#f8f9fc', border: '1px solid #e8eaf0', borderRadius: '8px', padding: '10px 12px',
  },
  infoLabel: { fontSize: '11px', color: '#777' },
  infoValue: { fontSize: '16px', fontWeight: 'bold', color: '#222' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '8px',
  },
  changed: { fontSize: '11px', color: '#b45309', margin: '0 0 8px' },
  warning: {
    fontSize: '12px', color: '#b91c1c', backgroundColor: '#fee2e2',
    padding: '8px 10px', borderRadius: '6px', margin: '0 0 10px',
  },
  hint: { fontSize: '12px', color: '#777', margin: '0 0 10px' },
  primaryBtn: {
    width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px',
  },
};

export default AddProduct;