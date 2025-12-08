import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Progress, List, Tag } from 'antd';
import { CopyOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取用户项目统计
    const fetchStats = async () => {
      try {
        const response = await api.getProjects();
        const projects = response.data;
        
        // 统计项目状态
        const total = projects.length;
        const pending = projects.filter(p => p.status === 'pending').length;
        const approved = projects.filter(p => p.status === 'approved').length;
        const rejected = projects.filter(p => p.status === 'rejected').length;

        setStats({
          totalProjects: total,
          pendingProjects: pending,
          approvedProjects: approved,
          rejectedProjects: rejected
        });

        // 获取最近的5个项目
        const sortedProjects = [...projects].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 5);

        setRecentProjects(sortedProjects);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 获取状态标签
  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="gold"><ClockCircleOutlined /> Pending</Tag>;
      case 'approved':
        return <Tag color="green"><CheckCircleOutlined /> Approved</Tag>;
      case 'rejected':
        return <Tag color="red"><CloseCircleOutlined /> Rejected</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Total Projects"
              value={stats.totalProjects}
              prefix={<CopyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Pending Projects"
              value={stats.pendingProjects}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Approved Projects"
              value={stats.approvedProjects}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Rejected Projects"
              value={stats.rejectedProjects}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="Project Status Distribution" loading={loading}>
            <div style={{ padding: 24 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress type="circle" percent={stats.totalProjects > 0 ? (stats.approvedProjects / stats.totalProjects) * 100 : 0} 
                              strokeColor="#52c41a" format={(percent) => `${Math.round(percent)}%`} />
                    <div style={{ marginTop: 16 }}>Approved</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress type="circle" percent={stats.totalProjects > 0 ? (stats.pendingProjects / stats.totalProjects) * 100 : 0} 
                              strokeColor="#faad14" format={(percent) => `${Math.round(percent)}%`} />
                    <div style={{ marginTop: 16 }}>Pending</div>
                  </div>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress type="circle" percent={stats.totalProjects > 0 ? (stats.rejectedProjects / stats.totalProjects) * 100 : 0} 
                              strokeColor="#f5222d" format={(percent) => `${Math.round(percent)}%`} />
                    <div style={{ marginTop: 16 }}>Rejected</div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Recent Projects" loading={loading}>
            <List
              dataSource={recentProjects}
              renderItem={(project) => (
                <List.Item
                  actions={[getStatusTag(project.status)]}
                >
                  <List.Item.Meta
                    title={<a href={`/projects/${project._id}`}>{project.name}</a>}
                    description={
                      <div>
                        <div>{project.description || 'No description'}</div>
                        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No projects yet' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
