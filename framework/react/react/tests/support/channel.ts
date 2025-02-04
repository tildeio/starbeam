import type { Unsubscribe } from "@starbeam/timeline";

export class Channel {
  static reset(this: void): void {
    Channel.#active = [];
  }

  static subscribe(name: string): Channel {
    const channel = new Channel(Channel.#nextId++, name);
    Channel.#active.push(channel);
    return channel;
  }

  static latest(): Channel | undefined {
    return Channel.#active.length === 0
      ? undefined
      : Channel.#active[Channel.#active.length - 1];
  }

  static #active: Channel[] = [];

  static sendMessage(channel: Channel, message: string): void {
    if (channel.isActive) {
      for (const subscriber of channel.#onMessage) {
        subscriber(message);
      }
    }
  }

  static #nextId = 0;

  #id: number;
  #name: string;
  #onMessage: Set<(message: string) => void> = new Set();

  constructor(id: number, name: string) {
    this.#id = id;
    this.#name = name;
  }

  onMessage(callback: (message: string) => void): Unsubscribe {
    this.#onMessage.add(callback);

    return () => {
      this.#onMessage.delete(callback);
    };
  }

  get id(): number {
    return this.#id;
  }

  get name(): string {
    return this.#name;
  }

  get isActive(): boolean {
    return Channel.#active.includes(this);
  }

  cleanup(): void {
    const index = Channel.#active.indexOf(this);
    if (index >= 0) {
      Channel.#active.splice(index, 1);
    }
  }
}
