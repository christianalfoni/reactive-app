import { observer } from "mobx-react";
import * as React from "react";
import { MdEdit, MdKeyboardArrowRight } from "react-icons/md";
import styled from "styled-components";
import { useBackend } from "../../../backend";
import { MdKeyboardArrowLeft } from "react-icons/md";
import { colors, space } from "../../../../common/design-tokens";
import { Injector } from "./Injector";
import { Observable } from "./Observable";
import { Computed } from "./Computed";
import { Action } from "./Action";

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

const InstanceSelectorRight = styled(MdKeyboardArrowRight)<{
  disabled: boolean;
}>`
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  opacity: ${(props) => (props.disabled ? "0.5" : "1")};
`;

export const CurrentClass = observer(({ id }: { id: string }) => {
  const backend = useBackend();
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
        {node.properties.name}
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
        </ClassNavigation>
      </Title>
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
        {node.properties.observables.map((observable) => (
          <Observable
            key={observable.name}
            observable={observable}
            instance={instance}
          />
        ))}
      </div>
      <div>
        {node.properties.computed.map((computed) => (
          <Computed
            key={computed.name}
            computed={computed}
            instance={instance}
          />
        ))}
      </div>
      <div>
        {node.properties.actions.map((action) => (
          <Action key={action.name} action={action} instance={instance} />
        ))}
      </div>
    </Wrapper>
  );
});
