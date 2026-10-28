export class EventBus {
  #handlers = new Map();

  subscribe(eventName, handler) {
    const handlers = this.#handlers.get(eventName) ?? [];
    handlers.push(handler);
    this.#handlers.set(eventName, handlers);
  }

  publish(event) {
    for (const handler of this.#handlers.get(event.type) ?? []) {
      handler(event);
    }
  }
}
