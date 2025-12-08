FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 声明构建参数
ARG VITE_API_URL
ARG VITE_AZURE_AD_CLIENT_ID
ARG VITE_AZURE_AD_TENANT_ID
ARG VITE_AZURE_AD_API_CLIENT_ID
ARG VITE_REDIRECT_URI
ARG VITE_SHORT_URL_DOMAIN

# 设置为环境变量，供构建时使用
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AZURE_AD_CLIENT_ID=$VITE_AZURE_AD_CLIENT_ID
ENV VITE_AZURE_AD_TENANT_ID=$VITE_AZURE_AD_TENANT_ID
ENV VITE_AZURE_AD_API_CLIENT_ID=$VITE_AZURE_AD_API_CLIENT_ID
ENV VITE_REDIRECT_URI=$VITE_REDIRECT_URI
ENV VITE_SHORT_URL_DOMAIN=$VITE_SHORT_URL_DOMAIN

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 使用 Nginx 作为生产服务器
FROM nginx:alpine

# 复制构建产物到 Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置文件（可选）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
