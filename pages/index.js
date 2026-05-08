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

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const daten = {
          name: name,
          fahrzeug: fahrzeug,
          startzeit: new Date().toLocaleString("de-DE"),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "eingestempelt"
        };

        localStorage.setItem("aktuellerEintrag", JSON.stringify(daten));
        setStatus("✅ Eingestempelt");
      },
      function (error) {
        if (error.code === 1) {
          setStatus("❌ Standort wurde nicht erlaubt.");
        } else if (error.code === 2) {
          setStatus("❌ Standort nicht verfügbar. Bitte draußen oder am Fenster testen.");
        } else if (error.code === 3) {
          setStatus("❌ GPS braucht zu lange. Bitte erneut versuchen.");
        } else {
          setStatus("❌ GPS Fehler.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 60000
      }
    );
  }

  function ausstempeln() {
    const gespeicherterEintrag = localStorage.getItem("aktuellerEintrag");

    if (!gespeicherterEintrag) {
      setStatus("Du bist aktuell nicht eingestempelt.");
      return;
    }

    const daten = JSON.parse(gespeicherterEintrag);
    daten.endzeit = new Date().toLocaleString("de-DE");
    daten.status = "ausgestempelt";

    localStorage.setItem("letzterEintrag", JSON.stringify(daten));
    localStorage.removeItem("aktuellerEintrag");

    setStatus("✅ Ausgestempelt");
  }

  return (
    <div style={{
      fontFamily: "Arial",
      background: "#f4f4f4",
      minHeight: "100vh",
      padding: "20px"
    }}>
      <h1>RIS Flotten App</h1>

      <div style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        maxWidth: "420px"
      }}>
        <input
          placeholder="Mitarbeitername"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            fontSize: "18px"
          }}
        />

        <select
          value={fahrzeug}
          onChange={(e) => setFahrzeug(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            fontSize: "18px"
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
            padding: "16px",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "22px",
            marginBottom: "12px"
          }}
        >
          Einstempeln
        </button>

        <button
          onClick={ausstempeln}
          style={{
            width: "100%",
            padding: "16px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "22px"
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
