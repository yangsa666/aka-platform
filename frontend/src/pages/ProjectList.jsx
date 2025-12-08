import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { appConfig } from '../config/appConfig';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const navigate = useNavigate();
  
  // 使用useRef确保API请求只执行一次
  const fetchProjectsRef = useRef(false);

  useEffect(() => {
    if (!fetchProjectsRef.current) {
      fetchProjects();
      fetchProjectsRef.current = true;
    }
  }, []);

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.getProjects();
      
      // 添加更详细的日志信息
      console.log('API Response:', response);
      console.log('Projects data type:', typeof response.data);
      console.log('Projects data length:', response.data?.length);
      
      if (response.data?.length > 0) {
        console.log('First project:', response.data[0]);
        console.log('First project keys:', Object.keys(response.data[0]));
        console.log('First project stats:', response.data[0].stats);
        console.log('First project createdAt in stats:', response.data[0].stats?.createdAt);
        console.log('First project createdAt directly:', response.data[0].createdAt);
      }
      
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      console.error('Error response:', error.response?.data);
      message.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除项目
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // 添加日志查看selectedProjectId
      console.log('Deleting project with ID:', selectedProjectId);
      
      // 确保selectedProjectId存在
      if (!selectedProjectId) {
        throw new Error('Project ID is undefined');
      }
      
      const response = await api.deleteProject(selectedProjectId);
      
      console.log('Delete response:', response);
      message.success('Project deleted successfully');
      setDeleteModalVisible(false);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      console.error('Error response:', error.response?.data);
      
      // 显示更具体的错误信息
      if (error.response?.data?.message) {
        message.error(`Failed to delete project: ${error.response.data.message}`);
      } else if (error.message) {
        message.error(`Failed to delete project: ${error.message}`);
      } else {
        message.error('Failed to delete project');
      }
    } finally {
      setLoading(false);
    }
  };

  // 打开删除确认弹窗
  const confirmDelete = (id) => {
    console.log('Confirming delete for project ID:', id);
    console.log('Project ID type:', typeof id);
    setSelectedProjectId(id);
    setDeleteModalVisible(true);
  };

  // 关闭删除确认弹窗
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedProjectId(null);
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
        return (
          <a href={`${appConfig.shortUrlDomain}/${text}`} target="_blank" rel="noopener noreferrer">
            {domain}/{text}
          </a>
        );
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
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Rejected', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
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
    {      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/projects/${record._id}`)}>
            View
          </Button>
          <Button type="default" icon={<EditOutlined />} size="small" onClick={() => navigate(`/projects/edit/${record._id}`)}>
            Edit
          </Button>
          <Button danger type="dashed" icon={<DeleteOutlined />} size="small" onClick={() => confirmDelete(record._id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="My Projects" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
          Create Project
        </Button>
      } loading={loading}>
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          locale={{ emptyText: 'No projects found' }}
        />
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        title="Confirm Delete"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={cancelDelete}
        okText="Delete"
        okType="danger"
        cancelText="Cancel"
        confirmLoading={loading}
      >
        <p>Are you sure you want to delete this project? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default ProjectList;
