import * as vscode from "vscode";
import { IncomingMessage } from "../client/backend";
import { FilesManager } from "./FilesManager";
import { Initializer } from "./Initializer";

export class BackendPanel {
  public static currentPanel: BackendPanel | undefined;

  public static readonly viewType = "catCoding";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private initializer = new Initializer();
  private filesManager = new FilesManager();
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
      "Cat Coding",
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,

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
      (message: IncomingMessage) => {
        switch (message.type) {
          case "init":
            this.initializer.initialize(async (data) => {
              this.sendMessage({
                type: "init",
                data,
              });

              if (data.status === "ready") {
                this.sendMessage({
                  type: "classes",
                  data: {
                    classes: await this.filesManager.getClasses(),
                    metadata: await this.filesManager.getMetadata(),
                  },
                });
              }
            });
            return;
          case "metadata": {
            this.filesManager.writeMetadata(message.data);
            break;
          }
          case "class-new": {
            this.filesManager.writeClass(message.data.name);
            this.filesManager.writeMetadata(message.data);
            break;
          }
          case "class-update": {
            break;
          }
          case "inject": {
            this.filesManager.inject(message.data);
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public sendMessage(message: { type: string; data: any }) {
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
    const scriptUri = "http://localhost:1234/index.js";

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
          <title>Cat Coding</title>
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
