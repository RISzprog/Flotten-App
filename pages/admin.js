import { useEffect, useMemo, useState } from "react";
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
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");

  const [zeiten, setZeiten] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);

  const [meldung, setMeldung] = useState("");
  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [datumFilter, setDatumFilter] = useState("");
  const [nurAktive, setNurAktive] = useState(false);
  const [suche, setSuche] = useState("");

  const [neuesFahrzeug, setNeuesFahrzeug] = useState("");
  const [neuesKennzeichen, setNeuesKennzeichen] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        laden();
        fahrzeugeLaden();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        laden();
        fahrzeugeLaden();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login() {
    setMeldung("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort
    });

    if (error) {
      setMeldung("Login fehlgeschlagen");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function laden() {
    const { data, error } = await supabase
      .from("zeiten")
      .select("*")
      .order("startzeit", { ascending: false });

    if (!error) {
      setZeiten(data || []);
    }
  }

  async function fahrzeugeLaden() {
    const { data, error } = await supabase
      .from("fahrzeuge")
      .select("*")
      .order("name", { ascending: true });

    if (!error) {
      setFahrzeuge(data || []);
    }
  }

  async function fahrzeugHinzufuegen() {
    if (!neuesFahrzeug.trim()) {
      setMeldung("Bitte Fahrzeugname eingeben");
      return;
    }

    const { error } = await supabase.from("fahrzeuge").insert([
      {
        name: neuesFahrzeug.trim(),
        kennzeichen: neuesKennzeichen.trim(),
        aktiv: true
      }
    ]);

    if (error) {
      setMeldung("Fehler beim Fahrzeug hinzufügen");
      return;
    }

    setNeuesFahrzeug("");
    setNeuesKennzeichen("");
    setMeldung("Fahrzeug hinzugefügt");
    fahrzeugeLaden();
  }

  async function fahrzeugAktivAendern(id, aktiv) {
    const { error } = await supabase
      .from("fahrzeuge")
      .update({ aktiv: !aktiv })
      .eq("id", id);

    if (error) {
      setMeldung("Fehler beim Ändern");
      return;
    }

    fahrzeugeLaden();
  }

  async function fahrzeugLoeschen(id) {
    const sicher = window.confirm("Fahrzeug wirklich löschen?");
    if (!sicher) return;

    const { error } = await supabase
      .from("fahrzeuge")
      .delete()
      .eq("id", id);

    if (error) {
      setMeldung("Fehler beim Löschen");
      return;
    }

    setMeldung("Fahrzeug gelöscht");
    fahrzeugeLaden();
  }

  async function fahrzeugBearbeiten(fahrzeug) {
    const neuerName = window.prompt("Fahrzeugname ändern:", fahrzeug.name);
    if (!neuerName) return;

    const neuesKennz = window.prompt("Kennzeichen ändern:", fahrzeug.kennzeichen || "");

    const { error } = await supabase
      .from("fahrzeuge")
      .update({
        name: neuerName.trim(),
        kennzeichen: neuesKennz ? neuesKennz.trim() : ""
      })
      .eq("id", fahrzeug.id);

    if (error) {
      setMeldung("Fehler beim Bearbeiten");
      return;
    }

    setMeldung("Fahrzeug geändert");
    fahrzeugeLaden();
    laden();
  }

  async function eintragLoeschen(id) {
    const sicher = window.confirm("Diesen Zeiteintrag wirklich löschen?");
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

  const fahrzeugNamen = useMemo(() => {
    return fahrzeuge.map((f) => f.name).filter(Boolean).sort();
  }, [fahrzeuge]);

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

  if (!session) {
    return (
      <div className="page loginPage">
        <div className="loginBox">
          <div className="logo">RIS</div>
          <h1>Admin Login</h1>

          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Passwort"
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
            font-family: Arial, sans-serif;
            background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f3a24d 72%, #ef7d22 100%);
          }

          .loginPage {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .loginBox {
            background: rgba(255,255,255,0.94);
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
            margin: 10px 0;
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
            margin-top: 10px;
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

        <div className="topActions">
          <button className="refresh" onClick={() => { laden(); fahrzeugeLaden(); }}>
            Aktualisieren
          </button>
          <button className="logout" onClick={logout}>Logout</button>
        </div>

        {meldung && <div className="message">{meldung}</div>}

        <section className="vehicleBox">
          <h2>Fahrzeuge verwalten</h2>

          <div className="vehicleForm">
            <input
              placeholder="Fahrzeugname, z. B. Vito 3"
              value={neuesFahrzeug}
              onChange={(e) => setNeuesFahrzeug(e.target.value)}
            />

            <input
              placeholder="Kennzeichen"
              value={neuesKennzeichen}
              onChange={(e) => setNeuesKennzeichen(e.target.value)}
            />

            <button className="add" onClick={fahrzeugHinzufuegen}>
              Fahrzeug hinzufügen
            </button>
          </div>

          <div className="vehicleGrid">
            {fahrzeuge.map((f) => (
              <div key={f.id} className={f.aktiv ? "vehicleCard" : "vehicleCard inactive"}>
                <strong>{f.name}</strong>
                <span>{f.kennzeichen || "kein Kennzeichen"}</span>

                <div className="vehicleButtons">
                  <button onClick={() => fahrzeugBearbeiten(f)}>Bearbeiten</button>
                  <button onClick={() => fahrzeugAktivAendern(f.id, f.aktiv)}>
                    {f.aktiv ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button className="smallDelete" onClick={() => fahrzeugLoeschen(f.id)}>
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="filters">
          <input
            placeholder="Suche Mitarbeiter/Fahrzeug"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />

          <select value={fahrzeugFilter} onChange={(e) => setFahrzeugFilter(e.target.value)}>
            <option value="">Alle Fahrzeuge</option>
            {fahrzeugNamen.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <input type="date" value={datumFilter} onChange={(e) => setDatumFilter(e.target.value)} />

          <label className="check">
            <input
              type="checkbox"
              checked={nurAktive}
              onChange={(e) => setNurAktive(e.target.checked)}
            />
            Nur aktive
          </label>
        </div>

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
                    <button className="delete" onClick={() => eintragLoeschen(z.id)}>
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

        .topActions {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .refresh,
        .logout,
        .add {
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: bold;
          color: white;
        }

        .refresh,
        .add {
          background: #0f2f6e;
        }

        .logout {
          background: #dc2626;
        }

        .message {
          background: white;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .vehicleBox {
          background: rgba(255,255,255,0.94);
          padding: 18px;
          border-radius: 20px;
          margin-bottom: 18px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.14);
        }

        .vehicleBox h2 {
          margin-top: 0;
        }

        .vehicleForm {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          margin-bottom: 16px;
        }

        .vehicleForm input {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 15px;
        }

        .vehicleGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .vehicleCard {
          background: #f8fafc;
          border-radius: 16px;
          padding: 14px;
          border-left: 6px solid #16a34a;
        }

        .vehicleCard.inactive {
          opacity: 0.55;
          border-left-color: #dc2626;
        }

        .vehicleCard strong {
          display: block;
          font-size: 18px;
        }

        .vehicleCard span {
          display: block;
          color: #64748b;
          margin-top: 4px;
          margin-bottom: 10px;
        }

        .vehicleButtons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .vehicleButtons button {
          border: none;
          background: #0f2f6e;
          color: white;
          padding: 7px 10px;
          border-radius: 9px;
          font-weight: bold;
        }

        .vehicleButtons .smallDelete {
          background: #dc2626;
        }

        .filters {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto;
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
          .vehicleForm,
          .filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
