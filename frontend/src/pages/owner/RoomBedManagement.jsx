import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ManageTable from "../../components/owner/ManageTable";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { useApi } from "../../hooks/useApi";
import { useAppState } from "../../context/AppStateContext";
import { bedApi, propertyApi, roomApi } from "../../api/services";
import { demoBeds } from "../../data/demo/properties";
import { useAuth } from "../../context/AuthContext";
import { canManageInventory } from "../../utils/roles";
import { getOwnerNav } from "./nav";

export default function RoomBedManagement() {
  const { pushToast } = useAppState();
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);

  const [searchParams] = useSearchParams();
  const [propertyId, setPropertyId] = useState(searchParams.get("property") || "");
  const [roomId, setRoomId] = useState("");

  const { data: properties = [] } = useApi(() => propertyApi.mine(), [], {});
  const { data: rooms = [], reload: reloadRooms } = useApi(
    () => propertyId ? roomApi.list(propertyId) : Promise.resolve([]),
    [],
    { deps: [propertyId] }
  );

  useEffect(() => {
    if (!propertyId && properties.length) setPropertyId(String(properties[0].id));
  }, [properties, propertyId]);

  // After adding a room, select it instead of jumping back to the first one.
  const roomToSelect = useRef(null);
  useEffect(() => {
    const wanted = rooms.find((room) => String(room.id) === roomToSelect.current);
    roomToSelect.current = null;
    setRoomId(wanted ? String(wanted.id) : rooms.length ? String(rooms[0].id) : "");
  }, [rooms]);

  const {
    data: beds,
    loading,
    error,
    setData,
  } = useApi(
    () => roomId ? bedApi.list(roomId) : Promise.resolve([]),
    demoBeds,
    {
      deps: [roomId],
      transform: (response) => Array.isArray(response) ? response : [],
    }
  );

  const [modal, setModal] = useState(null);
  const [roomModal, setRoomModal] = useState(null);

  const saveRoom = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const payload = {
      roomNumber: values.roomNumber.trim(),
      genderPolicy: values.genderPolicy,
      hasAc: values.hasAc === "on",
      hasAttachedBathroom: values.hasAttachedBathroom === "on",
      basePrice: Number(values.basePrice),
      ...(values.floor !== "" ? { floor: Number(values.floor) } : {}),
    };

    try {
      const created = await roomApi.create(propertyId, payload);
      roomToSelect.current = String(created.id);
      await reloadRooms();
      setRoomModal(null);
      pushToast({ type: "success", title: "Room added", message: `Room ${payload.roomNumber} is ready for beds.` });
    } catch (err) {
      pushToast({ type: "error", title: "Room save failed", message: err?.message || "Unable to save room" });
    }
  };

  const rows = useMemo(
    () =>
      (beds || []).map((b) => ({
        id: b.id,
        cols: [
          b.bedCode || b.id,
          rooms.find((room) => String(room.id) === String(b.roomId))?.roomNumber || "-",
          b.position || "-",
          `₹${b.priceOverride || 0}`,
          b.status || "AVAILABLE",
        ],
        raw: b,
      })),
    [beds, rooms]
  );

  const save = async (e) => {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget));

    try {
      if (modal.mode === "add") {
        const payload = {
          bedCode: values.bedCode,
          position: values.position,
          priceOverride:
            values.priceOverride !== ""
              ? Number(values.priceOverride)
              : null,
        };

        const createdBed = await bedApi.create(roomId, payload);

        setData((prev) => [createdBed, ...(prev || [])]);

        pushToast({
          type: "success",
          title: "Bed added",
          message: values.bedCode,
        });
      } else {
        const payload = {
          bedCode: values.bedCode,
          position: values.position,
          priceOverride:
            values.priceOverride !== ""
              ? Number(values.priceOverride)
              : null,
          status: values.status,
        };

        const updatedBed = await bedApi.update(
          modal.bed.id,
          payload
        );

        setData((prev) =>
          (prev || []).map((b) =>
            String(b.id) === String(modal.bed.id)
              ? updatedBed
              : b
          )
        );

        pushToast({
          type: "success",
          title: "Bed updated",
        });
      }

      setModal(null);
    } catch (err) {
      pushToast({
        type: "error",
        title: "Bed save failed",
        message:
          err?.message ||
          "Unable to save bed",
      });
    }
  };

  return (
    <DashboardLayout nav={getOwnerNav(user?.role)} title="Rooms & beds">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label className="field"><span className="label">Property</span><select className="input" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
        <label className="field"><span className="label">Room</span><select className="input" value={roomId} onChange={(event) => setRoomId(event.target.value)}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}</select></label>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {!canManage
            ? rooms.length ? "Pick a room to view its beds." : "No rooms have been added to this property yet."
            : !propertyId
              ? "Add a property first, then create its rooms here."
              : rooms.length
                ? "Pick a room to manage its beds, or add another room."
                : "This property has no rooms yet. Add a room, then add beds to it."}
        </p>
        {canManage && <Button variant="teal" size="sm" disabled={!propertyId} onClick={() => setRoomModal({})}>Add room</Button>}
      </div>
      <ManageTable
        title="Manage rooms & beds"
        subtitle={canManage ? "Add rooms, configure beds and mark maintenance windows." : "View rooms and bed availability."}
        addLabel="Add bed"
        onAdd={canManage && roomId ? () => setModal({ mode: "add" }) : undefined}
        headers={[
          "Room / bed",
          "Property",
          "Position",
          "Price",
          "Status",
        ]}
        rows={rows}
        loading={loading}
        error={error}
        statusColumnIndex={4}
        onEdit={canManage ? (r) =>
          setModal({
            mode: "edit",
            bed: r.raw,
          }) : undefined
        }
        emptyTitle="No beds yet"
      />

      <Modal open={!!roomModal} onClose={() => setRoomModal(null)} title="Add room">
        <form id="room-form" onSubmit={saveRoom} className="grid gap-4">
          <label className="field"><span className="label">Room number</span><input required name="roomNumber" maxLength={50} className="input" placeholder="e.g. 101" /></label>
          <label className="field"><span className="label">Floor</span><input name="floor" type="number" step="1" className="input" placeholder="Optional" /></label>
          <label className="field"><span className="label">Gender policy</span>
            <select name="genderPolicy" className="input" defaultValue="MIXED">
              <option value="MIXED">MIXED</option>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
            </select>
          </label>
          <label className="field"><span className="label">Base price / night</span><input required name="basePrice" type="number" min="1" step="any" className="input" /></label>
          <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" name="hasAc" /> Air conditioned</label>
          <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" name="hasAttachedBathroom" /> Attached bathroom</label>
        </form>
        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 bg-white pt-3">
          <Button variant="outline" size="sm" type="button" onClick={() => setRoomModal(null)}>Cancel</Button>
          <Button variant="teal" size="sm" type="submit" form="room-form">Save room</Button>
        </div>
      </Modal>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.mode === "add"
            ? "Add bed"
            : "Edit bed"
        }
      >
        <form
          id="bed-form"
          onSubmit={save}
          className="grid gap-4"
        >
          <label className="field">
            <span className="label">Bed code</span>

            <input
              required
              name="bedCode"
              className="input"
              placeholder="e.g. 101-A"
              defaultValue={
                modal?.bed?.bedCode || ""
              }
            />
          </label>

          <label className="field">
            <span className="label">Position</span>

            <select
              name="position"
              className="input"
              defaultValue={
                modal?.bed?.position || "UPPER"
              }
            >
              <option value="UPPER">UPPER</option>
              <option value="LOWER">LOWER</option>
              <option value="SINGLE">SINGLE</option>
            </select>
          </label>

          <label className="field">
            <span className="label">
              Price / night
            </span>

            <input
              required
              type="number"
              name="priceOverride"
              className="input"
              min="0"
              defaultValue={
                modal?.bed?.priceOverride || ""
              }
            />
          </label>

          {modal?.mode === "edit" && (
            <label className="field">
              <span className="label">Status</span>

              <select
                name="status"
                className="input"
                defaultValue={
                  modal?.bed?.status ||
                  "AVAILABLE"
                }
              >
                <option value="AVAILABLE">
                  AVAILABLE
                </option>

                <option value="BOOKED">
                  BOOKED
                </option>

                <option value="MAINTENANCE">
                  MAINTENANCE
                </option>
              </select>
            </label>
          )}
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
            form="bed-form"
          >
            Save bed
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
