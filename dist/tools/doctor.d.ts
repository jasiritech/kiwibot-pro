/**
 * 🥝 KiwiBot Pro - Doctor Command
 * Diagnostics and health checking (like Moltbot's doctor)
 */
interface DiagnosticResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: any;
}
interface DoctorReport {
    timestamp: Date;
    version: string;
    system: SystemInfo;
    checks: DiagnosticResult[];
    summary: {
        passed: number;
        warnings: number;
        failed: number;
    };
}
interface SystemInfo {
    os: string;
    osVersion: string;
    nodeVersion: string;
    architecture: string;
    cpus: number;
    memory: {
        total: string;
        free: string;
        used: string;
    };
    uptime: string;
}
declare class Doctor {
    /**
     * Run full diagnostic check
     */
    diagnose(): Promise<DoctorReport>;
    /**
     * Get system information
     */
    private getSystemInfo;
    /**
     * Check Node.js version
     */
    private checkNodeVersion;
    /**
     * Check .env file
     */
    private checkEnvFile;
    /**
     * Check AI providers
     */
    private checkAIProviders;
    /**
     * Check gateway status
     */
    private checkGateway;
    /**
     * Check channels
     */
    private checkChannels;
    /**
     * Check DM policy (security)
     */
    private checkDMPolicy;
    /**
     * Check disk space
     */
    private checkDiskSpace;
    /**
     * Check memory usage
     */
    private checkMemory;
    /**
     * Check sessions
     */
    private checkSessions;
    /**
     * Check config validity
     */
    private checkConfig;
    /**
     * Format bytes to human readable
     */
    private formatBytes;
    /**
     * Format uptime to human readable
     */
    private formatUptime;
    /**
     * Print report to console
     */
    printReport(report: DoctorReport): void;
}
export declare const doctor: Doctor;
export {};
//# sourceMappingURL=doctor.d.ts.map