import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import AlertRulesPage from "../domains/alert/pages/AlertRulesPage";
import OverviewPage from "../domains/overview/pages/OverviewPage";
import QueryPage from "../domains/query/pages/QueryPage";
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
        element: <ReportSchedulePage />
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
        path: "alerts/rules",
        element: <AlertRulesPage />
      },
      {
        path: "settings/datasource",
        element: <SettingsDatasourcePage />
      }
    ]
  }
];

export const router = createBrowserRouter(routes, {
  basename: getV2BasePath()
});
