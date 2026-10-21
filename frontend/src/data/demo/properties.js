export const demoProperties = [
  {
    id: "p1", slug: "roost-hostel", name: "Roost Hostel",
    city: "Koramangala, Bengaluru", address: "4th Block, Koramangala, Bengaluru",
    price: 300, rating: "4.8", reviews: 124, tone: "blue",
    tags: ["Co-living", "Wi-Fi", "AC"],
    description: "A calm, sociable base minutes from cafés, transport and work hubs. Bright common areas, fast Wi-Fi and a host team that keeps things running smoothly.",
    amenities: ["Fast Wi-Fi", "Air conditioning", "Hot water", "Parking", "24/7 security", "Laundry"],
    roomsCount: 6, bedsCount: 28, status: "ACTIVE",
  },
  {
    id: "p2", slug: "sunrise-hostel", name: "Sunrise Hostel",
    city: "Hinjewadi, Pune", address: "Phase 2, Hinjewadi, Pune",
    price: 350, rating: "4.7", reviews: 98, tone: "gold",
    tags: ["Women only", "Breakfast", "AC"],
    description: "A welcoming, well-run home for a better daily routine, with breakfast included and a strong community of long-term residents.",
    amenities: ["Fast Wi-Fi", "Air conditioning", "Breakfast", "Housekeeping", "24/7 security", "Laundry"],
    roomsCount: 5, bedsCount: 22, status: "ACTIVE",
  },
  {
    id: "p3", slug: "grand-horizon", name: "Grand Horizon",
    city: "Indiranagar, Bengaluru", address: "100 Feet Road, Indiranagar, Bengaluru",
    price: 420, rating: "4.9", reviews: 211, tone: "green",
    tags: ["Co-living", "Parking", "Wi-Fi"],
    description: "Thoughtful shared living with generous common spaces, a rooftop lounge and easy access to the city's best cafés.",
    amenities: ["Fast Wi-Fi", "Air conditioning", "Rooftop lounge", "Parking", "24/7 security", "Gym access"],
    roomsCount: 8, bedsCount: 34, status: "ACTIVE",
  },
  {
    id: "p4", slug: "modern-forest", name: "Modern Forest",
    city: "Banjara Hills, Hyderabad", address: "Road No. 12, Banjara Hills, Hyderabad",
    price: 280, rating: "4.6", reviews: 76, tone: "lilac",
    tags: ["Men only", "Laundry", "Wi-Fi"],
    description: "A simple, friendly option close to the city with everything you need and nothing you don't.",
    amenities: ["Fast Wi-Fi", "Laundry", "Hot water", "Parking", "24/7 security"],
    roomsCount: 4, bedsCount: 18, status: "ACTIVE",
  },
];

export const demoRooms = [
  { id: "r101", propertyId: "p1", propertySlug: "roost-hostel", number: "Room 101", type: "Co-living · AC", bedsCount: 4, status: "ACTIVE" },
  { id: "r102", propertyId: "p1", propertySlug: "roost-hostel", number: "Room 102", type: "Single · AC", bedsCount: 2, status: "ACTIVE" },
  { id: "r201", propertyId: "p2", propertySlug: "sunrise-hostel", number: "Room 201", type: "Co-living · AC", bedsCount: 4, status: "ACTIVE" },
];

export const demoBeds = [
  { id: "101-A", roomId: "r101", room: "Room 101", kind: "UPPER", price: 300, status: "AVAILABLE" },
  { id: "101-B", roomId: "r101", room: "Room 101", kind: "LOWER", price: 350, status: "AVAILABLE" },
  { id: "101-C", roomId: "r101", room: "Room 101", kind: "UPPER", price: 300, status: "BOOKED" },
  { id: "101-D", roomId: "r101", room: "Room 101", kind: "LOWER", price: 350, status: "MAINTENANCE" },
  { id: "102-A", roomId: "r102", room: "Room 102", kind: "SINGLE", price: 400, status: "AVAILABLE" },
  { id: "102-B", roomId: "r102", room: "Room 102", kind: "SINGLE", price: 400, status: "AVAILABLE" },
];

export const demoBookings = [
  { code: "ROOST-1001", guest: "Rahul Sharma", property: "Roost Hostel", room: "Room 101", bed: "101-A", dates: "03–10 Sep 2026", checkIn: "2026-09-03", checkOut: "2026-09-10", status: "PENDING", amount: "₹2,100" },
  { code: "ROOST-1002", guest: "Amit Patil", property: "Grand Horizon", room: "Room 302", bed: "302-B", dates: "01–04 Sep 2026", checkIn: "2026-09-01", checkOut: "2026-09-04", status: "CONFIRMED", amount: "₹1,260" },
  { code: "ROOST-1003", guest: "Sneha Kulkarni", property: "Sunrise Hostel", room: "Room 201", bed: "201-C", dates: "08–12 Sep 2026", checkIn: "2026-09-08", checkOut: "2026-09-12", status: "CONFIRMED", amount: "₹1,400" },
  { code: "ROOST-1004", guest: "Priya Nair", property: "Modern Forest", room: "Room 104", bed: "104-A", dates: "15–20 Sep 2026", checkIn: "2026-09-15", checkOut: "2026-09-20", status: "CANCELLED", amount: "₹1,400" },
];

export const demoNotifications = [
  { id: "n1", title: "New booking received", body: "Rahul Sharma booked Bed 101-A at Roost Hostel.", time: "2m ago", unread: true, type: "booking" },
  { id: "n2", title: "Payment confirmed", body: "₹2,100 received for ROOST-1001.", time: "1h ago", unread: true, type: "payment" },
  { id: "n3", title: "Maintenance reminder", body: "Bed 101-D marked under maintenance for 3 days.", time: "Yesterday", unread: false, type: "system" },
  { id: "n4", title: "New message", body: "Sneha Kulkarni sent you a message.", time: "2 days ago", unread: false, type: "chat" },
];

export const demoConversations = [
  {
    id: "c1", name: "Rahul Sharma", topic: "Late check-in query", online: true, propertyTag: "Roost Hostel", bookingCode: "ROOST-1001",
    messages: [
      { from: "them", text: "Hi, is late check-in available?", time: "10:32 AM" },
      { from: "me", text: "Yes, our property supports late check-in. I'll make a note for the host team.", time: "10:34 AM" },
    ],
  },
  {
    id: "c2", name: "Sneha Kulkarni", topic: "Booking question", online: false, propertyTag: "Sunrise Hostel", bookingCode: "ROOST-1003",
    messages: [
      { from: "them", text: "Does the room have an attached bathroom?", time: "Yesterday" },
      { from: "me", text: "Room 201 has a shared bathroom on the same floor.", time: "Yesterday" },
    ],
  },
  {
    id: "c3", name: "Amit Patil", topic: "Refund status", online: false, propertyTag: "Grand Horizon", bookingCode: "ROOST-1002",
    messages: [
      { from: "them", text: "Any update on my refund?", time: "2 days ago" },
    ],
  },
];

export const demoAnalytics = {
  owner: {
    stats: [
      { label: "Total properties", value: "04" },
      { label: "Available beds", value: "32" },
      { label: "Bookings today", value: "12" },
      { label: "Monthly revenue", value: "₹1.8L" },
    ],
    occupancy: [55, 72, 48, 84, 68, 93, 75],
    occupancyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  admin: {
    stats: [
      { label: "Verified properties", value: "128" },
      { label: "Active guests", value: "8,420" },
      { label: "Bookings this month", value: "2,814" },
      { label: "Platform GMV", value: "₹42.8L" },
    ],
    growth: [30, 42, 38, 55, 61, 58, 70, 78, 74, 85, 91, 96],
    growthLabels: ["J","F","M","A","M","J","J","A","S","O","N","D"],
  },
};
