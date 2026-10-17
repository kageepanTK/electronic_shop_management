import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';
import LoanStatusBadge from '../components/LoanStatusBadge';
import { customerCode, money } from '../utils/format';

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'OVERDUE', 'PAID'];

const Loans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoans = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/loans', {
          params: filter === 'ALL' ? {} : { status: filter },
        });
        setLoans(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [filter]);

  return (
    <DashboardLayout>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>Loans</h2>
        <button style={styles.addBtn} onClick={() => navigate('/loans/new')}>
          <Plus size={16} /> New Application
        </button>
      </div>

      <div style={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.pill, ...(filter === f ? styles.pillActive : {}) }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={styles.panel}>
        {loading ? (
          <p>Loading...</p>
        ) : loans.length === 0 ? (
          <p style={{ color: '#888' }}>No loans found.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Loan</th>
                <th style={styles.th}>Customer ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Outstanding</th>
                <th style={styles.th}>Applied</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr
                  key={l.id}
                  style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onClick={() => navigate(`/loans/${l.id}`)}
                >
                  <td style={styles.td}>#L{l.id}</td>
                  <td style={styles.td}>{customerCode(l.customerId)}</td>
                  <td style={styles.td}>{l.Customer?.name}</td>
                  <td style={styles.td}>{money(l.totalAmount)}</td>
                  <td style={styles.td}>
                    {['ACTIVE', 'OVERDUE', 'PAID'].includes(l.status) ? money(l.outstandingBalance) : '-'}
                  </td>
                  <td style={styles.td}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}><LoanStatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
  },
  filterRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  pill: {
    padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd',
    backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer',
  },
  pillActive: { backgroundColor: '#161a2e', color: '#fff', border: '1px solid #161a2e' },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  th: { padding: '8px 0' },
  td: { padding: '10px 0' },
};

export default Loans;