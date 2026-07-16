import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>403 - Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <Link to="/dashboard">Go back to Dashboard</Link>
    </div>
  );
};

export default Unauthorized;