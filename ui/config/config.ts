import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";
import { defineConfig } from "umi";
import defaultSettings from "./defaultSettings";
import proxy from "./proxy";
import routes from "./routes";

const { REACT_APP_ENV } = process.env;

const TerserPlugin = require("terser-webpack-plugin");
console.log(process.env.PUBLIC_PATH, "process.env.PUBLIC_PATH");
export default defineConfig({
  define: {
    "process.env.PUBLIC_PATH": process.env.PUBLIC_PATH || "/",
  },
  hash: true,
  publicPath: process.env.PUBLIC_PATH || "/",
  base: process.env.PUBLIC_PATH || "/",
  antd: {},
  dva: {},
  layout: {
    locale: true,
    siderWidth: 208,
    ...defaultSettings,
  },
  locale: {
    antd: true,
    default: "zh-CN",
    baseNavigator: true,
  },
  targets: {},
  routes,
  theme: {
    "primary-color": "hsl(21, 85%, 56%)",
    "border-radius-base": "8px",
  },
  title: "",
  ignoreMomentLocale: true,
  proxy: proxy[REACT_APP_ENV || "dev"],
  manifest: {
    basePath: "/",
  },
  exportStatic: {},
  model: {},
  request: {},
  initialState: {},
  chainWebpack: (config, { env, webpack }) => {
    config.plugin("TerserPlugin").use(TerserPlugin, [
      {
        terserOptions: {
          compress: { drop_console: process.env.NODE_ENV === "production" },
        },
      },
    ]);
    config.plugin("monaco-editor").use(MonacoEditorWebpackPlugin, [
      {
        languages: ["json", "ini", "yaml", "sb", "sql", "mysql"],
        features: [
          "coreCommands",
          "find",
          "comment",
          "format",
          "bracketMatching",
          "wordOperations",
          "suggest",
          "multicursor",
          "links",
        ],
      },
    ]);
    return config;
  },
});
