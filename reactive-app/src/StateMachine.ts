export class StateMachine<
  S extends { current: string },
  E extends { type: string }
> {
  state: S;
  constructor(state: S) {
    this.state = state;
  }
  onMessage(_: E): S | void {
    throw new Error("Implement this!");
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
      const value = this.state[key];
      if (value instanceof StateMachine) {
        value.dispose();
      }
    }
  }
}
