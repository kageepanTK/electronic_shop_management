import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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

  const fetchProducts = async (categoryId = 'all') => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/products', { params: { categoryId } });
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

  const handleCategoryClick = (id) => {
    setActiveCategory(id);
    fetchProducts(id);
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

      {/* Category pills */}
      <div style={styles.pillRow}>
        <button
          onClick={() => handleCategoryClick('all')}
          style={{ ...styles.pill, ...(activeCategory === 'all' ? styles.pillActive : {}) }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            style={{ ...styles.pill, ...(activeCategory === cat.id ? styles.pillActive : {}) }}
          >
            {cat.name}
          </button>
        ))}
        {canAdd && (
          <button onClick={() => setShowCategoryModal(true)} style={styles.addCategoryPill}>
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

      {/* Product grid */}
      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p style={{ color: '#888' }}>No products found in this category.</p>
      ) : (
        <div style={styles.grid}>
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

      {/* View product details */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Add product form */}
      {showAddModal && (
        <ProductFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchProducts(activeCategory)}
        />
      )}

      {/* Add category form */}
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  pillRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  pill: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pillActive: {
    backgroundColor: '#161a2e',
    color: '#fff',
    border: '1px solid #161a2e',
  },
  addCategoryPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px dashed #999',
    backgroundColor: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#555',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'center',
    position: 'relative',
  },
  imageWrap: {
    width: '100%',
    height: '120px',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '10px',
    backgroundColor: '#f4f4f4',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    fontSize: '12px',
  },
  productName: { fontSize: '14px', fontWeight: 'bold', margin: 0 },
  lowStockBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
  },
};

export default Products;