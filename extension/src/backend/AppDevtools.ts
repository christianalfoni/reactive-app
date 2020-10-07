import * as ws from "ws";
import { AppMessage } from "../types";

export class AppDevtools {
  initialize(cb: (message: string) => void) {
    const wss = new ws.Server({ port: 5051 });

    wss.on("connection", function connection(ws) {
      ws.on("message", cb);
    });
  }
}
