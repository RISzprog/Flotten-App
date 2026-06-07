import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

const supabase = createClient(
  "https://rbbhijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTIlQ_GezlUHTw",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function formatDatum(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE");
}

function formatStunden(value) {
  return `${Number(value || 0).toFixed(2)} Std.`;
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [zeiten, setZeiten] = useState([]);
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);

  const [meldung, setMeldung] = useState("");
  const [suche, setSuche] = useState("");
  const [fahrzeugFilter, setFahrzeugFilter] = useState("");

  useEffect(() => {
    async function start() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        await ladeRolle(data.session.user.email);
        await allesLaden();
      }
    }

    start();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession) {
          await ladeRolle(newSession.user.email);
          await allesLaden();
        }
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
      listener?.subscription?.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  async function login() {
    setMeldung("");

   const { data, error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });

   if (error) {
     setMeldung("Login fehlgeschlagen: " + error.message);
     return;
   }

   setSession(data.session);

   if (data.session) {
    await ladeRolle(data.session.user.email);
    await allesLaden();
   }
 }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setRole("");
  }

  async function ladeRolle(userEmail) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("rolle")
      .eq("email", userEmail)
      .single();

    if (!error && data) {
      setRole(data.rolle);
    }
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
      .order("name", { ascending: true });

    if (!error) {
      setMitarbeiter(data || []);
    }
  }

  const aktiveZeiten = useMemo(() => {
    return zeiten.filter((z) => z.status === "eingestempelt");
  }, [zeiten]);

  const gesamtHeute = useMemo(() => {
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
  }, [zeiten]);

  const fahrzeugNamen = useMemo(() => {
    return [...new Set(zeiten.map((z) => z.fahrzeug).filter(Boolean))];
  }, [zeiten]);

  const gefilterteZeiten = useMemo(() => {
    return zeiten.filter((z) => {
      const text = `${z.mitarbeiter || ""} ${z.beifahrer || ""} ${
        z.fahrzeug || ""
      } ${z.kennzeichen || ""}`.toLowerCase();

      const passtSuche = text.includes(suche.toLowerCase());
      const passtFahrzeug = !fahrzeugFilter || z.fahrzeug === fahrzeugFilter;

      return passtSuche && passtFahrzeug;
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
            justify-content: center;
            align-items: center;
            padding: 24px;
          }

          .loginBox {
            background: white;
            width: 100%;
            max-width: 380px;
            padding: 28px;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
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
            cursor: pointer;
          }

          .meldung {
            margin-top: 12px;
            color: #b91c1c;
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  }

  if (role && role !== "admin") {
    return (
      <div className="page loginPage">
        <div className="loginBox">
          <div className="logo">RIS</div>
          <h1>Kein Zugriff</h1>
          <p>Du bist nicht als Admin freigeschaltet.</p>
          <button onClick={logout}>Logout</button>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: linear-gradient(90deg, #2f5fb3, #f97316);
          }

          .loginPage {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 24px;
          }

          .loginBox {
            background: white;
            width: 100%;
            max-width: 380px;
            padding: 28px;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          }

          .logo {
            font-size: 36px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 10px;
          }

          button {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            border-radius: 10px;
            border: none;
            background: #f97316;
            color: white;
            font-weight: bold;
            cursor: pointer;
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
                  <td>{formatStunden(e.stunden)}</td>
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
                  <td>{formatStunden(e.stunden)}</td>
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
                  <td>{formatDatum(z.startzeit)}</td>
                  <td>{formatDatum(z.endzeit)}</td>
                  <td>{z.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid2">
          <div className="card">
            <h2>Mitarbeiterverwaltung</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
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
            <h2>Fahrzeugverwaltung</h2>
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

        header {
          background: white;
          border-radius: 18px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
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
          margin-bottom: 18px;
        }

        .statCard,
        .card {
          background: white;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .statCard span {
          display: block;
          color: #666;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 30px;
        }

        .card {
          margin-bottom: 18px;
          overflow-x: auto;
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
          font-weight: bold;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
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

          .headerBtns {
            width: 100%;
          }

          .headerBtns button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
