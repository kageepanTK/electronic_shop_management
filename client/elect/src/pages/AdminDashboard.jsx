import { DollarSign, TrendingUp, Send, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatCard from '../components/StatCard';

const salesData = [
  { month: 'Feb', sales: 40, purchases: 24 },
  { month: 'Mar', sales: 55, purchases: 30 },
  { month: 'Apr', sales: 25, purchases: 20 },
  { month: 'May', sales: 45, purchases: 28 },
  { month: 'Jun', sales: 20, purchases: 15 },
  { month: 'Jul', sales: 32, purchases: 22 },
];

const deviceData = [
  { name: 'iOS', value: 40, color: '#5DCAA5' },
  { name: 'MacBook', value: 12, color: '#7F77DD' },
  { name: 'Smart TV', value: 10, color: '#EF9F27' },
  { name: 'Tesla Model S', value: 30, color: '#F0997B' },
  { name: 'Google Pixel', value: 8, color: '#ED93B1' },
];

const recentInvoices = [
  { id: '#INV3421', customer: 'Skylar Price', date: '11/20/2024', amount: '$354', status: 'Delivered' },
  { id: '#INV3412', customer: 'Julian Jenkins', date: '11/08/2024', amount: '$940', status: 'In Progress' },
];

const AdminDashboard = () => {
  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '20px' }}>Dashboard Overview</h2>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <StatCard
          icon={<DollarSign size={16} color="#fff" />}
          label="Total Sales"
          value="$12,345"
          trend="20%"
          trendUp
          color={{ bg: '#F3F1FE', icon: '#7F77DD' }}
        />
        <StatCard
          icon={<Wallet size={16} color="#fff" />}
          label="Total Expense"
          value="$3,213"
          trend="9%"
          trendUp
          color={{ bg: '#E6F1FB', icon: '#378ADD' }}
        />
        <StatCard
          icon={<Send size={16} color="#fff" />}
          label="Payment Sent"
          value="$65,920"
          trend="32%"
          trendUp
          color={{ bg: '#E1F5EE', icon: '#1D9E75' }}
        />
        <StatCard
          icon={<TrendingUp size={16} color="#fff" />}
          label="Payment Received"
          value="$72,840"
          trend="3%"
          trendUp={false}
          color={{ bg: '#EAF3DE', icon: '#639922' }}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={styles.panel}>
          <p style={styles.panelTitle}>Sales & Purchases</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salesData}>
              <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
              <Bar dataKey="sales" fill="#7F77DD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" fill="#F0997B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.panel}>
          <p style={styles.panelTitle}>Devices</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={deviceData} dataKey="value" innerRadius={40} outerRadius={70}>
                {deviceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table + stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        <div style={styles.panel}>
          <p style={styles.panelTitle}>Recent Invoice</p>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', textAlign: 'left' }}>
                <th style={styles.th}>Invoice ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={styles.td}>{inv.id}</td>
                  <td style={styles.td}>{inv.customer}</td>
                  <td style={styles.td}>{inv.date}</td>
                  <td style={styles.td}>{inv.amount}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        backgroundColor: inv.status === 'Delivered' ? '#EAF3DE' : '#FAEEDA',
                        color: inv.status === 'Delivered' ? '#3B6D11' : '#854F0B',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.panel}>
          <p style={styles.panelTitle}>Stock History</p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px' }}>Total Sales Items</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            210 <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'normal' }}>↑ 20%</span>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  panel: {
    backgroundColor: '#fff',
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '16px',
  },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  th: { padding: '6px 0', fontWeight: 'normal' },
  td: { padding: '8px 0' },
};

export default AdminDashboard;