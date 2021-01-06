import { Container, Feature, StateMachine } from "../src";

describe("StateMachine", () => {
  test("Should throw error with missing state", () => {
    type TMessage = { type: "FOO" };

    type TContext = { state: "FOO" } | { state: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TContext> {}

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

    type TContext = { state: "FOO" } | { state: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TContext> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      context: TContext = {
        state: "FOO",
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

    type TContext = { state: "FOO" } | { state: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TContext> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      context: TContext = {
        state: "FOO",
      };

      onMessage(message: TMessage): TContext | void {
        return { state: this.context.state === "FOO" ? "BAR" : "FOO" };
      }
    }

    const container = new Container({
      Test,
    });

    const test = container.get("Test");

    expect(test.context.state === "FOO");

    test.send({ type: "TRANSITION" });

    expect(test.context.state === "BAR");

    test.send({ type: "TRANSITION" });

    expect(test.context.state === "FOO");
  });
  test("Should NOT change state when returning undefined", () => {
    type TMessage = { type: "TRANSITION" };

    type TContext = { state: "FOO" } | { state: "BAR" };

    interface Test extends Feature, StateMachine<TMessage, TContext> {}

    class Test {
      static mixins = ["Feature", "StateMachine"];

      context: TContext = {
        state: "FOO",
      };

      protected onMessage(message: TMessage): TContext | void {}
    }

    const container = new Container({
      Test,
    });

    const test = container.get("Test");

    expect(test.context.state === "FOO");

    test.send({ type: "TRANSITION" });

    expect(test.context.state === "FOO");
  });
});
