import { Link } from "react-router-dom";
import { Heart, MapPin, Star, BedDouble } from "../icons";

const TONES = {
  blue: { from: "#bfe0f5", to: "#5aa8d6" },
  gold: { from: "#f6dfa6", to: "#d99f2e" },
  green: { from: "#bfe8cf", to: "#3f9e6a" },
  lilac: { from: "#d9cdf5", to: "#8a67d6" },
};

export default function PropertyCard({
  property: p,
  favorite,
  onFavorite,
  compact,
}) {
  const price = p.price || p.startingPrice || 300;
  const tone = TONES[p.tone] || TONES.blue;
  const availableBeds = p.bedsCount
    ? Math.max(1, Math.round(p.bedsCount * 0.35))
    : null;

  return (
    <article
      className={`card group overflow-hidden transition hover:-translate-y-1 hover:shadow-pop ${
        compact ? "w-64 shrink-0" : ""
      }`}
    >
      <div
        className="relative h-40 bg-sand-noise"
        style={{
          backgroundColor: tone.to,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0), linear-gradient(135deg, ${tone.from}, ${tone.to})`,
          backgroundSize: "14px 14px, 100% 100%",
        }}
      >
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-800 shadow-sm">
          <Star size={12} className="fill-sun-500 text-sun-500" />
          {p.rating || "4.8"}
        </span>

        {availableBeds && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-bold text-white">
            <BedDouble size={12} />
            {availableBeds} beds free
          </span>
        )}

        <button
          aria-label="Favorite"
          onClick={(e) => {
            e.preventDefault();
            onFavorite?.();
          }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose-500 shadow-sm transition hover:scale-110 hover:bg-white"
        >
          <Heart
            size={15}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <Link to={`/properties/${p.slug || p.id}`} className="block p-4">
        <p className="flex items-center gap-1 text-xs font-semibold text-ink-500">
          <MapPin size={12} />
          {p.city || p.address}
        </p>

        <h3 className="mt-1 text-[15px] font-bold text-ink-900 transition group-hover:text-brand-600">
          {p.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {(p.tags || ["Co-living", "Wi-Fi"])
            .slice(0, compact ? 2 : 3)
            .map((t) => (
              <em key={t} className="chip not-italic">
                {t}
              </em>
            ))}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-sm font-bold text-ink-900">
            ₹{price}{" "}
            <span className="text-xs font-medium text-ink-400">
              / night
            </span>
          </p>

          <span className="text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
            View →
          </span>
        </div>
      </Link>
    </article>
  );
} 