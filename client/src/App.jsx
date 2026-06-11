import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./store";
import { firebaseReady } from "./firebase";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import Status from "./pages/Status";
import Staff from "./pages/Staff";

export default function App() {
  const { config, menu } = useApp();
  if (!firebaseReady)
    return (
      <div className="page center-stage">
        <div className="monogram"><span>N</span></div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 18 }}>Connect Firebase to finish setup</h2>
        <p style={{ color: "var(--ivory-dim)", fontSize: 14, lineHeight: 1.7, maxWidth: 340, marginTop: 12 }}>
          Add your Firebase web config as <code>VITE_FB_*</code> environment variables (see <code>client/.env.example</code>),
          then redeploy. Orders sync live through Firestore — no server needed.
        </p>
      </div>
    );
  if (!config || !menu)
    return (
      <div className="center-stage">
        <div className="monogram"><span>N</span></div>
      </div>
    );
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/t/:table" element={<Menu />} />
      <Route path="/t/:table/checkout" element={<Checkout />} />
      <Route path="/t/:table/order/:orderId" element={<Status />} />
      <Route path="/employee" element={<Staff />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
