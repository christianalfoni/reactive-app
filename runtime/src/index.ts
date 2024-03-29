import { INSTANCE_ID } from "./common";
import { IDevtool } from "./devtool";
import { Devtool } from "./devtool";
import * as mixins from "./mixins";
import { IClass, IContainerConfig, IOptions } from "./types";
import { TInjection } from "./mixins/Feature";
import { makeAutoObservable, makeObservable, observable } from "mobx";

export * from "mobx";

export * from "./mixins";

export * from "./types";

export type TFeature<T extends IClass<any>> = TInjection<T>;

const INJECT_FEATURE = Symbol("INJECT_FEATURE");

function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name === "constructor" || name in derivedCtor.prototype) {
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
    if (!Array.isArray(SingletonOrFactory.mixins)) {
      throw new Error('Class is missing static property "mixins"');
    }

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
  private errorInjectFeature() {
    throw new Error(
      "Features can only be injected when constructing the class"
    );
  }
  private createInjectFeatures(instanceId: number) {
    const self = this;
    return function (this: any, props: any) {
      Object.keys(props).forEach((key) => {
        const classKey = props[key];

        Object.defineProperty(this, key, {
          get() {
            const clas = self._classes.get(classKey);
            let instance;

            if (clas.mixins && clas.mixins.includes("Factory")) {
              const factory = self.get(classKey) as any;

              instance = (...args: any[]) => {
                const instance = factory(...args);
                self._devtool?.sendInjection({
                  propertyName: key,
                  injectClassId: classKey,
                  injectInstanceId: instance[INSTANCE_ID],
                  instanceId: instanceId,
                  classId: this.constructor.name,
                });
                return instance;
              };
            } else {
              instance = self.get(classKey) as any;
              self._devtool?.sendInjection({
                propertyName: key,
                injectClassId: classKey,
                injectInstanceId: instance[INSTANCE_ID],
                instanceId: instanceId,
                classId: this.constructor.name,
              });
            }

            // We do not need to dynamically grab it again
            Object.defineProperty(this, key, {
              value: instance,
              configurable: false,
              enumerable: false,
            });

            return instance;
          },
          enumerable: false,
          configurable: true,
        });
      });
    };
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
      construct: function (target, args) {
        const injectFeatures = self.createInjectFeatures(instanceId);
        constr.prototype.injectFeature = (feature: string) => ({
          feature,
          [INJECT_FEATURE]: true,
        });

        self._devtool?.setInstanceSpy(instanceId);

        const instance = Reflect.construct(constr, args);

        const injectFeatureProps = Object.keys(instance).reduce<string[]>(
          (aggr, key) => {
            if (instance[key] && instance[key][INJECT_FEATURE]) {
              return aggr.concat(key);
            }

            return aggr;
          },
          []
        );

        injectFeatures.call(
          instance,
          injectFeatureProps.reduce<Record<string, string>>((aggr, key) => {
            aggr[key] = instance[key].feature;

            return aggr;
          }, {})
        );

        const clas = self._classes.get(id);
        const otherProps = Object.getOwnPropertyNames(instance).filter(
          (name) => name !== "state" && typeof instance[name] !== "function"
        );

        if (clas.mixins && clas.mixins.includes("ObservableState")) {
          try {
            makeAutoObservable(
              instance,
              injectFeatureProps
                .concat(otherProps)
                .reduce<Record<string, false>>(
                  (aggr, key) => {
                    aggr[key] = false;

                    return aggr;
                  },
                  {
                    injectFeature: false,
                    runInAction: false,
                    reaction: false,
                    when: false,
                    addTransition: false,
                    transitionTo: false,
                    match: false,
                    isDisposed: false,
                    dispose: false,
                    onDispose: false,
                    on: false,
                    emit: false,
                  }
                )
            );
          } catch {
            // Already made observable by factory for example
          }
        } else if (
          clas.mixins &&
          clas.mixins.includes("ObservableStateMachine")
        ) {
          makeObservable(instance, {
            state: observable,
          });
        }

        self._devtool?.unsetInstanceSpy();

        instance[INSTANCE_ID] = instanceId;

        constr.prototype.injectFeature = self.errorInjectFeature;

        return instance;
      },
    });

    const instance = new proxy(...args);

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

type ExtractMethods<T extends any> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export function mock<T extends IClass<any>>(
  clas: T,
  methodMocks: T extends IClass<infer U>
    ? {
        [M in ExtractMethods<U>]?: (
          ...params: Parameters<U[M]>
        ) => ReturnType<U[M]>;
      }
    : never
): T {
  return new Proxy(clas, {
    construct(target, args) {
      class Mock extends target {}
      Object.assign(Mock.prototype, methodMocks);
      const instance = Reflect.construct(Mock, args);
      return instance;
    },
  }) as any;
}
