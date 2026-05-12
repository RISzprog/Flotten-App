import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

const ADMIN_PASSWORT = "RIS2026";

function formatZeit(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDatum(value) {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 10);
}

function dauer(start, ende) {
  if (!start || !ende) return "-";

  const diff = new Date(ende) - new Date(start);
  const minuten = Math.floor(diff / 60000);
  const stunden = Math.floor(minuten / 60);
  const rest = minuten % 60;

  return `${stunden}h ${rest}min`;
}

export default function Admin() {
  const [zeiten, setZeiten] = useState([]);
  const [meldung, setMeldung] = useState("");

  const [passwort, setPasswort] = useState("");
  const [eingeloggt, setEingeloggt] = useState(false);

  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [datumFilter, setDatumFilter] = useState("");
  const [nurAktive, setNurAktive] = useState(false);
  const [suche, setSuche] = useState("");

  async function laden() {
    const { data, error } = await supabase
      .from("zeiten")
      .select("*")
      .order("startzeit", { ascending: false });

    if (!error) {
      setZeiten(data || []);
    }
  }

  async function loeschen(id) {
    const sicher = window.confirm("Diesen Eintrag wirklich löschen?");

    if (!sicher) return;

    const { error } = await supabase
      .from("zeiten")
      .delete()
      .eq("id", id);

    if (error) {
      setMeldung("Fehler beim Löschen");
      return;
    }

    setMeldung("Eintrag gelöscht");
    laden();
  }

  function login() {
    if (passwort === ADMIN_PASSWORT) {
      setEingeloggt(true);
      setMeldung("");
      laden();
    } else {
      setMeldung("Falsches Passwort");
    }
  }

  const fahrzeuge = useMemo(() => {
    const liste = zeiten
      .map((z) => z.fahrzeug)
      .filter(Boolean);

    return [...new Set(liste)].sort();
  }, [zeiten]);

  const gefilterteZeiten = useMemo(() => {
    return zeiten
      .filter((z) => {
        if (fahrzeugFilter && z.fahrzeug !== fahrzeugFilter) return false;
        if (datumFilter && formatDatum(z.startzeit) !== datumFilter) return false;
        if (nurAktive && z.status !== "eingestempelt") return false;

        if (suche) {
          const text = `${z.mitarbeiter || ""} ${z.fahrzeug || ""}`.toLowerCase();
          if (!text.includes(suche.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === "eingestempelt" && b.status !== "eingestempelt") return -1;
        if (a.status !== "eingestempelt" && b.status === "eingestempelt") return 1;

        if ((a.fahrzeug || "") < (b.fahrzeug || "")) return -1;
        if ((a.fahrzeug || "") > (b.fahrzeug || "")) return 1;

        return new Date(b.startzeit) - new Date(a.startzeit);
      });
  }, [zeiten, fahrzeugFilter, datumFilter, nurAktive, suche]);

  useEffect(() => {
    if (eingeloggt) {
      laden();
    }
  }, [eingeloggt]);

  if (!eingeloggt) {
    return (
      <div className="page">
        <div className="loginBox">
          <div className="logo">RIS</div>
          <h1>Admin Login</h1>

          <input
            type="password"
            placeholder="Admin Passwort"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />

          <button onClick={login}>Einloggen</button>

          {meldung && <p className="error">{meldung}</p>}
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f3a24d 72%, #ef7d22 100%);
          }

          .loginBox {
            background: rgba(255,255,255,0.92);
            padding: 28px;
            border-radius: 24px;
            width: 360px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.25);
            text-align: center;
            color: #0f2f6e;
          }

          .logo {
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 86px;
            height: 50px;
            border-radius: 14px;
            background: white;
            color: #0f2f6e;
            font-size: 30px;
            font-weight: 900;
            border-bottom: 5px solid #f97316;
          }

          input {
            width: 100%;
            padding: 14px;
            margin: 16px 0;
            font-size: 18px;
            border-radius: 12px;
            border: 1px solid #cbd5e1;
            box-sizing: border-box;
          }

          button {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 12px;
            background: #0f2f6e;
            color: white;
            font-size: 18px;
            font-weight: bold;
          }

          .error {
            color: #dc2626;
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="logo">RIS</div>
          <h1>RIS Admin</h1>
          <p>Zeiten · Fahrzeuge · GPS · Arbeitsdauer</p>
        </header>

        <div className="filters">
          <input
            placeholder="Suche Mitarbeiter/Fahrzeug"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />

          <select
            value={fahrzeugFilter}
            onChange={(e) => setFahrzeugFilter(e.target.value)}
          >
            <option value="">Alle Fahrzeuge</option>
            {fahrzeuge.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <input
            type="date"
            value={datumFilter}
            onChange={(e) => setDatumFilter(e.target.value)}
          />

          <label className="check">
            <input
              type="checkbox"
              checked={nurAktive}
              onChange={(e) => setNurAktive(e.target.checked)}
            />
            Nur aktive
          </label>

          <button className="refresh" onClick={laden}>
            Aktualisieren
          </button>
        </div>

        {meldung && <div className="message">{meldung}</div>}

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Fahrzeug</th>
                <th>Mitarbeiter</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Dauer</th>
                <th>GPS</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>

            <tbody>
              {gefilterteZeiten.map((z) => (
                <tr key={z.id}>
                  <td>{formatZeit(z.startzeit).split(",")[0]}</td>
                  <td><strong>{z.fahrzeug}</strong></td>
                  <td>{z.mitarbeiter}</td>
                  <td>{formatZeit(z.startzeit)}</td>
                  <td>{formatZeit(z.endzeit)}</td>
                  <td>{dauer(z.startzeit, z.endzeit)}</td>

                  <td>
                    {z.latitude && z.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${z.latitude},${z.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Karte öffnen
                      </a>
                    ) : (
                      <span className="muted">GPS deaktiviert</span>
                    )}
                  </td>

                  <td>
                    <span className={z.status === "eingestempelt" ? "badge green" : "badge red"}>
                      {z.status === "eingestempelt" ? "Eingestempelt" : "Ausgestempelt"}
                    </span>
                  </td>

                  <td>
                    <button className="delete" onClick={() => loeschen(z.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer>© RIS 2026</footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px;
          font-family: Arial, sans-serif;
          background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f3a24d 72%, #ef7d22 100%);
          color: #0f2f6e;
        }

        .wrap {
          max-width: 1300px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 24px;
          color: white;
        }

        .logo {
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 86px;
          height: 50px;
          border-radius: 14px;
          background: white;
          color: #0f2f6e;
          font-size: 30px;
          font-weight: 900;
          border-bottom: 5px solid #f97316;
        }

        h1 {
          margin: 0;
          font-size: 42px;
          font-weight: 900;
        }

        header p {
          font-weight: bold;
          font-size: 18px;
        }

        .filters {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto auto;
          gap: 12px;
          margin-bottom: 18px;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(14px);
          padding: 14px;
          border-radius: 18px;
        }

        .filters input,
        .filters select {
          padding: 12px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 10px 12px;
          border-radius: 12px;
          font-weight: bold;
        }

        .refresh {
          background: #0f2f6e;
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: bold;
        }

        .message {
          background: white;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .tableWrap {
          overflow-x: auto;
          background: rgba(255,255,255,0.96);
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.18);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1100px;
        }

        th {
          background: #0f2f6e;
          color: white;
          padding: 14px;
          text-align: left;
        }

        td {
          padding: 14px;
          border-bottom: 1px solid #e5e7eb;
        }

        a {
          color: #0f2f6e;
          font-weight: bold;
          text-decoration: underline;
        }

        .muted {
          color: #64748b;
          font-weight: bold;
        }

        .badge {
          display: inline-block;
          color: white;
          padding: 7px 12px;
          border-radius: 999px;
          font-weight: bold;
          font-size: 14px;
        }

        .green {
          background: #16a34a;
        }

        .red {
          background: #dc2626;
        }

        .delete {
          background: #dc2626;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: bold;
        }

        footer {
          text-align: center;
          margin-top: 36px;
          font-weight: bold;
          color: white;
        }

        @media (max-width: 900px) {
          .filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
