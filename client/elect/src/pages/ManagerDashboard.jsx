import { DollarSign, TrendingUp, Package, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../components/Layout/DashboardLayout';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

const salesData = [
  { month: 'Feb', sales: 40 },
  { month: 'Mar', sales: 55 },
  { month: 'Apr', sales: 25 },
  { month: 'May', sales: 45 },
  { month: 'Jun', sales: 20 },
  { month: 'Jul', sales: 32 },
];

const lowStockItems = [
  { name: 'Samsung 55" TV', qty: 3 },
  { name: 'iPhone Charger Cable', qty: 5 },
  { name: 'Bluetooth Earbuds', qty: 2 },
];

const ManagerDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '4px' }}>Manager Dashboard</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>Welcome back, {user?.name}</p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <StatCard
          icon={<DollarSign size={16} color="#fff" />}
          label="Today's Sales"
          value="$1,845"
          trend="12%"
          trendUp
          color={{ bg: '#F3F1FE', icon: '#7F77DD' }}
        />
        <StatCard
          icon={<Package size={16} color="#fff" />}
          label="Total Stock Items"
          value="1,240"
          trend="4%"
          trendUp
          color={{ bg: '#E6F1FB', icon: '#378ADD' }}
        />
        <StatCard
          icon={<TrendingUp size={16} color="#fff" />}
          label="Monthly Revenue"
          value="$28,450"
          trend="18%"
          trendUp
          color={{ bg: '#E1F5EE', icon: '#1D9E75' }}
        />
        <StatCard
          icon={<Users size={16} color="#fff" />}
          label="Active Customers"
          value="356"
          trend="6%"
          trendUp
          color={{ bg: '#EAF3DE', icon: '#639922' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        <div style={styles.panel}>
          <p style={styles.panelTitle}>Sales Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salesData}>
              <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
              <Bar dataKey="sales" fill="#7F77DD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.panel}>
          <p style={styles.panelTitle}>Low Stock Alerts</p>
          {lowStockItems.map((item) => (
            <div key={item.name} style={styles.stockRow}>
              <span style={{ fontSize: '13px' }}>{item.name}</span>
              <span style={styles.stockBadge}>{item.qty} left</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  stockRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #f0f0f0',
  },
  stockBadge: {
    fontSize: '12px', backgroundColor: '#FAEEDA', color: '#854F0B',
    padding: '2px 10px', borderRadius: '6px',
  },
};

export default ManagerDashboard;