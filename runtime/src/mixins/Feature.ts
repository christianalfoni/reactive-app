import * as mobx from "mobx";
import { IClass } from "../types";
import { Factory } from "./Factory";

export type TInjection<T extends IClass<any>> = T extends IClass<infer O>
  ? O extends Factory
    ? (...args: ConstructorParameters<T>) => O
    : O
  : never;

export class Feature {
  protected injectFeatures(
    props: {
      [U in keyof this]?: string;
    }
  ): void {
    // This method is overriden by the container
  }
  protected makeObservable(props: any) {
    const observables: any = {};

    Object.keys(props).forEach((key) => {
      const configType = (props as any)[key];

      if (configType === "observable") {
        observables[key] = mobx.observable;
      } else if (configType === "action") {
        observables[key] = mobx.action;
      } else if (configType === "computed") {
        observables[key] = mobx.computed;
      }
    });

    mobx.makeObservable(this, observables);
  }
  protected autorun(cb: () => void) {
    if (typeof (this as any).onDispose === "function") {
      return (this as any).onDispose(mobx.autorun(cb));
    }

    return mobx.autorun(cb);
  }
  protected reaction<T>(
    value: () => T,
    reaction: (value: T, previousValue: T) => void,
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
