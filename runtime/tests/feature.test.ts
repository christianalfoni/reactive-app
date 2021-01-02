import { Container, Feature, TFeature } from "../src";

describe("Inject", () => {
  test("Should instantiate a Container using injected class in constructor", () => {
    class Test2 {
      foo = "bar2";
    }
    interface Test extends Feature {}
    class Test {
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
});
