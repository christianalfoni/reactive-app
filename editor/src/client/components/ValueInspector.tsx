import * as React from "react";
import { FunctionComponent, useState } from "react";
import { useBackend } from "../backend";

import Inspector from "./Inspector";

type Props = {
  value: any;
  small?: boolean;
  delimiter: string;
};

const ValueInspector: FunctionComponent<Props> = ({
  value,
  small,
  delimiter,
}) => {
  const backend = useBackend();
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

  function onToggleExpand(path: string[]) {
    const pathString = path.join(delimiter);

    if (expandedPaths.includes(pathString)) {
      setExpandedPaths(
        expandedPaths.filter((currentPath) => currentPath !== pathString)
      );
    } else {
      setExpandedPaths(expandedPaths.concat(pathString));
    }
  }

  return (
    <Inspector
      delimiter={delimiter}
      getClassValue={(classId, instanceId) =>
        backend.chart.nodes[classId].properties.instances[instanceId].values
      }
      selectClassInstance={(classId, instanceId) => {
        backend.actions.onInstanceClick(classId, instanceId);
      }}
      value={value}
      expandedPaths={expandedPaths}
      onToggleExpand={onToggleExpand}
      small={small}
    />
  );
};

export default ValueInspector;
