import { Injector, Observable } from "../../../types";
import { IPosition, ISize } from "./generics";

export type IChart<ChartProps = undefined, LinkProps = undefined> = {
  offset: IPosition;
  nodes: {
    [id: string]: INode;
  };
  links: {
    [id: string]: ILink<LinkProps>;
  };
  scale: number;
  /** System Temp */
  selected: ISelectedOrHovered;
  hovered: ISelectedOrHovered;
} & (ChartProps extends undefined
  ? {
      properties?: any;
    }
  : {
      properties: ChartProps;
    });

export interface ISelectedOrHovered {
  type?: "link" | "node" | "port";
  id?: string;
}

export type INode = {
  id: string;
  type: string;
  position: IPosition;
  orientation?: number;
  readonly?: boolean;
  ports: {
    [id: string]: IPort;
  };
  /** System Temp */
  size?: ISize;
  properties: {
    name: string;
    isEditing: boolean;
    currentInstanceId: string | null;
    injectors: Injector[];
    observables: Observable[];
    instances: {
      [id: string]: {
        values: {
          [key: string]: any;
        };
        injections: {
          [key: string]: string;
        };
      };
    };
  };
};

export type IPort<PortProps = undefined> = {
  id: string;
  type: string;
  value?: string;
  /** System Temp */
  position?: IPosition;
} & (PortProps extends undefined
  ? {
      properties?: any;
    }
  : {
      properties: PortProps;
    });

export type ILink<LinkProps = undefined> = {
  id: string;
  from: {
    nodeId: string;
    portId: string;
  };
  to: {
    nodeId?: string;
    portId?: string;
    /** System Temp */
    position?: IPosition;
  };
} & (LinkProps extends undefined
  ? {
      properties?: any;
    }
  : {
      properties: LinkProps;
    });
