import { useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ManageTable from "../../components/owner/ManageTable";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useApi } from "../../hooks/useApi";
import { useAppState } from "../../context/AppStateContext";
import { propertyApi } from "../../api/services";
import { demoProperties } from "../../data/demo/properties";
import { useAuth } from "../../context/AuthContext";
import { canManageInventory } from "../../utils/roles";
import { getOwnerNav } from "./nav";

export default function PropertyManagement() {
  const { pushToast } = useAppState();
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);

  const {
    data: properties,
    loading,
    error,
    setData,
  } = useApi(
    () => propertyApi.mine(),
    demoProperties,
    {
      transform: (d) =>
        Array.isArray(d)
          ? d
          : [],
    }
  );

  const [modal, setModal] = useState(null);

  const rows = useMemo(
    () =>
      (properties || []).map((p) => ({
        id: p.id,
        cols: [
          p.name,
          p.city || "-",
          String(p.roomsCount ?? 0),
          String(p.bedsCount ?? 0),
          p.status || "PUBLISHED",
        ],
        raw: p,
      })),
    [properties]
  );

  const makeSlug = (name) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const save = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);

      const name = formData.get("name")?.trim();
      const city = formData.get("city")?.trim();
      const state = formData.get("state")?.trim();
      const postalCode = formData.get("postalCode")?.trim();
      const address = formData.get("address")?.trim();
      const description = formData.get("description")?.trim();

      if (!name || name.length < 2) {
        throw new Error("Property name must be at least 2 characters");
      }

      const payload = {
        name,
        slug: makeSlug(name),
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        description: description || undefined,
      };

      if (modal.mode === "add") {
        const created = await propertyApi.create(payload);

        setData((prev) => [created, ...(prev || [])]);

        pushToast({
          type: "success",
          title: "Property added",
          message: `${name} is now listed.`,
        });
      } else {
        const updated = await propertyApi.update(
          modal.property.id,
          payload
        );

        setData((prev) =>
          (prev || []).map((p) =>
            String(p.id) === String(modal.property.id)
              ? { ...p, ...updated }
              : p
          )
        );

        pushToast({
          type: "success",
          title: "Property updated",
          message: `${name} updated successfully.`,
        });
      }

      setModal(null);
    } catch (err) {
      pushToast({
        type: "error",
        title: "Property save failed",
        message:
          err?.message ||
          "Unable to save property",
      });
    }
  };

  // New properties start as DRAFT; guests only see PUBLISHED ones.
  const togglePublish = async (row) => {
    const next = row.raw.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await propertyApi.updateStatus(row.raw.id, next);
      setData((prev) =>
        (prev || []).map((p) => (String(p.id) === String(row.raw.id) ? { ...p, status: next } : p))
      );
      pushToast({
        type: "success",
        title: next === "PUBLISHED" ? "Property published" : "Property unpublished",
        message: next === "PUBLISHED" ? `${row.raw.name} is now visible to guests.` : `${row.raw.name} is hidden from guests.`,
      });
    } catch (err) {
      pushToast({ type: "error", title: "Status update failed", message: err?.message || "Unable to update status" });
    }
  };

  const remove = async (row) => {
    try {
      await propertyApi.remove(row.raw.id);

      setData((prev) =>
        (prev || []).filter(
          (p) => String(p.id) !== String(row.raw.id)
        )
      );

      pushToast({
        type: "success",
        title: "Property removed",
        message: row.raw.name,
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Delete failed",
        message:
          err?.message ||
          "Unable to delete property",
      });
    }
  };

  return (
    <DashboardLayout nav={getOwnerNav(user?.role)} title="Properties">
      <ManageTable
        title={canManage ? "Manage properties" : "Properties"}
        subtitle={canManage ? "Keep your listed spaces accurate and up to date." : "View the properties you work at."}
        addLabel="Add property"
        onAdd={canManage ? () => setModal({ mode: "add" }) : undefined}
        headers={[
          "Property",
          "City",
          "Rooms",
          "Beds",
          "Status",
        ]}
        rows={rows}
        loading={loading}
        error={error}
        statusColumnIndex={4}
        onEdit={canManage ? (row) =>
          setModal({
            mode: "edit",
            property: row.raw,
          }) : undefined
        }
        extraActions={canManage ? (row) => (
          <Button variant="outline" size="sm" onClick={() => togglePublish(row)}>
            {row.raw.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
        ) : undefined}
        onDelete={canManage ? remove : undefined}
        emptyTitle="No properties yet"
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.mode === "add"
            ? "Add property"
            : "Edit property"
        }
      >
        <form
          id="property-form"
          onSubmit={save}
          className="grid gap-4"
        >
          {/* PROPERTY NAME */}
          <label className="field">
            <span className="label">Property name</span>

            <input
              required
              name="name"
              className="input"
              placeholder="ROOST Hostel"
              defaultValue={
                modal?.property?.name || ""
              }
            />
          </label>

          {/* ADDRESS */}
          <label className="field">
            <span className="label">Address</span>

            <input
              name="address"
              className="input"
              placeholder="Main Road"
              defaultValue={
                modal?.property?.address || ""
              }
            />
          </label>

          {/* CITY */}
          <label className="field">
            <span className="label">City</span>

            <input
              required
              name="city"
              className="input"
              placeholder="Satara"
              defaultValue={
                modal?.property?.city || ""
              }
            />
          </label>

          {/* STATE */}
          <label className="field">
            <span className="label">State</span>

            <input
              name="state"
              className="input"
              placeholder="Maharashtra"
              defaultValue={
                modal?.property?.state || ""
              }
            />
          </label>

          {/* POSTAL CODE */}
          <label className="field">
            <span className="label">Postal code</span>

            <input
              name="postalCode"
              className="input"
              placeholder="415001"
              defaultValue={
                modal?.property?.postalCode || ""
              }
            />
          </label>

          {/* DESCRIPTION — LAST */}
          <label className="field">
            <span className="label">Description</span>

            <textarea
              name="description"
              className="input min-h-[100px]"
              placeholder="Affordable and comfortable hostel accommodation."
              defaultValue={
                modal?.property?.description || ""
              }
            />
          </label>
        </form>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 bg-white pt-3">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setModal(null)}
          >
            Cancel
          </Button>

          <Button
            variant="teal"
            size="sm"
            type="submit"
            form="property-form"
          >
            {modal?.mode === "add"
              ? "Add property"
              : "Save changes"}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
