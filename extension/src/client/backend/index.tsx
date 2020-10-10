import { observable } from "mobx";
import * as React from "react";
import { Backend, BackendMessage, ClientMessage } from "../../types";
import { IChart, INode } from "../flow-chart";
import * as actions from "../flow-chart/container/actions";

// @ts-ignore
const vscode = acquireVsCodeApi();

export type ClientBackend = {
  chart: IChart;
  chartActions: typeof actions;
  actions: {
    onInstanceClick(classId: string, instanceId: number): void;
    onNameSubmit(node: INode, newName: string): void;
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
        classId: data.id,
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
        fromClassId: fromId,
        toClassId: toId,
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
    onNameSubmit(node, newName) {
      delete chart.nodes[node.id];
      node.id = newName;
      node.properties.name = newName;
      node.properties.isEditing = false;

      chart.nodes[newName] = node;

      send({
        type: "class-new",
        data: {
          classId: node.id,
          x: node.position.x,
          y: node.position.y,
        },
      });
    },
    onToggleInjectorType(node, index) {
      const injector = node.properties.injectors[index];

      send({
        type: "inject-replace",
        data: {
          classId: node.id,
          injectClassId: injector.classId,
          propertyName: injector.propertyName,
          injectorType: injector.type === "inject" ? "injectFactory" : "inject",
        },
      });
    },
    onInstanceClick(classId: string, instanceId: number) {
      chart.nodes[classId].properties.currentInstanceId = instanceId;
      chart.selected = {
        type: "node",
        id: classId,
      };
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
        const id = `${injector.classId}_${injector.propertyName}`;
        if (!chart.links[id]) {
          chart.links[id] = {
            id,
            from: {
              portId: "output",
              nodeId: injector.classId,
            },
            to: {
              portId: "input",
              nodeId: message.data.classId,
            },
          };
        }
      });
      chart.nodes[message.data.classId].position.x = message.data.x;
      chart.nodes[message.data.classId].position.y = message.data.y;
      chart.nodes[message.data.classId].properties.injectors =
        message.data.injectors;
      chart.nodes[message.data.classId].properties.observables =
        message.data.observables;
      break;
    }
    case "classes": {
      chart.nodes = Object.keys(message.data).reduce<any>((aggr, key) => {
        const { classId, x, y, injectors, observables } = message.data[key];
        aggr[classId] = observable({
          id: classId,
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
          const { classId } = message.data[key];

          Object.assign(
            aggr,
            message.data[key].injectors.reduce<any>((aggr, injector) => {
              const linkId = `${injector.classId}_${injector.propertyName}`;
              aggr[linkId] = {
                id: linkId,
                from: {
                  nodeId: injector.classId,
                  portId: "output",
                },
                to: {
                  nodeId: classId,
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
            chart.nodes[appMessage.data.classId].properties.instances;

          if (!instances[appMessage.data.instanceId]) {
            instances[appMessage.data.instanceId] = observable({
              values: observable({}),
              injections: observable({}),
            });
          }

          break;
        }
        case "injection": {
          const data = appMessage.data;
          const instances = chart.nodes[data.classId].properties.instances;

          if (!instances[appMessage.data.instanceId]) {
            instances[appMessage.data.instanceId] = observable({
              values: observable({}),
              injections: observable({}),
            });
          }

          const instance =
            chart.nodes[data.classId].properties.instances[data.instanceId];

          if (!instance.injections[data.propertyName]) {
            instance.injections[data.propertyName] = observable([]);
          }

          instance.injections[data.propertyName].push(data.injectInstanceId);

          console.log("ADDED INJECTION!");

          break;
        }
        case "update": {
          const instances =
            chart.nodes[appMessage.data.classId].properties.instances;
          const targetKey = appMessage.data.path.pop()!;

          if (instances[appMessage.data.instanceId]) {
            const targetBase = appMessage.data.path.reduce(
              (aggr, key) => aggr[key],
              instances[appMessage.data.instanceId].values
            );

            targetBase[targetKey] = appMessage.data.value;
          } else {
            instances[appMessage.data.instanceId] = observable({
              values: observable({
                [targetKey]: appMessage.data.value,
              }),
              injections: observable({}),
            });
          }

          if (Object.keys(instances).length === 1) {
            chart.nodes[appMessage.data.classId].properties.currentInstanceId =
              appMessage.data.instanceId;
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
