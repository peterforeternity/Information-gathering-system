# 成绩管理系统生产镜像：构建前端并由 Express 单服务托管前端与 API
FROM node:22-alpine

WORKDIR /app

# 先复制依赖清单以利用构建缓存
COPY package*.json ./
RUN npm install

# 复制源码并构建前端产物（dist）
COPY . .
RUN npm run build

# 生产环境变量：DATA_DIR 指向持久化卷挂载点
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# 平台通常通过 PORT 环境变量注入端口；本地默认 3001
EXPOSE 3001

CMD ["npm", "start"]
