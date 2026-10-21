import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import PropertyCard from "../../components/property/PropertyCard";
import { CardSkeleton } from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ApiNotice from "../../components/ui/ApiNotice";

import { useApi } from "../../hooks/useApi";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { useAppState } from "../../context/AppStateContext";
import { propertyApi } from "../../api/services";

export default function PropertySearch() {
  const [params] = useSearchParams();

  const { favorites, toggleFavorite } = useAppState();

  const city = params.get("city");

  // Get properties directly from backend
  const {
    data: items,
    loading,
    error,
  } = useApi(
    () => propertyApi.list({ city }),
    [],
    {
      deps: [city],
      transform: (d) => {
        if (Array.isArray(d)) return d;

        if (Array.isArray(d?.properties)) {
          return d.properties;
        }

        if (Array.isArray(d?.data)) {
          return d.data;
        }

        return [];
      },
    }
  );

  /*
   * Group properties area/city wise
   */
  const paging = usePagination(items || [], { pageSize: 12, resetKey: city });

  const areas = useMemo(() => {
    const grouped = {};

    paging.pageItems.forEach((property) => {
      const area =
        property.city ||
        property.area ||
        property.address ||
        "Other Areas";

      if (!grouped[area]) {
        grouped[area] = [];
      }

      grouped[area].push(property);
    });

    return grouped;
  }, [paging.pageItems]);

  return (
    <>
      <Navbar />

      {/* Header */}
      <header className="border-b border-ink-100 bg-white py-8">
        <div className="container-page">
          <p className="text-xs font-semibold text-ink-400">
            Home / Find a bed
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">
            {city ? `Places to stay in ${city}` : "Find your next stay"}
          </h1>

          <p className="mt-1 text-sm text-ink-500">
            Explore available stays area wise.
          </p>
        </div>
      </header>

      {/* Properties */}
      <main className="container-page py-8">

        <ApiNotice message={error} />

        {/* Loading */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((x) => (
              <CardSkeleton key={x} className="h-64" />
            ))}
          </div>
        ) : Object.keys(areas).length ? (

          <div className="space-y-12">

            {Object.entries(areas).map(([area, properties]) => (
              <section key={area}>

                {/* Area heading */}
                <div className="mb-5">
                  <h2 className="text-xl font-extrabold text-ink-900">
                    {area}
                  </h2>

                  <p className="mt-1 text-sm text-ink-500">
                    {properties.length}{" "}
                    {properties.length === 1 ? "place" : "places"} available
                  </p>
                </div>

                {/* Area properties */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.slug || property.id}
                      property={property}
                      favorite={favorites.includes(
                        property.slug || property.id
                      )}
                      onFavorite={() =>
                        toggleFavorite(
                          property.slug || property.id
                        )
                      }
                    />
                  ))}
                </div>

              </section>
            ))}

            <Pagination {...paging} />
          </div>

        ) : (

          <EmptyState
            title="No properties available"
            body={
              city
                ? `No properties are currently available in ${city}.`
                : "No properties are currently available."
            }
          />

        )}
      </main>

      <Footer />
    </>
  );
}