import * as mobx from "mobx";
import { TFeature } from "..";
import { IClass } from "../types";
import { Factory } from "./Factory";

export type TInjection<T extends IClass<any>> = T extends IClass<infer O>
  ? O extends Factory
    ? (...args: ConstructorParameters<T>) => O
    : O
  : never;

export class Feature {
  protected injectFeature<T extends IClass<any>>(feature: string): TFeature<T> {
    // This method is overriden by the container
    return {} as any;
  }
}
