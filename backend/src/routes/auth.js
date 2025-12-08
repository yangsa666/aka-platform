const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const { searchUsers } = require('../services/graph-api');

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 获取用户列表（搜索功能）
router.get('/users', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    
    // 如果没有搜索条件，返回空列表
    if (!search) {
      return res.json([]);
    }
    
    let users = [];
    
    try {
      // 从 Graph API 搜索用户
      console.log(`Attempting to search users from Graph API with query: ${search}`);
      const graphUsers = await searchUsers(search);
      
      // 转换用户数据格式以匹配前端期望的格式
      users = graphUsers.map(user => {
        // 确保有正确的邮箱字段
        const email = user.mail || user.userPrincipalName;
        return {
          // 使用 Azure AD 用户 ID 作为唯一标识
          _id: user.id,
          azureId: user.id,
          displayName: user.displayName,
          email: email,
          givenName: user.givenName,
          surname: user.surname,
          // 使用默认角色
          role: 'user'
        };
      });
      
      console.log(`Successfully found ${users.length} users from Graph API`);
    } catch (graphError) {
      console.error('Error searching users from Graph API:', graphError);
      console.error('Falling back to local database search');
      
      // 回退到本地数据库搜索
      const query = {
        $or: [
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
      
      users = await User.find(query).select('-__v').limit(20);
      console.log(`Found ${users.length} users from local database`);
      
      // 如果本地数据库没有找到用户，返回空数组
      if (users.length === 0) {
        console.log('No users found in local database');
      }
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error in /users route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;