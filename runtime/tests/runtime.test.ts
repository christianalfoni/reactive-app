import { Container, Feature, TFeature } from "../src";

describe("RUNTIME", () => {
  test("Should instantiate a Container with singletons", () => {
    class Test {
      foo = "bar";
    }

    const container = new Container({
      Test,
    });

    expect(container.get("Test").foo).toBe("bar");
  });
  test("Should instantiate a Container using injected class in constructor", () => {
    class Test2 {
      foo = "bar2";
    }
    interface Test extends Feature {}
    class Test {
      test2!: TFeature<typeof Test2>;

      foo = "bar";

      changeFoo() {}

      constructor() {
        this.injectFeatures({
          test2: "Test2",
        });
        this.makeObservable({
          foo: "observable",
        });
        this.foo = this.test2.foo;
      }
    }

    const container = new Container({
      Test,
      Test2,
    });

    expect(container.get("Test").foo).toBe("bar2");
  });
});
