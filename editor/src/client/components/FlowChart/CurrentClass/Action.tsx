import { observer } from "mobx-react";
import * as React from "react";
import { AiOutlineCode } from "react-icons/ai";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Method } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const ActionIcon = styled(AiOutlineCode)`
  margin-left: ${space[1]};
  margin-right: ${space[2]};
  color: ${colors.orange[500]};
`;

const RunWrapper = styled.div`
  margin-left: auto;
  cursor: pointer;
  color: ${colors.blue[400]};
  :hover {
    color: ${colors.blue[300]};
  }
`;

const Wrapper = styled.div`
  margin-bottom: ${space[2]};
`;

const Execution = styled.div`
  display: flex;
  align-items: center;
`;

const ExecutionTime = styled.span`
  font-size: 12px;
  color: ${colors.gray[500]};
  margin-right: ${space[2]};
`;

const ExecutionWrapper = styled.div``;

export const Action = observer(
  ({
    id,
    action,
    instanceId,
    instance,
    runAction,
  }: {
    id: string;
    action: Method;
    instanceId: number | null;
    instance: ClassInstance | null;
    runAction: (instanceId: number, name: string) => void;
  }) => {
    const [isExpanded, setExpanded] = React.useState(false);

    return (
      <Wrapper>
        <ActionWrapper onClick={() => setExpanded(!isExpanded)}>
          {isExpanded ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
          <ActionIcon />
          {action.name} (
          {instance && instance.actionExecutions[action.name]
            ? instance.actionExecutions[action.name].length
            : "0"}
          )
          <RunWrapper
            onClick={(event) => {
              event.stopPropagation();
              if (instanceId === null) {
                return;
              }
              runAction(instanceId, action.name);
            }}
            style={
              instance
                ? undefined
                : { color: colors.gray[700], cursor: "default" }
            }
          >
            run
          </RunWrapper>
        </ActionWrapper>
        {isExpanded && instance && instance.actionExecutions[action.name] ? (
          <ExecutionWrapper>
            {instance.actionExecutions[action.name].map((execution, index) => {
              const date = new Date(execution.time);
              return (
                <Execution key={index}>
                  <ExecutionTime>{date.toLocaleTimeString()}</ExecutionTime>
                  <ValueInspector small value={execution.args} delimiter="." />
                </Execution>
              );
            })}
          </ExecutionWrapper>
        ) : null}
      </Wrapper>
    );
  }
);
