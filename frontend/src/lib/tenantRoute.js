// Every hotel lives under its own first URL segment: /<hotel-slug>/...
// "/" and "/platform/..." belong to the ROOST platform itself.
const PLATFORM_SEGMENTS = new Set(["", "platform"]);

export const getFirstSegment = (pathname = window.location.pathname) =>
  pathname.split("/")[1]?.toLowerCase() || "";

export const isPlatformPath = (pathname) => PLATFORM_SEGMENTS.has(getFirstSegment(pathname));

/** Hotel slug for the current URL, or null on platform pages. */
export const getTenantSlug = (pathname) => (isPlatformPath(pathname) ? null : getFirstSegment(pathname));

/** "/sunrise-test" on hotel pages, "" on platform pages. Use for absolute links sent by email. */
export const getBasePath = () => {
  const slug = getTenantSlug();
  return slug ? `/${slug}` : "";
};
