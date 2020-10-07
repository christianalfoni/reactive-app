import { observable } from "mobx";
import * as React from "react";
import { DebugAdapterNamedPipeServer } from "vscode";
import { Backend, Injector, BackendMessage, ClientMessage } from "../../types";
import { IChart, INode } from "../flow-chart";
import * as actions from "../flow-chart/container/actions";

// @ts-ignore
const vscode = acquireVsCodeApi();

export type ClientBackend = {
  chart: IChart;
  chartActions: typeof actions;
  state: {
    currentClass: string | null;
  };
  actions: {
    onNameChange(node: INode, newName: string): void;
    onShowClass(node: INode): void;
    onToggleInjectorType(node: INode, index: number): void;
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

const send = (message: ClientMessage) => vscode.postMessage(message);

const chartEvents: { [key: string]: (...args: any[]) => void } = {
  onDragNodeStop: ((data) => {
    send({
      type: "class-update",
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
      data.fromPortId === "output" ? data.fromNodeId : data.toNodeId;
    const toId = data.fromPortId === "output" ? data.toNodeId : data.fromNodeId;

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
  state: observable({
    currentClass: null,
  }),
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
                x: node.position.x,
                y: node.position.y,
              },
            }
      );
    },
    onShowClass(node) {
      backend.state.currentClass = node.id;
    },
    onToggleInjectorType(node, index) {
      const injector = node.properties.injectors[index];

      send({
        type: "inject-replace",
        data: {
          name: node.properties.name,
          injectorName: injector.name,
          injectorType: injector.type === "inject" ? "injectFactory" : "inject",
        },
      });
    },
  },
});

window.addEventListener("message", (event) => {
  const message: BackendMessage = event.data;
  switch (message.type) {
    case "init": {
      Object.assign(backend, message.data);
      break;
    }
    case "class-update": {
      message.data.injectors.forEach((injector) => {
        const id = `${injector.class}_${injector.name}`;
        if (!chart.links[id]) {
          chart.links[id] = {
            id,
            from: {
              portId: "output",
              nodeId: Object.keys(chart.nodes).find(
                (nodeId) =>
                  chart.nodes[nodeId].properties.name === message.data.name
              )!,
            },
            to: {
              portId: "input",
              nodeId: message.data.id,
            },
          };
        }
      });
      chart.nodes[message.data.id].position.x = message.data.x;
      chart.nodes[message.data.id].position.y = message.data.y;
      chart.nodes[message.data.id].properties.injectors =
        message.data.injectors;
      chart.nodes[message.data.id].properties.observables =
        message.data.observables;
      break;
    }
    case "classes": {
      chart.nodes = Object.keys(message.data).reduce<any>((aggr, key) => {
        const { id, x, y, injectors, observables } = message.data[key];
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
            injectors,
            observables,
            instances: observable({}),
            currentInstanceId: null,
          },
        });

        return aggr;
      }, {});
      chart.links = observable(
        Object.keys(message.data).reduce<any>((aggr, key) => {
          const { id } = message.data[key];

          Object.assign(
            aggr,
            message.data[key].injectors.reduce<any>((aggr, injector) => {
              const linkId = `${injector.class}_${injector.name}`;
              aggr[linkId] = {
                id: linkId,
                from: {
                  nodeId: message.data[injector.class].id,
                  portId: "output",
                },
                to: {
                  nodeId: id,
                  portId: "input",
                },
              };

              return aggr;
            }, {})
          );

          return aggr;
        }, {})
      );
      break;
    }
    case "app": {
      const appMessage = message.data;
      switch (appMessage.type) {
        case "instance": {
          const instances =
            chart.nodes[appMessage.data.nodeId].properties.instances;

          if (!instances[appMessage.data.id]) {
            instances[appMessage.data.id] = observable({
              values: {},
              injections: {},
            });
          }

          break;
        }
        case "update": {
          console.log("UPDATE", JSON.stringify(appMessage.data, null, 2));
          const instances =
            chart.nodes[appMessage.data.nodeId].properties.instances;
          const targetKey = appMessage.data.path.pop()!;

          if (instances[appMessage.data.id]) {
            const targetBase = appMessage.data.path.reduce(
              (aggr, key) => aggr[key],
              instances[appMessage.data.id].values
            );

            targetBase[targetKey] = appMessage.data.value;
          } else {
            instances[appMessage.data.id] = observable({
              values: {
                [targetKey]: appMessage.data.value,
              },
              injections: {},
            });
          }

          break;
        }
        case "splice": {
          break;
        }
      }
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
