import { Outlet } from "react-router-dom";
import AppShell from "../shared/layout/AppShell";

export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
