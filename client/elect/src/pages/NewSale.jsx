import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';

const NewSale = () => {
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  // Load all products on mount
  const fetchAllProducts = async () => {
    setProductsLoading(true);
    try {
      const { data } = await axios.get('/api/products');
      setAllProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Filter products locally by search term
  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Search customers
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

  const addToCart = (product) => {
    if (product.stockQty <= 0) return;

    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQty) return;
      setCart(cart.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: parseFloat(product.sellingPrice),
        quantity: 1,
        maxStock: product.stockQty,
      }]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map((item) => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      if (newQty > item.maxStock) return item;
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - (parseFloat(discount) || 0);

  const handleCompleteSale = async () => {
    setError('');

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        discount: parseFloat(discount) || 0,
        paidAmount: paidAmount === '' ? total : parseFloat(paidAmount),
        paymentMethod,
      };

      const { data } = await axios.post('/api/sales', payload);

      setSuccess(data);
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setPaidAmount('');
      fetchAllProducts(); // refresh stock numbers after sale
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div style={styles.successBox}>
          <h2>✅ Sale Completed</h2>
          <p>Invoice #{success.id} — Total: ${success.totalAmount}</p>
          <p>Payment Status: {success.paymentStatus}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
            <button style={styles.primaryBtn} onClick={() => setSuccess(null)}>
              New Sale
            </button>
            <button style={styles.backBtn} onClick={() => navigate('/sales')}>
              Back to Sales History
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/sales')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0 }}>New Sale</h2>
        <div style={{ width: '70px' }} /> {/* spacer to balance the back button */}
      </div>

      <div style={styles.layout}>
        {/* LEFT: Product list + cart */}
        <div style={{ flex: 2 }}>
          <div style={styles.searchBox}>
            <Search size={16} color="#888" />
            <input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* All products grid */}
          <div style={{ ...styles.panel, marginBottom: '16px' }}>
            <p style={styles.panelTitle}>All Products</p>
            {productsLoading ? (
              <p style={{ color: '#888', fontSize: '14px' }}>Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>No products found.</p>
            ) : (
              <div style={styles.productGrid}>
                {filteredProducts.map((p) => {
                  const outOfStock = p.stockQty <= 0;
                  return (
                    <div
                      key={p.id}
                      style={{ ...styles.productCard, ...(outOfStock ? styles.productCardDisabled : {}) }}
                      onClick={() => !outOfStock && addToCart(p)}
                    >
                      <div style={styles.productImageWrap}>
                        {p.imageUrl ? (
                          <img
                            src={`http://localhost:5000${p.imageUrl}`}
                            alt={p.name}
                            style={styles.productImage}
                          />
                        ) : (
                          <div style={styles.noImage}>No Image</div>
                        )}
                      </div>
                      <p style={styles.productCardName}>{p.name}</p>
                      <p style={styles.productCardPrice}>${p.sellingPrice}</p>
                      <p style={{ fontSize: '11px', color: outOfStock ? '#dc2626' : '#888', margin: 0 }}>
                        {outOfStock ? 'Out of stock' : `${p.stockQty} in stock`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Cart</p>
            {cart.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>No items added yet.</p>
            ) : (
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888' }}>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Subtotal</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={styles.td}>{item.name}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button style={styles.qtyBtn} onClick={() => updateQty(item.productId, -1)}>
                            <Minus size={12} />
                          </button>
                          {item.quantity}
                          <button style={styles.qtyBtn} onClick={() => updateQty(item.productId, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td style={styles.td}>${item.price.toFixed(2)}</td>
                      <td style={styles.td}>${(item.price * item.quantity).toFixed(2)}</td>
                      <td style={styles.td}>
                        <button style={styles.removeBtn} onClick={() => removeFromCart(item.productId)}>
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

        {/* RIGHT: Customer + payment + totals */}
        <div style={{ flex: 1 }}>
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Customer</p>
            {selectedCustomer ? (
              <div style={styles.selectedCustomer}>
                <span>{selectedCustomer.name}</span>
                <button style={styles.linkBtn} onClick={() => setSelectedCustomer(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Search customer (leave empty for walk-in)"
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
                          setSelectedCustomer(c);
                          setCustomerSearch('');
                          setCustomerResults([]);
                        }}
                      >
                        {c.name} {c.phone && `· ${c.phone}`}
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  No customer selected → Walk-in Customer
                </p>
              </>
            )}
          </div>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Payment</p>

            <label style={styles.label}>Discount</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={styles.input}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>

            {paymentMethod === 'credit' && (
              <>
                <label style={styles.label}>Amount Paid Now</label>
                <input
                  type="number"
                  placeholder="0 for fully unpaid"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  style={styles.input}
                />
              </>
            )}
          </div>

          <div style={styles.panel}>
            <div style={styles.totalRow}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>Discount</span>
              <span>-${(parseFloat(discount) || 0).toFixed(2)}</span>
            </div>
            <div style={{ ...styles.totalRow, fontWeight: 'bold', fontSize: '18px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

            <button
              style={styles.primaryBtn}
              onClick={handleCompleteSale}
              disabled={loading || cart.length === 0}
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  headerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #ddd',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#333',
  },
  layout: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px',
    padding: '10px 14px', marginBottom: '16px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px' },
  dropdown: {
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px',
    marginBottom: '16px', maxHeight: '200px', overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
    borderBottom: '1px solid #f5f5f5',
  },
  panel: {
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
    padding: '16px', marginBottom: '16px',
  },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '12px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  productCard: {
    border: '1px solid #eee', borderRadius: '10px', padding: '10px',
    textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa',
  },
  productCardDisabled: {
    opacity: 0.5, cursor: 'not-allowed',
  },
  productImageWrap: {
    width: '100%', height: '70px', borderRadius: '6px',
    overflow: 'hidden', backgroundColor: '#f0f0f0', marginBottom: '6px',
  },
  productImage: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '10px',
  },
  productCardName: { fontSize: '12px', fontWeight: 'bold', margin: '0 0 2px' },
  productCardPrice: { fontSize: '12px', color: '#2563eb', margin: 0 },
  th: { padding: '6px 0' },
  td: { padding: '8px 0' },
  qtyBtn: {
    width: '20px', height: '20px', border: '1px solid #ddd', borderRadius: '4px',
    backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtn: {
    background: '#fee2e2', color: '#dc2626', border: 'none',
    borderRadius: '6px', padding: '5px 7px', cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px',
  },
  label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
  selectedCustomer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0f4ff', padding: '10px', borderRadius: '6px', fontSize: '14px',
  },
  linkBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' },
  primaryBtn: {
    flex: 1, padding: '12px', backgroundColor: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px',
  },
  successBox: {
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
    padding: '40px', textAlign: 'center',
  },
};

export default NewSale;