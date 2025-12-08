import { PublicClientApplication } from '@azure/msal-browser';

// MSAL配置
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID || '1a4f90e6-cfb2-49c8-806d-192e19241449',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID || '82d69786-2bb1-4e32-b78e-367dbbfaa7a5'}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173',
    postLogoutRedirectUri: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173'
  },
  cache: {
    cacheLocation: 'localStorage', // 改为localStorage以持久化登录状态
    storeAuthStateInCookie: true, // 启用cookie存储以支持跨标签页登录状态
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 'Error':
            console.error(message);
            return;
          case 'Info':
            console.info(message);
            return;
          case 'Verbose':
            console.debug(message);
            return;
          case 'Warning':
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: 'Info'
    }
  }
};

// 认证请求配置
const loginRequest = {
  scopes: ['openid', 'profile', 'email', `api://${import.meta.env.VITE_AZURE_AD_API_CLIENT_ID || '63ca854f-4643-44a6-8675-796c601a0c00'}/user_impersonation`]
};

// 实例化MSAL
const msalInstance = new PublicClientApplication(msalConfig);

export { msalInstance, loginRequest };
