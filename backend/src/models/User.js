const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Azure AD 相关字段
  azureId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  givenName: String,
  surname: String,
  jobTitle: String,
  department: String,
  companyName: String,
  // 系统角色
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // 其他信息
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: Date
});

module.exports = mongoose.model('User', userSchema);