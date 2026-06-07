import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function formatZeit(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dauerText(start, ende) {
  if (!start) return "-";
  const endeZeit = ende ? new Date(ende) : new Date();
  const diff = Math.max(0, Math.floor((endeZeit - new Date(start)) / 60000));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}min`;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [rolle, setRolle] = useState("");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [meldung, setMeldung] = useState("");

  const [zeiten, setZeiten] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [auswahl, setAuswahl] = useState([]);

  const [suche, setSuche] = useState("");
  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [datumFilter, setDatumFilter] = useState("");
  const [nurAktive, setNurAktive] = useState(false);
  const [kartenSuche, setKartenSuche] = useState("");

  const [zeigeHistorie, setZeigeHistorie] = useState(true);
  const [zeigeKarte, setZeigeKarte] = useState(false);
  const [zeigeMitarbeiter, setZeigeMitarbeiter] = useState(false);
  const [zeigeFahrzeuge, setZeigeFahrzeuge] = useState(false);

  const [neuerVorname, setNeuerVorname] = useState("");
  const [neuerNachname, setNeuerNachname] = useState("");
  const [neuesFahrzeug, setNeuesFahrzeug] = useState("");
  const [neuesKennzeichen, setNeuesKennzeichen] = useState("");
  const [neueKategorie, setNeueKategorie] = useState("PKW");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        ladeRolle(data.session.user.email);
        allesLaden();

      function berechneFahrerStunden() {
        const tage = {};
        const monate = {};

        zeiten
         .filter((z) => z.mitarbeiter && z.startzeit && z.endzeit)
         .forEach((z) => {
           const start = new Date(z.startzeit);
           const ende = new Date(z.endzeit);
           const stunden = (ende - start) / 1000 / 60 / 60;

           if (stunden <= 0) return;

           const tag = start.toLocaleDateString("de-DE");
           const monat = start.toLocaleDateString("de-DE", {
            month: "2-digit",
            year: "numeric",
           });

           const tagKey = `${z.mitarbeiter}-${tag}`;
           const monatKey = `${z.mitarbeiter}-${monat}`;

           tage[tagKey] = {
             mitarbeiter: z.mitarbeiter,
             tag,
             stunden: (tage[tagKey]?.stunden || 0) + stunden,
           };

           monate[monatKey] = {
             mitarbeiter: z.mitarbeiter,
             monat,
             stunden: (monate[monatKey]?.stunden || 0) + stunden,
           };
         });

       return {
        tage: Object.values(tage),
        monate: Object.values(monate),
       };
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          ladeRolle(newSession.user.email);
          allesLaden();
        }
      }
    );

    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zeiten" },
        () => laden()
      )
      .subscribe();

    const interval = setInterval(() => {
      laden();
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function ladeRolle(userEmail) {
    const { data } = await supabase
      .from("user_roles")
      .select("rolle")
      .eq("email", userEmail)
      .single();

    if (data) setRolle(data.rolle);
  }

  async function login() {
    setMeldung("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort,
    });

    if (error) setMeldung("Login fehlgeschlagen");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setRolle("");
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

  async function eintragLoeschen(id) {
    const ok = confirm("Fahrt wirklich löschen?");
    if (!ok) return;

    await supabase.from("zeiten").delete().eq("id", id);
    setAuswahl([]);
    laden();
  }

  async function mehrereLoeschen() {
    if (auswahl.length === 0) {
      alert("Bitte Fahrten auswählen");
      return;
    }

    const ok = confirm("Ausgewählte Fahrten wirklich löschen?");
    if (!ok) return;

    await supabase.from("zeiten").delete().in("id", auswahl);
    setAuswahl([]);
    laden();
  }

  async function mitarbeiterHinzufuegen() {
    if (!neuerVorname.trim() || !neuerNachname.trim()) {
      setMeldung("Bitte Vorname und Nachname eingeben");
      return;
    }

    await supabase.from("mitarbeiter").insert({
      vorname: neuerVorname.trim(),
      nachname: neuerNachname.trim(),
      aktiv: true,
    });

    setNeuerVorname("");
    setNeuerNachname("");
    mitarbeiterLaden();
  }

  async function mitarbeiterLoeschen(id) {
    const ok = confirm("Mitarbeiter wirklich löschen?");
    if (!ok) return;

    await supabase.from("mitarbeiter").delete().eq("id", id);
    mitarbeiterLaden();
  }

  async function mitarbeiterAktivAendern(id, aktiv) {
    await supabase.from("mitarbeiter").update({ aktiv: !aktiv }).eq("id", id);
    mitarbeiterLaden();
  }

  async function fahrzeugHinzufuegen() {
    if (!neuesFahrzeug.trim()) {
      setMeldung("Bitte Fahrzeugname eingeben");
      return;
    }

    await supabase.from("fahrzeuge").insert({
      name: neuesFahrzeug.trim(),
      kennzeichen: neuesKennzeichen.trim(),
      kategorie: neueKategorie,
      aktiv: true,
    });

    setNeuesFahrzeug("");
    setNeuesKennzeichen("");
    setNeueKategorie("PKW");
    fahrzeugeLaden();
  }

  async function fahrzeugLoeschen(id) {
    const ok = confirm("Fahrzeug wirklich löschen?");
    if (!ok) return;

    await supabase.from("fahrzeuge").delete().eq("id", id);
    fahrzeugeLaden();
  }

  async function fahrzeugAktivAendern(id, aktiv) {
    await supabase.from("fahrzeuge").update({ aktiv: !aktiv }).eq("id", id);
    fahrzeugeLaden();
  }

  const aktiveZeiten = zeiten.filter((z) => z.status === "eingestempelt");

  const fahrzeugNamen = useMemo(() => {
    return [...new Set(zeiten.map((z) => z.fahrzeug).filter(Boolean))];
  }, [zeiten]);

  const gefilterteZeiten = useMemo(() => {
    const text = suche.toLowerCase();

    return zeiten.filter((z) => {
      const passtSuche =
        !text ||
        String(z.mitarbeiter || "").toLowerCase().includes(text) ||
        String(z.beifahrer || "").toLowerCase().includes(text) ||
        String(z.fahrzeug || "").toLowerCase().includes(text);

      const passtFahrzeug = !fahrzeugFilter || z.fahrzeug === fahrzeugFilter;

      const passtDatum =
        !datumFilter ||
        new Date(z.startzeit).toISOString().slice(0, 10) === datumFilter;

      const passtAktiv = !nurAktive || z.status === "eingestempelt";

      return passtSuche && passtFahrzeug && passtDatum && passtAktiv;
    });
  }, [zeiten, suche, fahrzeugFilter, datumFilter, nurAktive]);

  const gesamtHeute = zeiten.filter((z) => {
    if (!z.startzeit) return false;
    const heute = new Date().toISOString().slice(0, 10);
    return new Date(z.startzeit).toISOString().slice(0, 10) === heute;
  });

  const fahrerStunden = berechneFahrerStunden();
  
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
            background: linear-gradient(90deg, #2f5fb3, #f97316);
          }

          .loginPage {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .loginBox {
            background: white;
            padding: 28px;
            border-radius: 24px;
            width: 360px;
            text-align: center;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
          }

          .logo {
            font-size: 30px;
            font-weight: 900;
            color: #0f2f6e;
            margin-bottom: 12px;
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
          <div>
            <h1>RIS Admin</h1>
            <p>{session.user.email}</p>
          </div>

         <button className="logout" onClick={allesLaden}>
           Aktualisieren
         </button>
  
          <button className="logout" onClick={logout}>
            Logout
          </button>
        </header>

        <section className="statsGrid">
          <div className="statCard">
            <span>Aktive Fahrzeuge</span>
            <strong>{aktiveZeiten.length}</strong>
          </div>

          <div className="statCard">
            <span>Fahrten heute</span>
            <strong>{gesamtHeute.length}</strong>
          </div>

          <div className="statCard">
            <span>Fahrzeuge gesamt</span>
            <strong>{fahrzeuge.length}</strong>
          </div>

          <div className="statCard">
            <span>Mitarbeiter gesamt</span>
            <strong>{mitarbeiter.length}</strong>
          </div>
        </section>

    <section className="card">
      <h2>Fahrer-Stundenübersicht</h2>

      <h3>Nach Tag</h3>
       <table>
        <thead>
         <tr>
          <th>Fahrer</th>
          <th>Tag</th>
          <th>Stunden</th>
         </tr>
        </thead>
        <tbody>
          {fahrerStunden.tage.map((e) => (
            <tr key={`${e.mitarbeiter}-${e.tag}`}>
              <td>{e.mitarbeiter}</td>
              <td>{e.tag}</td>
              <td>{e.stunden.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
     </table>

    <h3>Gesamt im Monat</h3>
    <table>
      <thead>
        <tr>
          <th>Fahrer</th>
          <th>Monat</th>
          <th>Stunden</th>
        </tr>
      </thead>
     <tbody>
       {fahrerStunden.monate.map((e) => (
          <tr key={`${e.mitarbeiter}-${e.monat}`}>
            <td>{e.mitarbeiter}</td>
            <td>{e.monat}</td>
            <td>{e.stunden.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>

        <div className="filters">
          <input
            placeholder="Suche Mitarbeiter/Beifahrer/Fahrzeug/Kennzeichen"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
          />

          <select
            value={fahrzeugFilter}
            onChange={(e) => setFahrzeugFilter(e.target.value)}
          >
            <option value="">Alle Fahrzeuge</option>
            {fahrzeugNamen.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
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
              {auswahl.length > 0 && (
                <button className="delete bulk" onClick={mehrereLoeschen}>
                  {auswahl.length} ausgewählte löschen
                </button>
              )}

              <table>
                <thead>
                  <tr>
                    <th></th>
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
                      <td>
                        <input
                          type="checkbox"
                          checked={auswahl.includes(z.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAuswahl([...auswahl, z.id]);
                            } else {
                              setAuswahl(
                                auswahl.filter((id) => id !== z.id)
                              );
                            }
                          }}
                        />
                      </td>

                      <td>{formatZeit(z.startzeit).split(",")[0]}</td>
                      <td>
                        <strong>{z.fahrzeug}</strong>
                      </td>
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
                        <span
                          className={
                            z.status === "eingestempelt"
                              ? "badge green"
                              : "badge red"
                          }
                        >
                          {z.status === "eingestempelt"
                            ? "Abgeholt"
                            : "Abgegeben"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="delete"
                          onClick={() => eintragLoeschen(z.id)}
                        >
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
          <button
            className="toggleTitle"
            onClick={() => setZeigeKarte(!zeigeKarte)}
          >
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
                <button onClick={mitarbeiterHinzufuegen}>
                  Mitarbeiter hinzufügen
                </button>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mitarbeiter.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.vorname} {m.nachname}
                        </td>
                        <td>{m.aktiv ? "Aktiv" : "Inaktiv"}</td>
                        <td>
                          <button
                            onClick={() =>
                              mitarbeiterAktivAendern(m.id, m.aktiv)
                            }
                          >
                            {m.aktiv ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button
                            className="delete"
                            onClick={() => mitarbeiterLoeschen(m.id)}
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <select
                  value={neueKategorie}
                  onChange={(e) => setNeueKategorie(e.target.value)}
                >
                  <option>PKW</option>
                  <option>Transporter</option>
                  <option>Anhänger</option>
                </select>
                <button onClick={fahrzeugHinzufuegen}>
                  Fahrzeug hinzufügen
                </button>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fahrzeug</th>
                      <th>Kennzeichen</th>
                      <th>Kategorie</th>
                      <th>Status</th>
                      <th>QR Link</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fahrzeuge.map((f) => {
                      const fahrzeugName = `${f.name} · ${
                        f.kennzeichen || ""
                      }`;
                      const qrLink = `https://ris-flotten-app.vercel.app/?fahrzeug=${encodeURIComponent(
                        fahrzeugName
                      )}`;

                      return (
                        <tr key={f.id}>
                          <td>{f.name}</td>
                          <td>{f.kennzeichen || "-"}</td>
                          <td>{f.kategorie || "-"}</td>
                          <td>{f.aktiv ? "Aktiv" : "Inaktiv"}</td>
                          <td className="qrLink">{qrLink}</td>
                          <td>
                            <button
                              onClick={() =>
                                fahrzeugAktivAendern(f.id, f.aktiv)
                              }
                            >
                              {f.aktiv ? "Deaktivieren" : "Aktivieren"}
                            </button>
                            <button
                              className="delete"
                              onClick={() => fahrzeugLoeschen(f.id)}
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <footer>© RIS 2026</footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          font-family: Arial, sans-serif;
          background: linear-gradient(90deg, #2f5fb3 0%, #4f7fd8 42%, #f97316 100%);
          color: #0f2f6e;
          padding: 18px;
          zoom: 0.92;
        }

        .wrap {
          max-width: 1600px;
          margin: 0 auto;
        }

        header {
          display: flex;
          align-items: center;
          gap: 18px;
          color: white;
          margin-bottom: 18px;
        }

        h1 {
          font-size: 34px;
          margin: 0;
        }

        header p {
          margin: 4px 0 0;
          font-weight: bold;
        }

        .logo {
          background: white;
          color: #0f2f6e;
          font-size: 28px;
          font-weight: 900;
          padding: 12px 16px;
          border-radius: 16px;
        }

        .logout {
          margin-left: auto;
          width: auto;
          background: #ef4444;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .statCard {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 18px;
          padding: 14px;
          min-height: 85px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.14);
        }

        .statCard span {
          display: block;
          color: #64748b;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 34px;
        }

        .filters,
        .formGrid {
          display: grid;
          grid-template-columns: 2fr 1.4fr 1.2fr auto;
          gap: 12px;
          background: rgba(255, 255, 255, 0.2);
          padding: 12px;
          border-radius: 18px;
          margin-bottom: 16px;
        }

        .box {
          background: rgba(255, 255, 255, 0.96);
          border-radius: 20px;
          padding: 14px;
          margin-bottom: 16px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.14);
        }

        .toggleTitle {
          width: 100%;
          background: transparent;
          border: none;
          color: #0f2f6e;
          text-align: left;
          font-size: 18px;
          font-weight: 900;
          padding: 4px 0;
          margin-bottom: 8px;
          box-shadow: none;
        }

        input,
        select {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 16px;
          box-sizing: border-box;
        }

        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: bold;
          white-space: nowrap;
        }

        .check input {
          width: auto;
        }

        button {
          border: none;
          border-radius: 12px;
          background: #0f2f6e;
          color: white;
          padding: 10px 12px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
        }

        .delete {
          background: #dc2626;
        }

        .bulk {
          margin-bottom: 10px;
          width: auto;
        }

        .tableWrap {
          overflow-x: auto;
          background: white;
          border-radius: 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
          font-size: 14px;
        }

        th {
          background: #0f2f6e;
          color: white;
          padding: 8px;
          text-align: left;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        a {
          color: #0f2f6e;
          font-weight: bold;
        }

        .badge {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          color: white;
          font-weight: bold;
        }

        .green {
          background: #16a34a;
        }

        .red {
          background: #dc2626;
        }

        .muted {
          color: #64748b;
        }

        .mapSearch {
          margin-bottom: 12px;
        }

        .qrLink {
          font-size: 12px;
          word-break: break-all;
          color: #64748b;
        }

        footer {
          text-align: center;
          color: white;
          font-weight: bold;
          margin: 30px 0;
        }

        @media (max-width: 900px) {
          .filters,
          .formGrid {
            grid-template-columns: 1fr;
          }

          .page {
            zoom: 0.86;
          }

          h1 {
            font-size: 26px;
          }

          .toggleTitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
