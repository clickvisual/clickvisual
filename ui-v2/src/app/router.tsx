import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import LoginPage from "../domains/auth/pages/LoginPage";
import AnalysisWorkbenchPage from "../domains/analysis/pages/AnalysisWorkbenchPage";
import AlertRulesPage from "../domains/alert/pages/AlertRulesPage";
import OverviewPage from "../domains/overview/pages/OverviewPage";
import IngestionWorkbenchPage from "../domains/query/pages/IngestionWorkbenchPage";
import QueryLinkPage from "../domains/query/pages/QueryLinkPage";
import QueryPage from "../domains/query/pages/QueryPage";
import PermissionResourcesPage from "../domains/permission/pages/PermissionResourcesPage";
import PermissionRootPage from "../domains/permission/pages/PermissionRootPage";
import PermissionRolesPage from "../domains/permission/pages/PermissionRolesPage";
import PermissionUsersPage from "../domains/permission/pages/PermissionUsersPage";
import ReportResultPage from "../domains/report/pages/ReportResultPage";
import ReportSchedulePage from "../domains/report/pages/ReportSchedulePage";
import SettingsDatasourcePage from "../domains/settings/pages/SettingsDatasourcePage";
import SettingsQueryTokensPage from "../domains/settings/pages/SettingsQueryTokensPage";
import { isPrivateLiteEdition } from "../shared/config/runtime";
import { getV2BasePath } from "../shared/layout/VersionSwitcher";

export function createV2Routes(privateLite = isPrivateLiteEdition()) {
  const children = privateLite
    ? [
        {
          index: true,
          element: <QueryPage />
        },
        {
          path: "query",
          element: <QueryPage />
        },
        {
          path: "query/link",
          element: <QueryLinkPage />
        }
      ]
    : [
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
          path: "reports/:reportId/display",
          element: <ReportResultPage />
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
          path: "analysis",
          element: <AnalysisWorkbenchPage />
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
          path: "settings/query-tokens",
          element: <SettingsQueryTokensPage />
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
      ];
  return [
    {
      path: "/v2/login",
      element: <LoginPage />
    },
    {
      path: "/v2",
      element: <App />,
      children
    }
  ];
}

export const routes = createV2Routes();

export const router = createBrowserRouter(routes, {
  basename: getV2BasePath()
});
