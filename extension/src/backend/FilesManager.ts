import * as vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";
import { APP_DIR, CONFIGURATION_DIR, LIBRARY_IMPORT } from "../constants";
import * as ast from "./ast-utils";
import { getWorkspaceUri } from "./utils";
import { ClassMetadata, ExtractedClass, Mixin } from "../types";

export class FilesManager {
  metadata: {
    [name: string]: ClassMetadata;
  } = {};
  classes: {
    [name: string]: ExtractedClass;
  } = {};

  async initialize(listeners: {
    onClassChange: (name: string, e: ExtractedClass) => void;
    onClassCreate: (name: string) => void;
    onClassDelete: (name: string) => void;
  }) {
    await this.ensureConfigurationDir();
    await this.ensureAppDir();
    await this.ensureContainerEntry();
    this.classes = await this.getClasses();
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
      getWorkspaceUri(APP_DIR)!.path + "/**"
    );
    fsWatcher.onDidChange(async (uri) => {
      const updatedClass = await this.getClass(uri);
      this.classes[updatedClass.classId] = updatedClass;
      listeners.onClassChange(this.getClassIdFromUri(uri), updatedClass);
    });
    fsWatcher.onDidCreate(async (uri) =>
      listeners.onClassCreate(this.getClassIdFromUri(uri))
    );
    fsWatcher.onDidDelete(async (uri) =>
      listeners.onClassCreate(this.getClassIdFromUri(uri))
    );
  }
  private async ensureAppDir() {
    try {
      await vscode.workspace.fs.createDirectory(getWorkspaceUri(APP_DIR)!);
    } catch {
      // Already exists
    }
  }
  private async ensureConfigurationDir() {
    const dir = getWorkspaceUri(CONFIGURATION_DIR)!;

    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch {
      // Already exists
    }

    try {
      const metadata = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(dir, "metadata.json")
      );
      this.metadata = JSON.parse(new TextDecoder("utf-8").decode(metadata));
    } catch {
      // No file, we will write it later
    }
  }
  private async ensureContainerEntry() {
    const entryFile = vscode.Uri.joinPath(
      getWorkspaceUri(APP_DIR)!,
      "index.ts"
    );
    try {
      await vscode.workspace.fs.stat(entryFile);
    } catch {
      // We do not have the file, lets write it
      await vscode.workspace.fs.writeFile(
        entryFile,
        new TextEncoder().encode(`import { Container } from '${LIBRARY_IMPORT}'
export const container = new Container({}, { devtool: process.env.NODE_ENV === 'development' ? "localhost:5051" : undefined })
`)
      );
    }
  }
  private extractClass(classId: string, content: Uint8Array) {
    const node = ts.createSourceFile(
      "temp.ts",
      new TextDecoder("utf-8").decode(content),
      ts.ScriptTarget.Latest
    );

    const classNode = ast.getClassNode(node, classId);
    const mixins = ast.getClassMixins(node, classId);
    const injectors = ast.getInjectors(classNode);
    const observables = ast.getObservables(classNode);
    const computed = ast.getComputed(classNode);
    const actions = ast.getActions(classNode);

    const initialObservables = [];

    if (mixins.includes(Mixin.StateMachine)) {
      initialObservables.push({ name: "state" });
    }

    return {
      classId,
      mixins,
      injectors,
      observables: initialObservables.concat(observables),
      computed,
      actions,
    };
  }
  private async getClass(uri: vscode.Uri): Promise<ExtractedClass> {
    const content = await vscode.workspace.fs.readFile(uri);
    const classId = this.getClassIdFromUri(uri);

    return this.extractClass(classId, content);
  }
  private getClassIdFromUri(uri: vscode.Uri) {
    return path.basename(uri.path, ".ts");
  }
  getMetadata() {
    return this.metadata;
  }
  private async getClasses() {
    const appDir = getWorkspaceUri(APP_DIR)!;
    try {
      const files = (await vscode.workspace.fs.readDirectory(appDir))
        .filter(([file]) => file !== "index.ts")
        .map(([file]) => file);

      const contents = await Promise.all(
        files.map((file) =>
          vscode.workspace.fs.readFile(vscode.Uri.joinPath(appDir, file))
        )
      );

      return contents.reduce<{
        [key: string]: ExtractedClass;
      }>((aggr, content, index) => {
        const classId = path.basename(files[index], ".ts");

        aggr[classId] = this.extractClass(classId, content);

        return aggr;
      }, {});
    } catch {
      return {};
    }
  }
  /*
    This is where we map files to nodes and their metadata. Things
    like position and the ID of the node.
  */
  async writeMetadata({
    classId,
    x,
    y,
  }: {
    classId: string;
    x: number;
    y: number;
  }) {
    const file = getWorkspaceUri(CONFIGURATION_DIR, "metadata.json")!;

    this.metadata[classId] = {
      x,
      y,
    };
    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(JSON.stringify(this.metadata, null, 2))
    );
  }
  /*
    This method writes the initial file content
  */
  async writeClass(classId: string, mixins: Mixin[]) {
    const file = getWorkspaceUri(APP_DIR, classId + ".ts")!;

    let code = "";

    if (mixins.length) {
      code += `import { applyMixins, ${mixins
        .map((mixin) =>
          mixin === Mixin.StateMachine
            ? "StateMachine, StateMachineTransitions"
            : mixin
        )
        .join(", ")} } from "${LIBRARY_IMPORT}/mixins";

export interface ${classId} extends ${mixins.map((mixin) => {
        if (mixin === Mixin.StateMachine) {
          return "StateMachine<TState>";
        }

        return mixin;
      })} {}
      `;
    }

    if (mixins.includes(Mixin.StateMachine)) {
      code += `
export type TState =
  | { current: "FOO" }
  | { current: "BAR" };

export class ${classId} {
  readonly transitions: StateMachineTransitions<TState> =  {
    FOO: {
      BAR: true
    },
    BAR: {
      FOO: true
    }
  }
}`;
    } else {
      code += `

export class ${classId} {}`;
    }

    if (mixins.length) {
      code += `

applyMixins(${classId}, [${mixins.join(", ")}]);
`;
    }

    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(code));

    await this.writeClassToEntryFile(classId);
  }
  private async writeClassToEntryFile(classId: string) {
    const file = getWorkspaceUri(APP_DIR, "index.ts")!;
    const code = await vscode.workspace.fs.readFile(file);

    const newCode = ast.transformTypescript(code, (node) => {
      if (ts.isSourceFile(node)) {
        return ast.addImportDeclaration(node, {
          name: classId,
          source: `./${classId}`,
          isType: false,
        });
      }
      if (ts.isNewExpression(node) && node.arguments) {
        const classes = node.arguments[0] as ts.ObjectLiteralExpression;

        return ts.factory.createNewExpression(
          node.expression,
          node.typeArguments,
          ([
            ts.factory.createObjectLiteralExpression(
              [
                ...classes.properties,
                ts.factory.createShorthandPropertyAssignment(
                  classId,
                  undefined
                ),
              ],
              undefined
            ),
          ] as any).concat(node.arguments.slice(1))
        );
      }
    });
    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(newCode)
    );
  }
  /*
    This method adds injections. The type of injection will be part of
    the payload, either "singleton" or "factory"
  */
  async inject({
    fromClassId,
    toClassId,
  }: {
    fromClassId: string;
    toClassId: string;
  }) {
    const file = getWorkspaceUri(APP_DIR, toClassId + ".ts")!;
    const code = await vscode.workspace.fs.readFile(file);

    const newCode = ast.transformTypescript(code, (node) => {
      if (ts.isSourceFile(node)) {
        const withLibraryImport = ast.addImportDeclaration(node, {
          name: "inject",
          source: LIBRARY_IMPORT,
          isType: false,
        });

        return ast.addImportDeclaration(withLibraryImport, {
          name: fromClassId,
          source: `./${fromClassId}`,
          isType: true,
        });
      }
      if (ast.isClassNode(node, toClassId)) {
        return ast.addInjectionProperty(
          node,
          fromClassId,
          fromClassId.toLowerCase(),
          "inject"
        );
      }
    });

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(newCode)
    );
  }
  async replaceInjection(
    name: string,
    fromName: string,
    propertyName: string,
    toInjection: "inject" | "injectFactory"
  ) {
    const file = getWorkspaceUri(APP_DIR, name + ".ts")!;
    const code = await vscode.workspace.fs.readFile(file);
    const newCode = ast.transformTypescript(code, (node) => {
      if (ts.isSourceFile(node)) {
        const withClassImport = ast.addImportDeclaration(node, {
          name: fromName,
          source: `./${fromName}`,
          isType: true,
        });

        const withInjection = ast.addImportDeclaration(withClassImport, {
          name: toInjection,
          source: LIBRARY_IMPORT,
          isType: false,
        });

        if (toInjection === "injectFactory") {
          return ast.addImportDeclaration(withInjection, {
            name: "IFactory",
            source: LIBRARY_IMPORT,
            isType: false,
          });
        }

        return withInjection;
      }

      if (ast.isClassNode(node, name)) {
        return ast.addInjectionProperty(
          node,
          fromName,
          propertyName,
          toInjection
        );
      }
    });

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(newCode)
    );
  }
}
