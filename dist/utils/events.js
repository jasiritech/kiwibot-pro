/**
 * 🥝 KiwiBot Pro - Event Bus
 * Centralized event system for the gateway
 */
import { EventEmitter } from 'events';
class EventBus extends EventEmitter {
    static instance;
    constructor() {
        super();
        this.setMaxListeners(100);
    }
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    // Type-safe event methods
    emitEvent(event, ...args) {
        return this.emit(event, ...args);
    }
    onEvent(event, listener) {
        return this.on(event, listener);
    }
    offEvent(event, listener) {
        return this.off(event, listener);
    }
    onceEvent(event, listener) {
        return this.once(event, listener);
    }
    // Debug helper
    logAllEvents() {
        const originalEmit = this.emit.bind(this);
        this.emit = (event, ...args) => {
            console.log(`[EventBus] ${String(event)}`, args);
            return originalEmit(event, ...args);
        };
    }
}
export const eventBus = EventBus.getInstance();
//# sourceMappingURL=events.js.map