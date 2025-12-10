import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    totalClicks: 0,
  });
  const [trends, setTrends] = useState({
    projectCreation: [],
    clickTrends: [],
  });
  const [topShortLinks, setTopShortLinks] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // 使用useRef确保API请求只执行一次
  const fetchStatsRef = useRef(false);

  useEffect(() => {
    // 获取管理员统计数据
    if (!fetchStatsRef.current) {
      fetchStatsRef.current = true;
      fetchAdminStats();
    }
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      // 并行获取所有统计数据
      const [
        projectCreationResponse,
        clickTrendsResponse,
        topShortLinksResponse,
        topUsersResponse,
      ] = await Promise.all([
        api.getProjectTrends(30), // 获取30天的项目创建趋势
        api.getClickTrends(30), // 获取30天的点击趋势
        api.getTopShortUrls(30), // 获取30天内最受欢迎的短链接
        api.getTopUsers(30), // 获取30天内创建项目最多的用户
      ]);

      // 处理项目创建趋势数据 - 将_id字段重命名为date
      const projectCreationData = projectCreationResponse.data.map(item => ({
        date: item._id,
        count: item.count
      }));
      
      // 处理点击趋势数据 - 将_id字段重命名为date
      const clickTrendsData = clickTrendsResponse.data.map(item => ({
        date: item._id,
        count: item.count
      }));
      
      // 计算总统计数据
      const totalProjects = projectCreationData.reduce((sum, item) => sum + item.count, 0);
      
      // 这里需要额外获取待审批和已审批项目的数量
      const allProjectsResponse = await api.getAllProjects({
        page: 1,
        limit: 100, // 增加限制，确保能获取到所有项目
        status: 'all'
      });
      const pendingProjects = allProjectsResponse.data.projects.filter(p => p.status === 'pending').length;
      const approvedProjects = allProjectsResponse.data.projects.filter(p => p.status === 'approved').length;
      const totalClicks = clickTrendsData.reduce((sum, item) => sum + item.count, 0);

      setStats({
        totalProjects,
        pendingProjects,
        approvedProjects,
        totalClicks,
      });

      setTrends({
        projectCreation: projectCreationData,
        clickTrends: clickTrendsData,
      });

      // 处理topShortLinks数据 - 将_id字段重命名为shortName，clickCount重命名为count
      const processedTopShortLinks = topShortLinksResponse.data.map(item => ({
        shortName: item._id,
        targetUrl: item.targetUrl,
        count: item.clickCount
      }));
      
      // 处理topUsers数据 - 将displayName重命名为user，projectCount重命名为count
      const processedTopUsers = topUsersResponse.data.map(item => ({
        user: item.displayName,
        count: item.projectCount
      }));

      setTopShortLinks(processedTopShortLinks);
      setTopUsers(processedTopUsers);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // 状态标签
  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="gold">Pending</Tag>;
      case 'approved':
        return <Tag color="green">Approved</Tag>;
      case 'rejected':
        return <Tag color="red">Rejected</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Total Projects"
              value={stats.totalProjects}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Pending Projects"
              value={stats.pendingProjects}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Approved Projects"
              value={stats.approvedProjects}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Total Clicks"
              value={stats.totalClicks}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Project Creation Trend" loading={loading}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.projectCreation}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Click Trends" loading={loading}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.clickTrends}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#82ca9d" fillOpacity={1} fill="url(#colorClicks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Top 10 统计 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="Top 10 Short Links" loading={loading}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topShortLinks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top Users (Project Creation)" loading={loading}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
