export default [
  { path: "/", redirect: "/" },
  {
    name: "themeLayout",
    path: "/",
    component: "../layouts/ThemeLayout",
    routes: [
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
          {
            path: "/alarm/environment",
            name: "environment",
            component: "./Alarm/Environment",
          },
        ],
      },
      {
        path: "/bigdata",
        name: "bigdata",
        component: "./DataAnalysis",
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
        path: "/sys/pms",
        name: "role",
        component: "./SystemSetting/Role",
      },
      {
        path: "/sys/user",
        name: "user",
        component: "./SystemSetting/User",
      },
      {
        path: "*",
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
        path: "*",
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
        path: "*",
        redirect: "/",
      },
    ],
  },
  {
    path: "/graphics",
    component: "./Graphics",
  },
  {
    path: "*",
    component: "./404",
  },
];
