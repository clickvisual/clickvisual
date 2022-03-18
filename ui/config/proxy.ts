export default {
  dev: {
    "/api/": {
      target: "https://ch-dev.shimo.run",
      // target: "http://127.0.0.1:9001",
      changeOrigin: true,
      pathRewrite: { "^": "" },
    },
  },
  test: {},
  pre: {},
};
