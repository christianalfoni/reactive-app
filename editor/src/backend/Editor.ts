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
  private initializer = new Initializer();
  private filesManager = new FilesManager();
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
        this.initializer.initialize(async (data) => {
          this.sendEditorMessage({
            type: "init",
            data,
          });

          if (data.status === "ready") {
            await this.filesManager.initialize({
              onClassChange: this.onClassChange.bind(this),
              onClassCreate: this.onClassCreate.bind(this),
              onClassDelete: this.onClassDelete.bind(this),
            });

            this.sendEditorMessage({
              type: "classes",
              data: Object.keys(this.filesManager.metadata).reduce<{
                [name: string]: Class;
              }>((aggr, classId) => {
                const clas = this.filesManager.classes[classId];
                const mdata = this.filesManager.metadata[classId];
                aggr[classId] = {
                  x: mdata.x,
                  y: mdata.y,
                  ...clas,
                };

                return aggr;
              }, {}),
            });
          }
        });
        return;
      case "class-new": {
        this.filesManager.writeClass(message.data.classId, message.data.mixins);
        this.filesManager.writeMetadata(message.data);
        break;
      }
      case "class-update": {
        this.filesManager.writeMetadata(message.data);
        break;
      }
      case "inject": {
        this.filesManager.inject(message.data);
        break;
      }
      case "inject-replace": {
        this.filesManager.replaceInjection(
          message.data.classId,
          message.data.injectClassId,
          message.data.propertyName,
          message.data.injectorType
        );
        break;
      }
      case "class-open": {
        spawn("code", [path.join(APP_DIR, message.data.classId + ".ts")]);
        break;
      }
      default:
      // this.clientSocket.send(JSON.stringify(message.data));
    }
  }
  private sendEditorMessage(message: BackendMessage) {
    this.editorSocket?.send(JSON.stringify(message));
  }
  private onClassChange(name: string, e: ExtractedClass) {
    const clas = {
      ...this.filesManager.metadata[name],
      ...e,
    };

    this.sendEditorMessage({
      type: "class-update",
      data: clas,
    });
  }
  private onClassCreate(name: string) {}
  private onClassDelete(name: string) {}
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
