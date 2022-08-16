import BusinessStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/index.less";
import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlowProvider,
} from "react-flow-renderer";

import { graphlib, layout } from "dagre";

import "./styles/index.less";
import { useModel } from "@@/plugin-model/useModel";
import NodeContent from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart/NodeContent";
import { BusinessEngineEnum } from "@/pages/DataAnalysis/service/enums";
import moment from "moment";
import { useIntl } from "umi";

const DefaultWidth = 240;
const DefaultHeight = 100;

let id = 0;
const getId = () => `dndNode_${id++}`;

const BusinessChart = (props: { utime: number }) => {
  const i18n = useIntl();
  const { utime } = props;
  const { realTimeTraffic } = useModel("dataAnalysis");
  const {
    businessChart,
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
  } = realTimeTraffic;

  const reactFlowWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const getNodesPosition = useCallback((nodes: any[], edges: any[]) => {
    // compound: 支持复合查询
    let g = new graphlib.Graph({ directed: true });
    g.setGraph({});
    g.setDefaultEdgeLabel(function () {
      return {};
    });
    for (const node of nodes) {
      g.setNode(node.id, { ...node.data, ...node.style });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }
    layout(g);
    const newNodes: any[] = [];
    for (const node of nodes) {
      const graphNode = g.node(node.id);
      node.position = {
        x: graphNode.x,
        y: graphNode.y,
      };
      newNodes.push(node);
    }
    return newNodes;
  }, []);

  useMemo(() => {
    if (businessChart.length <= 0) return;

    // Node
    const NodeList: any[] = [];
    const EdgeList: any[] = [];

    for (const business of businessChart) {
      const isLast = business.deps.length === 0 && businessChart.length > 1;

      const isNotHeader =
        businessChart.length === 1 ||
        businessChart
          .filter((item) => item.table !== business.table)
          .find((item) => item.deps.includes(business.table));

      const headerType = !isNotHeader ? "input" : "default";
      const type = isLast ? "output" : headerType;
      let background = "#fff";
      switch (business.engine) {
        case BusinessEngineEnum.Kafka:
          background = "#fec89a";
          break;
        case BusinessEngineEnum.MergeTree:
          background = "#ffbf69";
          break;
        case BusinessEngineEnum.Distributed:
          background = "#f9dcc4";
          break;
        default:
          break;
      }
      // / <NodeContent node={business} />

      NodeList.push({
        id: business.table,
        type,
        data: { business },
        style: {
          width: DefaultWidth,
          height: DefaultHeight,
          background: background,
        },
      });
      if (isLast) {
        EdgeList.push({
          id: business.table,
          source: business.table,
        });
      } else {
        business.deps.map((dep) => {
          EdgeList.push({
            id: `${business.table}-${dep}`,
            source: business.table,
            target: dep,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        });
      }
    }

    setNodes(() => getNodesPosition(NodeList, EdgeList));
    setEdges(EdgeList);
  }, [businessChart]);

  const CustomInputNode = ({ data }: any) => {
    return (
      <>
        <NodeContent node={data.business} />
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  };

  const CustomDefaultNode = ({ data }: any) => {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <NodeContent node={data.business} />
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  };
  const CustomOutputNode = ({ data }: any) => {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <NodeContent node={data.business} />
      </>
    );
  };

  const nodeTypes = useMemo(
    () => ({
      input: CustomInputNode,
      default: CustomDefaultNode,
      output: CustomOutputNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  return (
    <div className={BusinessStyles.businessEChart}>
      {utime ? (
        <div className={BusinessStyles.fixedBox}>
          {i18n.formatMessage({ id: "utime" })}:
          {moment(utime * 1000).format("YYYY-MM-DD HH:mm:ss")}
        </div>
      ) : null}
      <div className="dndflow">
        <ReactFlowProvider>
          <div className="reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              attributionPosition="top-right"
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <MiniMap />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default BusinessChart;
