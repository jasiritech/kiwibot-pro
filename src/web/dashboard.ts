/**
 * 🥝 KiwiBot Pro - Web Dashboard
 * Control UI with WebSocket real-time updates
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import { sessionManager } from '../sessions/manager.js';
import { aiService } from '../ai/service.js';
import { channelRouter } from '../channels/router.js';
import type { Message } from '../types/index.js';

class WebDashboard {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventForwarding();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        sessions: sessionManager.count(),
        channels: channelRouter.getStatus(),
        uptime: process.uptime(),
      });
    });

    this.app.get('/api/sessions', (req, res) => {
      res.json({ sessions: sessionManager.list() });
    });

    this.app.get('/api/channels', (req, res) => {
      res.json({ channels: channelRouter.list() });
    });

    this.app.get('/api/models', (req, res) => {
      res.json({ models: aiService.getModels() });
    });

    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message: content, userId = 'web-user' } = req.body;

        const message: Message = {
          id: Date.now().toString(),
          content,
          author: { id: userId, name: 'Web User', isBot: false },
          channel: 'web',
          channelId: 'web',
          sessionId: `web:web:${userId}`,
          timestamp: new Date(),
        };

        const response = await aiService.chat(message);
        res.json({ response });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      logger.debug('Web dashboard client connected');

      // Send initial state
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          sessions: sessionManager.count(),
          channels: channelRouter.getStatus(),
          uptime: process.uptime(),
        },
      }));

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          
          if (msg.type === 'chat') {
            const message: Message = {
              id: Date.now().toString(),
              content: msg.content,
              author: { id: msg.userId || 'web', name: 'Web User', isBot: false },
              channel: 'web',
              channelId: 'web',
              sessionId: `web:web:${msg.userId || 'web'}`,
              timestamp: new Date(),
            };

            const response = await aiService.chat(message);
            ws.send(JSON.stringify({ type: 'response', content: response }));
          }
        } catch (error: any) {
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  private setupEventForwarding(): void {
    // Forward events to all connected dashboard clients
    eventBus.onEvent('message:received', (msg) => {
      this.broadcast({ type: 'message', direction: 'in', data: msg });
    });

    eventBus.onEvent('message:sent', (msg) => {
      this.broadcast({ type: 'message', direction: 'out', data: msg });
    });

    eventBus.onEvent('session:created', (session) => {
      this.broadcast({ type: 'session', action: 'created', data: session });
    });

    eventBus.onEvent('channel:connected', (channel) => {
      this.broadcast({ type: 'channel', action: 'connected', channel });
    });

    eventBus.onEvent('channel:disconnected', (channel) => {
      this.broadcast({ type: 'channel', action: 'disconnected', channel });
    });
  }

  private broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  private getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🥝 KiwiBot Pro Dashboard</title>
  <style>
    :root {
      --bg-primary: #0f0f0f;
      --bg-secondary: #1a1a1a;
      --bg-tertiary: #252525;
      --text-primary: #ffffff;
      --text-secondary: #a0a0a0;
      --accent: #4ade80;
      --accent-hover: #22c55e;
      --border: #333;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 30px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 24px;
      font-weight: bold;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: 20px;
      font-size: 14px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .card-title {
      font-size: 16px;
      font-weight: 600;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: var(--accent);
    }
    
    .stat-label {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .channel-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .channel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: var(--bg-tertiary);
      border-radius: 8px;
    }
    
    .channel-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .channel-status.connected { background: #22c55e33; color: #22c55e; }
    .channel-status.disconnected { background: #ef444433; color: #ef4444; }
    .channel-status.configured { background: #eab30833; color: #eab308; }
    
    .chat-container {
      grid-column: span 2;
      display: flex;
      flex-direction: column;
      height: 500px;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .message {
      margin-bottom: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 80%;
    }
    
    .message.user {
      background: var(--accent);
      color: #000;
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }
    
    .message.bot {
      background: var(--bg-secondary);
      border-bottom-left-radius: 4px;
    }
    
    .input-area {
      display: flex;
      gap: 10px;
    }
    
    .input-area input {
      flex: 1;
      padding: 14px 18px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 16px;
      outline: none;
    }
    
    .input-area input:focus {
      border-color: var(--accent);
    }
    
    .input-area button {
      padding: 14px 24px;
      background: var(--accent);
      color: #000;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .input-area button:hover {
      background: var(--accent-hover);
    }
    
    .logs {
      grid-column: span 2;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .log-entry {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      font-family: monospace;
      font-size: 13px;
    }
    
    .log-entry.info { border-left: 3px solid #3b82f6; }
    .log-entry.success { border-left: 3px solid #22c55e; }
    .log-entry.error { border-left: 3px solid #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        🥝 KiwiBot Pro
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        <span id="status">Online</span>
      </div>
    </header>
    
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Sessions</span>
        </div>
        <div class="stat-value" id="sessions">0</div>
        <div class="stat-label">Active conversations</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Uptime</span>
        </div>
        <div class="stat-value" id="uptime">0s</div>
        <div class="stat-label">Since last restart</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Channels</span>
        </div>
        <div class="channel-list" id="channels">
          <div class="channel-item">
            <span>Loading...</span>
          </div>
        </div>
      </div>
      
      <div class="card chat-container">
        <div class="card-header">
          <span class="card-title">💬 Chat</span>
        </div>
        <div class="messages" id="messages">
          <div class="message bot">Habari! 👋 Mimi ni KiwiBot Pro. Ninaweza kukusaidia na nini?</div>
        </div>
        <div class="input-area">
          <input type="text" id="input" placeholder="Andika ujumbe..." autocomplete="off">
          <button id="send">Tuma</button>
        </div>
      </div>
      
      <div class="card logs">
        <div class="card-header">
          <span class="card-title">📋 Activity Log</span>
        </div>
        <div id="logs">
          <div class="log-entry info">Dashboard connected</div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');
    const logs = document.getElementById('logs');
    
    ws.onopen = () => addLog('Connected to Gateway', 'success');
    ws.onclose = () => addLog('Disconnected from Gateway', 'error');
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'init') {
        document.getElementById('sessions').textContent = data.data.sessions;
        updateChannels(data.data.channels);
        updateUptime(data.data.uptime);
      }
      
      if (data.type === 'response') {
        addMessage(data.content, false);
      }
      
      if (data.type === 'message') {
        addLog(\`Message \${data.direction}: \${data.data.content.slice(0, 50)}...\`, 'info');
      }
      
      if (data.type === 'channel') {
        addLog(\`Channel \${data.channel} \${data.action}\`, data.action === 'connected' ? 'success' : 'error');
      }
    };
    
    function addMessage(content, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'bot');
      div.textContent = content;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    
    function addLog(text, type = 'info') {
      const div = document.createElement('div');
      div.className = 'log-entry ' + type;
      div.textContent = new Date().toLocaleTimeString() + ' - ' + text;
      logs.insertBefore(div, logs.firstChild);
    }
    
    function updateChannels(channels) {
      const container = document.getElementById('channels');
      container.innerHTML = Object.entries(channels).map(([name, status]) => \`
        <div class="channel-item">
          <span>\${name.charAt(0).toUpperCase() + name.slice(1)}</span>
          <span class="channel-status \${status}">\${status}</span>
        </div>
      \`).join('');
    }
    
    function updateUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      document.getElementById('uptime').textContent = h + 'h ' + m + 'm ' + s + 's';
    }
    
    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      
      addMessage(text, true);
      ws.send(JSON.stringify({ type: 'chat', content: text }));
      input.value = '';
    }
    
    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    // Update uptime every second
    setInterval(() => {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          updateUptime(d.uptime);
          document.getElementById('sessions').textContent = d.sessions;
          updateChannels(d.channels);
        });
    }, 5000);
  </script>
</body>
</html>`;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(kiwiConfig.web.port, () => {
        logger.info(`Web dashboard at http://localhost:${kiwiConfig.web.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

export const webDashboard = new WebDashboard();
