import { observable, observe } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { useBackend } from "../backend";
import {
  FlowChartWithState,
  IChart,
  REACT_FLOW_CHART,
  INode,
  FlowChart,
} from "../flow-chart";

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0px;
    max-width: 100vw;
    max-height: 100vh;
    overflow: hidden;
    box-sizing: border-box;
    font-family: sans-serif;
    color: black;
  }

  *, :after, :before {
    box-sizing: inherit;
  }
`;

const PageContent = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  max-width: 100vw;
  max-height: 100vh;
`;

const Outer = styled.div`
  padding: 20px 30px;
  font-size: 14px;
  background: white;
  cursor: move;
`;

interface ISidebarItemProps {
  type: string;
  ports: INode["ports"];
  properties?: any;
}

const SidebarItem = ({ type, ports, properties }: ISidebarItemProps) => {
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

const Sidebar = styled.div`
  width: 300px;
  background: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
`;

const Page = ({ children }: { children: any }) => (
  <PageContent>
    {children}
    <GlobalStyle />
  </PageContent>
);

const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

export const DragAndDropSidebar = observer(() => {
  const backend = useBackend();

  if (backend.status === "no-project") {
    return <h1>No project opened</h1>;
  }

  if (backend.status === "missing-dependencies") {
    return <h1>Missing deps...</h1>;
  }

  return (
    <Page>
      <Content>
        <FlowChart chart={backend.chart} callbacks={backend.chartActions} />
      </Content>
      <Sidebar>
        <SidebarItem
          type="Class"
          ports={{
            input: {
              id: "input",
              type: "top",
              properties: {},
            },
            output: {
              id: "output",
              type: "bottom",
              properties: {},
            },
          }}
          properties={{
            name: "",
            isEditing: true,
          }}
        />
      </Sidebar>
    </Page>
  );
});
