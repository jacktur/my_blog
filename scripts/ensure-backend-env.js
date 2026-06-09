const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'backend', '.env');
const examplePath = path.join(__dirname, '..', 'backend', '.env.example');

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('[SETUP] backend/.env created from backend/.env.example');
}
