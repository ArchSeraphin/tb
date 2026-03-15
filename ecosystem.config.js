module.exports = {
  apps: [{
    name: 'voilavoila-tools',
    script: 'src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
