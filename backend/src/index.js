const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// 导入认证中间件
const auth = require('./middleware/auth');

// 添加请求日志中间件记录认证结果
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.user) {
      console.log(`[${new Date().toISOString()}] Authentication successful for user: ${req.user._id}`);
    } else if (res.statusCode === 401) {
      console.log(`[${new Date().toISOString()}] Authentication failed for ${req.path}`);
    }
  });
  next();
});


// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stats', require('./routes/stats'));

// Redirect route for short links
app.use('/', require('./routes/redirect'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AKA Platform Backend is running' });
});

// Server listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});