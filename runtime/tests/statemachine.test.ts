import { Container, Feature, StateMachine } from "../src";

describe("StateMachine", () => {
  test("Should throw error with missing state", () => {
    type TMessage = { type: "FOO" };

    type TState = { current: "FOO" } | { current: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TState> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];
    }

    const container = new Container({
      Test,
    });

    expect(() => container.get("Test").send({ type: "FOO" })).toThrow(
      "property"
    );
  });
  test("Should throw error with missing onMessage", () => {
    type TMessage = { type: "FOO" };

    type TState = { current: "FOO" } | { current: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TState> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      state: TState = {
        current: "FOO",
      };
    }

    const container = new Container({
      Test,
    });

    expect(() => container.get("Test").send({ type: "FOO" })).toThrow(
      "handler"
    );
  });
  test("Should change state by returning it from onMessage", () => {
    type TMessage = { type: "TRANSITION" };

    type TState = { current: "FOO" } | { current: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TState> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      state: TState = {
        current: "FOO",
      };

      onMessage(message: TMessage): TState | void {
        return { current: this.state.current === "FOO" ? "BAR" : "FOO" };
      }
    }

    const container = new Container({
      Test,
    });

    const test = container.get("Test");

    expect(test.state.current === "FOO");

    test.send({ type: "TRANSITION" });

    expect(test.state.current === "BAR");

    test.send({ type: "TRANSITION" });

    expect(test.state.current === "FOO");
  });
  test("Should NOT change state when returning undefined", () => {
    type TMessage = { type: "TRANSITION" };

    type TState = { current: "FOO" } | { current: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TState> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      state: TState = {
        current: "FOO",
      };

      protected onMessage(message: TMessage): TState | void {}
    }

    const container = new Container({
      Test,
    });

    const test = container.get("Test");

    expect(test.state.current === "FOO");

    test.send({ type: "TRANSITION" });

    expect(test.state.current === "FOO");
  });
});
