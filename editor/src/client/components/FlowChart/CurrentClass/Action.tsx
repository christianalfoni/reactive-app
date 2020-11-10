import { observer } from "mobx-react";
import * as React from "react";
import { AiOutlineCode } from "react-icons/ai";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Action as TAction } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const CurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const ActionIcon = styled(AiOutlineCode)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

const RunWrapper = styled.div`
  margin-left: auto;
  cursor: pointer;
  color: ${colors.blue[400]};
  :hover {
    color: ${colors.blue[300]};
  }
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
        {action.name}
        <RunWrapper>run</RunWrapper>
      </ActionWrapper>
    );
  }
);
