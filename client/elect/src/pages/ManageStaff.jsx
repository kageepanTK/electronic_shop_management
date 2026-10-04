import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import ConfirmModal from '../components/ConfirmModal';

const ManageStaff = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [confirmRoleChange, setConfirmRoleChange] = useState(null); // { id, name, newRole }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleSelect = (id, name, newRole) => {
    setConfirmRoleChange({ id, name, newRole });
  };

  const confirmRoleChangeAction = async () => {
    try {
      await axios.put(`/api/users/${confirmRoleChange.id}/role`, { role: confirmRoleChange.newRole });
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmRoleChange(null);
    }
  };

  const confirmDeleteAction = async () => {
    setError('');
    try {
      await axios.delete(`/api/users/${confirmDelete.id}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: '16px' }}>Manage Staff</h2>

      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

      <div style={styles.panel}>
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={styles.td}>
                      {u.name} {isSelf && <span style={styles.youBadge}>You</span>}
                    </td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleSelect(u.id, u.name, e.target.value)}
                        style={styles.select}
                        disabled={isSelf}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.deleteBtn, ...(isSelf ? styles.deleteBtnDisabled : {}) }}
                        onClick={() => !isSelf && setConfirmDelete({ id: u.id, name: u.name })}
                        disabled={isSelf}
                        title={isSelf ? "You can't remove your own account" : 'Remove user'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Remove Staff Member"
          message={`Are you sure you want to remove ${confirmDelete.name}? This cannot be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmRoleChange && (
        <ConfirmModal
          title="Change Role"
          message={`Change ${confirmRoleChange.name}'s role to "${confirmRoleChange.newRole}"?`}
          confirmLabel="Change Role"
          onConfirm={confirmRoleChangeAction}
          onCancel={() => setConfirmRoleChange(null)}
        />
      )}
    </DashboardLayout>
  );
};

const styles = {
  panel: { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' },
  th: { padding: '8px 0' },
  td: { padding: '10px 0' },
  select: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' },
  deleteBtn: {
    background: '#fee2e2', color: '#dc2626', border: 'none',
    borderRadius: '6px', padding: '6px 8px', cursor: 'pointer',
  },
  deleteBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  youBadge: {
    fontSize: '10px', backgroundColor: '#e0e7ff', color: '#4338ca',
    padding: '1px 6px', borderRadius: '8px', marginLeft: '6px',
  },
};

export default ManageStaff;