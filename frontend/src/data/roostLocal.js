import { useCallback, useEffect, useState } from "react";

const KEY = "roost_frontdesk_data_v1";

const seed = {
  guests: [
    { id: "G-1001", name: "Aarav Mehta", phone: "+91 98765 41021", email: "aarav@example.com", gender: "Male", status: "In house", joined: "2026-08-24", room: "A-102" },
    { id: "G-1002", name: "Diya Sharma", phone: "+91 98765 41022", email: "diya@example.com", gender: "Female", status: "Reserved", joined: "2026-08-29", room: "B-201" },
    { id: "G-1003", name: "Kabir Khan", phone: "+91 98765 41023", email: "kabir@example.com", gender: "Male", status: "Checked out", joined: "2026-08-12", room: "—" },
    { id: "G-1004", name: "Meera Iyer", phone: "+91 98765 41024", email: "meera@example.com", gender: "Female", status: "In house", joined: "2026-08-19", room: "B-203" },
  ],
  bookings: [
    { id: "BK-2501", guest: "Aarav Mehta", guestId: "G-1001", checkIn: "2026-08-24", checkOut: "2026-09-24", bed: "A-102-2", amount: 12500, status: "Checked in" },
    { id: "BK-2502", guest: "Diya Sharma", guestId: "G-1002", checkIn: "2026-08-31", checkOut: "2026-09-30", bed: "B-201-1", amount: 11800, status: "Confirmed" },
    { id: "BK-2503", guest: "Kabir Khan", guestId: "G-1003", checkIn: "2026-08-12", checkOut: "2026-08-27", bed: "A-101-1", amount: 6200, status: "Completed" },
  ],
  beds: [
    { id: "A-101-1", room: "A-101", type: "Non-AC", status: "Occupied", guest: "Kabir Khan" },
    { id: "A-101-2", room: "A-101", type: "Non-AC", status: "Available", guest: "" },
    { id: "A-102-1", room: "A-102", type: "AC", status: "Reserved", guest: "" },
    { id: "A-102-2", room: "A-102", type: "AC", status: "Occupied", guest: "Aarav Mehta" },
    { id: "B-201-1", room: "B-201", type: "AC", status: "Reserved", guest: "Diya Sharma" },
    { id: "B-201-2", room: "B-201", type: "AC", status: "Available", guest: "" },
    { id: "B-202-1", room: "B-202", type: "Non-AC", status: "Maintenance", guest: "" },
    { id: "B-203-1", room: "B-203", type: "Non-AC", status: "Occupied", guest: "Meera Iyer" },
    { id: "B-203-2", room: "B-203", type: "Non-AC", status: "Available", guest: "" },
  ],
  payments: [
    { id: "PAY-401", guest: "Aarav Mehta", booking: "BK-2501", amount: 12500, method: "UPI", date: "2026-08-24", status: "Paid" },
    { id: "PAY-402", guest: "Diya Sharma", booking: "BK-2502", amount: 5000, method: "Card", date: "2026-08-29", status: "Partial" },
    { id: "PAY-403", guest: "Meera Iyer", booking: "BK-2504", amount: 11800, method: "Cash", date: "2026-08-19", status: "Paid" },
  ],
  staff: [
    { id: "ST-01", name: "Rohan Patil", role: "Housekeeping", phone: "+91 98765 33210", status: "Active" },
    { id: "ST-02", name: "Nisha Verma", role: "Receptionist", phone: "+91 98765 33211", status: "Active" },
    { id: "ST-03", name: "Vikram Rao", role: "Security", phone: "+91 98765 33212", status: "On leave" },
  ],
  inventory: [
    { id: "INV-01", name: "Bed sheets", category: "Linen", stock: 42, minStock: 25, unit: "pcs" },
    { id: "INV-02", name: "Bath towels", category: "Linen", stock: 12, minStock: 20, unit: "pcs" },
    { id: "INV-03", name: "Cleaning liquid", category: "Cleaning", stock: 8, minStock: 10, unit: "bottles" },
  ],
  complaints: [
    { id: "CMP-01", guest: "Aarav Mehta", subject: "Wi-Fi signal in room", date: "2026-08-29", status: "Open", priority: "Medium" },
    { id: "CMP-02", guest: "Meera Iyer", subject: "AC noise", date: "2026-08-28", status: "In progress", priority: "High" },
  ],
  feedback: [
    { id: "FDB-01", guest: "Kabir Khan", rating: 5, comment: "Very clean and helpful staff.", date: "2026-08-27" },
    { id: "FDB-02", guest: "Aarav Mehta", rating: 4, comment: "Comfortable stay, Wi-Fi could be stronger.", date: "2026-08-29" },
  ],
  users: [
    { id: "USR-01", name: "Priya Shah", email: "priya@roost.in", role: "Manager", status: "Active" },
    { id: "USR-02", name: "Nisha Verma", email: "nisha@roost.in", role: "Receptionist", status: "Active" },
    { id: "USR-03", name: "Ankit Joshi", email: "ankit@roost.in", role: "Receptionist", status: "Inactive" },
  ],
  refunds: [{ id: "RF-01", guest: "Kabir Khan", amount: 800, reason: "Early checkout", date: "2026-08-27", status: "Pending" }],
  auditLogs: [
    { id: "LOG-01", user: "Nisha Verma", action: "Checked in Aarav Mehta", date: "2026-08-29 10:24" },
    { id: "LOG-02", user: "Priya Shah", action: "Updated inventory: Bath towels", date: "2026-08-29 09:10" },
  ],
};

export function getRoostData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === "object" ? { ...seed, ...saved } : structuredClone(seed);
  } catch { return structuredClone(seed); }
}

export function setRoostData(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function resetRoostData() { setRoostData(structuredClone(seed)); window.dispatchEvent(new Event("roost-data")); }

export function useRoostData() {
  const [data, setData] = useState(getRoostData);
  useEffect(() => {
    const refresh = () => setData(getRoostData());
    window.addEventListener("roost-data", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("roost-data", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const update = useCallback((change) => {
    setData((current) => {
      const next = typeof change === "function" ? change(current) : change;
      setRoostData(next);
      window.dispatchEvent(new Event("roost-data"));
      return next;
    });
  }, []);
  return [data, update];
}

export function newId(prefix, list = []) { return `${prefix}-${String(list.length + 1).padStart(3, "0")}`; }
