import { observer } from "mobx-react";
import * as React from "react";
import { MdEdit, MdKeyboardArrowRight, MdDelete } from "react-icons/md";
import { MdKeyboardArrowLeft } from "react-icons/md";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { Mixin } from "../../../../common/types";
import { useBackend } from "../../../backend";
import { Action } from "./Action";
import { Method } from "./Method";
import { Computed } from "./Computed";
import { Injector } from "./Injector";
import { Observable } from "./Observable";
import { Property } from "./Property";
import { actions } from "../../../flow-chart";
import { Getter } from "./Getter";

const Wrapper = styled.div`
  padding: ${space[2]} ${space[4]};
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0;
`;

const ClassNavigation = styled.div`
  display: flex;
  margin-left: auto;
`;

const EditFile = styled(MdEdit)`
  margin-left: ${space[2]};
  cursor: pointer;
  color: ${colors.gray[200]};
`;

const DeleteFile = styled(MdDelete)`
  margin-left: ${space[2]};
  cursor: pointer;
  color: ${colors.gray[200]};
`;

const InstanceSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: normal;
`;

const InstanceSelectorLeft = styled(MdKeyboardArrowLeft)<{ disabled: boolean }>`
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  opacity: ${(props) => (props.disabled ? "0.5" : "1")};
`;

const Mixins = styled.div`
  display: flex;
  margin-bottom: ${space[4]};
  > * {
    margin-right: ${space[2]};
  }
`;

const MixinItem = styled.div`
  display: flex;
  align-items: center;
  color: ${colors.gray[500]};
  > input {
    margin-right: 4px;
  }
`;

const InstanceSelectorRight = styled(MdKeyboardArrowRight)<{
  disabled: boolean;
}>`
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  opacity: ${(props) => (props.disabled ? "0.5" : "1")};
`;

const NameInput = styled.input`
  outline: none;
  font-size: 18px;
  color: ${colors.gray[100]};
  background-color: transparent;
  border: 0;
  font-weight: bold;
  &:active,
  &:focus {
    border: 0;
    outline: none;
  }
`;

export const CurrentClass = observer(({ id }: { id: string }) => {
  const backend = useBackend();
  const [newName, setNewName] = React.useState(id);
  const node = backend.chart.nodes[id];
  const instance = node.properties.currentInstanceId
    ? node.properties.instances[node.properties.currentInstanceId]
    : null;
  const injectors = node.properties.injectors;
  const sortedInstanceIds = Object.keys(node.properties.instances)
    .map(Number)
    .sort();

  return (
    <Wrapper>
      <Title>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (newName !== id) {
              backend.actions.onClassRenameSubmit(node, newName);
            }
          }}
        >
          <NameInput
            placeholder="Name..."
            value={newName}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            onChange={(event) => {
              setNewName(event.target.value);
            }}
          />
        </form>
        <ClassNavigation>
          {node.properties.currentInstanceId !== null ? (
            <InstanceSelector>
              <InstanceSelectorLeft
                disabled={
                  sortedInstanceIds[0] === node.properties.currentInstanceId
                }
                onClick={
                  sortedInstanceIds[0] === node.properties.currentInstanceId
                    ? undefined
                    : () => {
                        backend.actions.onInstanceClick(
                          id,
                          sortedInstanceIds[
                            sortedInstanceIds.indexOf(
                              node.properties.currentInstanceId!
                            ) - 1
                          ]
                        );
                      }
                }
              />
              {sortedInstanceIds.indexOf(node.properties.currentInstanceId) + 1}{" "}
              / {sortedInstanceIds.length}
              <InstanceSelectorRight
                disabled={
                  sortedInstanceIds[sortedInstanceIds.length - 1] ===
                  node.properties.currentInstanceId
                }
                onClick={
                  sortedInstanceIds[sortedInstanceIds.length - 1] ===
                  node.properties.currentInstanceId
                    ? undefined
                    : () => {
                        backend.actions.onInstanceClick(
                          id,
                          sortedInstanceIds[
                            sortedInstanceIds.indexOf(
                              node.properties.currentInstanceId!
                            ) + 1
                          ]
                        );
                      }
                }
              />
            </InstanceSelector>
          ) : null}
          <EditFile
            onClick={() => {
              backend.actions.onOpenClass(id);
            }}
          />
          <DeleteFile
            onClick={() => {
              backend.actions.onDeleteClass(id);
            }}
          />
        </ClassNavigation>
      </Title>
      <Mixins>
        {Object.values(Mixin).map((mixin) => (
          <MixinItem key={mixin}>
            <input
              type="checkbox"
              checked={node.properties.mixins.includes(mixin)}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onChange={() => {
                backend.actions.onToggleMixin(node.properties.name, mixin);
              }}
            />
            <label>{mixin}</label>
          </MixinItem>
        ))}
      </Mixins>
      <div>
        {injectors.map((injector) => (
          <Injector
            key={injector.propertyName}
            injector={injector}
            instance={instance}
            node={node}
          />
        ))}
      </div>
      <div>
        {node.properties.properties.map((property) => {
          if (property.type === "observable") {
            return (
              <Observable
                key={property.name}
                id={id}
                property={property}
                instance={instance}
                toggleObservable={backend.actions.onToggleObservable}
              />
            );
          }

          if (property.type === "computed") {
            return (
              <Computed
                key={property.name}
                id={id}
                property={property}
                instance={instance}
                toggleComputed={backend.actions.onToggleComputed}
              />
            );
          }

          if (property.type === "getter") {
            return (
              <Getter
                key={property.name}
                id={id}
                property={property}
                toggleComputed={backend.actions.onToggleComputed}
              />
            );
          }

          return (
            <Property
              key={property.name}
              id={id}
              property={property}
              toggleObservable={backend.actions.onToggleObservable}
            />
          );
        })}
      </div>
      <div>
        {node.properties.methods.map((method) => {
          if (!method.type) {
            return (
              <Method
                key={method.name}
                id={id}
                method={method}
                toggleAction={backend.actions.onToggleAction}
              />
            );
          }

          return (
            <Action
              key={method.name}
              id={id}
              action={method}
              runAction={backend.actions.onRunAction}
              toggleAction={backend.actions.onToggleAction}
              instanceId={node.properties.currentInstanceId}
              instance={instance}
            />
          );
        })}
      </div>
    </Wrapper>
  );
});
