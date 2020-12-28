import { observer } from "mobx-react";
import * as React from "react";
import { HiOutlineEye } from "react-icons/hi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import {
  ClassInstance,
  Property
} from "../../../../common/types";
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

const ObservableIcon = styled(HiOutlineEye)`
  margin-right: ${space[2]};
  color: ${colors.gray[600]};
`;

export const Observable = observer(
  ({
    property,
    instance,
  }: {
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
              />
            ) : null}
          </EditCurrentValueContainer>
        </div>
      </ObservableWrapper>
    );
  }
);
