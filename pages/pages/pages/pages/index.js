export default function Home() {
  return (
    <div style={{
      fontFamily: 'Arial',
      padding: '40px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>RIS Flotten App</h1>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '400px'
      }}>
        <h2>Fahrzeug wählen</h2>

        <select style={{
          width: '100%',
          padding: '10px',
          marginBottom: '20px'
        }}>
          <option>Vito 1</option>
          <option>Vito 2</option>
          <option>Sprinter 1</option>
          <option>Crafter 1</option>
        </select>

        <button style={{
          width: '100%',
          padding: '15px',
          background: 'green',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px'
        }}>
          Einstempeln
        </button>
      </div>
    </div>
  )
}
