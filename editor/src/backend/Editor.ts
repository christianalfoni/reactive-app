import { spawn } from "child_process";
import { IncomingMessage } from "http";
import * as path from "path";

import * as WebSocket from "ws";

import { APP_DIR } from "../common/constants";
import {
  BackendMessage,
  Class,
  ClientMessage,
  ExtractedClass,
} from "../common/types";
import { FilesManager } from "./FilesManager";
import { Initializer } from "./Initializer";

export class Editor {
  private declare initializer: Initializer;
  private declare filesManager: FilesManager;
  private editorSocket: WebSocket | undefined;
  private clientSocket: WebSocket | undefined;
  constructor() {}
  private getQuery(url: string) {
    return url
      .split("?")[1]
      ?.split(",")
      .reduce<{ [key: string]: string }>((aggr, part) => {
        const parts = part.split("=");

        return Object.assign(aggr, {
          [parts[0]]: decodeURIComponent(parts[1]),
        });
      }, {});
  }
  private onConnection(ws: WebSocket, req: IncomingMessage) {
    const query = this.getQuery(req.url!);

    // editor connects with ?editor=1 in url
    if (query && query.editor) {
      this.onEditorConnection(ws);
    } else {
      this.onClientConnection(ws);
    }
  }
  private onEditorConnection(ws: WebSocket) {
    if (this.editorSocket) {
      this.editorSocket.terminate();
    }

    this.editorSocket = ws;
    this.editorSocket.on("message", this.onEditorMessage.bind(this));
  }
  private onClientConnection(ws: WebSocket) {
    if (this.clientSocket) {
      this.clientSocket.terminate();
    }

    this.clientSocket = ws;

    const onClientMessage = this.onClientMessage.bind(this);
    const onClose = () => {
      ws.removeListener("message", onClientMessage);
      ws.removeListener("close", onClose);

      this.editorSocket?.send(
        JSON.stringify({
          type: "disconnect",
        })
      );
    };

    ws.on("message", onClientMessage);
    ws.on("close", onClose);
  }
  private onClientMessage(message: string) {
    this.editorSocket?.send(`{"type":"app","data":${message}}`);
  }
  private onEditorMessage(rawMessage: string) {
    const message: ClientMessage = JSON.parse(rawMessage);

    switch (message.type) {
      case "init":
        const sendClasses = () => {
          let hasUpdatedMetadata = false;
          const data = Object.keys(this.filesManager.classes).reduce<{
            [name: string]: Class;
          }>((aggr, classId) => {
            const clas = this.filesManager.classes[classId];
            let mdata: { x: number; y: number };

            if (!this.filesManager.metadata[classId]) {
              this.filesManager.metadata[classId] = {
                x: 0,
                y: 0,
              };
              hasUpdatedMetadata = true;
            }

            mdata = this.filesManager.metadata[classId];

            aggr[classId] = {
              x: mdata.x,
              y: mdata.y,
              ...clas,
            };

            return aggr;
          }, {});

          this.sendEditorMessage({
            type: "classes",
            data,
          });

          if (hasUpdatedMetadata) {
            this.filesManager.writeMetadata();
          }
        };

        if (this.initializer && this.filesManager) {
          this.sendEditorMessage({
            type: "init",
            data: {
              path: this.initializer.getWorkspacePath(),
              status: "ready",
            },
          });
          sendClasses();
          return;
        }

        this.initializer = new Initializer();
        this.initializer.initialize(async (data) => {
          this.sendEditorMessage({
            type: "init",
            data,
          });

          if (data.status === "ready") {
            this.filesManager = new FilesManager();
            await this.filesManager.initialize({
              onClassChange: this.onClassChange.bind(this),
              onClassCreate: this.onClassCreate.bind(this),
              onClassDelete: this.onClassDelete.bind(this),
            });

            sendClasses();
          }
        });
        return;
      case "class-new": {
        this.filesManager.writeClass(message.data.classId);
        this.filesManager.addMetadata(message.data);
        console.log("Written new file");
        break;
      }
      case "class-update": {
        this.filesManager.addMetadata(message.data);
        break;
      }
      case "inject": {
        this.filesManager.inject(message.data);
        break;
      }
      case "inject-remove": {
        this.filesManager.removeInjection(
          message.data.fromClassId,
          message.data.toClassId
        );
        break;
      }
      case "class-open": {
        const child = spawn("code", [
          path.join(APP_DIR, message.data.classId, "index.ts"),
        ]);
        child.on("error", () => {
          const insidersChild = spawn("code-insiders", [
            path.join(APP_DIR, message.data.classId, "index.ts"),
          ]);
          insidersChild.on("error", () => {
            console.error(
              "Neither 'code' or 'code-insiders' is installed on the PATH"
            );
          });
        });

        break;
      }
      case "toggle-mixin":
        this.filesManager.toggleMixin(message.data.classId, message.data.mixin);
        break;
      case "class-delete":
        this.filesManager.deleteClass(message.data.classId);
        break;
      case "class-rename":
        this.filesManager.renameClass(
          message.data.classId,
          message.data.toClassId
        );
        break;
      case "toggle-observable":
        this.filesManager.toggleMakeObservableProperty(
          message.data.classId,
          message.data.name,
          message.data.isActive ? undefined : "observable"
        );
        break;
      case "toggle-computed":
        this.filesManager.toggleMakeObservableProperty(
          message.data.classId,
          message.data.name,
          message.data.isActive ? undefined : "computed"
        );
        break;
      case "toggle-action":
        this.filesManager.toggleMakeObservableProperty(
          message.data.classId,
          message.data.name,
          message.data.isActive ? undefined : "action"
        );
        break;
      default:
        this.clientSocket?.send(JSON.stringify(message));
    }
  }
  private sendEditorMessage(message: BackendMessage) {
    this.editorSocket?.send(JSON.stringify(message));
  }
  private onClassChange(extractedClass: ExtractedClass) {
    const clas = {
      ...this.filesManager.metadata[extractedClass.classId],
      ...extractedClass,
    };

    this.sendEditorMessage({
      type: "class-update",
      data: clas,
    });
  }
  private onClassCreate(extractedClass: ExtractedClass) {
    const clas = {
      ...this.filesManager.metadata[extractedClass.classId],
      ...extractedClass,
    };

    this.sendEditorMessage({
      type: "class-update",
      data: clas,
    });
  }
  private onClassDelete(name: string) {
    this.sendEditorMessage({
      type: "class-delete",
      data: name,
    });
  }
  connect() {
    return new Promise<number>((resolve, reject) => {
      const port = 5051;
      const wss = new WebSocket.Server({
        port: 5051,
      });

      wss.on("connection", this.onConnection.bind(this));
      wss.on("error", reject);
      wss.on("close", (reason: any) => {
        console.log("Devtools backend closed", reason);
      });
      wss.on("listening", () => resolve(port));
    });
  }

  getMarkup(scriptSource: string, port: number) {
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="ie=edge" />
      <title>Document</title>
      <link
        href="https://fonts.googleapis.com/css?family=Source+Code+Pro"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css?family=Nunito:400,700"
        rel="stylesheet"
      />
      <script type="text/javascript">
        window['__EDITOR_BACKEND_PORT__'] = "${port}";
      </script>
    </head>
    <body>
      <script type="text/javascript" src="${scriptSource}"></script>
    </body>
  </html>
  `;
  }
}
