import { Loader2 } from "../icons";

const VARIANTS = {
  primary: "btn-primary",
  teal: "btn-teal",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export default function Button({ variant = "primary", size, loading, className = "", children, as: As = "button", ...props }) {
  const base = VARIANTS[variant] || VARIANTS.primary;
  const sizeCls = size === "sm" ? "btn-sm" : "";
  return (
    <As className={`${base} ${sizeCls} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </As>
  );
}
