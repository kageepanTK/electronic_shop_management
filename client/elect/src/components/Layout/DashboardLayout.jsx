import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
};

const styles = {
  main: {
    marginLeft: '220px',
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#f4f4f4',
  },
  content: {
    padding: '24px',
  },
};

export default DashboardLayout;