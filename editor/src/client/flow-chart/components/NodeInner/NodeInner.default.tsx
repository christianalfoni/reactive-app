import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IConfig, INode } from "../..";
import { useBackend } from "../../../backend";
import { HiCog, HiLink, HiOutlineEye } from "react-icons/hi";
import { AiOutlineCode } from "react-icons/ai";
import { BiCurrentLocation } from "react-icons/bi";
import { colors, space } from "../../../../common/design-tokens";
import { Mixin } from "../../../../common/types";

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
  color: ${colors.gray[200]};
  margin-bottom: 4px;
  > :first-child {
    margin-right: 8px;
    color: ${colors.gray[600]};
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
`;

const StringValue = styled.span`
  color: ${colors.yellow[400]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentState = styled.div`
  color: ${colors.blue[400]};
`;

const CurrentStateIcon = styled(BiCurrentLocation)`
  color: ${colors.blue[400]};
`;

const NumberValue = styled.span`
  color: ${colors.blue[400]};
`;

const NameChangeForm = styled.form``;

const Name = styled.h3`
  margin: 0;
`;

const Type = styled.div`
  font-size: 10px;
  margin-bottom: 0.25rem;
  color: ${colors.purple[400]};
`;

const PropsWrapper = styled.div`
  > :first-child {
    margin-top: ${space[4]};
  }
`;

const NameInput = styled.input`
  outline: none;
  font-size: 16px;
  color: ${colors.gray[100]};
  background-color: transparent;
  border: 0;
  border-bottom: 1px solid ${colors.purple[500]};
  font-weight: bold;
  &:active,
  &:focus {
    border: 0;
    outline: none;
    border-bottom: 1px solid ${colors.purple[500]};
  }
`;

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
    const nameInput = React.useRef<HTMLInputElement | null>(null);
    const instanceId =
      node.properties.currentInstanceId ||
      Object.keys(node.properties.instances)[0];

    React.useEffect(() => {
      backend.chartActions.onNodeClick({
        nodeId: node.id,
      });
    }, [node.properties.isEditing]);

    return (
      <Outer className={className}>
        <div>
          {node.properties.isEditing ? (
            <div>
              <NameChangeForm
                onSubmit={(event) => {
                  event.preventDefault();
                  backend.actions.onClassSubmit(node, name);
                }}
              >
                <NameInput
                  ref={nameInput}
                  placeholder="Name..."
                  autoFocus
                  value={name}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                  }}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                />
              </NameChangeForm>
            </div>
          ) : (
            <Header>
              {node.properties.mixins.length ? (
                <Type>{node.properties.mixins.join(", ")}</Type>
              ) : null}
              <Name>{node.properties.name}</Name>
            </Header>
          )}
        </div>
        {node.properties.mixins.includes(Mixin.StateMachine) &&
        instanceId &&
        node.properties.instances[instanceId].values.state ? (
          <Property>
            <CurrentStateIcon />
            <CurrentState>
              {node.properties.instances[instanceId].values.state.current}
            </CurrentState>
          </Property>
        ) : node.properties.mixins.includes(Mixin.StateMachine) ? (
          <Property>
            <CurrentStateIcon />
          </Property>
        ) : null}
        <PropsWrapper>
          {node.properties.injectors.map((injector) => {
            return (
              <Property key={injector.propertyName}>
                <HiLink />{" "}
                <span>
                  <strong style={{ color: colors.purple[400] }}>
                    {injector.classId}
                  </strong>{" "}
                  {injector.propertyName}
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
        </PropsWrapper>
      </Outer>
    );
  }
);
