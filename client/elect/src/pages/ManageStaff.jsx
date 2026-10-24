import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Wallet, Clock, FileText, Search, Calendar, Filter, History, Pencil,
  MoreHorizontal, Plus, X, Trash2, Lock, CheckCircle2, Undo2,
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_STYLES = {
  staff: { bg: '#dbeafe', fg: '#1d4ed8' },
  admin: { bg: '#ede9fe', fg: '#6d28d9' },
  manager: { bg: '#ffedd5', fg: '#c2410c' },
};
const AVATARS = [
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#ffedd5', fg: '#c2410c' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fce7f3', fg: '#be185d' },
];

const lkr = (v) => {
  const n = Number(v) || 0;
  return `LKR ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const todayMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7);
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/* ---------------- small shared pieces ---------------- */
const KebabMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button style={styles.kebab} onClick={() => setOpen(!open)} aria-label="More actions">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div style={styles.backdrop} onClick={() => setOpen(false)} />
          <div style={styles.menu}>
            {visible.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  style={{ ...styles.menuItem, ...(item.danger ? { color: '#dc2626' } : {}) }}
                  onClick={() => { setOpen(false); item.onClick(); }}
                >
                  <Icon size={14} /> {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const Avatar = ({ person }) => {
  const c = AVATARS[person.id % AVATARS.length];
  return <div style={{ ...styles.avatar, backgroundColor: c.bg, color: c.fg }}>{initials(person.name)}</div>;
};

const RoleBadge = ({ role }) => {
  const c = ROLE_STYLES[role] || ROLE_STYLES.staff;
  return <span style={{ ...styles.roleBadge, backgroundColor: c.bg, color: c.fg }}>{cap(role)}</span>;
};

const StatusBadge = ({ status, payment }) => {
  const map = {
    paid: { bg: '#dcfce7', fg: '#15803d', dot: '#16a34a', label: 'Paid' },
    pending: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b', label: 'Pending' },
    unset: { bg: '#f1f5f9', fg: '#64748b', dot: '#94a3b8', label: 'No salary set' },
  };
  const c = map[status];
  const title = payment ? `Paid on ${new Date(payment.paidAt).toLocaleDateString()}` : undefined;
  return (
    <span title={title} style={{ ...styles.statusBadge, backgroundColor: c.bg, color: c.fg }}>
      <span style={{ ...styles.dot, backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
};

/* ---------------- modals ---------------- */
const AddStaffModal = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'staff', monthlySalary: '', payDay: '25',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Enter a name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');

    setSaving(true);
    try {
      await axios.post('/api/users', form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Add staff member</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        {error && <p style={styles.errorText}>{error}</p>}

        <label style={styles.label}>Full name *</label>
        <input value={form.name} onChange={set('name')} style={styles.input} maxLength={100} autoFocus />

        <label style={styles.label}>Email *</label>
        <input type="email" value={form.email} onChange={set('email')} style={styles.input} maxLength={100} />

        <label style={styles.label}>Temporary password * (min 8 characters)</label>
        <input type="password" value={form.password} onChange={set('password')} style={styles.input} maxLength={72} />

        <label style={styles.label}>Role</label>
        <select value={form.role} onChange={set('role')} style={styles.input}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Monthly salary (LKR)</label>
            <input type="number" min="0" step="0.01" value={form.monthlySalary} onChange={set('monthlySalary')} style={styles.input} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Pay day (1–28)</label>
            <input type="number" min="1" max="28" value={form.payDay} onChange={set('payDay')} style={styles.input} />
          </div>
        </div>

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Add staff member'}
        </button>
      </form>
    </div>
  );
};

const EditSalaryModal = ({ person, onClose, onSaved }) => {
  const [salary, setSalary] = useState(String(parseFloat(person.monthlySalary) || 0));
  const [payDay, setPayDay] = useState(String(person.payDay || 25));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (salary === '' || Number(salary) < 0) return setError('Enter a valid monthly salary');
    const d = Number(payDay);
    if (!Number.isInteger(d) || d < 1 || d > 28) return setError('Pay day must be between 1 and 28');

    setSaving(true);
    try {
      await axios.put(`/api/users/${person.id}/salary`, { monthlySalary: salary, payDay: d });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update salary');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Edit salary: {person.name}</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        {error && <p style={styles.errorText}>{error}</p>}

        <label style={styles.label}>Monthly salary (LKR)</label>
        <input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} style={styles.input} autoFocus />

        <label style={styles.label}>Pay day (1–28)</label>
        <input type="number" min="1" max="28" value={payDay} onChange={(e) => setPayDay(e.target.value)} style={styles.input} />

        <p style={styles.hint}>
          The new salary applies to months that aren't paid yet. Months already marked as paid keep
          the amount that was recorded.
        </p>

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save salary'}
        </button>
      </form>
    </div>
  );
};

const HistoryModal = ({ person, onClose }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('/api/users/payments', { params: person ? { userId: person.id } : {} })
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payment history'));
  }, [person?.id]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Payment history{person ? `: ${person.name}` : ''}</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {error ? (
          <p style={styles.errorText}>{error}</p>
        ) : rows === null ? (
          <p style={styles.muted}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={styles.muted}>No salary payments recorded yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Month</th>
                {!person && <th style={styles.th}>Staff member</th>}
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Paid on</th>
                <th style={styles.th}>Recorded by</th>
                <th style={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={styles.row}>
                  <td style={styles.td}>{monthLabel(p.payMonth)}</td>
                  {!person && <td style={styles.td}>{p.employee?.name || '-'}</td>}
                  <td style={styles.td}>{lkr(p.amount)}</td>
                  <td style={styles.td}>{new Date(p.paidAt).toLocaleDateString()}</td>
                  <td style={styles.td}>{p.paidBy?.name || '-'}</td>
                  <td style={styles.td}>{p.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

/* ---------------- page ---------------- */
const ManageStaff = () => {
  const { user: currentUser } = useAuth();

  const [tab, setTab] = useState('team');
  const [users, setUsers] = useState([]);
  const [payroll, setPayroll] = useState({ rows: [], totals: null });
  const [usersLoading, setUsersLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [month, setMonth] = useState(todayMonth());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAdd, setShowAdd] = useState(false);
  const [salaryFor, setSalaryFor] = useState(null);
  const [history, setHistory] = useState(null); // { person } where person may be null (everyone)
  const [confirm, setConfirm] = useState(null);

  const latestMonth = useRef(month);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPayroll = async (m) => {
    latestMonth.current = m;
    try {
      const { data } = await axios.get('/api/users/payroll', { params: { month: m } });
      if (data.month === latestMonth.current) setPayroll(data); // ignore stale responses
      setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load payroll');
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchPayroll(month); }, [month]);

  const refresh = () => {
    fetchUsers();
    fetchPayroll(month);
  };

  const isSelf = (id) => id === currentUser?.id;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payroll.rows.filter(
      (r) =>
        (statusFilter === 'all' || r.status === statusFilter) &&
        (!q || r.name.toLowerCase().includes(q))
    );
  }, [payroll.rows, search, statusFilter]);

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    setActionError('');
    try {
      if (c.type === 'role') await axios.put(`/api/users/${c.person.id}/role`, { role: c.newRole });
      if (c.type === 'remove') await axios.delete(`/api/users/${c.person.id}`);
      if (c.type === 'pay') await axios.post(`/api/users/${c.person.id}/payments`, { month });
      if (c.type === 'undo') await axios.delete(`/api/users/payments/${c.person.payment.id}`);
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action failed');
    }
  };

  const confirmText = () => {
    if (!confirm) return {};
    const { type, person, newRole } = confirm;
    if (type === 'role') {
      return { title: 'Change role', message: `Change ${person.name}'s role to ${cap(newRole)}?`, label: 'Change role', danger: false };
    }
    if (type === 'remove') {
      return { title: 'Remove staff member', message: `Remove ${person.name} from the system? This cannot be undone.`, label: 'Remove', danger: true };
    }
    if (type === 'pay') {
      return {
        title: 'Mark salary as paid',
        message: `Mark ${person.name}'s salary of ${lkr(person.monthlySalary)} for ${monthLabel(month)} as paid? This records the payment. It does not transfer any money.`,
        label: 'Mark as paid',
        danger: false,
      };
    }
    return {
      title: 'Undo payment',
      message: `Remove the ${monthLabel(month)} payment (${lkr(person.payment.amount)}) recorded for ${person.name}? It will show as pending again.`,
      label: 'Undo payment',
      danger: true,
    };
  };

  const totals = payroll.totals;
  const isCurrentMonth = month === todayMonth();
  const ct = confirmText();

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Staff &amp; payroll</h1>
          <p style={styles.pageSub}>Manage team access, salary and pay history</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add staff member
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}><Users size={24} color="#2563eb" /></div>
          <div>
            <div style={styles.statNum}>{totals ? totals.teamMembers : users.length}</div>
            <div style={styles.statLabel}>Team members</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}><Wallet size={24} color="#16a34a" /></div>
          <div>
            <div style={styles.statNum}>{totals ? lkr(totals.monthlyPayroll) : '-'}</div>
            <div style={styles.statLabel}>Monthly payroll</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ffedd5' }}><Clock size={24} color="#ea580c" /></div>
          <div>
            <div style={styles.statNum}>{totals ? lkr(totals.pending) : '-'}</div>
            <div style={styles.statLabel}>{isCurrentMonth ? 'Pending this month' : `Pending for ${monthLabel(month)}`}</div>
          </div>
        </div>
      </div>

      {actionError && <p style={styles.errorText}>{actionError}</p>}
      {loadError && <p style={styles.errorText}>{loadError}</p>}

      {/* Tabs card */}
      <div style={styles.card}>
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'team' ? styles.tabActive : {}) }} onClick={() => setTab('team')}>
            <Users size={18} /> Team
          </button>
          <button style={{ ...styles.tab, ...(tab === 'payroll' ? styles.tabActive : {}) }} onClick={() => setTab('payroll')}>
            <FileText size={18} /> Payroll
          </button>
        </div>

        {/* ----- Team tab ----- */}
        {tab === 'team' && (
          usersLoading ? (
            <p style={styles.muted}>Loading...</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Staff member</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = isSelf(u.id);
                  return (
                    <tr key={u.id} style={styles.row}>
                      <td style={styles.td}>
                        <div style={styles.personCell}>
                          <Avatar person={u} />
                          <span style={styles.personName}>{u.name}</span>
                          {self && <span style={styles.youBadge}>You</span>}
                        </div>
                      </td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <select
                          value={u.role}
                          disabled={self}
                          title={self ? "You can't change your own role" : undefined}
                          onChange={(e) => setConfirm({ type: 'role', person: u, newRole: e.target.value })}
                          style={styles.roleSelect}
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <div style={styles.actionCell}>
                          <button style={styles.editBtn} onClick={() => setSalaryFor(u)}>
                            <Pencil size={15} /> Edit salary
                          </button>
                          <KebabMenu
                            items={[
                              { label: 'Payment history', icon: History, onClick: () => setHistory({ person: u }) },
                              { label: 'Remove staff', icon: Trash2, danger: true, hidden: self, onClick: () => setConfirm({ type: 'remove', person: u }) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* ----- Payroll tab ----- */}
        {tab === 'payroll' && (
          <>
            <div style={styles.filterRow}>
              <div style={{ ...styles.field, flex: 1.4 }}>
                <Search size={18} color="#94a3b8" />
                <input
                  placeholder="Search by staff name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.fieldInput}
                />
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <Calendar size={18} color="#475569" />
                <input
                  type="month"
                  value={month}
                  max={todayMonth()}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                  style={styles.fieldInput}
                />
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <Filter size={18} color="#475569" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.fieldInput}>
                  <option value="all">All payment status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="unset">No salary set</option>
                </select>
              </div>

              <button style={styles.historyBtn} onClick={() => setHistory({ person: null })}>
                <History size={17} /> View payment history
              </button>
            </div>

            {payrollLoading ? (
              <p style={styles.muted}>Loading...</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>Staff member</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Monthly salary</th>
                    <th style={styles.th}>Pay day</th>
                    <th style={styles.th}>{isCurrentMonth ? 'This month' : monthLabel(month)}</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: '32px' }}>
                        {payroll.rows.length === 0 ? 'No staff on payroll for this month.' : 'No staff match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const self = isSelf(r.id);
                      const differs = r.payment && Number(r.payment.amount) !== Number(r.monthlySalary);
                      return (
                        <tr key={r.id} style={styles.row}>
                          <td style={styles.td}>
                            <div style={styles.personCell}>
                              <Avatar person={r} />
                              <span style={styles.personName}>{r.name}</span>
                              {self && <span style={styles.youBadge}>You</span>}
                            </div>
                          </td>
                          <td style={styles.td}><RoleBadge role={r.role} /></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 600 }}>{lkr(r.monthlySalary)}</div>
                            {differs && <div style={styles.subtle}>Paid {lkr(r.payment.amount)}</div>}
                          </td>
                          <td style={styles.td}>{r.payDay}</td>
                          <td style={styles.td}><StatusBadge status={r.status} payment={r.payment} /></td>
                          <td style={styles.td}>
                            <div style={styles.actionCell}>
                              <button style={styles.editBtn} onClick={() => setSalaryFor(r)}>
                                <Pencil size={15} /> Edit salary
                              </button>
                              <KebabMenu
                                items={[
                                  { label: 'Mark as paid', icon: CheckCircle2, hidden: r.status !== 'pending', onClick: () => setConfirm({ type: 'pay', person: r }) },
                                  { label: 'Undo payment', icon: Undo2, danger: true, hidden: r.status !== 'paid', onClick: () => setConfirm({ type: 'undo', person: r }) },
                                  { label: 'Payment history', icon: History, onClick: () => setHistory({ person: r }) },
                                  { label: 'Remove staff', icon: Trash2, danger: true, hidden: self, onClick: () => setConfirm({ type: 'remove', person: r }) },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            <div style={styles.footerNote}>
              <Lock size={15} /> Salary details are visible to admins only.
            </div>
          </>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {salaryFor && <EditSalaryModal person={salaryFor} onClose={() => setSalaryFor(null)} onSaved={refresh} />}
      {history && <HistoryModal person={history.person} onClose={() => setHistory(null)} />}

      {confirm && (
        <ConfirmModal
          title={ct.title}
          message={ct.message}
          confirmLabel={ct.label}
          danger={ct.danger}
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
  statNum: { fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 },
  statLabel: { fontSize: '14px', color: '#64748b', marginTop: '2px' },

  card: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '8px 20px 20px' },
  tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid #e8ecf3', marginBottom: '18px' },
  tab: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 22px', border: 'none',
    borderBottom: '3px solid transparent', backgroundColor: 'transparent', color: '#334155',
    fontSize: '16px', fontWeight: 500, cursor: 'pointer', marginBottom: '-1px',
  },
  tabActive: { color: '#2563eb', borderBottom: '3px solid #2563eb', fontWeight: 600 },

  filterRow: { display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' },
  field: {
    display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #dbe1ea', borderRadius: '10px',
    padding: '0 14px', height: '48px', backgroundColor: '#fff', minWidth: '190px',
  },
  fieldInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent', color: '#0f172a', minWidth: 0 },
  historyBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 18px', height: '48px',
    border: '1px solid #93c5fd', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb',
    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
  },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc' },
  th: { textAlign: 'left', padding: '13px 14px', fontSize: '13px', fontWeight: 600, color: '#334155' },
  row: { borderTop: '1px solid #eef2f7' },
  td: { padding: '14px', verticalAlign: 'middle', color: '#0f172a' },

  personCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '15px', flexShrink: 0,
  },
  personName: { fontWeight: 600, fontSize: '15px' },
  youBadge: { padding: '2px 10px', borderRadius: '6px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 500 },
  roleBadge: { padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 },
  roleSelect: { padding: '7px 10px', borderRadius: '8px', border: '1px solid #dbe1ea', fontSize: '13px', backgroundColor: '#fff' },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px',
    borderRadius: '999px', fontSize: '13px', fontWeight: 500,
  },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  subtle: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },

  actionCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: '1px solid #dbe1ea',
    borderRadius: '8px', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px', cursor: 'pointer',
  },
  kebab: {
    width: '38px', height: '38px', border: '1px solid #dbe1ea', borderRadius: '8px', backgroundColor: '#fff',
    color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: '42px', right: 0, zIndex: 41, minWidth: '170px', backgroundColor: '#fff',
    border: '1px solid #e8ecf3', borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '4px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px', border: 'none',
    backgroundColor: 'transparent', borderRadius: '6px', fontSize: '13px', color: '#0f172a',
    cursor: 'pointer', textAlign: 'left',
  },

  footerNote: {
    display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', paddingTop: '16px',
    borderTop: '1px solid #eef2f7', color: '#64748b', fontSize: '13px',
  },

  muted: { color: '#64748b', fontSize: '13px', margin: '8px 0' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },
  hint: { fontSize: '12px', color: '#64748b', margin: '0 0 14px' },

  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: { backgroundColor: '#fff', borderRadius: '14px', padding: '22px', width: '420px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  modalTitle: { margin: 0, fontSize: '18px' },
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

export default ManageStaff;