import { IApi } from "umi";

const handleResourcePath = (url: string): string => {
  return (process.env.PUBLIC_PATH ?? "/") + url;
};
/**
 * html
 * https://github.com/umijs/umi-next/issues/868
 */
export default (api: IApi) => {
  api.addHTMLMetas(() => [
    { httpEquiv: "X-UA-Compatible", content: "IE=edge" },
    {
      name: "description",
      content:
        "轻量级的开源日志查询、分析、报警的可视化平台，致力于提供一站式应用可靠性的可视化的解决方案。既可以独立部署使用，也可作为插件集成到第三方系统。目前是市面上唯一一款支持 ClickHouse 的类 Kibana 的业务日志查询平台。",
    },
    {
      name: "keywords",
      content: "ClickVisual, clickvisual, CLICKVISUAL, Clickhouse, shimo",
    },
    { name: "author", content: "@clickvisual" },
  ]);

  api.addHTMLLinks(() => [
    { rel: "icon", type: "image/x-icon", href: "./cv.png" },
    {
      rel: "stylesheet",
      href: handleResourcePath("luckysheet/css/pluginsCss.css"),
    },
    {
      rel: "stylesheet",
      href: handleResourcePath("luckysheet/css/plugins.css"),
    },
    {
      rel: "stylesheet",
      href: handleResourcePath("luckysheet/css/luckysheet.css"),
    },
  ]);

  api.addHTMLScripts(() => [
    {
      src: handleResourcePath("luckysheet/js/plugin.js"),
    },
    {
      src: handleResourcePath("luckysheet/js/luckysheet.umd.js"),
    },
  ]);
};
