import { observer } from "mobx-react";
import * as React from "react";
import { FunctionComponent, memo, useState } from "react";
import {
  Wrapper,
  Bracket,
  EditValuePopup,
  EditValueWrapper,
  GenericValue,
  InlineClass,
  Key,
  KeyCount,
  NestedChildren,
  NewState,
  Ok,
  OtherValue,
  SmallWrapper,
  StringValue,
  InlineNested,
  ClassInstanceLabel,
} from "./elements";
import { isArray, isObject, isValidJson } from "./utils";

export type GetClassValue = (
  name: string,
  instanceId: number
) => Record<string, unknown>;

export type SelectClassInstance = (name: string, instanceId: number) => void;

function renderValue({
  path,
  value,
  delimiter,
  expandedPaths,
  getClassValue,
  selectClassInstance,
  onClickPath,
  onToggleExpand,
  selectedStatePath,
  onSubmitState,
}: {
  onSubmitState?: (newState: string) => void;
  selectedStatePath?: string;
  onToggleExpand: (path: string[]) => void;
  path: string;
  getClassValue: GetClassValue;
  selectClassInstance: SelectClassInstance;
  delimiter: string;
  value: any;
  expandedPaths: string[];
  onClickPath?: (path: string[]) => void;
}) {
  let node;

  if (isObject(value)) {
    node = (
      <Nested
        key={path}
        startBracket="{"
        endBracket="}"
        path={path}
        getClassValue={getClassValue}
        selectClassInstance={selectClassInstance}
        delimiter={delimiter}
        expandedPaths={expandedPaths}
        onClickPath={onClickPath}
        onToggleExpand={onToggleExpand}
        isArray={false}
        value={value}
        selectedStatePath={selectedStatePath}
        onSubmitState={onSubmitState}
      />
    );
  } else if (isArray(value)) {
    node = (
      <Nested
        key={path}
        startBracket="["
        endBracket="]"
        delimiter={delimiter}
        path={path}
        getClassValue={getClassValue}
        selectClassInstance={selectClassInstance}
        expandedPaths={expandedPaths}
        onClickPath={onClickPath}
        onToggleExpand={onToggleExpand}
        isArray
        value={value}
        selectedStatePath={selectedStatePath}
        onSubmitState={onSubmitState}
      />
    );
  } else {
    node = (
      <ValueComponent
        key={path}
        path={path}
        delimiter={delimiter}
        value={value}
        onClickPath={onClickPath}
        selectedStatePath={selectedStatePath}
        onSubmitState={onSubmitState}
      />
    );
  }

  return node;
}

type PathKeyProps = {
  path: string;
  onClickPath?: (path: string[]) => void;
  onToggleExpand?: (path: string[]) => void;
  disabled: boolean;
  delimiter: string;
};

const PathKey: FunctionComponent<PathKeyProps> = ({
  path,
  onClickPath,
  onToggleExpand,
  disabled,
  delimiter,
}) => {
  return path.length ? (
    <Key
      onClick={
        disabled
          ? undefined
          : (event) => {
              event.stopPropagation();
              if (onClickPath && (event.metaKey || event.ctrlKey)) {
                onClickPath(path.split(delimiter));
              } else if (onToggleExpand) {
                onToggleExpand(path.split(delimiter));
              }
            }
      }
    >
      {path.split(delimiter).pop()}:
    </Key>
  ) : null;
};

type EditValueProps = {
  value: any;
  onSubmit: (newState: string) => void;
};

const EditValue: FunctionComponent<EditValueProps> = ({ value, onSubmit }) => {
  const [state, setState] = useState(() => JSON.stringify(value, null, 2));
  const isValid = isValidJson(state);

  return (
    <EditValueWrapper onClick={(event) => event.stopPropagation()}>
      <EditValuePopup>
        <NewState
          autoFocus
          value={state}
          onChange={(event) => setState(event.currentTarget.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.keyCode === 13) {
              onSubmit(state);
            }
          }}
          style={{
            borderColor: isValid
              ? undefined
              : "var(inputValidation.errorBorder)",
          }}
        />
        <Ok>CMD/CTRL + ENTER to save</Ok>
      </EditValuePopup>
    </EditValueWrapper>
  );
};

type NestedProps = {
  startBracket: string;
  endBracket: string;
  expandedPaths: string[];
  delimiter: string;
  path: string;
  getClassValue: GetClassValue;
  selectClassInstance: SelectClassInstance;
  isArray: boolean;
  value: any;
  onToggleExpand: (path: string[]) => void;
  onClickPath?: (path: string[]) => void;
  selectedStatePath?: string;
  onSubmitState?: (newState: string) => void;
};

const Nested: FunctionComponent<NestedProps> = memo(
  observer(
    ({
      expandedPaths,
      path,
      onToggleExpand,
      onClickPath,
      startBracket,
      endBracket,
      getClassValue,
      selectClassInstance,
      isArray,
      selectedStatePath,
      value,
      delimiter,
      onSubmitState,
    }) => {
      const shouldCollapse = !expandedPaths.includes(path);
      const isClass = value.__CLASS__;
      const classValue: any = isClass
        ? getClassValue(value.__CLASS__, value.__INSTANCE_ID__)
        : null;
      const className = isClass
        ? `${value.__CLASS__} ${value.__INSTANCE_ID__}`
        : null;

      if (onSubmitState && selectedStatePath && path === selectedStatePath) {
        return (
          <InlineNested
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(path.split(delimiter));
            }}
          >
            {path.length ? <Key>{path.split(delimiter).pop()}:</Key> : null}
            <EditValue
              value={isClass ? classValue : value}
              onSubmit={onSubmitState}
            />
          </InlineNested>
        );
      }

      if (shouldCollapse) {
        const keys = isClass ? Object.keys(classValue) : Object.keys(value);

        return (
          <InlineNested
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(path.split(delimiter));
            }}
          >
            <PathKey
              path={path}
              delimiter={delimiter}
              onClickPath={onClickPath}
              onToggleExpand={onToggleExpand}
              disabled={!onSubmitState}
            />
            {startBracket}
            <KeyCount>
              {isArray ? (
                value.length + " items"
              ) : (
                <InlineNested>
                  {keys.sort().slice(0, 3).join(", ") + "..."}
                </InlineNested>
              )}
            </KeyCount>
            {endBracket}
          </InlineNested>
        );
      }

      return (
        <div>
          <Bracket
            pointer
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(path.split(delimiter));
            }}
          >
            <PathKey
              path={path}
              delimiter={delimiter}
              onClickPath={onClickPath}
              onToggleExpand={onToggleExpand}
              disabled={!onSubmitState}
            />
            {startBracket}
          </Bracket>
          <NestedChildren>
            {Array.isArray(value)
              ? value.map((_, index) =>
                  renderValue({
                    path: path.concat((path ? delimiter : "") + String(index)),
                    delimiter,
                    value: value[index],
                    expandedPaths,
                    getClassValue,
                    selectClassInstance,
                    onClickPath,
                    onSubmitState,
                    onToggleExpand,
                    selectedStatePath,
                  })
                )
              : isClass
              ? [
                  <ClassInstanceLabel
                    onClick={() => {
                      selectClassInstance(
                        value.__CLASS__,
                        value.__INSTANCE_ID__
                      );
                    }}
                    key={path.concat((path ? delimiter : "") + "__CLASS__")}
                  >
                    {className}
                  </ClassInstanceLabel>,
                  ...Object.keys(classValue)
                    .sort()
                    .map((key) => {
                      return renderValue({
                        path: path.concat((path ? delimiter : "") + key),
                        value: classValue[key],
                        delimiter,
                        getClassValue,
                        selectClassInstance,
                        expandedPaths,
                        onClickPath,
                        onSubmitState,
                        onToggleExpand,
                        selectedStatePath,
                      });
                    }),
                ]
              : Object.keys(value)
                  .sort()
                  .map((key) => {
                    return renderValue({
                      path: path.concat((path ? delimiter : "") + key),
                      value: value[key],
                      delimiter,
                      getClassValue,
                      selectClassInstance,
                      expandedPaths,
                      onClickPath,
                      onSubmitState,
                      onToggleExpand,
                      selectedStatePath,
                    });
                  })}
          </NestedChildren>
          <Bracket pointer={false}>{endBracket}</Bracket>
        </div>
      );
    }
  )
);

type ValueComponentProps = {
  value: string | number | boolean;
  path: string;
  onClickPath?: (path: string[]) => void;
  delimiter: string;
  selectedStatePath?: string;
  onSubmitState?: (newState: string) => void;
};

const ValueComponent: FunctionComponent<ValueComponentProps> = memo(
  ({
    value,
    path,
    onClickPath,
    selectedStatePath,
    onSubmitState,
    delimiter,
  }) => {
    const [isHoveringString, setHoveringString] = useState(false);

    if (onSubmitState && selectedStatePath && path === selectedStatePath) {
      return (
        <GenericValue>
          {path.length ? <Key>{path.split(delimiter).pop()}:</Key> : null}
          <EditValue value={value} onSubmit={onSubmitState} />
        </GenericValue>
      );
    }

    if (
      typeof value === "string" &&
      value[0] === "[" &&
      value[value.length - 1] === "]"
    ) {
      return (
        <OtherValue>
          <PathKey
            path={path}
            delimiter={delimiter}
            onClickPath={onClickPath}
            disabled={!onSubmitState}
          />
          {value.substr(1, value.length - 2)}
        </OtherValue>
      );
    }

    if (typeof value === "string") {
      return (
        <StringValue>
          <PathKey
            path={path}
            delimiter={delimiter}
            onClickPath={onClickPath}
            disabled={!onSubmitState}
          />
          <div
            onMouseOver={() => setHoveringString(true)}
            onMouseOut={() => setHoveringString(false)}
          >
            "
            {value.length > 50 && !isHoveringString
              ? value.substr(0, 50) + "..."
              : value}
            "
          </div>
        </StringValue>
      );
    }

    return (
      <GenericValue>
        <PathKey
          path={path}
          delimiter={delimiter}
          onClickPath={onClickPath}
          disabled={!onSubmitState}
        />
        {String(value)}
      </GenericValue>
    );
  }
);

type InspectorProps = {
  value: Record<string, unknown>;
  expandedPaths: string[];
  delimiter: string;
  getClassValue: GetClassValue;
  selectClassInstance: SelectClassInstance;
  small?: boolean;
  onToggleExpand: (path: string[]) => void;
  onClickPath?: (path: string[]) => void;
  selectedStatePath?: string;
  onSubmitState?: (newState: string) => void;
};

const Inspector: FunctionComponent<InspectorProps> = ({
  value,
  expandedPaths,
  small,
  onToggleExpand,
  getClassValue,
  selectClassInstance,
  delimiter,
  onClickPath,
  selectedStatePath = "",
  onSubmitState,
}) => {
  const Component = small ? SmallWrapper : Wrapper;
  return (
    <Component>
      {renderValue({
        path: "",
        delimiter,
        getClassValue,
        selectClassInstance,
        value,
        expandedPaths,
        onClickPath,
        onToggleExpand,
        selectedStatePath,
        onSubmitState,
      })}
    </Component>
  );
};

export default Inspector;
