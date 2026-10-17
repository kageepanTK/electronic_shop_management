import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { customerCode, money } from '../utils/format';

const NewLoan = () => {
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customer, setCustomer] = useState(null);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState([]);

  const [downPayment, setDownPayment] = useState('');
  const [installmentCount, setInstallmentCount] = useState(6);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/products').then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const { data } = await axios.get('/api/customers', { params: { search: customerSearch } });
        setCustomerResults(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [customerSearch]);

  const matches = productSearch.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
            p.stockQty > 0 &&
            !lines.some((l) => l.productId === p.id)
        )
        .slice(0, 8)
    : [];

  const addLine = (p) => {
    setLines([
      ...lines,
      { productId: p.id, name: p.name, price: parseFloat(p.sellingPrice), quantity: 1, stockQty: p.stockQty },
    ]);
    setProductSearch('');
  };

  const setQty = (productId, value) => {
    setLines(
      lines.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.max(1, Math.min(l.stockQty, parseInt(value, 10) || 1)) }
          : l
      )
    );
  };

  const removeLine = (productId) => setLines(lines.filter((l) => l.productId !== productId));

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const down = parseFloat(downPayment) || 0;
  const loanAmount = total - down;
  const count = parseInt(installmentCount, 10) || 0;
  const perInstallment = count > 0 ? loanAmount / count : 0;

  const handleSubmit = async () => {
    setError('');
    if (!customer) return setError('Select a customer');
    if (lines.length === 0) return setError('Add at least one product');
    if (down < 0 || down >= total) return setError('Down payment must be less than the total amount');
    if (count < 1 || count > 60) return setError('Installments must be between 1 and 60');

    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/loans', {
        customerId: customer.id,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        downPayment: down,
        installmentCount: count,
      });
      navigate(`/loans/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/loans')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0 }}>New Loan Application</h2>
        <div style={{ width: '70px' }} />
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          {/* Customer */}
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Customer</p>
            {customer ? (
              <div style={styles.selected}>
                <div>
                  <strong>{customerCode(customer.id)}</strong> · {customer.name}
                  <div style={{ fontSize: '12px', color: '#666' }}>{customer.phone || 'No phone'}</div>
                </div>
                <button style={styles.linkBtn} onClick={() => setCustomer(null)}>Change</button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Search by Customer ID (e.g. C-0007), name or phone"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={styles.input}
                />
                {customerResults.length > 0 && (
                  <div style={styles.dropdown}>
                    {customerResults.map((c) => (
                      <div
                        key={c.id}
                        style={styles.dropdownItem}
                        onClick={() => {
                          setCustomer(c);
                          setCustomerSearch('');
                          setCustomerResults([]);
                        }}
                      >
                        <span>{customerCode(c.id)} · {c.name}</span>
                        <span style={{ color: '#888' }}>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Products */}
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Products</p>
            <div style={styles.searchBox}>
              <Search size={16} color="#888" />
              <input
                placeholder="Search products to add..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            {matches.length > 0 && (
              <div style={styles.dropdown}>
                {matches.map((p) => (
                  <div key={p.id} style={styles.dropdownItem} onClick={() => addLine(p)}>
                    <span>{p.name}</span>
                    <span style={{ color: '#888' }}>{money(p.sellingPrice)} · {p.stockQty} in stock</span>
                  </div>
                ))}
              </div>
            )}

            {lines.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>No products added yet.</p>
            ) : (
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888' }}>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Subtotal</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.productId} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={styles.td}>{l.name}</td>
                      <td style={styles.td}>{money(l.price)}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          min="1"
                          max={l.stockQty}
                          value={l.quantity}
                          onChange={(e) => setQty(l.productId, e.target.value)}
                          style={{ ...styles.input, width: '70px', marginBottom: 0 }}
                        />
                      </td>
                      <td style={styles.td}>{money(l.price * l.quantity)}</td>
                      <td style={styles.td}>
                        <button style={styles.removeBtn} onClick={() => removeLine(l.productId)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Terms + summary */}
        <div style={{ flex: 1 }}>
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Loan Terms</p>
            <label style={styles.label}>Down Payment</label>
            <input
              type="number"
              min="0"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              style={styles.input}
              placeholder="0"
            />
            <label style={styles.label}>Number of Monthly Installments</label>
            <input
              type="number"
              min="1"
              max="60"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.panel}>
            <div style={styles.totalRow}><span>Total purchase</span><span>{money(total)}</span></div>
            <div style={styles.totalRow}><span>Down payment</span><span>-{money(down)}</span></div>
            <div style={{ ...styles.totalRow, fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <span>Loan amount</span><span>{money(Math.max(0, loanAmount))}</span>
            </div>
            <div style={{ ...styles.totalRow, color: '#666' }}>
              <span>≈ per installment</span><span>{money(Math.max(0, perInstallment))}</span>
            </div>

            {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

            <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#fff',
    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#333',
  },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px',
  },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff',
    border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px' },
  dropdown: {
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px',
    marginBottom: '12px', maxHeight: '200px', overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
    cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f5f5f5',
  },
  selected: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0f4ff', padding: '10px 12px', borderRadius: '6px', fontSize: '14px',
  },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' },
  th: { padding: '6px 0' },
  td: { padding: '8px 0' },
  removeBtn: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' },
  primaryBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px',
  },
};

export default NewLoan;