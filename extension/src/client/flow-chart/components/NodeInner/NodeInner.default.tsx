import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IConfig, INode } from "../..";
import { useBackend } from "../../../backend";
import { HiLink, HiOutlineEye } from "react-icons/hi";
import { RiShareBoxLine } from "react-icons/ri";
import { colors } from "../../../../design-tokens";

export interface INodeInnerDefaultProps {
  className?: string;
  config: IConfig;
  node: INode;
}

const Outer = styled.div`
  padding: 20px;
`;

const Property = styled.div`
  display: flex;
  align-items: center;
  color: ${colors.terminal.foreground};
  margin-bottom: 4px;
  > :first-child {
    margin-right: 4px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  > :first-child {
    margin-right: auto;
  }
  > :last-child {
    margin-left: 6px;
  }
`;

const StringValue = styled.span`
  color: ${colors.terminal.ansiYellow};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NumberValue = styled.span`
  color: ${colors.terminal.ansiBlue};
`;

const EditValue = styled(RiShareBoxLine)<{ disabled?: boolean }>((props) =>
  props.disabled ? `opacity: 0.5;` : `cursor: pointer;`
);

function renderValue(value: any) {
  if (typeof value === "string") {
    return <StringValue>"{value}"</StringValue>;
  }
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    value === null
  ) {
    return <NumberValue>{value}</NumberValue>;
  }
  if (Array.isArray(value)) {
    return `[ ${value.length} ]`;
  }

  return `{ ${Object.keys(value).length} }`;
}

export const NodeInnerDefault = observer(
  ({ node, className }: INodeInnerDefaultProps) => {
    const backend = useBackend();
    const [name, setName] = React.useState(node.properties.name);
    const instanceId =
      node.properties.currentInstanceId ||
      Object.keys(node.properties.instances)[0];

    return (
      <Outer className={className}>
        <div>
          {node.properties.isEditing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                backend.actions.onNameSubmit(node, name);
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </form>
          ) : (
            <Header>
              <h3>{node.properties.name}</h3>
            </Header>
          )}
        </div>
        <div>
          {node.properties.injectors.map((injector) => {
            return (
              <Property key={injector.propertyName}>
                <HiLink />{" "}
                <span>
                  <strong>{injector.classId}</strong> {injector.propertyName}
                </span>
              </Property>
            );
          })}
          {node.properties.observables.map((observable) => {
            return (
              <Property key={observable.name}>
                <HiOutlineEye />{" "}
                <span>
                  {observable.name}{" "}
                  {instanceId &&
                  node.properties.instances[instanceId].values[observable.name]
                    ? renderValue(
                        node.properties.instances[instanceId].values[
                          observable.name
                        ]
                      )
                    : null}
                </span>
              </Property>
            );
          })}
        </div>
      </Outer>
    );
  }
);
