const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const azureADConfig = require('../config/azure-ad');

// 创建一个单例的 Graph API 客户端
let graphClient = null;

// 获取 Graph API 客户端
const getGraphClient = () => {
  if (!graphClient) {
    console.log('Creating new Graph API client...');
    console.log('Azure AD Config:', {
      tenantID: azureADConfig.credentials.tenantID,
      clientID: azureADConfig.credentials.clientID,
      clientSecretExists: !!azureADConfig.credentials.clientSecret,
      scopes: azureADConfig.graphApi.scopes
    });

    // 使用客户端凭证流获取访问令牌
    const credential = new ClientSecretCredential(
      azureADConfig.credentials.tenantID,
      azureADConfig.credentials.clientID,
      azureADConfig.credentials.clientSecret
    );

    // 创建 Graph API 客户端
    graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          try {
            console.log('Acquiring Graph API token with scopes:', azureADConfig.graphApi.scopes);
            const token = await credential.getToken(azureADConfig.graphApi.scopes);
            console.log('Graph API token acquired successfully');
            return token.token;
          } catch (error) {
            console.error('Error getting Graph API token:', error);
            console.error('Token acquisition error details:', error.stack);
            throw error;
          }
        }
      },
      debugLogging: true
    });
  }
  return graphClient;
};

// 搜索用户
const searchUsers = async (query) => {
  const client = getGraphClient();
  try {
    console.log(`Searching users with query: ${query}`);
    const result = await client
      .api('/users')
      .filter(`(startswith(displayName, '${query}') or startswith(mail, '${query}') or startswith(userPrincipalName, '${query}'))`)
      .select('id,displayName,mail,givenName,surname,userPrincipalName')
      .top(20)
      .get();

    console.log(`Graph API raw result:`, JSON.stringify(result, null, 2));
    
    // 确保返回的值是数组
    const users = result.value || [];
    console.log(`Found ${users.length} users from Graph API`);
    return users;
  } catch (error) {
    console.error('Error searching users in Graph API:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.statusCode);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Full error object:', error);
    
    // 重新抛出错误以便上层处理
    throw error;
  }
};

// 获取所有用户（可选，用于测试）
const getAllUsers = async () => {
  const client = getGraphClient();
  try {
    const result = await client
      .api('/users')
      .select('id,displayName,mail,givenName,surname')
      .top(10)
      .get();

    return result.value;
  } catch (error) {
    console.error('Error getting all users from Graph API:', error);
    throw error;
  }
};

module.exports = {
  searchUsers,
  getAllUsers
};
