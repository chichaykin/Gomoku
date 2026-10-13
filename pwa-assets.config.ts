import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  head: {
    prompt: 'icon'
  },
  preset: minimal2023Preset,
  images: ['public/icon.svg']
})
