const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // 项目基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // 项目所有者（至少两个用户）
  owners: [{
    type: String,
    required: true
  }],
  
  // 短链接信息
  shortName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  targetUrl: {
    type: String,
    required: true,
    trim: true
  },
  
  // 审批状态
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // 审批信息
  approvalInfo: {
    approver: {
      type: String
    },
    approvedAt: Date,
    comments: String
  },
  
  // 创建和更新时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // 统计信息
  stats: {
    clickCount: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
});

// 索引优化
projectSchema.index({ shortName: 1 });
projectSchema.index({ owners: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', projectSchema);