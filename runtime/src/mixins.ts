import { action, observable } from "mobx";

export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name === "constructor") {
        return;
      }
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!
      );
    });
  });
}

export type DisposableValue = (() => void) | { cancel: () => void };

export const DISPOSABLES = Symbol("DISPOSABLES");

export const IS_DISPOSED = Symbol("IS_DISPOSED");

export class Disposable {
  [DISPOSABLES]: DisposableValue[];
  [IS_DISPOSED]: boolean;

  onDispose(disposable: DisposableValue) {
    if (!this[DISPOSABLES]) {
      this[DISPOSABLES] = [];
    }

    this[DISPOSABLES].push(disposable);
    return () => {
      this[DISPOSABLES].splice(this[DISPOSABLES].indexOf(disposable), 1);

      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    };
  }

  dispose() {
    if (this[DISPOSABLES]) {
      this[DISPOSABLES].forEach((disposable) => {
        if ("cancel" in disposable) {
          disposable.cancel();
        } else {
          disposable();
        }
      });
    }

    this[IS_DISPOSED] = true;
  }
}

export class Resolver {
  [IS_DISPOSED]: boolean;
  async resolve<T>(
    promise: Promise<T>,
    resolvers: {
      rejected: (error: Error) => void;
      resolved: (data: T) => void;
    }
  ) {
    try {
      const data = await promise;

      if (this[IS_DISPOSED]) {
        console.warn(
          `${this.constructor.name} resolved async, but is disposed`
        );
        return;
      }

      return action(resolvers.resolved)(data);
    } catch (error) {
      if (this[IS_DISPOSED]) {
        console.warn(
          `${this.constructor.name} rejected async, but is disposed`
        );
        return;
      }

      return action(resolvers.rejected)(error);
    }
  }
}

export type StateMachineTransitions<
  S extends { current: string; [key: string]: unknown }
> = {
  [T in S["current"]]: {
    [K in S["current"]]?:
      | boolean
      | ((
          nextState: S extends { current: K } ? S : never,
          prevState: S extends { current: T } ? S : never
        ) => boolean);
  };
};

export class StateMachine<
  S extends { current: string; [key: string]: unknown }
> {
  @observable
  state!: S;

  readonly transitions: StateMachineTransitions<S> = null as any;

  @action
  transition(newState: S): S | void {
    if (!this.transitions) {
      throw new Error(
        "You have not defined the transitions for this state machine"
      );
    }

    if (!(this.transitions as any)[this.state.current][newState.current]) {
      console.warn(
        `Invalid transition from "${this.state.current}" to "${newState.current}"`
      );
      return;
    }

    if (
      typeof (this.transitions as any)[this.state.current][newState.current] ===
        "function" &&
      !(this.transitions as any)[this.state.current][newState.current](
        this.state
      )
    ) {
      console.warn(
        `Ignoring transition from "${this.state.current}" to "${newState.current}"`
      );
      return;
    }

    // We automatically dispose of any disposables
    Object.values(this.state).forEach((value: any) => {
      if (value && value[IS_DISPOSED] === false) {
        value.dispose();
      }
    });

    this.state = newState;

    return newState;
  }

  matches<T extends S["current"]>(state: T): (S & { current: T }) | null {
    if (this.state.current === state) {
      return this.state as any;
    }

    return null;
  }
}
