import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';

const statusColors = {
  paid: { bg: '#EAF3DE', color: '#3B6D11' },
  partial: { bg: '#FAEEDA', color: '#854F0B' },
  unpaid: { bg: '#fee2e2', color: '#dc2626' },
};

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data } = await axios.get('/api/sales');
        setSales(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '16px' }}>Sales History</h2>

      <div style={styles.panel}>
        {loading ? (
          <p>Loading...</p>
        ) : sales.length === 0 ? (
          <p style={{ color: '#888' }}>No sales yet.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Invoice ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={styles.td}>#S{sale.id}</td>
                  <td style={styles.td}>{sale.Customer?.name || sale.customerName}</td>
                  <td style={styles.td}>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td style={styles.td}>${sale.totalAmount}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        padding: '2px 10px', borderRadius: '6px', fontSize: '12px',
                        backgroundColor: statusColors[sale.paymentStatus]?.bg,
                        color: statusColors[sale.paymentStatus]?.color,
                      }}
                    >
                      {sale.paymentStatus}
                    </span>
                  </td>
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
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  th: { padding: '8px 0' },
  td: { padding: '10px 0' },
};

export default SalesHistory;