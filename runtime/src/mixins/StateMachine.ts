import { action, runInAction } from "mobx";

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
    //@ts-ignore
    if (!this.state) {
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
  protected transitionTo(stateOrCallback: S | ((current: S) => S)): boolean {
    //@ts-ignore
    if (!this.state) {
      throw new Error("You have to transition to an initial state first");
    }
    const state =
      typeof stateOrCallback === "function"
        ? //@ts-ignore
          stateOrCallback(this.state)
        : stateOrCallback;
    //@ts-ignore
    const fromState = this.state.state;
    const toState = state.state;
    if (
      // @ts-ignore
      this.transitions[fromState] &&
      // @ts-ignore
      this.transitions[fromState][toState]
    ) {
      runInAction(() => {
        //@ts-ignore
        this.state = state;
      });

      // @ts-ignore
      this.transitions[fromState][toState].forEach((cb) => {
        //@ts-ignore
        cb(this.state);
      });

      return true;
    }

    return false;
  }

  // @ts-ignore
  match<T extends TMatch<S>>(
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
      return matches[this.state.state](this.state);
    }

    // @ts-ignore Too complex for TS to do this correctly
    return (matches) => matches[this.state.state](this.state);
  }
}
