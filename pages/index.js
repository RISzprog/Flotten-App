import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Car, Clock, LogOut, MapPin, ShieldCheck, User, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const initialVehicles = [
  "Vito 1",
  "Vito 2",
  "Sprinter 1",
  "Sprinter 2",
  "Crafter 1",
  "Golf Kontrolle",
  "Transit Garten",
];

function formatDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(value);
}

function toCsv(rows) {
  const headers = ["Mitarbeiter", "Fahrzeug", "Start", "Ende", "Start GPS", "Ende GPS", "Status"];
  const csvRows = [headers.join(";")];

  rows.forEach((row) => {
    csvRows.push([
      row.employee,
      row.vehicle,
      row.start ? formatDateTime(row.start) : "",
      row.end ? formatDateTime(row.end) : "",
      row.startGps || "",
      row.endGps || "",
      row.end ? "Abgeschlossen" : "Aktiv",
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"));
  });

  return csvRows.join("\n");
}

export default function FleetTimeTrackingApp() {
  const [view, setView] = useState("employee");
  const [employeeName, setEmployeeName] = useState("Max Mustermann");
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [newVehicle, setNewVehicle] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicles[0]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [entries, setEntries] = useState([
    {
      id: 1,
      employee: "Antje Diehl",
      vehicle: "Vito 1",
      start: new Date(Date.now() - 1000 * 60 * 90),
      end: new Date(Date.now() - 1000 * 60 * 15),
      startGps: "50.78647, 8.20518",
      endGps: "50.78649, 8.20521",
    },
  ]);

  const activeEntry = useMemo(() => entries.find((entry) => entry.id === activeEntryId), [entries, activeEntryId]);

  function getGps(callback) {
    if (!navigator.geolocation) {
      callback("GPS nicht verfügbar");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        callback(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => callback("GPS verweigert"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function clockIn() {
    if (!selectedVehicle) return;

    getGps((gps) => {
      const id = Date.now();
      const entry = {
        id,
        employee: employeeName || "Unbekannt",
        vehicle: selectedVehicle,
        start: new Date(),
        end: null,
        startGps: gps,
        endGps: "",
      };
      setEntries((current) => [entry, ...current]);
      setActiveEntryId(id);
    });
  }

  function clockOut() {
    if (!activeEntryId) return;

    getGps((gps) => {
      setEntries((current) => current.map((entry) => entry.id === activeEntryId ? { ...entry, end: new Date(), endGps: gps } : entry));
      setActiveEntryId(null);
    });
  }

  function downloadCsv() {
    const csv = toCsv(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fahrzeug_zeiten.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function addVehicle() {
    const name = newVehicle.trim();
    if (!name || vehicles.includes(name)) return;
    setVehicles((current) => [...current, name]);
    setSelectedVehicle(name);
    setNewVehicle("");
  }

  function removeVehicle(vehicle) {
    setVehicles((current) => current.filter((item) => item !== vehicle));
    if (selectedVehicle === vehicle) {
      setSelectedVehicle(vehicles.find((item) => item !== vehicle) || "");
    }
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4 text-slate-900" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop')" }}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-10 mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-3 rounded-3xl bg-white/90 backdrop-blur p-4 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4" /> Firmenflotte Zeiterfassung
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Auto wählen. Einstempeln. Fertig.</h1>
          </div>
          <div className="flex gap-2">
            <Button variant={view === "employee" ? "default" : "outline"} onClick={() => setView("employee")}>Mitarbeiter</Button>
            <Button variant={view === "admin" ? "default" : "outline"} onClick={() => setView("admin")}>Admin</Button>
          </div>
        </header>

        {view === "employee" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-3xl bg-white/90 backdrop-blur shadow-2xl">
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Mitarbeiter</label>
                  <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <input
                      value={employeeName}
                      onChange={(event) => setEmployeeName(event.target.value)}
                      className="w-full bg-transparent outline-none"
                      placeholder="Name eingeben"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Auto auswählen</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle}
                        onClick={() => setSelectedVehicle(vehicle)}
                        disabled={Boolean(activeEntry)}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selectedVehicle === vehicle ? "border-slate-900 bg-slate-900 text-white" : "bg-white hover:bg-slate-100"}`}
                      >
                        <Car className="h-5 w-5" />
                        <span className="font-semibold">{vehicle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {!activeEntry ? (
                  <Button onClick={clockIn} className="h-16 w-full rounded-2xl text-xl font-bold">
                    <Clock className="mr-2 h-6 w-6" /> Einstempeln
                  </Button>
                ) : (
                  <Button onClick={clockOut} variant="destructive" className="h-16 w-full rounded-2xl text-xl font-bold">
                    <LogOut className="mr-2 h-6 w-6" /> Ausstempeln
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-white/90 backdrop-blur shadow-2xl">
              <CardContent className="space-y-4 p-5">
                <h2 className="text-lg font-bold">Aktueller Status</h2>
                {activeEntry ? (
                  <div className="space-y-3 rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Eingestempelt mit</p>
                    <p className="text-2xl font-bold">{activeEntry.vehicle}</p>
                    <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Start: {formatDateTime(activeEntry.start)}</p>
                    <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> GPS: {activeEntry.startGps}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-100 p-4 text-slate-600">Noch nicht eingestempelt.</div>
                )}

                <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
                  Für Mitarbeiter gilt nur: Auto wählen, einstempeln, später ausstempeln. GPS wird automatisch beim Stempeln gespeichert.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="rounded-3xl bg-white/90 backdrop-blur shadow-2xl">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Fahrzeuge verwalten</h2>
                    <p className="text-sm text-slate-500">Alle Mitarbeiter können jedes Auto auswählen.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newVehicle}
                      onChange={(event) => setNewVehicle(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && addVehicle()}
                      placeholder="z. B. Vito 3"
                      className="rounded-2xl border px-4 py-2 outline-none"
                    />
                    <Button onClick={addVehicle} className="rounded-2xl"><Plus className="mr-2 h-4 w-4" /> Hinzufügen</Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle} className="flex items-center justify-between rounded-2xl border bg-white p-3">
                      <span className="flex items-center gap-2 font-semibold"><Car className="h-4 w-4" /> {vehicle}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeVehicle(vehicle)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-white/90 backdrop-blur shadow-2xl">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Zeiteinträge</h2>
                    <p className="text-sm text-slate-500">Export für Lohn, Nachweise oder Kontrolle.</p>
                  </div>
                  <Button onClick={downloadCsv} className="rounded-2xl"><Download className="mr-2 h-4 w-4" /> CSV Export</Button>
                </div>

                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">Mitarbeiter</th>
                        <th className="p-3">Fahrzeug</th>
                        <th className="p-3">Start</th>
                        <th className="p-3">Ende</th>
                        <th className="p-3">GPS Start</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <td className="p-3 font-medium">{entry.employee}</td>
                          <td className="p-3">{entry.vehicle}</td>
                          <td className="p-3">{entry.start ? formatDateTime(entry.start) : ""}</td>
                          <td className="p-3">{entry.end ? formatDateTime(entry.end) : "—"}</td>
                          <td className="p-3">{entry.startGps}</td>
                          <td className="p-3">{entry.end ? "Abgeschlossen" : "Aktiv"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
