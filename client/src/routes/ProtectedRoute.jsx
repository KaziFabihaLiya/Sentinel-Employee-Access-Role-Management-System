import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

// Shows a loading state while checking authentication
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → redirect to their dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;