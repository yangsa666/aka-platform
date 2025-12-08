const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  // 关联到项目
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  
  // 访问信息
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  referrer: {
    type: String
  },
  
  // 地理位置信息（可选）
  geoLocation: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  
  // 访问时间
  accessedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引优化
accessLogSchema.index({ project: 1 });
accessLogSchema.index({ accessedAt: 1 });

module.exports = mongoose.model('AccessLog', accessLogSchema);