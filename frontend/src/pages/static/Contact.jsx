import StaticPage from "./StaticPage";
import { Mail, Phone } from "../../components/icons";
import { useTenant } from "../../context/TenantContext";

export default function Contact() {
  const tenant = useTenant();
  const email = tenant?.contactEmail || "hello@roost.app";
  const phone = tenant?.contactPhone || "+91 12345 67890";
  return (
    <StaticPage eyebrow="CONTACT" title="We'd love to hear from you.">
      <div className="flex flex-col gap-3">
        <a href={`mailto:${email}`} className="flex items-center gap-2 font-semibold text-ink-800 hover:text-brand-600"><Mail size={16} /> {email}</a>
        <a href={`tel:${phone}`} className="flex items-center gap-2 font-semibold text-ink-800 hover:text-brand-600"><Phone size={16} /> {phone}</a>
      </div>
    </StaticPage>
  );
}
