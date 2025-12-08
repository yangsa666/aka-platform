# AKA Platform - 企业级短链接管理平台

## 项目概述

AKA Platform是一个企业级短链接管理平台，提供安全、可靠的短链接生成、管理、审批和统计功能。系统支持Azure AD认证，实现了完善的权限控制和审批流程，帮助企业有效管理内部短链接资源。

## 系统架构

### 整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端应用      │────▶│   后端服务       │────▶│   数据库服务     │
│  (React + Antd) │     │ (Node.js + Express) │     │    (MongoDB)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       ▲
        ▼                       │
┌─────────────────┐     ┌─────────────────┐
│ Azure AD 认证   │◀────│   外部API       │
└─────────────────┘     └─────────────────┘
```

### 技术栈

| 分类         | 技术框架/工具                     | 版本要求    |
|------------|------------------------------|---------|
| 前端框架       | React                        | 18.x    |
| 构建工具       | Vite                         | 5.x     |
| UI组件库      | Ant Design                   | 5.x     |
| 后端框架       | Node.js + Express            | 18.x    |
| 数据库        | MongoDB                      | 5.0+    |
| 认证服务       | Azure AD (OAuth 2.0)         | -       |
| 容器化部署      | Docker + Docker Compose      | 20.x+   |

## 功能模块

### 1. 用户认证与授权
- Azure AD单点登录
- 基于角色的访问控制(RBAC)
- 用户信息同步

### 2. 短链接管理
- 短链接生成
- 自定义短链接名称
- 项目信息管理
- 状态跟踪（待审批、已批准、已拒绝）

### 3. 审批流程
- 管理员审批机制
- 审批历史记录
- 审批通知（待实现）

### 4. 统计分析
- 点击量统计
- 访问趋势分析
- 设备类型分布
- 地理位置统计（待实现）

### 5. 系统管理
- 用户管理（待实现）
- 系统监控
- 日志管理（待实现）

## 安装部署

### 本地开发

#### 前置条件
- Node.js 18.x+
- MongoDB 5.0+
- npm 或 yarn

#### 后端安装

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 复制环境变量示例文件并修改
cp .env.example .env

# 启动开发服务器
npm run dev
```

#### 前端安装

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 复制环境变量示例文件并修改
cp .env.example .env

# 启动开发服务器
npm run dev
```

### Docker部署

#### 前置条件
- Docker 20.x+
- Docker Compose 1.29+

#### 部署步骤

```bash
# 在项目根目录下执行
docker-compose up -d
```

## 环境变量配置

### 后端环境变量 (backend/.env)

```
# 服务器配置
PORT=3000
NODE_ENV=development

# MongoDB 连接配置
MONGO_URI=mongodb://localhost:27017/aka_platform

# Azure AD 配置
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/callback
AZURE_AD_SCOPES=openid profile email

# 前端配置
FRONTEND_URL=http://localhost:5173

# JWT 配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

### 前端环境变量 (frontend/.env)

```
# 构建配置
NODE_ENV=development

# API 配置
VITE_API_URL=http://localhost:3000

# Azure AD 配置
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5173
```

## API文档

### 认证相关

| 接口路径 | 方法 | 功能描述 | 权限要求 |
|--------|------|--------|--------|
| /auth/login | GET | 重定向到Azure AD登录页面 | 公开 |
| /auth/callback | GET | Azure AD回调处理 | 公开 |
| /auth/me | GET | 获取当前用户信息 | 已认证 |
| /auth/logout | GET | 登出系统 | 已认证 |

### 项目管理

| 接口路径 | 方法 | 功能描述 | 权限要求 |
|--------|------|--------|--------|
| /projects | POST | 创建新短链接项目 | 已认证 |
| /projects | GET | 获取用户项目列表 | 已认证 |
| /projects/:id | GET | 获取项目详情 | 已认证/管理员 |
| /projects/:id | PUT | 更新项目信息 | 项目所有者/管理员 |
| /projects/:id | DELETE | 删除项目 | 项目所有者/管理员 |

### 管理员接口

| 接口路径 | 方法 | 功能描述 | 权限要求 |
|--------|------|--------|--------|
| /admin/projects | GET | 获取所有项目列表 | 管理员 |
| /admin/projects/:id/approve | PUT | 批准项目 | 管理员 |
| /admin/projects/:id/reject | PUT | 拒绝项目 | 管理员 |
| /admin/stats | GET | 获取系统统计数据 | 管理员 |

### 统计接口

| 接口路径 | 方法 | 功能描述 | 权限要求 |
|--------|------|--------|--------|
| /stats/clicks/:shortName | GET | 获取短链接点击统计 | 项目所有者/管理员 |
| /stats/user | GET | 获取用户统计数据 | 已认证 |

### 短链接重定向

| 接口路径 | 方法 | 功能描述 | 权限要求 |
|--------|------|--------|--------|
| /:shortName | GET | 短链接重定向 | 公开 |

## 项目结构

### 后端项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── azureAd.js   # Azure AD配置
│   │   └── database.js  # 数据库配置
│   ├── controllers/     # 控制器
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── adminController.js
│   │   └── statsController.js
│   ├── middleware/      # 中间件
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/          # 数据模型
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Click.js
│   ├── routes/          # 路由
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── adminRoutes.js
│   │   └── statsRoutes.js
│   ├── services/        # 业务逻辑
│   │   ├── authService.js
│   │   ├── projectService.js
│   │   └── statsService.js
│   └── index.js         # 应用入口
├── .env.example         # 环境变量示例
├── package.json
└── Dockerfile
```

### 前端项目结构

```
frontend/
├── src/
│   ├── components/      # 通用组件
│   │   ├── Layout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # 页面组件
│   │   ├── LoginPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ProjectList.jsx
│   │   ├── ProjectForm.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ProjectApproval.jsx
│   ├── services/        # API服务
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── projectService.js
│   ├── utils/           # 工具函数
│   ├── App.jsx          # 应用组件
│   ├── main.jsx         # 应用入口
│   └── theme.js         # 主题配置
├── .env.example         # 环境变量示例
├── package.json
└── Dockerfile
```

## 开发指南

### 代码规范

- 前端：使用ESLint和Prettier进行代码检查和格式化
- 后端：使用ESLint进行代码检查

### 提交规范

遵循Conventional Commits规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

常用type：
- feat: 添加新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式修改
- refactor: 代码重构
- test: 测试用例更新
- chore: 构建过程或辅助工具的变动

## 许可证

MIT License

## 联系信息

如有问题或建议，请联系项目维护团队：
- 项目地址：https://github.com/your-organization/aka-platform
- 邮件：support@aka-platform.com
