import {
  ArrayLiteralExpression,
  CallExpression,
  ClassDeclaration,
  ClassMemberTypes,
  ConstructorDeclaration,
  ExpressionStatement,
  Node,
  ObjectLiteralExpression,
  SourceFile,
  StringLiteral,
} from "ts-morph";
import * as ts from "typescript";

import { Injector, Method, Mixin, Property } from "../common/types";
import { writeLineBreak } from "./TsMorphFs";

export function getClassNode(node: SourceFile, name: string): ClassDeclaration {
  const classNode = node.getClass(name);

  if (!classNode) {
    throw new Error("Could not find a class statement");
  }

  return classNode;
}

export function getClassMixins(node: ClassDeclaration): Mixin[] {
  const mixinsProperty = node.getProperty("mixins");

  if (!mixinsProperty) {
    throw new Error("Missing mixin property");
  }

  const initializer = mixinsProperty.getInitializer() as ArrayLiteralExpression;

  if (!Node.isArrayLiteralExpression(initializer)) {
    throw new Error(
      "Mixins property is not initialized as ArrayLiteralExpression"
    );
  }

  const elements = initializer.getElements() as StringLiteral[];

  return elements.map((element) => JSON.parse(element.getText()) as Mixin);
}

export function getInjectors(node: ClassDeclaration): Injector[] {
  const constr = node.getConstructors()[0];

  if (!constr) {
    return [];
  }

  const config = getConstructorConfig(constr, "injectFeatures");

  if (!config) {
    return [];
  }

  const injectors: Injector[] = [];

  config.getProperties().forEach((property) => {
    if (Node.isPropertyAssignment(property)) {
      const name = property.getName();
      const value = property.getInitializer() as StringLiteral;

      injectors.push({
        propertyName: name,
        classId: JSON.parse(value.getText()),
      });
    }
  });

  return injectors;
}

export function getProperties(node: ClassDeclaration) {
  function shouldIgnore(member: ClassMemberTypes) {
    return Boolean(
      member
        .getModifiers()
        .find(
          (modifier) =>
            modifier.getKind() === ts.SyntaxKind.PrivateKeyword ||
            modifier.getKind() === ts.SyntaxKind.StaticKeyword ||
            modifier.getKind() === ts.SyntaxKind.ReadonlyKeyword ||
            modifier.getKind() === ts.SyntaxKind.ProtectedKeyword
        )
    );
  }
  return node.getMembers().reduce<Property[]>((aggr, member) => {
    if (Node.isPropertyDeclaration(member) && !shouldIgnore(member)) {
      return aggr.concat({
        name: member.getName(),
      });
    }

    if (Node.isGetAccessorDeclaration(member) && !shouldIgnore(member)) {
      return aggr.concat({
        name: member.getName(),
        type: "getter",
      });
    }

    return aggr;
  }, []);
}

export function getMethods(node: ClassDeclaration) {
  return node.getMethods().reduce<Method[]>((aggr, method) => {
    const shouldIgnore = method
      .getModifiers()
      .find(
        (modifier) =>
          modifier.getKind() === ts.SyntaxKind.PrivateKeyword ||
          modifier.getKind() === ts.SyntaxKind.StaticKeyword ||
          modifier.getKind() === ts.SyntaxKind.ProtectedKeyword
      );

    if (shouldIgnore) {
      return aggr;
    }

    return aggr.concat({
      name: method.getName(),
    });
  }, []);
}

export function updateConstructor(
  node: ClassDeclaration,
  cb: (constr: ConstructorDeclaration) => void
) {
  let constr = node.getConstructors()[0];

  if (!constr) {
    const firstMethod = node.getMethods()[0];

    if (firstMethod) {
      const firstMethodIndex = firstMethod?.getChildIndex();
      constr = node.insertConstructor(firstMethodIndex);
    } else {
      constr = node.addConstructor();
    }
  }

  cb(constr);

  if (!constr.getStatements().length) {
    constr.remove();
  }
}

export function getConstructorConfig(
  constr: ConstructorDeclaration,
  name: "makeObservable" | "injectFeatures" | "transitionTo" | "addTransition"
) {
  const callExpression = constr.getFirstDescendant((node) => {
    if (!Node.isCallExpression(node)) {
      return false;
    }
    const expression = node.getExpression();

    if (!Node.isPropertyAccessExpression(expression)) {
      return false;
    }

    return expression.getName() === name;
  }) as CallExpression | undefined;

  if (callExpression) {
    return callExpression.getArguments()[0] as ObjectLiteralExpression;
  }
}

export function getConstructorStateMachineCalls(
  constr: ConstructorDeclaration
) {
  return constr.getDescendants().filter((node) => {
    if (!Node.isCallExpression(node)) {
      return false;
    }
    const expression = node.getExpression();

    if (!Node.isPropertyAccessExpression(expression)) {
      return false;
    }

    return ["transitionTo", "addTransition"].includes(expression.getName());
  }) as CallExpression[];
}

export function updateMakeObservable(
  node: ClassDeclaration,
  cb: (config: ObjectLiteralExpression) => void
) {
  updateConstructor(node, (constr) => {
    let config = getConstructorConfig(constr, "makeObservable");

    if (!config) {
      constr.addStatements(["this.makeObservable({})"]);
      config = getConstructorConfig(constr, "makeObservable")!;
    }

    cb(config);

    if (!config.getProperties().length) {
      (config.getParent().getParent() as ExpressionStatement).remove();
    }
  });
}

export function updateInjectFeatures(
  node: ClassDeclaration,
  cb: (config: ObjectLiteralExpression) => void
) {
  updateConstructor(node, (constr) => {
    let config = getConstructorConfig(constr, "injectFeatures");

    if (!config) {
      constr.addStatements(["this.injectFeatures({})"]);
      config = getConstructorConfig(constr, "injectFeatures")!;
    }

    cb(config);

    if (!config.getProperties().length) {
      (config.getParent().getParent() as ExpressionStatement).remove();
    }
  });
}

export function getObservables(node: ClassDeclaration) {
  const observables: {
    observable: string[];
    computed: string[];
    action: string[];
  } = {
    observable: [],
    computed: [],
    action: [],
  };

  const constr = node.getConstructors()[0];

  if (!constr) {
    return observables;
  }

  const config = getConstructorConfig(constr, "makeObservable");

  if (config) {
    config.getProperties().forEach((property) => {
      if (Node.isPropertyAssignment(property)) {
        const name = property.getName();
        const value = property.getInitializer() as StringLiteral;
        const type = JSON.parse(value.getText()) as keyof typeof observables;

        observables[type]?.push(name);
      }
    });
  }

  return observables;
}

export function getInjections(node: ts.ClassDeclaration) {}

export function addImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string,
  isTypeOnly = false
) {
  const existingImportDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) => {
      return (
        importDeclaration.getModuleSpecifier().getLiteralText() ===
        moduleSpecifier
      );
    }
  );

  if (
    existingImportDeclaration &&
    !existingImportDeclaration
      .getNamedImports()
      .find((namedImportItem) => namedImportItem.getText() === namedImport)
  ) {
    existingImportDeclaration.addNamedImport(namedImport);
  } else if (!existingImportDeclaration) {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [namedImport],
      isTypeOnly,
    });
  }
}

export function toggleImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string
) {
  const hasExistingDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) =>
      Boolean(
        importDeclaration.getModuleSpecifier().getLiteralText() ===
          moduleSpecifier &&
          importDeclaration
            .getNamedImports()
            .find((namedImportItem) =>
              namedImportItem.getName().match(namedImport)
            )
      )
  );

  if (hasExistingDeclaration) {
    removeImportDeclaration(sourceFile, moduleSpecifier, namedImport);
  } else {
    addImportDeclaration(sourceFile, moduleSpecifier, namedImport);
  }
}

export function removeImportDeclaration(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport?: string
) {
  const existingImportDeclaration = sourceFile.getImportDeclaration(
    (importDeclaration) =>
      importDeclaration.getModuleSpecifier().getLiteralText() ===
      moduleSpecifier
  )!;

  if (!namedImport) {
    existingImportDeclaration.remove();
    return;
  }

  if (existingImportDeclaration.getNamedImports().length > 1) {
    existingImportDeclaration
      .getNamedImports()
      .find(
        (namedImportItem) =>
          namedImportItem.getName().toString() === namedImport
      )
      ?.remove();
  } else {
    existingImportDeclaration.remove();
  }
}

export function toggleMixinInterface(
  sourceFile: SourceFile,
  interfaceName: string,
  type: string
) {
  const mixinInterface = sourceFile.getInterface(interfaceName);
  const classNode = sourceFile.getClass(interfaceName)!;

  if (!mixinInterface) {
    sourceFile.insertInterface(classNode.getChildIndex(), {
      name: interfaceName,
      extends: [type],
      isExported: true,
      trailingTrivia: writeLineBreak,
    });

    return true;
  }

  const mixinTypeIndex = mixinInterface
    .getExtends()
    .findIndex((typeArgument) => typeArgument.getText().match(type));
  const hasMixin = mixinTypeIndex >= 0;

  if (hasMixin) {
    mixinInterface.removeExtends(mixinTypeIndex);
    return false;
  } else {
    mixinInterface.addExtends([type]);
    return true;
  }
}

export function toggleMixin(
  sourceFile: SourceFile,
  target: string,
  mixin: string
) {
  const classNode = sourceFile.getClass(target)!;
  const mixins = classNode?.getProperty("mixins");

  if (mixins) {
    const initializer = mixins.getInitializer() as ArrayLiteralExpression;
    const elements = initializer.getElements() as StringLiteral[];
    const mixinElement = `"${mixin}"`;
    const mixinIndex = elements.findIndex(
      (element) => element.getText() === mixinElement
    );

    if (elements.length === 1 && mixinIndex > -1) {
      mixins.remove();
    } else if (mixinIndex > -1) {
      initializer.removeElement(mixinIndex);
    } else {
      initializer.addElement(mixinElement);
    }
  } else {
    classNode.insertProperty(0, {
      name: "mixins",
      isStatic: true,
      initializer: `["${mixin}"]`,
    });
  }
}
