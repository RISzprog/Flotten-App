import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("");

  const einstempeln = () => {
    if (!name || !fahrzeug) {
      setStatus("Bitte Name und Fahrzeug auswählen.");
      return;
    }

    setStatus("Einstempeln läuft...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const daten = {
          name: name,
          fahrzeug: fahrzeug,
          startzeit: new Date().toLocaleString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "eingestempelt"
        };

        localStorage.setItem("aktuellerEintrag", JSON.stringify(daten));
        setStatus("✅ Eingestempelt");
      },
      () => {
        setStatus("Standort konnte nicht erfasst werden. Bitte Standort erlauben.");
      }
    );
  };

  const ausstempeln = () => {
    const gespeicherterEintrag = localStorage.getItem("aktuellerEintrag");

    if (!gespeicherterEintrag) {
      setStatus("Du bist aktuell nicht eingestempelt.");
      return;
    }

    const daten = JSON.parse(gespeicherterEintrag);
    daten.endzeit = new Date().toLocaleString();
    daten.status = "ausgestempelt";

    localStorage.setItem("letzterEintrag", JSON.stringify(daten));
    localStorage.removeItem("aktuellerEintrag");

    setStatus("✅ Ausgestempelt");
  };

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
        maxWidth: "400px"
      }}>
        <input
          placeholder="Mitarbeitername"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px"
          }}
        />

        <select
          value={fahrzeug}
          onChange={(e) => setFahrzeug(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px"
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
            padding: "15px",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "18px",
            marginBottom: "10px"
          }}
        >
          Einstempeln
        </button>

        <button
          onClick={ausstempeln}
          style={{
            width: "100%",
            padding: "15px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "18px"
          }}
        >
          Ausstempeln
        </button>

        <p style={{
          marginTop: "20px",
          fontWeight: "bold",
          fontSize: "18px"
        }}>
          {status}
        </p>
      </div>
    </div>
  );
}
