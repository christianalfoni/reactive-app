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
  classId: string;
  propertyName: string;
  type: "inject" | "injectFactory";
};

export type Observable = {
  name: string;
};

export type ExtractedClass = {
  classId: string;
  injectors: Injector[];
  observables: Observable[];
};

export type Class = {
  classId: string;
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
        classId: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "class-update";
      data: {
        classId: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "inject";
      data: {
        fromClassId: string;
        toClassId: string;
      };
    }
  | {
      type: "inject-replace";
      data: {
        classId: string;
        injectClassId: string;
        propertyName: string;
        injectorType: "inject" | "injectFactory";
      };
    };

export type ClassMetadata = { x: number; y: number };

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
        classId: string;
        instanceId: number;
      };
    }
  | {
      type: "injection";
      data: {
        propertyName: string;
        injectClassId: string;
        injectInstanceId: number;
        classId: string;
        instanceId: number;
      };
    }
  | {
      type: "update";
      data: {
        classId: string;
        instanceId: number;
        path: string[];
        value: any;
      };
    }
  | {
      type: "splice";
      data: {
        classId: string;
        instanceId: number;
        path: string[];
        index: number;
        deleteCount: number;
        items: any[];
      };
    };
