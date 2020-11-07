import { observable } from ".";

export class StateMachine<
  S extends { current: string; [key: string]: unknown },
  E extends { type: string; [key: string]: unknown }
> {
  @observable
  state: S;
  constructor(state: S) {
    this.state = state;
  }
  onMessage(_: E): S | void {
    throw new Error("Please implement the onMessage handler");
  }
  send(event: E) {
    const newState = this.onMessage(event);

    if (newState) {
      this.dispose();
      this.state = newState;
    }
  }
  matches<T extends S["current"]>(state: T): (S & { current: T }) | null {
    if (this.state.current === state) {
      return this.state as any;
    }

    return null;
  }
  dispose() {
    for (const key in this.state) {
      const value = this.state[key] as { dispose?: () => void };
      if (value && typeof value.dispose === "function") {
        value.dispose();
      }
    }
  }
}
