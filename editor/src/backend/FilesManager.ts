import * as fs from "fs";
import * as path from "path";

import * as prettier from "prettier";
import * as ts from "typescript";

import {
  APP_DIR,
  CONFIGURATION_DIR,
  LIBRARY_IMPORT,
} from "../common/constants";
import { ClassMetadata, ExtractedClass, Mixin } from "../common/types";
import * as ast from "./ast-utils";

let prettierConfig = {};

try {
  prettierConfig = JSON.parse(
    fs.readFileSync(path.resolve(".prettierrc")).toString("utf-8")
  );
} catch {
  // No worries, just using defaults
}

export class FilesManager {
  metadata: {
    [name: string]: ClassMetadata;
  } = {};
  classes: {
    [name: string]: ExtractedClass;
  } = {};

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

  async initialize(listeners: {
    onClassChange: (name: string, e: ExtractedClass) => void;
    onClassCreate: (name: string, e: ExtractedClass) => void;
    onClassDelete: (name: string) => void;
  }) {
    await this.ensureConfigurationDir();
    await this.ensureAppDir();
    await this.ensureContainerEntry();
    this.classes = await this.getClasses();
    fs.watch(path.resolve(APP_DIR), async (eventType, fileName) => {
      if (
        fileName === "index.ts" ||
        fileName.endsWith(".test.ts") ||
        fileName.endsWith(".spec.ts")
      ) {
        return;
      }

      console.log(eventType, fileName);

      if (eventType === "change") {
        const updatedClass = await this.getClass(fileName);
        this.classes[updatedClass.classId] = updatedClass;
        listeners.onClassChange(
          this.getClassIdFromFileName(fileName),
          updatedClass
        );
      } else if (
        eventType === "rename" &&
        fs.existsSync(path.resolve(fileName))
      ) {
        const createdClass = await this.getClass(fileName);
        this.classes[createdClass.classId] = createdClass;
        listeners.onClassCreate(
          this.getClassIdFromFileName(fileName),
          createdClass
        );
      } else {
        listeners.onClassDelete(this.getClassIdFromFileName(fileName));
      }
    });
  }
  private async ensureAppDir() {
    try {
      await fs.promises.mkdir(path.resolve(APP_DIR));
    } catch {
      // Already exists
    }
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

    return {
      classId,
      mixins,
      injectors,
      observables,
      computed,
      actions,
    };
  }
  private async getClass(fileName: string): Promise<ExtractedClass> {
    const content = await fs.promises.readFile(path.resolve(APP_DIR, fileName));
    const classId = this.getClassIdFromFileName(fileName);

    return this.extractClass(classId, content);
  }
  private getClassIdFromFileName(fileName: string) {
    return path.basename(fileName, ".ts");
  }
  getMetadata() {
    return this.metadata;
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

      const contents = await Promise.all(
        files.map((file) => fs.promises.readFile(path.resolve(appDir, file)))
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
  async writeClass(classId: string, mixins: Mixin[]) {
    const file = path.resolve(APP_DIR, classId + ".ts")!;

    let code = "";

    if (mixins.length) {
      code += `
import { observable } from "${LIBRARY_IMPORT}";
import { applyMixins, ${mixins
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

	@observable
	state: TState = {
		current: "FOO"
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

    await this.writePrettyFile(file, code);

    await this.writeClassToEntryFile(classId);
  }
  private async writeClassToEntryFile(classId: string) {
    const file = path.resolve(APP_DIR, "index.ts")!;
    const code = await fs.promises.readFile(file);

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
    await this.writePrettyFile(file, newCode);
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
    const file = path.resolve(APP_DIR, toClassId + ".ts")!;
    const code = await fs.promises.readFile(file);

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

    await this.writePrettyFile(file, newCode);
  }
  async replaceInjection(
    name: string,
    fromName: string,
    propertyName: string,
    toInjection: "inject" | "injectFactory"
  ) {
    const file = path.resolve(APP_DIR, name + ".ts")!;
    const code = await fs.promises.readFile(file);
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

    await this.writePrettyFile(file, newCode);
  }
  async removeInjection(fromClassId: string, toClassId: string) {
    const file = path.resolve(APP_DIR, toClassId + ".ts")!;
    const code = await fs.promises.readFile(file);
    const newCode = ast.transformTypescript(code, (node) => {
      if (ts.isSourceFile(node)) {
        return ast.removeImportDeclaration(node, fromClassId);
      }

      if (ast.isClassNode(node, toClassId)) {
        return ast.removeInjectionProperty(node, fromClassId);
      }
    });

    await this.writePrettyFile(file, newCode);
  }
}
