import { defineConfig } from "umi";
import defaultSettings from "./defaultSettings";
import proxy from "./proxy";
import routes from "./routes";
import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";

const TerserPlugin = require("terser-webpack-plugin");

const { REACT_APP_ENV } = process.env;

export default defineConfig({
  define: {
    "process.env.PUBLIC_PATH": process.env.PUBLIC_PATH || "/",
  },
  hash: true,
  publicPath: process.env.PUBLIC_PATH || "/",
  base: process.env.PUBLIC_PATH || "/",
  antd: {},
  dva: {
    hmr: true,
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
  dynamicImport: {
    loading: "@ant-design/pro-layout/es/PageLoading",
  },
  // chunks: ["react", "vendors", "umi"],
  targets: {
    chrome: 79,
    firefox: false,
    safari: false,
    edge: false,
    ios: false,
  },
  routes,
  theme: {
    "primary-color": "hsl(21, 85%, 56%)",
    "border-radius-base": "8px",
  },
  esbuild: {},
  title: false,
  ignoreMomentLocale: true,
  proxy: proxy[REACT_APP_ENV || "dev"],
  manifest: {
    basePath: "/",
  },
  fastRefresh: {},
  nodeModulesTransform: { type: "none" },
  exportStatic: {},
  chainWebpack: (config, { env, webpack, createCSSRule }) => {
    config.plugin("TerserPlugin").use(TerserPlugin, [
      {
        terserOptions: {
          compress: { drop_console: process.env.NODE_ENV === "production" },
        },
      },
    ]);
    // config.optimization.splitChunks({
    //   chunks: "all",
    //   minSize: 30000,
    //   minChunks: 1,
    //   automaticNameDelimiter: ".",
    //   cacheGroups: {
    //
    //   },
    // });
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
