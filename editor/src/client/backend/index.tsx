import { observable, reaction } from "mobx";
import * as React from "react";
import { getVariableValue } from "../../common/design-tokens";
import {
  Backend,
  BackendMessage,
  ClientMessage,
  Injector,
  Mixin,
} from "../../common/types";
import { IChart, INode } from "../flow-chart";
import * as actions from "../flow-chart/container/actions";

export type ClientBackend = {
  chart: IChart;
  chartActions: typeof actions;
  actions: {
    onInstanceClick(classId: string, instanceId: number): void;
    onClassSubmit(node: INode, name: string, mixins: Mixin[]): void;
    onToggleInjectorType(node: INode, injector: Injector): void;
    onOpenClass(classId: string): void;
  };
  send: (message: any) => void;
} & Backend;

export const chart: IChart = observable({
  preventResizing: false,
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

let isConnected = false;
const bufferMessages: ClientMessage[] = [];
const backendPort = location.search.split("?")[1].split("=")[1];
const ws = new WebSocket(`ws://localhost:${backendPort}?editor=1`);
const send = (message: ClientMessage) => {
  if (!isConnected) {
    bufferMessages.push(message);
    return;
  }

  ws.send(JSON.stringify(message));
};

ws.onopen = () => {
  while (bufferMessages.length) {
    ws.send(JSON.stringify(bufferMessages.shift()));
  }

  isConnected = true;
};

const chartEvents: { [key: string]: (...args: any[]) => void } = {
  onDragNodeStop: ((data) => {
    if (chart.nodes[data.id].properties.isEditing) {
      return;
    }

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
    onClassSubmit(node, name, mixins) {
      delete chart.nodes[node.id];
      node.id = name;
      node.properties.name = name;
      node.properties.isEditing = false;
      node.properties.mixins = mixins;

      chart.nodes[name] = node;

      chart.selected = { id: name };

      send({
        type: "class-new",
        data: {
          classId: node.id,
          x: node.position.x,
          y: node.position.y,
          mixins,
        },
      });
    },
    onToggleInjectorType(node, injector) {
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
    onOpenClass(classId: string) {
      send({
        type: "class-open",
        data: {
          classId,
        },
      });
    },
  },
});

ws.addEventListener("message", (event) => {
  const message: BackendMessage = JSON.parse(event.data);
  console.log(message);
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
        const {
          classId,
          x,
          y,
          injectors,
          observables,
          computed,
          actions,
          mixins,
        } = message.data[key];
        aggr[classId] = observable({
          id: classId,
          type: "Class",
          ports: {
            input: {
              id: "input",
              type: "top",
              properties: {
                linkColor: getVariableValue("activityBar-activeBorder"),
              },
            },
            output: {
              id: "output",
              type: "bottom",
              properties: {
                linkColor: getVariableValue("activityBar-activeBorder"),
              },
            },
          },
          position: {
            x,
            y,
          },
          properties: {
            isEditing: false,
            mixins,
            name: key,
            injectors,
            observables,
            computed,
            actions,
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
              const linkId = `${classId}_${injector.classId}_${injector.propertyName}`;
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
          const instances =
            chart.nodes[appMessage.data.classId].properties.instances;
          const targetKey = appMessage.data.path.pop()!;

          if (instances[appMessage.data.instanceId]) {
            const targetBase = appMessage.data.path.reduce(
              (aggr, key) => aggr[key],
              instances[appMessage.data.instanceId].values
            );

            if (targetBase[targetKey]) {
              targetBase[targetKey].splice(
                appMessage.data.index,
                appMessage.data.deleteCount,
                ...appMessage.data.items
              );
            } else {
              targetBase[targetKey] = appMessage.data.items;
            }
          } else {
            instances[appMessage.data.instanceId] = observable({
              values: observable({
                [targetKey]: appMessage.data.items,
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
      }
      break;
    }
  }
});

const backendContext = React.createContext<ClientBackend>(null as any);

export const BackendProvider: React.FC = ({ children }) => {
  React.useEffect(() => {
    send({
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
