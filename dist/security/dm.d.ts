/**
 * 🥝 KiwiBot Pro - DM Security & Pairing
 * Allowlists and pairing codes for unknown senders (like Moltbot)
 */
type DMPolicy = 'open' | 'pairing' | 'allowlist' | 'closed';
interface PairingCode {
    code: string;
    channel: string;
    userId: string;
    userName: string;
    createdAt: Date;
    expiresAt: Date;
}
interface AllowlistEntry {
    userId: string;
    userName: string;
    channel: string;
    addedAt: Date;
    addedBy: string;
    note?: string;
}
declare class DMSecurity {
    private config;
    private allowlist;
    private pendingPairings;
    constructor();
    /**
     * Check if a user is allowed to DM
     */
    checkAccess(channel: string, userId: string): {
        allowed: boolean;
        reason: string;
    };
    /**
     * Generate a pairing code for unknown sender
     */
    generatePairingCode(channel: string, userId: string, userName: string): string;
    /**
     * Approve a pairing code
     */
    approvePairing(code: string, approvedBy?: string): {
        success: boolean;
        message: string;
    };
    /**
     * Reject a pairing code
     */
    rejectPairing(code: string): boolean;
    /**
     * Add user to allowlist
     */
    addToAllowlist(channel: string, userId: string, userName: string, addedBy: string, note?: string): void;
    /**
     * Remove user from allowlist
     */
    removeFromAllowlist(channel: string, userId: string): boolean;
    /**
     * Get pending pairings
     */
    getPendingPairings(): PairingCode[];
    /**
     * Get allowlist entries
     */
    getAllowlist(channel?: string): AllowlistEntry[];
    /**
     * Get policy for channel
     */
    getPolicy(channel: string): DMPolicy;
    /**
     * Set policy for channel
     */
    setPolicy(channel: string, policy: DMPolicy): void;
    /**
     * Generate pairing response message
     */
    getPairingMessage(code: string, channel: string): string;
    /**
     * Load allowlist from file
     */
    private loadAllowlist;
    /**
     * Save allowlist to file
     */
    private saveAllowlist;
    /**
     * Cleanup expired pairings
     */
    private startCleanupInterval;
}
export declare const dmSecurity: DMSecurity;
export {};
//# sourceMappingURL=dm.d.ts.map