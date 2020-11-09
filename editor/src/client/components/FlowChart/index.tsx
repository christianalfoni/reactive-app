import { observer } from "mobx-react";
import * as React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { useBackend } from "../../backend";
import { FlowChart } from "../../flow-chart";
import { SideBar } from "./SideBar";

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0px;
    max-width: 100vw;
    max-height: 100vh;
    overflow: hidden;
    box-sizing: border-box;
    font-family: sans-serif;
    padding: 0;
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
      <SideBar />
    </Page>
  );
});
