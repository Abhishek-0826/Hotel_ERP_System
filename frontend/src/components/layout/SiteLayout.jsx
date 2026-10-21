import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNavForRole } from "../../utils/navigation";
import { GUEST_ROLES, OWNER_ROLES, STAFF_ROLES } from "../../utils/roles";
import DashboardLayout from "./DashboardLayout";
import RoostLayout from "./RoostLayout";
import { InShellContext } from "./shellContext";

/**
 * Wraps public and guest pages: signed-in users get the sidebar layout on every
 * page; visitors keep each page's own navbar and footer.
 */
export default function SiteLayout() {
  const { user } = useAuth();
  if (!user) return <Outlet />;

  const nav = getNavForRole(user.role);
  const Layout = OWNER_ROLES.includes(user.role) || STAFF_ROLES.includes(user.role) ? DashboardLayout : RoostLayout;
  return (
    <InShellContext.Provider value>
      <Layout nav={nav} title={GUEST_ROLES.includes(user.role) ? "ROOST" : "Workspace"}>
        <Outlet />
      </Layout>
    </InShellContext.Provider>
  );
}
