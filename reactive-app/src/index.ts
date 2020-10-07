import { makeObservable } from "mobx";

export * from "mobx";

export interface IClass<T> {
  new (...args: any[]): T;
}

export interface IContext {
  get: <T extends IClass<any>>(id: string) => T;
}

export type IClassFactory<T extends IClass<any>> = (
  context: IContext
) => (...args: any[]) => T;

export interface IContainerConfig {
  [key: string]: IClass<any> | IClassFactory<any>;
}

export interface IContainer<T extends IContainerConfig> {
  get<U extends keyof T>(id: U): T[U] extends IClass<infer O> ? O : never;
}

const IOC_CONTAINER = Symbol("IOC_CONTAINER");

class Container<T extends IContainerConfig> implements IContainer<T> {
  private _injected = new Map<keyof T, any>();
  constructor(types: T) {
    Object.keys(types).forEach((key) => {
      this.register(key, types[key]);
    });
  }
  private register<U>(
    id: keyof T,
    ClassOrFactory: IClass<U> | IClassFactory<IClass<U>>
  ) {
    this._injected.set(id, ClassOrFactory);
  }
  get<U extends keyof T>(id: U): T[U] extends IClass<infer O> ? O : never {
    if (!this._injected.has(id)) {
      throw new Error(`The identifier ${id} is not registered`);
    }
    let instance = this._injected.get(id);

    const constr = instance;
    // eslint-disable-next-line
    const self = this;
    const proxy = new Proxy(constr, {
      construct: function (this: any, target, args) {
        const obj = Object.create(constr.prototype);
        this.apply(target, obj, args);
        return obj;
      },
      apply: function (_, that, args) {
        that[IOC_CONTAINER] = self;
        constr.apply(that, args);
      },
    });
    instance = new proxy(this);

    try {
      makeObservable(instance);
    } catch (error) {
      // Not an observable class
    }

    this._injected.set(id, instance);

    return (instance as unknown) as any;
  }
}

export function inject(target: any, key: string): any {
  return {
    get() {
      if (!this[IOC_CONTAINER]) {
        console.log(target, key);
        throw new Error("You are using inject on a non injectable class");
      }
      return this[IOC_CONTAINER].get(key);
    },
    enumerable: false,
    configurable: false,
  };
}

export const createApp = <T extends IContainerConfig>(classes: T) => {
  const ws = new WebSocket("http://localhost:5051");
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    console.log(event.data);
  });
  return new Container(classes);
};
