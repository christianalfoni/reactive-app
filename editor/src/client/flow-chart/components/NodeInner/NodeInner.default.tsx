import { observer } from "mobx-react";
import * as React from "react";
import { AiOutlineCode } from "react-icons/ai";
import { BiCurrentLocation } from "react-icons/bi";
import { GiFactory } from "react-icons/gi";
import { HiCog, HiLink } from "react-icons/hi";
import { FiBox } from "react-icons/fi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { Mixin } from "../../../../common/types";
import { useBackend } from "../../../backend";
import { IConfig, INode } from "../..";

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

const FactoryIcon = styled(GiFactory)`
  color: ${colors.blue[400]};
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
  color: ${colors.gray[400]};
`;

const PropsWrapper = styled.div`
  > :first-child {
    margin-top: ${space[4]};
  }
`;

const StateProperty = styled(Property)`
  margin-top: ${space[2]};
`;

const NameInput = styled.input`
  outline: none;
  font-size: 16px;
  color: ${colors.gray[100]};
  background-color: transparent;
  border: 0;
  border-bottom: 1px solid ${colors.green[500]};
  font-weight: bold;
  &:active,
  &:focus {
    border: 0;
    outline: none;
    border-bottom: 1px solid ${colors.green[500]};
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
              <Name>
                {node.properties.mixins.includes(Mixin.Factory) ? (
                  <FactoryIcon />
                ) : null}{" "}
                {node.properties.name}
              </Name>
            </Header>
          )}
        </div>
        {node.properties.mixins.includes(Mixin.StateMachine) &&
        instanceId &&
        node.properties.instances[instanceId].values.state ? (
          <StateProperty>
            <CurrentStateIcon />
            <CurrentState>
              {node.properties.instances[instanceId].values.state.current}
            </CurrentState>
          </StateProperty>
        ) : node.properties.mixins.includes(Mixin.StateMachine) ? (
          <StateProperty>
            <CurrentStateIcon />
          </StateProperty>
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
          {node.properties.properties.map((property) => {
            return (
              <Property key={property.name}>
                {property.type === "computed" || property.type === "getter" ? (
                  <HiCog
                    style={{
                      color:
                        property.type === "computed"
                          ? colors.orange[400]
                          : undefined,
                    }}
                  />
                ) : (
                  <FiBox
                    style={{
                      color:
                        property.type === "observable"
                          ? colors.orange[400]
                          : undefined,
                    }}
                  />
                )}
                <span>
                  {property.name}{" "}
                  {instanceId &&
                  node.properties.instances[instanceId].values[property.name]
                    ? renderValue(
                        node.properties.instances[instanceId].values[
                          property.name
                        ]
                      )
                    : null}
                </span>
              </Property>
            );
          })}
          {node.properties.methods.map((method) => {
            return (
              <Property key={method.name}>
                <AiOutlineCode
                  style={{
                    color:
                      method.type === "action" ? colors.orange[400] : undefined,
                  }}
                />{" "}
                <span>{method.name}</span>
              </Property>
            );
          })}
        </PropsWrapper>
      </Outer>
    );
  }
);
