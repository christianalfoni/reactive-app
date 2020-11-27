import * as React from "react";
import styled from "styled-components";
import { colors, space } from "../../../common/design-tokens";
import { REACT_FLOW_CHART, INode, FlowChart } from "../../flow-chart";

interface ISidebarItemProps {
  type: string;
  ports: INode["ports"];
  properties?: any;
}

const Outer = styled.div`
  padding: 20px 30px;
  margin: ${space[4]} auto;
  border-radius: 4px;
  width: 200px;
  text-align: center;
  background-color: ${colors.orange[700]};
  border: 1px dashed ${colors.orange[500]};
  color: ${colors.gray[200]};
  font-size: 18px;
  font-weight: bold;
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
