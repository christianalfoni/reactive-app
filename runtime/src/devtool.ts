import { spy, toJS } from "mobx";

import { INSTANCE_ID } from "./common";

export type TSpyChange = Parameters<Parameters<typeof spy>[0]>[0];

export interface IDevtool {
  spy(): void;
  setInstanceSpy(instanceId: number): void;
  unsetInstanceSpy(): void;
  sendInstance(id: string, instanceId: number, instance: any): void;
  sendInjection(data: {
    propertyName: string;
    injectClassId: string;
    injectInstanceId: number;
    instanceId: number;
    classId: string;
  }): void;
  sendDispose(data: { instanceId: number; classId: string }): void;
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
  | {
      type: "dispose";
      data: {
        classId: string;
        instanceId: number;
      };
    }
  | {
      type: "action";
      data: {
        name: string;
        args: any[];
      };
    }
) & {
  data: {
    classId: string;
    instanceId: number;
  };
};

export type TBackendMessage = {
  type: "run-action";
  data: {
    instanceId: number;
    name: string;
  };
};

export class Devtool implements IDevtool {
  private ws: WebSocket;
  private messageBuffer: TDebugMessage[] = [];
  private _mobxIdToInstanceId: {
    [mobxId: string]: number;
  } = {};
  private _instanceIdToInstance: {
    [instanceId: number]: any;
  } = {};
  private _onSpyInstantiation: (
    | ((change: TSpyChange) => void)
    | undefined
  )[] = [];
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
            classId: id.slice(0, id.indexOf("@")),
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
        if (change.object && (change.object as any)[INSTANCE_ID]) {
          this.send({
            type: "action",
            data: {
              args: change.arguments,
              name: change.name,
              classId: (change.object as any).constructor.name,
              instanceId: (change.object as any)[INSTANCE_ID],
            },
          });
        }
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
    if (this.ws.readyState === this.ws.CLOSED) {
      return;
    }

    try {
      this.stringifyAndSend(message);
    } catch {
      this.messageBuffer.push(message);
    }
  };
  constructor(host: string) {
    this.ws = new WebSocket(`ws://${host}`);

    this.ws.addEventListener("message", (event) => {
      const message: TBackendMessage = JSON.parse(event.data);
      switch (message.type) {
        case "run-action":
          this._instanceIdToInstance[message.data.instanceId][
            message.data.name
          ]();
          break;
      }
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
      const spyInstantiation = this._onSpyInstantiation[
        this._onSpyInstantiation.length - 1
      ];
      if (spyInstantiation) {
        spyInstantiation(change);
      }
      this.onSpy(change);
    });
  }
  setInstanceSpy(instanceId: number) {
    // We set the mobxId by spying on any added
    // observables
    this._onSpyInstantiation.push((change: any) => {
      if (
        change.debugObjectName &&
        change.debugObjectName.match(/^[^.]*$/) &&
        !this._mobxIdToInstanceId[change.debugObjectName]
      ) {
        this._mobxIdToInstanceId[change.debugObjectName] = instanceId;
      }
    });
  }
  unsetInstanceSpy() {
    this._onSpyInstantiation.pop();
  }
  sendInstance(classId: string, instanceId: number, instance: any) {
    this._instanceIdToInstance[instanceId] = instance;
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
  sendDispose(data: { classId: string; instanceId: number }) {
    this.send({
      type: "dispose",
      data,
    });
  }
}
