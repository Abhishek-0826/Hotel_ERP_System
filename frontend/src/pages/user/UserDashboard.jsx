import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { propertyApi } from "../../api/services";
import ApiNotice from "../../components/ui/ApiNotice";
import LoadingState from "../../components/ui/LoadingState";
import { DEMO_MODE } from "../../config/demo";
import { demoProperties } from "../../data/demo/properties";

const allAmenities = ["WiFi", "AC", "Laundry", "Parking"];

export default function UserDashboard() {
  const navigate = useNavigate();

  /* ---------------- FILTER STATE ---------------- */

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("ALL");
  const [propertyType, setPropertyType] = useState("ALL");
  const [gender, setGender] = useState("ALL");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [minimumRating, setMinimumRating] = useState("0");

  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const [sortBy, setSortBy] = useState("recommended");

  const [showFilters, setShowFilters] = useState(false);

  const {
    data: liveProperties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useApi(
    () => propertyApi.list(),
    DEMO_MODE ? demoProperties : [],
    {
      transform: (response) => {
        const list =
          response?.data?.properties ||
          response?.data ||
          response?.properties ||
          (Array.isArray(response) ? response : []);

        return list.map((property) => ({
          ...property,
          location:
            property.location ||
            [property.address, property.city, property.state]
              .filter(Boolean)
              .join(", "),
          city: property.city || "",
          type: property.type || property.category || "Hostel",
          gender: property.gender || property.genderPolicy || "Mixed",
          amenities: Array.isArray(property.amenities) ? property.amenities : [],
          price: Number(property.price ?? property.startingPrice ?? 0),
          rating: Number(property.rating ?? 0),
          availableBeds: Number(property.availableBeds ?? property.availableBedCount ?? 0),
          featured: Boolean(property.featured),
        }));
      },
    }
  );

  /* ---------------- AMENITY FILTER ---------------- */

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity]
    );
  };

  /* ---------------- CLEAR FILTERS ---------------- */

  const clearFilters = () => {
    setSearch("");
    setCity("ALL");
    setPropertyType("ALL");
    setGender("ALL");
    setMinPrice("");
    setMaxPrice("");
    setMinimumRating("0");
    setOnlyAvailable(false);
    setFeaturedOnly(false);
    setSelectedAmenities([]);
    setSortBy("recommended");
  };

  /* ---------------- FILTER + SORT ---------------- */

  const filteredProperties = useMemo(() => {
    let result = (liveProperties || []).filter((property) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        property.name.toLowerCase().includes(searchText) ||
        property.location.toLowerCase().includes(searchText) ||
        property.city.toLowerCase().includes(searchText);

      const matchesCity =
        city === "ALL" || property.city === city;

      const matchesType =
        propertyType === "ALL" ||
        property.type === propertyType;

      const matchesGender =
        gender === "ALL" ||
        property.gender === gender;

      const matchesMinPrice =
        !minPrice || property.price >= Number(minPrice);

      const matchesMaxPrice =
        !maxPrice || property.price <= Number(maxPrice);

      const matchesRating =
        property.rating >= Number(minimumRating);

      const matchesAvailability =
        !onlyAvailable || property.availableBeds > 0;

      const matchesFeatured =
        !featuredOnly || property.featured;

      const matchesAmenities =
        selectedAmenities.length === 0 ||
        selectedAmenities.every((amenity) =>
          property.amenities.includes(amenity)
        );

      return (
        matchesSearch &&
        matchesCity &&
        matchesType &&
        matchesGender &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesRating &&
        matchesAvailability &&
        matchesFeatured &&
        matchesAmenities
      );
    });

    /* ---------------- SORT ---------------- */

    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    if (sortBy === "availability") {
      result.sort(
        (a, b) => b.availableBeds - a.availableBeds
      );
    }

    if (sortBy === "recommended") {
      result.sort((a, b) => {
        if (a.featured !== b.featured) {
          return b.featured - a.featured;
        }

        return b.rating - a.rating;
      });
    }

    return result;
  }, [
    search,
    city,
    propertyType,
    gender,
    minPrice,
    maxPrice,
    minimumRating,
    onlyAvailable,
    featuredOnly,
    selectedAmenities,
    sortBy,
    liveProperties,
  ]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              ROOST
            </h1>

            <p className="text-sm text-slate-500">
              Find your perfect stay
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => navigate("/my-bookings")}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              My bookings
            </button>

            <button
              onClick={() => navigate("/")}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Home
            </button>

          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN
      ========================================================= */}

      <main className="mx-auto max-w-7xl px-6 py-8">

        <ApiNotice message={propertiesError} />
        {propertiesLoading && <LoadingState label="Loading live properties..." />}

        {/* WELCOME */}

        <section>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back 👋
          </h2>

          <p className="mt-2 text-slate-500">
            Find a comfortable and affordable place to stay.
          </p>
        </section>

        {/* =====================================================
            SEARCH BAR
        ===================================================== */}

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto]">

            {/* Search */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city or property..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Check in */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Check-in
              </label>

              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            {/* Check out */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Check-out
              </label>

              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            {/* Filter button */}

            <div className="flex items-end">

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600 md:w-auto"
              >
                {showFilters ? "Hide filters" : "Filters ⚙"}
              </button>

            </div>

          </div>

          {/* ===================================================
              ADVANCED FILTERS
          =================================================== */}

          {showFilters && (
            <div className="mt-6 border-t pt-6">

              <div className="grid gap-6 md:grid-cols-3">

                {/* CITY */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    City
                  </label>

                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  >
                    <option value="ALL">All cities</option>
                    <option value="Satara">Satara</option>
                    <option value="Pune">Pune</option>
                  </select>
                </div>

                {/* PROPERTY TYPE */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Property type
                  </label>

                  <select
                    value={propertyType}
                    onChange={(e) =>
                      setPropertyType(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  >
                    <option value="ALL">All types</option>
                    <option value="Hostel">Hostel</option>
                    <option value="PG">PG</option>
                    <option value="Backpacker">
                      Backpacker
                    </option>
                  </select>
                </div>

                {/* GENDER */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Stay preference
                  </label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  >
                    <option value="ALL">All</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* MIN PRICE */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Minimum price
                  </label>

                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="₹ Min"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                {/* MAX PRICE */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Maximum price
                  </label>

                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="₹ Max"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                {/* RATING */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Minimum rating
                  </label>

                  <select
                    value={minimumRating}
                    onChange={(e) =>
                      setMinimumRating(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
                  >
                    <option value="0">Any rating</option>
                    <option value="3">3+ ⭐</option>
                    <option value="4">4+ ⭐</option>
                    <option value="4.5">4.5+ ⭐</option>
                  </select>
                </div>

              </div>

              {/* =================================================
                  CHECKBOX FILTERS
              ================================================= */}

              <div className="mt-6 flex flex-wrap gap-4">

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">

                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) =>
                      setOnlyAvailable(e.target.checked)
                    }
                    className="h-4 w-4"
                  />

                  Only available beds
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">

                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(e) =>
                      setFeaturedOnly(e.target.checked)
                    }
                    className="h-4 w-4"
                  />

                  Featured properties
                </label>

              </div>

              {/* =================================================
                  AMENITIES
              ================================================= */}

              <div className="mt-6">

                <p className="mb-3 text-sm font-medium text-slate-700">
                  Amenities
                </p>

                <div className="flex flex-wrap gap-2">

                  {allAmenities.map((amenity) => {

                    const selected =
                      selectedAmenities.includes(amenity);

                    return (
                      <button
                        key={amenity}
                        onClick={() =>
                          toggleAmenity(amenity)
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {amenity}
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* CLEAR */}

              <div className="mt-6 flex justify-end">

                <button
                  onClick={clearFilters}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Clear all filters
                </button>

              </div>

            </div>
          )}

        </section>

        {/* =====================================================
            RESULT HEADER
        ===================================================== */}

        <section className="mt-10">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Available stays
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {filteredProperties.length} properties found
              </p>
            </div>

            {/* SORT */}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none"
            >
              <option value="recommended">
                Recommended
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="price-high">
                Price: High to Low
              </option>

              <option value="rating">
                Highest Rated
              </option>

              <option value="availability">
                Most Available
              </option>
            </select>

          </div>

          {/* ===================================================
              PROPERTY CARDS
          =================================================== */}

          {filteredProperties.length === 0 ? (

            <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                🔍
              </div>

              <h4 className="mt-4 text-xl font-bold text-slate-900">
                No stays found
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your filters or search.
              </p>

              <button
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Clear filters
              </button>

            </div>

          ) : (

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredProperties.map((property) => (

                <div
                  key={property.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* IMAGE */}

                  <div className="relative flex h-48 items-center justify-center bg-slate-200 text-slate-500">

                    <span>
                      Property image
                    </span>

                    {property.featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-600 shadow">
                        ⭐ Featured
                      </span>
                    )}

                  </div>

                  {/* CONTENT */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h4 className="text-lg font-bold text-slate-900">
                          {property.name}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          📍 {property.location}
                        </p>

                      </div>

                      <div className="rounded-lg bg-yellow-50 px-2 py-1 text-sm font-semibold text-yellow-700">
                        ⭐ {property.rating}
                      </div>

                    </div>

                    {/* PRICE */}

                    <div className="mt-5 flex items-end justify-between">

                      <div>

                        <p className="text-2xl font-bold text-slate-900">
                          ₹{property.price}
                        </p>

                        <p className="text-xs text-slate-500">
                          per night
                        </p>

                      </div>

                      <span className="text-sm font-medium text-brand-500">
                        🛏 {property.availableBeds} available
                      </span>

                    </div>

                    {/* AMENITIES */}

                    <div className="mt-4 flex flex-wrap gap-2">

                      {property.amenities.slice(0, 3).map(
                        (amenity) => (
                          <span
                            key={amenity}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                          >
                            {amenity}
                          </span>
                        )
                      )}

                      {property.amenities.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          +{property.amenities.length - 3}
                        </span>
                      )}

                    </div>

                    {/* ACTION */}

                    <button
                      onClick={() =>
                        navigate(
                          `/properties/${property.slug}`
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      View rooms →
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>
    </div>
  );
}
