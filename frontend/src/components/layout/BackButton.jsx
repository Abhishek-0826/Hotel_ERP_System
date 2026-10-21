import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "../icons";
import { useAuth } from "../../context/AuthContext";

// Goes to the previous page; falls back to the home page when the tab has no history (e.g. opened from a QR code).
export default function BackButton({ className = "", label = "Back" }) {
  const navigate = useNavigate();
  const { key } = useLocation();
  const { user } = useAuth();
  if (user?.role !== "GUEST") return null; // only guests get a back button
  const goBack = () => (key === "default" ? navigate("/") : navigate(-1));
  return (
    <button type="button" onClick={goBack} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900 ${className}`}>
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
