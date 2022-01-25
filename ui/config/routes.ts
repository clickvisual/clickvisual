export default [
  { path: "/", redirect: "/query" },
  {
    path: "/query",
    component: "./DataLogs",
    name: "log",
  },
  {
    path: "/share",
    component: "./DataLogs/ShareQueryResultPage",
    layout: false,
    hideInMenu: true,
  },
  {
    path: "/configure",
    name: "configure",
    component: "./Configure",
  },
  {
    path: "/sys",
    name: "systemSettings",
    component: "../layouts/SystemSetting",
    routes: [
      {
        path: "/sys/instances",
        name: "database",
        component: "./SystemSetting/InstancePanel",
      },
      {
        path: "/sys/clusters",
        name: "cluster",
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
];
