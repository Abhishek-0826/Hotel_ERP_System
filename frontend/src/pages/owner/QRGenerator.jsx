import { getBasePath } from "../../lib/tenantRoute";
import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import ApiNotice from "../../components/ui/ApiNotice";
import { propertyApi } from "../../api/properties";
import { useApi } from "../../hooks/useApi";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import { getOwnerNav } from "./nav";
import { QrCode, Copy, Download } from "../../components/icons";

const TYPES = ["Property", "Booking"];

export default function QRGenerator() {
  const { user } = useAuth();
  const { pushToast } = useAppState();
  const { data: properties, loading, error } = useApi(() => propertyApi.mine(), []);
  const [type, setType] = useState("Property");
  const [target, setTarget] = useState("");
  const [generated, setGenerated] = useState(false);
  const qrRef = useRef(null);
  const appUrl = `${String(import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")}${getBasePath()}`;
  const value = useMemo(() => target ? `${appUrl}/${type === "Booking" ? "booking" : "properties"}/${encodeURIComponent(target)}` : "", [appUrl, target, type]);

  const download = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `roost-${type.toLowerCase()}-qr.png`;
    anchor.click();
    pushToast({ type: "success", title: "QR downloaded", message: anchor.download });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      pushToast({ type: "info", title: "Link copied" });
    } catch {
      pushToast({ type: "error", title: "Copy failed", message: "Copy the displayed link manually." });
    }
  };

  const changeType = (event) => {
    setType(event.target.value);
    setTarget("");
    setGenerated(false);
  };

  return (
    <DashboardLayout nav={getOwnerNav(user?.role)} title="QR generator">
      <div className="mb-6"><h1 className="text-xl font-extrabold text-ink-900">Generate a QR code</h1><p className="mt-1 text-sm text-ink-500">Create a link to a live property page or booking record.</p></div>
      <ApiNotice message={error} />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <article className="card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field"><span className="label">QR type</span><select className="input" value={type} onChange={changeType}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            {type === "Property" ? (
              <label className="field"><span className="label">Property</span><select className="input" value={target} disabled={loading} onChange={(event) => { setTarget(event.target.value); setGenerated(false); }}><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.slug}>{property.name}</option>)}</select></label>
            ) : (
              <label className="field"><span className="label">Booking code</span><input className="input" value={target} onChange={(event) => { setTarget(event.target.value.trim()); setGenerated(false); }} placeholder="Enter booking code" /></label>
            )}
          </div>
          <div className="mt-5 flex justify-end"><Button variant="teal" disabled={!target} onClick={() => setGenerated(true)}>Generate QR</Button></div>
        </article>
        <article className="card flex flex-col items-center gap-4 p-6 text-center">
          <div ref={qrRef} className="grid h-48 w-48 place-items-center rounded-2xl border border-dashed border-ink-200 bg-ink-50">{generated && value ? <QRCodeCanvas value={value} size={170} includeMargin /> : <QrCode size={56} className="text-ink-300" />}</div>
          <p className="max-w-[260px] break-all text-xs text-ink-500">{generated ? value : "Choose a destination, then generate a scannable code."}</p>
          {generated && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={copy}><Copy size={13} /> Copy link</Button><Button size="sm" onClick={download}><Download size={13} /> Download PNG</Button></div>}
        </article>
      </div>
    </DashboardLayout>
  );
}
