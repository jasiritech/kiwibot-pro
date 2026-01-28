/**
 * 🥝 KiwiBot Pro - Web Dashboard
 * Control UI with WebSocket real-time updates
 */
declare class WebDashboard {
    private app;
    private server;
    private wss;
    private clients;
    constructor();
    private setupRoutes;
    private setupWebSocket;
    private setupEventForwarding;
    private broadcast;
    private getDashboardHTML;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare const webDashboard: WebDashboard;
export {};
//# sourceMappingURL=dashboard.d.ts.map