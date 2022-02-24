import * as mobx from "mobx";

export class ObservableState {
  protected runInAction(cb: () => void) {
    return mobx.runInAction(cb);
  }
  protected autorun(cb: () => void) {
    if (typeof (this as any).onDispose === "function") {
      return (this as any).onDispose(mobx.autorun(cb));
    }

    return mobx.autorun(cb);
  }
  protected reaction<T>(
    value: () => T,
    reaction: (value: T, previousValue: T | undefined) => void,
    options?: {
      fireImmediately?: boolean;
    }
  ) {
    if (typeof (this as any).onDispose === "function") {
      return (this as any).onDispose(mobx.reaction(value, reaction, options));
    }

    return mobx.reaction(value, reaction, options);
  }
  protected when(condition: () => boolean, cb?: () => void) {
    if (cb) {
      const disposer = mobx.when(condition, cb);

      if (typeof (this as any).onDispose === "function") {
        const dispose = (this as any).onDispose(disposer);

        return () => {
          dispose();
          disposer();
        };
      }

      return disposer;
    }

    const disposer = mobx.when(condition);

    if (typeof (this as any).onDispose === "function") {
      const dispose = (this as any).onDispose(disposer);
      const cancel = disposer.cancel;

      disposer.cancel = () => {
        dispose();
        cancel();
      };
    }

    return disposer;
  }
}
