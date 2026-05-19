import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Home() {
  const router = useRouter();

  const [mitarbeiter, setMitarbeiter] = useState("");
  const [fahrzeug, setFahrzeug] = useState("");

  const [mitarbeiterListe, setMitarbeiterListe] =
    useState([]);

  const [fahrzeuge, setFahrzeuge] = useState([]);

  const [mitarbeiterSuche, setMitarbeiterSuche] =
    useState("");

  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    fahrzeugeLaden();
    mitarbeiterLaden();
  }, []);

  useEffect(() => {
    if (
      router.query.fahrzeug &&
      fahrzeuge.length > 0
    ) {
      const qrFahrzeug =
        decodeURIComponent(
          router.query.fahrzeug
        );

      const gefunden = fahrzeuge.find((f) =>
        `${f.name} · ${f.kennzeichen}`.includes(
          qrFahrzeug
        )
      );

      if (gefunden) {
        setFahrzeug(
          `${gefunden.name} · ${gefunden.kennzeichen}`
        );
      }
    }
  }, [router.query, fahrzeuge]);

  async function fahrzeugeLaden() {
    const { data } = await supabase
      .from("fahrzeuge")
      .select("*")
      .eq("aktiv", true)
      .order("name");

    setFahrzeuge(data || []);
  }

  async function mitarbeiterLaden() {
    const { data } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("aktiv", true)
      .order("nachname");

    setMitarbeiterListe(data || []);
  }

  async function abholen() {
    if (!mitarbeiter || !fahrzeug) {
      setMeldung(
        "Bitte Mitarbeiter und Fahrzeug auswählen"
      );

      return;
    }

    const { data: offen } = await supabase
      .from("zeiten")
      .select("*")
      .eq("status", "eingestempelt")
      .eq("mitarbeiter", mitarbeiter);

    if (offen.length > 0) {
      setMeldung(
        "Mitarbeiter hat bereits Fahrzeug abgeholt"
      );

      return;
    }

    await supabase.from("zeiten").insert([
      {
        mitarbeiter,
        fahrzeug,
        startzeit: new Date(),
        status: "eingestempelt"
      }
    ]);

    setMeldung("Fahrzeug abgeholt");

    setMitarbeiter("");
    setMitarbeiterSuche("");
  }

  async function abgeben() {
    if (!mitarbeiter) {
      setMeldung(
        "Bitte Mitarbeiter auswählen"
      );

      return;
    }

    const { data } = await supabase
      .from("zeiten")
      .select("*")
      .eq("mitarbeiter", mitarbeiter)
      .eq("status", "eingestempelt")
      .order("startzeit", {
        ascending: false
      })
      .limit(1);

    if (!data || data.length === 0) {
      setMeldung(
        "Kein aktives Fahrzeug gefunden"
      );

      return;
    }

    await supabase
      .from("zeiten")
      .update({
        endzeit: new Date(),
        status: "ausgestempelt"
      })
      .eq("id", data[0].id);

    setMeldung("Fahrzeug abgegeben");

    setMitarbeiter("");
    setMitarbeiterSuche("");
    setFahrzeug("");
  }

  const gefilterteMitarbeiter =
    mitarbeiterListe.filter((m) => {
      const name =
        `${m.vorname} ${m.nachname}`.toLowerCase();

      return name.includes(
        mitarbeiterSuche.toLowerCase()
      );
    });

  return (
    <div className="page">
      <div className="overlay">
        <img
          src="/logo.png"
          alt="RIS"
          className="logo"
        />

        <h1>RIS Flotten App</h1>

        <div className="card">
          <label>Mitarbeiter wählen</label>

          <input
            type="text"
            placeholder="Vorname oder Nachname"
            value={mitarbeiterSuche}
            onChange={(e) =>
              setMitarbeiterSuche(
                e.target.value
              )
            }
          />

          {mitarbeiterSuche && (
            <div className="dropdown">
              {gefilterteMitarbeiter.map((m) => {
                const name =
                  `${m.vorname} ${m.nachname}`;

                return (
                  <div
                    key={m.id}
                    className="dropdownItem"
                    onClick={() => {
                      setMitarbeiter(name);
                      setMitarbeiterSuche(name);
                    }}
                  >
                    {name}
                  </div>
                );
              })}
            </div>
          )}

          <label>Fahrzeug wählen</label>

          <select
            value={fahrzeug}
            onChange={(e) =>
              setFahrzeug(e.target.value)
            }
          >
            <option value="">
              Fahrzeug wählen
            </option>

            {fahrzeuge.map((f) => (
              <option
                key={f.id}
                value={`${f.name} · ${f.kennzeichen}`}
              >
                {f.name} · {f.kennzeichen}
              </option>
            ))}
          </select>

          <button
            className="green"
            onClick={abholen}
          >
            Abholen
          </button>

          <button
            className="red"
            onClick={abgeben}
          >
            Abgeben
          </button>

          {meldung && (
            <p className="meldung">
              {meldung}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            linear-gradient(
              90deg,
              #2f5fb3 0%,
              #4f7fd8 42%,
              #f3a24d 72%,
              #ef7d22 100%
            );

          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .overlay {
          width: 100%;
          max-width: 520px;
          text-align: center;
        }

        .logo {
          width: 220px;
          margin-bottom: 20px;
          border-radius: 20px;
        }

        h1 {
          color: white;
          font-size: 52px;
          margin-bottom: 24px;
          text-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }

        .card {
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(14px);
          border-radius: 26px;
          padding: 24px;
          text-align: left;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }

        label {
          display: block;
          color: white;
          font-weight: bold;
          margin-bottom: 8px;
          margin-top: 18px;
        }

        input,
        select {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: none;
          font-size: 18px;
          margin-bottom: 8px;
        }

        button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 18px;
          color: white;
          font-size: 26px;
          font-weight: bold;
          margin-top: 18px;
        }

        .green {
          background: #16a34a;
        }

        .red {
          background: #dc2626;
        }

        .meldung {
          margin-top: 18px;
          color: white;
          font-weight: bold;
          text-align: center;
        }

        .dropdown {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .dropdownItem {
          padding: 14px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }

        .dropdownItem:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
