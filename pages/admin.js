<table border="1" cellPadding="8" style={{ marginTop: "20px", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th>Mitarbeiter</th>
      <th>Fahrzeug</th>
      <th>Start</th>
      <th>Ende</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {zeiten.map((z) => (
      <tr key={z.id}>
        <td>{z.mitarbeiter}</td>

        <td>{z.fahrzeug}</td>

        <td>
          {new Date(z.startzeit).toLocaleString("de-DE")}
        </td>

        <td>
          {z.endzeit
            ? new Date(z.endzeit).toLocaleString("de-DE")
            : "-"}
        </td>

        <td>{z.status}</td>
      </tr>
    ))}
  </tbody>
</table>
