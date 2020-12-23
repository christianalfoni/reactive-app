import { makeObservable } from "mobx";

import { INSTANCE_ID } from "./common";
import { IDevtool } from "./devtool";
import { Devtool } from "./devtool";

export * from "mobx";

export interface IOptions {
  devtool?: string;
}

export interface IClass<T> {
  new (...args: any[]): T;
}

export type IClassFactory<T extends IClass<any>> = (
  create: (...args: any[]) => T
) => (...args: any[]) => T;

export interface IContainerConfig {
  [key: string]: IClass<any> | IClassFactory<any>;
}

export type IFactory<T extends IClass<any>> = (
  ...args: ConstructorParameters<T>
) => T extends IClass<infer U> ? U : never;

export interface IContainer<T extends IContainerConfig> {
  get<U extends keyof T>(id: U): T[U] extends IClass<infer O> ? O : never;
  getSingleton<U extends keyof T>(
    id: U
  ): T[U] extends IClass<infer O> ? O : never;
  getFactory<U extends keyof T>(
    id: U
  ): T[U] extends IClass<infer O>
    ? (...args: ConstructorParameters<T[U]>) => O
    : never;
}

const IOC_CONTAINER = Symbol("IOC_CONTAINER");

export class Container<T extends IContainerConfig> implements IContainer<T> {
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
  private register<U>(
    id: keyof T,
    ClassOrFactory: IClass<U> | IClassFactory<IClass<U>>
  ) {
    this._classes.set(id, ClassOrFactory);
  }
  get<U extends keyof T>(
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
  getSingleton<U extends keyof T>(
    id: U
  ): T[U] extends IClass<infer O> ? O : never {
    return (
      this._singletons.get(id) || this._singletons.set(id, this.get(id)).get(id)
    );
  }
  getFactory<U extends keyof T>(
    id: U
  ): T[U] extends IClass<infer O>
    ? (...args: ConstructorParameters<T[U]>) => O
    : never {
    return ((...args: any[]) => {
      const instance = this.get(id, ...args) as any;

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

      if (instance.hotReloadUI) {
        instance.hotReloadUI();
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
        const instance = this[IOC_CONTAINER].getSingleton(classKey);
        this[IOC_CONTAINER]._devtool?.sendInjection({
          propertyName: key,
          injectClassId: classKey,
          injectInstanceId: instance[INSTANCE_ID],
          instanceId: this[INSTANCE_ID],
          classId: this.constructor.name,
        });

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

export function injectFactory(classKey: string): any {
  return function (target: any, key: string): any {
    return {
      get() {
        if (!this[IOC_CONTAINER]) {
          throw new Error("You are using inject on a non injectable class");
        }

        const factory = this[IOC_CONTAINER].getFactory(classKey);

        const debugFactory = (...args: any[]) => {
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

        // We do not need to dynamically grab it again
        Object.defineProperty(target, key, {
          value: debugFactory,
          configurable: false,
          enumerable: false,
        });

        return debugFactory;
      },
      enumerable: false,
      configurable: true,
    };
  };
}
