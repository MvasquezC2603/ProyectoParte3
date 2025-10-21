import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";


export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      // Guardar token y redirigir al tablero
      localStorage.setItem("token", data.token);
      navigate("/tablero");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        background:
          "radial-gradient(circle at top, #121215, #060608 70%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          backgroundColor: "#0b0b0d",
          border: "3px solid #ffcc00",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 0 25px rgba(255,204,0,0.25)",
        }}
      >
        <h2
          className="text-center fw-bold mb-4"
          style={{ color: "#ffcc00", letterSpacing: "1px" }}
        >
          🏀 Iniciar Sesión
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
              style={{
                background: "#111",
                color: "#fff",
                border: "1px solid #444",
              }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              required
              style={{
                background: "#111",
                color: "#fff",
                border: "1px solid #444",
              }}
            />
          </div>

          {error && (
            <div className="alert alert-danger py-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-warning w-100 fw-bold mt-2"
            disabled={loading}
          >
            {loading ? "Iniciando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-3 text-center text-secondary">
          ¿No tienes cuenta?{" "}
          <Link to="/register" style={{ color: "#22d3ee" }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}