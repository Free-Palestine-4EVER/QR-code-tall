import { useEffect, useState } from "react";
import { CONFIG } from "../data/config";
import Dashboard from "../employee/Dashboard";

export default function Staff() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("noir.pin") === CONFIG.staffPin);

  if (authed) return <Dashboard onLogout={() => { sessionStorage.removeItem("noir.pin"); setAuthed(false); }} />;
  return (
    <PinGate
      onSubmit={(pin) => {
        if (pin === CONFIG.staffPin) {
          sessionStorage.setItem("noir.pin", pin);
          setAuthed(true);
        }
      }}
    />
  );
}

function PinGate({ onSubmit }) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (val.length === 4) {
      if (val === CONFIG.staffPin) onSubmit(val);
      else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
      setTimeout(() => setVal(""), 400);
    }
  }, [val]); // eslint-disable-line
  return (
    <div className="pin-gate" dir="ltr">
      <div className="monogram"><span>N</span></div>
      <p style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 11, color: "var(--ivory-dim)" }}>NOIR · Service Console</p>
      <div className={`pin-dots ${shake ? "shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < val.length ? "f" : ""} />)}
      </div>
      <div className="pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) =>
          k === "" ? <span key={i} /> : (
            <button key={i} onClick={() => setVal((v) => (k === "⌫" ? v.slice(0, -1) : (v + k).slice(0, 4)))}>{k}</button>
          )
        )}
      </div>
    </div>
  );
}
