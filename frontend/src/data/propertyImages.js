/**
 * Centralized temporary hotel/property images for Royal Stay.
 * Replace these URLs with actual Royal Stay photos when available.
 * All images sourced from Unsplash (free to use).
 */

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=80";

export const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80";

export const LOCATION_IMAGE =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80";

/** Featured rooms shown on the landing page */
export const FEATURED_ROOMS = [
  {
    id: "deluxe-king",
    name: "Deluxe King Room",
    description: "Spacious room with king-size bed, city view, and premium amenities.",
    capacity: "2 guests",
    price: 4500,
    amenities: ["King Bed", "City View", "Free Wi-Fi", "AC", "Room Service"],
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
  },
  {
    id: "premium-suite",
    name: "Premium Suite",
    description: "Luxurious suite with separate living area, jacuzzi, and panoramic views.",
    capacity: "2 guests",
    price: 8500,
    amenities: ["King Bed", "Jacuzzi", "Living Area", "Free Wi-Fi", "AC"],
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80",
  },
  {
    id: "standard-twin",
    name: "Standard Twin Room",
    description: "Comfortable twin room ideal for business travelers or friends.",
    capacity: "2 guests",
    price: 3200,
    amenities: ["Twin Beds", "Free Wi-Fi", "AC", "Work Desk"],
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80",
  },
];

/** Gallery photos with categories. Replace with actual Royal Stay photos. */
export const GALLERY_PHOTOS = [
  {
    id: 1,
    category: "Exterior",
    title: "Hotel Exterior",
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70",
  },
  {
    id: 2,
    category: "Rooms",
    title: "Deluxe King Room",
    url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=70",
  },
  {
    id: 3,
    category: "Rooms",
    title: "Premium Suite",
    url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&q=70",
  },
  {
    id: 4,
    category: "Rooms",
    title: "Twin Room",
    url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=70",
  },
  {
    id: 5,
    category: "Reception",
    title: "Hotel Lobby",
    url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=70",
  },
  {
    id: 6,
    category: "Dining",
    title: "Restaurant",
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70",
  },
  {
    id: 7,
    category: "Bathroom",
    title: "Luxury Bathroom",
    url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=70",
  },
  {
    id: 8,
    category: "Amenities",
    title: "Swimming Pool",
    url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=70",
  },
  {
    id: 9,
    category: "Amenities",
    title: "Fitness Center",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70",
  },
  {
    id: 10,
    category: "Property",
    title: "Garden View",
    url: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=400&q=70",
  },
  {
    id: 11,
    category: "Exterior",
    title: "Night Exterior",
    url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=70",
  },
  {
    id: 12,
    category: "Dining",
    title: "Breakfast Area",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    thumb: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=70",
  },
];

export const GALLERY_CATEGORIES = ["All", "Exterior", "Rooms", "Reception", "Bathroom", "Dining", "Amenities", "Property"];
