export type TEvent = {
  type: string;
  data: {
    [key: string]: unknown;
  };
};

const EVENT_LISTENERS = Symbol("EVENT_LISTENERS");

export class EventHub<T extends TEvent> {
  [EVENT_LISTENERS]: { [type: string]: Function[] };
  on<U extends T["type"]>(
    type: U,
    cb: (data: T extends { type: U } ? T["data"] : never) => void
  ) {
    if (!this[EVENT_LISTENERS]) {
      this[EVENT_LISTENERS] = {};
    }

    if (!this[EVENT_LISTENERS][type]) {
      this[EVENT_LISTENERS][type] = [];
    }

    this[EVENT_LISTENERS][type].push(cb);
  }
  emit<U extends T["type"]>(
    type: U,
    data: T extends { type: U } ? T["data"] : never
  ) {
    if (this[EVENT_LISTENERS] && this[EVENT_LISTENERS][type]) {
      this[EVENT_LISTENERS][type].forEach((listener) => listener(data));
    }
  }
}
