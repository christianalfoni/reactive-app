import { observer } from "mobx-react";
import * as React from "react";
import { FiBox } from "react-icons/fi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Property } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const EditCurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ObservableWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const ObservableIcon = styled(FiBox)`
  margin-right: ${space[2]};

  color: ${colors.orange[500]};
`;

export const Observable = observer(
  ({
    id,
    property,
    instance,
  }: {
    id: string;
    property: Property;
    instance: ClassInstance | null;
  }) => {
    return (
      <ObservableWrapper>
        <ObservableIcon />
        {property.name}
        <div>
          <EditCurrentValueContainer>
            {instance && property.name in instance.values ? (
              <ValueInspector
                small
                value={instance.values[property.name]}
                delimiter="."
                expanded={true}
              />
            ) : null}
          </EditCurrentValueContainer>
        </div>
      </ObservableWrapper>
    );
  }
);
