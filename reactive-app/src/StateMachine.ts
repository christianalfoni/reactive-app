import { observable, action } from ".";
import { Entity } from "./Entity";

export class StateMachine<
  S extends { current: string; [key: string]: unknown },
  E extends { type: string; [key: string]: unknown }
> extends Entity {
  private transitions: {
    [T in S["current"]]: S["current"][];
  };
  @observable
  state: S;

  constructor(
    transitions: {
      [T in S["current"]]: S["current"][];
    },
    state: S
  ) {
    super();
    this.transitions = transitions;
    this.state = (observable(state) as unknown) as S;
  }

  onMessage(_: E): S | void {
    throw new Error("Implement this!");
  }

  send(event: E) {
    const newState = action(this.onMessage)(event);

    if (newState) {
      this.dispose();
      this.state = newState;
    }

    return this;
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
