# 🥝 KiwiBot Pro

**Advanced Personal AI Assistant with Gateway Architecture**

*Better than Clawdbot!* 🔥

---

## 📦 Installation

```bash
cd kiwibot-pro
npm install
cp .env.example .env
# Edit .env with your API keys
```

## 🚀 Quick Start

```bash
# Development mode
npm run dev

# Production
npm run build
npm start

# CLI
npm run cli
```

---

## ✨ Features (Zaidi ya Clawdbot!)

### 🌐 Gateway Architecture
- WebSocket server (port 18789)
- JSON protocol compatible with Moltbot
- Multi-client support
- Real-time streaming

### 📡 Multi-Channel Support
- **Discord** - Full bot with slash commands
- **Telegram** - Bot with inline keyboards
- **WhatsApp** - QR code authentication

### 🤖 AI Integration
- **OpenAI** - GPT-4o, GPT-4 Turbo
- **Anthropic** - Claude 3.5 Sonnet, Opus
- **Streaming** - Real-time responses
- **Model Failover** - Auto-switch on errors

### 🧠 Think Levels
Control AI reasoning depth:
```
/think off      - Quick responses
/think minimal  - Brief thinking
/think low      - Some reasoning
/think medium   - Step-by-step (default)
/think high     - Deep analysis
/think max      - Exhaustive reasoning
```

### 🎤 Voice/Talk Mode
- **Speech-to-Text** - OpenAI Whisper
- **Text-to-Speech** - Multiple voices
- **Wake Word** - "Hey Kiwi"
- **Languages** - Kiswahili, English, etc.

### 🌐 Browser Control
- Puppeteer CDP integration
- Navigate, click, type, scroll
- Screenshots and content extraction
- Multi-page management

### ⏰ Cron Jobs & Webhooks
Schedule tasks and receive HTTP triggers:
```javascript
// Schedule: every 5 minutes
automationManager.createJob('@every5m', 'Check emails');

// Webhook: POST /webhook/:name
automationManager.createWebhook('deploy', 'Handle deployment');
```

### 🔐 DM Security & Pairing
```bash
# Generate pairing code for unknown users
# User receives: "Pairing code: ABC123"

# Approve pairing
kiwi pairing approve ABC123
```

Policies: `open`, `pairing`, `allowlist`, `closed`

### 👥 Agent-to-Agent Collaboration
Multiple AI agents discussing a topic:
```javascript
agentCollaboration.createSession('Design a new feature', [
  { template: 'analyst' },
  { template: 'creative' },
  { template: 'critic' },
]);
```

Templates: `analyst`, `creative`, `critic`, `expert`, `moderator`, `user_advocate`

### 📋 SOUL.md & AGENTS.md
Customize bot personality per workspace:

**SOUL.md**
```markdown
# KiwiBot

## Personality
Friendly, helpful, uses emojis

## Guidelines
- Be concise
- Ask clarifying questions
```

**AGENTS.md**
```markdown
## CodeReviewer
trigger: `@reviewer`
description: Reviews code

---
You are a code reviewer...
```

### 🏥 Doctor Diagnostics
```bash
kiwi doctor

# Checks:
# ✅ Node.js version
# ✅ Environment file
# ✅ AI providers
# ✅ Gateway status
# ✅ Channels
# ✅ DM Security
# ✅ Disk space
# ✅ Memory usage
```

### ⚡ Skills System
9 built-in skills:
- `weather` - Current weather
- `calculator` - Math operations
- `reminder` - Set reminders
- `search` - Web search
- `translate` - Language translation
- `code` - Code execution
- `image` - Image generation
- `time` - World clock
- `define` - Dictionary

### 🖥️ Web Dashboard
Real-time admin panel:
- Session management
- Message history
- Provider status
- Skill execution logs

---

## 🛠️ CLI Commands

```bash
# Start gateway
kiwi gateway start

# Check status
kiwi status

# Send message
kiwi agent "What is the weather?"

# List sessions
kiwi sessions list

# List skills
kiwi skills list

# Run diagnostics
kiwi doctor

# Manage pairings
kiwi pairing list
kiwi pairing approve ABC123
kiwi pairing reject ABC123

# Initial setup
kiwi setup
```

---

## 📁 Project Structure

```
kiwibot-pro/
├── src/
│   ├── index.ts              # Main entry
│   ├── ai/
│   │   ├── service.ts        # AI providers
│   │   ├── failover.ts       # Model failover
│   │   ├── think.ts          # Think levels
│   │   └── agents.ts         # Agent collaboration
│   ├── automation/
│   │   └── cron.ts           # Cron & webhooks
│   ├── channels/
│   │   ├── router.ts         # Channel router
│   │   ├── discord.ts
│   │   ├── telegram.ts
│   │   └── whatsapp.ts
│   ├── cli/
│   │   └── index.ts          # CLI interface
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── gateway/
│   │   └── server.ts         # WebSocket server
│   ├── personality/
│   │   └── workspace.ts      # SOUL.md parser
│   ├── security/
│   │   └── dm.ts             # DM security
│   ├── sessions/
│   │   └── manager.ts        # Session management
│   ├── skills/
│   │   └── manager.ts        # Skills system
│   ├── tools/
│   │   ├── browser.ts        # Puppeteer
│   │   └── doctor.ts         # Diagnostics
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── utils/
│   │   ├── events.ts         # Event bus
│   │   ├── logger.ts         # Logging
│   │   └── typing.ts         # Typing indicators
│   ├── voice/
│   │   └── talk.ts           # Voice/Talk mode
│   └── web/
│       └── dashboard.ts      # Web UI
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Environment Variables

```env
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=gpt-4o

# Gateway
GATEWAY_PORT=18789
GATEWAY_SECRET=your-secret

# Channels
DISCORD_TOKEN=...
DISCORD_ENABLED=true

TELEGRAM_TOKEN=...
TELEGRAM_ENABLED=true

WHATSAPP_ENABLED=false

# Web Dashboard
WEB_PORT=3000
WEB_ENABLED=true

# Advanced Features
DEFAULT_THINK_LEVEL=medium
DM_POLICY=pairing
PAIRING_CODE_EXPIRY=15
FAILOVER_MAX_RETRIES=3
```

---

## 🔥 Why KiwiBot Pro is Better

| Feature | KiwiBot Pro | Clawdbot |
|---------|-------------|----------|
| Gateway Architecture | ✅ | ✅ |
| Multi-Channel | ✅ 3 channels | ✅ |
| Voice/Talk | ✅ | ✅ |
| Browser Control | ✅ | ✅ |
| Model Failover | ✅ | ✅ |
| Think Levels | ✅ 6 levels | ✅ |
| DM Security | ✅ | ✅ |
| Agent Collaboration | ✅ | ✅ |
| SOUL.md | ✅ | ✅ |
| Skills System | ✅ 9 skills | - |
| Web Dashboard | ✅ | - |
| CLI Tool | ✅ | ✅ |
| Doctor Command | ✅ | ✅ |
| Kiswahili Support | ✅ 🇰🇪 | - |

---

## 📜 License

MIT

---

Made with 💚 - *Bora kuliko Clawdbot!* 🥝
