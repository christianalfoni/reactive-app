import { IArrayDidChange, action, autorun, observable, observe } from "mobx";

export function applyMixins(derivedCtor: any, constructors: any[]) {
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

export type DisposableValue = (() => void) | { cancel: () => void };

export const DISPOSABLES = Symbol("DISPOSABLES");

export const IS_DISPOSED = Symbol("IS_DISPOSED");

export class Disposable {
  [DISPOSABLES]: DisposableValue[];
  [IS_DISPOSED]: boolean;

  onDispose(disposable: DisposableValue) {
    if (!this[DISPOSABLES]) {
      this[DISPOSABLES] = [];
    }

    this[DISPOSABLES].push(disposable);
    return () => {
      this[DISPOSABLES].splice(this[DISPOSABLES].indexOf(disposable), 1);

      if ("cancel" in disposable) {
        disposable.cancel();
      } else {
        disposable();
      }
    };
  }

  dispose() {
    if (this[DISPOSABLES]) {
      this[DISPOSABLES].forEach((disposable) => {
        if ("cancel" in disposable) {
          disposable.cancel();
        } else {
          disposable();
        }
      });
    }

    this[IS_DISPOSED] = true;
  }
}

export class Resolver {
  [IS_DISPOSED]: boolean;
  resolve<T>(
    promise: Promise<T>,
    resolvers: {
      rejected: (error: Error) => void;
      resolved: (data: T) => void;
    }
  ) {
    return promise
      .then((data) => {
        if (this[IS_DISPOSED]) {
          console.warn(
            `${this.constructor.name} resolved async, but is disposed`
          );
          return;
        }

        return action(resolvers.resolved)(data);
      })
      .catch((error) => {
        if (this[IS_DISPOSED]) {
          console.warn(
            `${this.constructor.name} rejected async, but is disposed`
          );
          return;
        }

        return action(resolvers.rejected)(error);
      });
  }
}

export type StateMachineTransitions<
  S extends { current: string; [key: string]: unknown }
> = {
  [T in S["current"]]: {
    [K in S["current"]]?:
      | boolean
      | ((
          nextState: S extends { current: K } ? S : never,
          prevState: S extends { current: T } ? S : never
        ) => boolean);
  };
};

export class StateMachine<
  S extends { current: string; [key: string]: unknown }
> {
  @observable
  state!: S;

  readonly transitions: StateMachineTransitions<S> = null as any;

  @action
  transition(newState: S): S | void {
    if (!this.transitions) {
      throw new Error(
        "You have not defined the transitions for this state machine"
      );
    }

    if (!(this.transitions as any)[this.state.current][newState.current]) {
      console.warn(
        `Invalid transition from "${this.state.current}" to "${newState.current}"`
      );
      return;
    }

    if (
      typeof (this.transitions as any)[this.state.current][newState.current] ===
        "function" &&
      !(this.transitions as any)[this.state.current][newState.current](
        this.state
      )
    ) {
      console.warn(
        `Ignoring transition from "${this.state.current}" to "${newState.current}"`
      );
      return;
    }

    // We automatically dispose of any disposables
    Object.values(this.state).forEach((value: any) => {
      if (value && value[IS_DISPOSED] === false) {
        value.dispose();
      }
    });

    this.state = newState;

    return newState;
  }

  matches<T extends S["current"]>(state: T): (S & { current: T }) | null {
    if (this.state.current === state) {
      return this.state as any;
    }

    return null;
  }
}

export type UIEvents = {
  [type: string]: {
    [selector: string]: EventListener;
  };
};

export interface UISelectorMethods<T extends {}> {
  text(key: string): UISelectorMethods<T>;
  items<P extends keyof T>(
    key: P,
    cb: (item: T[P]) => UISelector<T>
  ): UISelectorMethods<T>;
  attr(key: string, attr: string | (() => string)): UISelectorMethods<T>;
  prop(key: string, prop: string | (() => any)): UISelectorMethods<T>;
  content(cb: (el: Element) => string | UISelector<any>): UISelectorMethods<T>;
  event(type: string, cb: EventListener): UISelectorMethods<T>;
}

export interface UISelector<T extends {}> {
  (selector: string): UISelectorMethods<T>;
  nodes: ChildNode[];
  events: UIEvents;
  parent: Element | null;
  dispose: () => Element | null;
  appendTo: (parent: Element) => void;
}

const UI_SELECTORS = Symbol("UI_SELECTORS");

export class UI {
  [UI_SELECTORS]: UISelector<{}>[];
  html<T = this>(
    strings: TemplateStringsArray,
    ...tags: string[]
  ): UISelector<T> {
    if (!this[UI_SELECTORS]) {
      this[UI_SELECTORS] = [];
    }

    const template = document.createElement("template");

    template.innerHTML = strings.reduce((aggr, string, index) => {
      return aggr + string + String(tags[index] || "");
    }, "");

    const getElement = (selector: string) => {
      const el = template.content.querySelector(selector);

      if (!el) {
        throw new Error(`Could not find element "${selector}"`);
      }

      return el;
    };

    const self = this as any;
    const events: UIEvents = {};
    const disposables: (() => void)[] = [];

    const $ = (selector: string) => {
      return {
        text(key: string) {
          const el = getElement(selector);

          disposables.push(
            observe(
              self,
              key,
              (change) => {
                el.textContent = String(change.newValue);
              },
              true
            )
          );

          return this;
        },
        items<P extends keyof T>(key: P, cb: (item: T[P]) => UISelector<T>) {
          const el = getElement(selector);
          const selectors: UISelector<T>[] = [];

          disposables.push(
            observe(
              self[key],
              (change: IArrayDidChange<any>) => {
                if (change.type === "update") {
                } else {
                  change.added.forEach((item) => {
                    const selector = cb(item);

                    selectors.push(selector);

                    selector.appendTo(el);
                  });
                }
              },
              true
            )
          );
          disposables.push(() => {
            selectors.forEach((selector) => {
              selector.dispose();
            });
          });

          return this;
        },
        attr(key: string, attr: string | (() => string)) {
          const el = getElement(selector);
          if (typeof attr === "string") {
            disposables.push(
              observe(
                self,
                attr,
                (change) => {
                  el.setAttribute(key, String(change.newValue));
                },
                true
              )
            );
          } else {
            disposables.push(
              autorun(() => {
                el.setAttribute(key, String(attr()));
              })
            );
          }

          return this;
        },
        prop(key: string, prop: string | (() => any)) {
          const el = getElement(selector);

          if (typeof prop === "string") {
            disposables.push(
              observe(
                self,
                prop,
                (change) => {
                  (el as any)[key] = change.newValue;
                },
                true
              )
            );
          } else {
            disposables.push(
              autorun(() => {
                (el as any)[key] = prop();
              })
            );
          }

          return this;
        },
        content(cb: (el: Element) => string | UISelector<any>) {
          const el = getElement(selector);

          let content: any;

          disposables.push(
            autorun(() => {
              el.innerHTML = "";

              if (content && content.dispose) {
                console.log("disposing old content");
                content.dispose();
              }

              content = cb(el);

              if (typeof content === "string") {
                el.innerHTML = content;
              } else {
                content.appendTo(el);
              }
            })
          );

          return this;
        },
        event(type: string, cb: EventListener) {
          if (!events[type]) {
            events[type] = {};
          }

          events[type][selector] = action(cb);

          const el = getElement(selector);

          el.addEventListener(type, cb);

          disposables.push(() => {
            el.removeEventListener(type, cb);
          });

          return this;
        },
      };
    };
    $.nodes = Array.from(template.content.childNodes);
    $.parent = null as Element | null;
    $.events = events;
    $.dispose = () => {
      $.nodes.forEach((childNode) => {
        childNode.parentNode?.removeChild(childNode);
      });
      disposables.forEach((disposable) => disposable());
      this[UI_SELECTORS].splice(this[UI_SELECTORS].indexOf($), 1);

      return $.parent;
    };
    $.appendTo = (parent: Element) => {
      $.nodes.forEach((node) => {
        parent.appendChild(node);
      });

      $.parent = parent;
    };

    try {
      (this as any).onDispose(() => $.dispose());
    } catch {
      console.warn(
        `The class "${this.constructor.name}" is not Disposable. All UI classes should also be Disposable`
      );
    }

    this[UI_SELECTORS].push($);

    return $;
  }
  hotReloadUI() {
    const parents = this[UI_SELECTORS].map((selector) => selector.dispose());
    const parent = parents.find((parent) => Boolean(parent?.parentNode));

    // @ts-ignore
    this.render().appendTo(parent);
  }
}
