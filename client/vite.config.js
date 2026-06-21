import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  // pastel-vue ships raw .vue source, so keep esbuild from pre-bundling it and
  // let plugin-vue compile the SFCs from node_modules
  optimizeDeps: { exclude: ['pastel-vue'] },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000/devtools',
      '/test': 'http://localhost:3000',
    },
  },
})
