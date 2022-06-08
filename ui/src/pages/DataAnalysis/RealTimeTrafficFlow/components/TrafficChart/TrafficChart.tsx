import TrafficStyles from "@/pages/DataAnalysis/RealTimeTrafficFlow/index.less";
import {
  FlowChartWithState,
  IPortDefaultProps,
  INodeInnerDefaultProps,
  IChart,
} from "@mrblenny/react-flow-chart";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";

const TrafficChart = () => {
  const { realTimeTraffic } = useModel("dataAnalysis");
  const { trafficChart } = realTimeTraffic;

  // const aaa = useMemo(() => {
  //   console.log("trafficChart: ", trafficChart);
  //   if (trafficChart.length <= 0) return;
  //   // 末尾的节点
  //   const lastNodes = trafficChart.filter((item) => item.deps.length === 0);
  //   console.log("lastNodes: ", lastNodes);
  //   return [];
  // }, [trafficChart]);

  const PortCustom = (props: IPortDefaultProps) => (
    <div
      style={{
        width: 24,
        height: 24,
        backgroundColor: "cornflowerblue",
        borderRadius: 50,
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {props.port.type === "input" && (
        <svg style={{ width: "24px", height: "24px" }} viewBox="0 0 24 24">
          <path
            fill="white"
            d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"
          />
        </svg>
      )}
    </div>
  );

  const chartSimple = {
    offset: {
      x: 0,
      y: 0,
    },
    nodes: {
      node1: {
        id: "node1",
        type: "sql",
        position: {
          x: 300,
          y: 100,
        },
        ports: {
          port1: {
            id: "port1",
            type: "output",
          },
        },
      },
      node2: {
        id: "node2",
        type: "kafka",
        position: {
          x: 600,
          y: 300,
        },
        ports: {
          port1: {
            id: "port1",
            type: "input",
          },
        },
      },
      node4: {
        id: "node4",
        type: "content2",
        position: {
          x: 800,
          y: 300,
        },
        ports: {
          port1: {
            id: "port1",
            type: "input",
          },
          port2: {
            id: "port2",
            type: "output",
          },
        },
      },
      node3: {
        id: "node3",
        type: "content",
        position: {
          x: 300,
          y: 300,
        },
        ports: {
          port1: {
            id: "port1",
            type: "input",
          },
          port2: {
            id: "port2",
            type: "output",
          },
        },
      },
    },
    links: {
      link1: {
        id: "link1",
        from: {
          nodeId: "node1",
          portId: "port1",
        },
        to: {
          nodeId: "node3",
          portId: "port1",
        },
      },
      link3: {
        id: "link3",
        from: {
          nodeId: "node1",
          portId: "port1",
        },
        to: {
          nodeId: "node4",
          portId: "port1",
        },
      },
      link4: {
        id: "link4",
        from: {
          nodeId: "node4",
          portId: "port1",
        },
        to: {
          nodeId: "node2",
          portId: "port1",
        },
      },
      link2: {
        id: "link1",
        from: {
          nodeId: "node3",
          portId: "port2",
        },
        to: {
          nodeId: "node2",
          portId: "port1",
        },
      },
    },
    selected: {},
    hovered: {},
  };

  const NodeInnerCustom = ({ node }: INodeInnerDefaultProps) => {
    return (
      <div
        style={{
          padding: 30,
        }}
      >
        {node.type}
      </div>
    );
  };
  return (
    <div className={TrafficStyles.trafficEChart}>
      <FlowChartWithState
        initialValue={chartSimple as unknown as IChart}
        Components={{
          Port: PortCustom,
          NodeInner: NodeInnerCustom,
        }}
      />
    </div>
  );
};

export default TrafficChart;
