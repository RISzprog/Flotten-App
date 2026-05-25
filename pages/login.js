import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [meldung, setMeldung] = useState("");

  async function anmelden(e) {
    e.preventDefault();

    setMeldung("Anmeldung läuft...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort,
    });

    if (error) {
      setMeldung("Login fehlgeschlagen");
      return;
    }

    const { data: rolleData } = await supabase
      .from("user_roles")
      .select("rolle")
      .eq("email", email)
      .single();

    if (rolleData?.rolle === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="loginPage">
      <form className="loginBox" onSubmit={anmelden}>
        <h1>RIS Flotten Login</h1>

        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          required
        />

        <button type="submit">
          Login
        </button>

        <p>{meldung}</p>
      </form>

      <style jsx>{`
        .loginPage {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #1e3c72, #f7971e);
          padding: 20px;
        }

        .loginBox {
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.96);
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 20px 45px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        h1 {
          margin: 0 0 10px;
          text-align: center;
          color: #163a7d;
        }

        input {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #ccc;
          font-size: 16px;
        }

        button {
          background: #163a7d;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        button:hover {
          background: #0f2c61;
        }

        p {
          text-align: center;
          font-weight: bold;
          color: #444;
        }
      `}</style>
    </div>
  );
}
