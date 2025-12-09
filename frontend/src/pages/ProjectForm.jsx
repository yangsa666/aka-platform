import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, InputNumber, Button, Space, Select, message, Spin } from 'antd';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { UserOutlined, LinkOutlined, TagOutlined } from '@ant-design/icons';
import { appConfig } from '../config/appConfig';

const { Option } = Select;
const { TextArea } = Input;

const ProjectForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  // 使用useRef确保API请求只执行一次
  const fetchProjectRef = useRef({});

  // 如果有ID，获取项目详情进行编辑
  useEffect(() => {
    if (id && fetchProjectRef.current[id] !== true) {
      fetchProjectRef.current[id] = true;
      setIsEditing(true);
      fetchProjectDetail();
    }
  }, [id]);

  // 获取项目详情
  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      const response = await api.getProjectById(id);
      const project = response.data;
      
      // 添加调试日志
      console.log('API Response:', response);
      console.log('Project Data:', project);
      console.log('Project Short Name:', project.shortName);
      
      // 将已选择的所有者信息添加到users状态中，以便Select组件能够正确显示
      if (project.owners && project.owners.length > 0) {
        // 创建一个临时对象存储用户信息，避免重复
        const userMap = new Map();
        project.owners.forEach(owner => {
          userMap.set(owner.azureId, owner);
        });
        
        // 将用户信息转换为数组并设置到users状态
        setUsers(Array.from(userMap.values()));
      }
      
      // 单独设置shortName字段，确保它能正确显示
      form.setFieldsValue({
        ...project,
        owners: project.owners.map(owner => owner.azureId), // 使用azureId作为值
        shortName: project.shortName, // 明确设置shortName字段
      });
      
      // 检查表单字段是否正确设置
      const formValues = await form.getFieldsValue();
      console.log('Form Values After Setting:', formValues);
      console.log('Form Short Name:', formValues.shortName);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      message.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  const searchUsers = async (value) => {
    if (!value) return;
    
    try {
      setUserSearchLoading(true);
      console.log('Searching users with value:', value);
      const response = await api.searchUsers(value);
      console.log('User search response:', response);
      console.log('User search response data:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error config:', error.config);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data || error.message || error);
      message.error('Failed to search users');
    } finally {
      setUserSearchLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // 准备提交数据
      const projectData = {
        ...values,
        targetUrl: values.targetUrl.trim(),
      };

      console.log('Submitting project data:', projectData);

      if (isEditing) {
        // 更新项目
        await api.updateProject(id, projectData);
        message.success('Project updated successfully');
      } else {
        // 创建项目
        await api.createProject(projectData);
        message.success('Project created successfully');
      }

      navigate('/projects');
    } catch (error) {
      console.error('Failed to submit project:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      message.error('Failed to save project: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card 
        title={isEditing ? 'Edit Project' : 'Create New Project'} 
        loading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            shortName: '',
            targetUrl: '',
            name: '',
            description: '',
            owners: [],
          }}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please input project name' },
              { max: 100, message: 'Project name should be less than 100 characters' },
            ]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 500, message: 'Description should be less than 500 characters' },
            ]}
          >
            <TextArea rows={4} placeholder="Enter project description" />
          </Form.Item>

          <Form.Item
            name="owners"
            label="Project Owners"
            rules={[
              { required: true, message: 'Please select project owners' },
              { type: 'array', min: 2, message: 'At least two owners are required' },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Search and select project owners"
              loading={userSearchLoading}
              onSearch={searchUsers}
              allowClear
              filterOption={false}
              style={{ width: '100%' }}
            >
              {users.map((user) => (
                <Option key={user.azureId} value={user.azureId}>
                  <Space>
                    <UserOutlined />
                    <span>{user.displayName} ({user.email})</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="shortName"
            label="Short URL"
            rules={[
              { required: true, message: 'Please input short URL' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Short URL can only contain letters, numbers, underscore and hyphen' },
              { max: 50, message: 'Short URL should be less than 50 characters' },
            ]}
          >
            <Space.Compact>
              <Space.Addon style={{ whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {appConfig.shortUrlDomain}/
              </Space.Addon>
              <Input prefix={<TagOutlined />} placeholder={form.getFieldValue('shortName') || "Enter short URL path"} />
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="targetUrl"
            label="Target URL"
            rules={[
              { required: true, message: 'Please input target URL' },
              { type: 'url', message: 'Please input a valid URL' },
              { pattern: /^https:\/\//, message: 'URL should start with https://' },
            ]}
          >
            <Input prefix={<LinkOutlined />} placeholder="Enter target URL" />
          </Form.Item>

          <Form.Item>
            <Space size="large">
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEditing ? 'Update Project' : 'Create Project'}
              </Button>
              <Button type="default" onClick={() => navigate('/projects')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProjectForm;
