import * as React from "react";
import styled from "styled-components";
import { IConfig, IPort } from "../..";
import { colors } from "../../../../common/design-tokens";

export interface IPortDefaultProps {
  className?: string;
  config: IConfig;
  port: IPort;
  isSelected: boolean;
  isHovered: boolean;
  isLinkSelected: boolean;
  isLinkHovered: boolean;
}

const PortDefaultOuter = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${colors.gray[700]};
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover > div {
    background: ${colors.gray[500]};
  }
`;

const PortDefaultInner = styled.div<{ active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) =>
    props.active ? colors.purple[400] : colors.gray[800]};
  cursor: pointer;
`;

export const PortDefault = ({
  isLinkSelected,
  isLinkHovered,
  config,
  className,
}: IPortDefaultProps) => (
  <PortDefaultOuter className={className}>
    <PortDefaultInner
      active={!config.readonly && (isLinkSelected || isLinkHovered)}
    />
  </PortDefaultOuter>
);
