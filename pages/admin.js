import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const LiveMap = dynamic(() => import("../components/LiveMap"), {
  ssr: false
});

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

function dauerMinuten(start, ende) {
  if (!start || !ende) return 0;
  return Math.floor((new Date(ende) - new Date(start)) / 60000);
}

function dauerText(start, ende) {
  const minuten = dauerMinuten(start, ende);
  if (!minuten) return "-";
  return `${Math.floor(minuten / 60)}h ${minuten % 60}min`;
}

function minutenZuText(minuten) {
  return `${Math.floor(minuten / 60)}h ${minuten % 60}min`;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [rolle, setRolle] = useState("");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");

  const [zeiten, setZeiten] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);

  const [meldung, setMeldung] = useState("");
  const [suche, setSuche] = useState("");
  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [datumFilter, setDatumFilter] = useState("");
  const [nurAktive, setNurAktive] = useState(false);
  const [kartenSuche, setKartenSuche] = useState("");

  const [neuesFahrzeug, setNeuesFahrzeug] = useState("");
  const [neuesKennzeichen, setNeuesKennzeichen] = useState("");
  const [neueKategorie, setNeueKategorie] = useState("PKW");

  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");

  const [qrFahrzeug, setQrFahrzeug] = useState(null);

  const [zeigeKarte, setZeigeKarte] = useState(false);
  const [zeigeMitarbeiter, setZeigeMitarbeiter] = useState(false);
  const [zeigeFahrzeuge, setZeigeFahrzeuge] = useState(false);
  const [zeigeHistorie, setZeigeHistorie] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);

    if (data.session) {
      ladeRolle(data.session.user.email);
      allesLaden();
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, newSession) => {
      setSession(newSession);

      if (newSession) {
        ladeRolle(newSession.user.email);
        allesLaden();
      }
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

async function ladeRolle(email) {
  const { data } = await supabase
    .from("user_roles")
    .select("rolle")
    .eq("email", email)
    .single();

  if (data) setRolle(data.rolle);
}

async function login() {
    setMeldung("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort
    });

    if (error) setMeldung("Login fehlgeschlagen");
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

    if (!error) setZeiten(data || []);
  }

  async function fahrzeugeLaden() {
    const { data, error } = await supabase
      .from("fahrzeuge")
      .select("*")
      .order("name", { ascending: true });

    if (!error) setFahrzeuge(data || []);
  }

  async function mitarbeiterLaden() {
    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("nachname", { ascending: true });

    if (!error) setMitarbeiter(data || []);
  }

  function fahrzeugLink(f) {
    const basis = typeof window !== "undefined" ? window.location.origin : "";
    const code = f.kennzeichen || f.name;
    return `${basis}/?fahrzeug=${encodeURIComponent(code)}`;
  }

  function qrBildUrl(f) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      fahrzeugLink(f)
    )}`;
  }

  function csvExportieren() {
    const kopf = [
      "Datum",
      "Fahrzeug",
      "Mitarbeiter",
      "Beifahrer",
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
      z.beifahrer || "",
      formatZeit(z.startzeit),
      formatZeit(z.endzeit),
      dauerText(z.startzeit, z.endzeit),
      z.latitude && z.longitude
        ? `https://www.google.com/maps?q=${z.latitude},${z.longitude}`
        : "GPS deaktiviert",
      z.status === "eingestempelt" ? "Abgeholt" : "Abgegeben"
    ]);

    const csv =
      "\uFEFF" +
      [kopf, ...zeilen]
        .map((reihe) =>
          reihe.map((feld) => `"${String(feld).replaceAll('"', '""')}"`).join(";")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `RIS_Flotten_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
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
        kategorie: neueKategorie,
        aktiv: true
      }
    ]);

    if (error) {
      setMeldung("Fehler beim Fahrzeug hinzufügen");
      return;
    }

    setNeuesFahrzeug("");
    setNeuesKennzeichen("");
    setNeueKategorie("PKW");
    setMeldung("Fahrzeug hinzugefügt");
    fahrzeugeLaden();
  }

  async function fahrzeugBearbeiten(f) {
    const neuerName = window.prompt("Fahrzeugname:", f.name);
    if (!neuerName) return;

    const neuesKennz = window.prompt("Kennzeichen:", f.kennzeichen || "");
    const neueKat = window.prompt("Kategorie: PKW, Transporter oder Anhänger", f.kategorie || "PKW");

    await supabase
      .from("fahrzeuge")
      .update({
        name: neuerName.trim(),
        kennzeichen: neuesKennz ? neuesKennz.trim() : "",
        kategorie: neueKat || "PKW"
      })
      .eq("id", f.id);

    fahrzeugeLaden();
  }

  async function fahrzeugAktivAendern(id, aktiv) {
    await supabase.from("fahrzeuge").update({ aktiv: !aktiv }).eq("id", id);
    fahrzeugeLaden();
  }

  async function fahrzeugLoeschen(id) {
    if (!window.confirm("Fahrzeug wirklich löschen?")) return;
    await supabase.from("fahrzeuge").delete().eq("id", id);
    fahrzeugeLaden();
  }

  async function mitarbeiterHinzufuegen() {
    if (!neuerVorname.trim() || !neuerNachname.trim()) {
      setMeldung("Bitte Vorname und Nachname eingeben");
      return;
    }

    await supabase.from("mitarbeiter").insert([
      {
        vorname: neuerVorname.trim(),
        nachname: neuerNachname.trim(),
        aktiv: true
      }
    ]);

    setNeuerVorname("");
    setNeuerNachname("");
    mitarbeiterLaden();
  }

  async function mitarbeiterBearbeiten(m) {
    const vorname = window.prompt("Vorname:", m.vorname);
    if (!vorname) return;

    const nachname = window.prompt("Nachname:", m.nachname);
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

  async function mitarbeiterAktivAendern(id, aktiv) {
    await supabase.from("mitarbeiter").update({ aktiv: !aktiv }).eq("id", id);
    mitarbeiterLaden();
  }

  async function mitarbeiterLoeschen(id) {
    if (!window.confirm("Mitarbeiter wirklich löschen?")) return;
    await supabase.from("mitarbeiter").delete().eq("id", id);
    mitarbeiterLaden();
  }

  async function eintragLoeschen(id) {
    if (!window.confirm("Diesen Eintrag löschen?")) return;
    await supabase.from("zeiten").delete().eq("id", id);
    laden();
  }

  const fahrzeugNamen = useMemo(() => {
    return fahrzeuge.map((f) => f.name).filter(Boolean).sort();
  }, [fahrzeuge]);

  const gefilterteZeiten = useMemo(() => {
    return zeiten.filter((z) => {
      if (fahrzeugFilter && !String(z.fahrzeug || "").includes(fahrzeugFilter)) return false;
      if (datumFilter && formatDatum(z.startzeit) !== datumFilter) return false;
      if (nurAktive && z.status !== "eingestempelt") return false;

      if (suche) {
        const text = `${z.mitarbeiter || ""} ${z.beifahrer || ""} ${z.fahrzeug || ""}`.toLowerCase();
        if (!text.includes(suche.toLowerCase())) return false;
      }

      return true;
    });
  }, [zeiten, fahrzeugFilter, datumFilter, nurAktive, suche]);

  const heute = new Date().toISOString().slice(0, 10);

  const startWoche = new Date();
  startWoche.setDate(startWoche.getDate() - startWoche.getDay() + 1);
  const wochenStartText = startWoche.toISOString().slice(0, 10);

  const minutenHeute = zeiten
    .filter((z) => formatDatum(z.startzeit) === heute)
    .reduce((summe, z) => summe + dauerMinuten(z.startzeit, z.endzeit), 0);

  const minutenWoche = zeiten
    .filter((z) => formatDatum(z.startzeit) >= wochenStartText)
    .reduce((summe, z) => summe + dauerMinuten(z.startzeit, z.endzeit), 0);

  const aktiveZeiten = zeiten.filter((z) => z.status === "eingestempelt");

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
          />

          <button onClick={login}>Einloggen</button>

          {meldung && <p>{meldung}</p>}
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
            background: rgba(255, 255, 255, 0.94);
            padding: 28px;
            border-radius: 24px;
            width: 360px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
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
        `}</style>
      </div>
    );
  }
  if (session && rolle && rolle !== "admin") {
  return (
    <div className="page loginPage">
      <div className="loginBox">
        <div className="logo">RIS</div>
        <h1>Kein Zugriff</h1>
        <p>Du bist nicht als Admin freigeschaltet.</p>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

  return (
    <div className="page">
      <div className="wrap">
        <header>
          <div className="logo">RIS</div>
          <h1>RIS Admin</h1>
        </header>

        <div className="topActions">
          <button className="refresh" onClick={allesLaden}>Aktualisieren</button>
          <button className="export" onClick={csvExportieren}>CSV Export</button>
          <button className="logout" onClick={logout}>Logout</button>
        </div>

        {meldung && <div className="message">{meldung}</div>}

        <div className="dashboardGrid">
          <div className="dashboardCard">
            <span>🚗 Fahrzeuge unterwegs</span>
            <strong>{aktiveZeiten.length}</strong>
          </div>

          <div className="dashboardCard">
            <span>✅ Fahrzeuge verfügbar</span>
            <strong>
              {
                fahrzeuge.filter((f) => {
                  const unterwegs = aktiveZeiten.some((z) =>
                    String(z.fahrzeug || "").includes(f.name)
                  );
                  return f.aktiv && !unterwegs;
                }).length
              }
            </strong>
          </div>

          <div className="dashboardCard">
            <span>👷 Aktive Mitarbeiter</span>
            <strong>{aktiveZeiten.length}</strong>

            <div className="liveList">
              {aktiveZeiten.map((z) => (
                <div key={z.id}>
                  {z.mitarbeiter} → {z.fahrzeug}
                </div>
              ))}
            </div>
          </div>

          <div className="dashboardCard">
            <span>⏱️ Stunden heute</span>
            <strong>{minutenZuText(minutenHeute)}</strong>
          </div>

          <div className="dashboardCard">
            <span>📆 Stunden Woche</span>
            <strong>{minutenZuText(minutenWoche)}</strong>
          </div>

          <div className="dashboardCard">
            <span>📍 Letzte Abholung</span>
            <strong>{zeiten.length > 0 ? formatZeit(zeiten[0].startzeit) : "-"}</strong>
          </div>
        </div>

        <div className="filters">
          <input
            placeholder="Suche Mitarbeiter/Beifahrer/Fahrzeug/Kennzeichen"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />

          <select value={fahrzeugFilter} onChange={(e) => setFahrzeugFilter(e.target.value)}>
            <option value="">Alle Fahrzeuge</option>
            {fahrzeugNamen.map((f) => (
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
        </div>
<section className="box">
  <button
    className="toggleTitle"
    onClick={() => setZeigeHistorie(!zeigeHistorie)}
  >
    {zeigeHistorie ? "▼" : "▶"} Fahrten / Historie
  </button>

  {zeigeHistorie && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Fahrzeug</th>
                <th>Mitarbeiter</th>
                <th>Beifahrer</th>
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
                  <td>{z.beifahrer || "-"}</td>
                  <td>{formatZeit(z.startzeit)}</td>
                  <td>{formatZeit(z.endzeit)}</td>
                  <td>{dauerText(z.startzeit, z.endzeit)}</td>

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
  )}
</section>
        <section className="box">
          <button className="toggleTitle" onClick={() => setZeigeKarte(!zeigeKarte)}>
            {zeigeKarte ? "▼" : "▶"} Live-Karte GPS
          </button>

          {zeigeKarte && (
            <>
              <input
                className="mapSearch"
                placeholder="Fahrzeug auf Karte suchen..."
                value={kartenSuche}
                onChange={(e) => setKartenSuche(e.target.value)}
              />

              <LiveMap
                zeiten={aktiveZeiten.filter((z) =>
                  String(z.fahrzeug || "")
                    .toLowerCase()
                    .includes(kartenSuche.toLowerCase())
                )}
              />
            </>
          )}
        </section>

        <section className="box">
          <button
            className="toggleTitle"
            onClick={() => setZeigeMitarbeiter(!zeigeMitarbeiter)}
          >
            {zeigeMitarbeiter ? "▼" : "▶"} Mitarbeiter verwalten
          </button>

          {zeigeMitarbeiter && (
            <>
              <div className="formGrid">
                <input
                  placeholder="Vorname"
                  value={neuerVorname}
                  onChange={(e) => setNeuerVorname(e.target.value)}
                />

                <input
                  placeholder="Nachname"
                  value={neuerNachname}
                  onChange={(e) => setNeuerNachname(e.target.value)}
                />

                <button className="add" onClick={mitarbeiterHinzufuegen}>
                  Mitarbeiter hinzufügen
                </button>
              </div>

              <div className="gridCards">
                {mitarbeiter.map((m) => (
                  <div key={m.id} className={m.aktiv ? "miniCard" : "miniCard inactive"}>
                    <strong>{m.vorname} {m.nachname}</strong>
                    <span>{m.aktiv ? "aktiv" : "deaktiviert"}</span>

                    <div className="miniButtons">
                      <button onClick={() => mitarbeiterBearbeiten(m)}>Bearbeiten</button>
                      <button onClick={() => mitarbeiterAktivAendern(m.id, m.aktiv)}>
                        {m.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <button className="smallDelete" onClick={() => mitarbeiterLoeschen(m.id)}>
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="box">
          <button
            className="toggleTitle"
            onClick={() => setZeigeFahrzeuge(!zeigeFahrzeuge)}
          >
            {zeigeFahrzeuge ? "▼" : "▶"} Fahrzeuge verwalten
          </button>

          {zeigeFahrzeuge && (
            <>
              <div className="formGrid">
                <input
                  placeholder="Fahrzeugname"
                  value={neuesFahrzeug}
                  onChange={(e) => setNeuesFahrzeug(e.target.value)}
                />

                <input
                  placeholder="Kennzeichen"
                  value={neuesKennzeichen}
                  onChange={(e) => setNeuesKennzeichen(e.target.value)}
                />

                <select value={neueKategorie} onChange={(e) => setNeueKategorie(e.target.value)}>
                  <option value="PKW">PKW</option>
                  <option value="Transporter">Transporter</option>
                  <option value="Anhänger">Anhänger</option>
                </select>

                <button className="add" onClick={fahrzeugHinzufuegen}>
                  Fahrzeug hinzufügen
                </button>
              </div>

              {["PKW", "Transporter", "Anhänger"].map((kat) => (
                <div key={kat}>
                  <h3>{kat}</h3>

                  <div className="gridCards">
                    {fahrzeuge
                      .filter((f) => (f.kategorie || "PKW") === kat)
                      .map((f) => (
                        <div key={f.id} className={f.aktiv ? "miniCard" : "miniCard inactive"}>
                          <strong>{f.name}</strong>
                          <span>{f.kennzeichen || "kein Kennzeichen"}</span>

                          <div className="miniButtons">
                            <button onClick={() => fahrzeugBearbeiten(f)}>Bearbeiten</button>
                            <button onClick={() => fahrzeugAktivAendern(f.id, f.aktiv)}>
                              {f.aktiv ? "Deaktivieren" : "Aktivieren"}
                            </button>
                            <button onClick={() => setQrFahrzeug(f)}>QR anzeigen</button>
                            <button className="smallDelete" onClick={() => fahrzeugLoeschen(f.id)}>
                              Löschen
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {qrFahrzeug && (
          <div className="qrOverlay" onClick={() => setQrFahrzeug(null)}>
            <div className="qrBox" onClick={(e) => e.stopPropagation()}>
              <h2>{qrFahrzeug.name}</h2>
              <p>{qrFahrzeug.kennzeichen}</p>

              <img src={qrBildUrl(qrFahrzeug)} alt="QR Code" />

              <p className="qrLink">{fahrzeugLink(qrFahrzeug)}</p>

              <button className="refresh" onClick={() => window.open(qrBildUrl(qrFahrzeug), "_blank")}>
                QR öffnen
              </button>

              <button className="logout" onClick={() => setQrFahrzeug(null)}>
                Schließen
              </button>
            </div>
          </div>
        )}

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

        .topActions {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .refresh,
        .logout,
        .export,
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

        .export {
          background: #16a34a;
        }

        .logout,
        .delete {
          background: #dc2626;
        }

        .message {
          background: white;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .dashboardGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .dashboardCard {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.14);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboardCard span {
          color: #64748b;
          font-size: 15px;
          font-weight: bold;
        }

        .dashboardCard strong {
          font-size: 30px;
          color: #0f2f6e;
        }

        .liveList {
          margin-top: 10px;
          font-size: 13px;
          color: #0f2f6e;
          display: grid;
          gap: 6px;
        }

        .liveList div {
          background: #f8fafc;
          padding: 7px 9px;
          border-radius: 10px;
          font-weight: bold;
        }

        .box {
          background: rgba(255, 255, 255, 0.94);
          padding: 18px;
          border-radius: 20px;
          margin-bottom: 18px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.14);
        }

        .toggleTitle {
          width: 100%;
          background: transparent;
          color: #0f2f6e;
          border: none;
          text-align: left;
          font-size: 24px;
          font-weight: 900;
          padding: 0;
          margin-bottom: 12px;
          box-shadow: none;
        }

        .mapSearch {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 15px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }

        .filters {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr auto;
          gap: 12px;
          margin-bottom: 18px;
          background: rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(14px);
          padding: 14px;
          border-radius: 18px;
        }

        .filters input,
        .filters select,
        .formGrid input,
        .formGrid select {
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
          background: rgba(255, 255, 255, 0.96);
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.18);
          margin-bottom: 22px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
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

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 12px;
          margin-bottom: 16px;
        }

        .gridCards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .miniCard {
          background: #f8fafc;
          border-radius: 16px;
          padding: 14px;
          border-left: 6px solid #16a34a;
        }

        .miniCard.inactive {
          opacity: 0.55;
          border-left-color: #dc2626;
        }

        .miniCard strong {
          display: block;
          font-size: 18px;
        }

        .miniCard span {
          display: block;
          color: #64748b;
          margin-top: 4px;
          margin-bottom: 10px;
        }

        .miniButtons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .miniButtons button {
          border: none;
          background: #0f2f6e;
          color: white;
          padding: 7px 10px;
          border-radius: 9px;
          font-weight: bold;
        }

        .miniButtons .smallDelete {
          background: #dc2626;
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
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: bold;
        }

        .qrOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 20px;
        }

        .qrBox {
          background: white;
          border-radius: 24px;
          padding: 26px;
          text-align: center;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .qrBox img {
          width: 260px;
          height: 260px;
          margin: 10px auto;
          display: block;
        }

        .qrLink {
          font-size: 12px;
          word-break: break-all;
          color: #64748b;
        }

        footer {
          text-align: center;
          margin-top: 36px;
          font-weight: bold;
          color: white;
        }

        @media (max-width: 900px) {
          .formGrid,
          .filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
