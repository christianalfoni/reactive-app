import { observable } from "mobx";
import * as React from "react";
import { Backend, ClientMessage, Injector, Mixin } from "../../common/types";
import { IChart, INode } from "../flow-chart";
import * as actions from "../flow-chart/container/actions";
import { createOnMessage } from "./onMessage";

export type ClientBackend = {
  chart: IChart;
  chartActions: typeof actions;
  actions: {
    onInstanceClick(classId: string, instanceId: number): void;
    onClassSubmit(node: INode, name: string): void;
    onToggleInjectorType(node: INode, injector: Injector): void;
    onOpenClass(classId: string): void;
    onRunAction(instanceId: number, name: string): void;
    onToggleMixin(classId: string, mixin: Mixin): void;
    onDeleteClass(classId: string): void;
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
let ws: WebSocket;

function connectWebsocket() {
  ws = new WebSocket(`ws://localhost:${backendPort}?editor=1`);

  ws.onopen = () => {
    while (bufferMessages.length) {
      ws.send(JSON.stringify(bufferMessages.shift()));
    }

    isConnected = true;
  };

  ws.addEventListener("message", createOnMessage(chart, backend));
}

const send = (message: ClientMessage) => {
  if (!isConnected) {
    bufferMessages.push(message);
    return;
  }

  if (ws.readyState !== ws.OPEN) {
    isConnected = false;
    bufferMessages.push(message);
    connectWebsocket();
    return;
  }

  ws.send(JSON.stringify(message));
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

    // We will create a new one
    delete chart.links[data.linkId];

    if (fromId === toId) {
      return;
    }

    send({
      type: "inject",
      data: {
        fromClassId: fromId,
        toClassId: toId,
      },
    });
  }) as typeof actions.onLinkComplete,
  onLinkClick: (({ linkId }) => {
    const link = chart.links[linkId];

    delete chart.links[linkId];

    send({
      type: "inject-remove",
      data: {
        fromClassId: link.from.nodeId,
        toClassId: link.to.nodeId!,
      },
    });
  }) as typeof actions.onLinkClick,
  onNodeClick: (({ nodeId }) => {
    const instanceKeys = Object.keys(chart.nodes[nodeId].properties.instances);
    if (
      instanceKeys.length &&
      !chart.nodes[nodeId].properties.currentInstanceId
    ) {
      chart.nodes[nodeId].properties.currentInstanceId = Number(
        instanceKeys[0]
      );
    }
  }) as typeof actions.onNodeClick,
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
    onClassSubmit(node, name) {
      delete chart.nodes[node.id];
      node.id = name;
      node.properties.name = name;
      node.properties.isEditing = false;

      chart.nodes[name] = node;

      chart.selected = { id: name };

      send({
        type: "class-new",
        data: {
          classId: node.id,
          x: node.position.x,
          y: node.position.y,
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
    onRunAction(instanceId: number, name: string) {
      send({
        type: "run-action",
        data: {
          instanceId,
          name,
        },
      });
    },
    onToggleMixin(classId: string, mixin: Mixin) {
      send({
        type: "toggle-mixin",
        data: {
          classId,
          mixin,
        },
      });
    },
    onDeleteClass(classId: string) {
      send({
        type: "class-delete",
        data: {
          classId,
        },
      });
    },
  },
});

connectWebsocket();

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
