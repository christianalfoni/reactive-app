import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { HiCog } from "react-icons/hi";
import ValueInspector from "../../ValueInspector";
import { ClassInstance, Computed as TComputed } from "../../../../types";
import { colors, space } from "../../../../design-tokens";

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
  color: ${colors.icon.foreground};
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
        <strong>{computed.name}</strong>
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
