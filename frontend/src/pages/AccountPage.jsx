import { ProfileBody } from "./user/UserPortalPages";
import { Shell } from "./GeneratedPages";

// "My account" for owner, manager, receptionist and staff: profile details and password change.
export default function AccountPage() {
  return <Shell title="My account"><ProfileBody eyebrow="ROOST account" /></Shell>;
}
