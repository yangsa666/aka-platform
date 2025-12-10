const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Project = require('../models/Project');
const AccessLog = require('../models/AccessLog');

// 获取项目创建趋势
router.get('/trends/projects', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // 按天分组统计项目创建数量
    const trends = await Project.aggregate([
      {
        $match: {
          'stats.createdAt': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$stats.createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 获取跳转访问量趋势
router.get('/trends/clicks', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // 按天分组统计访问量
    const trends = await AccessLog.aggregate([
      {
        $match: {
          accessedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$accessedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 获取Top 10热门短链接
router.get('/top/short-urls', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // 统计短链接点击量
    const topShortUrls = await AccessLog.aggregate([
      {
        $match: {
          accessedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      {
        $unwind: '$projectInfo'
      },
      {
        $group: {
          _id: '$projectInfo.shortName',
          targetUrl: { $first: '$projectInfo.targetUrl' },
          clickCount: { $sum: 1 }
        }
      },
      {
        $sort: { clickCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json(topShortUrls);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 获取Top用户
router.get('/top/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // 统计用户创建的项目数量
    const topUsers = await Project.aggregate([
      {
        $match: {
          'stats.createdAt': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $unwind: { path: '$owners', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$owners',
          projectCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'azureId',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$userInfo._id',
          displayName: {
            $ifNull: ['$userInfo.displayName', 'Unknown User']
          },
          email: {
            $ifNull: ['$userInfo.email', 'unknown@example.com']
          },
          projectCount: 1
        }
      },
      {
        $sort: { projectCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;