import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, ArrowLeft, ShoppingCart, Users, User, X,
  CreditCard, Banknote, Wallet, Landmark, Percent, FileText, Check, Package, ChevronDown,
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { customerCode, money } from '../utils/format';

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'credit', label: 'Credit (pay later)', icon: Wallet },
  { value: 'loan', label: 'Loan (needs approval)', icon: Landmark, loanOnly: true },
];

const NewSale = () => {
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);

  const [cart, setCart] = useState([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [loanDown, setLoanDown] = useState('');
  const [loanInstallments, setLoanInstallments] = useState(6);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---------- data ----------
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
    axios.get('/api/categories').then(({ data }) => setCategories(data)).catch(() => {});
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

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (activeCategory === 'all' || p.categoryId === activeCategory)
  );

  // ---------- customer ----------
  const loanEligible = !!selectedCustomer?.loanAllowed;
  const isLoan = paymentMethod === 'loan' && loanEligible;

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setCustomerResults([]);
    if (!c.loanAllowed && paymentMethod === 'loan') setPaymentMethod('cash');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    if (paymentMethod === 'loan') setPaymentMethod('cash');
  };

  // ---------- cart ----------
  const qtyInCart = (productId) => cart.find((i) => i.productId === productId)?.quantity || 0;

  const addToCart = (product) => {
    if (product.stockQty <= 0) return;
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQty) return;
      setCart(cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: parseFloat(product.sellingPrice),
          quantity: 1,
          maxStock: product.stockQty,
        },
      ]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(
      cart.map((i) => {
        if (i.productId !== productId) return i;
        const q = i.quantity + delta;
        if (q < 1 || q > i.maxStock) return i;
        return { ...i, quantity: q };
      })
    );
  };

  const removeFromCart = (productId) => setCart(cart.filter((i) => i.productId !== productId));

  // ---------- totals ----------
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountValue = isLoan ? 0 : parseFloat(discount) || 0;
  const total = subtotal - discountValue;

  const downValue = parseFloat(loanDown) || 0;
  const loanAmount = total - downValue;
  const installmentCount = parseInt(loanInstallments, 10) || 0;
  const perInstallment = installmentCount > 0 ? loanAmount / installmentCount : 0;

  // ---------- submit ----------
  const submitLoan = async () => {
    if (!selectedCustomer) throw new Error('Select a customer for a loan');
    if (downValue < 0 || downValue >= total) throw new Error('Down payment must be less than the total amount');
    if (installmentCount < 1 || installmentCount > 60) throw new Error('Installments must be between 1 and 60');

    const { data } = await axios.post('/api/loans', {
      customerId: selectedCustomer.id,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      downPayment: downValue,
      installmentCount,
    });
    navigate(`/loans/${data.id}`); // approval and checkout continue on the loan page
  };

  const submitSale = async () => {
    if (discountValue < 0 || discountValue > subtotal) throw new Error("Discount can't be more than the subtotal");
    if (total <= 0) throw new Error('Total must be greater than 0');

    let paid = total; // cash and card are paid in full
    if (paymentMethod === 'credit') {
      paid = parseFloat(paidAmount) || 0; // blank = nothing paid yet
      if (paid < 0 || paid > total) throw new Error('Amount paid must be between 0 and the total');
    }

    const { data } = await axios.post('/api/sales', {
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      discount: discountValue,
      paidAmount: paid,
      paymentMethod,
    });

    setSuccess(data);
    setCart([]);
    setSelectedCustomer(null);
    setDiscount('');
    setPaidAmount('');
    setPaymentMethod('cash');
    fetchAllProducts(); // refresh stock numbers
  };

  const handleSubmit = async () => {
    setError('');
    if (cart.length === 0) return setError('Cart is empty');

    setLoading(true);
    try {
      if (isLoan) await submitLoan();
      else await submitSale();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ---------- success screen ----------
  if (success) {
    return (
      <DashboardLayout>
        <div style={styles.successBox}>
          <div style={styles.successIcon}><Check size={28} color="#fff" /></div>
          <h2 style={{ margin: '12px 0 4px' }}>Sale completed</h2>
          <p style={styles.muted}>Invoice #{success.id} · Total {money(success.totalAmount)}</p>
          <p style={styles.muted}>Payment status: {success.paymentStatus}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button style={{ ...styles.primaryBtn, width: 'auto', padding: '10px 24px', marginTop: 0 }} onClick={() => setSuccess(null)}>
              New sale
            </button>
            <button style={styles.backBtn} onClick={() => navigate('/sales')}>Back to sales history</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const visibleMethods = METHODS.filter((m) => !m.loanOnly || loanEligible);

  return (
    <DashboardLayout>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>New sale</h1>
          <p style={styles.pageSub}>Search products, add to cart and complete the sale.</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/sales')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div style={styles.layout}>
        {/* ================= LEFT ================= */}
        <div style={styles.leftCol}>
          {/* Product catalog */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Product catalog</h3>
              <span style={styles.muted}>Showing {filteredProducts.length} products</span>
            </div>

            <div style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <input
                placeholder="Search products by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.pillRow}>
              <button
                style={{ ...styles.pill, ...(activeCategory === 'all' ? styles.pillActive : {}) }}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  style={{ ...styles.pill, ...(activeCategory === c.id ? styles.pillActive : {}) }}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {productsLoading ? (
              <p style={styles.muted}>Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p style={styles.muted}>No products found.</p>
            ) : (
              <div style={styles.productGrid}>
                {filteredProducts.map((p) => {
                  const outOfStock = p.stockQty <= 0;
                  const atMax = !outOfStock && qtyInCart(p.id) >= p.stockQty;
                  const disabled = outOfStock || atMax;
                  return (
                    <div key={p.id} style={styles.productCard}>
                      <div style={styles.productImageWrap}>
                        {p.imageUrl ? (
                          <img src={`http://localhost:5000${p.imageUrl}`} alt={p.name} style={styles.productImage} />
                        ) : (
                          <Package size={32} color="#cbd5e1" />
                        )}
                      </div>
                      <p style={styles.productName}>{p.name}</p>
                      <p style={styles.productPrice}>{money(p.sellingPrice)}</p>
                      <p style={{ ...styles.stockText, color: outOfStock ? '#dc2626' : '#64748b' }}>
                        {outOfStock ? 'Out of stock' : `In stock: ${p.stockQty}`}
                      </p>
                      <button
                        style={{ ...styles.addBtn, ...(disabled ? styles.addBtnDisabled : {}) }}
                        onClick={() => addToCart(p)}
                        disabled={disabled}
                      >
                        <ShoppingCart size={14} />
                        {outOfStock ? 'Out of stock' : atMax ? 'Max added' : 'Add to cart'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                Cart <span style={styles.cartCount}>({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
              </h3>
              {cart.length > 0 && (
                <button style={styles.clearBtn} onClick={() => setCart([])}>
                  <Trash2 size={14} /> Clear cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p style={styles.muted}>No items added yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Product</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId} style={styles.row}>
                      <td style={{ ...styles.td, textAlign: 'left' }}>
                        <div style={styles.cartProduct}>
                          <div style={styles.thumb}>
                            {item.imageUrl ? (
                              <img src={`http://localhost:5000${item.imageUrl}`} alt="" style={styles.productImage} />
                            ) : (
                              <Package size={18} color="#cbd5e1" />
                            )}
                          </div>
                          <span style={{ fontWeight: 500 }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{money(item.price)}</td>
                      <td style={styles.td}>
                        <div style={styles.stepper}>
                          <button style={styles.stepBtn} onClick={() => updateQty(item.productId, -1)}>
                            <Minus size={14} />
                          </button>
                          <span style={styles.stepValue}>{item.quantity}</span>
                          <button style={styles.stepBtn} onClick={() => updateQty(item.productId, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{money(item.price * item.quantity)}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtn} onClick={() => removeFromCart(item.productId)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div style={styles.rightCol}>
          {/* Customer */}
          <div style={styles.card}>
            <h3 style={{ ...styles.cardTitle, ...styles.iconTitle }}>
              <Users size={18} /> Customer
            </h3>

            <div style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <input
                placeholder="Search customer by name, phone or ID..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {customerResults.length > 0 && (
              <div style={styles.dropdown}>
                {customerResults.map((c) => (
                  <div key={c.id} style={styles.dropdownItem} onClick={() => selectCustomer(c)}>
                    <span>
                      {customerCode(c.id)} · {c.name}
                      {c.loanAllowed && <span style={styles.loanTag}>Loan</span>}
                    </span>
                    <span style={{ color: '#94a3b8' }}>{c.phone}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.customerBox}>
              <div style={styles.avatar}><User size={20} color="#64748b" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.customerName}>
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  {loanEligible && <span style={styles.loanTag}>Loan eligible</span>}
                </div>
                <div style={styles.customerSub}>
                  {selectedCustomer
                    ? `${customerCode(selectedCustomer.id)} · ${selectedCustomer.phone || 'No phone'}`
                    : 'General customer'}
                </div>
              </div>
              {selectedCustomer ? (
                <button style={styles.iconBtn} onClick={clearCustomer} title="Remove customer">
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown size={16} color="#94a3b8" />
              )}
            </div>
          </div>

          {/* Payment method */}
          <div style={styles.card}>
            <h3 style={{ ...styles.cardTitle, ...styles.iconTitle }}>
              <CreditCard size={18} /> Payment method
            </h3>

            <div style={styles.methodList}>
              {visibleMethods.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.value;
                return (
                  <div
                    key={m.value}
                    style={{ ...styles.methodCard, ...(active ? styles.methodActive : {}) }}
                    onClick={() => setPaymentMethod(m.value)}
                  >
                    <span style={{ ...styles.radio, ...(active ? styles.radioActive : {}) }}>
                      {active && <span style={styles.radioDot} />}
                    </span>
                    <Icon size={20} color={active ? '#16a34a' : '#64748b'} />
                    <span style={{ fontWeight: 500 }}>{m.label}</span>
                  </div>
                );
              })}
            </div>

            {selectedCustomer && !loanEligible && (
              <p style={styles.hint}>Loan isn't available: this customer isn't approved for loans.</p>
            )}

            {isLoan ? (
              <>
                <label style={styles.label}>Down payment</label>
                <div style={styles.inputGroup}>
                  <input
                    type="number" min="0" placeholder="0.00"
                    value={loanDown} onChange={(e) => setLoanDown(e.target.value)}
                    style={styles.groupInput}
                  />
                  <span style={styles.suffix}>$</span>
                </div>

                <label style={styles.label}>Monthly installments</label>
                <input
                  type="number" min="1" max="60"
                  value={loanInstallments} onChange={(e) => setLoanInstallments(e.target.value)}
                  style={styles.input}
                />
                <p style={styles.hint}>
                  This sends an application for admin/manager approval. Stock is deducted only after it
                  is approved and checked out.
                </p>
              </>
            ) : (
              <>
                <label style={{ ...styles.label, ...styles.iconTitle }}>
                  <Percent size={16} /> <span style={{ fontWeight: 600, color: '#0f172a' }}>Discount</span>
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="number" min="0" placeholder="0.00"
                    value={discount} onChange={(e) => setDiscount(e.target.value)}
                    style={styles.groupInput}
                  />
                  <span style={styles.suffix}>$</span>
                </div>
                <p style={styles.hint}>Enter discount amount (optional).</p>

                {paymentMethod === 'credit' && (
                  <>
                    <label style={styles.label}>Amount paid now</label>
                    <div style={styles.inputGroup}>
                      <input
                        type="number" min="0" placeholder="0.00 (leave blank if nothing paid)"
                        value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                        style={styles.groupInput}
                      />
                      <span style={styles.suffix}>$</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sale summary */}
          <div style={styles.card}>
            <h3 style={{ ...styles.cardTitle, ...styles.iconTitle }}>
              <FileText size={18} /> {isLoan ? 'Loan summary' : 'Sale summary'}
            </h3>

            <div style={styles.sumRow}>
              <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
              <span>{money(subtotal)}</span>
            </div>

            {isLoan ? (
              <>
                <div style={styles.sumRow}><span>Down payment</span><span>-{money(downValue)}</span></div>
                <div style={styles.sumRow}>
                  <span>≈ per installment</span><span>{money(Math.max(0, perInstallment))}</span>
                </div>
                <div style={styles.totalRow}>
                  <span>Loan amount</span>
                  <span style={styles.totalValue}>{money(Math.max(0, loanAmount))}</span>
                </div>
              </>
            ) : (
              <>
                <div style={styles.sumRow}><span>Discount</span><span>{money(discountValue)}</span></div>
                <div style={styles.totalRow}>
                  <span>Total</span>
                  <span style={styles.totalValue}>{money(total)}</span>
                </div>
              </>
            )}

            {error && <p style={styles.errorText}>{error}</p>}

            <button
              style={{ ...styles.primaryBtn, ...(loading || cart.length === 0 ? styles.primaryDisabled : {}) }}
              onClick={handleSubmit}
              disabled={loading || cart.length === 0}
            >
              <Check size={18} />
              {loading ? 'Processing...' : isLoan ? 'Submit loan application' : 'Complete sale'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  pageTitle: { fontSize: '30px', fontWeight: 800, margin: 0, color: '#0f172a' },
  pageSub: { margin: '4px 0 0', color: '#64748b', fontSize: '15px' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#fff',
    border: '1px solid #dbe1ea', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#1e293b',
  },

  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '20px' },

  card: {
    backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '20px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  cardTitle: { fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' },
  iconTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
  cartCount: { fontSize: '16px', fontWeight: 500, color: '#475569' },
  muted: { color: '#64748b', fontSize: '13px', margin: 0 },

  searchBox: {
    display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #dbe1ea',
    borderRadius: '10px', padding: '11px 14px', marginBottom: '14px', backgroundColor: '#fff',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent' },

  pillRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  pill: {
    padding: '8px 18px', borderRadius: '999px', border: 'none', backgroundColor: '#f1f5f9',
    color: '#334155', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
  },
  pillActive: { backgroundColor: '#2563eb', color: '#fff' },

  productGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px',
  },
  productCard: {
    border: '1px solid #e8ecf3', borderRadius: '12px', padding: '12px',
    display: 'flex', flexDirection: 'column', backgroundColor: '#fff',
  },
  productImageWrap: {
    height: '96px', borderRadius: '8px', backgroundColor: '#f8fafc', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
  },
  productImage: { width: '100%', height: '100%', objectFit: 'cover' },
  productName: { fontSize: '13px', fontWeight: 500, color: '#0f172a', margin: '0 0 6px', minHeight: '34px', lineHeight: 1.3 },
  productPrice: { fontSize: '17px', fontWeight: 700, color: '#2563eb', margin: '0 0 2px' },
  stockText: { fontSize: '12px', margin: '0 0 10px' },
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
    padding: '8px', border: 'none', borderRadius: '8px', backgroundColor: '#eaf1ff',
    color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: 'auto',
  },
  addBtnDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' },

  clearBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#fef2f2',
    border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc', color: '#475569' },
  th: { padding: '12px 14px', fontWeight: 600, textAlign: 'center', fontSize: '13px' },
  row: { borderTop: '1px solid #eef2f7' },
  td: { padding: '12px 14px', textAlign: 'center' },
  cartProduct: { display: 'flex', alignItems: 'center', gap: '12px' },
  thumb: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepper: {
    display: 'inline-flex', alignItems: 'center', border: '1px solid #dbe1ea',
    borderRadius: '8px', overflow: 'hidden',
  },
  stepBtn: {
    width: '34px', height: '34px', border: 'none', backgroundColor: '#f8fafc', color: '#334155',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { minWidth: '40px', textAlign: 'center', fontWeight: 500, borderLeft: '1px solid #e8ecf3', borderRight: '1px solid #e8ecf3', lineHeight: '34px' },
  deleteBtn: {
    width: '36px', height: '36px', border: 'none', borderRadius: '8px', backgroundColor: '#fef2f2',
    color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },

  dropdown: {
    border: '1px solid #e8ecf3', borderRadius: '10px', marginBottom: '12px',
    maxHeight: '180px', overflowY: 'auto', backgroundColor: '#fff',
  },
  dropdownItem: {
    display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '10px 12px',
    cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f1f5f9',
  },
  customerBox: {
    display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e8ecf3',
    borderRadius: '10px', padding: '12px',
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  customerName: { fontWeight: 600, fontSize: '15px', color: '#0f172a' },
  customerSub: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  loanTag: {
    marginLeft: '8px', padding: '1px 8px', borderRadius: '8px', fontSize: '11px',
    backgroundColor: '#e1f5ee', color: '#0f6e56', fontWeight: 500,
  },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex' },

  methodList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  methodCard: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', border: '1px solid #dbe1ea',
    borderRadius: '10px', cursor: 'pointer', fontSize: '15px', color: '#0f172a', backgroundColor: '#fff',
  },
  methodActive: { border: '1px solid #93c5fd', backgroundColor: '#eaf3ff' },
  radio: {
    width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #cbd5e1',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#fff',
  },
  radioActive: { border: '2px solid #2563eb' },
  radioDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563eb' },

  label: { display: 'block', fontSize: '13px', color: '#475569', margin: '4px 0 6px' },
  input: {
    width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #dbe1ea',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '8px',
  },
  inputGroup: { display: 'flex', marginBottom: '6px' },
  groupInput: {
    flex: 1, minWidth: 0, padding: '11px 12px', border: '1px solid #dbe1ea', borderRight: 'none',
    borderRadius: '8px 0 0 8px', fontSize: '14px', outline: 'none',
  },
  suffix: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', backgroundColor: '#f1f5f9',
    border: '1px solid #dbe1ea', borderRadius: '0 8px 8px 0', color: '#475569', fontSize: '14px',
  },
  hint: { fontSize: '12px', color: '#64748b', margin: '0 0 10px' },

  sumRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '15px', color: '#334155' },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px',
    paddingTop: '14px', borderTop: '1px solid #e8ecf3', fontSize: '20px', fontWeight: 700, color: '#0f172a',
  },
  totalValue: { fontSize: '26px', fontWeight: 800, color: '#2563eb' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '12px 0 0' },

  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%',
    padding: '15px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px',
    fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '16px',
  },
  primaryDisabled: { backgroundColor: '#93b4f0', cursor: 'not-allowed' },

  successBox: {
    backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px',
    padding: '48px 24px', textAlign: 'center', maxWidth: '520px', margin: '40px auto',
  },
  successIcon: {
    width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#16a34a',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
};

export default NewSale;