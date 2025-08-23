# Port Management for SveltyCMS Development

## Quick Start

### 🚀 Automatic Port Management
```bash
# Find and use next available port automatically
npm run dev:port

# Use specific port (kills any existing process on that port)
npm run dev:3000
npm run dev:4000
npm run dev:8080
```

### 🔧 Manual Port Management
```bash
# Check if port 5173 is available
npm run port:check 5173

# Find next available port and update .env.local
npm run port:find

# Kill process on port 5173
npm run port:kill 5173

# Auto-manage port 5173 (kill existing + set)
npm run port:auto 5173
```

## Environment Configuration

### 📝 .env.local File
The port is configured in your `.env.local` file:

```bash
# Change this to your preferred port
PORT=5173

# Other development settings
HOST=localhost
VITE_OPEN=false
NODE_ENV=development
```

### 🎛️ Available Ports
Default ports tried in order:
- 5173 (Vite default)
- 3000 (React/Next.js default)
- 4000 (Common development port)
- 8080 (Alternative development port)
- 8000, 3001, 4001, 5000

## Command Reference

### NPM Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with current port |
| `npm run dev:port` | Auto-find available port and start |
| `npm run dev:3000` | Force port 3000 and start |
| `npm run port:check [port]` | Check if port is available |
| `npm run port:find` | Find next available port |
| `npm run port:kill [port]` | Kill process on port |
| `npm run port:auto [port]` | Kill existing + set port |

### Direct Script Usage
```bash
# Run the port management script directly
node scripts/dev-port.js <command> [port]

# Examples
node scripts/dev-port.js check 5173
node scripts/dev-port.js find
node scripts/dev-port.js kill 5174
node scripts/dev-port.js set 3000
node scripts/dev-port.js auto 5173
```

## Troubleshooting

### Port Already in Use
If you see "Port 5173 is in use, trying another one..." this is normal Vite behavior. The app will automatically use the next available port.

To force a specific port:
1. Kill the existing process: `npm run port:kill 5173`
2. Start with your preferred port: `npm run dev`

### Windows Port Issues
On Windows, if ports remain occupied:
```bash
# Check what's using the port
netstat -ano | findstr :5173

# Kill specific process by PID
taskkill /PID <process-id> /F
```

### Unix/Linux/Mac Port Issues
```bash
# Check what's using the port
lsof -i :5173

# Kill process on port
kill -9 $(lsof -ti:5173)
```

## Development Workflow

### Recommended Workflow
1. **First time**: `npm run dev:port` - finds available port
2. **Daily development**: `npm run dev` - uses your saved port
3. **Port conflicts**: `npm run port:auto` - resolves conflicts automatically
4. **Specific needs**: `npm run dev:3000` - use specific port

### Multiple Instances
To run multiple SveltyCMS instances:
```bash
# Terminal 1
npm run dev:3000

# Terminal 2
npm run dev:4000

# Terminal 3
npm run dev:8080
```

## Configuration Files

### .env.local
```bash
PORT=5173                    # Development server port
HOST=localhost              # Server host
VITE_OPEN=false            # Auto-open browser
HOST_DEV=http://localhost:5173  # Development URL
```

### vite.config.ts
The Vite configuration automatically reads:
- `process.env.PORT` for server port
- `process.env.HOST` for server host
- `process.env.VITE_OPEN` for auto-open browser

## Testing with Different Ports

### Playwright Tests
Update test configuration for different ports:
```bash
# In .env.test
BASE_URL=http://localhost:3000
```

### API Testing
Update API base URL in your tests when using different ports:
```javascript
const API_BASE = process.env.BASE_URL || 'http://localhost:5173';
```

---

For more development setup information, see the main [testing guide](docs/testing-guide.mdx).