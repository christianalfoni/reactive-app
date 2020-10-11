import * as React from "react";
import styled from "styled-components";
import { colors, space } from "../../../design-tokens";
import { REACT_FLOW_CHART, INode, FlowChart } from "../../flow-chart";

interface ISidebarItemProps {
  type: string;
  ports: INode["ports"];
  properties?: any;
}

const Outer = styled.div`
  padding: 20px 30px;
  margin: ${space[4]};
  border-radius: 4px;
  background-color: ${colors.badge.background};
  color: ${colors.badge.foreground};
  font-size: 14px;
  cursor: move;
`;

export const ClassItem = ({ type, ports, properties }: ISidebarItemProps) => {
  return (
    <Outer
      draggable={true}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          REACT_FLOW_CHART,
          JSON.stringify({ type, ports, properties })
        );
      }}
    >
      {type}
    </Outer>
  );
};