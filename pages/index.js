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
      fahrzeug,
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

    setStatus("🟢 Eingestempelt");
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

    setStatus("🔴 Ausgestempelt");
  }

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="logo">RIS</div>
          <h1>RIS Flotten App</h1>
          <p>Reinigung – Instandhaltung – Sicherheit</p>
        </header>

        <main>
          <section className="card">
            <label>Mitarbeiter wählen</label>
            <input
              placeholder="Mitarbeitername"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Fahrzeug wählen</label>
            <select value={fahrzeug} onChange={(e) => setFahrzeug(e.target.value)}>
              <option value="">Fahrzeug wählen</option>
              <option>Vito 1</option>
              <option>Vito 2</option>
              <option>Sprinter</option>
              <option>Crafter</option>
            </select>

            <button className="green" onClick={einstempeln}>Einstempeln</button>
            <button className="red" onClick={ausstempeln}>Ausstempeln</button>

            <div className="status">Status: {status}</div>
          </section>

          <section className="thanks">
            <h2>Danke ans Team</h2>
            <div className="line" />
            <p>Teşekkürler ekibe</p>
            <p>Mulțumim echipei</p>
            <p>Спасибо команде</p>
          </section>
        </main>

        <footer>© RIS 2026</footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px;
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #ffffff 0%, #eaf4ff 35%, #ffffff 55%, #ffb347 100%);
          color: #0f2f6e;
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 28px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 86px;
          height: 50px;
          border-radius: 14px;
          background: white;
          color: #0f2f6e;
          font-size: 30px;
          font-weight: 900;
          box-shadow: 0 10px 25px rgba(15, 47, 110, 0.18);
          border-bottom: 5px solid #f97316;
          margin-bottom: 10px;
        }

        h1 {
          font-size: 44px;
          margin: 0;
          font-weight: 900;
        }

        header p {
          color: #f97316;
          font-weight: bold;
          font-size: 18px;
        }

        main {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }

        .card {
          background: rgba(255, 255, 255, 0.95);
          padding: 24px;
          border-radius: 24px;
          box-shadow: 0 15px 35px rgba(15, 47, 110, 0.2);
        }

        label {
          display: block;
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 8px;
        }

        input,
        select {
          width: 100%;
          padding: 16px;
          margin-bottom: 20px;
          font-size: 18px;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
        }

        button {
          width: 100%;
          padding: 20px;
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 26px;
          font-weight: bold;
          margin-bottom: 14px;
        }

        .green {
          background: linear-gradient(135deg, #16a34a, #15803d);
        }

        .red {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
        }

        .status {
          margin-top: 8px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 16px;
          border: 1px solid #dbeafe;
          font-size: 17px;
          font-weight: bold;
        }

        .thanks {
          padding: 20px;
        }

        .thanks h2 {
          font-size: 32px;
          margin-top: 0;
        }

        .line {
          height: 3px;
          background: linear-gradient(90deg, #f97316, #0f2f6e);
          margin-bottom: 24px;
        }

        .thanks p {
          font-size: 22px;
          font-weight: bold;
        }

        footer {
          text-align: center;
          margin-top: 36px;
          font-weight: bold;
          color: #0f2f6e;
        }

        @media (max-width: 800px) {
          main {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .thanks {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}
