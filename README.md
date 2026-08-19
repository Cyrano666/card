# 一起打卡

在线地址（部署完成后）：https://cyrano666.github.io/punch-card/

双人使用的打卡应用：TA 可安装 Android APK，你也可以用 iPhone 浏览器访问。两个人权限完全相同，都能打卡、查看、创建和编辑任务；照片和备注均可选。

Android 端首次进入小家时会请求通知权限，并安排每天 14:00、18:00 的提醒，提示查看是否还有未完成的打卡。

## 本地预览

```powershell
npm install
npm run dev
```

没有云端配置时会自动显示演示界面。

## 接通国内同步（CloudBase PostgreSQL）

1. 在腾讯云 CloudBase 创建 PostgreSQL 模式环境。
2. 在 CloudBase PostgreSQL SQL 编辑器完整执行 `supabase/cloudbase-pg-schema.sql`。
3. 在身份认证中开启用户名/密码登录，并将网页域名加入安全域名。
4. 复制 `.env.example` 为 `.env`，填写 CloudBase 环境 ID、地域和（可选）Publishable Key。
5. 任意一人注册并选择“创建我们的打卡空间”，把 6 位邀请码发给 TA；TA 注册后选择“加入已有打卡空间”。

## 网页部署

构建命令为 `npm run build`，输出目录是 `dist`。可部署到腾讯云 CloudBase 静态托管或其他静态托管服务，并设置 `VITE_CLOUDBASE_*` 环境变量。

## 生成 APK

项目包含 Capacitor Android 工程和 GitHub Actions 配置。把代码推送到 GitHub 后：

1. 如需覆盖默认环境，在仓库 Settings → Secrets and variables → Actions 添加 `VITE_CLOUDBASE_ENV_ID`、`VITE_CLOUDBASE_REGION` 和 `VITE_CLOUDBASE_PUBLISHABLE_KEY`。
2. 在 Actions 中运行 **Build Android APK**。
3. 完成后下载 `together-checkin-apk`，解压得到 `app-debug.apk`，即可发给她安装。

Debug APK 适合私下安装测试。正式长期使用时应生成并妥善保存签名密钥，再构建 release APK；否则未来无法覆盖升级。
