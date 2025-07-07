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
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Auto restart on file changes (development only)
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Environment variables
      env_file: '.env',
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Monitoring
      monitoring: false, // Disable PM2 monitoring for free tier
    },
    
    // Background job processor (if needed)
    {
      name: 'openlearn-worker',
      script: 'dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'background',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background',
      },
      log_file: './logs/worker.log',
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '10s',
      // Only run in production
      enabled: process.env.NODE_ENV === 'production',
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['openlearn.org.in'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/openlearn-js.git',
      path: '/home/ubuntu/openlearn',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    },
    
    staging: {
      user: 'ubuntu',
      host: ['staging.openlearn.org.in'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/openlearn-js.git',
      path: '/home/ubuntu/openlearn-staging',
      'post-deploy': 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
