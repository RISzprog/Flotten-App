import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("");

  const einstempeln = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      const daten = {
        name,
        fahrzeug,
        zeit: new Date().toLocaleString(),
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        status: "Eingestempelt"
      };

      console.log(daten);

      localStorage.setItem("letzterEintrag", JSON.stringify(daten));

      setStatus("✅ Eingestempelt");
    });
  };

  const ausstempeln = () => {
    setStatus("❌ Ausgestempelt");
  };

  return (
    <div
      style={{
        fontFamily: "Arial",
        background: "#f4f4f4",
        minHeight: "100vh",
        padding: "20px"
      }}
    >
      <h1>RIS Flotten App</h1>

      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          maxWidth: "400px"
        }}
      >
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

        <p style={{ marginTop: "20px", fontWeight: "bold" }}>
          {status}
        </p>
      </div>
    </div>
  );
}
