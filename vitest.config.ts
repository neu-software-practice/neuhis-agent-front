import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'references'],
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: true,
      passWithNoTests: true,
    },
  }),
)
