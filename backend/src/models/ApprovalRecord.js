const mongoose = require('mongoose');

const approvalRecordSchema = new mongoose.Schema({
  // 关联到项目
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  
  // 审批操作信息
  action: {
    type: String,
    enum: ['create', 'update', 'approve', 'reject', 'delete'],
    required: true
  },
  
  // 操作用户
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 审批前后状态
  previousStatus: String,
  newStatus: String,
  
  // 审批备注
  comments: String,
  
  // 操作时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引优化
approvalRecordSchema.index({ project: 1 });
approvalRecordSchema.index({ createdAt: 1 });
approvalRecordSchema.index({ operator: 1 });

module.exports = mongoose.model('ApprovalRecord', approvalRecordSchema);