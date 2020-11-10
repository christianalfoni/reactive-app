import { observer } from "mobx-react";
import * as React from "react";
import { HiLink } from "react-icons/hi";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Injector as TInjector } from "../../../../common/types";
import { useBackend } from "../../../backend";
import { INode } from "../../../flow-chart";

const InjectionItem = styled.div`
  background-color: ${colors.gray[700]};
  color: ${colors.gray[200]};
  cursor: pointer;
  padding: ${space[2]} ${space[4]};
  margin-bottom: ${space[2]};
`;

const Injection = ({ id, onClick }: { id: number; onClick: () => void }) => {
  return <InjectionItem onClick={onClick}>Instance {id}</InjectionItem>;
};

const LinkIcon = styled(HiLink)`
  margin: 0 ${space[1]};
  color: ${colors.gray[600]};
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
  background-color: ${colors.gray[700]};
  color: ${colors.gray[200]};
  margin-left: auto;
  border: 1px solid ${colors.gray[600]};
  > option {
    background-color: ${colors.gray[600]};
  }
`;

const InstanceWrapper = styled.div`
  cursor: pointer;
`;

const Wrapper = styled.div`
  margin-bottom: ${space[2]};
`;

export const Injector = observer(
  ({
    injector,
    instance,
    node,
  }: {
    injector: TInjector;
    instance: ClassInstance | null;
    node: INode;
  }) => {
    const backend = useBackend();
    const [isExpanded, setExpanded] = React.useState(false);

    return (
      <Wrapper>
        <InjectionWrapper onClick={() => setExpanded(!isExpanded)}>
          {isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
          <LinkIcon />
          <strong style={{ color: colors.purple[400] }}>
            {injector.classId}
          </strong>{" "}
          {injector.propertyName} (
          {instance && instance.injections[injector.propertyName]
            ? instance.injections[injector.propertyName].length
            : 0}
          )
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
      </Wrapper>
    );
  }
);
