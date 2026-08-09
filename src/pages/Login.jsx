import { useState } from "react";
import { signIn } from "../services/auth";
import loginBackground from "../assets/expedition-login-background.png";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await signIn(email, password);
      onLoggedIn?.(data.session);
    } catch (err) {
      setError(err.message || "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `linear-gradient(rgba(248,250,252,.28), rgba(248,250,252,.28)), url(${loginBackground})` }}>
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Expédition Mono</h1>
        <p>Connexion</p>

        <input
          type="email"
          placeholder="Courriel"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}