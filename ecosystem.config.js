module.exports = {
  apps: [
    {
      name: 'openlearn-api',
      script: 'dist/server.js',
      instances: 1, // Single instance for t2.micro
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Memory and CPU limits for t2.micro
      max_memory_restart: '400M',

      // Restart policies
      restart_delay: 4000,
      max_restarts: 3,
      min_uptime: '10s',

      // Auto restart on file changes (development only)
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'logs', 'uploads'],

      // Graceful shutdown
      kill_timeout: 5000,

      // Monitoring (disabled for free tiers)
      monitoring: false,
    }

    // 🔴 Removed the openlearn-worker block since worker.js does not exist.
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: ['openlearn.org.in'],
      ref: 'origin/main',
      repo: 'git@github.com:openlearnnitj/openlearn-backend.git',
      path: '/home/ubuntu/openlearn',
      'post-deploy': 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      ssh_options: 'ForwardAgent=yes'
    },

    staging: {
      user: 'ubuntu',
      host: ['staging.openlearn.org.in'],
      ref: 'origin/develop',
      repo: 'git@github.com:openlearnnitj/openlearn-backend.git',
      path: '/home/ubuntu/openlearn-staging',
      'post-deploy': 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
