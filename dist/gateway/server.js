/**
 * 🥝 KiwiBot Pro - Gateway Server
 * WebSocket-based control plane (like Moltbot)
 */
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuid } from 'uuid';
import { kiwiConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
class Gateway {
    wss = null;
    httpServer = null;
    clients = new Map();
    startedAt = null;
    seq = 0;
    // Stats
    stats = {
        messagesReceived: 0,
        messagesSent: 0,
        connections: 0,
        errors: 0,
    };
    async start() {
        const config = kiwiConfig.gateway;
        // Create HTTP server for WebSocket upgrade
        this.httpServer = createServer((req, res) => {
            // Simple health check endpoint
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getHealth()));
                return;
            }
            // Status endpoint
            if (req.url === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getStatus()));
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
        });
        // Create WebSocket server
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        this.wss.on('error', (error) => {
            logger.error('Gateway WebSocket error', error);
            this.stats.errors++;
        });
        // Start listening
        return new Promise((resolve) => {
            this.httpServer.listen(config.port, config.host, () => {
                this.startedAt = new Date();
                logger.gateway(`Started on ws://${config.host}:${config.port}`);
                eventBus.emitEvent('gateway:started', config.port);
                resolve();
            });
        });
    }
    handleConnection(ws, req) {
        const clientId = uuid();
        this.stats.connections++;
        logger.gateway(`New connection: ${clientId} from ${req.socket.remoteAddress}`);
        // Create pending client (not authenticated yet)
        const client = {
            id: clientId,
            ws,
            type: 'operator',
            name: 'Unknown',
            connectedAt: new Date(),
            lastActivity: new Date(),
            authenticated: !kiwiConfig.gateway.auth.enabled, // Auto-auth if auth disabled
            capabilities: [],
        };
        ws.on('message', (data) => {
            this.handleMessage(client, data.toString());
        });
        ws.on('close', () => {
            this.handleDisconnect(client);
        });
        ws.on('error', (error) => {
            logger.error(`Client ${clientId} error`, error);
            this.stats.errors++;
        });
        // If auth is disabled, add client immediately
        if (!kiwiConfig.gateway.auth.enabled) {
            this.clients.set(clientId, client);
        }
    }
    async handleMessage(client, raw) {
        this.stats.messagesReceived++;
        client.lastActivity = new Date();
        let request;
        try {
            request = JSON.parse(raw);
        }
        catch {
            this.sendError(client, 'parse-error', 'INVALID_JSON', 'Invalid JSON');
            return;
        }
        if (request.type !== 'req') {
            this.sendError(client, request.id || 'unknown', 'INVALID_REQUEST', 'Expected type: req');
            return;
        }
        // First message must be 'connect'
        if (!client.authenticated && request.method !== 'connect') {
            this.sendError(client, request.id, 'NOT_AUTHENTICATED', 'First message must be connect');
            client.ws.close();
            return;
        }
        try {
            const result = await this.handleMethod(client, request);
            this.sendResponse(client, request.id, true, result);
        }
        catch (error) {
            this.sendError(client, request.id, 'METHOD_ERROR', error.message);
        }
    }
    async handleMethod(client, request) {
        const { method, params } = request;
        switch (method) {
            case 'connect':
                return this.handleConnect(client, params);
            case 'health':
                return this.getHealth();
            case 'status':
                return this.getStatus();
            case 'presence':
                return this.getPresence();
            case 'session.list':
                return this.handleSessionList();
            case 'session.get':
                return this.handleSessionGet(params);
            case 'session.clear':
                return this.handleSessionClear(params);
            case 'channel.list':
                return this.handleChannelList();
            case 'channel.status':
                return this.handleChannelStatus(params);
            case 'send':
                return this.handleSend(params);
            case 'agent':
                return this.handleAgent(client, params);
            case 'skill.list':
                return this.handleSkillList();
            case 'skill.invoke':
                return this.handleSkillInvoke(params);
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }
    async handleConnect(client, params) {
        // Verify auth if enabled
        if (kiwiConfig.gateway.auth.enabled) {
            const validToken = params.auth?.token === kiwiConfig.gateway.auth.token;
            const validPassword = params.auth?.password === kiwiConfig.gateway.auth.password;
            if (!validToken && !validPassword) {
                throw new Error('Authentication failed');
            }
        }
        // Update client info
        client.authenticated = true;
        client.name = params.client?.name || 'Client';
        client.type = params.client?.type || 'operator';
        this.clients.set(client.id, client);
        eventBus.emitEvent('gateway:client:connected', client.id);
        logger.gateway(`Client authenticated: ${client.name} (${client.id})`);
        // Return hello-ok with snapshot
        return {
            type: 'hello-ok',
            clientId: client.id,
            snapshot: {
                presence: this.getPresence(),
                health: this.getHealth(),
                stateVersion: this.seq,
                uptimeMs: this.getUptime(),
            },
            policy: {
                maxPayload: 1024 * 1024, // 1MB
                tickIntervalMs: 30000,
            },
        };
    }
    handleSessionList() {
        // Will be implemented with session manager
        return { sessions: [] };
    }
    handleSessionGet(params) {
        return { session: null };
    }
    handleSessionClear(params) {
        return { cleared: true };
    }
    handleChannelList() {
        const channels = [];
        if (kiwiConfig.channels.discord?.enabled) {
            channels.push({ type: 'discord', status: 'configured' });
        }
        if (kiwiConfig.channels.telegram?.enabled) {
            channels.push({ type: 'telegram', status: 'configured' });
        }
        if (kiwiConfig.channels.whatsapp?.enabled) {
            channels.push({ type: 'whatsapp', status: 'configured' });
        }
        return { channels };
    }
    handleChannelStatus(params) {
        return { channel: params.channel, status: 'unknown' };
    }
    async handleSend(params) {
        // Will be implemented with channel manager
        return { sent: true, messageId: uuid() };
    }
    async handleAgent(client, params) {
        const runId = uuid();
        // Emit agent start event
        eventBus.emitEvent('agent:start', params.sessionId || 'default', params.message);
        // Return accepted response (actual processing happens async)
        return {
            runId,
            status: 'accepted',
        };
    }
    handleSkillList() {
        return { skills: [] };
    }
    handleSkillInvoke(params) {
        return Promise.resolve({ result: null });
    }
    handleDisconnect(client) {
        this.clients.delete(client.id);
        eventBus.emitEvent('gateway:client:disconnected', client.id);
        logger.gateway(`Client disconnected: ${client.name} (${client.id})`);
    }
    sendResponse(client, id, ok, payload) {
        const response = {
            type: 'res',
            id,
            ok,
            payload,
        };
        this.send(client, response);
    }
    sendError(client, id, code, message) {
        const response = {
            type: 'res',
            id,
            ok: false,
            error: { code, message },
        };
        this.send(client, response);
    }
    send(client, data) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
            this.stats.messagesSent++;
        }
    }
    // Broadcast event to all connected clients
    broadcast(event) {
        this.seq++;
        event.seq = this.seq;
        event.timestamp = Date.now();
        for (const client of this.clients.values()) {
            this.send(client, event);
        }
    }
    // Emit a typed event to all clients
    emitToClients(eventType, payload) {
        this.broadcast({
            type: 'event',
            event: eventType,
            payload,
            timestamp: Date.now(),
        });
    }
    getHealth() {
        return {
            status: 'healthy',
            version: '2026.1.28',
            uptime: this.getUptime(),
            clients: this.clients.size,
            channels: {
                discord: kiwiConfig.channels.discord?.enabled ? 'configured' : 'disabled',
                telegram: kiwiConfig.channels.telegram?.enabled ? 'configured' : 'disabled',
                whatsapp: kiwiConfig.channels.whatsapp?.enabled ? 'configured' : 'disabled',
            },
        };
    }
    getStatus() {
        return {
            gateway: 'running',
            port: kiwiConfig.gateway.port,
            clients: this.clients.size,
            stats: this.stats,
            uptime: this.getUptime(),
        };
    }
    getPresence() {
        return {
            clients: Array.from(this.clients.values()).map(c => ({
                id: c.id,
                type: c.type,
                name: c.name,
                connectedAt: c.connectedAt,
                lastActivity: c.lastActivity,
            })),
            channels: [],
            gateway: {
                version: '2026.1.28',
                uptime: this.getUptime(),
                startedAt: this.startedAt,
                sessions: 0,
                messages: {
                    received: this.stats.messagesReceived,
                    sent: this.stats.messagesSent,
                },
            },
        };
    }
    getUptime() {
        if (!this.startedAt)
            return 0;
        return Date.now() - this.startedAt.getTime();
    }
    async stop(reason = 'shutdown') {
        // Notify all clients
        this.broadcast({
            type: 'event',
            event: 'shutdown',
            payload: { reason },
            timestamp: Date.now(),
        });
        // Close all connections
        for (const client of this.clients.values()) {
            client.ws.close(1000, reason);
        }
        this.clients.clear();
        // Close servers
        return new Promise((resolve) => {
            this.wss?.close(() => {
                this.httpServer?.close(() => {
                    logger.gateway('Stopped');
                    eventBus.emitEvent('gateway:stopped', reason);
                    resolve();
                });
            });
        });
    }
    getClientCount() {
        return this.clients.size;
    }
}
export { Gateway };
export const gateway = new Gateway();
//# sourceMappingURL=server.js.map