import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  UserCog,
  Zap,
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'manager'
      ? '/manager/dashboard'
      : '/staff/dashboard';

  const menuItems = [
    { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
    { label: 'Products', path: '/products', icon: Package, roles: ['admin', 'manager', 'staff'] },
    { label: 'Sales / Billing', path: '/sales', icon: ShoppingCart, roles: ['admin', 'manager', 'staff'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'manager', 'staff'] },
    { label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { label: 'Manage Staff', path: '/admin/users', icon: UserCog, roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <Zap size={18} color="#fff" />
        <span>ElectroShop</span>
      </div>
      <nav>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.link,
                backgroundColor: isActive ? '#2c3352' : 'transparent',
                color: isActive ? '#fff' : '#9ca3c4',
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const styles = {
  sidebar: {
    width: '220px',
    height: '100vh',
    backgroundColor: '#161a2e',
    padding: '20px 0',
    position: 'fixed',
    left: 0,
    top: 0,
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '17px',
    fontWeight: 'bold',
    padding: '0 20px 20px',
    borderBottom: '1px solid #2c3352',
    marginBottom: '10px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    textDecoration: 'none',
    fontSize: '14px',
    borderRadius: '8px',
    margin: '2px 10px',
    transition: 'background-color 0.15s',
  },
};

export default Sidebar;