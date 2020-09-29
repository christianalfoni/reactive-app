import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { IConfig, INode } from "../..";
import { useBackend } from "../../../backend";

export interface INodeInnerDefaultProps {
  className?: string;
  config: IConfig;
  node: INode;
}

const Outer = styled.div`
  padding: 40px 30px;
`;

export const NodeInnerDefault = observer(
  ({ node, className }: INodeInnerDefaultProps) => {
    const backend = useBackend();
    const [name, setName] = React.useState(node.properties.name);

    return (
      <Outer className={className}>
        {node.properties.isEditing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              backend.actions.onNameChange(node, name);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </form>
        ) : (
          node.properties.name
        )}
      </Outer>
    );
  }
);
