#!/usr/bin/env node

/**
 * Development Port Manager
 * Helps manage and check port availability for SveltyCMS development server
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Common development ports
const DEFAULT_PORTS = [5173, 3000, 4000, 8080, 8000, 3001, 4001, 5000];

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find next available port
 */
async function findAvailablePort(startPort = 5173) {
  const ports = [startPort, ...DEFAULT_PORTS.filter(p => p !== startPort)];
  
  for (const port of ports) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // If no common ports available, try sequential ports
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  throw new Error('No available ports found');
}

/**
 * Update .env.local with new port
 */
function updateEnvPort(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log(`Creating .env.local with PORT=${port}`);
    fs.writeFileSync(envPath, `PORT=${port}\nHOST=localhost\n`);
    return;
  }
  
  let content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('PORT=')) {
    content = content.replace(/PORT=\d+/g, `PORT=${port}`);
  } else {
    content = `PORT=${port}\n${content}`;
  }
  
  // Also update HOST_DEV if present
  if (content.includes('HOST_DEV=')) {
    content = content.replace(/HOST_DEV=http:\/\/localhost:\d+/g, `HOST_DEV=http://localhost:${port}`);
  } else {
    content = `${content}\nHOST_DEV=http://localhost:${port}`;
  }
  
  fs.writeFileSync(envPath, content);
  console.log(`✅ Updated .env.local with PORT=${port}`);
}

/**
 * Kill process running on port
 */
function killPort(port) {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
    if (process.platform === 'win32') {
      // Windows
      try {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = result.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              try {
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                console.log(`💀 Killed process ${pid} on port ${port}`);
              } catch (e) {
                // Process might already be dead
              }
            }
          });
        }
      } catch (e) {
        // No processes found
      }
    } else {
      // Unix/Linux/macOS
      try {
        const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
        if (pid) {
          execSync(`kill -9 ${pid}`);
          console.log(`💀 Killed process ${pid} on port ${port}`);
        }
      } catch (e) {
        // No process found on port
      }
    }
  } catch (error) {
    console.log(`ℹ️  No processes found on port ${port}`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const portArg = args[1] ? parseInt(args[1]) : 5173;

  console.log('🚀 SveltyCMS Development Port Manager\n');

  switch (command) {
    case 'check':
      const isAvailable = await isPortAvailable(portArg);
      console.log(`Port ${portArg} is ${isAvailable ? '✅ available' : '❌ in use'}`);
      break;

    case 'find':
      try {
        const availablePort = await findAvailablePort(portArg);
        console.log(`✅ Found available port: ${availablePort}`);
        updateEnvPort(availablePort);
        console.log(`\n🎯 Run: npm run dev`);
        console.log(`🌐 Your app will be available at: http://localhost:${availablePort}`);
      } catch (error) {
        console.error('❌ Error finding available port:', error.message);
      }
      break;

    case 'kill':
      killPort(portArg);
      console.log(`🧹 Attempted to free port ${portArg}`);
      break;

    case 'set':
      if (!portArg || isNaN(portArg)) {
        console.error('❌ Please provide a valid port number');
        console.log('Usage: node scripts/dev-port.js set 3000');
        process.exit(1);
      }
      updateEnvPort(portArg);
      console.log(`\n🎯 Run: npm run dev`);
      console.log(`🌐 Your app will be available at: http://localhost:${portArg}`);
      break;

    case 'auto':
      // Kill any process on the desired port and set it
      killPort(portArg);
      // Wait a bit for the port to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const available = await isPortAvailable(portArg);
      if (available) {
        updateEnvPort(portArg);
        console.log(`✅ Port ${portArg} is now available and set`);
        console.log(`\n🎯 Run: npm run dev`);
        console.log(`🌐 Your app will be available at: http://localhost:${portArg}`);
      } else {
        console.log(`❌ Port ${portArg} is still in use. Trying to find alternative...`);
        const alternativePort = await findAvailablePort(portArg + 1);
        updateEnvPort(alternativePort);
        console.log(`✅ Using alternative port: ${alternativePort}`);
      }
      break;

    default:
      console.log('📋 Available commands:');
      console.log('  check [port]  - Check if port is available (default: 5173)');
      console.log('  find [port]   - Find next available port and update .env.local');
      console.log('  kill [port]   - Kill process running on port');
      console.log('  set [port]    - Set specific port in .env.local');
      console.log('  auto [port]   - Kill process on port and set it (default: 5173)');
      console.log('');
      console.log('📖 Examples:');
      console.log('  node scripts/dev-port.js check 5173');
      console.log('  node scripts/dev-port.js find');
      console.log('  node scripts/dev-port.js kill 5173');
      console.log('  node scripts/dev-port.js set 3000');
      console.log('  node scripts/dev-port.js auto 5173');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { isPortAvailable, findAvailablePort, updateEnvPort, killPort };