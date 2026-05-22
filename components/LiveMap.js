import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function LiveMap({ zeiten }) {
  const punkte = zeiten.filter((z) => z.latitude && z.longitude);

  if (punkte.length === 0) {
    return <div className="emptyMap">Keine GPS-Daten vorhanden</div>;
  }

  const erster = punkte[0];

  return (
    <div style={{ height: "260px", width: "100%", borderRadius: "20px", overflow: "hidden" }}>
      <MapContainer
        center={[Number(erster.latitude), Number(erster.longitude)]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {punkte.map((z) => (
          <Marker key={z.id} position={[Number(z.latitude), Number(z.longitude)]}>
            <Popup>
              <strong>{z.fahrzeug}</strong>
              <br />
              {z.mitarbeiter}
              <br />
              {z.beifahrer ? `Beifahrer: ${z.beifahrer}` : ""}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
