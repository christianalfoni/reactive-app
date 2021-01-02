import { when } from "mobx";
import { IClass } from "../types";
import { Factory } from "./Factory";

export type TInjection<T extends IClass<any>> = T extends IClass<infer O>
  ? O extends Factory
    ? (...args: ConstructorParameters<T>) => O
    : O
  : never;

export class Feature {
  injectFeatures(
    props: {
      [U in keyof this]?: string;
    }
  ): void {
    // This method is overriden by the container
  }
  makeObservable(
    props: {
      [U in keyof this]?: "observable" | "action" | "computed";
    }
  ): void {
    // This method is overriden by the container
  }
  when(condition: () => boolean, cb?: () => void) {
    const disposer = cb ? when(condition, cb) : when(condition);

    if (typeof (this as any).onDispose === "function") {
      (this as any).onDispose(disposer);
    }
  }
}
