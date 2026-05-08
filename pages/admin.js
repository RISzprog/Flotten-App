import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rbhbijcxbemebynfrpiz.supabase.co",
  "sb_publishable_URHTzamjcI6_j1dt0uTTlQ_GezlUHTw"
);

export default function Admin() {
  const [zeiten, setZeiten] = useState([]);

  async function laden() {
    const { data, error } = await supabase
      .from("zeiten")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setZeiten(data || []);
    }
  }

  useEffect(() => {
    laden();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        background: "#f3f4f6"
      }}
    >
      <h1 style={{ color: "#0f2f6e" }}>RIS Admin</h1>

      <button
        onClick={laden}
        style={{
          padding: "10px 16px",
          marginBottom: "20px",
          background: "#0f2f6e",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Aktualisieren
      </button>

      <table
        border="1"
        cellPadding="10"
        style={{
          borderCollapse: "collapse",
          width: "100%",
          background: "white"
        }}
      >
        <thead style={{ background: "#0f2f6e", color: "white" }}>
          <tr>
            <th>Mitarbeiter</th>
            <th>Fahrzeug</th>
            <th>Start</th>
            <th>Ende</th>
            <th>GPS</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {zeiten.map((z) => (
            <tr key={z.id}>
              <td>{z.mitarbeiter}</td>

              <td>{z.fahrzeug}</td>

              <td>
                {z.startzeit
                  ? new Date(z.startzeit).toLocaleString("de-DE")
                  : "-"}
              </td>

              <td>
                {z.endzeit
                  ? new Date(z.endzeit).toLocaleString("de-DE")
                  : "-"}
              </td>

              <td>
                {z.latitude && z.longitude
                  ? `${z.latitude}, ${z.longitude}`
                  : "kein GPS"}
              </td>

              <td>
                <span
                  style={{
                    background:
                      z.status === "eingestempelt"
                        ? "#16a34a"
                        : "#dc2626",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontWeight: "bold"
                  }}
                >
                  {z.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
