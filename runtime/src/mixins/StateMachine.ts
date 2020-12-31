import { action } from "mobx";
import { IS_DISPOSED } from "./Factory";

export class StateMachine<
  M extends { type: string; [key: string]: unknown },
  S extends { current: string; [key: string]: unknown }
> {
  onMessage(message: M): S | void {
    throw new Error(`You have to implement the "onMessage" handler`);
  }

  @action
  send(message: M): boolean {
    // @ts-ignore
    if (!this.state) {
      throw new Error("You have to add a state property to your statemachine");
    }

    const newState = this.onMessage(message);

    if (!newState) {
      return false;
    }

    if (newState) {
      // We automatically dispose of any disposables
      // @ts-ignore
      Object.values(this.state).forEach((value: any) => {
        if (value && value[IS_DISPOSED] === false) {
          value.dispose();
        }
      });
    }

    // @ts-ignore
    this.state = newState;

    return true;
  }
}
