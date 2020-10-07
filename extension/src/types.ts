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

export type Injector = {
  class: string;
  name: string;
  type: "inject" | "injectFactory";
};

export type Observable = {
  name: string;
};

export type ExtractedClass = {
  name: string;
  injectors: Injector[];
  observables: Observable[];
};

export type Class = {
  id: string;
  x: number;
  y: number;
} & ExtractedClass;

export type ClientMessage =
  | {
      type: "init";
    }
  | {
      type: "class-new";
      data: {
        id: string;
        name: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "class-update";
      data: {
        id: string;
        name: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "inject";
      data: {
        fromName: string;
        toName: string;
      };
    }
  | {
      type: "inject-replace";
      data: {
        name: string;
        injectorName: string;
        injectorType: "inject" | "injectFactory";
      };
    };

export type ClassMetadata = { id: string; x: number; y: number };

export type BackendMessage =
  | {
      type: "init";
      data: Backend;
    }
  | {
      type: "classes";
      data: {
        [name: string]: Class;
      };
    }
  | {
      type: "class-new";
      data: ExtractedClass;
    }
  | {
      type: "class-update";
      data: Class;
    }
  | {
      type: "app";
      data: AppMessage;
    };

export type AppMessage =
  | {
      type: "instance";
      data: {
        nodeId: string;
        class: string;
        id: number;
      };
    }
  | {
      type: "update";
      data: {
        nodeId: string;
        class: string;
        id: number;
        path: string[];
        value: any;
      };
    }
  | {
      type: "splice";
      data: {
        nodeId: string;
        class: string;
        id: number;
        path: string[];
        index: number;
        deleteCount: number;
        items: any[];
      };
    };
