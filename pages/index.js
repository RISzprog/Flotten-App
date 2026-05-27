import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Home() {
  const router = useRouter();

  const [mitarbeiterListe, setMitarbeiterListe] = useState([]);
  const [mitarbeiterSuche, setMitarbeiterSuche] = useState("");
  const [mitarbeiter, setMitarbeiter] = useState("");

  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [fahrzeug, setFahrzeug] = useState("");
  const [beifahrer, setBeifahrer] = useState("");

  const [meldung, setMeldung] = useState("nicht abgeholt");
  const [gps, setGps] = useState(null);

  useEffect(() => {
    datenLaden();

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({
            latitude: String(position.coords.latitude),
            longitude: String(position.coords.longitude)
          });
        },
        () => {},
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || fahrzeuge.length === 0) return;

    const qr = router.query.fahrzeug;
    if (!qr) return;

    const qrFahrzeug = decodeURIComponent(String(qr));

    const gefunden = fahrzeuge.find((f) => {
      useEffect(() => {
  if (router.query.fahrzeug) {
    setFahrzeug(router.query.fahrzeug);
  }
}, [router.query]);
      const text = `${f.name} · ${f.kennzeichen || ""}`;
      return (
        text.includes(qrFahrzeug) ||
        String(f.kennzeichen || "").includes(qrFahrzeug)
      );
    });

    if (gefunden) {
      setFahrzeug(`${gefunden.name} · ${gefunden.kennzeichen || ""}`);
    }
  }, [router.isReady, router.query.fahrzeug, fahrzeuge]);

  async function datenLaden() {
    const { data: fahrzeugDaten } = await supabase
      .from("fahrzeuge")
      .select("*")
      .eq("aktiv", true)
      .order("name", { ascending: true });

    const { data: mitarbeiterDaten } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("aktiv", true)
      .order("nachname", { ascending: true });

    setFahrzeuge(fahrzeugDaten || []);
    setMitarbeiterListe(mitarbeiterDaten || []);
  }

  const gefilterteMitarbeiter = useMemo(() => {
    if (mitarbeiterSuche.trim().length < 2) return [];

    const suche = mitarbeiterSuche.toLowerCase();

    return mitarbeiterListe
      .filter((m) => {
        const normal = `${m.vorname} ${m.nachname}`.toLowerCase();
        const andersrum = `${m.nachname} ${m.vorname}`.toLowerCase();
        return normal.includes(suche) || andersrum.includes(suche);
      })
      .slice(0, 6);
  }, [mitarbeiterSuche, mitarbeiterListe]);

  function mitarbeiterWaehlen(m) {
    const name = `${m.vorname} ${m.nachname}`;
    setMitarbeiter(name);
    setMitarbeiterSuche(name);
  }

  async function abholen() {
    if (!mitarbeiter || !fahrzeug) {
      setMeldung("Bitte Mitarbeiter und Fahrzeug auswählen");
      return;
    }

    const { data: aktiveFahrt } = await supabase
  .from("zeiten")
  .select("*")
  .eq("fahrzeug", fahrzeug)
  .eq("status", "eingestempelt")
  .maybeSingle();

if (aktiveFahrt) {
  setMeldung("❌ Fahrzeug bereits unterwegs");
  return;
}

const { data: mitarbeiterAktiv } = await supabase
  .from("zeiten")
  .select("*")
  .eq("mitarbeiter", mitarbeiter)
  .eq("status", "eingestempelt")
  .maybeSingle();

if (mitarbeiterAktiv) {
  setMeldung("❌ Mitarbeiter hat bereits ein Fahrzeug");
  return;
}

    const { data: offene } = await supabase
      .from("zeiten")
      .select("*")
      .eq("status", "eingestempelt");

    if (offene && offene.some((e) => e.mitarbeiter === mitarbeiter)) {
      setMeldung("🚫 Mitarbeiter hat bereits ein Fahrzeug");
      return;
    }

    if (offene && offene.some((e) => e.fahrzeug === fahrzeug)) {
      setMeldung("🚫 Fahrzeug bereits unterwegs");
      return;
    }

    const { error } = await supabase.from("zeiten").insert([
      {
        mitarbeiter,
        fahrzeug,
        beifahrer,
        startzeit: new Date().toISOString(),
        latitude: gps?.latitude || "",
        longitude: gps?.longitude || "",
        status: "eingestempelt"
      }
    ]);

    if (error) {
      setMeldung("Fehler beim Abholen");
      return;
    }

    setMeldung("🟢 Abgeholt");
  }

  async function abgeben() {
    if (!mitarbeiter) {
      setMeldung("Bitte Mitarbeiter auswählen");
      return;
    }

    const { data } = await supabase
      .from("zeiten")
      .select("*")
      .eq("mitarbeiter", mitarbeiter)
      .eq("status", "eingestempelt")
      .order("startzeit", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      setMeldung("Kein aktives Fahrzeug gefunden");
      return;
    }

    const { error } = await supabase
      .from("zeiten")
      .update({
        endzeit: new Date().toISOString(),
        status: "ausgestempelt",
        latitude: gps?.latitude || data[0].latitude,
        longitude: gps?.longitude || data[0].longitude
      })
      .eq("id", data[0].id);

    if (error) {
      setMeldung("Fehler beim Abgeben");
      return;
    }

    setMeldung("🔴 Abgegeben");
    setFahrzeug("");
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
            <label>Mitarbeiter suchen</label>

            <div className="searchBox">
              <input
                placeholder="Vorname oder Nachname eingeben"
                value={mitarbeiterSuche}
                onChange={(e) => {
                  setMitarbeiterSuche(e.target.value);
                  setMitarbeiter("");
                }}
              />

              {gefilterteMitarbeiter.length > 0 && !mitarbeiter && (
                <div className="suggestions">
                  {gefilterteMitarbeiter.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="suggestion"
                      onClick={() => mitarbeiterWaehlen(m)}
                    >
                      {m.vorname} {m.nachname}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label>Fahrzeug wählen</label>

            <select value={fahrzeug} onChange={(e) => setFahrzeug(e.target.value)}>
              <option value="">Fahrzeug wählen</option>

              {fahrzeuge.map((f) => (
                <option key={f.id} value={`${f.name} · ${f.kennzeichen || ""}`}>
                  {f.name} · {f.kennzeichen || "ohne Kennzeichen"}
                </option>
              ))}
            </select>
              <label>Beifahrer (optional)</label>

<input
  placeholder="Name Beifahrer"
  value={beifahrer}
  onChange={(e) => setBeifahrer(e.target.value)}
/>

            <button className="green" onClick={abholen}>
              Abholen
            </button>

            <button className="red" onClick={abgeben}>
              Abgeben
            </button>

            <div className="status">Status: {meldung}</div>
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
          padding: 14px;
          font-family: Arial, sans-serif;
          background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f3a24d 72%, #ef7d22 100%);
          color: white;
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 18px;
        }

        .logoImg {
          width: 150px;
          max-width: 70%;
          height: auto;
          margin-bottom: 8px;
          border-radius: 24px;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.25));
        }

        h1 {
          font-size: 34px;
          margin: 0;
          font-weight: 900;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        main {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
        }

        .card {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(16px);
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
        }

        label {
          display: block;
          font-weight: bold;
          font-size: 17px;
          margin-bottom: 8px;
        }

        .searchBox {
          position: relative;
        }

        input,
        select {
          width: 100%;
          padding: 14px;
          margin-bottom: 16px;
          font-size: 17px;
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

        .suggestions {
          position: absolute;
          top: 54px;
          left: 0;
          right: 0;
          background: white;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
          z-index: 20;
        }

        .suggestion {
          width: 100%;
          padding: 14px 16px;
          text-align: left;
          border: none;
          background: white;
          color: #0f2f6e;
          font-size: 17px;
          font-weight: bold;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: none;
          margin-bottom: 0;
          border-radius: 0;
        }

        button {
          width: 100%;
          padding: 16px;
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 12px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .green {
          background: linear-gradient(135deg, #16a34a, #15803d);
        }

        .red {
          background: linear-gradient(135deg, #ef4444, #b91c1c);
        }

        .status {
          margin-top: 6px;
          background: rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          font-size: 16px;
          font-weight: bold;
        }

        .thanks {
          padding: 14px;
          text-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
        }

        .thanks h2 {
          font-size: 28px;
          margin-top: 0;
        }

        .line {
          height: 3px;
          background: linear-gradient(90deg, #ffffff, #f97316);
          margin-bottom: 18px;
        }

        .thanks p {
          font-size: 20px;
          font-weight: bold;
        }

        footer {
          text-align: center;
          margin-top: 28px;
          font-weight: bold;
        }

        @media (max-width: 800px) {
          main {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 30px;
          }

          .logoImg {
            width: 130px;
          }

          .thanks {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
