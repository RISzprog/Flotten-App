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

    if (!error) setZeiten(data || []);
  }

  useEffect(() => {
    laden();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>RIS Admin</h1>
      <button onClick={laden}>Aktualisieren</button>

      <table border="1" cellPadding="8" style={{ marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Mitarbeiter</th>
            <th>Fahrzeug</th>
            <th>Start</th>
            <th>GPS</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {zeiten.map((z) => (
            <tr key={z.id}>
              <td>{z.mitarbeiter}</td>
              <td>{z.fahrzeug}</td>
              <td>{z.startzeit}</td>
              <td>
                {z.latitude && z.longitude
                  ? `${z.latitude}, ${z.longitude}`
                  : "kein GPS"}
              </td>
              <td>{z.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
