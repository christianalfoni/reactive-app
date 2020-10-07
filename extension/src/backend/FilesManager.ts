import * as vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";
import { APP_DIR, CONFIGURATION_DIR } from "../constants";
import { join } from "path";
import {
  getClassNode,
  getInjectors,
  getObservables,
  getWorkspaceUri,
  transformTypescript,
} from "./utils";
import { ClassMetadata, ExtractedClass, Injector } from "../types";

export class FilesManager {
  private hasAppDir = false;
  private hasConfigurationDir = false;
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
    this.classes = await this.getClasses();
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
      getWorkspaceUri(APP_DIR)!.path + "/**"
    );
    fsWatcher.onDidChange(async (uri) => {
      const updatedClass = await this.getClass(uri);
      this.classes[updatedClass.name] = updatedClass;
      listeners.onClassChange(this.getClassNameFromUri(uri), updatedClass);
    });
    fsWatcher.onDidCreate(async (uri) =>
      listeners.onClassCreate(this.getClassNameFromUri(uri))
    );
    fsWatcher.onDidDelete(async (uri) =>
      listeners.onClassCreate(this.getClassNameFromUri(uri))
    );
  }
  private async ensureAppDir() {
    if (this.hasAppDir) {
      return;
    }

    try {
      await vscode.workspace.fs.createDirectory(getWorkspaceUri(APP_DIR)!);
      this.hasAppDir = true;
    } catch {
      // Already exists
    }
  }
  private async ensureConfigurationDir() {
    if (this.hasConfigurationDir) {
      return;
    }

    const dir = getWorkspaceUri(CONFIGURATION_DIR)!;

    try {
      await vscode.workspace.fs.createDirectory(dir);
      this.hasConfigurationDir = true;
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
  private async getClass(uri: vscode.Uri): Promise<ExtractedClass> {
    const content = await vscode.workspace.fs.readFile(uri);
    const name = this.getClassNameFromUri(uri);
    const node = ts.createSourceFile(
      "temp.ts",
      new TextDecoder("utf-8").decode(content),
      ts.ScriptTarget.Latest
    );
    const classNode = getClassNode(node, name);
    const injectors = getInjectors(classNode);
    const observables = getObservables(classNode);

    return {
      name,
      injectors,
      observables,
    };
  }
  private getClassNameFromUri(uri: vscode.Uri) {
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
        const name = path.basename(files[index], ".ts");
        const node = ts.createSourceFile(
          "temp.ts",
          new TextDecoder("utf-8").decode(content),
          ts.ScriptTarget.Latest
        );

        const classNode = getClassNode(node, name);
        const injectors = getInjectors(classNode);
        const observables = getObservables(classNode);

        aggr[name] = {
          name,
          injectors,
          observables,
        };

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
    name,
    id,
    x,
    y,
  }: {
    name: string;
    id: string;
    x: number;
    y: number;
  }) {
    const file = getWorkspaceUri(CONFIGURATION_DIR, "metadata.json")!;

    this.metadata[name] = {
      id,
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
  async writeClass(name: string) {
    const file = getWorkspaceUri(APP_DIR, name + ".ts")!;

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(`export interface I${name}Factory {
  (...args: ConstructorParameters<typeof ${name}>): ${name};
}
	  
export class ${name} {}`)
    );
  }
  /*
    This method adds injections. The type of injection will be part of
    the payload, either "singleton" or "factory"
  */
  async inject({ fromName, toName }: { fromName: string; toName: string }) {
    const file = getWorkspaceUri(APP_DIR, toName + ".ts")!;
    const code = await vscode.workspace.fs.readFile(file);

    const newCode = transformTypescript(
      new TextDecoder("utf-8").decode(code),
      (node) => {
        if (ts.isSourceFile(node)) {
          const importDeclarationCount = node.statements.filter((statement) =>
            ts.isImportDeclaration(statement)
          ).length;
          const newStatements = node.statements.slice();

          newStatements.splice(
            importDeclarationCount,
            0,
            ts.factory.createImportDeclaration(
              undefined,
              undefined,
              ts.factory.createImportClause(
                true,
                undefined,
                ts.factory.createNamedImports([
                  ts.factory.createImportSpecifier(
                    undefined,
                    ts.factory.createIdentifier(fromName)
                  ),
                ])
              ),
              ts.factory.createStringLiteral(`./${fromName}`)
            )
          );

          return ts.factory.createSourceFile(
            newStatements,
            node.endOfFileToken,
            node.flags
          );
        }
        if (
          ts.isClassDeclaration(node) &&
          node.name &&
          node.name.text === toName
        ) {
          return ts.factory.createClassDeclaration(
            node.decorators,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            ts.factory.createNodeArray([
              ts.factory.createPropertyDeclaration(
                [
                  ts.factory.createDecorator(
                    ts.factory.createCallExpression(
                      ts.factory.createIdentifier("inject"),
                      undefined,
                      [ts.factory.createStringLiteral(fromName)]
                    )
                  ),
                ],
                undefined,
                ts.factory.createIdentifier(fromName.toLowerCase()),
                ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
                ts.factory.createTypeReferenceNode(
                  ts.factory.createIdentifier(fromName),
                  undefined
                ),
                undefined
              ),
              ...node.members,
            ])
          );
        }
      }
    );

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(newCode)
    );
  }
  async replaceInjection(
    name: string,
    propertyName: string,
    toInjection: "inject" | "injectFactory"
  ) {
    const file = getWorkspaceUri(APP_DIR, name + ".ts")!;
    const code = await vscode.workspace.fs.readFile(file);
    const newCode = transformTypescript(
      new TextDecoder("utf-8").decode(code),
      (node) => {
        if (
          ts.isPropertyDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === propertyName
        ) {
          return ts.factory.createPropertyDeclaration(
            [
              ts.factory.createDecorator(
                ts.factory.createCallExpression(
                  ts.factory.createIdentifier(toInjection),
                  undefined,
                  (node.decorators![0].expression as ts.CallExpression)
                    .arguments
                )
              ),
            ],
            node.modifiers,
            node.name,
            node.exclamationToken,
            ts.factory.createTypeReferenceNode("IFactory", [
              ts.factory.createTypeQueryNode(
                ts.factory.createIdentifier(
                  ((node.type as ts.TypeReferenceNode)
                    .typeName as ts.Identifier).text
                )
              ),
            ]),
            node.initializer
          );
        }
      }
    );

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(newCode)
    );
  }
}
