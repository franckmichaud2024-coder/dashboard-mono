import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Trash2, Users } from "lucide-react";
import { deleteUser, listUsers, updateUserRole } from "../services/users";

function roleLabel(role) {
  if (role === "creator" || role === "administrateur") return "Créateur";
  return "Lecture seule";
}

export default function Parametres({ accessMode = "readonly", currentUserId = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const handleRoleChange = async (user, nextRole) => {
    if (user.id === currentUserId) {
      setError("Vous ne pouvez pas modifier votre propre rôle depuis cette page.");
      return;
    }

    setSavingUserId(user.id);
    setError("");
    setMessage("");
    try {
      await updateUserRole(user.id, nextRole);
      setUsers((items) => items.map((item) => (
        item.id === user.id ? { ...item, role: nextRole } : item
      )));
      setMessage(`Rôle de ${user.email || "l’utilisateur"} modifié.`);
    } catch (err) {
      setError(err.message || "Impossible de modifier le rôle.");
      await loadUsers();
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUserId) {
      setError("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement l’utilisateur ${user.email || "sélectionné"} ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setError("");
    setMessage("");
    try {
      await deleteUser(user.id);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      setMessage(`Utilisateur ${user.email || "sélectionné"} supprimé.`);
    } catch (err) {
      setError(err.message || "Impossible de supprimer l’utilisateur.");
      await loadUsers();
    } finally {
      setDeletingUserId(null);
    }
  };

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
          {message && <div className="settings-users__success">{message}</div>}

          <div className="settings-users__table-wrap">
            <table className="settings-users__table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const busy = savingUserId === user.id || deletingUserId === user.id;
                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.email || "Courriel non disponible"}</strong>
                        {isSelf && <span className="settings-users__you">Vous</span>}
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="settings-users__role">{roleLabel(user.role)}</span>
                        ) : (
                          <select
                            className="settings-users__role-select"
                            value={user.role === "creator" ? "creator" : "readonly"}
                            onChange={(event) => handleRoleChange(user, event.target.value)}
                            disabled={busy}
                            aria-label={`Rôle de ${user.email || "utilisateur"}`}
                          >
                            <option value="creator">Créateur</option>
                            <option value="readonly">Lecture seule</option>
                          </select>
                        )}
                      </td>
                      <td><span className="settings-users__active">Actif</span></td>
                      <td>
                        {isSelf ? (
                          <span className="settings-users__protected">Compte protégé</span>
                        ) : (
                          <button
                            type="button"
                            className="settings-users__delete"
                            onClick={() => handleDelete(user)}
                            disabled={busy}
                          >
                            <Trash2 size={15} />
                            {deletingUserId === user.id ? "Suppression…" : "Supprimer"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && users.length === 0 && (
                  <tr><td colSpan="4" className="settings-users__empty">Aucun utilisateur à afficher.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
