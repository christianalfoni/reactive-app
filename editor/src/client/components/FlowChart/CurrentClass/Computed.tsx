import { observer } from "mobx-react";
import * as React from "react";
import { HiCog } from "react-icons/hi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Computed as TComputed } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const CurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ComputedWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ComputedIcon = styled(HiCog)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

export const Computed = observer(
  ({
    computed,
    instance,
  }: {
    computed: TComputed;
    instance: ClassInstance | null;
  }) => {
    return (
      <ComputedWrapper>
        <ComputedIcon />
        {computed.name}
        <div>
          <CurrentValueContainer>
            {instance && computed.name in instance.values ? (
              <ValueInspector
                small
                value={instance.values[computed.name]}
                delimiter="."
              />
            ) : null}
          </CurrentValueContainer>
        </div>
      </ComputedWrapper>
    );
  }
);
