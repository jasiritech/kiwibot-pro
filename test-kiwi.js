/**
 * 🧪 KiwiBot Pro Test Script
 * Run: node test-kiwi.js
 */

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://localhost:18789';

console.log('🥝 KiwiBot Pro Test\n');

// Test 1: WebSocket Connection
console.log('📡 Test 1: Connecting to Gateway...');

const ws = new WebSocket(GATEWAY_URL);

ws.on('open', () => {
  console.log('✅ Connected to Gateway!\n');
  
  // Test 2: Send a message
  console.log('💬 Test 2: Sending message...');
  ws.send(JSON.stringify({
    type: 'message',
    content: 'Habari! Jina lako nani?',
    sessionId: 'test-session-' + Date.now(),
  }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('📥 Response received:');
    console.log('   Type:', msg.type);
    if (msg.content) {
      console.log('   Content:', msg.content.slice(0, 200) + (msg.content.length > 200 ? '...' : ''));
    }
    if (msg.chunk) {
      process.stdout.write(msg.chunk);
    }
    console.log('');
  } catch (e) {
    console.log('📥 Raw:', data.toString().slice(0, 200));
  }
});

ws.on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
  console.log('\n💡 Make sure KiwiBot Pro is running: npm run dev');
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Connection closed');
});

// Auto-close after 10 seconds
setTimeout(() => {
  console.log('\n⏱️ Test timeout (10s) - closing...');
  ws.close();
  process.exit(0);
}, 10000);

// Test 3: HTTP Dashboard check
const http = require('http');
console.log('\n🌐 Test 3: Checking Dashboard...');

http.get('http://localhost:3000', (res) => {
  console.log('✅ Dashboard responding! Status:', res.statusCode);
}).on('error', (err) => {
  console.log('⚠️ Dashboard not available:', err.message);
});
