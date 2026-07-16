import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.navbar}>
      <div style={styles.title}>Shop Management System</div>
      <div style={styles.right}>
        <span style={styles.userInfo}>
          {user?.name} <span style={styles.role}>({user?.role})</span>
        </span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
};

const styles = {
  navbar: {
    height: '60px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    fontSize: '14px',
  },
  role: {
    color: '#777',
    fontSize: '12px',
  },
  logoutBtn: {
    padding: '6px 14px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
};

export default Navbar;