import { action, computed, makeObservable, observable, when } from "mobx";
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
        observables[key] = observable;
      } else if (configType === "action") {
        observables[key] = action;
      } else if (configType === "computed") {
        observables[key] = computed;
      }
    });

    makeObservable(this, observables);
  }
  protected when(condition: () => boolean, cb?: () => void) {
    if (cb) {
      const disposer = when(condition, cb);

      if (typeof (this as any).onDispose === "function") {
        const dispose = (this as any).onDispose(disposer);

        return () => {
          dispose();
          disposer();
        };
      }

      return disposer;
    }

    const disposer = when(condition);

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
