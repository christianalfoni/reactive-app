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
}
