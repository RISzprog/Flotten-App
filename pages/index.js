return (
  <div
    style={{
      minHeight: "100vh",
      padding: "24px",
      fontFamily: "Arial, sans-serif",
      background:
        "linear-gradient(135deg, #ffffff 0%, #eaf4ff 35%, #ffffff 55%, #ffb347 100%)",
      color: "#0f2f6e"
    }}
  >
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "44px",
            margin: "0",
            fontWeight: "900",
            color: "#0f2f6e"
          }}
        >
          RIS Flotten App
        </h1>

        <p
          style={{
            color: "#f97316",
            fontWeight: "bold",
            fontSize: "18px"
          }}
        >
          Reinigung – Instandhaltung – Sicherheit
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "24px"
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            padding: "24px",
            borderRadius: "24px",
            boxShadow: "0 15px 35px rgba(15,47,110,0.20)"
          }}
        >
          <label style={{ fontWeight: "bold", fontSize: "18px" }}>
            Mitarbeiter wählen
          </label>

          <input
            placeholder="Mitarbeitername"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "16px",
              marginTop: "8px",
              marginBottom: "20px",
              fontSize: "18px",
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              boxSizing: "border-box"
            }}
          />

          <label style={{ fontWeight: "bold", fontSize: "18px" }}>
            Fahrzeug wählen
          </label>

          <select
            value={fahrzeug}
            onChange={(e) => setFahrzeug(e.target.value)}
            style={{
              width: "100%",
              padding: "16px",
              marginTop: "8px",
              marginBottom: "24px",
              fontSize: "18px",
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              boxSizing: "border-box"
            }}
          >
            <option value="">Fahrzeug wählen</option>
            <option>Vito 1</option>
            <option>Vito 2</option>
            <option>Sprinter</option>
            <option>Crafter</option>
          </select>

          <button
            onClick={einstempeln}
            style={{
              width: "100%",
              padding: "20px",
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontSize: "26px",
              fontWeight: "bold",
              marginBottom: "14px",
              boxShadow: "0 8px 18px rgba(22,163,74,0.35)"
            }}
          >
            Einstempeln
          </button>

          <button
            onClick={ausstempeln}
            style={{
              width: "100%",
              padding: "20px",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontSize: "26px",
              fontWeight: "bold",
              boxShadow: "0 8px 18px rgba(185,28,28,0.35)"
            }}
          >
            Ausstempeln
          </button>

          <div
            style={{
              marginTop: "18px",
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "12px 16px",
              border: "1px solid #dbeafe",
              fontSize: "17px",
              fontWeight: "bold",
              color: "#0f2f6e"
            }}
          >
            Status: {status}
          </div>
        </div>

        <div
          style={{
            padding: "20px"
          }}
        >
          <h2
            style={{
              color: "#0f2f6e",
              fontSize: "32px",
              marginTop: 0
            }}
          >
            Danke ans Team
          </h2>

          <div
            style={{
              height: "3px",
              background: "linear-gradient(90deg, #f97316, #0f2f6e)",
              marginBottom: "24px"
            }}
          />

          <p style={{ fontSize: "22px", fontWeight: "bold" }}>
            Teşekkürler ekibe
          </p>

          <p style={{ fontSize: "22px", fontWeight: "bold" }}>
            Mulțumim echipei
          </p>

          <p style={{ fontSize: "22px", fontWeight: "bold" }}>
            Спасибо команде
          </p>
        </div>
      </div>
    </div>
  </div>
);
