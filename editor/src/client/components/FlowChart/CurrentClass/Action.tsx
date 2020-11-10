import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { AiOutlineCode } from "react-icons/ai";
import ValueInspector from "../../ValueInspector";
import { ClassInstance, Action as TAction } from "../../../../common/types";
import { colors, space } from "../../../../common/design-tokens";

const CurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ActionIcon = styled(AiOutlineCode)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

export const Action = observer(
  ({
    action,
    instance,
  }: {
    action: TAction;
    instance: ClassInstance | null;
  }) => {
    return (
      <ActionWrapper>
        <ActionIcon />
        <strong>{action.name}</strong>
        <div>
          <CurrentValueContainer>
            {instance && action.name in instance.values ? (
              <ValueInspector
                small
                value={instance.values[action.name]}
                delimiter="."
              />
            ) : null}
          </CurrentValueContainer>
        </div>
      </ActionWrapper>
    );
  }
);
