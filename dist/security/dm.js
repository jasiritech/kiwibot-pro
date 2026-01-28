/**
 * 🥝 KiwiBot Pro - DM Security & Pairing
 * Allowlists and pairing codes for unknown senders (like Moltbot)
 */
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/events.js';
import * as fs from 'fs';
import * as path from 'path';
class DMSecurity {
    config;
    allowlist = new Map();
    pendingPairings = new Map();
    constructor() {
        this.config = {
            defaultPolicy: process.env.DM_POLICY || 'pairing',
            channelPolicies: {
                discord: process.env.DISCORD_DM_POLICY || 'pairing',
                telegram: process.env.TELEGRAM_DM_POLICY || 'pairing',
                whatsapp: process.env.WHATSAPP_DM_POLICY || 'pairing',
            },
            pairingCodeExpiry: parseInt(process.env.PAIRING_CODE_EXPIRY || '15'),
            allowlistPath: process.env.ALLOWLIST_PATH || './.kiwibot/allowlist.json',
        };
        this.loadAllowlist();
        this.startCleanupInterval();
    }
    /**
     * Check if a user is allowed to DM
     */
    checkAccess(channel, userId) {
        const policy = this.config.channelPolicies[channel] || this.config.defaultPolicy;
        switch (policy) {
            case 'open':
                return { allowed: true, reason: 'Policy is open' };
            case 'closed':
                return { allowed: false, reason: 'DMs are disabled' };
            case 'allowlist':
            case 'pairing':
                const key = `${channel}:${userId}`;
                if (this.allowlist.has(key)) {
                    return { allowed: true, reason: 'User in allowlist' };
                }
                return {
                    allowed: false,
                    reason: policy === 'pairing'
                        ? 'Pairing required'
                        : 'Not in allowlist'
                };
            default:
                return { allowed: false, reason: 'Unknown policy' };
        }
    }
    /**
     * Generate a pairing code for unknown sender
     */
    generatePairingCode(channel, userId, userName) {
        // Generate 6-character alphanumeric code
        const code = uuid().slice(0, 6).toUpperCase();
        const pairing = {
            code,
            channel,
            userId,
            userName,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.pairingCodeExpiry * 60 * 1000),
        };
        this.pendingPairings.set(code, pairing);
        logger.info(`DM Security: Generated pairing code ${code} for ${userName} (${channel})`);
        return code;
    }
    /**
     * Approve a pairing code
     */
    approvePairing(code, approvedBy = 'owner') {
        const pairing = this.pendingPairings.get(code.toUpperCase());
        if (!pairing) {
            return { success: false, message: 'Invalid or expired pairing code' };
        }
        if (new Date() > pairing.expiresAt) {
            this.pendingPairings.delete(code);
            return { success: false, message: 'Pairing code expired' };
        }
        // Add to allowlist
        this.addToAllowlist(pairing.channel, pairing.userId, pairing.userName, approvedBy, `Paired with code ${code}`);
        // Remove pairing
        this.pendingPairings.delete(code);
        logger.info(`DM Security: Approved pairing for ${pairing.userName}`);
        return { success: true, message: `${pairing.userName} approved for ${pairing.channel}` };
    }
    /**
     * Reject a pairing code
     */
    rejectPairing(code) {
        return this.pendingPairings.delete(code.toUpperCase());
    }
    /**
     * Add user to allowlist
     */
    addToAllowlist(channel, userId, userName, addedBy, note) {
        const key = `${channel}:${userId}`;
        const entry = {
            userId,
            userName,
            channel,
            addedAt: new Date(),
            addedBy,
            note,
        };
        this.allowlist.set(key, entry);
        this.saveAllowlist();
        eventBus.emitEvent('dm:allowed', channel, userId, userName);
        logger.info(`DM Security: Added ${userName} to ${channel} allowlist`);
    }
    /**
     * Remove user from allowlist
     */
    removeFromAllowlist(channel, userId) {
        const key = `${channel}:${userId}`;
        const removed = this.allowlist.delete(key);
        if (removed) {
            this.saveAllowlist();
            logger.info(`DM Security: Removed ${userId} from ${channel} allowlist`);
        }
        return removed;
    }
    /**
     * Get pending pairings
     */
    getPendingPairings() {
        return Array.from(this.pendingPairings.values())
            .filter(p => new Date() < p.expiresAt);
    }
    /**
     * Get allowlist entries
     */
    getAllowlist(channel) {
        const entries = Array.from(this.allowlist.values());
        if (channel) {
            return entries.filter(e => e.channel === channel);
        }
        return entries;
    }
    /**
     * Get policy for channel
     */
    getPolicy(channel) {
        return this.config.channelPolicies[channel] || this.config.defaultPolicy;
    }
    /**
     * Set policy for channel
     */
    setPolicy(channel, policy) {
        this.config.channelPolicies[channel] = policy;
        logger.info(`DM Security: Set ${channel} policy to ${policy}`);
    }
    /**
     * Generate pairing response message
     */
    getPairingMessage(code, channel) {
        return `🔐 **Pairing Required**

I don't recognize you yet. To start chatting:

1. Ask the bot owner to run:
   \`kiwi pairing approve ${code}\`

2. Or share this code: **${code}**

_This code expires in ${this.config.pairingCodeExpiry} minutes._`;
    }
    /**
     * Load allowlist from file
     */
    loadAllowlist() {
        try {
            if (fs.existsSync(this.config.allowlistPath)) {
                const data = fs.readFileSync(this.config.allowlistPath, 'utf-8');
                const entries = JSON.parse(data);
                for (const entry of entries) {
                    const key = `${entry.channel}:${entry.userId}`;
                    entry.addedAt = new Date(entry.addedAt);
                    this.allowlist.set(key, entry);
                }
                logger.info(`DM Security: Loaded ${this.allowlist.size} allowlist entries`);
            }
        }
        catch (error) {
            logger.warn(`DM Security: Could not load allowlist: ${error.message}`);
        }
    }
    /**
     * Save allowlist to file
     */
    saveAllowlist() {
        try {
            const dir = path.dirname(this.config.allowlistPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const entries = Array.from(this.allowlist.values());
            fs.writeFileSync(this.config.allowlistPath, JSON.stringify(entries, null, 2));
        }
        catch (error) {
            logger.error(`DM Security: Could not save allowlist: ${error.message}`);
        }
    }
    /**
     * Cleanup expired pairings
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = new Date();
            for (const [code, pairing] of this.pendingPairings) {
                if (now > pairing.expiresAt) {
                    this.pendingPairings.delete(code);
                }
            }
        }, 60 * 1000); // Every minute
    }
}
export const dmSecurity = new DMSecurity();
//# sourceMappingURL=dm.js.map