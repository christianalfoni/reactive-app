import * as fs from "fs";
import * as path from "path";

import * as chokidar from "chokidar";
import * as prettier from "prettier";
import { Project, StructureKind } from "ts-morph";
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
  private filesWatcher: chokidar.FSWatcher | undefined;
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

  private async writePrettyFile(fileName: string, content: string) {
    try {
      await fs.promises.mkdir(path.dirname(fileName));
    } catch {
      // Already exists
    }

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

  private getAppSourceFile(classId: string) {
    const fullPath =
      classId === "index"
        ? path.resolve(APP_DIR, "index.ts")
        : path.resolve(APP_DIR, classId, `index.ts`);

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
    return path.dirname(fileName).split(path.sep).pop()!;
  }

  private async getClasses() {
    const appDir = path.resolve(APP_DIR)!;

    try {
      const directories = (await fs.promises.readdir(appDir)).filter(
        (file) => !path.extname(file)
      );

      return directories.reduce<{
        [key: string]: ExtractedClass;
      }>((aggr, directory) => {
        const classId = directory;

        aggr[classId] = this.extractClass(classId);

        return aggr;
      }, {});
    } catch (error) {
      console.log("WTF?", error);
      return {};
    }
  }

  /*
    This is where we map files to nodes and their metadata. Things
    like position and the ID of the node.
  */
  async addMetadata({
    classId,
    x,
    y,
  }: {
    classId: string;
    x: number;
    y: number;
  }) {
    this.metadata[classId] = {
      x,
      y,
    };
    this.writeMetadata();
  }

  async writeMetadata() {
    const file = path.resolve(CONFIGURATION_DIR, "metadata.json")!;

    await this.writePrettyFile(file, JSON.stringify(this.metadata, null, 2));
  }

  /*
    This method writes the initial file content
  */
  async writeClass(classId: string) {
    const file = path.resolve(APP_DIR, classId, "index.ts")!;

    await this.writeContainerFile();
    await this.writePrettyFile(
      file,
      `import { Feature } from 'reactive-app'

export interface ${classId} extends Feature {}

export class ${classId} {
  static mixins = ["Feature"];
}`
    );
  }

  private async writeContainerFile() {
    const classIds = Object.keys(this.classes);
    const entryFile = path.resolve(APP_DIR, "index.ts");
    try {
      await this.writePrettyFile(
        entryFile,
        `import { Container } from 'reactive-app'
${classIds
  .map((classId) => `import { ${classId} } from './${classId}'`)
  .join("\n")}

export type AppContainer = Container<{
  ${classIds.map((classId) => `${classId}: typeof ${classId}`).join(",")}
}>

export const container: AppContainer = new Container({
  ${classIds.map((classId) => classId).join(",")}
}, { devtool: process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !window.opener ? "localhost:5051" : undefined })
      `
      );
    } catch {}
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

    ast.addImportDeclaration(
      sourceFile,
      `../${fromClassId}`,
      fromClassId,
      true
    );

    const classNode = sourceFile.getClass(toClassId);

    if (!classNode) {
      throw new Error("Can not find class node");
    }

    const name = asFactory
      ? `create${fromClassId}`
      : fromClassId[0].toLocaleLowerCase() + fromClassId.substr(1);

    classNode
      .insertProperty(1, {
        name,
        trailingTrivia: writeLineBreak,
      })
      .toggleModifier("private");

    ast.updateInjectFeature(classNode, name, fromClassId);

    sourceFile.saveSync();
  }

  async removeInjection(fromClassId: string, toClassId: string) {
    const sourceFile = this.getAppSourceFile(toClassId);

    ast.removeImportDeclaration(sourceFile, `../${fromClassId}`);

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

    function toggleObservable() {
      ast.toggleImportDeclaration(
        sourceFile,
        LIBRARY_IMPORT,
        Mixin.ObservableState
      );
      const hasAddedObservable = ast.toggleMixinInterface(
        sourceFile,
        classId,
        Mixin.ObservableState
      );
      ast.toggleMixin(sourceFile, classId, Mixin.ObservableState);

      const stateType = sourceFile.getTypeAlias("State");
      const classInterface = sourceFile.getInterface(classId);
      const classNode = ast.getClassNode(sourceFile, classId);
      if (hasAddedObservable && !stateType) {
        sourceFile.insertTypeAlias(classInterface!.getChildIndex(), {
          name: "State",
          isExported: true,
          type: "{}",
        });
        classNode
          .insertProperty(1, {
            name: "state",
            type: "State",
            initializer: "{}",
          })
          .toggleModifier("private");
      } else if (stateType) {
        stateType.remove();
        classNode.getProperty("state")?.remove();
      }
    }

    switch (mixin) {
      case "EventEmitter":
      case "Factory": {
        ast.toggleImportDeclaration(sourceFile, LIBRARY_IMPORT, mixin);
        ast.toggleMixinInterface(sourceFile, classId, mixin);
        ast.toggleMixin(sourceFile, classId, mixin);
        break;
      }
      case "ObservableState": {
        toggleObservable();
        break;
      }
      case "StateMachine": {
        const classInterface = sourceFile.getInterface(classId);
        const classNode = ast.getClassNode(sourceFile, classId);
        const hasObservable = ast
          .getClassMixins(classNode)
          .includes(Mixin.ObservableState);

        if (!hasObservable) {
          toggleObservable();
        }

        ast.toggleImportDeclaration(sourceFile, LIBRARY_IMPORT, mixin);
        ast.toggleMixin(sourceFile, classId, mixin);
        const hasAddedStateMachine = ast.toggleMixinInterface(
          sourceFile,
          classId,
          "StateMachine<State>"
        );
        const stateType = sourceFile.getTypeAlias("State");
        const stateProperty = classNode.getProperty("state");

        if (hasAddedStateMachine) {
          const interfaceNodeIndex = classInterface!.getChildIndex();

          if (!stateType) {
            sourceFile.insertTypeAlias(interfaceNodeIndex, {
              name: "State",
              isExported: true,
              type: '{ state: "FOO" } | { state: "BAR" }',
            });
          }

          if (!stateProperty) {
            classNode
              .insertProperty(1, {
                name: "state",
                type: "State",
                initializer: '{ state: "FOO" }',
              })
              .toggleModifier("private");
          }
        } else {
          ast.updateConstructor(
            ast.getClassNode(sourceFile, classId),
            (constr) => {
              ast.getConstructorStateMachineCalls(constr).forEach((expr) => {
                constr.removeStatement(expr.getChildIndex());
              });
            }
          );
        }

        break;
      }
    }

    sourceFile.saveSync();
  }

  async deleteClass(classId: string) {
    const directory = path.resolve(APP_DIR, classId);

    await fs.promises.rmdir(directory, { recursive: true });
  }

  async renameClass(fromClassId: string, toClassId: string) {
    await this.addMetadata({
      classId: toClassId,
      ...this.metadata[fromClassId],
    });
    const fromClassPath = path.resolve(APP_DIR, fromClassId, "index.ts");
    const toClassPath = path.resolve(APP_DIR, toClassId, "index.ts");
    const fs = this.project.getFileSystem();
    const contents = fs.readFileSync(fromClassPath);
    const sourceFile = this.project.createSourceFile(toClassPath, contents);

    const classDefinition = sourceFile.getClass(fromClassId)!;
    const classInterface = sourceFile.getInterface(fromClassId)!;
    classDefinition.rename(toClassId);
    classInterface.rename(toClassId);

    fs.mkdirSync(path.resolve(APP_DIR, toClassId));
    fs.writeFileSync(toClassPath, sourceFile.print());

    await this.deleteClass(fromClassId);

    await this.writeContainerFile();
  }

  async initialize(listeners: {
    onClassChange: (e: ExtractedClass) => void;
    onClassCreate: (e: ExtractedClass) => void;
    onClassDelete: (name: string) => void;
  }) {
    await this.ensureConfigurationDir();
    await this.ensureAppDir();

    this.classes = await this.getClasses();

    await this.writeContainerFile();

    this.filesWatcher = chokidar.watch(`${path.resolve(APP_DIR)}/*/index.ts`, {
      ignoreInitial: true,
    });
    this.filesWatcher.on("all", async (eventType, fileName) => {
      if (eventType === "change") {
        const updatedClass = await this.getClass(fileName);
        this.classes[updatedClass.classId] = updatedClass;
        listeners.onClassChange(updatedClass);
      } else if (eventType === "add") {
        const createdClass = await this.getClass(fileName);
        this.classes[createdClass.classId] = createdClass;
        listeners.onClassCreate(createdClass);
      } else if (eventType === "unlink") {
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
    });
  }

  getMetadata() {
    return this.metadata;
  }

  dispose() {
    this.filesWatcher?.close();
  }
}
