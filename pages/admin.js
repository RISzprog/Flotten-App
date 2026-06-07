import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
   "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function zeit(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE");
}

function stunden(value) {
  return `${Number(value || 0).toFixed(2)} Std.`;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [zeiten, setZeiten] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);

  const [suche, setSuche] = useState("");
  const [fahrzeugFilter, setFahrzeugFilter] = useState("");
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    async function start() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        await allesLaden();
      }
    }

    start();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) await allesLaden();
      }
    );

    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zeiten" },
        () => allesLaden()
      )
      .subscribe();

    const interval = setInterval(() => {
      allesLaden();
    }, 10000);

    return () => {
      authListener?.subscription?.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function login() {
     setMeldung("Login läuft...");

     const { data, error } = await supabase.auth.signInWithPassword({
       email: email.trim(),
       password: password.trim(),
     });

     console.log("LOGIN DATA:", data);
     console.log("LOGIN ERROR:", error);

     if (error) {
        setMeldung("Login fehlgeschlagen: " + error.message);
        return;
     }

  setSession(data.session);
  setMeldung("");
  await allesLaden();
}

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function allesLaden() {
    await laden();
    await fahrzeugeLaden();
    await mitarbeiterLaden();
    setMeldung("Daten aktualisiert");
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
      .order("name", { ascending: true });

    if (!error) setMitarbeiter(data || []);
  }

  const aktiveZeiten = useMemo(() => {
    return zeiten.filter((z) => z.status === "eingestempelt");
  }, [zeiten]);

  const fahrtenHeute = useMemo(() => {
    const heute = new Date().toISOString().slice(0, 10);
    return zeiten.filter((z) => {
      if (!z.startzeit) return false;
      return new Date(z.startzeit).toISOString().slice(0, 10) === heute;
    });
  }, [zeiten]);

  const fahrerStunden = useMemo(() => {
    const tage = {};
    const monate = {};

    zeiten
      .filter((z) => z.mitarbeiter && z.startzeit && z.endzeit)
      .forEach((z) => {
        const start = new Date(z.startzeit);
        const ende = new Date(z.endzeit);
        const diff = (ende - start) / 1000 / 60 / 60;

        if (diff <= 0) return;

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
          stunden: (tage[tagKey]?.stunden || 0) + diff,
        };

        monate[monatKey] = {
          mitarbeiter: z.mitarbeiter,
          monat,
          stunden: (monate[monatKey]?.stunden || 0) + diff,
        };
      });

    return {
      tage: Object.values(tage),
      monate: Object.values(monate),
    };
  }, [zeiten]);

  const fahrzeugNamen = useMemo(() => {
    return [...new Set(zeiten.map((z) => z.fahrzeug).filter(Boolean))];
  }, [zeiten]);

  const gefilterteZeiten = useMemo(() => {
    return zeiten.filter((z) => {
      const text = `${z.mitarbeiter || ""} ${z.beifahrer || ""} ${
        z.fahrzeug || ""
      } ${z.kennzeichen || ""}`.toLowerCase();

      return (
        text.includes(suche.toLowerCase()) &&
        (!fahrzeugFilter || z.fahrzeug === fahrzeugFilter)
      );
    });
  }, [zeiten, suche, fahrzeugFilter]);

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login}>Einloggen</button>
          {meldung && <p className="meldung">{meldung}</p>}
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
            border-radius: 18px;
            max-width: 380px;
            width: 100%;
          }

          .logo {
            font-size: 36px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 10px;
          }

          input,
          button {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            border-radius: 10px;
            border: 1px solid #ddd;
            font-size: 16px;
          }

          button {
            background: #f97316;
            color: white;
            border: none;
            font-weight: bold;
          }

          .meldung {
            margin-top: 12px;
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
          <div className="brand">
            <div className="logo">RIS</div>
            <div>
              <h1>RIS Admin</h1>
              <p>{session.user.email}</p>
            </div>
          </div>

          <div className="headerBtns">
            <button onClick={allesLaden}>Aktualisieren</button>
            <button onClick={logout}>Logout</button>
          </div>
        </header>

        {meldung && <div className="info">{meldung}</div>}

        <section className="statsGrid">
          <div className="statCard">
            <span>Aktive Fahrzeuge</span>
            <strong>{aktiveZeiten.length}</strong>
          </div>
          <div className="statCard">
            <span>Fahrten heute</span>
            <strong>{fahrtenHeute.length}</strong>
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
          <h2>Live-Karte</h2>
          <LiveMap daten={aktiveZeiten} />
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
                  <td>{stunden(e.stunden)}</td>
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
                  <td>{stunden(e.stunden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Filter</h2>
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
          </div>
        </section>

        <section className="card">
          <h2>Fahrten-Historie</h2>
          <table>
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Beifahrer</th>
                <th>Fahrzeug</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gefilterteZeiten.map((z) => (
                <tr key={z.id}>
                  <td>{z.mitarbeiter || "-"}</td>
                  <td>{z.beifahrer || "-"}</td>
                  <td>{z.fahrzeug || "-"}</td>
                  <td>{zeit(z.startzeit)}</td>
                  <td>{zeit(z.endzeit)}</td>
                  <td>{z.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid2">
          <div className="card">
            <h2>Mitarbeiter</h2>
            <table>
              <tbody>
                {mitarbeiter.map((m) => (
                  <tr key={m.id || m.name}>
                    <td>{m.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Fahrzeuge</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kennzeichen</th>
                </tr>
              </thead>
              <tbody>
                {fahrzeuge.map((f) => (
                  <tr key={f.id || f.name}>
                    <td>{f.name}</td>
                    <td>{f.kennzeichen || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          font-family: Arial, sans-serif;
          background: linear-gradient(90deg, #2f5fb3, #f97316);
          padding: 20px;
        }

        .wrap {
          max-width: 1300px;
          margin: 0 auto;
        }

        header,
        .card,
        .statCard,
        .info {
          background: white;
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 18px;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .logo {
          font-size: 34px;
          font-weight: bold;
          color: #f97316;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h2 {
          margin-bottom: 14px;
        }

        h3 {
          margin: 18px 0 10px;
        }

        .headerBtns {
          display: flex;
          gap: 10px;
        }

        button {
          padding: 10px 14px;
          border: none;
          border-radius: 10px;
          background: #f97316;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .statCard span {
          display: block;
          color: #666;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 30px;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 12px;
        }

        input,
        select {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 15px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th,
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
          text-align: left;
          white-space: nowrap;
        }

        th {
          background: #f3f4f6;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .card {
          overflow-x: auto;
        }

        @media (max-width: 900px) {
          .statsGrid,
          .grid2,
          .filters {
            grid-template-columns: 1fr;
          }

          header {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
        }
      `}</style>
    </div>
  );
}
