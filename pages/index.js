import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("");

  function einstempeln() {
    if (!name || !fahrzeug) {
      setStatus("Bitte Name und Fahrzeug auswählen.");
      return;
    }

    setStatus("GPS wird gesucht...");

    if (!navigator.geolocation) {
      setStatus("GPS wird von diesem Gerät nicht unterstützt.");
      return;
    }

     navigator.permissions.query({ name: "geolocation" }).then(result => {
     console.log(result.state);
    });
      function (position) {
        const daten = {
          name,
          fahrzeug,
          startzeit: new Date().toLocaleString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "eingestempelt"
        };

        localStorage.setItem("aktuellerEintrag", JSON.stringify(daten));
        setStatus("✅ Eingestempelt");
      },
      function (error) {
        setStatus("❌ GPS Fehler: " + error.code + " - " + error.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: Infinity
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
    daten.endzeit = new Date().toLocaleString();
    daten.status = "ausgestempelt";

    localStorage.setItem("letzterEintrag", JSON.stringify(daten));
    localStorage.removeItem("aktuellerEintrag");

    setStatus("✅ Ausgestempelt");
  }

  return (
    <div style={{ fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh", padding: "20px" }}>
      <h1>RIS Flotten App</h1>

      <div style={{ background: "white", padding: "20px", borderRadius: "12px", maxWidth: "400px" }}>
        <input
          placeholder="Mitarbeitername"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "15px" }}
        />

        <select
          value={fahrzeug}
          onChange={(e) => setFahrzeug(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "20px" }}
        >
          <option value="">Fahrzeug wählen</option>
          <option>Vito 1</option>
          <option>Vito 2</option>
          <option>Sprinter</option>
          <option>Crafter</option>
        </select>

        <button onClick={einstempeln} style={{ width: "100%", padding: "15px", background: "green", color: "white", border: "none", borderRadius: "8px", fontSize: "18px", marginBottom: "10px" }}>
          Einstempeln
        </button>

        <button onClick={ausstempeln} style={{ width: "100%", padding: "15px", background: "red", color: "white", border: "none", borderRadius: "8px", fontSize: "18px" }}>
          Ausstempeln
        </button>

        <p style={{ marginTop: "20px", fontWeight: "bold", fontSize: "18px" }}>
          {status}
        </p>
      </div>
    </div>
  );
}
