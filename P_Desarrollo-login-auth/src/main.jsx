import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import ScoreboardApp from "./ScoreboardApp.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
window.API = import.meta.env.VITE_API_URL;
console.log('API expuesta en window.API =', window.API);

// 🔐 Ruta privada (solo si el usuario está logueado)
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 🔸 Cuando se abra la raíz "/", redirige al login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* 🔹 Páginas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 Página protegida (solo si hay sesión) */}
        <Route
          path="/tablero"
          element={
            <PrivateRoute>
              <ScoreboardApp />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);