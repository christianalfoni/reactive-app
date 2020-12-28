import { observer } from "mobx-react";
import * as React from "react";
import { HiCog } from "react-icons/hi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Property } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const CurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ComputedWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const ComputedIcon = styled(HiCog)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

export const Computed = observer(
  ({
    property,
    instance,
  }: {
    property: Property;
    instance: ClassInstance | null;
  }) => {
    return (
      <ComputedWrapper>
        <ComputedIcon />
        {property.name}
        <div>
          <CurrentValueContainer>
            {instance && property.name in instance.values ? (
              <ValueInspector
                small
                value={instance.values[property.name]}
                delimiter="."
              />
            ) : null}
          </CurrentValueContainer>
        </div>
      </ComputedWrapper>
    );
  }
);
