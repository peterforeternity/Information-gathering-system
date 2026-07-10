/**
 * server entry file, for local development and production deployment.
 */
import app from './app.js'
import { ensureInitialized } from './init.js'

// 启动前检查并初始化数据库（全新部署时自动创建 admin + demo 数据）
ensureInitialized()

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;