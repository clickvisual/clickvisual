import { defineConfig } from "umi";
import defaultSettings from "./defaultSettings";
import proxy from "./proxy";
import routes from "./route";
import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";

const { REACT_APP_ENV } = process.env;

export default defineConfig({
  hash: true,
  publicPath: process.env.PUBLIC_PATH || "/",
  antd: {},
  dva: {
    hmr: true,
  },
  layout: {
    // https://umijs.org/zh-CN/plugins/plugin-layout
    locale: true,
    siderWidth: 208,
    ...defaultSettings,
  },
  // https://umijs.org/zh-CN/plugins/plugin-locale
  locale: {
    // default zh-CN
    default: "zh-CN",
    antd: true,
    // default true, when it is true, will use `navigator.language` overwrite default
    baseNavigator: true,
  },
  dynamicImport: {
    loading: "@ant-design/pro-layout/es/PageLoading",
  },
  targets: {
    ie: 11,
  },
  // umi route: https://umijs.org/docs/routing
  routes,
  // Theme for antd: https://ant.design/docs/react/customize-theme-cn
  theme: {
    "primary-color": "hsl(21, 85%, 56%)",
    "border-radius-base": "8px",
  },
  // esbuild is father build tools
  // https://umijs.org/plugins/plugin-esbuild
  esbuild: {},
  title: false,
  ignoreMomentLocale: true,
  proxy: proxy[REACT_APP_ENV || "dev"],
  manifest: {
    basePath: "/",
  },
  // Fast Refresh 热更新
  fastRefresh: {},
  nodeModulesTransform: { type: "none" },
  exportStatic: {},
  chainWebpack(config, { env, webpack, createCSSRule }) {
    config.plugin("monaco-editor").use(MonacoEditorWebpackPlugin, [
      {
        languages: ["json", "ini", "yaml", "sb"],
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
  },
});
