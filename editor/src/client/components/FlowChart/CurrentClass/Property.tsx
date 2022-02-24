import { observer } from "mobx-react";
import * as React from "react";
import { FiBox } from "react-icons/fi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { Property as TProperty } from "../../../../common/types";
import { useBackend } from "../../../backend";

const PropertyWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const PropertyIcon = styled(FiBox)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

export const Property = observer(
  ({ property, id }: { property: TProperty; id: string }) => {
    return (
      <PropertyWrapper>
        <PropertyIcon />
        {property.name}
      </PropertyWrapper>
    );
  }
);
