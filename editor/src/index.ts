import * as electron from "electron";
import * as path from "path";
import { Editor } from "./backend/Editor";

const app = electron.app;
const appVersion = app.getVersion();
const BrowserWindow = electron.BrowserWindow;

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
    icon: path.resolve("icons", "icon.png"),
    height: 768,
    width: 768,
    minHeight: 500,
    minWidth: 500,
  });

  electron.protocol.registerFileProtocol("filestub", (request, callback) => {
    const url = request.url.substr(10);
    const file = {
      path: path.normalize(`${path.join(__dirname, "..")}/${url}`),
    };

    callback(file);
  });

  mainWindow.on("closed", () => app.quit());
  app.on("activate", () => {
    mainWindow.show();
  });

  electron.Menu.setApplicationMenu(
    electron.Menu.buildFromTemplate([
      {
        label: "Application",
        submenu: [
          { label: "Overmind Devtools v" + appVersion },
          { type: "separator" },
          {
            label: "Open Chrome Devtools",
            click() {
              // mainWindow.openDevTools();
            },
          },
          {
            label: "Hide",
            click() {
              mainWindow.hide();
            },
            accelerator: "CmdOrCtrl+H",
          },
          {
            label: "Learn More",
            click() {
              electron.shell.openExternal("https://overmindjs.org");
            },
          },
          {
            label: "License",
            click() {
              electron.shell.openExternal(
                "https://github.com/cerebral/overmind/blob/master/LICENSE"
              );
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ])
  );

  /*
    BUG FIX: https://github.com/electron/electron/issues/13008#issuecomment-575909942
  */
  let redirectURL =
    "data:application/x-javascript;base64,UHJvZHVjdFJlZ2lzdHJ5SW1wbC5SZWdpc3RyeT1jbGFzc3tjb25zdHJ1Y3Rvcigpe31uYW1lRm9yVXJsKHIpe3JldHVybiBudWxsfWVudHJ5Rm9yVXJsKHIpe3JldHVybiBudWxsfXR5cGVGb3JVcmwocil7cmV0dXJuIG51bGx9fSxQcm9kdWN0UmVnaXN0cnlJbXBsLl9oYXNoRm9yRG9tYWluPWZ1bmN0aW9uKHIpe3JldHVybiIifSxQcm9kdWN0UmVnaXN0cnlJbXBsLnJlZ2lzdGVyPWZ1bmN0aW9uKHIsdCl7UHJvZHVjdFJlZ2lzdHJ5SW1wbC5fcHJvZHVjdHNCeURvbWFpbkhhc2g9bmV3IE1hcH0sUHJvZHVjdFJlZ2lzdHJ5SW1wbC5fcHJvZHVjdHNCeURvbWFpbkhhc2g9bmV3IE1hcCxQcm9kdWN0UmVnaXN0cnlJbXBsLnJlZ2lzdGVyKFtdLFtdKSxQcm9kdWN0UmVnaXN0cnlJbXBsLnNoYTE9ZnVuY3Rpb24ocil7cmV0dXJuIiJ9Ow==";
  electron.session.defaultSession.webRequest.onBeforeRequest(
    (details, callback) => {
      if (
        /^devtools:\/\/devtools\/remote\/serve_file\/@[0-9a-f]{40}\/product_registry_impl\/product_registry_impl_module.js$/iu.test(
          details.url
        )
      ) {
        // eslint-disable-next-line
        callback({
          redirectURL,
        });
        return;
      }
      // eslint-disable-next-line
      callback({});
    }
  );

  const editor = new Editor();

  editor.connect().then((port: number) => {
    if (process.env.NODE_ENV === "production") {
      mainWindow.loadURL(
        "data:text/html;charset=UTF-8," +
          encodeURIComponent(editor.getMarkup("bundle.js", port)),
        {
          baseURLForDataURL: `filestub://devtoolsDist/`,
        }
      );
    } else {
      mainWindow.loadURL(`http://localhost:5050?port=${port}`);
      mainWindow.webContents.openDevTools();
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
