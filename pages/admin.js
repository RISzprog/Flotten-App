import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

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

  async function laden() {
    const { data, error } = await supabase
      .from("zeiten")
      .select("*")
      .order("id", { ascending: false });

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

  useEffect(() => {
    laden();
  }, []);

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="logo">RIS</div>
          <h1>RIS Admin</h1>
          <p>Zeiten · Fahrzeuge · GPS · Arbeitsdauer</p>
        </header>

        <div className="topbar">
          <button className="refresh" onClick={laden}>
            Aktualisieren
          </button>

          {meldung && <div className="message">{meldung}</div>}
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Fahrzeug</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Dauer</th>
                <th>GPS</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>

            <tbody>
              {zeiten.map((z) => (
                <tr key={z.id}>
                  <td>{z.mitarbeiter}</td>
                  <td>{z.fahrzeug}</td>
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
                    <span
                      className={
                        z.status === "eingestempelt"
                          ? "badge green"
                          : "badge red"
                      }
                    >
                      {z.status === "eingestempelt"
                        ? "Eingestempelt"
                        : "Ausgestempelt"}
                    </span>
                  </td>

                  <td>
                    <button
                      className="delete"
                      onClick={() => loeschen(z.id)}
                    >
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
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #eaf4ff 35%,
            #ffffff 55%,
            #ffb347 100%
          );
          color: #0f2f6e;
        }

        .wrap {
          max-width: 1250px;
          margin: 0 auto;
        }

        header {
          text-align: center;
          margin-bottom: 24px;
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
          margin: 0;
          font-size: 42px;
          font-weight: 900;
        }

        header p {
          color: #f97316;
          font-weight: bold;
          font-size: 18px;
        }

        .topbar {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
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
          box-shadow: 0 8px 18px rgba(15, 47, 110, 0.12);
        }

        .tableWrap {
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(15, 47, 110, 0.18);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
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
          cursor: pointer;
        }

        footer {
          text-align: center;
          margin-top: 36px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
