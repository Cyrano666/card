import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const repoName=process.env.GITHUB_REPOSITORY?.split('/')[1]||'card'
// Capacitor serves the bundled web app from its local WebView origin.  Assets
// must therefore be relative ("./assets/...") inside an APK; otherwise the
// GitHub Actions environment would incorrectly apply the Pages repo prefix.
const base = process.env.CAPACITOR_BUILD === 'true' || process.env.CDN_BUILD === 'true'
  ? './'
  : process.env.GITHUB_ACTIONS === 'true'
    ? `/${repoName}/`
    : '/'
// CloudBase Console 安全域名需要包含本地开发地址：localhost:5173。
export default defineConfig({ base, plugins:[react()], server:{host:true}, build:{outDir:'dist'} })

