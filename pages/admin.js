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
  const [mitarbeiter, setMitarbeiter] = useState([]);

  const [meldung, setMeldung] = useState("");

  const [neuesFahrzeug, setNeuesFahrzeug] = useState("");
  const [neuesKennzeichen, setNeuesKennzeichen] = useState("");

  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");

  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [datumFilter, setDatumFilter] = useState("");
  const [nurAktive, setNurAktive] = useState(false);
  const [suche, setSuche] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session) {
        allesLaden();
      }
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);

        if (newSession) {
          allesLaden();
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

  async function allesLaden() {
    await laden();
    await fahrzeugeLaden();
    await mitarbeiterLaden();
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

  async function mitarbeiterLaden() {
    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("nachname", { ascending: true });

    if (!error) {
      setMitarbeiter(data || []);
    }
  }

  function csvExportieren() {
    const kopf = [
      "Datum",
      "Fahrzeug",
      "Mitarbeiter",
      "Start",
      "Ende",
      "Dauer",
      "GPS",
      "Status"
    ];

    const zeilen = gefilterteZeiten.map((z) => [
      formatZeit(z.startzeit).split(",")[0],
      z.fahrzeug || "",
      z.mitarbeiter || "",
      formatZeit(z.startzeit),
      formatZeit(z.endzeit),
      dauer(z.startzeit, z.endzeit),
      z.latitude && z.longitude
        ? `https://www.google.com/maps?q=${z.latitude},${z.longitude}`
        : "GPS deaktiviert",
      z.status === "eingestempelt"
        ? "Abgeholt"
        : "Abgegeben"
    ]);

    const csv =
      "\uFEFF" +
      [kopf, ...zeilen]
        .map((reihe) =>
          reihe
            .map((feld) =>
              `"${String(feld).replaceAll('"', '""')}"`
            )
            .join(";")
        )
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      `RIS_Flotten_Export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  async function fahrzeugHinzufuegen() {
    if (!neuesFahrzeug.trim()) {
      setMeldung("Bitte Fahrzeugname eingeben");
      return;
    }

    const { error } = await supabase
      .from("fahrzeuge")
      .insert([
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

  async function mitarbeiterHinzufuegen() {
    if (
      !neuerVorname.trim() ||
      !neuerNachname.trim()
    ) {
      setMeldung(
        "Bitte Vorname und Nachname eingeben"
      );

      return;
    }

    const { error } = await supabase
      .from("mitarbeiter")
      .insert([
        {
          vorname: neuerVorname.trim(),
          nachname: neuerNachname.trim(),
          aktiv: true
        }
      ]);

    if (error) {
      setMeldung(
        "Fehler beim Mitarbeiter hinzufügen"
      );

      return;
    }

    setNeuerVorname("");
    setNeuerNachname("");

    setMeldung("Mitarbeiter hinzugefügt");

    mitarbeiterLaden();
  }  async function fahrzeugBearbeiten(f) {
    const neuerName = window.prompt(
      "Fahrzeugname:",
      f.name
    );

    if (!neuerName) return;

    const neuesKennz = window.prompt(
      "Kennzeichen:",
      f.kennzeichen || ""
    );

    const { error } = await supabase
      .from("fahrzeuge")
      .update({
        name: neuerName.trim(),
        kennzeichen: neuesKennz
          ? neuesKennz.trim()
          : ""
      })
      .eq("id", f.id);

    if (error) {
      setMeldung("Fehler beim Bearbeiten");
      return;
    }

    setMeldung("Fahrzeug geändert");

    fahrzeugeLaden();
  }

  async function fahrzeugAktivAendern(
    id,
    aktiv
  ) {
    await supabase
      .from("fahrzeuge")
      .update({
        aktiv: !aktiv
      })
      .eq("id", id);

    fahrzeugeLaden();
  }

  async function fahrzeugLoeschen(id) {
    const sicher = window.confirm(
      "Fahrzeug wirklich löschen?"
    );

    if (!sicher) return;

    await supabase
      .from("fahrzeuge")
      .delete()
      .eq("id", id);

    fahrzeugeLaden();
  }

  async function mitarbeiterBearbeiten(m) {
    const vorname = window.prompt(
      "Vorname:",
      m.vorname
    );

    if (!vorname) return;

    const nachname = window.prompt(
      "Nachname:",
      m.nachname
    );

    if (!nachname) return;

    await supabase
      .from("mitarbeiter")
      .update({
        vorname: vorname.trim(),
        nachname: nachname.trim()
      })
      .eq("id", m.id);

    mitarbeiterLaden();
  }

  async function mitarbeiterAktivAendern(
    id,
    aktiv
  ) {
    await supabase
      .from("mitarbeiter")
      .update({
        aktiv: !aktiv
      })
      .eq("id", id);

    mitarbeiterLaden();
  }

  async function mitarbeiterLoeschen(id) {
    const sicher = window.confirm(
      "Mitarbeiter wirklich löschen?"
    );

    if (!sicher) return;

    await supabase
      .from("mitarbeiter")
      .delete()
      .eq("id", id);

    mitarbeiterLaden();
  }

  async function eintragLoeschen(id) {
    const sicher = window.confirm(
      "Diesen Eintrag löschen?"
    );

    if (!sicher) return;

    await supabase
      .from("zeiten")
      .delete()
      .eq("id", id);

    laden();
  }

  const fahrzeugNamen = useMemo(() => {
    return fahrzeuge
      .map((f) => f.name)
      .filter(Boolean)
      .sort();
  }, [fahrzeuge]);

  const gefilterteZeiten = useMemo(() => {
    return zeiten.filter((z) => {
      if (
        fahrzeugFilter &&
        !String(z.fahrzeug || "").includes(
          fahrzeugFilter
        )
      ) {
        return false;
      }

      if (
        datumFilter &&
        formatDatum(z.startzeit) !== datumFilter
      ) {
        return false;
      }

      if (
        nurAktive &&
        z.status !== "eingestempelt"
      ) {
        return false;
      }

      if (suche) {
        const text =
          `${z.mitarbeiter || ""} ${z.fahrzeug || ""}`.toLowerCase();

        if (
          !text.includes(
            suche.toLowerCase()
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    zeiten,
    fahrzeugFilter,
    datumFilter,
    nurAktive,
    suche
  ]);

  if (!session) {
    return (
      <div className="page loginPage">
        <div className="loginBox">
          <div className="logo">
            RIS
          </div>

          <h1>Admin Login</h1>

          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Passwort"
            value={passwort}
            onChange={(e) =>
              setPasswort(e.target.value)
            }
          />

          <button onClick={login}>
            Einloggen
          </button>

          {meldung && (
            <p>{meldung}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="logo">
            RIS
          </div>

          <h1>RIS Admin</h1>
        </header>

        <div className="topActions">
          <button
            className="refresh"
            onClick={allesLaden}
          >
            Aktualisieren
          </button>

          <button
            className="export"
            onClick={csvExportieren}
          >
            CSV Export
          </button>

          <button
            className="logout"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        {meldung && (
          <div className="message">
            {meldung}
          </div>
        )}

        <div className="dashboardGrid">
          <div className="dashboardCard">
            <span>
              🚗 Fahrzeuge unterwegs
            </span>

            <strong>
              {
                zeiten.filter(
                  (z) =>
                    z.status ===
                    "eingestempelt"
                ).length
              }
            </strong>
          </div>

          <div className="dashboardCard">
            <span>
              ✅ Fahrzeuge verfügbar
            </span>

            <strong>
              {
                fahrzeuge.filter((f) => {
                  const aktiv =
                    zeiten.some(
                      (z) =>
                        z.status ===
                          "eingestempelt" &&
                        String(
                          z.fahrzeug || ""
                        ).includes(
                          f.name
                        )
                    );

                  return (
                    f.aktiv &&
                    !aktiv
                  );
                }).length
              }
            </strong>
          </div>

          <div className="dashboardCard">
            <span>
              👷 Aktive Mitarbeiter
            </span>

            <strong>
              {
                zeiten.filter(
                  (z) =>
                    z.status ===
                    "eingestempelt"
                ).length
              }
            </strong>
          </div>

          <div className="dashboardCard">
            <span>
              📍 Letzte Abholung
            </span>

            <strong>
              {zeiten.length > 0
                ? formatZeit(
                    zeiten[0].startzeit
                  )
                : "-"}
            </strong>
          </div>
        </div>
        <div className="filters">
          <input
            placeholder="Suche Mitarbeiter/Fahrzeug/Kennzeichen"
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
                      <a href={`https://www.google.com/maps?q=${z.latitude},${z.longitude}`} target="_blank" rel="noopener noreferrer">
                        Karte öffnen
                      </a>
                    ) : (
                      <span className="muted">GPS deaktiviert</span>
                    )}
                  </td>
                  <td>
                    <span className={z.status === "eingestempelt" ? "badge green" : "badge red"}>
                      {z.status === "eingestempelt" ? "Abgeholt" : "Abgegeben"}
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
        .page { min-height: 100vh; padding: 24px; font-family: Arial, sans-serif; background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f3a24d 72%, #ef7d22 100%); color: #0f2f6e; }
        .wrap { max-width: 1300px; margin: 0 auto; }
        header { text-align: center; margin-bottom: 24px; color: white; }
        .logo { margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; width: 86px; height: 50px; border-radius: 14px; background: white; color: #0f2f6e; font-size: 30px; font-weight: 900; border-bottom: 5px solid #f97316; }
        h1 { margin: 0; font-size: 42px; font-weight: 900; }
        .topActions { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .refresh, .logout, .export { border: none; padding: 12px 18px; border-radius: 12px; font-weight: bold; color: white; }
        .refresh { background: #0f2f6e; }
        .export { background: #16a34a; }
        .logout, .delete { background: #dc2626; }
        .message { background: white; padding: 10px 14px; border-radius: 10px; font-weight: bold; margin-bottom: 12px; }
        .dashboardGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 22px; }
        .dashboardCard { background: rgba(255,255,255,0.94); border-radius: 22px; padding: 22px; box-shadow: 0 15px 35px rgba(0,0,0,0.14); display: flex; flex-direction: column; gap: 12px; }
        .dashboardCard span { color: #64748b; font-size: 15px; font-weight: bold; }
        .dashboardCard strong { font-size: 30px; color: #0f2f6e; }
        .filters { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 12px; margin-bottom: 18px; background: rgba(255,255,255,0.22); backdrop-filter: blur(14px); padding: 14px; border-radius: 18px; }
        .filters input, .filters select { padding: 12px; border-radius: 12px; border: none; font-size: 15px; }
        .check { display: flex; align-items: center; gap: 8px; background: white; padding: 10px 12px; border-radius: 12px; font-weight: bold; }
        .tableWrap { overflow-x: auto; background: rgba(255,255,255,0.96); border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.18); margin-bottom: 22px; }
        table { width: 100%; border-collapse: collapse; min-width: 1100px; }
        th { background: #0f2f6e; color: white; padding: 14px; text-align: left; }
        td { padding: 14px; border-bottom: 1px solid #e5e7eb; }
        a { color: #0f2f6e; font-weight: bold; text-decoration: underline; }
        .muted { color: #64748b; font-weight: bold; }
        .badge { display: inline-block; color: white; padding: 7px 12px; border-radius: 999px; font-weight: bold; font-size: 14px; }
        .green { background: #16a34a; }
        .red { background: #dc2626; }
        .delete { color: white; border: none; padding: 8px 12px; border-radius: 10px; font-weight: bold; }
        footer { text-align: center; margin-top: 36px; font-weight: bold; color: white; }
        @media (max-width: 900px) { .filters { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
