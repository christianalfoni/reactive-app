import { observer } from "mobx-react";
import * as React from "react";
import { AiOutlineCode } from "react-icons/ai";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { Method as TMethod } from "../../../../common/types";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const MethodIcon = styled(AiOutlineCode)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
  cursor: pointer;
`;

export const Method = observer(
  ({
    id,
    method,
    toggleAction,
  }: {
    id: string;
    method: TMethod;
    toggleAction: (id: string, method: TMethod) => void;
  }) => {
    return (
      <Wrapper>
        <MethodIcon onClick={() => toggleAction(id, method)} />
        {method.name}
      </Wrapper>
    );
  }
);
