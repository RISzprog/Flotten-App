import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("");

  function speichernUndEinstempeln(gpsDaten) {
    const daten = {
      name,
      fahrzeug,
      startzeit: new Date().toLocaleString("de-DE"),
      latitude: gpsDaten?.latitude || null,
      longitude: gpsDaten?.longitude || null,
      status: "eingestempelt"
    };

    localStorage.setItem("aktuellerEintrag", JSON.stringify(daten));
    setStatus("✅ Eingestempelt");
  }

  function einstempeln() {
    if (!name || !fahrzeug) {
      setStatus("Bitte Name und Fahrzeug auswählen.");
      return;
    }

    setStatus("Einstempeln läuft...");

    if (!navigator.geolocation) {
      speichernUndEinstempeln(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        speichernUndEinstempeln({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      function () {
        speichernUndEinstempeln(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000
      }
    );
  }

  function ausstempeln() {
    const eintrag = localStorage.getItem("aktuellerEintrag");

    if (!eintrag) {
      setStatus("Du bist aktuell nicht eingestempelt.");
      return;
    }

    const daten = JSON.parse(eintrag);
    daten.endzeit = new Date().toLocaleString("de-DE");
    daten.status = "ausgestempelt";

    localStorage.setItem("letzterEintrag", JSON.stringify(daten));
    localStorage.removeItem("aktuellerEintrag");

    setStatus("✅ Ausgestempelt");
  }

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      backgroundImage: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop')",
      backgroundSize: "cover",
      backgroundPosition: "center"
    }}>
      <h1 style={{
        color: "white",
        fontSize: "36px",
        marginBottom: "20px",
        textShadow: "0 2px 8px rgba(0,0,0,0.6)"
      }}>
        RIS Flotten App
      </h1>

      <div style={{
        background: "rgba(255,255,255,0.94)",
        padding: "22px",
        borderRadius: "18px",
        maxWidth: "430px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)"
      }}>
        <h2 style={{ marginTop: 0 }}>Auto wählen. Einstempeln. Fertig.</h2>

        <input
          placeholder="Mitarbeitername"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "15px",
            fontSize: "18px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            boxSizing: "border-box"
          }}
        />

        <select
          value={fahrzeug}
          onChange={(e) => setFahrzeug(e.target.value)}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "20px",
            fontSize: "18px",
            borderRadius: "10px",
            border: "1px solid #ccc",
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

        <p style={{
          marginTop: "20px",
          fontWeight: "bold",
          fontSize: "20px"
        }}>
          {status}
        </p>
      </div>
    </div>
  );
}
