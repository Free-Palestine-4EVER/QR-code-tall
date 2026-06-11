import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./store";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import Status from "./pages/Status";
import Staff from "./pages/Staff";

export default function App() {
  const { config, menu } = useApp();
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
