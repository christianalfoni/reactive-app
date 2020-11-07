import * as vscode from "vscode";
import { APP_DIR } from "../constants";
import {
  AppMessage,
  BackendMessage,
  Class,
  ClientMessage,
  ExtractedClass,
} from "../types";
import { AppDevtools } from "./AppDevtools";
import { FilesManager } from "./FilesManager";
import { Initializer } from "./Initializer";
import { getWorkspaceUri } from "./utils";

export class BackendPanel {
  public static currentPanel: BackendPanel | undefined;

  public static readonly viewType = "reactiveApp";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private initializer = new Initializer();
  private filesManager: FilesManager;
  private appDevtools: AppDevtools;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (BackendPanel.currentPanel) {
      BackendPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      BackendPanel.viewType,
      "Reactive App",
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,

        retainContextWhenHidden: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    BackendPanel.currentPanel = new BackendPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    BackendPanel.currentPanel = new BackendPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._panel.webview.html = this._getHtmlForWebview();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      this.onDidReceiveMessage.bind(this),
      null,
      this._disposables
    );

    this.filesManager = new FilesManager();
    this.appDevtools = new AppDevtools();
  }

  private onDidReceiveMessage(message: ClientMessage) {
    switch (message.type) {
      case "init":
        this.initializer.initialize(async (data) => {
          this.sendMessage({
            type: "init",
            data,
          });

          if (data.status === "ready") {
            await this.filesManager.initialize({
              onClassChange: this.onClassChange.bind(this),
              onClassCreate: this.onClassCreate.bind(this),
              onClassDelete: this.onClassDelete.bind(this),
            });
            this.appDevtools.initialize(this.onAppMessage.bind(this));

            this.sendMessage({
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
        const file = getWorkspaceUri(APP_DIR, message.data.classId + ".ts")!;
        const openPath = vscode.Uri.parse(file.fsPath);
        vscode.workspace.openTextDocument(openPath).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
        break;
      }
    }
  }
  private onAppMessage(message: string) {
    const parsedMessage: AppMessage = JSON.parse(message);

    this.sendMessage({
      type: "app",
      data: parsedMessage,
    });
  }
  private onClassChange(name: string, e: ExtractedClass) {
    const clas = {
      ...this.filesManager.metadata[name],
      ...e,
    };

    this.sendMessage({
      type: "class-update",
      data: clas,
    });
  }
  private onClassCreate(name: string) {}
  private onClassDelete(name: string) {}

  public sendMessage(message: BackendMessage) {
    this._panel.webview.postMessage(message);
  }

  public dispose() {
    BackendPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview() {
    // And the uri we use to load this script in the webview
    //const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
    const scriptUri = "http://localhost:5050/index.js";

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			  <html lang="en">
			  <head>
				  <meta charset="UTF-8">
  
				  <!--
					  Use a content security policy to only allow loading images from https or from our extension directory,
					  and only allow scripts that have a specific nonce.
				  -->
				  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this._panel.webview.cspSource} https:; script-src 'nonce-${nonce}' 'unsafe-eval'; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
				  <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reactive App</title>
			  </head>
			  <body>
				  <div id="app"></div>
  
				  <script nonce="${nonce}" src="${scriptUri}"></script>
			  </body>
			  </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
