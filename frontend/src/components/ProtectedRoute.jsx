import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { Spin } from 'antd';
import { api } from '../services/api';

// 基础路由保护组件（需要认证）
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// 管理员路由保护组件（需要认证且为管理员）
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();
  // 使用useRef确保API请求只执行一次
  const checkAdminRef = React.useRef(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (!checkAdminRef.current) {
        checkAdminRef.current = true;
        try {
          const response = await api.getCurrentUser();
          setIsAdmin(response.data.role === 'admin');
        } catch (error) {
          console.error('Failed to check admin status:', error);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
export { AdminRoute };
