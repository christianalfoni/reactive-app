import { autorun, Container, Feature, TFeature } from "../src";

describe("Feature", () => {
  test("Should be able to inject singletons", () => {
    class Test2 {
      static mixins = [];
      foo = "bar2";
    }
    interface Test extends Feature {}
    class Test {
      static mixins = ["Feature"];
      test2!: TFeature<typeof Test2>;

      constructor() {
        this.injectFeatures({
          test2: "Test2",
        });
      }
    }

    const container = new Container({
      Test,
      Test2,
    });

    expect(container.get("Test").test2.foo).toBe("bar2");
  });
  test("Should be able to inject factories", () => {
    class Test2 {
      static mixins = [];
      foo = "bar2";
    }
    interface Test extends Feature {}
    class Test {
      static mixins = ["Feature"];
      test2!: TFeature<typeof Test2>;

      constructor() {
        this.injectFeatures({
          test2: "Test2",
        });
      }
    }

    const container = new Container({
      Test,
      Test2,
    });

    expect(container.get("Test").test2.foo).toBe("bar2");
  });
  test("Should be able to wait for state changes", () => {
    interface Test extends Feature {}
    class Test {
      static mixins = ["Feature"];
      foo = "bar";
      constructor() {
        this.makeObservable({
          foo: "observable",
          changeFoo: "action",
        });
      }
      async waitForFooChange() {
        await this.when(() => this.foo === "bar2");

        return this.foo;
      }
      changeFoo() {
        this.foo = "bar2";
      }
    }
    const container = new Container({ Test });
    const test = container.get("Test");
    const promise = test.waitForFooChange();

    test.changeFoo();

    return expect(promise).resolves.toBe("bar2");
  });
});
