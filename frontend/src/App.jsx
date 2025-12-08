import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { ConfigProvider, theme, Spin } from 'antd';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import AdminDashboard from './pages/AdminDashboard';
import ProjectApproval from './pages/ProjectApproval';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import { msalInstance } from './config/authConfig';
import './index.css';

// 应用初始化组件
const AppInitializer = ({ children }) => {
  const { accounts, instance } = useMsal();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // 尝试从缓存中获取账户信息
    const initializeAuth = async () => {
      try {
        // 检查是否有缓存的账户
        const cachedAccounts = instance.getAllAccounts();
        
        if (cachedAccounts.length > 0) {
          // 尝试静默获取令牌，确保会话有效
          await instance.acquireTokenSilent({
            account: cachedAccounts[0],
            scopes: ['api://63ca854f-4643-44a6-8675-796c601a0c00/user_impersonation'],
          });
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [instance]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
};

function App() {
  return (
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
          },
        }}
      >
        <Router>
          <div className="app-container">
            <AuthenticatedTemplate>
              <AppInitializer>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
                    <Route path="/projects/new" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
                    <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectForm /></ProtectedRoute>} />
                    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                    <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/approval" element={<AdminRoute><ProjectApproval /></AdminRoute>} />
                    <Route path="/" element={<Navigate to="/projects" replace />} />
                  </Routes>
                </Layout>
              </AppInitializer>
            </AuthenticatedTemplate>
            
            <UnauthenticatedTemplate>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={<Navigate to="/login" replace />} />
              </Routes>
            </UnauthenticatedTemplate>
          </div>
        </Router>
      </ConfigProvider>
  );
}

export default App;
