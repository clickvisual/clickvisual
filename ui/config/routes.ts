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
    name: "alarm",
    routes: [
      { path: "/alarm/rules", name: "rules", component: "./Alarm/Rules" },
      {
        path: "/alarm/notifications",
        name: "notifications",
        component: "./Alarm/Notifications",
      },
    ],
  },
  {
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
