# 🥝 KiwiBot Pro

**Advanced Personal AI Assistant with Gateway Architecture**

*Better than Clawdbot!* 🔥

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/)
[![Built for](https://img.shields.io/badge/Built%20for-Gemini%203%20Flash-blue.svg)](https://aistudio.google.com/)

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
- **Google Gemini** - Gemini 1.5 Pro, Flash ✨ NEW!
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

### 🔥 EXCLUSIVE PRO FEATURES (Only in KiwiBot Pro!)

Unlike Moltbot or Clawdbot, KiwiBot Pro includes these advanced systems fully integrated as **AI Tools**:

- 🧠 **Long-term Memory (RAG)** - Stores user preferences and facts permanently using vector-like search.
- 👁️ **Vision Analyzer** - Deep image analysis and OCR.
- 💻 **Code Sandbox** - Executes JS, TS, Python, and Bash in a safe, isolated environment.
- 🌍 **Sheng/Kiswahili Translation** - Advanced multi-language support with slang explanation.
- 📊 **Usage Analytics** - Tracks costs, tokens, and user patterns automatically.
- 📁 **Universal File Processor** - Read and summarize PDFs, Excel, Word, and CSV files.
- 😊 **Mood/Sentiment Tracking** - Adapts responses based on the user's emotional state.

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
│   │   ├── agents.ts         # Agent collaboration
│   │   └── gemini.ts         # Google Gemini ✨
│   ├── analytics/
│   │   └── tracker.ts        # Usage analytics ✨
│   ├── automation/
│   │   └── cron.ts           # Cron & webhooks
│   ├── channels/
│   │   ├── router.ts         # Channel router
│   │   ├── discord.ts
│   │   ├── telegram.ts
│   │   └── whatsapp.ts
│   ├── cli/
│   │   └── index.ts          # CLI interface
│   ├── code/
│   │   └── sandbox.ts        # Code execution ✨
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── files/
│   │   └── processor.ts      # PDF/Word/Excel ✨
│   ├── gateway/
│   │   └── server.ts         # WebSocket server
│   ├── learning/
│   │   └── adaptive.ts       # Adaptive learning ✨
│   ├── memory/
│   │   └── rag.ts            # Long-term memory ✨
│   ├── mood/
│   │   └── analyzer.ts       # Sentiment analysis ✨
│   ├── notifications/
│   │   └── push.ts           # Push notifications ✨
│   ├── personality/
│   │   └── workspace.ts      # SOUL.md parser
│   ├── security/
│   │   └── dm.ts             # DM security
│   ├── sessions/
│   │   └── manager.ts        # Session management
│   ├── skills/
│   │   └── manager.ts        # Skills system
│   ├── smart/
│   │   └── context.ts        # Smart context ✨
│   ├── tools/
│   │   ├── browser.ts        # Puppeteer
│   │   └── doctor.ts         # Diagnostics
│   ├── translation/
│   │   └── translate.ts      # 60+ languages ✨
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── utils/
│   │   ├── events.ts         # Event bus
│   │   ├── logger.ts         # Logging
│   │   └── typing.ts         # Typing indicators
│   ├── vision/
│   │   └── analyzer.ts       # Image analysis ✨
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

## 🆕 EXCLUSIVE FEATURES (Only in KiwiBot Pro!)

### 🧠 Long-term Memory with RAG
```javascript
// Remember facts about users
await memorySystem.remember("User likes coffee", userId, "preference");

// Recall relevant memories
const memories = await memorySystem.recall("coffee preferences", userId);
```

### 👁️ Vision/Image Analysis
```javascript
// Analyze images with AI vision
const result = await visionAnalyzer.analyze(imageUrl, "Describe this");
console.log(result.description, result.objects);

// Extract text (OCR)
const text = await visionAnalyzer.extractText(imageUrl);
```

### 💻 Code Sandbox
Execute code safely in isolated environment:
```javascript
// Run Python
const result = await codeSandbox.execute(`
print("Hello from Python!")
`, 'python');

// Run JavaScript
await codeSandbox.execute(`console.log("Hello!")`, 'javascript');
```
Supports: JavaScript, TypeScript, Python, Bash

### 🌍 Translation (60+ Languages)
```javascript
// Translate to Kiswahili
const result = await translationService.translate(
  "Hello, how are you?",
  "sw"  // Kiswahili
);
// "Habari, u hali gani?"

// Detect language
const lang = await translationService.detectLanguage("Mambo vipi?");
// "sw"
```

### 📊 Analytics & Usage Tracking
```javascript
// Track usage automatically
analyticsTracker.trackMessage(userId, channel, model, tokens, latency);

// Get summary
const stats = analyticsTracker.getSummary();
console.log(stats.total.messages, stats.total.cost);
```

### 📁 File Processing
```javascript
// Process PDF, Word, Excel, CSV, Images
const doc = await fileProcessor.process("report.pdf");
console.log(doc.content);

// Analyze with AI
const analysis = await fileProcessor.analyze(doc);
console.log(analysis.summary, analysis.keyPoints);
```

### 🧠 Smart Context Management
```javascript
// Auto-compress long conversations
await smartContext.addMessage(sessionId, { role: 'user', content: message });

// Automatic summarization when context grows too large
const optimized = smartContext.buildContext(sessionId, maxTokens);
```

### 😊 Mood/Sentiment Detection
```javascript
// Detect user mood
const { mood, confidence } = moodAnalyzer.analyze("This is frustrating!");
// mood: "frustrated", confidence: 0.85

// Adapt responses based on mood
const response = moodAnalyzer.adaptResponse(botResponse, userId);
```

### 🔔 Push Notifications
```javascript
// Send to Slack, Discord, Telegram
await notificationService.notify(userId, "Task Complete", "Your task is done!");

// Schedule reminders
await notificationService.scheduleReminder(userId, "Meeting", "Don't forget!", 3600000);
```

### 📚 Adaptive Learning
```javascript
// Bot learns from corrections
adaptiveLearning.recordCorrection(userId, originalQuery, botResponse, correction);

// Auto-apply learned patterns
const improved = adaptiveLearning.applyLearning(query, response, userId);
```

---

## ⚙️ Environment Variables

```env
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
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

# Exclusive Features
MEMORY_PATH=./.kiwibot/memories.json
ANALYTICS_PATH=./.kiwibot/analytics.json
LEARNING_PATH=./.kiwibot/learning.json
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 🔥 Why KiwiBot Pro is MUCH Better

| Feature | KiwiBot Pro | Clawdbot | Moltbot |
|---------|-------------|----------|---------|
| Gateway Architecture | ✅ | ✅ | ✅ |
| Multi-Channel | ✅ 3 channels | ✅ | ✅ |
| Voice/Talk | ✅ | ✅ | ✅ |
| Browser Control | ✅ | ✅ | ✅ |
| Model Failover | ✅ | ✅ | ✅ |
| Think Levels | ✅ 6 levels | ✅ | ✅ |
| DM Security | ✅ | ✅ | ✅ |
| Agent Collaboration | ✅ | ✅ | ✅ |
| SOUL.md | ✅ | ✅ | ✅ |
| Skills System | ✅ 9 skills | - | - |
| Web Dashboard | ✅ | - | - |
| CLI Tool | ✅ | ✅ | ✅ |
| Doctor Command | ✅ | ✅ | ✅ |
| **Gemini Support** | ✅ 🆕 | - | - |
| **Long-term Memory/RAG** | ✅ 🆕 | - | - |
| **Vision/Image Analysis** | ✅ 🆕 | - | - |
| **Code Sandbox** | ✅ 🆕 | - | - |
| **Translation (60+ langs)** | ✅ 🆕 | - | - |
| **Analytics & Tracking** | ✅ 🆕 | - | - |
| **File Processing** | ✅ 🆕 | - | - |
| **Smart Context** | ✅ 🆕 | - | - |
| **Mood Detection** | ✅ 🆕 | - | - |
| **Push Notifications** | ✅ 🆕 | - | - |
| **Adaptive Learning** | ✅ 🆕 | - | - |
| Kiswahili Support | ✅ 🇰🇪 | - | - |

---

## 📜 License

MIT

---

Made with 💚 - *Mr Honest!* 🥝
