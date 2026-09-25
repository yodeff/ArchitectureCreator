import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages ではリポジトリ名のパス（/<repo>/）の下で配信されるため、相対パスで出力する
  base: './',
  plugins: [react()],
})
