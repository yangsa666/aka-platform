import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Select, Input, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { appConfig } from '../config/appConfig';

const { Option } = Select;
const { Search } = Input;

const ProjectApproval = () => {
  const [projects, setProjects] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'pending',
    search: '',
    page: 1,
    limit: 10,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  // 获取所有项目
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.getAllProjects({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
      });
      // 确保projects始终是一个数组
      setProjects(Array.isArray(response.data?.projects) ? response.data.projects : []);
      // 设置总项目数
      setTotalProjects(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      message.error('Failed to load projects');
      setProjects([]); // 发生错误时设置为空数组
      setTotalProjects(0);
    } finally {
      setLoading(false);
    }
  };

  // 处理项目审批
  const handleApprove = async (id, approved) => {
    try {
      setLoading(true);
      // 将approved参数转换为后端期望的status字段格式
      await api.approveProject(id, { status: approved ? 'approved' : 'rejected' });
      message.success(`Project ${approved ? 'approved' : 'rejected'} successfully`);
      fetchProjects(); // 刷新项目列表
    } catch (error) {
      console.error('Failed to update project status:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      message.error('Failed to update project status: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取状态标签
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

  // 表格列配置
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <a href={`/projects/${record._id}`}>{text}</a>,
    },
    {
      title: 'Short URL',
      dataIndex: 'shortName',
      key: 'shortName',
      render: (text) => {
        // 从配置的完整URL中提取域名部分（去除协议）
        const domain = appConfig.shortUrlDomain.replace(/^https?:\/\//, '');
        return `${domain}/${text}`;
      },
    },
    {
      title: 'Target URL',
      dataIndex: 'targetUrl',
      key: 'targetUrl',
      render: (text) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          {text.length > 50 ? `${text.substring(0, 50)}...` : text}
        </a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Owners',
      dataIndex: 'owners',
      key: 'owners',
      render: (owners) => (
        <Space wrap size="small">
          {owners.slice(0, 3).map((owner, index) => (
            <Tag key={index} color="blue">
              {owner.displayName}
            </Tag>
          ))}
          {owners.length > 3 && <Tag color="default">+{owners.length - 3}</Tag>}
        </Space>
      ),
    },
    {      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString();
        } catch (error) {
          console.error('Date formatting error:', error);
          return 'Invalid Date';
        }
      },
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="default" icon={<EyeOutlined />} size="small">
            <Link to={`/projects/${record._id}`}>View</Link>
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="primary" icon={<CheckCircleOutlined />} size="small" onClick={() => handleApprove(record._id, true)}>
                Approve
              </Button>
              <Button danger icon={<CloseCircleOutlined />} size="small" onClick={() => handleApprove(record._id, false)}>
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="Project Approval" loading={loading}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 筛选和搜索 */}
          <Space size="large" wrap>
            <Select
              value={filters.status}
              onChange={(status) => setFilters(prev => ({ ...prev, status, page: 1 }))}
              style={{ width: 150 }}
            >
              <Option value="all">All</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
            <Search
              placeholder="Search projects..."
              allowClear
              enterButton="Search"
              size="middle"
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
              style={{ width: 300 }}
            />
          </Space>

          {/* 项目列表 */}
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="_id"
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              onChange: (page, pageSize) => setFilters(prev => ({ ...prev, page, limit: pageSize })),
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              total: totalProjects,
            }}
            locale={{ emptyText: 'No projects found' }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default ProjectApproval;
