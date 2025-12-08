const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Project = require('../models/Project');
const ApprovalRecord = require('../models/ApprovalRecord');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { pipeline } = require('stream');

// 审批项目
router.put('/approve/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { status, comments } = req.body;
    
    // 查找项目
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 验证状态
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either approved or rejected' });
    }
    
    // 保存旧状态
    const previousStatus = project.status;
    
    // 更新项目状态
    project.status = status;
    project.approvalInfo = {
      approver: req.user._id,
      approvedAt: Date.now(),
      comments
    };
    
    await project.save();
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: project._id,
      action: status === 'approved' ? 'approve' : 'reject',
      operator: req.user._id,
      previousStatus,
      newStatus: status,
      comments
    });
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 查询所有项目（管理员）
router.get('/projects', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { targetUrl: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    // 执行查询
    const projects = await Project.find(query)
      .populate('owners', 'displayName email')
      .populate('approvalInfo.approver', 'displayName')
      .sort({ 'stats.updatedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // 获取总数
    const total = await Project.countDocuments(query);
    
    res.json({ projects, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 导出所有项目为CSV
router.get('/export/csv', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // 获取所有项目
    const projects = await Project.find({})
      .populate('owners', 'displayName email')
      .populate('approvalInfo.approver', 'displayName');
    
    // CSV配置
    const csvWriter = createCsvWriter({
      header: [
        { id: 'name', title: 'Project Name' },
        { id: 'description', title: 'Description' },
        { id: 'shortName', title: 'Short Name' },
        { id: 'targetUrl', title: 'Target URL' },
        { id: 'status', title: 'Status' },
        { id: 'owners', title: 'Owners' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' },
        { id: 'approver', title: 'Approver' },
        { id: 'approvedAt', title: 'Approved At' },
        { id: 'clickCount', title: 'Click Count' }
      ]
    });
    
    // 转换项目数据
    const csvData = projects.map(project => ({
      name: project.name,
      description: project.description,
      shortName: project.shortName,
      targetUrl: project.targetUrl,
      status: project.status,
      owners: project.owners.map(o => `${o.displayName} (${o.email})`).join(', '),
      createdAt: project.stats.createdAt.toISOString(),
      updatedAt: project.stats.updatedAt.toISOString(),
      approver: project.approvalInfo?.approver?.displayName || '',
      approvedAt: project.approvalInfo?.approvedAt ? new Date(project.approvalInfo.approvedAt).toISOString() : '',
      clickCount: project.stats.clickCount
    }));
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aka-projects-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // 写入CSV
    const csvStream = csvWriter.createCsvStreamWriter(res);
    await pipeline(
      require('stream').Readable.from(csvData),
      csvStream
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;