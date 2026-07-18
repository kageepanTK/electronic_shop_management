import { ShoppingCart, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const recentSales = [
  { id: '#S1042', customer: 'Walk-in Customer', amount: '$120', time: '10:24 AM' },
  { id: '#S1041', customer: 'Nimal Perera', amount: '$450', time: '9:58 AM' },
  { id: '#S1040', customer: 'Walk-in Customer', amount: '$65', time: '9:30 AM' },
];

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '4px' }}>Welcome, {user?.name}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>Here's what's happening today</p>

      {/* Quick action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button style={styles.actionBtn} onClick={() => navigate('/sales/new')}>
          <ShoppingCart size={18} />
          New Sale
        </button>
        <button style={{ ...styles.actionBtn, backgroundColor: '#fff', color: '#333', border: '1px solid #ddd' }} onClick={() => navigate('/products')}>
          <Package size={18} />
          View Products
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={styles.statBox}>
          <p style={styles.statLabel}>My Sales Today</p>
          <p style={styles.statValue}>8</p>
        </div>
        <div style={styles.statBox}>
          <p style={styles.statLabel}>Total Value</p>
          <p style={styles.statValue}>$635</p>
        </div>
        <div style={styles.statBox}>
          <p style={styles.statLabel}>Pending Dues</p>
          <p style={styles.statValue}>2</p>
        </div>
      </div>

      <div style={styles.panel}>
        <p style={styles.panelTitle}>
          <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          My Recent Sales
        </p>
        {recentSales.map((sale) => (
          <div key={sale.id} style={styles.saleRow}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{sale.id}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{sale.customer}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{sale.amount}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{sale.time}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

const styles = {
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
  },
  statBox: {
    flex: 1, backgroundColor: '#fff', border: '1px solid #eee',
    borderRadius: '12px', padding: '16px',
  },
  statLabel: { fontSize: '13px', color: '#666', margin: '0 0 6px' },
  statValue: { fontSize: '22px', fontWeight: 'bold', margin: 0 },
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  panelTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px' },
  saleRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
};

export default StaffDashboard;