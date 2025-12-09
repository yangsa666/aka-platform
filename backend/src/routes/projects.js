const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const Project = require('../models/Project');
const ApprovalRecord = require('../models/ApprovalRecord');
const User = require('../models/User');
const { searchUsers, getUserById } = require('../services/graph-api');


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
    
    // 检查shortName是否已经存在
    const existingProject = await Project.findOne({ shortName });
    if (existingProject) {
      return res.status(400).json({ message: 'Short name already exists' });
    }
    
    // 创建新项目
    const project = new Project({
      name,
      description,
      owners: owners,
      shortName,
      targetUrl,
      status: 'pending'
    });
    
    await project.save();
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: project._id,
      action: 'create',
      operator: req.user.azureId,
      previousStatus: null,
      newStatus: 'pending',
      comments: 'Project created'
    });
    
    // 将Mongoose文档转换为普通JavaScript对象
    const projectObj = project.toObject();
    
    // 添加调试日志，检查projectObj是否包含shortName字段
    console.log(`Project object after toObject():`, JSON.stringify(projectObj, null, 2));
    console.log(`Project shortName:`, projectObj.shortName);
    
    // 将owners数组中的azureId转换为完整的用户信息
    const formattedOwners = await Promise.all(projectObj.owners.map(async (azureId) => {
      try {
        // 直接通过Graph API获取用户信息
        console.log(`Getting user ${azureId} from Graph API for new project`);
        const matchedUser = await getUserById(azureId);
        
        if (matchedUser) {
          // 将Graph API返回的用户信息转换为与本地用户一致的格式
          return {
            azureId: matchedUser.id,
            displayName: matchedUser.displayName,
            email: matchedUser.mail || matchedUser.userPrincipalName || `${azureId}@unknown.com`
          };
        } else {
          // 如果Graph API也没有找到用户，返回一个默认对象
          return {
            azureId,
            displayName: 'Unknown User',
            email: `${azureId}@unknown.com`
          };
        }
      } catch (graphError) {
        console.error(`Error getting user ${azureId} from Graph API for new project:`, graphError);
        // 如果Graph API调用失败，返回一个默认对象
        return {
          azureId,
          displayName: 'Unknown User',
          email: `${azureId}@unknown.com`
        };
      }
    }));
    
    projectObj.owners = formattedOwners;
    
    res.status(201).json(projectObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * 获取当前用户作为所有者的所有项目
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({ owners: req.user.azureId })
      .sort({ 'stats.updatedAt': -1 });
    
    // 将所有项目的owners转换为完整的用户信息
    for (const project of projects) {
      const ownerDetailsMap = new Map();
      
      // 保持原顺序，确保所有owner都被显示
      const formattedOwners = await Promise.all(project.owners.map(async (azureId) => {
        try {
          // 直接通过Graph API获取用户信息
          console.log(`Getting user ${azureId} from Graph API`);
          const matchedUser = await getUserById(azureId);
          
          if (matchedUser) {
            // 将Graph API返回的用户信息转换为与本地用户一致的格式
            const formattedUser = {
              azureId: matchedUser.id,
              displayName: matchedUser.displayName,
              email: matchedUser.mail || matchedUser.userPrincipalName || `${azureId}@unknown.com`
            };
            
            // 将用户信息存入map，以便后续使用
            ownerDetailsMap.set(azureId, formattedUser);
            
            return formattedUser;
          } else {
            // 如果Graph API也没有找到用户，返回一个默认对象
            return {
              azureId,
              displayName: 'Unknown User',
              email: `${azureId}@unknown.com`
            };
          }
        } catch (graphError) {
          console.error(`Error getting user ${azureId} from Graph API:`, graphError);
          // 如果Graph API调用失败，返回一个默认对象
          return {
            azureId,
            displayName: 'Unknown User',
            email: `${azureId}@unknown.com`
          };
        }
      }));
      
      project.owners = formattedOwners;
    }
    
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
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 验证用户是否有权限查看（必须是所有者或管理员）
    const isOwner = project.owners.includes(req.user.azureId);
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to view this project' });
    }
    
    // 将Mongoose文档转换为普通JavaScript对象
    const projectObj = project.toObject();
    
    // 将owners数组中的azureId转换为完整的用户信息
    const ownerDetailsMap = new Map();
    
    // 保持原顺序，确保所有owner都被显示
    console.log(`Original project owners:`, projectObj.owners);
    const formattedOwners = await Promise.all(projectObj.owners.map(async (azureId) => {
      try {
        // 直接通过Graph API获取用户信息
        console.log(`Getting user ${azureId} from Graph API`);
        const matchedUser = await getUserById(azureId);
        
        console.log(`Graph API response for ${azureId}:`, JSON.stringify(matchedUser, null, 2));
        
        if (matchedUser) {
          // 将Graph API返回的用户信息转换为与本地用户一致的格式
          const formattedUser = {
            azureId: matchedUser.id,
            displayName: matchedUser.displayName,
            email: matchedUser.mail || matchedUser.userPrincipalName || `${azureId}@unknown.com`
          };
          
          console.log(`Formatted user for ${azureId}:`, formattedUser);
          
          // 将用户信息存入map，以便后续使用
          ownerDetailsMap.set(azureId, formattedUser);
          
          return formattedUser;
        } else {
          // 如果Graph API也没有找到用户，返回一个默认对象
          return {
            azureId,
            displayName: 'Unknown User',
            email: `${azureId}@unknown.com`
          };
        }
      } catch (graphError) {
        console.error(`Error getting user ${azureId} from Graph API:`, graphError);
        // 如果Graph API调用失败，返回一个默认对象
        return {
          azureId,
          displayName: 'Unknown User',
          email: `${azureId}@unknown.com`
        };
      }
    }));

    console.log(`Formatted owners array:`, formattedOwners);
    
    projectObj.owners = formattedOwners;
    
    console.log(`Final project object being returned:`, JSON.stringify(projectObj, null, 2));
    
    res.json(projectObj);
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
    
    // 查找项目
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // 检查shortName是否已经被其他项目使用
    if (shortName !== project.shortName) {
      const existingProject = await Project.findOne({ shortName });
      if (existingProject) {
        return res.status(400).json({ message: 'Short name already exists' });
      }
    }
    
    // 验证用户是否有权限更新（必须是所有者）
    if (!project.owners.includes(req.user.azureId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an owner of this project' });
    }
    
    // 保存旧状态
    const previousStatus = project.status;
    
    // 更新项目
    project.name = name;
    project.description = description;
    project.owners = owners;
    project.shortName = shortName;
    project.targetUrl = targetUrl;
    project.status = 'pending'; // 更新后回到待审批状态
    project.stats.updatedAt = Date.now();
    
    await project.save();
    
    // 创建审批记录
    await ApprovalRecord.create({
      project: project._id,
      action: 'update',
      operator: req.user.azureId,
      previousStatus,
      newStatus: 'pending',
      comments: 'Project updated'
    });
    
    // 将Mongoose文档转换为普通JavaScript对象
    const projectObj = project.toObject();
    
    // 将owners数组中的azureId转换为完整的用户信息
    const formattedOwners = await Promise.all(projectObj.owners.map(async (azureId) => {
      try {
        // 直接通过Graph API获取用户信息
        console.log(`Getting user ${azureId} from Graph API for updated project`);
        const matchedUser = await getUserById(azureId);
        
        if (matchedUser) {
          // 将Graph API返回的用户信息转换为与本地用户一致的格式
          return {
            azureId: matchedUser.id,
            displayName: matchedUser.displayName,
            email: matchedUser.mail || matchedUser.userPrincipalName || `${azureId}@unknown.com`
          };
        } else {
          // 如果Graph API也没有找到用户，返回一个默认对象
          return {
            azureId,
            displayName: 'Unknown User',
            email: `${azureId}@unknown.com`
          };
        }
      } catch (graphError) {
        console.error(`Error getting user ${azureId} from Graph API for updated project:`, graphError);
        // 如果Graph API调用失败，返回一个默认对象
        return {
          azureId,
          displayName: 'Unknown User',
          email: `${azureId}@unknown.com`
        };
      }
    }));
    
    projectObj.owners = formattedOwners;
    
    res.json(projectObj);
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
    const isOwner = project.owners.includes(req.user.azureId);
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
      operator: req.user.azureId,
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