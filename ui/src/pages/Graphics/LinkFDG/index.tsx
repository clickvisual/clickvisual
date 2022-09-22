import { useEffect } from "react";
import * as d3 from "d3";

interface edgesType {
  source: string;
  target: string;
  value: number;
}
interface nodesType {
  name: string;
  radius: number;
}

const LinkFDG = (props: { dataList: any }) => {
  const { dataList } = props;

  const init = () => {
    let childs: string[] = [];
    let parents: string[] = [];
    let newNodes: nodesType[] = [];
    let newedges: edgesType[] = [];
    dataList?.map((item: any, index: number) => {
      childs.push(item.child);
      parents.push(item.parent);
      newedges.push({
        source: item.parent,
        target: item.child,
        value: item.callCount,
      });
    });
    [...childs, ...parents].map((item: any, index) => {
      const newNodesIndex = newNodes.findIndex(
        (newNodesItem: any) => item == newNodesItem.name
      );
      if (newNodesIndex == -1) {
        newNodes.push({
          name: item,
          radius: 5,
        });
        return;
      }
      newNodes[newNodesIndex].radius++;
    });
    draw(newedges, newNodes);
  };

  const draw = (edges: edgesType[], nodes: nodesType[]) => {
    if (edges.length == 0 || nodes.length == 0) return;
    // return;
    var d3Chart = document.getElementById("d3Chart");
    // 画布
    const width = d3Chart?.offsetWidth || 100;
    const height = (d3Chart?.offsetHeight || 100) - 10;
    const svg = d3
      .select(".d3Chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "#FFF");

    // 图
    const chart = svg.append("g");

    // 创建颜色比例尺
    const colorScale = d3.scaleOrdinal(
      d3.quantize(d3.interpolateRainbow, nodes.length + 1)
    );
    const force = d3
      .forceSimulation()
      .force(
        "link",
        d3.forceLink().id((d: { name: any }) => d.name)
      )
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

    // const forceNodes =
    force.nodes(nodes).on("tick", ticked);

    force
      .force("link")
      .links(edges)
      // 指定距离
      .distance(function (d: { value: number }) {
        //每一边的长度
        return (d.value + 1) * 200 < 300 ? (d.value + 1) * 200 : 300;
      });

    const line = chart
      .append("g")
      .selectAll()
      .data(edges)
      .enter()
      .append("g")
      .attr("marker-end", "url(#arrow)");

    var defs = svg.append("defs");

    var arrowMarker = defs
      .append("marker")
      .attr("id", "arrow")
      .attr("markerUnits", "strokeWidth")
      .attr("markerWidth", "6")
      .attr("markerHeight", "6")
      .attr("viewBox", "1 1 12 12")
      .attr("refX", "20")
      .attr("refY", "6")
      .attr("orient", "auto");

    var arrow_path = "M2,2 L10,6 L2,10 L6,6 L2,2";

    arrowMarker.append("path").attr("d", arrow_path).attr("fill", "#ccc");

    const links = line
      .append("line")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    const linksText = line
      .append("text")
      .text(function (d: { value: any }) {
        // return d.value == 0 ? "" : d.value;
        // return d?.value || "";
        return d?.value;
      })
      .attr("fill", "#000");

    const nodesChart = chart
      .append("g")
      .selectAll()
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", function (d: { x: any; y: any }, i: any) {
        var cirX = d.x;
        var cirY = d.y;
        return "translate(" + cirX + "," + cirY + ")";
      });

    nodesChart
      .append("circle")
      .attr("r", function (d: { radius: number }, i: any) {
        // 半径
        return d.radius * 2;
      })
      .attr("fill", function (d: { name: any }, i: any) {
        return colorScale(d.name);
      });

    nodesChart
      .append("text")
      .attr("x", 25)
      .attr("y", -5)
      .attr("dy", 10)
      .attr("font-size", 20)
      .text(function (d: { name: any }) {
        return d.name;
      })
      .attr("fill", "#000")
      .attr("pointer-events", "none")
      .style("user-select", "none");

    nodesChart.on("click", (node: { target: any }) => {
      const name = node.target.__data__.name;

      links.style(
        "stroke-width",
        function (line: { source: { name: any }; target: { name: any } }) {
          if (line.source.name == name || line.target.name == name) {
            return 5;
          } else {
            return 2;
          }
        }
      );
      links.style(
        "stroke",
        function (line: { source: { name: any }; target: { name: any } }) {
          if (line.source.name == name || line.target.name == name) {
            return "#f66";
          } else {
            return "#eee";
          }
        }
      );
    });

    function ticked() {
      links
        .attr("x1", function (d: { source: { x: any } }) {
          return d.source.x;
        })
        .attr("y1", function (d: { source: { y: any } }) {
          return d.source.y;
        })
        .attr("x2", function (d: { target: { x: any } }) {
          return d.target.x;
        })
        .attr("y2", function (d: { target: { y: any } }) {
          return d.target.y;
        });

      linksText
        .attr("x", function (d: { source: { x: any }; target: { x: any } }) {
          return (d.source.x + d.target.x) / 2;
        })
        .attr("y", function (d: { source: { y: any }; target: { y: any } }) {
          return (d.source.y + d.target.y) / 2;
        });

      nodesChart.attr("transform", function (d: { x: string; y: string }) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }

    // d.fx 和 d.fy 表示固定坐标
    function started(_e: any, d: { fx: any; x: any; fy: any; y: any }) {
      force.alphaTarget(0.5).restart(); // 设置衰减系数
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(e: { x: any; y: any }, d: { fx: any; fy: any }) {
      d.fx = e.x;
      d.fy = e.y;
    }
    function ended(e: any, d: { fx: null; fy: null }) {
      force.alphaTarget(0).restart();
      d.fx = null;
      d.fy = null;
    }

    nodesChart.call(
      d3.drag().on("start", started).on("drag", dragged).on("end", ended)
    );
  };

  useEffect(() => {
    dataList && dataList.length > 0 && init();
  }, [dataList]);

  return (
    <>
      <div
        id="d3Chart"
        style={{ width: "100%", height: "100%" }}
        className="d3Chart"
      />
    </>
  );
};
export default LinkFDG;
