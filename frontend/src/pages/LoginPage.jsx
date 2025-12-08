import React, { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Card, Button, Typography, Space, Divider } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../config/authConfig';

const { Title, Paragraph } = Typography;

const LoginPage = () => {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  // 检查是否已认证，如果是则直接重定向到projects页面
  useEffect(() => {
    if (accounts.length > 0) {
      navigate('/projects', { replace: true });
    }
  }, [accounts, navigate]);

  // 处理登录
  const handleLogin = () => {
    instance.loginPopup(loginRequest)
      .then((response) => {
        console.log('Login successful:', response);
        // 登录成功后主动重定向到projects页面
        navigate('/projects', { replace: true });
      })
      .catch((error) => {
        console.error('Login failed:', error);
      });
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card
        style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
      >
        <Space direction="vertical" size="large" align="center" style={{ width: '100%', padding: '24px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>AKA Platform</Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>URL Shortening & Redirection Platform</Paragraph>
          </div>

          <Divider />

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph style={{ margin: 0, textAlign: 'center' }}>
              Sign in with your Azure AD account to continue
            </Paragraph>
            
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              block
              onClick={handleLogin}
              style={{ height: 40, fontSize: 16 }}
            >
              Sign in with Azure AD
            </Button>
          </Space>

          <Divider />

          <Paragraph style={{ margin: 0, fontSize: 12, color: '#999', textAlign: 'center' }}>
            © {new Date().getFullYear()} AKA Platform. All rights reserved.
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
