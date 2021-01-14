import * as React from "react";

import { colors } from "../../../../../common/design-tokens";
import {
  IConfig,
  ILink,
  IOnLinkClick,
  IOnLinkMouseEnter,
  IOnLinkMouseLeave,
  IPosition,
} from "../../..";

export interface IRegularLinkProps {
  className?: string;
  points: string;
  linkColor: string;
  config: IConfig;
  link: ILink;
  startPos: IPosition;
  endPos: IPosition;
  onLinkMouseEnter: IOnLinkMouseEnter;
  onLinkMouseLeave: IOnLinkMouseLeave;
  onLinkClick: IOnLinkClick;
  isHovered: boolean;
  isSelected: boolean;
}

export const RegularLink = ({
  className,
  points,
  linkColor,
  config,
  link,
  startPos,
  endPos,
  onLinkMouseEnter,
  onLinkMouseLeave,
  onLinkClick,
  isHovered,
  isSelected,
}: IRegularLinkProps) => {
  const color = isHovered ? colors.purple[500] : linkColor;
  return (
    <svg
      style={{
        overflow: "visible",
        position: "absolute",
        cursor: "pointer",
        left: 0,
        right: 0,
      }}
      className={className}
    >
      <circle r="4" cx={startPos.x} cy={startPos.y} fill={color} />
      {/* Main line */}
      <path d={points} stroke={color} strokeWidth="3" fill="none" />
      {/* Thick line to make selection easier */}
      <path
        d={points}
        stroke={color}
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
        strokeOpacity={isHovered || isSelected ? 0.1 : 0}
        onMouseEnter={() => onLinkMouseEnter({ config, linkId: link.id })}
        onMouseLeave={() => onLinkMouseLeave({ config, linkId: link.id })}
        onClick={(e) => {
          onLinkClick({ config, linkId: link.id });
          e.stopPropagation();
        }}
      />
      <circle r="4" cx={endPos.x} cy={endPos.y} fill={color} />
    </svg>
  );
};
