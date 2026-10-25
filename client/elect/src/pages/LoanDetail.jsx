import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';
import LoanStatusBadge from '../components/LoanStatusBadge';
import { customerCode, money } from '../utils/format';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'manager';

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [confirm, setConfirm] = useState(null); // 'approve' | 'activate'
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const fetchLoan = async () => {
    try {
      const { data } = await axios.get(`/api/loans/${id}`);
      setLoan(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoan(); }, [id]);

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
      setConfirm(null);
      setShowReject(false);
    }
  };

  const approve = () => run(() => axios.put(`/api/loans/${id}/approve`));
  const reject = () => run(() => axios.put(`/api/loans/${id}/reject`, { reason }));
  const activate = () => run(() => axios.post(`/api/loans/${id}/activate`));
  const pay = () =>
    run(async () => {
      await axios.post(`/api/loans/${id}/payments`, { amount: parseFloat(payAmount), note: payNote });
      setPayAmount('');
      setPayNote('');
    });

  if (loading) return <DashboardLayout><p>Loading...</p></DashboardLayout>;
  if (!loan) return <DashboardLayout><p style={{ color: 'red' }}>{error || 'Loan not found'}</p></DashboardLayout>;

  const canPay = ['ACTIVE', 'OVERDUE'].includes(loan.status);
  const paidSoFar = parseFloat(loan.loanAmount) - parseFloat(loan.outstandingBalance);

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate('/loans')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0 }}>Loan #L{loan.id}</h2>
        <LoanStatusBadge status={loan.status} />
      </div>

      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Customer</p>
            <p style={styles.line}><strong>{customerCode(loan.customerId)}</strong> · {loan.Customer?.name}</p>
            <p style={styles.muted}>{loan.Customer?.phone || 'No phone'} {loan.Customer?.address ? `· ${loan.Customer.address}` : ''}</p>
            <p style={styles.muted}>
              Applied {new Date(loan.createdAt).toLocaleDateString()} by {loan.createdBy?.name || '-'}
            </p>
          </div>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Products</p>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Product</th><th style={styles.th}>Price</th>
                  <th style={styles.th}>Qty</th><th style={styles.th}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {loan.items.map((i) => (
                  <tr key={i.id} style={styles.row}>
                    <td style={styles.td}>{i.Product?.name}</td>
                    <td style={styles.td}>{money(i.unitPrice)}</td>
                    <td style={styles.td}>{i.quantity}</td>
                    <td style={styles.td}>{money(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loan.installments.length > 0 && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Installment Schedule</p>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>#</th><th style={styles.th}>Due date</th>
                    <th style={styles.th}>Amount</th><th style={styles.th}>Paid</th><th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.installments.map((i) => {
                    const late = i.status !== 'paid' && new Date(i.dueDate) < new Date(new Date().toDateString());
                    return (
                      <tr key={i.id} style={styles.row}>
                        <td style={styles.td}>{i.number}</td>
                        <td style={styles.td}>{i.dueDate}</td>
                        <td style={styles.td}>{money(i.amount)}</td>
                        <td style={styles.td}>{money(i.paidAmount)}</td>
                        <td style={{ ...styles.td, color: late ? '#dc2626' : i.status === 'paid' ? '#16a34a' : '#555' }}>
                          {late ? 'overdue' : i.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {loan.payments.length > 0 && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Payment History</p>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>Date</th><th style={styles.th}>Amount</th>
                    <th style={styles.th}>Received by</th><th style={styles.th}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.payments.map((p) => (
                    <tr key={p.id} style={styles.row}>
                      <td style={styles.td}>{new Date(p.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>{money(p.amount)}</td>
                      <td style={styles.td}>{p.receivedBy?.name || '-'}</td>
                      <td style={styles.td}>{p.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={styles.panel}>
            <div style={styles.totalRow}><span>Total purchase</span><span>{money(loan.totalAmount)}</span></div>
            <div style={styles.totalRow}><span>Down payment</span><span>{money(loan.downPayment)}</span></div>
            <div style={styles.totalRow}><span>Loan amount</span><span>{money(loan.loanAmount)}</span></div>
            <div style={styles.totalRow}><span>Installments</span><span>{loan.installmentCount} monthly</span></div>
            {['ACTIVE', 'OVERDUE', 'PAID'].includes(loan.status) && (
              <>
                <div style={styles.totalRow}><span>Repaid</span><span>{money(paidSoFar)}</span></div>
                <div style={{ ...styles.totalRow, fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <span>Outstanding</span><span>{money(loan.outstandingBalance)}</span>
                </div>
              </>
            )}
          </div>

          {loan.status === 'PENDING' && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Awaiting Approval</p>
              {canReview ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={styles.approveBtn} onClick={() => setConfirm('approve')} disabled={busy}>Approve</button>
                  <button style={styles.rejectBtn} onClick={() => setShowReject(true)} disabled={busy}>Reject</button>
                </div>
              ) : (
                <p style={styles.muted}>This application must be approved by an admin before it can be used.</p>
              )}
            </div>
          )}

          {loan.status === 'REJECTED' && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Rejected</p>
              <p style={styles.muted}>Reason: {loan.rejectionReason || 'No reason given'}</p>
              <p style={styles.muted}>Reviewed by {loan.reviewedBy?.name || '-'}</p>
            </div>
          )}

          {loan.status === 'APPROVED' && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Approved: Ready for Checkout</p>
              <p style={styles.muted}>
                Activating creates the sale, deducts stock and starts the installment schedule.
              </p>
              <button style={styles.primaryBtn} onClick={() => setConfirm('activate')} disabled={busy}>
                Activate &amp; Checkout
              </button>
            </div>
          )}

          {canPay && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>Record Payment</p>
              <input
                type="number" min="0" step="0.01" placeholder="Amount"
                value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={styles.input}
              />
              <input
                placeholder="Note (optional)"
                value={payNote} onChange={(e) => setPayNote(e.target.value)} style={styles.input}
              />
              <button style={styles.primaryBtn} onClick={pay} disabled={busy || !payAmount}>
                {busy ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          )}
        </div>
      </div>

      {confirm === 'approve' && (
        <ConfirmModal
          title="Approve Loan"
          message={`Approve loan #L${loan.id} for ${loan.Customer?.name} (${money(loan.loanAmount)} over ${loan.installmentCount} months)?`}
          confirmLabel="Approve"
          onConfirm={approve}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'activate' && (
        <ConfirmModal
          title="Activate & Checkout"
          message={`Collect the down payment of ${money(loan.downPayment)} from the customer, complete the sale and deduct stock?`}
          confirmLabel="Complete Checkout"
          onConfirm={activate}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showReject && (
        <div style={styles.overlay} onClick={() => setShowReject(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>Reject Application</h3>
<p style={{ ...styles.muted, marginBottom: '10px' }}>Reason (required)</p>            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={styles.cancelBtn} onClick={() => setShowReject(false)}>Cancel</button>
<button style={{ ...styles.rejectBtn, flex: 1 }} onClick={reject} disabled={busy || reason.trim().length < 3}>Reject</button>            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#fff',
    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#333',
  },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  line: { margin: '0 0 4px', fontSize: '14px' },
  muted: { margin: '0 0 4px', fontSize: '13px', color: '#777' },
  table: { width: '100%', fontSize: '14px', borderCollapse: 'collapse' },
  theadRow: { textAlign: 'left', color: '#888' },
  row: { borderTop: '1px solid #f0f0f0' },
  th: { padding: '6px 0', fontWeight: 'normal' },
  td: { padding: '8px 0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc',
    boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px',
  },
  primaryBtn: {
    width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px',
  },
  approveBtn: {
    flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: '10px', backgroundColor: '#f4f4f4', color: '#333', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '340px' },
};

export default LoanDetail;
