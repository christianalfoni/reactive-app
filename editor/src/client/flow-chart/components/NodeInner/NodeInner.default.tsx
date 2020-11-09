import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IConfig, INode } from "../..";
import { useBackend } from "../../../backend";
import { HiCog, HiLink, HiOutlineEye } from "react-icons/hi";
import { RiShareBoxLine } from "react-icons/ri";
import { AiOutlineCode } from "react-icons/ai";
import { BiCurrentLocation } from "react-icons/bi";
import { colors } from "../../../../common/design-tokens";
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
  color: ${colors.foreground1};
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
  color: ${colors.yellow};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentState = styled.div`
  color: ${colors.blue};
`;

const CurrentStateIcon = styled(BiCurrentLocation)`
  color: ${colors.blue};
`;

const NumberValue = styled.span`
  color: ${colors.blue};
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
  color: ${colors.magenta};
`;

const EditValue = styled(RiShareBoxLine)<{ disabled?: boolean }>((props) =>
  props.disabled ? `opacity: 0.5;` : `cursor: pointer;`
);

const MixinItem = styled.div`
  display: flex;
  align-items: center;
  > input {
    margin-right: 4px;
  }
`;

const NameInput = styled.input`
  outline: none;
  font-size: 16px;
  color: ${colors.foreground1};
  background-color: transparent;
  border: 0;
  border-bottom: 1px solid ${colors.border2};
  font-weight: bold;
  &:active,
  &:focus {
    border: 0;
    outline: none;
    border-bottom: 1px solid ${colors.border2};
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
    const [mixins, setMixins] = React.useState<Mixin[]>([]);
    const instanceId =
      node.properties.currentInstanceId ||
      Object.keys(node.properties.instances)[0];

    React.useEffect(() => {
      backend.chartActions.onNodeClick({
        nodeId: node.id,
      });
    }, [node.properties.isEditing]);

    const toggleMixin = (mixin: Mixin) => {
      setMixins((current) => {
        if (current.includes(mixin)) {
          return current.filter((item) => item !== mixin);
        }

        return current.concat(mixin);
      });
    };

    return (
      <Outer className={className}>
        <div>
          {node.properties.isEditing ? (
            <div>
              <NameChangeForm
                onSubmit={(event) => {
                  event.preventDefault();
                  backend.actions.onClassSubmit(node, name, mixins);
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
              <h4>Capabilities</h4>
              {Object.values(Mixin).map((mixin) => (
                <MixinItem key={mixin}>
                  <input
                    type="checkbox"
                    checked={mixins.includes(mixin)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (nameInput.current) nameInput.current.focus();
                    }}
                    onChange={() => {
                      toggleMixin(mixin);
                    }}
                  />
                  <label>{mixin}</label>
                </MixinItem>
              ))}
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
