import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Users } from "lucide-react";
import { listUsers } from "../services/users";

function roleLabel(role) {
  if (role === "creator" || role === "administrateur") return "Créateur";
  return "Lecture seule";
}

export default function Parametres({ accessMode = "readonly", currentUserId = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    if (accessMode !== "creator") return;
    setLoading(true);
    setError("");
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [accessMode]);

  useEffect(() => {
    loadUsers();
    const refresh = () => loadUsers();
    window.addEventListener("expedition-user-created", refresh);
    return () => window.removeEventListener("expedition-user-created", refresh);
  }, [loadUsers]);

  return (
    <section className="page-card settings-page">
      <h2>Paramètres</h2>
      <p>Configuration des années, types d’absence, quarts, groupes et autres règles du système.</p>

      {accessMode === "creator" && (
        <div className="settings-users">
          <div className="settings-users__header">
            <div>
              <h3><Users size={20} /> Gestion des utilisateurs</h3>
              <p>Comptes ayant accès à Expédition Mono.</p>
            </div>
            <button type="button" onClick={loadUsers} disabled={loading}>
              <RefreshCcw size={16} /> {loading ? "Chargement…" : "Actualiser"}
            </button>
          </div>

          {error && <div className="settings-users__error">{error}</div>}

          {!error && (
            <div className="settings-users__table-wrap">
              <table className="settings-users__table">
                <thead>
                  <tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.email || "Courriel non disponible"}</strong>
                        {user.id === currentUserId && <span className="settings-users__you">Vous</span>}
                      </td>
                      <td><span className="settings-users__role">{roleLabel(user.role)}</span></td>
                      <td><span className="settings-users__active">Actif</span></td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && (
                    <tr><td colSpan="3" className="settings-users__empty">Aucun utilisateur à afficher.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
