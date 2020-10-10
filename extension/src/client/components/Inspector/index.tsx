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
} from "./elements";
import { isArray, isObject, isValidJson } from "./utils";

function renderValue({
  path,
  value,
  delimiter,
  renderPaths,
  expandedPaths,
  onClickPath,
  onToggleExpand,
  selectedStatePath,
  onSubmitState,
}: {
  onSubmitState?: (newState: string) => void;
  selectedStatePath?: string;
  onToggleExpand: (path: string[]) => void;
  path: string;
  delimiter: string;
  value: any;
  renderPaths?: RenderPaths;
  expandedPaths: string[];
  onClickPath?: (path: string[]) => void;
}) {
  const wrapper = renderPaths && renderPaths[path];
  let node;

  if (isObject(value)) {
    node = (
      <Nested
        key={path}
        startBracket="{"
        endBracket="}"
        path={path}
        delimiter={delimiter}
        expandedPaths={expandedPaths}
        hasWrapper={Boolean(wrapper)}
        onClickPath={onClickPath}
        renderPaths={renderPaths}
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
        renderPaths={renderPaths}
        path={path}
        expandedPaths={expandedPaths}
        hasWrapper={Boolean(wrapper)}
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
        hasWrapper={Boolean(wrapper)}
        onSubmitState={onSubmitState}
      />
    );
  }

  return wrapper ? wrapper(node) : node;
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
  renderPaths?: RenderPaths;
  delimiter: string;
  path: string;
  hasWrapper: boolean;
  isArray: boolean;
  value: any;
  onToggleExpand: (path: string[]) => void;
  onClickPath?: (path: string[]) => void;
  selectedStatePath?: string;
  onSubmitState?: (newState: string) => void;
};

const Nested: FunctionComponent<NestedProps> = memo(
  ({
    expandedPaths,
    path,
    onToggleExpand,
    onClickPath,
    startBracket,
    renderPaths,
    hasWrapper,
    endBracket,
    isArray,
    selectedStatePath,
    value,
    delimiter,
    onSubmitState,
  }) => {
    const shouldCollapse = !expandedPaths.includes(path);
    const isClass = value.__CLASS__;

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
            value={isClass ? value.value : value}
            onSubmit={onSubmitState}
          />
        </InlineNested>
      );
    }

    if (shouldCollapse) {
      const keys = isClass ? Object.keys(value.value) : Object.keys(value);

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
            disabled={!onSubmitState || hasWrapper}
          />
          {startBracket}
          <KeyCount>
            {isArray ? (
              keys.length + " items"
            ) : (
              <InlineNested>
                {isClass ? <InlineClass>{value.name}</InlineClass> : null}{" "}
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
            disabled={!onSubmitState || hasWrapper}
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
                  renderPaths,
                  expandedPaths,
                  onClickPath,
                  onSubmitState,
                  onToggleExpand,
                  selectedStatePath,
                })
              )
            : isClass
            ? [
                <OtherValue
                  key={path.concat((path ? delimiter : "") + "__CLASS__")}
                >
                  {value.name}
                </OtherValue>,
                ...Object.keys(value.value)
                  .sort()
                  .map((key) => {
                    return renderValue({
                      path: path.concat((path ? delimiter : "") + key),
                      value: value.value[key],
                      delimiter,
                      renderPaths,
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
                    renderPaths,
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
);

type ValueComponentProps = {
  value: string | number | boolean;
  path: string;
  hasWrapper: boolean;
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
    hasWrapper,
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
            disabled={!onSubmitState || hasWrapper}
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
            disabled={!onSubmitState || hasWrapper}
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
          disabled={!onSubmitState || hasWrapper}
        />
        {String(value)}
      </GenericValue>
    );
  }
);

export type RenderPaths = {
  [path: string]: (children: JSX.Element) => React.ReactNode;
};

type InspectorProps = {
  value: Record<string, unknown>;
  expandedPaths: string[];
  delimiter: string;
  small?: boolean;
  onToggleExpand: (path: string[]) => void;
  onClickPath?: (path: string[]) => void;
  renderPaths?: RenderPaths;
  selectedStatePath?: string;
  onSubmitState?: (newState: string) => void;
};

const Inspector: FunctionComponent<InspectorProps> = ({
  value,
  expandedPaths,
  small,
  onToggleExpand,
  delimiter,
  onClickPath,
  renderPaths,
  selectedStatePath = "",
  onSubmitState,
}) => {
  const Component = small ? SmallWrapper : Wrapper;
  return (
    <Component>
      {renderValue({
        path: "",
        delimiter,
        value,
        renderPaths,
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
