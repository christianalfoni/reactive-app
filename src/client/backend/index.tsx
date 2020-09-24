import { observable } from "mobx";
import * as React from "react";
import { DebugAdapterNamedPipeServer } from "vscode";
import { Backend } from "../../types";
import { IChart, INode } from "../flow-chart";
import * as actions from "../flow-chart/container/actions";

// @ts-ignore
const vscode = acquireVsCodeApi();

export type IncomingMessage =
  | {
      type: "init";
      data: {
        classes: {
          [id: string]: {
            name: string;
            x: number;
            y: number;
          };
        };
      };
    }
  | {
      type: "classes";
      data: {
        classes: {
          [name: string]: {
            name: string;
          };
        };
        metadata: {
          [name: string]: {
            id: string;
            x: number;
            y: number;
          };
        };
      };
    }
  | {
      type: "metadata";
      data: {
        name: string;
        id: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "class-new";
      data: {
        id: string;
        name: string;
        x: number;
        y: number;
      };
    }
  | {
      type: "class-update";
      data: {
        id: string;
        name: string;
      };
    }
  | {
      type: "inject";
      data: {
        fromName: string;
        toName: string;
      };
    };

export type ClientBackend = {
  chart: IChart;
  chartActions: typeof actions;
  actions: {
    onNameChange(node: INode, newName: string): void;
  };
  send: (message: any) => void;
} & Backend;

export const chart: IChart = observable({
  offset: {
    x: 0,
    y: 0,
  },
  scale: 1,
  nodes: {},
  links: {},
  selected: {},
  hovered: {},
});

const send = (message: IncomingMessage) => vscode.postMessage(message);

const chartEvents: { [key: string]: (...args: any[]) => void } = {
  onDragNodeStop: ((data) => {
    send({
      type: "metadata",
      data: {
        name: chart.nodes[data.id].properties.name,
        id: data.id,
        x: data.data.lastX,
        y: data.data.lastY,
      },
    });
  }) as typeof actions.onDragNodeStop,
  onLinkComplete: ((data) => {
    const fromId =
      data.fromNodeId === "output" ? data.fromNodeId : data.toNodeId;
    const toId = data.fromNodeId === "output" ? data.toNodeId : data.fromNodeId;

    send({
      type: "inject",
      data: {
        fromName: chart.nodes[fromId].properties.name,
        toName: chart.nodes[toId].properties.name,
      },
    });
  }) as typeof actions.onLinkComplete,
};

const backend = observable<ClientBackend>({
  status: "pending",
  chart,
  chartActions: Object.keys(actions).reduce<any>((aggr, key) => {
    aggr[key] = (...args: any[]) => {
      (actions as any)[key](...args)(chart);

      if (chartEvents[key]) {
        chartEvents[key](...args);
      }
    };

    return aggr;
  }, {}),
  send,
  actions: {
    onNameChange(node, newName) {
      const isNewClass = !node.properties.name;

      node.properties.name = newName;
      node.properties.isEditing = false;

      send(
        isNewClass
          ? {
              type: "class-new",
              data: {
                id: node.id,
                name: newName,
                x: node.position.x,
                y: node.position.y,
              },
            }
          : {
              type: "class-update",
              data: {
                id: node.id,
                name: newName,
              },
            }
      );
    },
  },
});

window.addEventListener("message", (event) => {
  const message: IncomingMessage = event.data;
  switch (message.type) {
    case "init": {
      Object.assign(backend, message.data);
      break;
    }
    case "classes": {
      chart.nodes = Object.keys(message.data.classes).reduce<any>(
        (aggr, key) => {
          console.log("Looking at data ane kye", key);
          const { id, x, y } = message.data.metadata[key];
          aggr[id] = observable({
            id,
            type: "Class",
            ports: {
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
            },
            position: {
              x,
              y,
            },
            properties: {
              isEditing: false,
              name: key,
            },
          });

          return aggr;
        },
        {}
      );
      break;
    }
  }
});

const backendContext = React.createContext<ClientBackend>(null as any);

export const BackendProvider: React.FC = ({ children }) => {
  React.useEffect(() => {
    vscode.postMessage({
      type: "init",
    });
  }, []);
  return (
    <backendContext.Provider value={backend}>
      {children}
    </backendContext.Provider>
  );
};

export const useBackend = () => React.useContext(backendContext);
