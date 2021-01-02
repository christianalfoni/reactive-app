import { Container, Factory, Feature, TFeature } from "../src";

describe("Container", () => {
  test("Should instantiate a Container with singletons", () => {
    class Test {
      foo = "bar";
    }

    const container = new Container({
      Test,
    });

    expect(container.get("Test").foo).toBe("bar");
    expect(container.get("Test")).toBe(container.get("Test"));
  });

  test("Should instantiate a Container with factories", () => {
    interface Test extends Factory {}
    class Test {
      static mixins = ["Feature", "Factory"];
      foo = "bar";
    }

    const container = new Container({
      Test,
    });

    expect(container.get("Test")().foo).toBe("bar");
  });
});
