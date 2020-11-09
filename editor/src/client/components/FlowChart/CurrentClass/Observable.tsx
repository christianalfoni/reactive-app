import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { HiOutlineEye } from "react-icons/hi";
import ValueInspector from "../../ValueInspector";
import {
  ClassInstance,
  Observable as TObservable,
} from "../../../../common/types";
import { colors, space } from "../../../../common/design-tokens";

const EditCurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const ObservableWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ObservableIcon = styled(HiOutlineEye)`
  margin-right: ${space[2]};
  color: ${colors.foreground3};
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
        <strong>{observable.name}</strong>
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
