import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import ScrollToTop from "./components/layout/ScrollToTop";
import SiteLayout from "./components/layout/SiteLayout";
import Toasts from "./components/ui/Toasts";

import {
  ADMIN_ROLES,
  GUEST_ROLES,
  OWNER_ROLES,
  STAFF_ROLES,
  MANAGER_ROLES,
  RECEPTIONIST_ROLES,
  ALL_ROLES,
} from "./utils/roles";

import { useAuth } from "./context/AuthContext";

// ==================== PUBLIC PAGES ====================

import TenantHome from "./pages/TenantHome";
import OwnerSetup from "./pages/owner/OwnerSetup";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import Contact from "./pages/static/Contact";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";

// ==================== PROPERTY PAGES ====================

import PropertySearch from "./pages/properties/PropertySearch";
import PropertyDetails from "./pages/properties/PropertyDetails";
import BedAvailability from "./pages/properties/BedAvailability";

// ==================== BOOKING PAGES ====================

import GuestDetails from "./pages/booking/GuestDetails";
import BookingReview from "./pages/booking/BookingReview";
import BookingSuccess from "./pages/booking/BookingSuccess";
import MyBookings from "./pages/booking/MyBookings";
import BookingDetails from "./pages/booking/BookingDetails";

// ==================== GUEST PAGES ====================

import UserDashboard from "./pages/user/UserDashboard";

import {
  ForgotPassword,
  RoomDetails,
  Rooms,
  UserBookingDetails,
  UserBookingNew,
  UserBookings,
  UserComplaints,
  UserDashboard as UserPortalDashboard,
  UserFeedback,
  UserPaymentDetails,
  UserPayments,
  UserProfile,
} from "./pages/user/UserPortalPages";

// ==================== OWNER / STAFF ====================

import OwnerOverview from "./pages/owner/OwnerOverview";
import PropertyManagement from "./pages/owner/PropertyManagement";
import RoomBedManagement from "./pages/owner/RoomBedManagement";
import OwnerBookings from "./pages/owner/OwnerBookings";

// ==================== GENERATED PAGES ====================

import {
  ManagerDashboard,
  ReceptionDashboard,
  StaffDashboard,
  GuestList,
  GuestRegister,
  GuestProfile,
  BookingList,
  BookingNew,
  BedGrid,
  BedAllocation,
  CheckOut,
  InvoiceList,
  Refunds,
  StaffList,
  Inventory,
  Complaints,
  Feedback,
  UsersAdmin,
  ManagersAdmin,
  ReceptionistsAdmin,
  AccessControl,
  Reports,
  BusinessIntelligence,
  BiWeekly,
  BiMonthly,
  SystemSettings,
  Cameras,
  Backup,
  AuditLogs,
} from "./pages/GeneratedPages";

import CheckInPage from "./pages/operations/CheckInPage";
import PaymentsPage from "./pages/operations/PaymentsPage";
import AccountPage from "./pages/AccountPage";
import InvoicePage from "./pages/InvoicePage";
import ReportPage from "./pages/ReportPage";

// ==================== ROLE PAGE ====================

function RolePage({ guest: GuestPage, staff: StaffPage }) {
  const { user } = useAuth();

  return user?.role === "GUEST"
    ? <GuestPage />
    : <StaffPage />;
}

// ==================== APP ====================

export default function App() {
  const operationsRoles = [
    ...OWNER_ROLES,
    ...STAFF_ROLES,
    ...MANAGER_ROLES,
    ...RECEPTIONIST_ROLES,
  ];
  const tenantAuthenticatedRoles = [...GUEST_ROLES, ...operationsRoles];
  const inventoryRoles = [...OWNER_ROLES, ...MANAGER_ROLES];
  const reportRoles = [...ADMIN_ROLES, ...OWNER_ROLES, ...MANAGER_ROLES];
  const ownerAdmin = [...ADMIN_ROLES, ...OWNER_ROLES];

  const guarded = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

  return (
    <>
      <ScrollToTop />
      <Routes>

        {/* ==================================================
            AUTH (no sidebar)
        ================================================== */}

        <Route path="/login" element={<Login />} />
        <Route path="/properties/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ==================================================
            SITE PAGES — signed-in users get the sidebar on all of them
        ================================================== */}

        <Route element={<SiteLayout />}>
          <Route path="/" element={<TenantHome />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/gallery" element={<Gallery />} />

          {/* Property discovery */}
          <Route path="/properties" element={<PropertySearch />} />
          <Route path="/properties/:slug" element={<PropertyDetails />} />
          <Route path="/properties/:slug/availability" element={<BedAvailability />} />

          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetails />} />

          {/* Booking flow */}
          <Route path="/booking/guest-details" element={<GuestDetails />} />
          <Route path="/booking/review" element={<BookingReview />} />
          <Route path="/booking/success" element={<BookingSuccess />} />
          <Route path="/booking" element={guarded(tenantAuthenticatedRoles, <BookingDetails />)} />
          <Route path="/booking/:code" element={<BookingDetails />} />

          {/* Guest bookings */}
          <Route path="/user" element={guarded(GUEST_ROLES, <UserDashboard />)} />
          <Route path="/my-bookings" element={guarded(GUEST_ROLES, <MyBookings />)} />

          {/* Documents */}
          <Route path="/invoices/:id" element={guarded(operationsRoles, <InvoicePage />)} />
          <Route path="/reports/download" element={guarded(reportRoles, <ReportPage />)} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ==================================================
            GUEST PORTAL
        ================================================== */}

        <Route path="/dashboard" element={guarded(GUEST_ROLES, <UserPortalDashboard />)} />
        <Route path="/profile" element={guarded(GUEST_ROLES, <UserProfile />)} />
        <Route path="/account" element={guarded(ALL_ROLES, <AccountPage />)} />
        <Route path="/bookings" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserBookings} staff={BookingList} />)} />
        <Route path="/bookings/new" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserBookingNew} staff={BookingNew} />)} />
        <Route path="/bookings/:id" element={guarded(GUEST_ROLES, <UserBookingDetails />)} />
        <Route path="/my-booking" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserBookings} staff={BookingList} />)} />
        <Route path="/payments" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserPayments} staff={PaymentsPage} />)} />
        <Route path="/payments/:id" element={guarded(GUEST_ROLES, <UserPaymentDetails />)} />
        <Route path="/complaints" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserComplaints} staff={Complaints} />)} />
        <Route path="/feedback" element={guarded(tenantAuthenticatedRoles, <RolePage guest={UserFeedback} staff={Feedback} />)} />

        {/* ==================================================
            OWNER AND STAFF
        ================================================== */}

        <Route path="/owner/setup" element={guarded(["OWNER"], <OwnerSetup />)} />
        <Route path="/owner" element={guarded(OWNER_ROLES, <OwnerOverview />)} />
        <Route path="/owner/properties" element={guarded(OWNER_ROLES, <PropertyManagement />)} />
        <Route path="/owner/rooms" element={guarded(OWNER_ROLES, <RoomBedManagement />)} />
        <Route path="/owner/bookings" element={guarded(OWNER_ROLES, <OwnerBookings />)} />

        {/* ==================================================
            DASHBOARDS
        ================================================== */}

        <Route path="/manager/dashboard" element={guarded(MANAGER_ROLES, <ManagerDashboard />)} />
        <Route path="/staff/dashboard" element={guarded(STAFF_ROLES, <StaffDashboard />)} />
        <Route path="/reception/dashboard" element={guarded(RECEPTIONIST_ROLES, <ReceptionDashboard />)} />

        {/* ==================================================
            GUESTS, BEDS, STAY
        ================================================== */}

        <Route path="/guests" element={guarded(operationsRoles, <GuestList />)} />
        <Route path="/guests/register" element={guarded(operationsRoles, <GuestRegister />)} />
        <Route path="/guests/:id" element={guarded(operationsRoles, <GuestProfile />)} />
        <Route path="/beds" element={guarded(operationsRoles, <BedGrid />)} />
        <Route path="/bed-allocation" element={guarded(operationsRoles, <BedAllocation />)} />
        <Route path="/check-in" element={guarded(operationsRoles, <CheckInPage />)} />
        <Route path="/check-out" element={guarded(operationsRoles, <CheckOut />)} />

        {/* ==================================================
            FINANCE
        ================================================== */}

        <Route path="/invoices" element={guarded(operationsRoles, <InvoiceList />)} />
        <Route path="/refunds" element={guarded([...OWNER_ROLES, ...MANAGER_ROLES, ...STAFF_ROLES], <Refunds />)} />

        {/* ==================================================
            MANAGEMENT
        ================================================== */}

        <Route path="/staff" element={guarded([...ADMIN_ROLES, ...OWNER_ROLES, ...MANAGER_ROLES], <StaffList />)} />
        <Route path="/inventory" element={guarded(inventoryRoles, <Inventory />)} />

        {/* ==================================================
            ADMIN
        ================================================== */}

        <Route path="/users" element={guarded(ownerAdmin, <UsersAdmin />)} />
        <Route path="/managers" element={guarded(ownerAdmin, <ManagersAdmin />)} />
        <Route path="/receptionists" element={guarded(ownerAdmin, <ReceptionistsAdmin />)} />
        <Route path="/access-control" element={guarded(ADMIN_ROLES, <AccessControl />)} />
        <Route path="/reports" element={guarded(reportRoles, <Reports />)} />
        <Route path="/bi" element={guarded(ownerAdmin, <BusinessIntelligence />)} />
        <Route path="/bi/weekly" element={guarded(ownerAdmin, <BiWeekly />)} />
        <Route path="/bi/monthly" element={guarded(ownerAdmin, <BiMonthly />)} />

        {/* ==================================================
            SYSTEM
        ================================================== */}

        <Route path="/settings" element={guarded(ownerAdmin, <SystemSettings />)} />
        <Route path="/cameras" element={guarded(ADMIN_ROLES, <Cameras />)} />
        <Route path="/backup" element={guarded(ADMIN_ROLES, <Backup />)} />
        <Route path="/audit-logs" element={guarded(ownerAdmin, <AuditLogs />)} />

      </Routes>

      <Toasts />
    </>
  );
}
