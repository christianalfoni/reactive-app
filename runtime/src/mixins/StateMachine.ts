import { action, computed, makeObservable, observable } from "mobx";

type TState = {
  state: string;
};

export type PickState<T extends TState, U extends T["state"]> = T & {
  state: U;
};

type TMatch<S extends TState, R = any> = {
  [SS in S["state"]]: (state: S extends { state: SS } ? S : never) => R;
};

export class StateMachine<S extends TState> {
  private _state!: S;
  private transitions!: {
    [T in S["state"]]?: {
      [U in S["state"]]?: Array<(state: S & { state: T }) => void>;
    };
  };
  protected addTransition<T extends S["state"]>(
    fromState: S["state"],
    toState: T,
    cb?: (state: S & { state: T }) => void
  ) {
    if (!this._state) {
      throw new Error("You have to transition to an initial state first");
    }

    if (!this.transitions) {
      this.transitions = {};
    }

    if (!this.transitions[fromState]) {
      this.transitions[fromState] = {};
    }
    // @ts-ignore
    if (!this.transitions[fromState][toState]) {
      // @ts-ignore
      this.transitions[fromState][toState] = [];
    }

    if (cb) {
      // @ts-ignore
      this.transitions[fromState]![toState]!.push(action(cb));
    }
  }
  protected transitionTo(state: S): boolean {
    if (!this._state) {
      this._state = state;
      makeObservable(this, {
        // @ts-ignore
        _state: observable,
        state: computed,
      });
      return true;
    }
    const fromState = this._state.state;
    const toState = state.state;
    if (
      // @ts-ignore
      this.transitions[fromState] &&
      // @ts-ignore
      this.transitions[fromState][toState]
    ) {
      this._state = state;
      // @ts-ignore
      this.transitions[fromState][toState].forEach((cb) => {
        cb(this._state);
      });

      return true;
    }

    return false;
  }
  get state() {
    return this._state.state;
  }
  // @ts-ignore
  match<S extends this["_state"], T extends TMatch<S>>(
    matches: T &
      {
        [K in keyof T]: S extends TState
          ? K extends S["state"]
            ? T[K]
            : never
          : never;
      }
  ): {
    [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
  }[keyof T] {
    if (matches) {
      // @ts-ignore This is an exhaustive check
      return matches[this._state.state](this._state);
    }

    // @ts-ignore Too complex for TS to do this correctly
    return (matches) => matches[this._state.state](this._state);
  }
}
