import { action } from "mobx";

export type DisposableValue = (() => void) | { cancel: () => void };

export const DISPOSABLES = Symbol("DISPOSABLES");

export const IS_DISPOSED = Symbol("IS_DISPOSED");

export class Factory {
  [DISPOSABLES]: DisposableValue[];
  [IS_DISPOSED]: boolean;

  isDisposed() {
    return Boolean(this[IS_DISPOSED]);
  }

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
