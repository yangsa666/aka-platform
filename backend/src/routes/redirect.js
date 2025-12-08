const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const AccessLog = require('../models/AccessLog');

// 重定向到目标URL
router.get('/*', async (req, res) => {
  try {
    // 从请求路径中提取短链接，去除开头的斜杠
    const shortName = req.path.slice(1);
    
    // 如果短链接为空，返回404
    if (!shortName) {
      return res.status(404).json({ message: 'Short URL not found' });
    }
    
    // 查找项目
    const project = await Project.findOne({ shortName });
    
    if (!project) {
      return res.status(404).json({ message: 'Short URL not found' });
    }
    
    // 检查项目是否已生效
    if (project.status !== 'approved') {
      return res.status(404).json({ message: 'This link is not active yet' });
    }
    
    // 增加点击计数
    project.stats.clickCount += 1;
    await project.save();
    
    // 创建访问日志
    await AccessLog.create({
      project: project._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || req.headers['referrer']
    });
    
    // 重定向到目标URL
    res.redirect(project.targetUrl);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;