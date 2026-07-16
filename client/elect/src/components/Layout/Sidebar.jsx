import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', roles: ['admin', 'manager', 'staff'] },
    { label: 'Products', path: '/products', roles: ['admin', 'manager', 'staff'] },
    { label: 'Sales / Billing', path: '/sales', roles: ['admin', 'manager', 'staff'] },
    { label: 'Customers', path: '/customers', roles: ['admin', 'manager', 'staff'] },
    { label: 'Suppliers', path: '/suppliers', roles: ['admin', 'manager'] },
    { label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
    { label: 'Manage Staff', path: '/admin/users', roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>⚡ ElectroShop</div>
      <nav>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.link,
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                color: isActive ? '#fff' : '#333',
              }}
            >
              {item.label}
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
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e0e0e0',
    padding: '20px 0',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  logo: {
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '0 20px 20px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '10px',
  },
  link: {
    display: 'block',
    padding: '12px 20px',
    textDecoration: 'none',
    fontSize: '14px',
    borderRadius: '4px',
    margin: '2px 10px',
  },
};

export default Sidebar;