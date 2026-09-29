import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  server: {
    proxy: {
      '/api': {
        target: 'https://youtube-music.f8team.dev',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
