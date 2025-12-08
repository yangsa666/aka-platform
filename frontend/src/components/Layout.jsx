import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { msalInstance } from '../config/authConfig';
import { CopyOutlined, LogoutOutlined, DashboardOutlined, AppstoreOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// 样式常量
const styles = {
  header: {
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    height: '64px',
  },
  logo: {
    padding: '16px',
    textAlign: 'center',
  },
  userInfoContainer: {
    width: '240px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: '100%',
  },
  dropdownTrigger: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'background-color 0.2s',
  },
  dropdownTriggerHover: {
    backgroundColor: 'rgba(24, 144, 255, 0.1)',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    marginRight: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: '#1890ff',
    width: '100%',
    height: '100%',
    lineHeight: '32px',
  },
  userNameContainer: {
    width: '160px',
    minWidth: '160px',
    display: 'flex',
    alignItems: 'center',
  },
  userName: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '14px',
    color: 'white',
  },
  content: {
    margin: '16px',
    padding: 24,
    background: '#fff',
    borderRadius: 8,
  },
};

// 辅助函数：计算用户名字的首字母
const getInitials = (displayName) => {
  if (!displayName) return 'U';
  
  const nameParts = displayName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, Math.min(2, nameParts[0].length)).toUpperCase();
  } else {
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  }
};

const LayoutComponent = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  // 使用useRef确保API请求只执行一次
  const fetchUserRef = useRef(false);

  useEffect(() => {
    // 获取当前用户信息
    const fetchUser = async () => {
      if (!fetchUserRef.current) {
        fetchUserRef.current = true;
        try {
          const response = await api.getCurrentUser();
          setUser(response.data);
        } catch (error) {
          // 静默失败，不影响应用运行
          console.error('Failed to fetch user:', error);
        }
      }
    };

    // 添加一个延迟，确保msalInstance已经初始化完成
    setTimeout(fetchUser, 1000);
  }, []);

  // 处理退出登录
  const handleLogout = () => {
    msalInstance.logoutPopup();
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenu = {
    items: [
      {
        key: 'full-name',
        label: <div style={{ padding: '0 16px' }}>{user?.displayName || 'User'}</div>,
        disabled: true,
      },
      {
        key: 'email',
        label: <div style={{ padding: '0 16px', fontSize: '12px', color: '#888' }}>{user?.email || 'user@example.com'}</div>,
        disabled: true,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  // 导航菜单
  const getMenuItems = () => {
    const items = [
      {
        key: 'projects',
        icon: <CopyOutlined />,
        label: <Link to="/projects">My Projects</Link>,
      },
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">Dashboard</Link>,
      },
    ];

    // 如果是管理员，添加管理员菜单
    if (user?.role === 'admin') {
      items.push({
        key: 'admin',
        icon: <AppstoreOutlined />,
        label: 'Admin',
        children: [
          {
            key: 'admin-dashboard',
            icon: <DashboardOutlined />,
            label: <Link to="/admin/dashboard">Admin Dashboard</Link>,
          },
          {
            key: 'project-approval',
            icon: <CopyOutlined />,
            label: <Link to="/admin/approval">Project Approval</Link>,
          },
        ],
      });
    }

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className="logo" style={styles.logo}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? 'AKA' : 'AKA Platform'}
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname.split('/')[1] || 'dashboard']}
          items={getMenuItems()}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={styles.header}>
          {/* 占位符，将内容推到右侧 */}
          <div style={{ flex: 1 }}></div>
          
          {/* 用户信息区域 */}
          <div style={styles.userInfoContainer}>
            <Dropdown menu={userMenu} trigger={['click']}>
              <div style={styles.dropdownTrigger}>
                {/* Avatar区域 */}
                <div style={styles.avatarContainer}>
                  <Avatar style={styles.avatar}>
                    {getInitials(user?.displayName)}
                  </Avatar>
                </div>
                
                {/* 用户名区域 */}
                <div style={styles.userNameContainer}>
                  <span style={styles.userName}>
                    {user?.displayName || 'User'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutComponent;
