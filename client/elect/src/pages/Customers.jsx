import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Wallet, Banknote, ShieldCheck, Search, Phone, Mail, MapPin, Eye, MoreVertical,
  UserPlus, X, Pencil, CheckCircle2, Ban, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';
import LoanStatusBadge from '../components/LoanStatusBadge';
import { customerCode, money } from '../utils/format';

const PAGE_SIZES = [5, 10, 25, 50];
const AVATARS = [
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#ffedd5', fg: '#c2410c' },
  { bg: '#fce7f3', fg: '#be185d' },
];
const BALANCE_BADGES = {
  overdue: { label: 'Overdue', bg: '#ffedd5', fg: '#c2410c' },
  due: { label: 'Due', bg: '#fef3c7', fg: '#b45309' },
  none: { label: 'No balance', bg: '#f1f5f9', fg: '#64748b' },
};

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const dateText = (d) => new Date(d).toLocaleDateString();

const pageWindow = (current, total) => {
  const size = 5;
  let end = Math.min(total, Math.max(1, current - 2) + size - 1);
  const start = Math.max(1, end - size + 1);
  end = Math.min(total, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const Avatar = ({ person, size = 46 }) => {
  const c = AVATARS[person.id % AVATARS.length];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', backgroundColor: c.bg, color: c.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size > 50 ? '20px' : '15px', flexShrink: 0,
      }}
    >
      {initials(person.name)}
    </div>
  );
};

const LoanBadge = ({ allowed }) =>
  allowed ? (
    <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#15803d' }}>
      <CheckCircle2 size={14} /> Enabled
    </span>
  ) : (
    <span style={{ ...styles.badge, backgroundColor: '#f1f5f9', color: '#64748b' }}>
      <Ban size={14} /> Disabled
    </span>
  );

/* ---------------- Add / Edit modal ---------------- */
const CustomerFormModal = ({ customer, canManage, onClose, onSaved }) => {
  const editing = !!customer;
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    loanLimit:
      customer?.loanLimit !== null && customer?.loanLimit !== undefined
        ? String(parseFloat(customer.loanLimit))
        : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Customer name is required');
    if (form.loanLimit !== '' && Number(form.loanLimit) < 0) return setError('Loan limit cannot be negative');

    setSaving(true);
    try {
      const body = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        ...(canManage ? { loanLimit: form.loanLimit } : {}),
      };
      if (editing) await axios.put(`/api/customers/${customer.id}`, body);
      else await axios.post('/api/customers', body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{editing ? 'Edit customer' : 'Add customer'}</h3>
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

        {canManage && (
          <>
            <label style={styles.label}>Loan limit (optional)</label>
            <input
              type="number" min="0" step="0.01" value={form.loanLimit} onChange={set('loanLimit')}
              style={styles.input} placeholder="Leave empty for no limit"
            />
            <p style={styles.hint}>
              The most this customer can owe, including loan applications still waiting. Checked when a
              loan application is submitted.
            </p>
          </>
        )}

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Add customer'}
        </button>
      </form>
    </div>
  );
};

/* ---------------- Details drawer ---------------- */
const CustomerDrawer = ({ id, version, canManage, onClose, onEdit, onToggle }) => {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('loans');
  const latest = useRef(0);

  useEffect(() => {
    setInfo(null);
    setTab('loans');
  }, [id]);

  useEffect(() => {
    const req = ++latest.current;
    axios
      .get(`/api/customers/${id}/details`)
      .then(({ data }) => {
        if (req === latest.current) { setInfo(data); setError(''); }
      })
      .catch((err) => {
        if (req === latest.current) setError(err.response?.data?.message || 'Failed to load customer');
      });
  }, [id, version]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const c = info?.customer;
  const credit = info?.credit;
  const owes = credit && parseFloat(credit.outstanding) > 0;

  return (
    <>
      <div style={styles.drawerBackdrop} onClick={onClose} />
      <aside style={styles.drawer} role="dialog" aria-label="Customer details">
        <div style={styles.drawerHeader}>
          <h3 style={styles.drawerTitle}>Customer details</h3>
          <button style={styles.plainClose} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {error ? (
          <p style={styles.errorText}>{error}</p>
        ) : !info ? (
          <p style={styles.muted}>Loading...</p>
        ) : (
          <>
            <div style={styles.profile}>
              <Avatar person={c} size={64} />
              <div>
                <div style={styles.profileName}>
                  {c.name}
                  {c.loanAllowed && <span style={styles.profileBadge}><CheckCircle2 size={12} /> Loans enabled</span>}
                  {info.overdue && <span style={styles.overdueBadge}>Overdue</span>}
                </div>
                <div style={styles.small}>Customer ID: {customerCode(c.id)}</div>
                <div style={styles.small}>Customer since {dateText(c.createdAt)}</div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHead}>
                <h4 style={styles.sectionTitle}>Contact details</h4>
                {canManage && (
                  <button style={styles.editBtn} onClick={() => onEdit(c)}>
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>
              <div style={styles.contactRow}><Phone size={16} color="#2563eb" /> {c.phone || 'No phone provided'}</div>
              <div style={styles.contactRow}><Mail size={16} color="#2563eb" /> {c.email || 'No email provided'}</div>
              <div style={styles.contactRow}><MapPin size={16} color="#2563eb" /> {c.address || 'No address provided'}</div>
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Loan information</h4>
              <div style={styles.infoRow}>
                <span>Loan status</span>
                <LoanBadge allowed={c.loanAllowed} />
              </div>
              <div style={styles.infoRow}>
                <span>Loan limit</span>
                <strong>{credit.limit === null ? 'No limit set' : money(credit.limit)}</strong>
              </div>
              <div style={styles.infoRow}>
                <span>Current balance</span>
                <strong style={{ color: owes ? '#dc2626' : '#0f172a' }}>{money(credit.outstanding)}</strong>
              </div>
              {parseFloat(credit.reserved) > 0 && (
                <div style={styles.infoRow}>
                  <span>Applications waiting</span>
                  <strong>{money(credit.reserved)}</strong>
                </div>
              )}
              <div style={styles.infoRow}>
                <span>Available loan credit</span>
                <strong>{credit.available === null ? 'No limit' : money(credit.available)}</strong>
              </div>

              {c.loanAllowed ? (
                <div style={styles.warnBox}>
                  <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Disabling loans prevents new loan applications.</strong>
                    <div style={{ marginTop: '2px' }}>
                      Existing loans carry on, and the customer can still make repayments.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.infoBox}>
                  Loans are disabled. Enable them to let this customer apply for a loan at checkout.
                </div>
              )}

              {canManage && (
                <button
                  style={c.loanAllowed ? styles.disableBtn : styles.enableBtn}
                  onClick={() => onToggle(c)}
                >
                  {c.loanAllowed ? 'Disable loans' : 'Enable loans'}
                </button>
              )}
            </div>

            <div style={styles.tabs}>
              <button style={{ ...styles.tab, ...(tab === 'loans' ? styles.tabActive : {}) }} onClick={() => setTab('loans')}>
                Recent loans
              </button>
              <button style={{ ...styles.tab, ...(tab === 'payments' ? styles.tabActive : {}) }} onClick={() => setTab('payments')}>
                Payment history
              </button>
            </div>

            {tab === 'loans' ? (
              info.loans.length === 0 ? (
                <p style={styles.muted}>No loans yet.</p>
              ) : (
                <table style={styles.miniTable}>
                  <thead>
                    <tr style={styles.miniHead}>
                      <th style={styles.mth}>Date</th><th style={styles.mth}>Loan</th>
                      <th style={styles.mth}>Amount</th><th style={styles.mth}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.loans.map((l) => (
                      <tr key={l.id} style={styles.miniRow}>
                        <td style={styles.mtd}>{dateText(l.createdAt)}</td>
                        <td style={styles.mtd}>
                          <button style={styles.linkBtn} onClick={() => navigate(`/loans/${l.id}`)}>#L{l.id}</button>
                        </td>
                        <td style={styles.mtd}>{money(l.loanAmount)}</td>
                        <td style={styles.mtd}><LoanStatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : info.payments.length === 0 ? (
              <p style={styles.muted}>No payments recorded yet.</p>
            ) : (
              <table style={styles.miniTable}>
                <thead>
                  <tr style={styles.miniHead}>
                    <th style={styles.mth}>Date</th><th style={styles.mth}>Loan</th>
                    <th style={styles.mth}>Amount</th><th style={styles.mth}>Received by</th>
                  </tr>
                </thead>
                <tbody>
                  {info.payments.map((p) => (
                    <tr key={p.id} style={styles.miniRow}>
                      <td style={styles.mtd}>{dateText(p.createdAt)}</td>
                      <td style={styles.mtd}>
                        <button style={styles.linkBtn} onClick={() => navigate(`/loans/${p.loanId}`)}>#L{p.loanId}</button>
                      </td>
                      <td style={styles.mtd}>{money(p.amount)}</td>
                      <td style={styles.mtd}>{p.receivedBy?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </aside>
    </>
  );
};

/* ---------------- Page ---------------- */
const Customers = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [data, setData] = useState({ rows: [], total: 0, pages: 1, stats: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [balance, setBalance] = useState('all');
  const [credit, setCredit] = useState('all');
  const [sort, setSort] = useState('balance_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [openId, setOpenId] = useState(null);
  const [version, setVersion] = useState(0); // bumps to reload the open drawer
  const [formFor, setFormFor] = useState(null); // { customer } (customer null = add)
  const [confirm, setConfirm] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const { data: res } = await axios.get('/api/customers/overview', {
        params: { search, balance, credit, sort, page, pageSize },
      });
      if (id !== reqId.current) return;
      setData(res);
      setLoadError('');
      if (res.rows.length === 0 && res.total > 0 && page > res.pages) setPage(res.pages);
    } catch (err) {
      if (id === reqId.current) setLoadError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [search, balance, credit, sort, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshAll = () => {
    fetchData();
    setVersion((v) => v + 1);
  };

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const toggleLoans = async () => {
    const c = confirm;
    setConfirm(null);
    setActionError('');
    try {
      await axios.put(`/api/customers/${c.id}/loan-eligibility`, { loanAllowed: !c.loanAllowed });
      refreshAll();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update loan access');
    }
  };

  const stats = data.stats;
  const start = data.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = (page - 1) * pageSize + data.rows.length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Customers</h1>
          <p style={styles.pageSub}>Manage customer details, balances, and loan access</p>
        </div>
        <button style={styles.addBtn} onClick={() => setFormFor({ customer: null })}>
          <UserPlus size={18} /> Add customer
        </button>
      </div>

      {/* Stat cards */}
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div><div style={styles.statLabel}>Total customers</div><div style={styles.statNum}>{stats ? stats.totalCustomers : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fee2e2' }}><Wallet size={24} color="#dc2626" /></div>
          <div><div style={styles.statLabel}>With outstanding balance</div><div style={styles.statNum}>{stats ? stats.withBalance : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ede9fe' }}><Banknote size={24} color="#7c3aed" /></div>
          <div><div style={styles.statLabel}>Total amount due</div><div style={styles.statNum}>{stats ? money(stats.totalDue) : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}><ShieldCheck size={24} color="#16a34a" /></div>
          <div><div style={styles.statLabel}>Loans enabled</div><div style={styles.statNum}>{stats ? stats.loansEnabled : '-'}</div></div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input
            placeholder="Search by name, customer ID or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select value={balance} onChange={onFilter(setBalance)} style={styles.select}>
          <option value="all">All customers</option>
          <option value="with">With balance</option>
          <option value="none">No balance</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={credit} onChange={onFilter(setCredit)} style={styles.select}>
          <option value="all">Loan access: all</option>
          <option value="enabled">Loans enabled</option>
          <option value="disabled">Loans disabled</option>
        </select>
        <select value={sort} onChange={onFilter(setSort)} style={styles.select}>
          <option value="balance_desc">Balance: high to low</option>
          <option value="balance_asc">Balance: low to high</option>
          <option value="name">Name: A to Z</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      {actionError && <p style={styles.errorText}>{actionError}</p>}

      {/* Table */}
      <div style={styles.tableCard}>
        {loadError && <p style={styles.errorText}>{loadError}</p>}

        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Outstanding balance</th>
              <th style={styles.th}>Loan access</th>
              <th style={styles.th}>Last activity</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.emptyCell}>Loading...</td></tr>
            ) : data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyCell}>
                  {stats && stats.totalCustomers === 0 ? 'No customers yet.' : 'No customers match your filters.'}
                </td>
              </tr>
            ) : (
              data.rows.map((c) => {
                const b = BALANCE_BADGES[c.balanceStatus];
                const owes = c.balanceStatus !== 'none';
                return (
                  <tr key={c.id} style={styles.row}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <Avatar person={c} />
                        <div>
                          <div style={styles.custName}>{c.name}</div>
                          <div style={styles.small}>{customerCode(c.id)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contactLine}><Phone size={14} color="#2563eb" /> {c.phone || '-'}</div>
                      <div style={styles.contactLine}><Mail size={14} color="#2563eb" /> {c.email || '-'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ ...styles.balance, color: c.balanceStatus === 'overdue' ? '#dc2626' : owes ? '#ea580c' : '#0f172a' }}>
                        {money(c.dueAmount)}
                      </div>
                      <span style={{ ...styles.balanceBadge, backgroundColor: b.bg, color: b.fg }}>{b.label}</span>
                    </td>
                    <td style={styles.td}>
                      <LoanBadge allowed={c.loanAllowed} />
                      <div style={{ ...styles.small, marginTop: '6px' }}>
                        {c.loanLimit === null || c.loanLimit === undefined
                          ? 'No limit set'
                          : `Limit: ${money(c.loanLimit)}`}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {c.lastActivity ? (
                        <>
                          <div>{dateText(c.lastActivity.at)}</div>
                          <div style={styles.small}>{c.lastActivity.kind}</div>
                        </>
                      ) : (
                        <span style={styles.small}>No activity</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button style={styles.viewBtn} onClick={() => setOpenId(c.id)}>
                          <Eye size={15} /> View details
                        </button>
                        {canManage && (
                          <div style={{ position: 'relative' }}>
                            <button
                              style={styles.kebab}
                              onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                              aria-label="More actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {menuId === c.id && (
                              <>
                                <div style={styles.menuBackdrop} onClick={() => setMenuId(null)} />
                                <div style={styles.menu}>
                                  <button
                                    style={styles.menuItem}
                                    onClick={() => { setMenuId(null); setFormFor({ customer: c }); }}
                                  >
                                    <Pencil size={14} /> Edit customer
                                  </button>
                                  <button
                                    style={{ ...styles.menuItem, ...(c.loanAllowed ? { color: '#dc2626' } : {}) }}
                                    onClick={() => { setMenuId(null); setConfirm(c); }}
                                  >
                                    {c.loanAllowed ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                    {c.loanAllowed ? 'Disable loans' : 'Enable loans'}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && !loadError && (
          <div style={styles.pagination}>
            <span style={styles.showing}>
              {data.total === 0 ? 'No customers' : `Showing ${start}–${end} of ${data.total} customers`}
            </span>
            <div style={styles.pageControls}>
              <button
                style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              {pageWindow(page, data.pages).map((n) => (
                <button
                  key={n}
                  style={{ ...styles.pageBtn, ...(n === page ? styles.pageBtnActive : {}) }}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                style={{ ...styles.pageBtn, ...(page >= data.pages ? styles.pageBtnDisabled : {}) }}
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pages}
              >
                <ChevronRight size={16} />
              </button>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={styles.pageSizeSelect}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {openId && (
        <CustomerDrawer
          id={openId}
          version={version}
          canManage={canManage}
          onClose={() => setOpenId(null)}
          onEdit={(c) => setFormFor({ customer: c })}
          onToggle={(c) => setConfirm(c)}
        />
      )}

      {formFor && (
        <CustomerFormModal
          customer={formFor.customer}
          canManage={canManage}
          onClose={() => setFormFor(null)}
          onSaved={refreshAll}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.loanAllowed ? 'Disable loans' : 'Enable loans'}
          message={
            confirm.loanAllowed
              ? `Stop ${confirm.name} from applying for new loans? Existing loans carry on and repayments can still be recorded.`
              : `Allow ${confirm.name} (${customerCode(confirm.id)}) to apply for loans at checkout?`
          }
          confirmLabel={confirm.loanAllowed ? 'Disable loans' : 'Enable loans'}
          danger={confirm.loanAllowed}
          onConfirm={toggleLoans}
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

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' },
  statCard: {
    display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
  },
  statIcon: { width: '52px', height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: '13px', color: '#64748b' },
  statNum: { fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 },

  filterCard: {
    display: 'flex', gap: '12px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '14px', marginBottom: '16px', flexWrap: 'wrap',
  },
  searchBox: {
    flex: 2, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '10px',
    border: '1px solid #dbe1ea', borderRadius: '10px', padding: '0 14px', height: '46px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent' },
  select: {
    flex: 1, minWidth: '160px', height: '46px', padding: '0 12px', border: '1px solid #dbe1ea',
    borderRadius: '10px', fontSize: '14px', color: '#0f172a', backgroundColor: '#fff',
  },

  tableCard: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc' },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#334155' },
  row: { borderTop: '1px solid #eef2f7' },
  td: { padding: '14px', verticalAlign: 'middle', color: '#0f172a' },
  emptyCell: { padding: '36px', textAlign: 'center', color: '#64748b' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  custName: { fontWeight: 700, fontSize: '15px' },
  small: { fontSize: '12px', color: '#64748b' },
  contactLine: { display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', lineHeight: 1.7 },
  balance: { fontSize: '16px', fontWeight: 700, marginBottom: '4px' },
  balanceBadge: { display: 'inline-block', padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
    borderRadius: '999px', fontSize: '13px', fontWeight: 500,
  },

  actionCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  viewBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', border: '1px solid #93c5fd',
    borderRadius: '8px', backgroundColor: '#fff', color: '#2563eb', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  },
  kebab: {
    width: '38px', height: '38px', border: '1px solid #dbe1ea', borderRadius: '8px', backgroundColor: '#fff',
    color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menuBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: '42px', right: 0, zIndex: 41, minWidth: '170px', backgroundColor: '#fff',
    border: '1px solid #e8ecf3', borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '4px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px', border: 'none',
    backgroundColor: 'transparent', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', textAlign: 'left',
  },

  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' },
  showing: { fontSize: '14px', color: '#64748b' },
  pageControls: { display: 'flex', gap: '8px', alignItems: 'center' },
  pageBtn: {
    minWidth: '38px', height: '38px', padding: '0 10px', border: '1px solid #dbe1ea', borderRadius: '8px',
    backgroundColor: '#fff', color: '#0f172a', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActive: { backgroundColor: '#2563eb', border: '1px solid #2563eb', color: '#fff' },
  pageBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  pageSizeSelect: { height: '38px', padding: '0 10px', border: '1px solid #dbe1ea', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', marginLeft: '8px' },

  drawerBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.28)', zIndex: 140 },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: '470px', maxWidth: '100vw', backgroundColor: '#f8fafc',
    boxShadow: '-8px 0 30px rgba(15,23,42,0.15)', zIndex: 150, overflowY: 'auto', padding: '22px', boxSizing: 'border-box',
  },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
  drawerTitle: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  plainClose: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#334155', display: 'flex' },
  profile: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  profileName: { fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' },
  profileBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '999px',
    backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 600,
  },
  overdueBadge: { padding: '2px 10px', borderRadius: '999px', backgroundColor: '#ffedd5', color: '#c2410c', fontSize: '11px', fontWeight: 600 },

  section: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '12px', padding: '16px', marginBottom: '14px' },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  sectionTitle: { margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: '#0f172a' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: '1px solid #93c5fd',
    borderRadius: '8px', backgroundColor: '#fff', color: '#2563eb', fontSize: '13px', cursor: 'pointer',
  },
  contactRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '7px 0', fontSize: '14px', color: '#334155' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: '14px', color: '#334155' },
  warnBox: {
    display: 'flex', gap: '10px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px',
    padding: '12px', fontSize: '13px', color: '#78350f', lineHeight: 1.5, margin: '10px 0',
  },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#1e3a8a', margin: '10px 0' },
  disableBtn: {
    width: '100%', padding: '10px', border: '1px solid #dc2626', borderRadius: '8px', backgroundColor: '#fff',
    color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
  },
  enableBtn: {
    width: '100%', padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: '#15803d',
    color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
  },

  tabs: { display: 'flex', borderBottom: '1px solid #e8ecf3', marginBottom: '10px' },
  tab: {
    padding: '12px 16px', border: 'none', borderBottom: '3px solid transparent', backgroundColor: 'transparent',
    color: '#475569', fontSize: '14px', cursor: 'pointer', marginBottom: '-1px',
  },
  tabActive: { color: '#2563eb', borderBottom: '3px solid #2563eb', fontWeight: 600 },
  miniTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: '#fff', borderRadius: '10px' },
  miniHead: { backgroundColor: '#f1f5f9', color: '#334155' },
  mth: { textAlign: 'left', padding: '9px 10px', fontSize: '12px', fontWeight: 600 },
  miniRow: { borderTop: '1px solid #eef2f7' },
  mtd: { padding: '9px 10px', color: '#0f172a' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: 0 },

  muted: { color: '#64748b', fontSize: '13px', margin: '8px 0' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },
  hint: { fontSize: '12px', color: '#64748b', margin: '-4px 0 12px' },

  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
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
  submitBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
  },
};

export default Customers;