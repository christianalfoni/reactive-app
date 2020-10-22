import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { colors, getVariableValue, space } from "../../../design-tokens";
import { useBackend } from "../../backend";
import { ClassItem } from "./ClassItem";
import { CurrentClass } from "./CurrentClass";

const Sidebar = styled.div`
  width: 300px;
  background: ${colors.sideBar.background};
  color: ${colors.sideBar.foreground};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-left: 1px solid ${colors.sideBarSectionHeader.border};
  > h3 {
    color: ${colors.sideBarSectionHeader.foreground};
    background: ${colors.sideBarSectionHeader.background};
    padding: ${space[4]};
  }
`;

const NoClass = styled.div`
  padding: ${space[4]};
  text-align: center;
  color: ${colors.input.placeholderForeground};
`;

export const SideBar = observer(() => {
  const backend = useBackend();

  return (
    <Sidebar>
      <h3>Classes</h3>
      <ClassItem
        type="Class"
        ports={{
          input: {
            id: "input",
            type: "top",
            properties: {
              linkColor: getVariableValue("activityBar-activeBorder"),
            },
          },
          output: {
            id: "output",
            type: "bottom",
            properties: {
              linkColor: getVariableValue("activityBar-activeBorder"),
            },
          },
        }}
        properties={{
          name: "",
          isEditing: true,
          currentInstanceId: null,
          injectors: [],
          observables: [],
          computed: [],
          actions: [],
          instances: {},
        }}
      />
      <h3>Class inspector</h3>
      {backend.chart.selected && backend.chart.selected.id ? (
        <CurrentClass id={backend.chart.selected.id!} />
      ) : (
        <NoClass>No class selected</NoClass>
      )}
    </Sidebar>
  );
});
