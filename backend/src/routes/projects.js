const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const Project = require('../models/Project');
const ApprovalRecord = require('../models/ApprovalRecord');
const User = require('../models/User');

/**
 * 辅助函数：验证项目所有者数量
 * @param {Array} owners - 所有者邮箱数组
 * @returns {boolean} - 是否符合要求
 */
const validateOwnerCount = (owners) => {
  return owners && owners.length >= 2;
};

/**
 * 辅助函数：验证目标URL格式
 * @param {string} url - 目标URL
 * @returns {boolean} - 是否符合格式要求
 */
const validateTargetUrl = (url) => {
  const urlRegex = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  return urlRegex.test(url);
};

/**
 * 辅助函数：将邮箱数组转换为用户ObjectId数组
 * @param {Array} emails - 所有者邮箱数组
 * @returns {Array} - 用户ObjectId数组
 */
const convertEmailsToUserIds = async (emails) => {
  const ownerIds = [];
  for (const email of emails) {
    let user = await User.findOne({ email });
    if (!user) {
      // 如果用户不存在，自动创建新用户记录
      user = new User({
        email,
        displayName: email.split('@')[0], // 使用邮箱前缀作为显示名称
        azureId: `temp-${email}`, // 临时azureId
        role: 'user'
      });
      await user.save();
    }
    ownerIds.push(user._id);
  }
  return ownerIds;
};

/**
 * 创建项目
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, owners, shortName, targetUrl } = req.body;
    
    // 验证至少有两个所有者
    if (!validateOwnerCount(owners)) {
      return res.status(400).json({ message: 'Project must have at least two owners' });
    }
    
    // 验证targetUrl格式
    if (!validateTargetUrl(targetUrl)) {
      return res.status(400).json({ message: 'Target URL must start with https://' });
    }
    
    // 将邮箱数组转换为用户ObjectId数组
    const ownerIds = await convertEmailsToUserIds(owners);
    
    // 创建新项目
    const project = new Project({
      name,
      description,
      owners: ownerIds,
      shortName,
      targetUrl,
      status: 'pending'
    });
    
    await project.save();
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: project._id,
      action: 'create',
      operator: req.user._id,
      previousStatus: null,
      newStatus: 'pending',
      comments: 'Project created'
    });
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * 获取当前用户作为所有者的所有项目
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({ owners: req.user._id })
      .populate('owners', 'displayName email')
      .populate('approvalInfo.approver', 'displayName')
      .sort({ 'stats.updatedAt': -1 });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * 获取单个项目详情
 * @param {string} req.params.id - 项目ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owners', 'displayName email')
      .populate('approvalInfo.approver', 'displayName');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 验证用户是否有权限查看（必须是所有者或管理员）
    const isOwner = project.owners.some(owner => owner._id.equals(req.user._id));
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to view this project' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * 更新项目
 * @param {string} req.params.id - 项目ID
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, owners, shortName, targetUrl } = req.body;
    
    // 验证至少有两个所有者
    if (!validateOwnerCount(owners)) {
      return res.status(400).json({ message: 'Project must have at least two owners' });
    }
    
    // 验证targetUrl格式
    if (!validateTargetUrl(targetUrl)) {
      return res.status(400).json({ message: 'Target URL must start with https://' });
    }
    
    // 将邮箱数组转换为用户ObjectId数组
    const ownerIds = await convertEmailsToUserIds(owners);
    
    // 查找项目
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 验证用户是否有权限更新（必须是所有者）
    if (!project.owners.some(owner => owner._id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Forbidden: You are not an owner of this project' });
    }
    
    // 保存旧状态
    const previousStatus = project.status;
    
    // 更新项目
    project.name = name;
    project.description = description;
    project.owners = ownerIds;
    project.shortName = shortName;
    project.targetUrl = targetUrl;
    project.status = 'pending'; // 更新后回到待审批状态
    project.stats.updatedAt = Date.now();
    
    await project.save();
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: project._id,
      action: 'update',
      operator: req.user._id,
      previousStatus,
      newStatus: 'pending',
      comments: 'Project updated'
    });
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * 删除项目
 * @param {string} req.params.id - 项目ID
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 确保ID是有效的ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // 查找项目
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 验证用户是否有权限删除（必须是所有者或管理员）
    const isOwner = project.owners.some(owner => owner._id.equals(req.user._id));
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this project' });
    }
    
    // 删除项目
    const deleteResult = await Project.deleteOne({ _id: id });
    
    if (deleteResult.deletedCount === 0) {
      return res.status(500).json({ message: 'Failed to delete project' });
    }
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: id,
      action: 'delete',
      operator: req.user._id,
      previousStatus: project.status,
      newStatus: null,
      comments: 'Project deleted'
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;