import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";
import { defineConfig } from "umi";
import defaultSettings from "./defaultSettings";
import proxy from "./proxy";
import routes from "./routes";

const { REACT_APP_ENV } = process.env;

const TerserPlugin = require("terser-webpack-plugin");

export default defineConfig({
  define: {
    "process.env.PUBLIC_PATH": process.env.PUBLIC_PATH || "/",
  },
  hash: true,
  publicPath: process.env.PUBLIC_PATH || "/",
  base: process.env.PUBLIC_PATH || "/",
  antd: {},
  dva: {
    // hmr: true,
  },
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
  // dynamicImport: {
  //   // loading: "@ant-design/pro-layout/es/PageLoading",
  // },
  // chunks: ["react", "vendors", "umi"],
  targets: {},
  routes,
  theme: {
    "primary-color": "hsl(21, 85%, 56%)",
    "border-radius-base": "8px",
  },
  // esbuild: {},
  title: "",
  ignoreMomentLocale: true,
  proxy: proxy[REACT_APP_ENV || "dev"],
  manifest: {
    basePath: "/",
  },
  // fastRefresh: {},
  // nodeModulesTransform: { type: "none" },
  exportStatic: {},
  model: {},
  request: {},
  initialState: {},
  chainWebpack: (config, { env, webpack, createCSSRule }) => {
    config.plugin("TerserPlugin").use(TerserPlugin, [
      {
        terserOptions: {
          compress: { drop_console: process.env.NODE_ENV === "production" },
          // compress: { drop_console: true },
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
