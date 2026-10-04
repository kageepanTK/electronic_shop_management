import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, Search } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ProductModal from '../components/ProductModal';
import ProductFormModal from '../components/ProductFormModal';
import CategoryFormModal from '../components/CategoryFormModal';

const Products = () => {
  const { user } = useAuth();
  const canAdd = user?.role === 'admin' || user?.role === 'manager';

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCategoryName, setActiveCategoryName] = useState('All Categories');

  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/api/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchProducts = async (categoryId = 'all', search = '') => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/products', { params: { categoryId, search } });
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProducts(activeCategory, searchTerm);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (id, name) => {
    setActiveCategory(id);
    setActiveCategoryName(name);
    setShowCategoryDropdown(false);
    fetchProducts(id, searchTerm);
  };

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>Products</h2>
        {canAdd && (
          <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={styles.searchBox}>
        <Search size={16} color="#888" />
        <input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Category dropdown button, below search */}
      <div style={styles.dropdownWrap} ref={dropdownRef}>
        <button
          style={styles.categoryBtn}
          onClick={() => setShowCategoryDropdown((prev) => !prev)}
        >
          {activeCategoryName}
          <ChevronDown size={14} />
        </button>

        {showCategoryDropdown && (
          <div style={styles.dropdownMenu}>
            <div
              style={{ ...styles.dropdownItem, ...(activeCategory === 'all' ? styles.dropdownItemActive : {}) }}
              onClick={() => handleCategorySelect('all', 'All Categories')}
            >
              All Categories
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{ ...styles.dropdownItem, ...(activeCategory === cat.id ? styles.dropdownItemActive : {}) }}
                onClick={() => handleCategorySelect(cat.id, cat.name)}
              >
                {cat.name}
              </div>
            ))}
            {canAdd && (
              <div
                style={styles.dropdownAddItem}
                onClick={() => {
                  setShowCategoryDropdown(false);
                  setShowCategoryModal(true);
                }}
              >
                <Plus size={13} /> Add New Category
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p style={{ color: 'red', fontSize: '14px', marginTop: '16px' }}>{error}</p>}

      {/* Product grid */}
      {loading ? (
        <p style={{ marginTop: '16px' }}>Loading...</p>
      ) : products.length === 0 ? (
        <p style={{ color: '#888', marginTop: '16px' }}>No products found.</p>
      ) : (
        <div style={{ ...styles.grid, marginTop: '16px' }}>
          {products.map((product) => (
            <div key={product.id} style={styles.card} onClick={() => setSelectedProduct(product)}>
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
              <p style={styles.productName}>{product.name}</p>
              {product.stockQty <= product.lowStockAlert && (
                <span style={styles.lowStockBadge}>Low Stock</span>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {showAddModal && (
        <ProductFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchProducts(activeCategory, searchTerm)}
        />
      )}

      {showCategoryModal && (
        <CategoryFormModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={fetchCategories}
        />
      )}
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px',
    padding: '10px 14px', marginBottom: '10px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px' },
  dropdownWrap: { position: 'relative', display: 'inline-block' },
  categoryBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd',
    backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer', color: '#333',
  },
  dropdownMenu: {
    position: 'absolute', top: '42px', left: 0,
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: '200px',
    zIndex: 50, overflow: 'hidden',
  },
  dropdownItem: {
    padding: '10px 14px', fontSize: '13px', cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
  },
  dropdownItemActive: {
    backgroundColor: '#161a2e', color: '#fff',
  },
  dropdownAddItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 14px', fontSize: '13px', cursor: 'pointer',
    color: '#2563eb', fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
    padding: '12px', cursor: 'pointer', textAlign: 'center', position: 'relative',
  },
  imageWrap: {
    width: '100%', height: '120px', borderRadius: '8px',
    overflow: 'hidden', marginBottom: '10px', backgroundColor: '#f4f4f4',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '12px',
  },
  productName: { fontSize: '14px', fontWeight: 'bold', margin: 0 },
  lowStockBadge: {
    position: 'absolute', top: '8px', right: '8px',
    backgroundColor: '#fee2e2', color: '#dc2626',
    fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
  },
};

export default Products;