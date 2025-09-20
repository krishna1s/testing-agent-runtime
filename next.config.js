/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@opencode-ai/sdk']
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true
    }
    return config
  },
  env: {
    SESSION_ROOT: process.env.SESSION_ROOT || './sessions',
    OPENCODE_COMMAND: process.env.OPENCODE_COMMAND || 'opencode',
    OPENCODE_CONFIG_PATH: process.env.OPENCODE_CONFIG_PATH || './opencode.json',
    OPENCODE_DIR: process.env.OPENCODE_DIR || './.opencode',
    OPENCODE_LOG_LEVEL: process.env.OPENCODE_LOG_LEVEL || 'WARN',
    CORS_ORIGINS: process.env.CORS_ORIGINS || '*'
  }
}

module.exports = nextConfig