import { observer } from "mobx-react";
import * as React from "react";
import { BiCurrentLocation } from "react-icons/bi";
import styled from "styled-components";

import { colors, space } from "../../../../common/design-tokens";
import { ClassInstance, Property } from "../../../../common/types";
import ValueInspector from "../../ValueInspector";

const EditCurrentValueContainer = styled.div`
  display: flex;
  margin: 5px;
`;

const StateWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${space[2]};
`;

const CurrentStateIcon = styled(BiCurrentLocation)`
  margin-right: ${space[2]};
  color: ${colors.blue[400]};
`;

export const State = observer(
  ({ instance }: { instance: ClassInstance | null }) => {
    const state = instance && instance.values._state;

    return (
      <StateWrapper>
        <CurrentStateIcon />
        {state && state.state}
        <div>
          <EditCurrentValueContainer>
            {state ? (
              <ValueInspector small value={state} delimiter="." />
            ) : null}
          </EditCurrentValueContainer>
        </div>
      </StateWrapper>
    );
  }
);
