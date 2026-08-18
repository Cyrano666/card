# 一起打卡

双人使用的打卡应用：她安装 Android APK 打卡，你通过 iPhone 浏览器查看和管理。双方都能创建、编辑任务；照片和备注均可选。

## 本地预览

```powershell
npm install
npm run dev
```

没有云端配置时会自动显示演示界面。

## 接通同步

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，完整执行 `supabase/schema.sql`。
3. 在 Authentication → URL Configuration 填写部署后的网页地址；开发时加入 `http://localhost:5173`。
4. 复制 `.env.example` 为 `.env`，填写项目 URL 和 anon public key。
5. 先由你注册并选择“创建小家”，把 6 位邀请码发给她；她注册后选择“输入邀请码”。

## 网页部署

构建命令为 `npm run build`，输出目录是 `dist`。可部署到 Vercel、Cloudflare Pages 或其他静态托管服务，并在平台设置同名的两个 `VITE_` 环境变量。

## 生成 APK

项目包含 Capacitor Android 工程和 GitHub Actions 配置。把代码推送到 GitHub 后：

1. 在仓库 Settings → Secrets and variables → Actions 添加 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
2. 在 Actions 中运行 **Build Android APK**。
3. 完成后下载 `together-checkin-apk`，解压得到 `app-debug.apk`，即可发给她安装。

Debug APK 适合私下安装测试。正式长期使用时应生成并妥善保存签名密钥，再构建 release APK；否则未来无法覆盖升级。
