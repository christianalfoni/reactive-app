import { observable } from "mobx";
import { action } from ".";

export type Disposable = (() => void) | { cancel: () => void };

export class Entity {
  private disposables: Disposable[] = [];

  private isDisposed = false;

  disposable(disposable: Disposable) {
    this.disposables.push(disposable);
    return () => {
      this.disposables.splice(this.disposables.indexOf(disposable), 1);

      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    };
  }

  dispose() {
    this.disposables.forEach((disposable) => {
      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    });

    this.isDisposed = true;
  }

  async async<T, S, E>(
    promise: Promise<T>,
    successCallback: (data: T) => S,
    errorCallback: (error: Error) => E
  ): Promise<S | E> {
    try {
      const data = await promise;

      if (this.isDisposed) {
        console.warn(
          `${this.constructor.name} resolved async, but is disposed`
        );
        return;
      }

      return action(successCallback)(data);
    } catch (error) {
      if (this.isDisposed) {
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
