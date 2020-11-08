import { action, observable } from "mobx";

export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
      );
    });
  });
}

export type DisposableValue = (() => void) | { cancel: () => void };

export class Disposable {
  _disposables: DisposableValue[] = [];
  _isDisposed = false;

  onDispose(disposable: DisposableValue) {
    this._disposables.push(disposable);
    return () => {
      this._disposables.splice(this._disposables.indexOf(disposable), 1);

      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    };
  }

  dispose() {
    this._disposables.forEach((disposable) => {
      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    });

    this._isDisposed = true;
  }
}

export class Async {
  async async<T, S, E>(
    promise: Promise<T>,
    successCallback: (data: T) => S,
    errorCallback: (error: Error) => E
  ): Promise<S | E> {
    try {
      const data = await promise;

      if ((this as any)._isDisposed) {
        console.warn(
          `${this.constructor.name} resolved async, but is disposed`
        );
        return;
      }

      return action(successCallback)(data);
    } catch (error) {
      if ((this as any)._isDisposed) {
        console.warn(
          `${this.constructor.name} rejected async, but is disposed`
        );
        return;
      }
      if (errorCallback) {
        return action(errorCallback)(error);
      }

      throw error;
    }
  }
}

export class StateMachine<
  S extends { current: string; [key: string]: unknown },
  E extends { type: string; [key: string]: unknown }
> {
  @observable
  state: S = {} as S;

  onMessage(_: E): S | void {
    throw new Error("Implement this!");
  }

  send(event: E) {
    const newState = action(this.onMessage)(event);

    if (newState) {
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
}
