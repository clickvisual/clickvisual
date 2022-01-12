export default [
  {
    path: "/",
    routes: [
      { path: "/", redirect: "/query" },
      {
        path: "/query",
        component: "./DataLogs",
      },
      {
        path: "/share",
        name: "日志查看",
        component: "./DataLogs/ShareQueryResultPage",
        layout: false,
      },
      {
        path: "/configure",
        name: "配置",
        component: "./Configure",
        headerRender: false,
      },
      {
        path: "/sys",
        name: "系统设置",
        component: "../layouts/SystemSetting",
        routes: [
          {
            path: "/sys/instances",
            name: "数据库管理",
            component: "./SystemSetting/InstancePanel",
          },
          {
            path: "/sys/clusters",
            name: "集群管理",
            component: "./SystemSetting/ClustersPanel",
          },
          {
            redirect: "/",
          },
        ],
      },
      {
        path: "/user",
        layout: false,
        component: "../layouts/User",
        routes: [
          {
            path: "/user/login",
            name: "登录",
            component: "./User/Login",
          },
          {
            redirect: "/",
          },
        ],
      },
      {
        component: "./404",
      },
    ],
  },
];
