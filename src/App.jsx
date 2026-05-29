import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

/* 🔐 AUTH */
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const ADMIN_UID = "aBqYS5MrpXasd9dz4WVCs2AdbQM2";

function App() {
  const auth = getAuth();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const [view, setView] = useState("home");
  const [adminView, setAdminView] = useState("menu");
  const [playas, setPlayas] = useState([]);

  /* 🔐 AUTH */
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const [form, setForm] = useState({
    title: "",
    latitude: "",
    longitude: "",
    sargazo_level: "Verde",
    photoFile: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsub();
  }, []);

  const isAdmin = user?.uid === ADMIN_UID;

  async function cargarPlayas() {
    const snap = await getDocs(collection(db, "Playas"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPlayas(data);
    return data;
  }

  async function login() {
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
      setShowLogin(false);
    } catch (e) {
      alert("Error de login");
    }
  }

  async function logout() {
    await signOut(auth);
  }

  useEffect(() => {
    if (view !== "map") return;

    if (!mapInstance.current) {
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-87.4653, 20.2114],
        zoom: 11,
      });
    }

    cargarPlayas().then(renderMarkers);
  }, [view]);

  function renderMarkers(data) {
    if (!mapInstance.current) return;

    data.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      let color = "gray";

      if (p.sargazo_level === "Verde") color = "green";
      if (p.sargazo_level === "Amarillo") color = "yellow";
      if (p.sargazo_level === "Naranja") color = "orange";
      if (p.sargazo_level === "Rojo") color = "red";

      const fecha = p.createdAt
        ? new Date(p.createdAt).toLocaleString()
        : "Sin fecha";

      const popup = new mapboxgl.Popup().setHTML(`
        <div style="text-align:center;">
          <h3>${p.title}</h3>
          <p>${p.sargazo_level}</p>

          ${
            p.photoURL
              ? `<img src="${p.photoURL}" width="200" style="border-radius:10px;" />`
              : ""
          }

          <p style="font-size:12px; opacity:0.6;">
            📅 ${fecha}
          </p>

          <a href="https://wa.me/+529843166383?text=Quiero reservar en ${p.title}"
             target="_blank"
             style="background:#25D366;color:white;padding:8px;border-radius:8px;text-decoration:none;">
            Reservar
          </a>
        </div>
      `);

      new mapboxgl.Marker({ color })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(popup)
        .addTo(mapInstance.current);
    });
  }

  async function guardarPlaya() {
    let imageUrl = "";

    if (form.photoFile) {
      const data = new FormData();
      data.append("file", form.photoFile);
      data.append("upload_preset", "tulum_preset");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dx6hgkipa/image/upload",
        { method: "POST", body: data }
      );

      const file = await res.json();
      imageUrl = file.secure_url;
    }

    await addDoc(collection(db, "Playas"), {
      title: form.title,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      sargazo_level: form.sargazo_level,
      photoURL: imageUrl,
      createdAt: Date.now(),
    });

    alert("Guardado 🚀");

    setForm({
      title: "",
      latitude: "",
      longitude: "",
      sargazo_level: "Verde",
      photoFile: null,
    });

    await cargarPlayas();
  }

  async function cambiarFoto(e, id) {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "tulum_preset");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dx6hgkipa/image/upload",
      { method: "POST", body: data }
    );

    const img = await res.json();

    await updateDoc(doc(db, "Playas", id), {
      photoURL: img.secure_url,
      createdAt: Date.now(),
    });

    await cargarPlayas();
  }

  const verdes = playas.filter((p) => p.sargazo_level === "Verde");

  return (
    <div style={{ fontFamily: "sans-serif" }}>

      {/* LOGIN */}
      {showLogin && (
        <div style={center}>
          <h3>Login Admin</h3>

          <input
            placeholder="email"
            style={input}
            onChange={(e) => setLoginEmail(e.target.value)}
          />

          <input
            placeholder="password"
            type="password"
            style={input}
            onChange={(e) => setLoginPass(e.target.value)}
          />

          <button style={btn} onClick={login}>
            Entrar
          </button>
        </div>
      )}

      {/* HOME */}
      {view === "home" && (
        <div style={center}>
          <h1>🌴 Tulum Hoy</h1>

          <button style={btn} onClick={() => setView("map")}>
            Ver Mapa de Sargazo
          </button>

          <button style={btn} onClick={async () => {
            await cargarPlayas();
            setView("green");
          }}>
            Ver Playas en Verde
          </button>

          <button style={btn} onClick={async () => {
            await cargarPlayas();

            if (!user) {
              setShowLogin(true);
              return;
            }

            setView("admin");
          }}>
            Admin
          </button>

          {user && (
            <button onClick={logout} style={{ marginTop: 10 }}>
              Logout
            </button>
          )}
        </div>
      )}

      {/* MAPA */}
      {view === "map" && (
        <>
          <button onClick={() => setView("home")} style={back}>← Home</button>
          <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />
        </>
      )}

      {/* ✅ SOLO ESTE BLOQUE CAMBIADO */}
      {view === "green" && (
        <div style={{ padding: 20 }}>
          <button onClick={() => setView("home")} style={back}>← Home</button>

          <h2>🟢 Playas en Verde</h2>

          {verdes.map((p) => (
            <div key={p.id} style={card}>
              <h3>{p.title}</h3>

              {p.photoURL && (
                <img
                  src={p.photoURL}
                  width="200"
                  style={{ borderRadius: 10, marginTop: 8 }}
                />
              )}

              <a
                href={`https://wa.me/+529843166383?text=Quiero reservar un lugar en ${p.title}`}
                target="_blank"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  background: "#25D366",
                  color: "white",
                  padding: 10,
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                Reservar un lugar
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ADMIN */}
      {view === "admin" && isAdmin && (
        <div style={{ padding: 20 }}>
          <button onClick={() => setView("home")} style={back}>← Home</button>

          <h2>⚙️ Admin Panel</h2>

          {adminView === "menu" && (
            <>
              <button style={btn} onClick={() => setAdminView("create")}>
                ➕ Formulario
              </button>

              <button
                style={btn}
                onClick={async () => {
                  await cargarPlayas();
                  setAdminView("update");
                }}
              >
                🔁 Actualizar lugares
              </button>
            </>
          )}

          {adminView === "create" && (
            <div>
              <input placeholder="Nombre" style={input}
                onChange={e => setForm({...form, title: e.target.value})}
              />

              <input placeholder="Lat" style={input}
                onChange={e => setForm({...form, latitude: e.target.value})}
              />

              <input placeholder="Lng" style={input}
                onChange={e => setForm({...form, longitude: e.target.value})}
              />

              <select style={input}
                onChange={e => setForm({...form, sargazo_level: e.target.value})}
              >
                <option>Verde</option>
                <option>Amarillo</option>
                <option>Naranja</option>
                <option>Rojo</option>
              </select>

              <input type="file" style={input}
                onChange={e => setForm({...form, photoFile: e.target.files[0]})}
              />

              <button onClick={guardarPlaya} style={btn}>
                Guardar
              </button>
            </div>
          )}

          {adminView === "update" && (
            <div>
              <h3>🔁 Editar lugares</h3>

              {playas.length === 0 && <p>Cargando...</p>}

              {playas.map((p) => (
                <div key={p.id} style={card}>
                  <h4>{p.title}</h4>

                  <p>{p.sargazo_level}</p>

                  <select
                    defaultValue={p.sargazo_level}
                    onChange={async (e) => {
                      await updateDoc(doc(db, "Playas", p.id), {
                        sargazo_level: e.target.value,
                      });

                      await cargarPlayas();
                    }}
                  >
                    <option>Verde</option>
                    <option>Amarillo</option>
                    <option>Naranja</option>
                    <option>Rojo</option>
                  </select>

                  <input type="file" onChange={(e) => cambiarFoto(e, p.id)} />

                  <small>
                    📅 {p.createdAt
                      ? new Date(p.createdAt).toLocaleString()
                      : "Sin fecha"}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* UI */
const center = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
};

const btn = {
  padding: 15,
  margin: 10,
  borderRadius: 10,
  background: "black",
  color: "white",
  width: 250,
};

const back = {
  margin: 10,
  padding: 8,
  borderRadius: 8,
};

const card = {
  padding: 15,
  border: "1px solid #ddd",
  borderRadius: 10,
  marginBottom: 10,
};

const input = {
  display: "block",
  padding: 10,
  margin: 10,
  width: 300,
};

export default App;