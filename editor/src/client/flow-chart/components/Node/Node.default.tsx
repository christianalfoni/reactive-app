import styled, { css } from "styled-components";
import { IConfig, INode } from "../..";
import { colors } from "../../../../common/design-tokens";

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
  background: ${colors.gray[800]};
  border-radius: 4px;
  color: ${colors.gray[200]};
  border: 1px solid ${colors.gray[700]};
  min-width: 200px;
  ${(props) =>
    props.isSelected &&
    css`
      border: 1px solid ${colors.purple[500]};
    `}
` as any;
