import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Wallet, Clock, FileText, Search, Calendar, Filter, History, Pencil,
  MoreHorizontal, Plus, X, Trash2, Lock, CheckCircle2, Undo2, UserCheck, UserX,
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

const hasPos = (p) => p.role !== 'staff' || !!p.posAccess; // can sign in
const isPayrollOnly = (p) => p.role === 'staff' && !p.posAccess;

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

const AccessBadge = ({ person }) => {
  let cfg = { label: 'No system access', bg: '#f1f5f9', fg: '#64748b' };
  if (person.role !== 'staff') cfg = { label: 'Full access', bg: '#dbeafe', fg: '#1d4ed8' };
  else if (person.posAccess) cfg = { label: 'POS access', bg: '#dcfce7', fg: '#15803d' };
  return <span style={{ ...styles.accessBadge, backgroundColor: cfg.bg, color: cfg.fg }}>{cfg.label}</span>;
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

const NameCell = ({ person, self, showAccessHint }) => {
  const sub = [person.jobTitle, showAccessHint && isPayrollOnly(person) ? 'No system access' : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div style={styles.personCell}>
      <Avatar person={person} />
      <div>
        <div style={styles.nameLine}>
          <span style={styles.personName}>{person.name}</span>
          {self && <span style={styles.youBadge}>You</span>}
        </div>
        {sub && <div style={styles.subtle}>{sub}</div>}
      </div>
    </div>
  );
};

/* ---------------- modals ---------------- */
const AddStaffModal = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '', jobTitle: '', role: 'staff', posAccess: false,
    email: '', password: '', monthlySalary: '', payDay: '25',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const isStaff = form.role === 'staff';
  const needsLogin = !isStaff || form.posAccess;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Enter a name');
    if (needsLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address');
      if (form.password.length < 8) return setError('Password must be at least 8 characters');
    }

    setSaving(true);
    try {
      await axios.post('/api/users', {
        name: form.name,
        jobTitle: form.jobTitle,
        role: form.role,
        posAccess: needsLogin,
        monthlySalary: form.monthlySalary,
        payDay: form.payDay,
        ...(needsLogin ? { email: form.email, password: form.password } : {}),
      });
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

        <label style={styles.label}>Job title (optional)</label>
        <input value={form.jobTitle} onChange={set('jobTitle')} style={styles.input} maxLength={100} placeholder="e.g. Cashier, Stock handler, Driver" />

        <label style={styles.label}>Role</label>
        <select value={form.role} onChange={set('role')} style={styles.input}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

        {isStaff ? (
          <>
            <label style={styles.label}>System access</label>
            <div style={styles.radioRow}>
              <div
                style={{ ...styles.radioCard, ...(!form.posAccess ? styles.radioActive : {}) }}
                onClick={() => setForm({ ...form, posAccess: false })}
              >
                <strong style={{ fontSize: '13px' }}>No system access</strong>
                <span style={styles.radioText}>Payroll only. Works in the shop but doesn't sign in.</span>
              </div>
              <div
                style={{ ...styles.radioCard, ...(form.posAccess ? styles.radioActive : {}) }}
                onClick={() => setForm({ ...form, posAccess: true })}
              >
                <strong style={{ fontSize: '13px' }}>POS access</strong>
                <span style={styles.radioText}>Can sign in and use the POS.</span>
              </div>
            </div>
          </>
        ) : (
          <p style={styles.hint}>Admins and managers always sign in, so they need login details.</p>
        )}

        {needsLogin && (
          <>
            <label style={styles.label}>Email *</label>
            <input type="email" value={form.email} onChange={set('email')} style={styles.input} maxLength={100} />

            <label style={styles.label}>Temporary password * (min 8 characters)</label>
            <input type="password" value={form.password} onChange={set('password')} style={styles.input} maxLength={72} />
          </>
        )}

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

const GrantAccessModal = ({ person, onClose, onSaved }) => {
  const needsEmail = !person.email;
  const needsPassword = !person.hasLogin;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address');
    if (needsPassword && password.length < 8) return setError('Password must be at least 8 characters');

    setSaving(true);
    try {
      await axios.put(`/api/users/${person.id}/access`, {
        posAccess: true,
        ...(needsEmail ? { email } : {}),
        ...(needsPassword ? { password } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to give access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Give POS access: {person.name}</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        {error && <p style={styles.errorText}>{error}</p>}

        <p style={styles.hint}>
          {person.name} will be able to sign in and use the POS. They stay on payroll.
          {!needsEmail && !needsPassword && ' Their existing login details will be used.'}
        </p>

        {needsEmail && (
          <>
            <label style={styles.label}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} maxLength={100} autoFocus />
          </>
        )}
        {needsPassword && (
          <>
            <label style={styles.label}>Temporary password * (min 8 characters)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} maxLength={72} />
          </>
        )}

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Give POS access'}
        </button>
      </form>
    </div>
  );
};

const EditSalaryModal = ({ person, onClose, onSaved }) => {
  const [salary, setSalary] = useState(String(parseFloat(person.monthlySalary) || 0));
  const [payDay, setPayDay] = useState(String(person.payDay || 25));
  const [jobTitle, setJobTitle] = useState(person.jobTitle || '');
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
      await axios.put(`/api/users/${person.id}/salary`, { monthlySalary: salary, payDay: d, jobTitle });
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

        <label style={styles.label}>Job title</label>
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={styles.input} maxLength={100} placeholder="e.g. Cashier" />

        <label style={styles.label}>Monthly salary (LKR)</label>
        <input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} style={styles.input} autoFocus />

        <label style={styles.label}>Pay day (1–28)</label>
        <input type="number" min="1" max="28" value={payDay} onChange={(e) => setPayDay(e.target.value)} style={styles.input} />

        <p style={styles.hint}>
          The new salary applies to months that aren't paid yet. Months already marked as paid keep
          the amount that was recorded.
        </p>

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
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
  const [grantFor, setGrantFor] = useState(null);
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

  const posCount = users.filter((u) => u.role === 'staff' && u.posAccess).length;
  const payrollOnlyCount = users.filter(isPayrollOnly).length;

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    setActionError('');
    try {
      if (c.type === 'role') await axios.put(`/api/users/${c.person.id}/role`, { role: c.newRole });
      if (c.type === 'remove') await axios.delete(`/api/users/${c.person.id}`);
      if (c.type === 'pay') await axios.post(`/api/users/${c.person.id}/payments`, { month });
      if (c.type === 'undo') await axios.delete(`/api/users/payments/${c.person.payment.id}`);
      if (c.type === 'revoke') await axios.put(`/api/users/${c.person.id}/access`, { posAccess: false });
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
    if (type === 'revoke') {
      return {
        title: 'Remove POS access',
        message: `${person.name} will no longer be able to sign in or use the POS, and anyone signed in is blocked straight away. They stay on payroll.`,
        label: 'Remove access',
        danger: true,
      };
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

  // access actions shared by both tabs
  const accessItems = (p) => {
    const self = isSelf(p.id);
    const staff = p.role === 'staff';
    return [
      { label: 'Give POS access', icon: UserCheck, hidden: self || !staff || p.posAccess, onClick: () => setGrantFor(p) },
      { label: 'Remove POS access', icon: UserX, danger: true, hidden: self || !staff || !p.posAccess, onClick: () => setConfirm({ type: 'revoke', person: p }) },
    ];
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
            <>
              <p style={styles.summaryLine}>
                {posCount} staff can use the POS · {payrollOnlyCount} payroll-only (no system access)
              </p>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>Staff member</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Access</th>
                    <th style={styles.th}>Joined</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const self = isSelf(u.id);
                    return (
                      <tr key={u.id} style={styles.row}>
                        <td style={styles.td}><NameCell person={u} self={self} /></td>
                        <td style={styles.td}>{u.email || <span style={styles.dash}>-</span>}</td>
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
                        <td style={styles.td}><AccessBadge person={u} /></td>
                        <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <div style={styles.actionCell}>
                            <button style={styles.editBtn} onClick={() => setSalaryFor(u)}>
                              <Pencil size={15} /> Edit salary
                            </button>
                            <KebabMenu
                              items={[
                                ...accessItems(u),
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
            </>
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
                          <td style={styles.td}><NameCell person={r} self={self} showAccessHint /></td>
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
                                  ...accessItems(r),
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
      {grantFor && <GrantAccessModal person={grantFor} onClose={() => setGrantFor(null)} onSaved={refresh} />}
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
  summaryLine: { fontSize: '13px', color: '#64748b', margin: '0 0 12px' },

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
  dash: { color: '#94a3b8' },

  personCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  nameLine: { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar: {
    width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: '15px', flexShrink: 0,
  },
  personName: { fontWeight: 600, fontSize: '15px' },
  youBadge: { padding: '2px 10px', borderRadius: '6px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 500 },
  roleBadge: { padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500 },
  accessBadge: { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' },
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
    position: 'absolute', top: '42px', right: 0, zIndex: 41, minWidth: '190px', backgroundColor: '#fff',
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
  modal: { backgroundColor: '#fff', borderRadius: '14px', padding: '22px', width: '440px', maxHeight: '90vh', overflowY: 'auto' },
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
  radioRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  radioCard: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px',
    border: '1px solid #dbe1ea', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff',
  },
  radioActive: { border: '2px solid #2563eb', backgroundColor: '#f5f8ff' },
  radioText: { fontSize: '11px', color: '#64748b' },
  submitBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
  },
};

export default ManageStaff;