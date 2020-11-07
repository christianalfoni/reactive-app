import { spy } from "mobx";
import { INSTANCE_ID } from "./common";

export type TSpyChange = Parameters<Parameters<typeof spy>[0]>[0];

export interface IDevtool {
  spy(): void;
  setInstanceSpy(instanceId: number): void;
  unsetInstanceSpy(): void;
  sendInstance(id: string, instanceId: number): void;
  sendInjection(data: {
    propertyName: string;
    injectClassId: string;
    injectInstanceId: number;
    instanceId: number;
    classId: string;
  }): void;
}

export type TDebugMessage = (
  | {
      type: "instance";
      data: Record<string, unknown>;
    }
  | {
      type: "update";
      data: {
        path: string[];
        value: any;
      };
    }
  | {
      type: "splice";
      data: {
        path: string[];
        index: number;
        deleteCount: number;
        items: any[];
      };
    }
  | {
      type: "injection";
      data: {
        propertyName: string;
        injectClassId: string;
        injectInstanceId: number;
      };
    }
) & {
  data: {
    classId: string;
    instanceId: number;
  };
};

export class Devtool implements IDevtool {
  private ws: WebSocket;
  private messageBuffer: TDebugMessage[] = [];
  private _mobxIdToInstanceId: {
    [mobxId: string]: number;
  } = {};
  private _onSpyInstantiation: ((change: TSpyChange) => void) | undefined;
  private onSpy(change: Parameters<Parameters<typeof spy>[0]>[0]) {
    switch (change.type) {
      case "add": {
        // @ts-ignore
        const path = change.debugObjectName.split(/\./).concat(change.name);

        // We do not want to add nested values
        // as they will rather be added by the parent
        if (path.length > 2) {
          return;
        }

        const id = path.shift()!;

        let value: any = change.newValue;

        if (change.newValue && change.newValue[INSTANCE_ID]) {
          value = {
            __INSTANCE_ID__: change.newValue[INSTANCE_ID],
            __CLASS__: change.newValue.constructor.name,
          };
        } else if (Array.isArray(change.newValue)) {
          // For some reason we got both an "add" and "splice" event here,
          // so we let splice take care of this
          value = [];
        }
        this.send!({
          type: "update",
          data: {
            instanceId: this._mobxIdToInstanceId[id],
            classId: id.substr(0, id.indexOf("@")),
            value,
            path,
          },
        });
        break;
      }
      case "update": {
        const path = change.debugObjectName
          .split(/\./)
          // @ts-ignore
          .concat(change.name || []);
        const id = path.shift()!;

        this.send!({
          type: "update",
          data: {
            instanceId: this._mobxIdToInstanceId[id],
            classId: id.substr(0, id.indexOf("@")),
            value:
              change.newValue && change.newValue[INSTANCE_ID]
                ? {
                    __INSTANCE_ID__: change.newValue[INSTANCE_ID],
                    __CLASS__: change.newValue.constructor.name,
                  }
                : change.newValue,
            path,
          },
        });
        break;
      }
      case "splice": {
        // @ts-ignore
        const path = change.debugObjectName.split(/\./);
        const id = path.shift()!;
        this.send!({
          type: "splice",
          data: {
            instanceId: this._mobxIdToInstanceId[id],
            classId: id.substr(0, id.indexOf("@")),
            index: change.index,
            deleteCount: change.removedCount,
            items: change.added.map((newValue: any) =>
              newValue && newValue[INSTANCE_ID]
                ? {
                    __INSTANCE_ID__: newValue[INSTANCE_ID],
                    __CLASS__: newValue.constructor.name,
                  }
                : newValue
            ),
            path,
          },
        });
        break;
      }
      case "action": {
        break;
      }
    }
  }
  private stringifyAndSend = (message: TDebugMessage) => {
    this.ws.send(
      JSON.stringify(message, (key, value) => {
        if (value && value[INSTANCE_ID]) {
          return {
            __INSTANCE_ID__: value[INSTANCE_ID],
            __CLASS__: value.constructor.name,
          };
        }

        return value;
      })
    );
  };

  private send = (message: TDebugMessage) => {
    try {
      this.stringifyAndSend(message);
    } catch {
      this.messageBuffer.push(message);
    }
  };
  constructor(host: string) {
    this.ws = new WebSocket(`ws://${host}`);

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      console.log(event.data);
    });

    this.ws.addEventListener("open", () => {
      if (this.messageBuffer.length) {
        this.messageBuffer.forEach(this.stringifyAndSend);
        this.messageBuffer.length = 0;
      }
    });

    this.ws.addEventListener("error", (error) => {
      console.log("ERROR", error);
    });
  }
  spy() {
    spy((change) => {
      if (this._onSpyInstantiation) {
        this._onSpyInstantiation(change);
      }
      this.onSpy(change);
    });
  }
  setInstanceSpy(instanceId: number) {
    // We set the mobxId by spying on any added
    // observables
    this._onSpyInstantiation = (change: any) => {
      if (
        change.debugObjectName &&
        change.debugObjectName.match(/^[^.]*$/) &&
        !this._mobxIdToInstanceId[change.debugObjectName]
      ) {
        this._mobxIdToInstanceId[change.debugObjectName] = instanceId;
      }
    };
  }
  unsetInstanceSpy() {
    this._onSpyInstantiation = undefined;
  }
  sendInstance(classId: string, instanceId: number) {
    this.send({
      type: "instance",
      data: {
        classId,
        instanceId,
      },
    });
  }
  sendInjection(data: {
    propertyName: string;
    injectClassId: string;
    injectInstanceId: number;
    instanceId: number;
    classId: string;
  }) {
    this.send({
      type: "injection",
      data,
    });
  }
}
