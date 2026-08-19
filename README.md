# 一起打卡

一个给两个人使用的轻量打卡空间。两个人使用同一个应用、权限完全相同，都可以创建/编辑任务、打卡、查看记录和切换空间；照片和备注均为可选。TA 可以安装 Android APK，你可以直接用 iPhone 浏览器访问。

当前网页地址：<https://fx-d8gsy0r867fcba5ca-1471555634.tcloudbaseapp.com>

## 当前功能

- 手机号 + 密码注册、登录；注册和忘记密码使用短信验证码。
- 通过 6 位邀请码创建或加入打卡空间，同一账号可在多个空间间切换。
- 创建、编辑、完成和删除任务；可设置每日任务和截止时间。
- 记录页查看历史完成情况；完成后显示鼓励动画和随机箴言。
- Android 首次进入空间时请求通知权限，并在每天 14:00、18:00 安排“还有未完成打卡吗？”本地提醒。网页端不会发送系统通知。
- 可选上传照片；未选择照片也可以正常打卡。

## 本地开发

```powershell
npm install
npm run dev
```

没有云端环境变量时会进入演示模式。生产构建和类型检查：

```powershell
npm run build
npm run preview
```

## CloudBase PostgreSQL 接入

项目使用腾讯云 CloudBase 的 PostgreSQL 模式和 CloudBase JS SDK，不需要 Supabase 项目。

1. 创建 CloudBase PostgreSQL 模式环境（当前环境：`fx-d8gsy0r867fcba5ca`，地域：`ap-shanghai`）。
2. 在 PostgreSQL SQL 编辑器完整执行 [`supabase/cloudbase-pg-schema.sql`](supabase/cloudbase-pg-schema.sql)。
3. 在 CloudBase 身份认证中开启“手机号登录”，关闭邮箱登录；短信服务需要先在控制台完成资质、签名和模板配置。
4. 将网页域名加入安全域名，并允许 Android 应用使用对应接口。
5. 复制 `.env.example` 为 `.env`，填写环境 ID、地域和（可选）Publishable Key：

```dotenv
VITE_CLOUDBASE_ENV_ID=fx-d8gsy0r867fcba5ca
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_PUBLISHABLE_KEY=your-publishable-key
```

数据库表、索引和行级权限都在 SQL 文件中。不要把管理密钥、数据库密码或服务端密钥写进 `.env`、前端代码或 GitHub；浏览器/APP 只使用 Publishable Key。

## 网页部署

`npm run build` 的输出目录是 `dist`。可以部署到 CloudBase 静态托管或其他静态托管服务，并在构建环境注入 `VITE_CLOUDBASE_*` 变量。CloudBase 部署示例：

```powershell
npm run build
tcb hosting deploy dist / --envId fx-d8gsy0r867fcba5ca
```

国内网络访问异常时，优先使用 CloudBase 域名而不是 GitHub Pages；首次打开若仍显示旧页面，请强制刷新或清除站点缓存。

## Android APK

项目包含 Capacitor Android 工程和 GitHub Actions 工作流 `.github/workflows/android-apk.yml`。

本地同步 Android 工程：

```powershell
npm run android:sync
npm run android:open
```

GitHub Actions 构建：

1. 在仓库 Settings → Secrets and variables → Actions 添加 `VITE_CLOUDBASE_ENV_ID`、`VITE_CLOUDBASE_REGION` 和 `VITE_CLOUDBASE_PUBLISHABLE_KEY`。
2. 推送 `v*` 标签，或在 Actions 手动运行 **Build Android APK**。
3. 下载构建产物 `together-checkin-apk`，解压得到 `app-debug.apk`，即可发给 TA 安装测试。

Debug APK 适合私下测试；要长期升级，请配置 Android 签名密钥并构建 release APK，否则后续版本无法覆盖安装。

## 微信小程序

小程序适配代码已放在 [`miniprogram/`](miniprogram/)，使用微信原生身份登录并复用 CloudBase PostgreSQL 数据；当前配置的 AppID 为 `wxaf6492eaedcec6b2`。导入微信开发者工具后执行“工具 → 构建 npm”。完整的名称、简介、存储权限和提审前检查清单见 [`docs/wechat-mini-program.md`](docs/wechat-mini-program.md)。

## 常见问题

- **点击登录/创建没有反应**：查看页面底部的错误提示；通常是短信服务未开通、验证码过期、手机号格式不正确，或数据库 SQL 未完整执行。
- **以前的邮箱/用户名账号无法登录**：当前版本已切换为手机号登录，旧账号不会自动合并。使用手机号重新注册即可；如需保留旧空间，请先用旧账号导出或联系管理员迁移数据。
- **网页白屏**：确认 CloudBase 域名可访问，强制刷新，并检查浏览器控制台是否加载到了最新 `dist` 资源。
- **收不到短信**：检查 CloudBase 短信签名、模板、地域和频率限制；验证码只在请求它的手机号上有效。

## 目录说明

- `src/`：React 页面、CloudBase 数据访问、通知和样式。
- `supabase/cloudbase-pg-schema.sql`：CloudBase PostgreSQL 建表、索引和权限 SQL（目录名沿用历史命名）。
- `android/`：Capacitor Android 工程。
- `.github/workflows/android-apk.yml`：自动构建 APK。

