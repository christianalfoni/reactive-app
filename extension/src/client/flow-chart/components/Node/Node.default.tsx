import styled, { css } from "styled-components";
import { IConfig, INode } from "../..";

export interface INodeDefaultProps {
  className?: string;
  config: IConfig;
  node: INode;
  children: any;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  style?: Record<string, unknown>;
  ref?: React.Ref<any>;
}

export const NodeDefault = styled.div<INodeDefaultProps>`
  position: absolute;
  background: white;
  border-radius: 4px;
  color: black;
  min-width: 200px;
  border: 1px solid transparent;
  ${(props) =>
    props.isSelected &&
    css`
      border: 1px solid red;
    `}
` as any;
