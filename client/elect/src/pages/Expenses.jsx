import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, Calendar, Tag, CreditCard, FileText, ArrowUpDown, MoreVertical,
  CalendarDays, CalendarCheck, CalendarRange, BarChart3, X, Pencil, Trash2, Download,
  ChevronLeft, ChevronRight, Paperclip,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';
import { lkr } from '../utils/format';

// Keep these in sync with the backend
const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Transport', 'Salary', 'Other'];
const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));

const CAT_COLORS = {
  Rent: '#2563eb', Utilities: '#38bdf8', Supplies: '#22c55e',
  Transport: '#f59e0b', Salary: '#8b5cf6', Other: '#94a3b8',
};
const CAT_CHIP = {
  Rent: { bg: '#dbeafe', fg: '#1d4ed8' },
  Utilities: { bg: '#e0f2fe', fg: '#0369a1' },
  Supplies: { bg: '#dcfce7', fg: '#15803d' },
  Transport: { bg: '#ffedd5', fg: '#c2410c' },
  Salary: { bg: '#ede9fe', fg: '#6d28d9' },
  Other: { bg: '#f1f5f9', fg: '#475569' },
};
const METHOD_CHIP = {
  cash: { bg: '#dcfce7', fg: '#15803d' },
  card: { bg: '#ede9fe', fg: '#6d28d9' },
  bank_transfer: { bg: '#f1f5f9', fg: '#334155' },
  other: { bg: '#f1f5f9', fg: '#475569' },
};

const PRESETS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom range' },
];

const ymd = (d) => d.toLocaleDateString('en-CA');
const todayStr = () => ymd(new Date());
const showDate = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const showDateTime = (d) => new Date(d).toLocaleString();
const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const presetRange = (key) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (key === 'this_month') return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
  if (key === 'last_month') return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
  if (key === 'this_year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: '', to: '' };
};

const pageWindow = (current, total) => {
  const size = 5;
  let end = Math.min(total, Math.max(1, current - 2) + size - 1);
  const start = Math.max(1, end - size + 1);
  end = Math.min(total, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const Chip = ({ children, colors }) => (
  <span style={{ ...styles.chip, backgroundColor: colors.bg, color: colors.fg }}>{children}</span>
);

/* ---------------- Receipt viewer ---------------- */
const ReceiptViewer = ({ expense, onClose }) => {
  const [url, setUrl] = useState(null);
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    axios
      .get(`/api/expenses/${expense.id}/receipt`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setType(res.data.type || '');
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setError('Could not load the receipt'); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expense.id]);

  const ext = type === 'application/pdf' ? 'pdf' : (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');

  return (
    <div style={styles.overlayTop} onClick={onClose}>
      <div style={{ ...styles.modal, width: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Receipt: {expense.title}</h3>
          <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {error ? (
          <p style={styles.errorText}>{error}</p>
        ) : !url ? (
          <p style={styles.muted}>Loading...</p>
        ) : (
          <>
            {type === 'application/pdf' ? (
              <iframe src={url} title="Receipt" style={{ width: '100%', height: '65vh', border: '1px solid #e8ecf3', borderRadius: '8px' }} />
            ) : (
              <img src={url} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block', margin: '0 auto', borderRadius: '8px' }} />
            )}
            <a href={url} download={`receipt-${expense.id}.${ext}`} style={styles.downloadLink}>
              <Download size={15} /> Download
            </a>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------------- Add / Edit modal ---------------- */
const ExpenseFormModal = ({ expense, onClose, onSaved }) => {
  const editing = !!expense;
  const [form, setForm] = useState({
    expenseDate: expense?.expenseDate || todayStr(),
    title: expense?.title || '',
    category: expense?.category || 'Supplies',
    paidTo: expense?.paidTo || '',
    paymentMethod: expense?.paymentMethod || 'cash',
    amount: expense ? String(parseFloat(expense.amount)) : '',
    note: expense?.note || '',
  });
  const [file, setFile] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) {
      setError('Receipt must be a JPG, PNG, WEBP or PDF file');
      e.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Receipt must be 5 MB or smaller');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
    setRemoveReceipt(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Enter a description');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter an amount greater than 0');
    if (form.expenseDate > todayStr()) return setError("The date can't be in the future");

    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    if (file) body.append('receipt', file);
    if (removeReceipt) body.append('removeReceipt', 'true');

    setSaving(true);
    try {
      if (editing) await axios.put(`/api/expenses/${expense.id}`, body);
      else await axios.post('/api/expenses', body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form style={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{editing ? 'Edit expense' : 'Add expense'}</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        {error && <p style={styles.errorText}>{error}</p>}

        <label style={styles.label}>Description *</label>
        <input value={form.title} onChange={set('title')} style={styles.input} maxLength={200} autoFocus placeholder="e.g. Electricity bill" />

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Amount (LKR) *</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} style={styles.input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Date *</label>
            <input type="date" max={todayStr()} value={form.expenseDate} onChange={set('expenseDate')} style={styles.input} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Category *</label>
            <select value={form.category} onChange={set('category')} style={styles.input}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Payment method</label>
            <select value={form.paymentMethod} onChange={set('paymentMethod')} style={styles.input}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <label style={styles.label}>Paid to</label>
        <input value={form.paidTo} onChange={set('paidTo')} style={styles.input} maxLength={150} placeholder="Supplier or company" />

        <label style={styles.label}>Notes</label>
        <textarea value={form.note} onChange={set('note')} style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }} rows={2} maxLength={255} />

        <label style={styles.label}>Receipt (JPG, PNG, WEBP or PDF, up to 5 MB)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickFile} style={styles.fileInput} />
        {editing && expense.hasReceipt && !file && (
          <label style={styles.checkRow}>
            <input type="checkbox" checked={removeReceipt} onChange={(e) => setRemoveReceipt(e.target.checked)} />
            Remove the current receipt
          </label>
        )}
        {file && <p style={styles.hint}>New file: {file.name}. {editing && expense.hasReceipt ? 'It replaces the current receipt.' : ''}</p>}

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Add expense'}
        </button>
      </form>
    </div>
  );
};

/* ---------------- Details drawer ---------------- */
const ExpenseDrawer = ({ id, version, isAdmin, onClose, onEdit, onDelete, onReceipt }) => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const latest = useRef(0);

  useEffect(() => { setInfo(null); }, [id]);

  useEffect(() => {
    const req = ++latest.current;
    axios
      .get(`/api/expenses/${id}`)
      .then(({ data }) => { if (req === latest.current) { setInfo(data); setError(''); } })
      .catch((err) => { if (req === latest.current) setError(err.response?.data?.message || 'Failed to load expense'); });
  }, [id, version]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const e = info?.expense;

  return (
    <>
      <div style={styles.drawerBackdrop} onClick={onClose} />
      <aside style={styles.drawer} role="dialog" aria-label="Expense details">
        <div style={styles.drawerHeader}>
          <h3 style={styles.drawerTitle}>Expense details</h3>
          <button style={styles.plainClose} onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {error ? (
          <p style={styles.errorText}>{error}</p>
        ) : !info ? (
          <p style={styles.muted}>Loading...</p>
        ) : (
          <>
            <div style={styles.amountBig}>{lkr(e.amount)}</div>
            <div style={styles.drawerSub}>{e.title}</div>

            <div style={styles.section}>
              <div style={styles.infoRow}><span>Date</span><strong>{showDate(e.expenseDate)}</strong></div>
              <div style={styles.infoRow}><span>Category</span><Chip colors={CAT_CHIP[e.category] || CAT_CHIP.Other}>{e.category}</Chip></div>
              <div style={styles.infoRow}><span>Paid to</span><strong>{e.paidTo || '-'}</strong></div>
              <div style={styles.infoRow}>
                <span>Payment method</span>
                <Chip colors={METHOD_CHIP[e.paymentMethod] || METHOD_CHIP.other}>{METHOD_LABEL[e.paymentMethod] || e.paymentMethod}</Chip>
              </div>
              {e.note && (
                <div style={{ ...styles.infoRow, display: 'block' }}>
                  <div style={{ marginBottom: '4px' }}>Notes</div>
                  <div style={styles.noteBox}>{e.note}</div>
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Receipt</h4>
              {e.hasReceipt ? (
                <button style={styles.receiptBtn} onClick={() => onReceipt(e)}>
                  <Paperclip size={15} /> View receipt
                </button>
              ) : (
                <p style={styles.muted}>No receipt attached.</p>
              )}
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Record</h4>
              <div style={styles.infoRow}>
                <span>Added by</span>
                <strong>{e.createdBy?.name || '-'}</strong>
              </div>
              <div style={styles.small}>{showDateTime(e.createdAt)}</div>
              {e.updatedAt && e.updatedById && e.updatedById !== e.createdById && (
                <div style={{ ...styles.infoRow, marginTop: '8px' }}>
                  <span>Last edited by</span>
                  <strong>{e.updatedBy?.name || '-'}</strong>
                </div>
              )}

              {info.logs.length > 0 && (
                <>
                  <div style={styles.historyTitle}>History</div>
                  {info.logs.map((l) => (
                    <div key={l.id} style={styles.logRow}>
                      <div style={{ fontWeight: 600 }}>
                        {l.action === 'created' ? 'Added' : l.action === 'updated' ? 'Edited' : 'Deleted'} by {l.actor?.name || 'unknown'}
                      </div>
                      <div style={styles.small}>{showDateTime(l.createdAt)}</div>
                      {l.action === 'updated' && l.summary && <div style={styles.logSummary}>{l.summary}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={styles.drawerActions}>
              <button style={styles.editBtnWide} onClick={() => onEdit(e)}><Pencil size={15} /> Edit</button>
              {isAdmin && (
                <button style={styles.deleteBtnWide} onClick={() => onDelete(e)}><Trash2 size={15} /> Delete</button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
};

/* ---------------- Page ---------------- */
const Expenses = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0, pages: 1, filteredTotal: '0' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState('this_month');
  const [from, setFrom] = useState(() => presetRange('this_month').from);
  const [to, setTo] = useState(() => presetRange('this_month').to);
  const [category, setCategory] = useState('all');
  const [method, setMethod] = useState('all');
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState(null);
  const [version, setVersion] = useState(0);
  const [formFor, setFormFor] = useState(null); // { expense } (null expense = add)
  const [confirm, setConfirm] = useState(null);
  const [receiptFor, setReceiptFor] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const { data: res } = await axios.get('/api/expenses', {
        params: { search, from, to, category, method, sort, page },
      });
      if (id !== reqId.current) return;
      setData(res);
      setLoadError('');
      if (res.rows.length === 0 && res.total > 0 && page > res.pages) setPage(res.pages);
    } catch (err) {
      if (id === reqId.current) setLoadError(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [search, from, to, category, method, sort, page]);

  const fetchSummary = useCallback(async () => {
    try {
      const { data: res } = await axios.get('/api/expenses/summary');
      setSummary(res);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const refreshAll = () => {
    fetchList();
    fetchSummary();
    setVersion((v) => v + 1);
  };

  const changePreset = (key) => {
    setPreset(key);
    if (key !== 'custom') {
      const r = presetRange(key);
      setFrom(r.from);
      setTo(r.to);
    }
    setPage(1);
  };

  const onFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const toggleSort = (key) => {
    setSort(sort === `${key}_desc` ? `${key}_asc` : `${key}_desc`);
    setPage(1);
  };

  const doDelete = async () => {
    const ex = confirm;
    setConfirm(null);
    setActionError('');
    try {
      await axios.delete(`/api/expenses/${ex.id}`);
      if (openId === ex.id) setOpenId(null);
      refreshAll();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const chartData = useMemo(
    () => (summary ? summary.chart.map((r) => ({ ...r, label: monthLabel(r.month) })) : []),
    [summary]
  );
  const chartHasData = chartData.some((r) => CATEGORIES.some((c) => r[c] > 0));

  const start = data.total === 0 ? 0 : (page - 1) * 10 + 1;
  const end = (page - 1) * 10 + data.rows.length;
  const sortActive = (key) => sort.startsWith(key);

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Expenses</h1>
          <p style={styles.pageSub}>Track shop costs and review spending</p>
        </div>
        <button style={styles.addBtn} onClick={() => setFormFor({ expense: null })}>
          <Plus size={18} /> Add expense
        </button>
      </div>

      {/* Summary cards */}
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe' }}><CalendarDays size={26} color="#2563eb" /></div>
          <div><div style={styles.statLabel}>This month</div><div style={styles.statNum}>{summary ? lkr(summary.month) : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}><CalendarCheck size={26} color="#16a34a" /></div>
          <div><div style={styles.statLabel}>Today</div><div style={styles.statNum}>{summary ? lkr(summary.today) : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ede9fe' }}><CalendarRange size={26} color="#7c3aed" /></div>
          <div><div style={styles.statLabel}>This year</div><div style={styles.statNum}>{summary ? lkr(summary.year) : '-'}</div></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}><BarChart3 size={26} color="#d97706" /></div>
          <div>
            <div style={styles.statLabel}>Largest category · this month</div>
            {summary?.largest ? (
              <>
                <div style={styles.statCat}>{summary.largest.category}</div>
                <div style={styles.statNum}>{lkr(summary.largest.amount)}</div>
              </>
            ) : (
              <div style={styles.statNum}>{summary ? 'None yet' : '-'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Monthly expenses by category</h3>
        {!summary ? (
          <p style={styles.muted}>Loading...</p>
        ) : !chartHasData ? (
          <p style={styles.muted}>No expenses recorded in the last 6 months.</p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString('en-US')} width={70} />
                <Tooltip formatter={(v, name) => [lkr(v), name]} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 8 }} />
                {CATEGORIES.map((c) => (
                  <Bar key={c} dataKey={c} fill={CAT_COLORS[c]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={styles.filterCard}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input
            placeholder="Search by description or supplier..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.fieldBox}>
          <Calendar size={18} color="#475569" />
          <select value={preset} onChange={(e) => changePreset(e.target.value)} style={styles.fieldSelect}>
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>

        {preset === 'custom' && (
          <>
            <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={styles.dateInput} aria-label="From date" />
            <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={styles.dateInput} aria-label="To date" />
          </>
        )}

        <div style={styles.fieldBox}>
          <Tag size={18} color="#475569" />
          <select value={category} onChange={onFilter(setCategory)} style={styles.fieldSelect}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={styles.fieldBox}>
          <CreditCard size={18} color="#475569" />
          <select value={method} onChange={onFilter(setMethod)} style={styles.fieldSelect}>
            <option value="all">All payment methods</option>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {actionError && <p style={styles.errorText}>{actionError}</p>}

      {/* Table */}
      <div style={styles.card}>
        {loadError && <p style={styles.errorText}>{loadError}</p>}

        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>
                <button style={styles.sortBtn} onClick={() => toggleSort('date')}>
                  Date <ArrowUpDown size={14} color={sortActive('date') ? '#2563eb' : '#94a3b8'} />
                </button>
              </th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Paid to</th>
              <th style={styles.th}>Payment method</th>
              <th style={styles.th}>
                <button style={styles.sortBtn} onClick={() => toggleSort('amount')}>
                  Amount <ArrowUpDown size={14} color={sortActive('amount') ? '#2563eb' : '#94a3b8'} />
                </button>
              </th>
              <th style={styles.th}>Receipt</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={styles.emptyCell}>Loading...</td></tr>
            ) : data.rows.length === 0 ? (
              <tr><td colSpan={8} style={styles.emptyCell}>No expenses match these filters.</td></tr>
            ) : (
              data.rows.map((ex) => {
                const menuItems = [
                  ex.hasReceipt && { label: 'View receipt', icon: FileText, onClick: () => setReceiptFor(ex) },
                  isAdmin && { label: 'Delete', icon: Trash2, danger: true, onClick: () => setConfirm(ex) },
                ].filter(Boolean);
                return (
                  <tr key={ex.id} style={styles.row}>
                    <td style={styles.td}>{showDate(ex.expenseDate)}</td>
                    <td style={styles.td}>{ex.title}</td>
                    <td style={styles.td}><Chip colors={CAT_CHIP[ex.category] || CAT_CHIP.Other}>{ex.category}</Chip></td>
                    <td style={styles.td}>{ex.paidTo || <span style={styles.dash}>-</span>}</td>
                    <td style={styles.td}><Chip colors={METHOD_CHIP[ex.paymentMethod] || METHOD_CHIP.other}>{METHOD_LABEL[ex.paymentMethod] || ex.paymentMethod}</Chip></td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{lkr(ex.amount)}</td>
                    <td style={styles.td}>
                      {ex.hasReceipt ? (
                        <button style={styles.receiptIcon} onClick={() => setReceiptFor(ex)} title="View receipt">
                          <FileText size={22} />
                        </button>
                      ) : (
                        <span style={styles.dash}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button style={styles.viewBtn} onClick={() => setOpenId(ex.id)}>View</button>
                        <button style={styles.editBtn} onClick={() => setFormFor({ expense: ex })}>Edit</button>
                        {menuItems.length > 0 && (
                          <div style={{ position: 'relative' }}>
                            <button style={styles.kebab} onClick={() => setMenuId(menuId === ex.id ? null : ex.id)} aria-label="More actions">
                              <MoreVertical size={16} />
                            </button>
                            {menuId === ex.id && (
                              <>
                                <div style={styles.menuBackdrop} onClick={() => setMenuId(null)} />
                                <div style={styles.menu}>
                                  {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                      <button
                                        key={item.label}
                                        style={{ ...styles.menuItem, ...(item.danger ? { color: '#dc2626' } : {}) }}
                                        onClick={() => { setMenuId(null); item.onClick(); }}
                                      >
                                        <Icon size={14} /> {item.label}
                                      </button>
                                    );
                                  })}
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

        {!loading && !loadError && (
          <div style={styles.pagination}>
            <div>
              <span style={styles.showing}>
                {data.total === 0 ? 'No expenses' : `Showing ${start} to ${end} of ${data.total} expenses`}
              </span>
              {data.total > 0 && (
                <span style={styles.filteredTotal}>Total for these filters: <strong>{lkr(data.filteredTotal)}</strong></span>
              )}
            </div>
            <div style={styles.pageControls}>
              <button style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }} onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </button>
              {pageWindow(page, data.pages).map((n) => (
                <button key={n} style={{ ...styles.pageBtn, ...(n === page ? styles.pageBtnActive : {}) }} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button style={{ ...styles.pageBtn, ...(page >= data.pages ? styles.pageBtnDisabled : {}) }} onClick={() => setPage(page + 1)} disabled={page >= data.pages}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {openId && (
        <ExpenseDrawer
          id={openId}
          version={version}
          isAdmin={isAdmin}
          onClose={() => setOpenId(null)}
          onEdit={(ex) => setFormFor({ expense: ex })}
          onDelete={(ex) => setConfirm(ex)}
          onReceipt={(ex) => setReceiptFor(ex)}
        />
      )}

      {formFor && (
        <ExpenseFormModal expense={formFor.expense} onClose={() => setFormFor(null)} onSaved={refreshAll} />
      )}

      {receiptFor && <ReceiptViewer expense={receiptFor} onClose={() => setReceiptFor(null)} />}

      {confirm && (
        <ConfirmModal
          title="Delete expense"
          message={`Delete "${confirm.title}" (${lkr(confirm.amount)})? Its receipt is removed too. This cannot be undone, but a record of who deleted it is kept.`}
          confirmLabel="Delete"
          danger
          onConfirm={doDelete}
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
  statIcon: { width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: '13px', color: '#64748b' },
  statNum: { fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 },
  statCat: { fontSize: '17px', fontWeight: 800, color: '#0f172a' },

  card: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '18px', marginBottom: '16px' },
  cardTitle: { margin: '0 0 12px', fontSize: '17px', fontWeight: 700, color: '#0f172a' },

  filterCard: {
    display: 'flex', gap: '12px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '14px', marginBottom: '16px', flexWrap: 'wrap',
  },
  searchBox: {
    flex: 2, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '10px',
    border: '1px solid #dbe1ea', borderRadius: '10px', padding: '0 14px', height: '46px',
  },
  searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent' },
  fieldBox: {
    flex: 1, minWidth: '170px', display: 'flex', alignItems: 'center', gap: '10px',
    border: '1px solid #dbe1ea', borderRadius: '10px', padding: '0 12px', height: '46px', backgroundColor: '#fff',
  },
  fieldSelect: { border: 'none', outline: 'none', flex: 1, fontSize: '14px', backgroundColor: 'transparent', color: '#0f172a', minWidth: 0 },
  dateInput: { height: '46px', padding: '0 10px', border: '1px solid #dbe1ea', borderRadius: '10px', fontSize: '14px', backgroundColor: '#fff' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc' },
  th: { textAlign: 'left', padding: '12px 12px', fontSize: '13px', fontWeight: 600, color: '#334155' },
  sortBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
    padding: 0, font: 'inherit', fontWeight: 600, color: '#334155', cursor: 'pointer',
  },
  row: { borderTop: '1px solid #eef2f7' },
  td: { padding: '14px 12px', verticalAlign: 'middle', color: '#0f172a' },
  emptyCell: { padding: '36px', textAlign: 'center', color: '#64748b' },
  dash: { color: '#94a3b8' },
  chip: { display: 'inline-block', padding: '4px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' },
  receiptIcon: { background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, display: 'flex' },

  actionCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  viewBtn: { padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  editBtn: { padding: '8px 16px', border: '1px solid #dbe1ea', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#334155', fontSize: '13px', cursor: 'pointer' },
  kebab: {
    width: '36px', height: '36px', border: '1px solid #dbe1ea', borderRadius: '8px', backgroundColor: '#fff',
    color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menuBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: '40px', right: 0, zIndex: 41, minWidth: '160px', backgroundColor: '#fff',
    border: '1px solid #e8ecf3', borderRadius: '10px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '4px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px', border: 'none',
    backgroundColor: 'transparent', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', textAlign: 'left',
  },

  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' },
  showing: { fontSize: '14px', color: '#64748b', marginRight: '18px' },
  filteredTotal: { fontSize: '14px', color: '#334155' },
  pageControls: { display: 'flex', gap: '8px' },
  pageBtn: {
    minWidth: '38px', height: '38px', padding: '0 10px', border: '1px solid #dbe1ea', borderRadius: '8px',
    backgroundColor: '#fff', color: '#0f172a', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActive: { backgroundColor: '#2563eb', border: '1px solid #2563eb', color: '#fff' },
  pageBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },

  drawerBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.28)', zIndex: 140 },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px', maxWidth: '100vw', backgroundColor: '#f8fafc',
    boxShadow: '-8px 0 30px rgba(15,23,42,0.15)', zIndex: 150, overflowY: 'auto', padding: '22px', boxSizing: 'border-box',
  },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  drawerTitle: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  plainClose: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#334155', display: 'flex' },
  amountBig: { fontSize: '30px', fontWeight: 800, color: '#0f172a' },
  drawerSub: { fontSize: '15px', color: '#475569', margin: '2px 0 16px' },
  section: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '12px', padding: '16px', marginBottom: '14px' },
  sectionTitle: { margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#0f172a' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', fontSize: '14px', color: '#334155' },
  noteBox: { backgroundColor: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#0f172a', whiteSpace: 'pre-wrap' },
  receiptBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', border: '1px solid #93c5fd',
    borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  historyTitle: { fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px', paddingTop: '10px', borderTop: '1px solid #eef2f7' },
  logRow: { padding: '6px 0', fontSize: '13px', color: '#0f172a' },
  logSummary: { fontSize: '12px', color: '#475569', marginTop: '2px', wordBreak: 'break-word' },
  small: { fontSize: '12px', color: '#64748b' },
  drawerActions: { display: 'flex', gap: '10px' },
  editBtnWide: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px',
    border: '1px solid #93c5fd', borderRadius: '8px', backgroundColor: '#fff', color: '#2563eb', fontWeight: 600, cursor: 'pointer',
  },
  deleteBtnWide: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px',
    border: '1px solid #dc2626', borderRadius: '8px', backgroundColor: '#fff', color: '#dc2626', fontWeight: 600, cursor: 'pointer',
  },

  muted: { color: '#64748b', fontSize: '13px', margin: '8px 0' },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },
  hint: { fontSize: '12px', color: '#64748b', margin: '4px 0 10px' },

  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  overlayTop: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 260,
  },
  modal: { backgroundColor: '#fff', borderRadius: '14px', padding: '22px', width: '470px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  modalTitle: { margin: 0, fontSize: '18px' },
  closeBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label: { display: 'block', fontSize: '12px', color: '#475569', margin: '4px 0 5px' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dbe1ea',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px', backgroundColor: '#fff',
  },
  fileInput: { width: '100%', fontSize: '13px', marginBottom: '8px' },
  checkRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', marginBottom: '10px' },
  downloadLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '13px',
    color: '#2563eb', textDecoration: 'none', fontWeight: 600,
  },
  submitBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '4px',
  },
};

export default Expenses;