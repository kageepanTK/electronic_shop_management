import { useState } from 'react';
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
  Wallet,
  Receipt,
  Landmark,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  const role = user?.role;
  const dashboardPath =
    role === 'admin' ? '/admin/dashboard' : role === 'manager' ? '/manager/dashboard' : '/staff/dashboard';

  const menuItems = [
    { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
    {
      label: 'Products',
      icon: Package,
      basePath: '/products',
      roles: ['admin', 'manager', 'staff'],
      children: [
        { label: 'All Products', path: '/products', roles: ['admin', 'manager', 'staff'] },
        { label: 'Add Product', path: '/products/add', roles: ['admin', 'manager'] },
      ],
    },
    { label: 'All Sales', path: '/sales', icon: Receipt, roles: ['admin', 'manager', 'staff'] },
    { label: 'New Sale', path: '/sales/new', icon: ShoppingCart, roles: ['admin', 'manager', 'staff'] },
    { label: 'Loans', path: '/loans', icon: Landmark, roles: ['admin', 'manager', 'staff'] },
    { label: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'manager', 'staff'] },
    { label: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },
    { label: 'Expenses', path: '/expenses', icon: Wallet, roles: ['admin', 'manager'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { label: 'Manage Staff', path: '/admin/users', icon: UserCog, roles: ['admin'] },
  ];

  const visibleItems = menuItems
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter((c) => c.roles.includes(role)) }
        : item
    )
    .filter((item) => item.roles.includes(role) && (!item.children || item.children.length > 0));

  const linkStyle = (active) => ({
    ...styles.link,
    backgroundColor: active ? '#2c3352' : 'transparent',
    color: active ? '#fff' : '#9ca3c4',
  });

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <Zap size={18} color="#fff" />
        <span>ElectroShop</span>
      </div>
      <nav>
        {visibleItems.map((item) => {
          const Icon = item.icon;

          // Group with 2+ children -> expandable submenu
          if (item.children && item.children.length > 1) {
            const groupActive = location.pathname.startsWith(item.basePath);
            const isOpen = openGroups[item.label] ?? groupActive;

            return (
              <div key={item.label}>
                <button
                  style={{ ...linkStyle(false), ...styles.groupBtn, color: groupActive ? '#fff' : '#9ca3c4' }}
                  onClick={() => setOpenGroups({ ...openGroups, [item.label]: !isOpen })}
                >
                  <Icon size={16} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isOpen &&
                  item.children.map((child) => {
                    const active = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        style={{ ...linkStyle(active), ...styles.childLink }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
              </div>
            );
          }

          // Group with only 1 allowed child (e.g. staff) -> plain link
          if (item.children) {
            const only = item.children[0];
            return (
              <Link key={item.label} to={only.path} style={linkStyle(location.pathname === only.path)}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link key={item.path} to={item.path} style={linkStyle(location.pathname === item.path)}>
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
    padding: '11px 20px',
    textDecoration: 'none',
    fontSize: '13px',
    borderRadius: '8px',
    margin: '2px 10px',
    transition: 'background-color 0.15s',
  },
  groupBtn: {
    width: 'calc(100% - 20px)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  childLink: {
    padding: '9px 20px 9px 46px',
    fontSize: '12.5px',
  },
};

export default Sidebar;