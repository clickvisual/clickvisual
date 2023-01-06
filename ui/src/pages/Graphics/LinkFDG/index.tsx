import { useEffect, useState } from "react";
import styles from "./index.less";
import * as d3 from "d3";
import { Segmented } from "antd";
import { useIntl } from "umi";
import classNames from "classnames";

interface edgesType {
  source: string;
  target: string;
  value: number;
  clientDurationP50: number;
  clientDurationP90: number;
  clientDurationP99: number;
  serverDurationP50: number;
  serverDurationP90: number;
  serverDurationP99: number;
  clientSuccessRate: number;
}
interface nodesType {
  name: string;
  radius: number;
}

enum valueTypes {
  callCount = "callCount",
  P50 = "P50",
  P90 = "P90",
  P99 = "P99",
  successRate = "successRate",
}

const LinkFDG = (props: { dataList: any }) => {
  const i18n = useIntl();
  const { dataList } = props;
  const [valueType, setValueType] = useState<valueTypes>(valueTypes.callCount);

  const init = () => {
    let childs: string[] = [];
    let parents: string[] = [];
    let newNodes: nodesType[] = [];
    let newedges: edgesType[] = [];
    dataList?.map((item: any) => {
      childs.push(item.child);
      parents.push(item.parent);
      newedges.push({
        source: item.parent,
        target: item.child,
        value: item.callCount,
        clientDurationP50: item.clientDurationP50,
        clientDurationP90: item.clientDurationP90,
        clientDurationP99: item.clientDurationP99,
        serverDurationP50: item.serverDurationP50,
        serverDurationP90: item.serverDurationP90,
        serverDurationP99: item.serverDurationP99,
        clientSuccessRate: item.clientSuccessRate,
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

    // const linkGroup = {};
    // // 两点之间的线根据两点的 name 属性设置为同一个 key，加入到 linkGroup 中，给两点之间的所有边分成一个组
    // newedges.forEach((link: any) => {
    //   const key =
    //     link.source.name < link.target.name
    //       ? link.source.name + ":" + link.target.name
    //       : link.target.name + ":" + link.source.name;
    //   if (!linkGroup.hasOwnProperty(key)) {
    //     linkGroup[key] = [];
    //   }
    //   linkGroup[key].push(link);
    // });
    // // 遍历给每组去调用 setLinkNumbers 来分配 linkum
    // newedges.forEach((link: any) => {
    //   const key = setLinkName(link);
    //   link.size = linkGroup[key].length;
    //   const group = linkGroup[key];
    //   const keyPair = key.split(":");
    //   let type = "noself";
    //   if (keyPair[0] === keyPair[1]) {
    //     type = "self";
    //   }
    //   setLinkNumbers(group, type);
    // });
    draw(newedges, newNodes);
  };

  const draw = (edges: edgesType[], nodes: nodesType[]) => {
    if (edges.length == 0 || nodes.length == 0) return;
    let d3Chart = document.getElementById("d3Chart");
    let oldSvg = document.getElementById("svg");
    oldSvg?.parentNode?.removeChild(oldSvg);
    // 画布
    const width = d3Chart?.offsetWidth || 100;
    const height = (d3Chart?.offsetHeight || 100) - 10;
    const svg = d3
      .select(".d3Chart")
      .append("svg")
      .attr("id", "svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "#FFF");

    // 图
    const chart = svg.append("g");

    // 创建颜色比例尺
    // const colorScale = d3.scaleOrdinal(
    //   d3.quantize(d3.interpolateRainbow, nodes.length + 1)
    // );
    const force = d3
      .forceSimulation()
      .force(
        "link",
        d3.forceLink().id((d: { name: any }) => d.name)
      )
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(60).iterations(2));

    // const forceNodes =
    force.nodes(nodes).on("tick", ticked);

    force
      .force("link")
      .links(edges)
      // 指定距离
      .distance(function (d: { value: number }) {
        //每一边的长度
        // return (d.value + 1) * 200 < 300 ? (d.value + 1) * 200 : 300;
        return 200;
      });

    const line = chart
      .append("g")
      .selectAll()
      .data(edges)
      .enter()
      .append("g")
      .attr("marker-end", "url(#arrow)");

    let defs = svg.append("defs");

    // 箭头
    let arrowMarker = defs
      .append("marker")
      .attr("id", "arrow")
      .attr("markerUnits", "strokeWidth")
      .attr("markerWidth", "6")
      .attr("markerHeight", "6")
      .attr("viewBox", "1 1 12 12")
      .attr("refX", "35")
      .attr("refY", "6")
      .attr("orient", "auto");

    let arrow_path = "M2,2 L10,6 L2,10 L6,6 L2,10";

    arrowMarker.append("path").attr("d", arrow_path).attr("fill", "#aaa");

    // 线
    const links = line
      .append("line")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    //信息文案
    const linksText = line
      .append("text")
      .attr("id", function (item: any) {
        return `${item.source.name}_${item.target.name}`;
      })
      .text(function (d: {
        clientSuccessRate: number;
        clientDurationP99: any;
        clientDurationP90: any;
        clientDurationP50: any;
        value: any;
      }) {
        switch (valueType) {
          case valueTypes.callCount:
            return d.value;
          case valueTypes.P50:
            return (Math.floor(d.clientDurationP50) / Math.pow(10, 6)).toFixed(
              3
            );
          case valueTypes.P90:
            return (Math.floor(d.clientDurationP90) / Math.pow(10, 6)).toFixed(
              3
            );
          case valueTypes.P99:
            return (Math.floor(d.clientDurationP99) / Math.pow(10, 6)).toFixed(
              3
            );
          case valueTypes.successRate:
            return (d?.clientSuccessRate * 100).toFixed(2) + "%";
        }
      })
      .attr("fill", "#000");

    // 节点圆圈
    const nodesChart = chart
      .append("g")
      .selectAll()
      .data(nodes)
      .enter()
      .append("g")
      .attr("transform", function (d: { x: any; y: any }, i: any) {
        let cirX = d.x;
        let cirY = d.y;
        return "translate(" + cirX + "," + cirY + ")";
      });

    nodesChart
      .append("circle")
      .attr("r", function (d: { radius: number }, i: any) {
        // 半径
        return d.radius * 2;
      });

    // 节点名称
    const nodeText = nodesChart
      .append("text")
      .attr("x", 25)
      .attr("y", -5)
      .attr("dy", 10)
      .attr("font-size", 20)
      .text(function (d: { name: any }) {
        return d.name;
      })
      .attr("fill", "#2a5ef890")
      .attr("pointer-events", "none")
      .style("user-select", "none");

    nodesChart.on("click", (node: { target: any }) => {
      const name = node.target.__data__.name;
      // 用来存放相关的节点名称
      let itemArr: any[] = [];
      // 连线宽度
      links.style(
        "stroke-width",
        function (line: { source: { name: any }; target: { name: any } }) {
          if (line.source.name == name || line.target.name == name) {
            if (itemArr.indexOf(line.source.name) == -1) {
              itemArr.push(line.source.name);
            }
            if (itemArr.indexOf(line.target.name) == -1) {
              itemArr.push(line.target.name);
            }
            return 5;
          } else {
            return 2;
          }
        }
      );
      // 连线颜色
      links.style(
        "stroke",
        function (line: { source: { name: any }; target: { name: any } }) {
          if (line.source.name == name || line.target.name == name) {
            return "#aaa";
          } else {
            return "#eee";
          }
        }
      );
      // 节点文字颜色
      nodeText.style("fill", function (item: { name: string }) {
        if (itemArr.indexOf(item.name) > -1) {
          return "#2a5ef890";
        } else {
          return "#eee";
        }
      });
      // 信息文字颜色
      linksText.style(
        "fill",
        function (item: { source: { name: any }; target: { name: any } }) {
          if (item.source.name == name || item.target.name == name) {
            return "#f66";
          } else {
            return "#eee";
          }
        }
      );
      linksText.text(
        (item: {
          value: any;
          serverDurationP50: any;
          serverDurationP90: any;
          serverDurationP99: any;
          clientDurationP50: any;
          clientDurationP90: any;
          clientDurationP99: any;
          clientSuccessRate: number;
          source: { name: any };
          target: { name: any };
        }) => {
          if (item.source.name == name || item.target.name == name) {
            switch (valueType) {
              case valueTypes.callCount:
                return item.value;
              case valueTypes.P50:
                return (
                  Math.floor(item.clientDurationP50) / Math.pow(10, 6)
                ).toFixed(3);
              case valueTypes.P90:
                return (
                  Math.floor(item.clientDurationP90) / Math.pow(10, 6)
                ).toFixed(3);
              case valueTypes.P99:
                return (
                  Math.floor(item.clientDurationP99) / Math.pow(10, 6)
                ).toFixed(3);
              case valueTypes.successRate:
                return (item?.clientSuccessRate * 100).toFixed(2) + "%";
              // return (d?.clientSuccessRate * 100).toFixed(2) + "%";
            }
          } else {
            return "";
          }
        }
      );
      nodesChart.style("fill", function (item: { name: string }) {
        if (itemArr.indexOf(item.name) > -1) {
          return "#f66";
        } else {
          return "#eee";
        }
      });
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

  const setLinkNumbers = (group: string | any[]) => {
    const len = group.length;
    const linksA: any = [];
    const linksB: any = [];
    for (let i = 0; i < len; i++) {
      const link = group[i];
      if (link.source.name < link.target.name) {
        linksA.push(link);
      } else {
        linksB.push(link);
      }
    }
    let startLinkANumber = 1;
    linksA.forEach((linkA: { linknum: number }) => {
      linkA.linknum = startLinkANumber++;
    });
    let startLinkBNumber = -1;
    linksB.forEach((linkB: { linknum: number }) => {
      linkB.linknum = startLinkBNumber--;
    });
  };

  useEffect(() => {
    dataList && dataList.length > 0 && init();
  }, [dataList, valueType]);

  return (
    <>
      <div
        id="d3Chart"
        style={{ width: "100%", height: "100%" }}
        className="d3Chart"
      />
      <div className={styles.segmented}>
        <Segmented
          options={[
            valueTypes.callCount,
            valueTypes.P50,
            valueTypes.P90,
            valueTypes.P99,
            valueTypes.successRate,
          ]}
          defaultValue={valueType}
          onChange={(value: any) => setValueType(value)}
        />
      </div>
      <div
        className={classNames([
          styles.unit,
          (valueType == valueTypes.callCount ||
            valueType == valueTypes.successRate) &&
            styles.none,
        ])}
      >
        {i18n.formatMessage({ id: "unit" })}: ms
      </div>
    </>
  );
};
export default LinkFDG;
