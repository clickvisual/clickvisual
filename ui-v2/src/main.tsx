import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CustomProvider } from "rsuite";
import zhCN from "rsuite/locales/zh_CN";
import { router } from "./app/router";
import "rsuite/dist/rsuite-no-reset.min.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <CustomProvider locale={zhCN}>
    <RouterProvider router={router} />
  </CustomProvider>
);
