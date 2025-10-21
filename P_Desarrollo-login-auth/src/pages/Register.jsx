import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al registrar usuario");
      }

      setSuccess("Registro exitoso, ahora puedes iniciar sesión.");
      setTimeout(() => navigate("/login"), 1500);
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
          border: "3px solid #22d3ee",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 0 25px rgba(34,211,238,0.25)",
        }}
      >
        <h2
          className="text-center fw-bold mb-4"
          style={{ color: "#22d3ee", letterSpacing: "1px" }}
        >
          🏀 Crear Cuenta
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={form.name}
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
          {success && (
            <div className="alert alert-success py-2 text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-info w-100 fw-bold mt-2"
            disabled={loading}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-3 text-center text-secondary">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" style={{ color: "#ffcc00" }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}