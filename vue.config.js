const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    client: {
      overlay: {
        runtimeErrors: error => !error.message.startsWith('ResizeObserver loop completed with undelivered notifications') &&
          !error.message.startsWith('ResizeObserver loop limit exceeded')
      }
    },
    proxy: {
      '/api': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  }
})
