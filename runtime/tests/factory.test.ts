import { resolve } from "path";
import { Container, Factory, Feature } from "../src";

describe("Factory", () => {
  test("Should have state disposed when disposed", () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();

    expect(test.isDisposed()).toBe(false);
    test.dispose();
    expect(test.isDisposed()).toBe(true);
  });
  test("Should resolve promises", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise() {
        return this.resolve(Promise.resolve("123"));
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();

    expect(await test.resolvePromise()).toBe("123");
  });
  test("Should throw promise resolvement when disposed", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise() {
        return this.resolve(Promise.resolve("123"));
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();
    const result = test.resolvePromise();
    test.dispose();
    await expect(result).rejects.toThrow();
  });
  test("Should call resolver when resolved", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise(resolver: () => void) {
        this.resolve(Promise.resolve("123"), {
          resolved: resolver,
          rejected: () => {},
        });
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();
    const promise = new Promise<void>((resolve) => {
      test.resolvePromise(() => {
        resolve();
      });
    });
    await expect(promise).resolves;
  });
  test("Should call rejecter when rejected", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise(reject: () => void) {
        this.resolve(Promise.reject("123"), {
          resolved: () => {},
          rejected: reject,
        });
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();
    const promise = new Promise<void>((resolve) => {
      test.resolvePromise(() => {
        resolve();
      });
    });
    await expect(promise).resolves;
  });
  test("Should not call resolver when disposed", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise(resolved) {
        return this.resolve(Promise.resolve("123"), {
          resolved,
          rejected: () => {},
        });
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();
    let isResolved = false;
    test.resolvePromise(() => {
      isResolved = true;
    });
    test.dispose();
    await Promise.resolve(); // Wait promise in Test to resolve
    expect(isResolved).toBe(false);
  });
  test("Should not call rejector when disposed", async () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
      async resolvePromise(rejected) {
        return this.resolve(Promise.resolve("123"), {
          resolved: () => {},
          rejected,
        });
      }
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();
    let isRejected = false;
    test.resolvePromise(() => {
      isRejected = true;
    });
    test.dispose();
    await Promise.resolve(); // Wait promise in Test to resolve
    await expect(isRejected).toBe(false);
  });
  test("Should register listeners for dispose", () => {
    interface Test extends Feature, Factory {}

    class Test {
      static mixins = ["Feature", "Factory"];
    }

    const container = new Container({ Test });
    const createTest = container.get("Test");
    const test = createTest();

    let listenerCalled = false;
    test.onDispose(() => {
      listenerCalled = true;
    });
    test.dispose();
    expect(listenerCalled);
  });
});
