# 成绩管理系统（Grade Management System）

一个面向学校/班级场景的成绩管理系统，支持用户注册登录、学生信息维护、成绩录入与表格化展示，数据以文件形式持久化到本地。前后端一体，生产环境由单个 Express 服务同时托管前端页面与 API。

## 功能特性

- **用户认证**：注册（管理员 / 学生角色）、登录、登出；密码使用 scrypt 加盐哈希存储，会话基于 token。
- **学生管理**（管理员）：学生信息的新增、编辑、删除，学号唯一校验，删除时级联清除其成绩。
- **成绩管理**：成绩录入（0–100 校验，同一学生同科目自动覆盖更新）；表格展示所有学生各科成绩与平均分，支持按任意列排序；学生角色可只读查看。
- **数据持久化**：数据以 JSON 文件存储于本地 `data/` 目录，采用原子写入，重启后数据不丢失。

## 技术栈

- 前端：React 18 + TypeScript + Vite + TailwindCSS + zustand + React Router
- 后端：Express 4 + TypeScript（tsx 运行）
- 存储：本地 JSON 文件（支持 `DATA_DIR` 环境变量指向持久化卷）

## 本地开发

```bash
npm install
npm run dev
```

- 前端开发服务器：http://localhost:5173
- 后端 API 服务器：http://localhost:3001（Vite 自动代理 `/api`）

首次使用请先注册一个管理员账号。

## 生产构建与运行

```bash
npm run build   # 构建前端到 dist/
npm start       # 生产模式启动，Express 同时托管前端与 API
```

启动后访问服务端口（默认 `3001`，或由环境变量 `PORT` 指定）。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口 | `3001` |
| `NODE_ENV` | 设为 `production` 时托管前端构建产物 | — |
| `DATA_DIR` | 数据文件存放目录（部署时指向持久化卷） | `./data` |

## Docker 部署

```bash
docker build -t gms .
docker run -d -p 80:3001 -v gms-data:/app/data gms
```

`-v gms-data:/app/data` 通过数据卷持久化成绩数据（镜像内 `DATA_DIR` 已设为 `/app/data`）。同一镜像可部署到 Railway、Render、Fly.io 或任意支持 Docker 的服务器。

## 目录结构

```
api/          后端（Express）
  routes/     认证、学生、成绩路由
  auth.ts     鉴权与密码哈希
  store.ts    JSON 文件持久化
src/          前端（React）
  pages/      登录、学生管理、成绩管理页面
  components/ 通用组件（导航、弹窗、表单）
  store/      zustand 状态管理
Dockerfile    生产镜像
```
