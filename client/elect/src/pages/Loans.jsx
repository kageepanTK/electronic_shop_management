import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, CheckCircle2, Coins, X, User as UserIcon, CalendarDays,
  CheckCircle, XCircle, ExternalLink, Info,
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';
import LoanStatusBadge from '../components/LoanStatusBadge';
import { customerCode, money } from '../utils/format';

const TABS = [
  { key: 'PENDING', label: 'Pending approval', statuses: 'PENDING' },
  { key: 'APPROVED', label: 'Approved', statuses: 'APPROVED' },
  { key: 'ACTIVE', label: 'Active', statuses: 'ACTIVE,OVERDUE' },
  { key: 'PAID', label: 'Paid', statuses: 'PAID' },
  { key: 'REJECTED', label: 'Rejected', statuses: 'REJECTED' },
];

const dateText = (d) => new Date(d).toLocaleDateString();
const timeText = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ---------------- Review drawer ---------------- */
const ReviewDrawer = ({ loanId, canReview, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [confirm, setConfirm] = useState(null); // 'approve' | 'reject' | 'activate'
  const latest = useRef(loanId);

  const load = useCallback(async () => {
    latest.current = loanId;
    try {
      const { data } = await axios.get(`/api/loans/${loanId}`);
      if (latest.current === loanId) {
        setLoan(data);
        setError('');
      }
    } catch (err) {
      if (latest.current === loanId) setError(err.response?.data?.message || 'Failed to load loan');
    } finally {
      if (latest.current === loanId) setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    setLoading(true);
    setLoan(null);
    setReason('');
    setReasonError('');
    setError('');
    setConfirm(null);
    load();
  }, [loanId, load]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirm) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, onClose]);

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const approve = () => act(() => axios.put(`/api/loans/${loanId}/approve`));
  const reject = () => act(() => axios.put(`/api/loans/${loanId}/reject`, { reason: reason.trim() }));
  const activate = () => act(() => axios.post(`/api/loans/${loanId}/activate`));

  const askReject = () => {
    if (reason.trim().length < 3) {
      setReasonError('Enter a reason for rejection (at least 3 characters)');
      return;
    }
    setReasonError('');
    setConfirm('reject');
  };

  // credit-position boxes
  let boxes = [];
  if (loan) {
    const due = parseFloat(loan.Customer?.dueAmount) || 0;
    const loanAmt = parseFloat(loan.loanAmount) || 0;
    if (['PENDING', 'APPROVED'].includes(loan.status)) {
      boxes = [
        { label: 'Current outstanding', value: money(due) },
        { label: 'This loan', value: money(loanAmt) },
        { label: 'After checkout', value: money(due + loanAmt), strong: true },
      ];
    } else if (loan.status === 'REJECTED') {
      boxes = [
        { label: 'Customer outstanding', value: money(due) },
        { label: 'Loan requested', value: money(loanAmt) },
      ];
    } else {
      boxes = [
        { label: 'Customer outstanding', value: money(due) },
        { label: 'This loan balance', value: money(loan.outstandingBalance), strong: true },
      ];
    }
  }

  const perInstallment = loan ? (parseFloat(loan.loanAmount) || 0) / (loan.installmentCount || 1) : 0;

  return (
    <>
      <div style={styles.drawerBackdrop} onClick={onClose} />
      <aside style={styles.drawer} role="dialog" aria-label="Review loan application">
        <div style={styles.drawerHeader}>
          <h3 style={styles.drawerTitle}>
            {loan?.status === 'PENDING' ? 'Review loan application' : 'Loan application'}
          </h3>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : !loan ? (
          <p style={styles.errorText}>{error || 'Loan not found'}</p>
        ) : (
          <>
            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.small}>Request no.</div>
            <div style={styles.requestRow}>
              <span style={styles.requestNo}>#L{loan.id}</span>
              <LoanStatusBadge status={loan.status} />
            </div>

            <div style={styles.customerRow}>
              <div style={styles.customerIcon}><UserIcon size={20} color="#2563eb" /></div>
              <div>
                <div style={styles.smallBlue}>Customer details</div>
                <div style={styles.customerName}>{loan.Customer?.name}</div>
                <div style={styles.small}>
                  {customerCode(loan.customerId)} · {loan.Customer?.phone || 'No phone'}
                </div>
              </div>
            </div>

            <div style={styles.boxRow}>
              {boxes.map((b) => (
                <div key={b.label} style={styles.box}>
                  <div style={styles.boxLabel}>{b.label}</div>
                  <div style={{ ...styles.boxValue, ...(b.strong ? { color: '#15803d' } : {}) }}>{b.value}</div>
                </div>
              ))}
            </div>

            <h4 style={styles.sectionTitle}>Items requested</h4>
            <table style={styles.itemTable}>
              <thead>
                <tr style={styles.itemHead}>
                  <th style={styles.ith}>Product</th>
                  <th style={{ ...styles.ith, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...styles.ith, textAlign: 'right' }}>Unit price</th>
                  <th style={{ ...styles.ith, textAlign: 'right' }}>Line total</th>
                </tr>
              </thead>
              <tbody>
                {loan.items.map((i) => (
                  <tr key={i.id} style={styles.itemRow}>
                    <td style={styles.itd}>{i.Product?.name || 'Removed product'}</td>
                    <td style={{ ...styles.itd, textAlign: 'center' }}>{i.quantity}</td>
                    <td style={{ ...styles.itd, textAlign: 'right' }}>{money(i.unitPrice)}</td>
                    <td style={{ ...styles.itd, textAlign: 'right' }}>{money(i.subtotal)}</td>
                  </tr>
                ))}
                <tr style={styles.itemRow}>
                  <td colSpan={3} style={{ ...styles.itd, textAlign: 'right', fontWeight: 600 }}>Total</td>
                  <td style={{ ...styles.itd, textAlign: 'right', fontWeight: 700 }}>{money(loan.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div style={styles.termRow}>
              <CalendarDays size={20} color="#475569" />
              <div>
                <div style={styles.small}>Loan terms</div>
                <div style={styles.termText}>
                  {loan.installmentCount} monthly installments (≈ {money(perInstallment)} each)
                </div>
                <div style={styles.small}>
                  Down payment {money(loan.downPayment)} · Loan amount {money(loan.loanAmount)}
                </div>
              </div>
            </div>

            <div style={styles.metaRow}>
              <div>
                <div style={styles.small}>Requested by</div>
                <div style={styles.metaValue}>{loan.createdBy?.name || '-'}</div>
              </div>
              <div>
                <div style={styles.small}>Submitted on</div>
                <div style={styles.metaValue}>{dateText(loan.createdAt)} at {timeText(loan.createdAt)}</div>
              </div>
            </div>

            <div style={styles.divider} />
            <h4 style={styles.sectionTitle}>Decision</h4>

            {loan.status === 'PENDING' && (
              canReview ? (
                <>
                  <div style={styles.decisionRow}>
                    <button style={styles.approveBtn} onClick={() => setConfirm('approve')} disabled={busy}>
                      <CheckCircle size={17} /> Approve loan
                    </button>
                    <button style={styles.rejectBtn} onClick={askReject} disabled={busy}>
                      <XCircle size={17} /> Reject request
                    </button>
                  </div>
                  <label style={styles.reasonLabel}>Reason for rejection (required to reject)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
                    maxLength={255}
                    rows={3}
                    placeholder="Enter reason for rejection..."
                    style={styles.textarea}
                  />
                  {reasonError && <p style={styles.errorText}>{reasonError}</p>}
                </>
              ) : (
                <p style={styles.muted}>
                  This application must be approved by an admin or manager before it can be used.
                </p>
              )
            )}

            {loan.status === 'APPROVED' && (
              <>
                <p style={styles.muted}>
                  Approved{loan.reviewedBy?.name ? ` by ${loan.reviewedBy.name}` : ''}
                  {loan.reviewedAt ? ` on ${dateText(loan.reviewedAt)}` : ''}. Collect the down payment of{' '}
                  {money(loan.downPayment)}, then complete checkout.
                </p>
                <button style={styles.primaryBtn} onClick={() => setConfirm('activate')} disabled={busy}>
                  Activate &amp; checkout
                </button>
              </>
            )}

            {loan.status === 'REJECTED' && (
              <div style={styles.rejectedBox}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Rejected</div>
                <div>Reason: {loan.rejectionReason || 'No reason given'}</div>
                <div style={{ ...styles.small, marginTop: '4px' }}>
                  Reviewed by {loan.reviewedBy?.name || '-'}
                </div>
              </div>
            )}

            {['ACTIVE', 'OVERDUE', 'PAID'].includes(loan.status) && (
              <p style={styles.muted}>
                {loan.status === 'PAID'
                  ? 'This loan is fully paid.'
                  : `Outstanding balance ${money(loan.outstandingBalance)}. Open the loan to see the schedule and record repayments.`}
              </p>
            )}

            <button style={styles.linkBtn} onClick={() => navigate(`/loans/${loan.id}`)}>
              <ExternalLink size={15} /> Open full loan page
            </button>

            <div style={styles.infoBox}>
              <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>On approval:</strong> the application is cleared for checkout. Stock is deducted and
                the sale is created only when it is activated at checkout.
              </div>
            </div>
          </>
        )}
      </aside>

      {confirm === 'approve' && loan && (
        <ConfirmModal
          title="Approve loan"
          message={`Approve loan #L${loan.id} for ${loan.Customer?.name} (${money(loan.loanAmount)} over ${loan.installmentCount} months)?`}
          confirmLabel="Approve"
          onConfirm={approve}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reject' && loan && (
        <ConfirmModal
          title="Reject request"
          message={`Reject loan #L${loan.id} for ${loan.Customer?.name}? The customer will not be able to use it.`}
          confirmLabel="Reject"
          danger
          onConfirm={reject}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'activate' && loan && (
        <ConfirmModal
          title="Activate & checkout"
          message={`Collect the down payment of ${money(loan.downPayment)}, complete the sale and deduct stock?`}
          confirmLabel="Complete checkout"
          onConfirm={activate}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

/* ---------------- Page ---------------- */
const Loans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'manager';

  const [tab, setTab] = useState('PENDING');
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [openId, setOpenId] = useState(null);
  const tabRef = useRef(tab);

  const fetchLoans = useCallback(async (key) => {
    const t = TABS.find((x) => x.key === key);
    tabRef.current = key;
    try {
      const { data } = await axios.get('/api/loans', { params: { status: t.statuses } });
      if (tabRef.current === key) {
        setLoans(data);
        setListError('');
      }
    } catch (err) {
      if (tabRef.current === key) setListError(err.response?.data?.message || 'Failed to load loans');
    } finally {
      if (tabRef.current === key) setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/loans/summary');
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLoans(tab);
  }, [tab, fetchLoans]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const refreshAll = () => {
    fetchLoans(tab);
    fetchSummary();
  };

  const tabCount = (t) =>
    t.statuses.split(',').reduce((sum, st) => sum + (summary?.counts?.[st] || 0), 0);

  const currentTab = TABS.find((t) => t.key === tab);
  const showBalance = tab === 'ACTIVE' || tab === 'PAID';
  const colCount = showBalance ? 8 : 7;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Loans</h1>
          <p style={styles.pageSub}>Review loan applications before items are released.</p>
        </div>
        <button style={styles.addBtn} onClick={() => navigate('/loans/new')}>
          <Plus size={18} /> New loan application
        </button>
      </div>

      {/* Stat cards */}
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}><Clock size={26} color="#d97706" /></div>
          <div>
            <div style={styles.statLabel}>Awaiting approval</div>
            <div style={styles.statNum}>{summary ? summary.awaitingApproval : '-'}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#dcfce7' }}><CheckCircle2 size={26} color="#16a34a" /></div>
          <div>
            <div style={styles.statLabel}>Approved today</div>
            <div style={styles.statNum}>{summary ? summary.approvedToday : '-'}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ffedd5' }}><Coins size={26} color="#ea580c" /></div>
          <div>
            <div style={styles.statLabel}>Loan balance outstanding</div>
            <div style={styles.statNum}>{summary ? money(summary.outstanding) : '-'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabCard}>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {summary && tabCount(t) > 0 && (
              <span style={{ ...styles.tabCount, ...(tab === t.key ? styles.tabCountActive : {}) }}>
                {tabCount(t)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.tableTitle}>Loan requests: {currentTab.label}</h3>
        <p style={styles.tableNote}>
          <Info size={15} color="#2563eb" /> Items are not released and stock is not deducted until a loan is
          approved and checked out.
        </p>

        {listError && <p style={styles.errorText}>{listError}</p>}

        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Request / customer</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Total</th>
              {showBalance && <th style={styles.th}>Outstanding</th>}
              <th style={styles.th}>Requested by</th>
              <th style={styles.th}>Submitted</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} style={styles.emptyCell}>Loading...</td></tr>
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={styles.emptyCell}>
                  No loans in “{currentTab.label.toLowerCase()}”.
                </td>
              </tr>
            ) : (
              loans.map((l) => {
                const itemCount = l.items?.length || 0;
                return (
                  <tr
                    key={l.id}
                    style={{ ...styles.row, ...(openId === l.id ? styles.rowActive : {}) }}
                    onClick={() => setOpenId(l.id)}
                  >
                    <td style={styles.td}>
                      <div style={styles.reqNo}>#L{l.id}</div>
                      <div style={styles.reqCustomer}>
                        {l.Customer?.name} · {customerCode(l.customerId)}
                      </div>
                    </td>
                    <td style={styles.td}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{money(l.totalAmount)}</td>
                    {showBalance && <td style={styles.td}>{money(l.outstandingBalance)}</td>}
                    <td style={styles.td}>{l.createdBy?.name || '-'}</td>
                    <td style={styles.td}>
                      <div>{dateText(l.createdAt)}</div>
                      <div style={styles.reqCustomer}>{timeText(l.createdAt)}</div>
                    </td>
                    <td style={styles.td}><LoanStatusBadge status={l.status} /></td>
                    <td style={styles.td}>
                      <button
                        style={styles.reviewBtn}
                        onClick={(e) => { e.stopPropagation(); setOpenId(l.id); }}
                      >
                        {l.status === 'PENDING' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {openId && (
        <ReviewDrawer
          loanId={openId}
          canReview={canReview}
          onClose={() => setOpenId(null)}
          onChanged={refreshAll}
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
  statIcon: { width: '58px', height: '58px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: '14px', color: '#64748b' },
  statNum: { fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 },

  tabCard: {
    display: 'flex', gap: '4px', backgroundColor: '#fff', border: '1px solid #e8ecf3',
    borderRadius: '14px', padding: '0 12px', marginBottom: '16px', overflowX: 'auto',
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 18px', border: 'none',
    borderBottom: '3px solid transparent', backgroundColor: 'transparent', color: '#475569',
    fontSize: '15px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  tabActive: { color: '#2563eb', borderBottom: '3px solid #2563eb', fontWeight: 600 },
  tabCount: { padding: '1px 8px', borderRadius: '999px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px' },
  tabCountActive: { backgroundColor: '#dbeafe', color: '#1d4ed8' },

  tableCard: { backgroundColor: '#fff', border: '1px solid #e8ecf3', borderRadius: '14px', padding: '20px' },
  tableTitle: { fontSize: '20px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' },
  tableNote: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', margin: '0 0 16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { backgroundColor: '#f8fafc' },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#334155' },
  row: { borderTop: '1px solid #eef2f7', cursor: 'pointer' },
  rowActive: { backgroundColor: '#eff6ff' },
  td: { padding: '14px', verticalAlign: 'middle', color: '#0f172a' },
  emptyCell: { padding: '36px', textAlign: 'center', color: '#64748b' },
  reqNo: { fontWeight: 700 },
  reqCustomer: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  reviewBtn: {
    padding: '8px 20px', border: '1px solid #2563eb', borderRadius: '8px', backgroundColor: '#fff',
    color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },

  drawerBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.28)', zIndex: 140 },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '100vw', backgroundColor: '#fff',
    boxShadow: '-8px 0 30px rgba(15,23,42,0.15)', zIndex: 150, overflowY: 'auto', padding: '22px', boxSizing: 'border-box',
  },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
  drawerTitle: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer', color: '#334155',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  small: { fontSize: '12px', color: '#64748b' },
  smallBlue: { fontSize: '12px', color: '#2563eb' },
  requestRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0 16px' },
  requestNo: { fontSize: '26px', fontWeight: 800, color: '#0f172a' },
  customerRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  customerIcon: {
    width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  customerName: { fontSize: '17px', fontWeight: 700, color: '#0f172a' },

  boxRow: { display: 'flex', gap: '0', border: '1px solid #e8ecf3', borderRadius: '10px', marginBottom: '18px', backgroundColor: '#f8fafc' },
  box: { flex: 1, padding: '12px 14px', borderRight: '1px solid #e8ecf3' },
  boxLabel: { fontSize: '11px', color: '#64748b', marginBottom: '4px' },
  boxValue: { fontSize: '15px', fontWeight: 700, color: '#0f172a' },

  sectionTitle: { margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#0f172a' },
  itemTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' },
  itemHead: { color: '#334155' },
  ith: { textAlign: 'left', padding: '9px 10px', fontWeight: 600, fontSize: '12px' },
  itemRow: { borderTop: '1px solid #e8ecf3' },
  itd: { padding: '9px 10px', color: '#0f172a' },

  termRow: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' },
  termText: { fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '2px 0' },
  metaRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' },
  metaValue: { fontSize: '14px', fontWeight: 600, color: '#0f172a' },
  divider: { borderTop: '1px solid #eef2f7', margin: '4px 0 16px' },

  decisionRow: { display: 'flex', gap: '10px', marginBottom: '14px' },
  approveBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
    backgroundColor: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700,
    fontSize: '14px', cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
    backgroundColor: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px',
    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  reasonLabel: { display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px' },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #dbe1ea', borderRadius: '8px',
    boxSizing: 'border-box', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '8px',
  },
  primaryBtn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', margin: '6px 0 4px',
  },
  rejectedBox: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '12px', fontSize: '14px' },
  linkBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
    color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: '8px 0', marginBottom: '8px',
  },
  infoBox: {
    display: 'flex', gap: '10px', backgroundColor: '#eff6ff', borderRadius: '10px',
    padding: '12px 14px', fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5, marginTop: '4px',
  },

  muted: { color: '#64748b', fontSize: '13px', margin: '0 0 10px', lineHeight: 1.5 },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 10px' },
};

export default Loans;