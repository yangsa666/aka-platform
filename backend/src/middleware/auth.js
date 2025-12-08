const jwt = require('jsonwebtoken');
const passport = require('passport');
const { BearerStrategy } = require('passport-azure-ad');
const User = require('../models/User');
const azureADConfig = require('../config/azure-ad');

// 创建一个简化的认证中间件，直接从令牌中提取用户信息
const authenticate = async (req, res, next) => {
  try {
    console.log('Custom authenticate middleware triggered');
    
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No Bearer token found in request headers');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token);
    
    // 解码JWT令牌以获取用户信息（不验证签名，仅用于提取信息）
    const decodedToken = jwt.decode(token, { complete: true });
    console.log('Decoded token:', JSON.stringify(decodedToken, null, 2));
    
    if (!decodedToken || !decodedToken.payload) {
      console.error('Invalid token');
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
    
    const userInfo = decodedToken.payload;
    // 打印完整的用户信息对象，以便调试
    console.log('Complete userInfo from token:', userInfo);
    
    // 获取用户ID（oid或sub）
    const userId = userInfo.oid || userInfo.sub;
    if (!userId) {
      console.error('No user ID found in token');
      return res.status(401).json({ message: 'Unauthorized: No user ID found in token' });
    }
    
    // 获取用户email地址（检查多个可能的字段）
    const userEmail = userInfo.email || userInfo.upn || userInfo.preferred_username;
    
    // 如果没有获取到email地址，使用基于userId的默认值
    const finalEmail = userEmail || `${userId}@example.com`;
    
    // 查找或创建用户
    // 1. 先通过azureId查找
    let user = await User.findOne({ azureId: userId });
    console.log('User found by azureId:', user ? user._id : 'null');
    
    // 2. 如果没有找到，再通过email查找
    if (!user && userEmail) {
      user = await User.findOne({ email: userEmail });
      console.log('User found by email:', user ? user._id : 'null');
      
      // 如果通过email找到了用户，更新其azureId
      if (user) {
        user.azureId = userId;
        console.log('Updated user azureId:', user._id);
      }
    }
    
    // 3. 如果两种方式都没有找到，才创建新用户
    if (!user) {
      console.log('Creating new user:', {
        azureId: userId,
        displayName: userInfo.name || userInfo.preferred_username,
        email: finalEmail,
        givenName: userInfo.given_name,
        surname: userInfo.family_name
      });
      
      // 检查是否为管理员用户（这里可以根据实际情况修改判断条件）
      const isAdmin = finalEmail === 'yangsa666@outlook.com'; // 示例：将特定邮箱设置为管理员
      
      user = await User.create({
        azureId: userId,
        displayName: userInfo.name || userInfo.preferred_username,
        email: finalEmail,
        givenName: userInfo.given_name,
        surname: userInfo.family_name,
        role: isAdmin ? 'admin' : 'user'
      });
      
      console.log('New user created:', user._id, 'Role:', user.role);
    } else {
      // 更新用户信息
      console.log('Updating existing user:', user._id);
      user.displayName = userInfo.name || userInfo.preferred_username;
      
      // 只有在获取到新的email地址时才更新email字段
      if (userEmail) {
        user.email = userEmail;
      }
      
      // 检查是否需要更新为管理员角色（这里可以根据实际情况修改判断条件）
      const shouldBeAdmin = finalEmail === 'yangsa666@outlook.com';
      if (shouldBeAdmin && user.role !== 'admin') {
        user.role = 'admin';
        console.log('User role updated to admin');
      }
      
      user.givenName = userInfo.given_name;
      user.surname = userInfo.family_name;
      user.lastLoginAt = Date.now();
      await user.save();
      console.log('User updated:', user._id, 'Role:', user.role);
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in custom authenticate middleware:', error);
    return res.status(401).json({ message: 'Unauthorized: Authentication failed' });
  }
};

// 授权中间件 - 检查用户角色
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };