export default {
  dev: {
    "/api/": {
      target: "https://logstest.mihoyo.com",
      changeOrigin: true,
      pathRewrite: { "^": "" },
    },
  },
  test: {},
  pre: {},
};
