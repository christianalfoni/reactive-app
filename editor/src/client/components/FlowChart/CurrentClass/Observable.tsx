import { observer } from "mobx-react";
import * as React from "react";
import { HiOutlineEye } from "react-icons/hi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import {
  ClassInstance,
  Observable as TObservable,
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
    observable,
    instance,
  }: {
    observable: TObservable;
    instance: ClassInstance | null;
  }) => {
    return (
      <ObservableWrapper>
        <ObservableIcon />
        {observable.name}
        <div>
          <EditCurrentValueContainer>
            {instance && observable.name in instance.values ? (
              <ValueInspector
                small
                value={instance.values[observable.name]}
                delimiter="."
              />
            ) : null}
          </EditCurrentValueContainer>
        </div>
      </ObservableWrapper>
    );
  }
);
