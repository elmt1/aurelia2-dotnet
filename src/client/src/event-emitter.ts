/**
 * EventEmitter class to handle custom events within the application.
 * This class allows you to subscribe to events and emit events with arguments.
 */
export class EventEmitter {
    private readonly events: Record<string, ((...args: unknown[]) => void)[]> = {};

    /**
     * Subscribes a listener function to a specific event.
     * @param event - The name of the event to subscribe to.
     * @param listener - The function to call when the event is emitted.
     */
    on(event: string, listener: (...args: unknown[]) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * Emits an event, calling all subscribed listener functions with the provided arguments.
     * @param event - The name of the event to emit.
     * @param args - The arguments to pass to the listener functions.
     */
    emit(event: string, ...args: unknown[]) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
}

/**
 * Singleton instance of the EventEmitter class.
 * This instance can be imported and used throughout the application to manage events.
 */
export const eventEmitter = new EventEmitter();