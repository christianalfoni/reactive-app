import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IConfig, INode } from "../..";
import { useBackend } from "../../../backend";
import { HiCog, HiLink, HiOutlineEye } from "react-icons/hi";
import { RiShareBoxLine } from "react-icons/ri";
import { AiOutlineCode } from "react-icons/ai";
import { BiCurrentLocation } from "react-icons/bi";
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
  flex-direction: column;
`;

const StringValue = styled.span`
  color: ${colors.terminal.ansiYellow};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentState = styled.div`
  color: ${colors.terminal.ansiBlue};
`;

const CurrentStateIcon = styled(BiCurrentLocation)`
  color: ${colors.terminal.ansiBlue};
`;

const NumberValue = styled.span`
  color: ${colors.terminal.ansiBlue};
`;

const NameChangeForm = styled.form`
  margin-bottom: 1rem;
`;

const Name = styled.h3`
  margin-top: 0;
`;

const Type = styled.div`
  font-size: 10px;
  margin-bottom: 0.25rem;
  color: ${colors.terminal.ansiMagenta};
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
            <NameChangeForm
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
            </NameChangeForm>
          ) : (
            <Header>
              <Type>{node.type}</Type>
              <Name>{node.properties.name}</Name>
            </Header>
          )}
        </div>
        {node.type === "StateMachine" && instanceId ? (
          <Property>
            <CurrentStateIcon />
            <CurrentState>
              {node.properties.instances[instanceId].values.state.current}
            </CurrentState>
          </Property>
        ) : node.type === "StateMachine" ? (
          <Property>
            <CurrentStateIcon />
          </Property>
        ) : null}
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
          {node.properties.computed.map((computed) => {
            return (
              <Property key={computed.name}>
                <HiCog />{" "}
                <span>
                  {computed.name}{" "}
                  {instanceId &&
                  node.properties.instances[instanceId].values[computed.name]
                    ? renderValue(
                        node.properties.instances[instanceId].values[
                          computed.name
                        ]
                      )
                    : null}
                </span>
              </Property>
            );
          })}
          {node.properties.actions.map((action) => {
            return (
              <Property key={action.name}>
                <AiOutlineCode />{" "}
                <span>
                  {action.name}{" "}
                  {instanceId &&
                  node.properties.instances[instanceId].values[action.name]
                    ? renderValue(
                        node.properties.instances[instanceId].values[
                          action.name
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
