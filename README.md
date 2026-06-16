# B-Press

B-Press 是一个轻量级、优雅的博客系统，基于 Node.js 和 SQLite 构建。它提供了完整的文章、独立页面、分类、标签管理功能，并且支持多主题切换与自定义设置。

## ✨ 特性 (Features)

- **轻量快速**：基于 Node.js 与 SQLite，无需复杂的数据库配置，即装即用。
- **现代化后台**：提供直观的管理后台，支持文章、独立页面、分类、标签的创建与编辑。
- **多主题支持**：内置 `Default` 和 `Sea Foam` 两款精美主题，支持一键切换。
- **丰富的自定义选项**：
  - 支持多模式的头图展示（文章内、标题上方、左侧布局等）。
  - 支持主题独立设置。
  - 全局统一的精美排版（集成 Google Fonts，使用 Inter 与 Noto Sans SC 字体）。
- **完善的导航机制**：支持文章上下篇导航，独立的侧边栏渲染等。

## 🚀 待办与计划 (Roadmap)

- [ ] 首页顶部图片轮播功能
- [ ] 首页顶部文章轮播功能

## 🛠️ 安装与运行 (Installation & Usage)

1. **克隆项目**
   ```bash
   git clone <repository_url>
   cd b-press
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   node server.js
   ```
   *推荐使用 `pm2` 或其他进程管理工具进行生产环境部署。*

4. **初始化安装**
   打开浏览器访问 `http://localhost:3000`，系统将自动引导进入安装界面，设置管理员账号密码及博客基本信息。

## 📂 目录结构 (Directory Structure)

- `/admin`：管理后台的前端页面及静态资源。
- `/data`：SQLite 数据库及配置文件的存储目录（自动生成）。
- `/public`：系统公共的静态资源（上传的图片、附件等）。
- `/routes`：后端 API 及页面路由控制器。
- `/themes`：前台主题目录，每款主题具有独立的配置、视图（EJS）及静态资源。
- `server.js`：应用程序的入口文件。

## 📝 许可证 (License)

[MIT License](LICENSE)
