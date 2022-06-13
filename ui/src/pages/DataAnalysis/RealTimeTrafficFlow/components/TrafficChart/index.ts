import { dynamic } from "umi";

export const TrafficEChart = dynamic({
  loader: async function () {
    // 这里的注释 webpackChunkName 可以指导 webpack 将该组件 HugeA 以这个名字单独拆出去
    const { default: TrafficEChart } = await import(
      /* webpackChunkName: "echarts-realTime-traffic" */ "./TrafficChart"
    );
    return TrafficEChart;
  },
});
