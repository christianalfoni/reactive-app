import { action, autorun, IArrayDidChange, observe } from "mobx";

export type ViewEvents = {
  [type: string]: {
    [selector: string]: EventListener;
  };
};

export interface ViewSelectorMethods<T extends {}> {
  text(key: string): ViewSelectorMethods<T>;
  items<P extends keyof T>(
    key: P,
    cb: (item: T[P]) => ViewSelector<T>
  ): ViewSelectorMethods<T>;
  attr(key: string, attr: string | (() => string)): ViewSelectorMethods<T>;
  prop(key: string, prop: string | (() => any)): ViewSelectorMethods<T>;
  content(
    cb: (el: Element) => string | ViewSelector<any>
  ): ViewSelectorMethods<T>;
  event(type: string, cb: EventListener): ViewSelectorMethods<T>;
}

export interface ViewSelector<T extends {}> {
  (selector: string): ViewSelectorMethods<T>;
  nodes: ChildNode[];
  events: ViewEvents;
  parent: Element | null;
  dispose: () => Element | null;
  appendTo: (parent: Element) => void;
}

const UI_SELECTORS = Symbol("UI_SELECTORS");

export class View {
  [UI_SELECTORS]: ViewSelector<{}>[];
  html<T = this>(
    strings: TemplateStringsArray,
    ...tags: string[]
  ): ViewSelector<T> {
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
    const events: ViewEvents = {};
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
        items<P extends keyof T>(key: P, cb: (item: T[P]) => ViewSelector<T>) {
          const el = getElement(selector);
          const selectors: ViewSelector<T>[] = [];

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
        content(cb: (el: Element) => string | ViewSelector<any>) {
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
  hotReloadView() {
    const parents = this[UI_SELECTORS].map((selector) => selector.dispose());
    const parent = parents.find((parent) => Boolean(parent?.parentNode));

    try {
      // @ts-ignore
      this.render().appendTo(parent);
    } catch (error) {
      console.error("Unable to hot reload due to error in render");
      throw error;
    }
  }
}
