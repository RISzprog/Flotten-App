import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("nicht eingestempelt");

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
    if (!name) {
      setStatus("Bitte Mitarbeitername eingeben.");
      return;
    }

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
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background:
          "linear-gradient(135deg, #ffffff 0%, #eaf4ff 35%, #ffffff 55%, #ff8a00 100%)",
        color: "#0f2f6e"
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "44px",
              margin: "0",
              fontWeight: "900",
              color: "#0f2f6e"
            }}
          >
            RIS Flotten App
          </h1>

          <p
            style={{
              color: "#f97316",
              fontWeight: "bold",
              fontSize: "18px"
            }}
          >
            Reinigung – Instandhaltung – Sicherheit
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "24px"
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "24px",
              borderRadius: "24px",
              boxShadow: "0 15px 35px rgba(15,47,110,0.25)"
            }}
          >
            <label style={{ fontWeight: "bold", fontSize: "18px" }}>
              Mitarbeiter wählen
            </label>

            <input
              placeholder="Mitarbeitername"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "16px",
                marginTop: "8px",
                marginBottom: "20px",
                fontSize: "18px",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />

            <label style={{ fontWeight: "bold", fontSize: "18px" }}>
              Fahrzeug wählen
            </label>

            <select
              value={fahrzeug}
              onChange={(e) => setFahrzeug(e.target.value)}
              style={{
                width: "100%",
                padding: "16px",
                marginTop: "8px",
                marginBottom: "24px",
                fontSize: "18px",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
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
                padding: "20px",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "white",
                border: "none",
                borderRadius: "16px",
                fontSize: "26px",
                fontWeight: "bold",
                marginBottom: "14px",
                boxShadow: "0 8px 18px rgba(22,163,74,0.35)"
              }}
            >
              Einstempeln
            </button>

            <button
              onClick={ausstempeln}
              style={{
                width: "100%",
                padding: "20px",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "white",
                border: "none",
                borderRadius: "16px",
                fontSize: "26px",
                fontWeight: "bold",
                boxShadow: "0 8px 18px rgba(185,28,28,0.35)"
              }}
            >
              Ausstempeln
            </button>

            <div
              style={{
                marginTop: "22px",
                background: "white",
                borderRadius: "16px",
                padding: "18px",
                borderLeft: "6px solid #0f2f6e",
                boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
                fontSize: "18px"
              }}
            >
              <strong>Status:</strong>{" "}
              <span style={{ fontWeight: "bold" }}>{status}</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.78)",
              padding: "28px",
              borderRadius: "24px",
              boxShadow: "0 15px 35px rgba(15,47,110,0.18)"
            }}
          >
            <h2
              style={{
                color: "#0f2f6e",
                fontSize: "32px",
                marginTop: 0
              }}
            >
              Danke ans Team
            </h2>

            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, #f97316, #0f2f6e)",
                marginBottom: "24px"
              }}
            />

            <p style={{ fontSize: "22px", fontWeight: "bold" }}>
              Danke ans Team
            </p>
            <p style={{ fontSize: "22px", fontWeight: "bold" }}>
              Teşekkürler ekibe
            </p>
            <p style={{ fontSize: "22px", fontWeight: "bold" }}>
              Mulțumim echipei
            </p>
            <p style={{ fontSize: "22px", fontWeight: "bold" }}>
              Спасибо команде
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
