// client/src/pages/admin/UserManagementPage.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import CreateUserModal from '../../components/Admin/CreateUserModal';
import { T } from '../../styles/darkTokens';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: '800', fontSize: '1.8rem' }}>User Management</h1>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: T.gradient,
            color: T.navy,
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          + Create New User
        </button>
      </div>

      {/* Your existing users table here */}

      <CreateUserModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};

export default UserManagementPage;