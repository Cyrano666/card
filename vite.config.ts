import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const repoName=process.env.GITHUB_REPOSITORY?.split('/')[1]||'card'
export default defineConfig({ base: process.env.GITHUB_ACTIONS === 'true' ? `/${repoName}/` : '/', plugins:[react()], server:{host:true}, build:{outDir:'dist'} })
