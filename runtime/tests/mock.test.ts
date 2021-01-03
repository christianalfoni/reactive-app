import { mock } from "../src";

describe("Mock", () => {
  test("Should mock a class", () => {
    class Test {
      static mixins = [];

      foo = "bar";
    }

    const TestMock = mock(Test, {});

    expect(new TestMock()).toBeInstanceOf(Test);
    expect(new TestMock().foo).toBe("bar");
  });
  test("Should mock methods", () => {
    class Test {
      static mixins = [];

      foo = "bar";

      changeFoo() {
        this.foo = "bar2";
      }
    }

    const TestMock = mock(Test, {
      changeFoo() {
        this.foo = "mockbar";
      },
    });

    const test = new TestMock();

    test.changeFoo();

    expect(test.foo).toBe("mockbar");
  });
  test("Should mock before constructor calls internal methods", () => {
    class Test {
      static mixins = [];

      foo = "bar";

      constructor() {
        this.changeFoo();
      }

      changeFoo() {
        this.foo = "bar2";
      }
    }

    const TestMock = mock(Test, {
      changeFoo() {
        this.foo = "mockbar";
      },
    });

    const test = new TestMock();

    expect(test.foo).toBe("mockbar");
  });
});
