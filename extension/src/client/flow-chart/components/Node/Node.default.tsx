import styled, { css } from "styled-components";
import { IConfig, INode } from "../..";
import { colors } from "../../../../design-tokens";

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
  background: ${colors.activityBar.background};
  border-radius: 4px;
  color: ${colors.activityBar.foreground};
  border: 1px solid ${colors.activityBar.border};
  min-width: 200px;
  border: 1px solid transparent;
  ${(props) =>
    props.isSelected &&
    css`
      border: 1px solid ${colors.activityBar.activeBorder};
    `}
` as any;
