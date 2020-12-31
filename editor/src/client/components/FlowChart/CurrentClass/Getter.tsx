import { observer } from "mobx-react";
import * as React from "react";
import { HiCog } from "react-icons/hi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { Property } from "../../../../common/types";

const PropertyWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const PropertyIcon = styled(HiCog)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
  cursor: pointer;
  :hover {
    color: ${colors.gray[200]};
  }
`;

export const Getter = observer(
  ({
    property,
    id,
    toggleComputed,
  }: {
    property: Property;
    id: string;
    toggleComputed: (id: string, property: Property) => void;
  }) => {
    return (
      <PropertyWrapper>
        <PropertyIcon onClick={() => toggleComputed(id, property)} />
        {property.name}
      </PropertyWrapper>
    );
  }
);
