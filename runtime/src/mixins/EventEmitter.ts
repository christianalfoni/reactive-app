class Emitter<T = void> {
  private listeners: Array<(value: T) => void> = [];
  fire(value: T) {
    this.listeners.forEach((cb) => cb(value));
  }
  event = (cb: (value: T) => void) => {
    this.listeners.push(cb);
    return () => {
      this.listeners.splice(this.listeners.indexOf(cb), 1);
    };
  };
}

export class EventEmitter {
  createEmitter<T>() {
    return new Emitter<T>();
  }
}
