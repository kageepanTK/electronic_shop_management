import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2>Admin Dashboard — {user?.name}</h2>

      <div style={{ marginTop: '20px' }}>
        <h3>Admin Controls</h3>
        <ul>
          <li>Manage Products</li>
          <li>Manage Suppliers</li>
          <li>Manage Staff Accounts</li>
          <li>View Sales Reports</li>
          <li>Stock Reports</li>
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;