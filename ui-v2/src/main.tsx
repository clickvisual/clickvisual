import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CustomProvider } from "rsuite";
import zhCN from "rsuite/locales/zh_CN";
import { router } from "./app/router";
import { getPublicPathLoginRedirectHref } from "./shared/layout/VersionSwitcher";
import "rsuite/dist/rsuite-no-reset.min.css";
import "./styles.css";

const publicPathRedirectHref = getPublicPathLoginRedirectHref();

if (publicPathRedirectHref) {
  window.location.replace(publicPathRedirectHref);
} else {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <CustomProvider locale={zhCN}>
      <RouterProvider router={router} />
    </CustomProvider>
  );
}
