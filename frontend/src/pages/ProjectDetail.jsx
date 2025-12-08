import React, { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Button, Space, Tag, Divider, Modal, InputNumber, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EditOutlined, DeleteOutlined, QrcodeOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import QRCode from 'qrcode.react';
import { api } from '../services/api';
import { appConfig } from '../config/appConfig';

// 样式常量
const styles = {
  container: {
    padding: 24,
  },
  spaceFullWidth: {
    width: '100%',
  },
  textAlignCenter: {
    textAlign: 'center',
  },
  label: {
    display: 'block',
    marginBottom: 8,
  },
  inputNumber: {
    width: '100%',
  },
  projectOwners: {
    marginTop: 8,
  },
};

// 状态常量
const STATUS_TAGS = {
  pending: <Tag color="gold">Pending</Tag>,
  approved: <Tag color="green">Approved</Tag>,
  rejected: <Tag color="red">Rejected</Tag>,
};

// QR码默认配置
const QR_DEFAULT_CONFIG = {
  size: 200,
  minSize: 100,
  maxSize: 500,
  stepSize: 50,
  level: 'H',
  includeMargin: true,
};

const ProjectDetail = () => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [qrSize, setQrSize] = useState(QR_DEFAULT_CONFIG.size);
  const { id } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef(null);

  // 获取项目详情
  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  /**
   * 获取项目详情数据
   */
  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      const response = await api.getProjectById(id);
      console.log('API Response:', response);
      console.log('Project Data:', response.data);
      console.log('Project Owners:', response.data.owners);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project details:', error);
      message.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 下载二维码
   */
  const downloadQRCode = () => {
    if (!qrRef.current || !project) return;

    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${project.shortName}-qrcode-${qrSize}x${qrSize}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('QR Code downloaded successfully');
    }
  };

  /**
   * 复制短链接到剪贴板
   */
  const copyShortLink = () => {
    if (!project) return;

    const shortLink = `${appConfig.shortUrlDomain}/${project.shortName}`;
    navigator.clipboard.writeText(shortLink)
      .then(() => message.success('Short link copied to clipboard'))
      .catch(() => message.error('Failed to copy link'));
  };

  /**
   * 获取项目状态标签
   */
  const getStatusTag = (status) => {
    return STATUS_TAGS[status] || <Tag color="default">{status}</Tag>;
  };

  /**
   * 显示删除确认模态框
   */
  const showDeleteConfirm = () => {
    setDeleteModalVisible(true);
  };

  /**
   * 删除项目
   */
  const deleteProject = async () => {
    try {
      setLoading(true);
      await api.deleteProject(id);
      message.success('Project deleted successfully');
      setDeleteModalVisible(false);
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  // 加载中状态不渲染内容
  if (loading || !project) return null;

  // 短链接URL
  const shortUrl = `${appConfig.shortUrlDomain}/${project.shortName}`;

  return (
    <div style={styles.container}>
      <Card title="Project Details" loading={loading}>
        <Space direction="vertical" size="large" style={styles.spaceFullWidth}>
          {/* 基本信息 */}
          <Descriptions variant="bordered" column={2}>
            <Descriptions.Item label="Name" span={2}>{project.name}</Descriptions.Item>
            <Descriptions.Item label="Short URL">
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                {project.shortName}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Target URL">
              <a href={project.targetUrl} target="_blank" rel="noopener noreferrer">
                {project.targetUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>{getStatusTag(project.status)}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(project.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {new Date(project.updatedAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Click Count" span={2}>{project.stats?.clickCount || 0}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {project.description || 'No description provided'}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          {/* 项目所有者 */}
          <div>
            <h3>Project Owners</h3>
            <Space wrap style={styles.projectOwners}>
              {Array.isArray(project.owners) && project.owners.length > 0 ? (
                project.owners.map((owner, index) => (
                  <Tag key={index} color="blue">
                    {owner?.displayName || 'Unknown'} ({owner?.email || 'unknown@example.com'})
                  </Tag>
                ))
              ) : (
                <Tag color="default">No owners found</Tag>
              )}
            </Space>
          </div>

          <Divider />

          {/* 操作按钮 */}
          <Space size="large">
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/projects/edit/${project._id}`)}>
              Edit Project
            </Button>
            <Button type="default" icon={<QrcodeOutlined />} onClick={() => setQrModalVisible(true)}>
              Generate QR Code
            </Button>
            <Button type="default" icon={<CopyOutlined />} onClick={copyShortLink}>
              Copy Short Link
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={showDeleteConfirm}>
              Delete Project
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 二维码生成弹窗 */}
      <Modal
        title="Generate QR Code"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
        width={400}
      >
        <Space direction="vertical" size="large" style={styles.spaceFullWidth}>
          <div style={styles.textAlignCenter} ref={qrRef}>
            <QRCode
              value={shortUrl}
              size={qrSize}
              level={QR_DEFAULT_CONFIG.level}
              includeMargin={QR_DEFAULT_CONFIG.includeMargin}
            />
          </div>

          <div>
            <label style={styles.label}>QR Code Size:</label>
            <InputNumber
              min={QR_DEFAULT_CONFIG.minSize}
              max={QR_DEFAULT_CONFIG.maxSize}
              step={QR_DEFAULT_CONFIG.stepSize}
              value={qrSize}
              onChange={setQrSize}
              style={styles.inputNumber}
            />
          </div>

          <div style={styles.textAlignCenter}>
            <Button type="primary" icon={<DownloadOutlined />} onClick={downloadQRCode}>
              Download QR Code
            </Button>
          </div>
        </Space>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        title="Delete Project"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="delete" type="primary" danger onClick={deleteProject}>
            Delete
          </Button>
        ]}
        width={400}
      >
        <p>Are you sure you want to delete this project? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default ProjectDetail;
