export default {
  dev: {
    "/api/": {
      // target: "http://172.16.21.219:19001",
      target: "http://127.0.0.1:9001",
      changeOrigin: true,
      pathRewrite: { "^": "" },
    },
  },
  test: {},
  pre: {},
};
