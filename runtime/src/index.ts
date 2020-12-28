import { makeObservable } from "mobx";

import { INSTANCE_ID } from "./common";
import { IDevtool } from "./devtool";
import { Devtool } from "./devtool";
import * as mixins from "./mixins";

export * from "mobx";

export * from "./mixins";

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name === "constructor") {
        return;
      }
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!
      );
    });
  });
}

export interface IOptions {
  devtool?: string;
}

export interface IClass<T> {
  new (...args: any[]): T;
  mixins?: string[];
}

export interface IContainerConfig {
  [key: string]: IClass<any>;
}

export type IInjection<T extends IClass<any>> = T extends IClass<infer O>
  ? O extends mixins.Factory
    ? (...args: ConstructorParameters<T>) => O
    : O
  : never;

const IOC_CONTAINER = Symbol("IOC_CONTAINER");

export class Container<T extends IContainerConfig> {
  private _classes = new Map<keyof T, any>();
  private _singletons = new Map<keyof T, any>();
  private _factoryInstances = new Map<keyof T, any[]>();
  private _devtool: IDevtool | undefined;
  private _currentClassId = 1;

  constructor(classes: T, options: IOptions = {}) {
    if (options.devtool) {
      this._devtool = new Devtool(options.devtool);
      this._devtool.spy();
    }

    Object.keys(classes).forEach((key) => {
      this.register(key, classes[key]);
    });
  }
  private register<U>(id: keyof T, SingletonOrFactory: IClass<U>) {
    if (SingletonOrFactory.mixins) {
      const mixinDefinitions = SingletonOrFactory.mixins.map((key) => {
        if (!(key in mixins)) {
          throw new Error(
            `There is no mixin "${key}", used with class "${id}"`
          );
        }

        return (mixins as any)[key];
      });
      applyMixins(SingletonOrFactory, mixinDefinitions);
    }

    this._classes.set(id, SingletonOrFactory);
  }
  private create<U extends keyof T>(
    id: U,
    ...args: any[]
  ): T[U] extends IClass<infer O> ? O : never {
    if (!this._classes.has(id)) {
      throw new Error(`The identifier ${id} is not registered`);
    }
    const constr = this._classes.get(id);
    // eslint-disable-next-line
    const self = this;
    const instanceId = this._currentClassId++;
    const proxy = new Proxy(constr, {
      construct: function (this: any, target, args) {
        const obj = Object.create(constr.prototype);
        this.apply(target, obj, args);
        return obj;
      },
      apply: function (_, that, args) {
        that[IOC_CONTAINER] = self;
        that[INSTANCE_ID] = instanceId;
        constr.apply(that, args);
      },
    });

    const instance = new proxy(...args);

    try {
      this._devtool?.setInstanceSpy(instanceId);

      makeObservable(instance);
    } catch {
      // No observables
    }

    this._devtool?.unsetInstanceSpy();
    this._devtool?.sendInstance(id as string, instanceId, instance);

    return (instance as unknown) as any;
  }
  get<U extends keyof T>(
    id: U
  ): T[U] extends IClass<infer O>
    ? O extends mixins.Factory
      ? (...args: ConstructorParameters<T[U]>) => O
      : O
    : never {
    const clas = this._classes.get(id);

    if (!clas) {
      throw new Error(`No class by the name ${id}`);
    }

    if (clas.mixins && clas.mixins.includes("Factory")) {
      return ((...args: any[]) => {
        const instance = this.create(id, ...args) as any;

        // If development
        const factoryInstances =
          this._factoryInstances.get(id) ||
          this._factoryInstances.set(id, []).get(id)!;

        factoryInstances.push(instance);

        if (instance.onDispose) {
          instance.onDispose(() => {
            factoryInstances.splice(factoryInstances.indexOf(instance), 1);
            this._devtool?.sendDispose({
              instanceId: instance[INSTANCE_ID],
              classId: id as string,
            });
          });
        }

        return instance;
      }) as any;
    }

    return (this._singletons.get(id) ||
      this._singletons.set(id, this.create(id)).get(id)) as any;
  }
  hotReload(newClass: any) {
    const id = newClass.name;
    const singleton = this._singletons.get(id);
    const factoryInstances = this._factoryInstances.get(id);
    const instances = singleton ? [singleton] : factoryInstances;

    instances?.forEach((instance) => {
      Object.getOwnPropertyNames(newClass.prototype).forEach((key) => {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(
          newClass.prototype,
          key
        );

        if (
          propertyDescriptor?.writable &&
          typeof newClass.prototype[key] === "function" &&
          key !== "constructor"
        ) {
          instance[key] = newClass.prototype[key];
        }
      });

      if (instance.hotReloadView) {
        instance.hotReloadView();
      }
    });
  }
}

export function inject(classKey: string): any {
  return function (target: any, key: string): any {
    return {
      get() {
        if (!this[IOC_CONTAINER]) {
          throw new Error("You are using inject on a non injectable class");
        }

        const clas = this[IOC_CONTAINER].get(classKey);
        let instance;

        if (clas.mixins && clas.mixins.includes("Factory")) {
          const factory = this[IOC_CONTAINER].getFactory(classKey);

          instance = (...args: any[]) => {
            const instance = factory(...args);
            this[IOC_CONTAINER]._devtool?.sendInjection({
              propertyName: key,
              injectClassId: classKey,
              injectInstanceId: instance[INSTANCE_ID],
              instanceId: this[INSTANCE_ID],
              classId: this.constructor.name,
            });
            return instance;
          };
        } else {
          instance = this[IOC_CONTAINER].get(classKey);
          this[IOC_CONTAINER]._devtool?.sendInjection({
            propertyName: key,
            injectClassId: classKey,
            injectInstanceId: instance[INSTANCE_ID],
            instanceId: this[INSTANCE_ID],
            classId: this.constructor.name,
          });
        }

        // We do not need to dynamically grab it again
        Object.defineProperty(target, key, {
          value: instance,
          configurable: false,
          enumerable: false,
        });

        return instance;
      },
      enumerable: false,
      configurable: true,
    };
  };
}
