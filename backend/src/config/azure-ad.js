// Azure AD Configuration
module.exports = {
  credentials: {
    clientID: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    tenantID: process.env.AZURE_AD_TENANT_ID,
    redirectUri: process.env.AZURE_AD_REDIRECT_URI
  },
  metadata: {
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    authorizationPath: '/oauth2/v2.0/authorize',
    tokenPath: '/oauth2/v2.0/token',
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`,
    endSessionEndpoint: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/logout`
  },
  settings: {
    validateIssuer: true,
    passReqToCallback: false,
    loggingLevel: 'info'
  },
  graphApi: {
    url: 'https://graph.microsoft.com/v1.0',
    scopes: ['https://graph.microsoft.com/.default']
  }
};