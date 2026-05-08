import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("");

  async function speichern(gpsDaten) {
    const daten = {
      mitarbeiter: name,
      fahrzeug: fahrzeug,
      startzeit: new Date().toISOString(),
      latitude: gpsDaten?.latitude?.toString() || "",
      longitude: gpsDaten?.longitude?.toString() || "",
      status: "eingestempelt"
    };

    const { error } = await supabase.from("zeiten").insert([daten]);

    if (error) {
      setStatus("Fehler beim Speichern");
      console.log(error);
      return;
    }

    setStatus("✅ Eingestempelt");
  }

  function einstempeln() {
    if (!name || !fahrzeug) {
      setStatus("Bitte Name und Fahrzeug auswählen.");
      return;
    }

    setStatus("Einstempeln läuft...");

    if (!navigator.geolocation) {
      speichern(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        speichern({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      function () {
        speichern(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  }

  async function ausstempeln() {
  const { data } = await supabase
    .from("zeiten")
    .select("*")
    .eq("mitarbeiter", name)
    .eq("status", "eingestempelt")
    .order("id", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    setStatus("Keine aktive Einstempelung gefunden");
    return;
  }

  const eintrag = data[0];

  const { error } = await supabase
    .from("zeiten")
    .update({
      endzeit: new Date().toISOString(),
      status: "ausgestempelt"
    })
    .eq("id", eintrag.id);

  if (error) {
    setStatus("Fehler beim Ausstempeln");
    return;
  }

  setStatus("✅ Ausgestempelt");
}

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.20), rgba(255,255,255,0.20)), url('/top.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <h1 style={{
       color: "white",
       fontSize: "42px",
       fontWeight: "bold",
       letterSpacing: "1px",
       textShadow: "0 4px 12px rgba(0,0,0,0.35)"
      }}>
        RIS Flotten App
      </h1>

      <div
        style={{
          background: "rgba(255,255,255,0.94)",
          padding: "22px",
          borderRadius: "18px",
          maxWidth: "430px"
        }}
      >
        <input
          placeholder="Mitarbeitername"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "14px", marginBottom: "15px", fontSize: "18px" }}
        />

        <select
          value={fahrzeug}
          onChange={(e) => setFahrzeug(e.target.value)}
          style={{ width: "100%", padding: "14px", marginBottom: "20px", fontSize: "18px" }}
        >
          <option value="">Fahrzeug wählen</option>
          <option>Vito 1</option>
          <option>Vito 2</option>
          <option>Sprinter</option>
          <option>Crafter</option>
        </select>

        <button
          onClick={einstempeln}
          style={{
            width: "100%",
            padding: "17px",
            background: "#15803d",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "12px"
          }}
        >
          Einstempeln
        </button>

        <button
          onClick={ausstempeln}
          style={{
            width: "100%",
            padding: "17px",
            background: "#b91c1c",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "22px",
            fontWeight: "bold"
          }}
        >
          Ausstempeln
        </button>

        <p style={{ marginTop: "20px", fontWeight: "bold", fontSize: "20px" }}>
          {status}
        </p>
      </div>
    </div>
  );
}
