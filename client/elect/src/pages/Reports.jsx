import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import DashboardLayout from '../components/Layout/DashboardLayout';

const Reports = () => {
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, expensesRes] = await Promise.all([
          axios.get('/api/sales'),
          axios.get('/api/expenses'),
        ]);
        setSales(salesRes.data);
        setExpenses(expensesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netProfit = totalSales - totalExpenses;

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '16px' }}>Reports</h2>

      {loading ? <p>Loading...</p> : (
        <>
          <div style={styles.cardGrid}>
            <div style={{ ...styles.card, backgroundColor: '#E6F1FB' }}>
              <p style={styles.cardLabel}>Total Sales</p>
              <p style={styles.cardValue}>${totalSales.toFixed(2)}</p>
            </div>
            <div style={{ ...styles.card, backgroundColor: '#fee2e2' }}>
              <p style={styles.cardLabel}>Total Expenses</p>
              <p style={styles.cardValue}>${totalExpenses.toFixed(2)}</p>
            </div>
            <div style={{ ...styles.card, backgroundColor: '#E1F5EE' }}>
              <p style={styles.cardLabel}>Net Profit</p>
              <p style={{ ...styles.cardValue, color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                ${netProfit.toFixed(2)}
              </p>
            </div>
            <div style={{ ...styles.card, backgroundColor: '#F3F1FE' }}>
              <p style={styles.cardLabel}>Total Transactions</p>
              <p style={styles.cardValue}>{sales.length}</p>
            </div>
          </div>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Recent Sales</p>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                  <th style={styles.th}>Invoice</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={styles.td}>#S{s.id}</td>
                    <td style={styles.td}>{s.Customer?.name || s.customerName}</td>
                    <td style={styles.td}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>${s.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

const styles = {
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
  card: { borderRadius: '12px', padding: '16px' },
  cardLabel: { fontSize: '13px', color: '#555', margin: '0 0 6px' },
  cardValue: { fontSize: '20px', fontWeight: 'bold', margin: 0 },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  th: { padding: '8px 0' },
  td: { padding: '10px 0' },
};

export default Reports;
