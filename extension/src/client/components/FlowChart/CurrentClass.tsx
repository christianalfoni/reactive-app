import { observer } from "mobx-react";
import * as React from "react";
import { MdEdit, MdKeyboardArrowRight } from "react-icons/md";
import styled from "styled-components";
import { useBackend } from "../../backend";
import { HiOutlineEye, HiLink } from "react-icons/hi";
import { MdKeyboardArrowLeft } from "react-icons/md";
import ValueInspector from "../ValueInspector";
import { ClassInstance, Injector, Observable } from "../../../types";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import { actions, INode } from "../../flow-chart";
import { colors, space } from "../../../design-tokens";

const InjectionItem = styled.div`
  background-color: ${colors.badge.background};
  color: ${colors.badge.foreground};
  cursor: pointer;
  padding: ${space[2]} ${space[4]};
  margin-bottom: ${space[2]};
`;

const Injection = ({ id, onClick }: { id: number; onClick: () => void }) => {
  return <InjectionItem onClick={onClick}>Instance {id}</InjectionItem>;
};

const LinkIcon = styled(HiLink)`
  margin: 0 ${space[1]};
  color: ${colors.icon.foreground};
`;

const InjectionWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
  > strong {
    margin-right: ${space[1]};
  }
`;

const InjectionSelector = styled.select`
  background-color: ${colors.dropdown.background};
  color: ${colors.dropdown.foreground};
  margin-left: auto;
  border: 1px solid ${colors.dropdown.border};
  > option {
    background-color: ${colors.dropdown.listBackground};
  }
`;

const InstanceWrapper = styled.div`
  cursor: pointer;
`;

const Injector = observer(
  ({
    injector,
    instance,
    node,
  }: {
    injector: Injector;
    instance: ClassInstance | null;
    node: INode;
  }) => {
    const backend = useBackend();
    const [isExpanded, setExpanded] = React.useState(false);

    return (
      <div>
        <InjectionWrapper onClick={() => setExpanded(!isExpanded)}>
          {isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
          <LinkIcon />
          <strong>{injector.classId}</strong> {injector.propertyName} (
          {instance ? instance.injections[injector.propertyName].length : 0})
          <InjectionSelector
            onClick={(event) => event.stopPropagation()}
            value={injector.type}
            onChange={() => {
              backend.actions.onToggleInjectorType(node, injector);
            }}
          >
            <option value="inject">singleton</option>
            <option value="injectFactory">factory</option>
          </InjectionSelector>
        </InjectionWrapper>
        {isExpanded ? (
          <InstanceWrapper>
            {instance && instance.injections[injector.propertyName]
              ? instance.injections[injector.propertyName].map((id) => (
                  <Injection
                    key={id}
                    id={id}
                    onClick={() => {
                      backend.actions.onInstanceClick(injector.classId, id);
                    }}
                  />
                ))
              : null}
          </InstanceWrapper>
        ) : null}
      </div>
    );
  }
);

const EditCurrentValueContainer = styled.div`
  display: flex;
  margin: 10px;
`;

const ObservableWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ObservableIcon = styled(HiOutlineEye)`
  margin-right: ${space[2]};
  color: ${colors.icon.foreground};
`;

const Observable = observer(
  ({
    observable,
    instance,
  }: {
    observable: Observable;
    instance: ClassInstance | null;
  }) => {
    return (
      <ObservableWrapper>
        <ObservableIcon />
        <strong>{observable.name}</strong>
        <div>
          {instance && observable.name in instance.values ? (
            <EditCurrentValueContainer>
              <ValueInspector
                small
                value={instance.values[observable.name]}
                delimiter="."
              />
            </EditCurrentValueContainer>
          ) : null}
        </div>
      </ObservableWrapper>
    );
  }
);

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
  color: ${colors.icon.foreground};
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
          <Injector injector={injector} instance={instance} node={node} />
        ))}
      </div>
      <div>
        {node.properties.observables.map((observable) => (
          <Observable observable={observable} instance={instance} />
        ))}
      </div>
    </Wrapper>
  );
});
