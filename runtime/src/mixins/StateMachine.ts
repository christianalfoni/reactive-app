import { action } from "mobx";

import { IS_DISPOSED } from "./Factory";

export type TBaseContext = { state: string; [key: string]: unknown };

export type TBaseEvent = { type: string; [key: string]: unknown };

export type PickContext<
  C extends TBaseContext,
  S extends C["state"]
> = C extends { state: S } ? C : never;

export type PickEvent<E extends TBaseEvent, T extends E["type"]> = E extends {
  type: T;
}
  ? E
  : never;

export class StateMachine<C extends TBaseContext, E extends TBaseEvent> {
  context!: C;

  protected onEvent(message: E): C | void {
    throw new Error(`You have to implement the "onEvent" handler`);
  }

  protected onEnter(newContext: C) {}

  protected onExit(oldContext: C) {}

  transition(
    context: C,
    event: E,
    transitions: {
      [S in C["state"]]: {
        [T in E["type"]]?: (
          event: E extends { type: T } ? E : never,
          context: C extends { state: S } ? C : never
        ) => C | void;
      };
    }
  ): C | void {
    if (!(transitions as any)[context.state][event.type]) {
      return;
    }

    return (transitions as any)[context.state][event.type].call(
      this,
      context,
      event
    );
  }

  send(event: E): boolean {
    if (!this.context) {
      throw new Error(
        "You have to add a context property to your statemachine"
      );
    }

    if ((this as any).isDisposed && (this as any).isDisposed()) {
      return false;
    }

    const newContext = action(this.onEvent.bind(this))(event);

    if (!newContext) {
      return false;
    }

    this.onExit(this.context);

    if (newContext) {
      // We automatically dispose of any disposables
      Object.values(this.context).forEach((value: any) => {
        if (value && value[IS_DISPOSED] === false) {
          value.dispose();
        }
      });
    }

    this.context = newContext;

    this.onEnter(this.context);

    return true;
  }
}
