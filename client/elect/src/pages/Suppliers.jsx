import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Phone, Mail, Pencil, MoreVertical, Users, CheckCircle, Package,
  ChevronLeft, ChevronRight, X, Trash2, Power,
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';

const PAGE_SIZE = 5;

const AVATARS = [
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#fef3c7', fg: '#b45309' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#ede9fe', fg: '#6d28d9' },
];
const CHIPS = [
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#fef3c7', fg: '#b45309' },
  { bg: '#fce7f3', fg: '#be185d' },
];

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const pageWindow = (current, total) => {
  const size = 5;
  let end = Math.min(total, Math.max(1, current - 2) + size - 1);
  const start = Math.max(1, end - size + 1);
  end = Math.min(total, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/* ---------------- Add / Edit modal ---------------- */
const SupplierModal = ({ supplier, categories, onClose, onSaved }) => {
  const editing = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    categoryIds: (supplier?.Categories || []).map((c) => c.id),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const toggleCategory = (id) =>
    setForm({
      ...form,
      categoryIds: form.categoryIds.includes(id)
        ? form.categoryIds.filter((c) => c !== id)
        : [...form.categoryIds, id],
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Supplier name is required');

    setSaving(true);
    try {
      if (editing) await axios.put(`/api/suppliers/${supplier.id}`, form);
      else await axios.post('/api/suppliers', form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{editing ? 'Edit supplier' : 'Add supplier'}</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {error && <p style={styles.errorText}>{error}</p>}

        <label style={styles.label}>Name *</label>
        <input value={form.name} onChange={set('name')} style={styles.input} maxLength={150} autoFocus />

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Phone</label>
            <input value={form.phone} onChange={set('phone')} style={styles.input} maxLength={30} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Email</label>
            <input type="email" value={form.email} onChange={set('email')} style={styles.input} maxLength={100} />
          </div>
        </div>

        <label style={styles.label}>Address</label>
        <input value={form.address} onChange={set('address')} style={styles.input} maxLength={255} />

        <label style={styles.label}>Products supplied (categories)</label>
        {categories.length === 0 ? (
          <p style={styles.muted}>No categories yet. Add categories from the Products page first.</p>
        ) : (
          <div style={styles.catRow}>
            {categories.map((c) => {
              const on = form.categoryIds.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  style={{ ...styles.catToggle, ...(on ? styles.catToggleOn : {}) }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Add supplier'}
        </button>
      </form>
    </div>
  );
};

/* ---------------- Page ---------------- */
const Suppliers = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';

  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [menuId, setMenuId] = useState(null);
  const [modal, setModal] = useState(null);     // { supplier } | null  (supplier null = add)
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'deactivate', supplier }

  const fetchSuppliers = async () => {
    try {
      const { data } = await axios.get('/api/suppliers');
      setSuppliers(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    axios.get('/api/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ----- stats -----
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.isActive).length;
  const categoryCount = new Set(suppliers.flatMap((s) => (s.Categories || []).map((c) => c.id))).size;

  // ----- filter + paginate -----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (!q) return true;
      return [s.name, s.phone, s.email].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [suppliers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // ----- actions -----
  const setStatus = async (supplier, isActive) => {
    setActionError('');
    try {
      await axios.put(`/api/suppliers/${supplier.id}/status`, { isActive });
      fetchSuppliers();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const runConfirm = async () => {
    const { type, supplier } = confirm;
    setActionError('');
    try {
      if (type === 'delete') await axios.delete(`/api/suppliers/${supplier.id}`);
      else await axios.put(`/api/suppliers/${supplier.id}/status`, { isActive: false });
      fetchSuppliers();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action failed');
    } finally {
      setConfirm(null);
    }
  };

  const showingText =
    filtered.length === 0
      ? 'No suppliers found'
      : `Showing ${startIdx + 1}–${startIdx + pageRows.length} of ${filtered.length}`;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Suppliers</h1>
          <p style={styles.pageSub}>Manage supplier contacts and purchasing relationships.</p>
        </div>
        {canManage && (
          <button style={styles.addBtn} onClick={() => setModal({ supplier: null })}>
            <Plus size={18} /> Add Supplier
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div><div style={styles.statNum}>{totalCount}</div><div style={styles.statLabel}>Total suppliers</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}><CheckCircle size={24} color="#16a34a" /></div>
          <div><div style={styles.statNum}>{activeCount}</div><div style={styles.statLabel}>Active suppliers</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ede9fe' }}><Package size={24} color="#7c3aed" /></div>
          <div><div style={styles.statNum}>{categoryCount}</div><div style={styles.statLabel}>Product categories</div></div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input
            placeholder="Search suppliers by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
          <option value="all">All suppliers</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {actionError && <p style={styles.errorText}>{actionError}</p>}

      {/* Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : loadError ? (
          <p style={styles.errorText}>{loadError}</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Products supplied</th>
                <th style={styles.th}>Status</th>
                {canManage && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} style={{ ...styles.td, color: '#64748b', textAlign: 'center', padding: '32px' }}>
                    {suppliers.length === 0 ? 'No suppliers yet.' : 'No suppliers match your search.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((s) => {
                  const av = AVATARS[s.id % AVATARS.length];
                  return (
                    <tr key={s.id} style={styles.row}>
                      <td style={styles.td}>
                        <div style={styles.supplierCell}>
                          <div style={{ ...styles.avatar, backgroundColor: av.bg, color: av.fg }}>
                            {initials(s.name)}
                          </div>
                          <span style={styles.supplierName}>{s.name}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.contactLine}><Phone size={15} color="#64748b" /> {s.phone || '-'}</div>
                        <div style={styles.contactLine}><Mail size={15} color="#64748b" /> {s.email || '-'}</div>
                      </td>

                      <td style={styles.td}>
                        {(s.Categories || []).length === 0 ? (
                          <span style={styles.muted}>None assigned</span>
                        ) : (
                          <div style={styles.chipRow}>
                            {s.Categories.map((c) => {
                              const col = CHIPS[c.id % CHIPS.length];
                              return (
                                <span key={c.id} style={{ ...styles.chip, backgroundColor: col.bg, color: col.fg }}>
                                  {c.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <span style={s.isActive ? styles.badgeActive : styles.badgeInactive}>
                          <span style={{ ...styles.dot, backgroundColor: s.isActive ? '#16a34a' : '#94a3b8' }} />
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {canManage && (
                        <td style={styles.td}>
                          <div style={styles.actionCell}>
                            <button style={styles.editBtn} onClick={() => setModal({ supplier: s })}>
                              <Pencil size={15} /> Edit
                            </button>

                            <div style={{ position: 'relative' }}>
                              <button
                                style={styles.kebab}
                                onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                                aria-label="More actions"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {menuId === s.id && (
                                <>
                                  <div style={styles.backdrop} onClick={() => setMenuId(null)} />
                                  <div style={styles.menu}>
                                    <button
                                      style={styles.menuItem}
                                      onClick={() => {
                                        setMenuId(null);
                                        if (s.isActive) setConfirm({ type: 'deactivate', supplier: s });
                                        else setStatus(s, true);
                                      }}
                                    >
                                      <Power size={14} /> {s.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    {canDelete && (
                                      <button
                                        style={{ ...styles.menuItem, color: '#dc2626' }}
                                        onClick={() => {
                                          setMenuId(null);
                                          setConfirm({ type: 'delete', supplier: s });
                                        }}
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && !loadError && (
          <div style={styles.pagination}>
            <span style={styles.showing}>{showingText}</span>
            <div style={styles.pageBtns}>
              <button
                style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {pageWindow(currentPage, totalPages).map((n) => (
                <button
                  key={n}
                  style={{ ...styles.pageBtn, ...(n === currentPage ? styles.pageBtnActive : {}) }}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <SupplierModal
          supplier={modal.supplier}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={fetchSuppliers}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'delete' ? 'Delete supplier' : 'Deactivate supplier'}
          message={
            confirm.type === 'delete'
              ? `Delete ${confirm.supplier.name}? This cannot be undone.`
              : `Mark ${confirm.supplier.name} as inactive? You can activate it again later.`
          }
          confirmLabel={confirm.type === 'delete' ? 'Delete' : 'Deactivate'}
          danger
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </DashboardLayout>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  pageTitle: { fontSize: '32px', fontWeight: 800, margin: 0, color: '#0f172a' },
  pageSub: { margin: '4px 0 0', color: '#64748b', fontSize: '15px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', backgroundColor: '#2563eb',
    color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' },
  statCard: {
    display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
  },
  statIcon: { width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statNum: { fontSize: '30px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 },
  statLabel: { fontSize: '14px', color: '#64748b', marginTop: '2px' },

  filterCard: {
    display: 'flex', gap: '12px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '14px', marginBottom: '16px',
  },
  searchBox: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #dbe1ea',
    borderRadius: '10px', padding: '11px 14px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent' },
  select: {
    padding: '0 14px', minWidth: '180px', border: '1px solid #dbe1ea', borderRadius: '10px',
    fontSize: '14px', color: '#0f172a', backgroundColor: '#fff',
  },

  tableCard: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc' },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#334155' },
  row: { borderTop: '1px solid #eef2f7' },
  td: { padding: '14px', verticalAlign: 'middle' },

  supplierCell: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: {
    width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '15px', flexShrink: 0,
  },
  supplierName: { fontWeight: 700, color: '#0f172a', fontSize: '15px' },
  contactLine: { display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', lineHeight: 1.7 },

  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  chip: { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500 },

  badgeActive: {
    display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '999px',
    backgroundColor: '#dcfce7', color: '#15803d', fontSize: '13px', fontWeight: 500,
  },
  badgeInactive: {
    display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '999px',
    backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '13px', fontWeight: 500,
  },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },

  actionCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid #dbe1ea',
    borderRadius: '8px', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px', cursor: 'pointer',
  },
  kebab: {
    width: '36px', height: '36px', border: '1px solid #dbe1ea', borderRadius: '8px', backgroundColor: '#fff',
    color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: '40px', right: 0, zIndex: 41, minWidth: '150px', backgroundColor: '#fff',
    border: '1px solid #e8ecf3', borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '4px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px', border: 'none',
    backgroundColor: 'transparent', borderRadius: '6px', fontSize: '13px', color: '#0f172a',
    cursor: 'pointer', textAlign: 'left',
  },

  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px' },
  showing: { fontSize: '14px', color: '#64748b' },
  pageBtns: { display: 'flex', gap: '8px' },
  pageBtn: {
    minWidth: '38px', height: '38px', padding: '0 10px', border: '1px solid #dbe1ea', borderRadius: '8px',
    backgroundColor: '#fff', color: '#0f172a', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActive: { backgroundColor: '#2563eb', border: '1px solid #2563eb', color: '#fff' },
  pageBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },

  muted: { color: '#64748b', fontSize: '13px', margin: 0 },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },

  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: { backgroundColor: '#fff', borderRadius: '14px', padding: '22px', width: '440px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  closeBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: { display: 'block', fontSize: '12px', color: '#475569', margin: '4px 0 5px' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dbe1ea',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px',
  },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' },
  catToggle: {
    padding: '6px 14px', borderRadius: '999px', border: '1px solid #dbe1ea', backgroundColor: '#fff',
    color: '#334155', fontSize: '13px', cursor: 'pointer',
  },
  catToggleOn: { backgroundColor: '#2563eb', border: '1px solid #2563eb', color: '#fff' },
  submitBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
  },
};

export default Suppliers;