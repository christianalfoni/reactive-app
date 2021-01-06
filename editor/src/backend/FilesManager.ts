import * as fs from "fs";
import * as path from "path";

import { property } from "lodash";
import * as prettier from "prettier";
import { Node, Project, StructureKind } from "ts-morph";
import * as ts from "typescript";

import {
  APP_DIR,
  CONFIGURATION_DIR,
  LIBRARY_IMPORT,
} from "../common/constants";
import { ClassMetadata, ExtractedClass, Mixin } from "../common/types";
import * as ast from "./ast-utils";
import { TsMorphFs, writeLineBreak } from "./TsMorphFs";

let prettierConfig = {};

try {
  prettierConfig = JSON.parse(
    fs.readFileSync(path.resolve(".prettierrc")).toString("utf-8")
  );
} catch {
  // No worries, just using defaults
}

export class FilesManager {
  private filesWatcher: fs.FSWatcher | undefined;
  private project: Project = new Project({
    fileSystem: new TsMorphFs(prettierConfig),
  });
  metadata: {
    [name: string]: ClassMetadata;
  } = {};
  classes: {
    [name: string]: ExtractedClass;
  } = {};

  private getInjectName(classId: string) {
    return classId[0].toLowerCase() + classId.substr(1);
  }

  private getInjectFactoryName(classId: string) {
    return `create${classId}`;
  }

  private writePrettyFile(fileName: string, content: string) {
    return fs.promises.writeFile(
      fileName,
      new TextEncoder().encode(
        prettier.format(content, {
          ...prettierConfig,
          parser: path.extname(fileName) === ".json" ? "json" : "typescript",
        })
      )
    );
  }

  private async ensureAppDir() {
    try {
      await fs.promises.mkdir(path.resolve(APP_DIR));
    } catch {
      // Already exists
    }
  }

  private getAppSourceFile(fileName: string) {
    const fullPath = path.resolve(APP_DIR, `${fileName}.ts`);

    const sourceFile = this.project.getSourceFile(fullPath);

    if (sourceFile) {
      sourceFile.refreshFromFileSystemSync();

      return sourceFile;
    }

    return this.project.addSourceFileAtPath(fullPath);
  }

  private async ensureConfigurationDir() {
    const configDir = path.resolve(CONFIGURATION_DIR);

    try {
      await fs.promises.mkdir(configDir);
    } catch {
      // Already exists
    }

    try {
      const metadata = await fs.promises.readFile(
        path.resolve(configDir, "metadata.json")
      );
      this.metadata = JSON.parse(new TextDecoder("utf-8").decode(metadata));
    } catch {
      // No file, we will write it later
    }
  }

  private async ensureContainerEntry() {
    const entryFile = path.resolve(APP_DIR, "index.ts");
    try {
      await fs.promises.stat(entryFile);
    } catch {
      // We do not have the file, lets write it
      await this.writePrettyFile(
        entryFile,
        `import { Container } from '${LIBRARY_IMPORT}'
export const container = new Container({}, { devtool: process.env.NODE_ENV === 'development' ? "localhost:5051" : undefined })
`
      );
    }
  }

  private extractClass(classId: string) {
    const node = this.getAppSourceFile(classId);

    const classNode = ast.getClassNode(node, classId);
    const mixins = ast.getClassMixins(classNode);
    const injectors = ast.getInjectors(classNode);
    const properties = ast.getProperties(classNode);
    const methods = ast.getMethods(classNode);
    const observables = ast.getObservables(classNode);

    properties.forEach((property) => {
      if (observables.observable.includes(property.name)) {
        property.type = "observable";
      } else if (observables.computed.includes(property.name)) {
        property.type = "computed";
      }
    });

    methods.forEach((property) => {
      if (observables.action.includes(property.name)) {
        property.type = "action";
      }
    });

    return {
      classId,
      mixins,
      injectors,
      properties,
      methods,
    };
  }

  private async getClass(fileName: string): Promise<ExtractedClass> {
    const classId = this.getClassIdFromFileName(fileName);

    return this.extractClass(classId);
  }

  private getClassIdFromFileName(fileName: string) {
    return path.basename(fileName, ".ts");
  }

  private async getClasses() {
    const appDir = path.resolve(APP_DIR)!;
    try {
      const files = (await fs.promises.readdir(appDir)).filter(
        (file) =>
          file !== "index.ts" &&
          !file.endsWith(".test.ts") &&
          !file.endsWith(".spec.ts")
      );

      return files.reduce<{
        [key: string]: ExtractedClass;
      }>((aggr, file) => {
        const classId = path.basename(file, ".ts");

        aggr[classId] = this.extractClass(classId);

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
    const file = path.resolve(CONFIGURATION_DIR, "metadata.json")!;

    this.metadata[classId] = {
      x,
      y,
    };
    await this.writePrettyFile(file, JSON.stringify(this.metadata, null, 2));
  }

  /*
    This method writes the initial file content
  */
  async writeClass(classId: string) {
    const file = path.resolve(APP_DIR, classId + ".ts")!;

    await this.writeClassToEntryFile(classId);
    await this.writePrettyFile(
      file,
      `import { Feature } from 'reactive-app'

export interface ${classId} extends Feature {}

export class ${classId} {
  static mixins = ["Feature"];
}`
    );
  }

  private async writeClassToEntryFile(classId: string) {
    const sourceFile = this.getAppSourceFile("index");

    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${classId}`,
      namedImports: [classId],
    });

    sourceFile
      .getVariableDeclaration("container")
      ?.getInitializer()
      ?.transform((traversal) => {
        const node = traversal.visitChildren();

        if (
          ts.isObjectLiteralExpression(node) &&
          ts.isNewExpression(node.parent) &&
          node.parent.arguments![0] === node
        ) {
          return ts.factory.createObjectLiteralExpression(
            [
              ...node.properties,
              ts.factory.createShorthandPropertyAssignment(classId, undefined),
            ],
            undefined
          );
        }

        return node;
      });

    sourceFile.saveSync();
  }

  /*
    This method adds injections. The type of injection will be part of
    the payload, either "singleton" or "factory"
  */
  async inject({
    fromClassId,
    toClassId,
    asFactory,
  }: {
    fromClassId: string;
    toClassId: string;
    asFactory: boolean;
  }) {
    const sourceFile = this.getAppSourceFile(toClassId);

    ast.addImportDeclaration(sourceFile, LIBRARY_IMPORT, "TFeature");
    ast.addImportDeclaration(sourceFile, `./${fromClassId}`, fromClassId, true);

    const classNode = sourceFile.getClass(toClassId);

    if (!classNode) {
      throw new Error("Can not find class node");
    }

    const name = asFactory
      ? `create${fromClassId}`
      : fromClassId[0].toLocaleLowerCase() + fromClassId.substr(1);

    classNode.insertProperty(1, {
      name,
      hasExclamationToken: true,
      isReadonly: true,
      type: `TFeature<typeof ${fromClassId}>`,
      trailingTrivia: writeLineBreak,
    });

    ast.updateInjectFeatures(classNode, (config) => {
      config.addProperty({
        name,
        kind: StructureKind.PropertyAssignment,
        initializer: `"${fromClassId}"`,
      });
    });

    sourceFile.saveSync();
  }

  async removeInjection(fromClassId: string, toClassId: string) {
    const sourceFile = this.getAppSourceFile(toClassId);

    ast.removeImportDeclaration(sourceFile, `./${fromClassId}`);

    const classNode = sourceFile.getClass(toClassId);

    if (!classNode) {
      throw new Error("Can not find class node");
    }

    classNode
      .getProperty((property) => {
        const name = property.getName();

        return (
          name === this.getInjectName(fromClassId) ||
          name === this.getInjectFactoryName(fromClassId)
        );
      })
      ?.remove();

    ast.updateInjectFeatures(classNode, (config) => {
      const property = config.getProperty((property) => {
        if (!Node.isPropertyAssignment(property)) {
          return false;
        }
        const initializer = property.getInitializer();

        if (!Node.isStringLiteral(initializer)) {
          return false;
        }

        return JSON.parse(initializer.getText()) === fromClassId;
      });

      property?.remove();
    });

    sourceFile.saveSync();
  }

  async toggleMakeObservableProperty(
    classId: string,
    name: string,
    value?: "observable" | "computed" | "action"
  ) {
    const sourceFile = this.getAppSourceFile(classId);
    const classNode = sourceFile.getClass(classId)!;

    ast.updateMakeObservable(classNode, (config) => {
      if (value) {
        config.addProperty({
          name,
          kind: StructureKind.PropertyAssignment,
          initializer: `"${value}"`,
        });
      } else {
        const property = config.getProperty(name);
        property?.remove();
      }
    });

    sourceFile.saveSync();
  }

  async toggleMixin(classId: string, mixin: Mixin) {
    const sourceFile = this.getAppSourceFile(classId);

    switch (mixin) {
      case "View":
      case "Factory":
        ast.toggleImportDeclaration(sourceFile, LIBRARY_IMPORT, mixin);
        ast.toggleMixinInterface(sourceFile, classId, mixin);
        ast.toggleMixin(sourceFile, classId, mixin);
        break;
      case "StateMachine":
        ast.toggleImportDeclaration(sourceFile, LIBRARY_IMPORT, mixin);
        ast.toggleMixinInterface(
          sourceFile,
          classId,
          "StateMachine<TMessage, TContext>"
        );
        const contextType = sourceFile.getTypeAlias("TContext");
        const messageType = sourceFile.getTypeAlias("TMessage");
        const classInterface = sourceFile.getInterface(classId);
        const clas = sourceFile.getClass(classId)!;
        const state = clas.getProperty("state");
        const onMessage = clas.getMethod("onMessage");
        if (state && onMessage && contextType && messageType) {
          state.remove();
          contextType.remove();
          messageType.remove();
          onMessage.remove();
        } else {
          const interfaceNodeIndex = classInterface!.getChildIndex();
          sourceFile.insertTypeAlias(interfaceNodeIndex, {
            name: "TContext",
            isExported: true,
            type: '{ state: "FOO" } | { state: "BAR" }',
          });
          sourceFile.insertTypeAlias(interfaceNodeIndex, {
            name: "TMessage",
            isExported: true,
            type: '{ type: "TRANSITION" }',
            trailingTrivia: writeLineBreak,
          });
          clas.addProperty({
            name: "context",
            type: "TContext",
            initializer: `{ state: "FOO" }`,
          });
          const onMessage = clas.addMethod({
            name: "onMessage",
            returnType: "TContext | void",

            parameters: [
              {
                name: "message",
                type: "TMessage",
              },
            ],
            statements: `
switch (message.type) {
  case "TRANSITION": {
    return { state: "BAR" }
  }
}
`,
            trailingTrivia: writeLineBreak,
          });
          onMessage.toggleModifier("protected", true);
        }
        ast.toggleMixin(sourceFile, classId, mixin);
        ast.updateMakeObservable(clas, (config) => {
          config.addProperty({
            name: "context",
            initializer: '"observable"',
            kind: StructureKind.PropertyAssignment,
          });
        });
        break;
    }

    sourceFile.saveSync();
  }

  async deleteClass(classId: string) {
    const file = path.resolve(APP_DIR, classId + ".ts");

    await fs.promises.unlink(file);
  }

  async renameClass(fromClassId: string, toClassId: string) {
    await this.writeMetadata({
      classId: toClassId,
      ...this.metadata[fromClassId],
    });
    const fromClassPath = path.resolve(APP_DIR, fromClassId + ".ts");
    const toClassPath = path.resolve(APP_DIR, toClassId + ".ts");
    const fs = this.project.getFileSystem();
    const contents = fs.readFileSync(fromClassPath);
    const sourceFile = this.project.createSourceFile(toClassPath, contents);

    const classDefinition = sourceFile.getClass(fromClassId)!;
    classDefinition.rename(toClassId);

    // Rename interface

    fs.writeFileSync(toClassPath, sourceFile.print());

    await this.writeClassToEntryFile(toClassId);

    await this.deleteClass(fromClassId);
  }

  async initialize(listeners: {
    onClassChange: (e: ExtractedClass) => void;
    onClassCreate: (e: ExtractedClass) => void;
    onClassDelete: (name: string) => void;
  }) {
    await this.ensureConfigurationDir();
    await this.ensureAppDir();
    await this.ensureContainerEntry();
    this.classes = await this.getClasses();
    this.filesWatcher = fs.watch(
      path.resolve(APP_DIR),
      async (eventType, fileName) => {
        if (
          fileName === "index.ts" ||
          fileName.endsWith(".test.ts") ||
          fileName.endsWith(".spec.ts")
        ) {
          return;
        }

        if (eventType === "change") {
          const updatedClass = await this.getClass(fileName);
          this.classes[updatedClass.classId] = updatedClass;
          listeners.onClassChange(updatedClass);
        } else if (
          eventType === "rename" &&
          fs.existsSync(path.resolve(APP_DIR, fileName))
        ) {
          const createdClass = await this.getClass(fileName);
          this.classes[createdClass.classId] = createdClass;
          listeners.onClassCreate(createdClass);
        } else {
          const classId = this.getClassIdFromFileName(fileName);
          delete this.classes[classId];
          delete this.metadata[classId];
          const file = path.resolve(CONFIGURATION_DIR, "metadata.json")!;
          await this.writePrettyFile(
            file,
            JSON.stringify(this.metadata, null, 2)
          );
          const sourceFile = this.getAppSourceFile("index");
          ast.removeImportDeclaration(sourceFile, `./${classId}`);
          sourceFile
            .getVariableDeclaration("container")
            ?.getInitializer()
            ?.transform((traversal) => {
              const node = traversal.visitChildren();

              if (
                ts.isObjectLiteralExpression(node) &&
                ts.isNewExpression(node.parent) &&
                node.parent.arguments![0] === node
              ) {
                return ts.factory.createObjectLiteralExpression(
                  node.properties.filter(
                    (property) =>
                      !property.name ||
                      !ts.isIdentifier(property.name) ||
                      property.name.escapedText !== classId
                  ),
                  undefined
                );
              }

              return node;
            });
          sourceFile.saveSync();
          listeners.onClassDelete(classId);
        }
      }
    );
  }

  getMetadata() {
    return this.metadata;
  }

  dispose() {
    this.filesWatcher?.close();
  }
}
