module.exports = {
  apps: [{
    name: "bionluk-bot",
    script: "./app.js",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,               // Do not restart on file changes in production
    max_memory_restart: "500M", // Memory Watchdog: Auto-restart if RAM exceeds 500MB (prevents Puppeteer leaks)
    env: {
      NODE_ENV: "production",
    },
    error_file: "logs/err.log", // Separate error logs
    out_file: "logs/out.log",   // Standard console logs
    log_file: "logs/combined.log",
    time: true                  // Prefix logs with standard timestamp
  }]
};
