import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";
import App from "./App";
import LoginPage from "../domains/auth/pages/LoginPage";
import AnalysisWorkbenchPage from "../domains/analysis/pages/AnalysisWorkbenchPage";
import AlertRulesPage from "../domains/alert/pages/AlertRulesPage";
import OverviewPage from "../domains/overview/pages/OverviewPage";
import IngestionWorkbenchPage from "../domains/query/pages/IngestionWorkbenchPage";
import QueryLinkPage from "../domains/query/pages/QueryLinkPage";
import QueryPage from "../domains/query/pages/QueryPage";
import TroubleshootPage from "../domains/troubleshoot/pages/TroubleshootPage";
import PermissionResourcesPage from "../domains/permission/pages/PermissionResourcesPage";
import PermissionRootPage from "../domains/permission/pages/PermissionRootPage";
import PermissionRolesPage from "../domains/permission/pages/PermissionRolesPage";
import PermissionUsersPage from "../domains/permission/pages/PermissionUsersPage";
import ReportResultPage from "../domains/report/pages/ReportResultPage";
import ReportSchedulePage from "../domains/report/pages/ReportSchedulePage";
import SettingsDatasourcePage from "../domains/settings/pages/SettingsDatasourcePage";
import SettingsModelsPage from "../domains/settings/pages/SettingsModelsPage";
import SettingsQueryTokensPage from "../domains/settings/pages/SettingsQueryTokensPage";
import LogLibraryManagementPage from "../domains/logLibrary/pages/LogLibraryManagementPage";
import { isPrivateLiteEdition } from "../shared/config/runtime";
import { getV2BasePath } from "../shared/layout/VersionSwitcher";

function HomeRedirect({ privateLite }: { privateLite: boolean }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: privateLite ? "/v2/query" : "/v2/ask", search }} replace />;
}

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
          element: <HomeRedirect privateLite={privateLite} />
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
          path: "ask",
          element: <TroubleshootPage />
        },
        {
          path: "ask/share/:token",
          element: <TroubleshootPage />
        },
        {
          path: "troubleshoot",
          element: <TroubleshootPage />
        },
        {
          path: "troubleshoot/share/:token",
          element: <TroubleshootPage />
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
          path: "settings/models",
          element: <SettingsModelsPage />
        },
        {
          path: "settings/query-tokens",
          element: <SettingsQueryTokensPage />
        },
        {
          path: "settings/log-libraries",
          element: <LogLibraryManagementPage />
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
      path: "/",
      element: <HomeRedirect privateLite={privateLite} />
    },
    {
      path: "/share",
      element: <QueryPage shareMode />
    },
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
