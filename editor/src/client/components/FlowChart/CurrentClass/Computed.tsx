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
  color: ${colors.orange[500]};
  cursor: pointer;
`;

export const Computed = observer(
  ({
    id,
    property,
    instance,
    toggleComputed,
  }: {
    id: string;
    property: Property;
    instance: ClassInstance | null;
    toggleComputed: (id: string, property: Property) => void;
  }) => {
    return (
      <ComputedWrapper>
        <ComputedIcon onClick={() => toggleComputed(id, property)} />
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
