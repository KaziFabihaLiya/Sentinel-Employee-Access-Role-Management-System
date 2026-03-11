import { useAuth } from '../contexts/AuthContext';
import EmployeeHome from './employee/EmployeeHome';
import ManagerHome  from './manager/ManagerHome';
import AdminHome    from './admin/AdminHome';

/**
 * DashboardHome — route-level component at /dashboard
 * Renders the correct home screen based on user role.
 */
const DashboardHome = () => {
  const { user } = useAuth();

  if (user?.role === 'manager') return <ManagerHome />;
  if (user?.role === 'admin')   return <AdminHome />;
  return <EmployeeHome />;
};

export default DashboardHome;