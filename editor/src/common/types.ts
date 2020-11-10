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

export type Computed = {
  name: string;
};

export type Action = {
  name: string;
};

export type ExtractedClass = {
  classId: string;
  mixins: Mixin[];
  injectors: Injector[];
  observables: Observable[];
  computed: Computed[];
  actions: Action[];
};

export type Class = {
  classId: string;
  x: number;
  y: number;
} & ExtractedClass;

export type ClassInstance = {
  values: {
    [key: string]: any;
  };
  injections: {
    [propertyName: string]: number[];
  };
};

export enum Mixin {
  Disposable = "Disposable",
  Resolver = "Resolver",
  StateMachine = "StateMachine",
}

export type ClassNodeProperties = {
  name: string;
  mixins: Mixin[];
  isEditing: boolean;
  currentInstanceId: number | null;
  injectors: Injector[];
  observables: Observable[];
  computed: Computed[];
  actions: Action[];
  instances: {
    [id: string]: ClassInstance;
  };
};

export type ClientMessage =
  | {
      type: "init";
    }
  | {
      type: "class-new";
      data: {
        classId: string;
        mixins: Mixin[];
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
    }
  | {
      type: "class-open";
      data: {
        classId: string;
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
