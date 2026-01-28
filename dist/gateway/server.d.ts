/**
 * 🥝 KiwiBot Pro - Gateway Server
 * WebSocket-based control plane (like Moltbot)
 */
import type { GatewayEvent } from '../types/index.js';
declare class Gateway {
    private wss;
    private httpServer;
    private clients;
    private startedAt;
    private seq;
    private stats;
    start(): Promise<void>;
    private handleConnection;
    private handleMessage;
    private handleMethod;
    private handleConnect;
    private handleSessionList;
    private handleSessionGet;
    private handleSessionClear;
    private handleChannelList;
    private handleChannelStatus;
    private handleSend;
    private handleAgent;
    private handleSkillList;
    private handleSkillInvoke;
    private handleDisconnect;
    private sendResponse;
    private sendError;
    private send;
    broadcast(event: GatewayEvent): void;
    emitToClients(eventType: string, payload: unknown): void;
    private getHealth;
    private getStatus;
    private getPresence;
    private getUptime;
    stop(reason?: string): Promise<void>;
    getClientCount(): number;
}
export { Gateway };
export declare const gateway: Gateway;
//# sourceMappingURL=server.d.ts.map