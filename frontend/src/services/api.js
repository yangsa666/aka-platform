import axios from 'axios';
import { msalInstance } from '../config/authConfig';

// 创建Axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证令牌
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 获取当前活动账号
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.warn('No accounts found, proceeding without token');
        return config;
      }

      // 获取访问令牌
      const accessToken = await msalInstance.acquireTokenSilent({
        account: accounts[0],
        scopes: ['api://63ca854f-4643-44a6-8675-796c601a0c00/user_impersonation'],
      });

      // 添加令牌到请求头
      config.headers.Authorization = `Bearer ${accessToken.accessToken}`;
    } catch (error) {
      // 如果静默获取令牌失败，尝试交互式获取
      if (error.name === 'InteractionRequiredAuthError') {
        console.warn('Token acquisition required interaction, proceeding without token');
        // 不抛出错误，让请求继续进行
      } else {
        console.warn('Error acquiring token, proceeding without token:', error.message);
        // 不抛出错误，让请求继续进行
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权错误
      console.error('Unauthorized access, please login again');
    }
    return Promise.reject(error);
  }
);

// API请求方法
export const api = {
  // Auth API
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },
  searchUsers: (query) => apiClient.get(`/auth/users?search=${query}`),

  // Projects API
  createProject: (data) => apiClient.post('/projects', data),
  getProjects: () => apiClient.get('/projects'),
  getProjectById: (id) => apiClient.get(`/projects/${id}`),
  updateProject: (id, data) => apiClient.put(`/projects/${id}`, data),
  deleteProject: (id) => apiClient.delete(`/projects/${id}`),

  // Admin API
  approveProject: (id, data) => apiClient.put(`/admin/approve/${id}`, data),
  getAllProjects: (params) => apiClient.get('/admin/projects', { params }),
  exportCsv: () => apiClient.get('/admin/export/csv', { responseType: 'blob' }),

  // Stats API
  getProjectTrends: (days) => apiClient.get(`/stats/trends/projects?days=${days}`),
  getClickTrends: (days) => apiClient.get(`/stats/trends/clicks?days=${days}`),
  getTopShortUrls: (days) => apiClient.get(`/stats/top/short-urls?days=${days}`),
  getTopUsers: (days) => apiClient.get(`/stats/top/users?days=${days}`)
};
