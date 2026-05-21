import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
});

// Run the script with these env variables
const cmd = process.argv.slice(2).join(' ');
console.log(`Running: ${cmd}`);

try {
  execSync(cmd, {
    env: { ...process.env, ...envVars },
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Error running command:', e.message);
}
