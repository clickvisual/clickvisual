import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import AlertRulesPage from "../domains/alert/pages/AlertRulesPage";
import OverviewPage from "../domains/overview/pages/OverviewPage";
import IngestionWorkbenchPage from "../domains/query/pages/IngestionWorkbenchPage";
import QueryLinkPage from "../domains/query/pages/QueryLinkPage";
import QueryPage from "../domains/query/pages/QueryPage";
import PermissionResourcesPage from "../domains/permission/pages/PermissionResourcesPage";
import PermissionRootPage from "../domains/permission/pages/PermissionRootPage";
import PermissionRolesPage from "../domains/permission/pages/PermissionRolesPage";
import PermissionUsersPage from "../domains/permission/pages/PermissionUsersPage";
import ReportSchedulePage from "../domains/report/pages/ReportSchedulePage";
import SettingsDatasourcePage from "../domains/settings/pages/SettingsDatasourcePage";
import { getV2BasePath } from "../shared/layout/VersionSwitcher";

export const routes = [
  {
    path: "/v2",
    element: <App />,
    children: [
      {
        index: true,
        element: <QueryPage />
      },
      {
        path: "reports",
        element: <ReportSchedulePage />
      },
      {
        path: "reports/:reportId",
        element: <ReportSchedulePage />
      },
      {
        path: "overview",
        element: <OverviewPage />
      },
      {
        path: "query",
        element: <QueryPage />
      },
      {
        path: "query/link",
        element: <QueryLinkPage />
      },
      {
        path: "query/ingestion",
        element: <IngestionWorkbenchPage />
      },
      {
        path: "alerts/rules",
        element: <AlertRulesPage />
      },
      {
        path: "settings/datasource",
        element: <SettingsDatasourcePage />
      },
      {
        path: "permission/users",
        element: <PermissionUsersPage />
      },
      {
        path: "permission/roles",
        element: <PermissionRolesPage />
      },
      {
        path: "permission/resources",
        element: <PermissionResourcesPage />
      },
      {
        path: "permission/root",
        element: <PermissionRootPage />
      }
    ]
  }
];

export const router = createBrowserRouter(routes, {
  basename: getV2BasePath()
});
