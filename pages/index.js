import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Home() {
  const [name, setName] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");
  const [status, setStatus] = useState("nicht eingestempelt");
  const [fahrzeuge, setFahrzeuge] = useState([]);

  async function fahrzeugeLaden() {
    const { data, error } = await supabase
      .from("fahrzeuge")
      .select("*")
      .eq("aktiv", true)
      .order("name", { ascending: true });

    if (!error) {
      setFahrzeuge(data || []);
    }
  }

  useEffect(() => {
    fahrzeugeLaden();
  }, []);

  async function speichern(gpsDaten) {
    const daten = {
      mitarbeiter: name,
      fahrzeug: fahrzeug,
      startzeit: new Date().toISOString(),
      latitude: gpsDaten && gpsDaten.latitude ? String(gpsDaten.latitude) : "",
      longitude: gpsDaten && gpsDaten.longitude ? String(gpsDaten.longitude) : "",
      status: "eingestempelt"
    };

    const { error } = await supabase.from("zeiten").insert([daten]);

    if (error) {
      setStatus("Fehler beim Speichern");
      return;
    }

    setStatus("🟢 Eingestempelt");
  }

  async function einstempeln() {
    if (!name || !fahrzeug) {
      setStatus("Bitte Name und Fahrzeug auswählen.");
      return;
    }

    const { data } = await supabase
      .from("zeiten")
      .select("*")
      .eq("status", "eingestempelt");

    if (data && data.some((e) => e.fahrzeug === fahrzeug)) {
      setStatus("🚫 Fahrzeug bereits im Einsatz");
      return;
    }

    if (data && data.some((e) => e.mitarbeiter === name)) {
      setStatus("🚫 Mitarbeiter bereits eingestempelt");
      return;
    }

    setStatus("GPS wird gesucht...");

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
        setStatus("GPS deaktiviert - trotzdem eingestempelt");
        speichern(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
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
          <img src="/logo.png" alt="RIS Logo" className="logoImg" />
          <h1>RIS Flotten App</h1>
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

            <select
              value={fahrzeug}
              onChange={(e) => setFahrzeug(e.target.value)}
            >
              <option value="">Fahrzeug wählen</option>

              {fahrzeuge.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                  {f.kennzeichen ? ` - ${f.kennzeichen}` : ""}
                </option>
              ))}
            </select>

            <button className="green" onClick={einstempeln}>
              Einstempeln
            </button>

            <button className="red" onClick={ausstempeln}>
              Ausstempeln
            </button>

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
          background: linear-gradient(
            90deg,
            #2f5fb3 0%,
            #4f7fd8 42%,
            #f3a24d 72%,
            #ef7d22 100%
          );
          color: white;
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 28px;
        }

        .logoImg {
          width: 260px;
          max-width: 80%;
          height: auto;
          margin-bottom: 12px;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.25));
        }

        h1 {
          font-size: 44px;
          margin: 0;
          font-weight: 900;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        main {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }

        .card {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(16px);
          padding: 24px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
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
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.18);
          color: white;
          box-sizing: border-box;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }

        option {
          color: black;
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
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .green {
          background: linear-gradient(135deg, #16a34a, #15803d);
        }

        .red {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
        }

        .status {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          font-size: 17px;
          font-weight: bold;
        }

        .thanks {
          padding: 20px;
          text-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
        }

        .thanks h2 {
          font-size: 32px;
          margin-top: 0;
        }

        .line {
          height: 3px;
          background: linear-gradient(90deg, #ffffff, #f97316);
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
        }

        @media (max-width: 800px) {
          main {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .logoImg {
            width: 210px;
          }
        }
      `}</style>
    </div>
  );
}
