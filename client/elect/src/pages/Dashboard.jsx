import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2>Welcome, {user?.name}</h2>
      <p>Role: {user?.role}</p>

      <div style={{ marginTop: '20px' }}>
        <h3>Quick Actions</h3>
        <ul>
          <li>View Products</li>
          <li>Create Sale / Bill</li>
          <li>View Customers</li>
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;