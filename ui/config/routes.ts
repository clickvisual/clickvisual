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
    path: "/alarm",
    routes: [
      {
        path: "/alarm/rules",
        name: "rules",
        component: "./Alarm/Rules",
      },
      {
        path: "/alarm/rules/history",
        component: "./Alarm/Rules/components/AlarmHistory",
        layout: false,
        hideInMenu: true,
      },
      {
        path: "/alarm/notifications",
        name: "notifications",
        component: "./Alarm/Notifications",
      },
    ],
  },
  {
    name: "systemSettings",
    path: "/sys",
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
        path: "/sys/events",
        name: "events",
        component: "./SystemSetting/Events",
      },
      {
        path: "/sys/role",
        name: "role",
        component: "./SystemSetting/Role",
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
    path: "install",
    layout: false,
    component: "../layouts/User",
    routes: [
      { path: "/install/init", component: "./Install/Init" },
      {
        redirect: "/",
      },
    ],
  },
  {
    component: "./404",
  },
];
