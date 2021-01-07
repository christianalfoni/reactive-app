import { action } from "mobx";

import { IS_DISPOSED } from "./Factory";

export class StateMachine<
  M extends { type: string; [key: string]: unknown },
  S extends { state: string; [key: string]: unknown }
> {
  protected onMessage(message: M): S | void {
    throw new Error(`You have to implement the "onMessage" handler`);
  }

  send(message: M): boolean {
    // @ts-ignore
    if (!this.context) {
      throw new Error(
        "You have to add a context property to your statemachine"
      );
    }

    if ((this as any).isDisposed && (this as any).isDisposed()) {
      return false;
    }

    const newContext = action(this.onMessage.bind(this))(message);

    if (!newContext) {
      return false;
    }

    if (newContext) {
      // We automatically dispose of any disposables
      // @ts-ignore
      Object.values(this.context).forEach((value: any) => {
        if (value && value[IS_DISPOSED] === false) {
          value.dispose();
        }
      });
    }

    // @ts-ignore
    this.context = newContext;

    return true;
  }
}
