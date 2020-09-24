export type Backend =
  | {
      status: "pending";
    }
  | {
      status: "no-project";
    }
  | {
      status: "missing-dependencies";
      path: string;
    }
  | {
      status: "ready";
      path: string;
    };

export type PackageJson = {
  dependencies?: { [name: string]: string };
};
