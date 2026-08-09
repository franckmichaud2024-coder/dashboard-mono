import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  KeyRound,
  LogOut,
  Minus,
  Pencil,
  Plus,
  RefreshCcw,
  Smartphone,
  ClipboardList,
  GripVertical,
  Hash,
  Landmark,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Settings,
  Snowflake,
  TrendingUp,
  Users,
  UserPlus,
  Utensils,
  X,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Employes from "./pages/Employes";
import Vacances from "./pages/Vacances";
import Banques from "./pages/Banques";
import Absences from "./pages/Absences";
import Discipline from "./pages/Discipline";
import Decongelation from "./pages/Decongelation";
import TendanceCaisses from "./pages/TendanceCaisses";
import RizSec from "./pages/RizSec";
import JourJulien from "./pages/JourJulien";
import Parametres from "./pages/Parametres";
import Login from "./pages/Login";
import { changePassword, createUserAccount, getCurrentSession, onAuthStateChange, signOut } from "./services/auth";
import { loadState, saveState, subscribeToState } from "./services/appState";
import {
  applyLocalSnapshot,
  notifyLocalStateChange,
  onLocalStateChange,
  onRemoteStateApplied,
  readLocalSnapshot,
} from "./services/stateBridge";

const DEFAULT_NAVIGATION = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, component: Dashboard },
  { id: "employes", label: "Employés", icon: Users, component: Employes },
  { id: "vacances", label: "Vacances", icon: CalendarDays, component: Vacances },
  { id: "banques", label: "Gestion des banques", icon: Landmark, component: Banques },
  { id: "absences", label: "Absences", icon: ClipboardList, component: Absences },
  { id: "discipline", label: "Suivi disciplinaire", icon: ClipboardList, component: Discipline },
  { id: "decongelation", label: "Décongélation", icon: Snowflake, component: Decongelation },
  { id: "tendance-caisses", label: "Tendance des caisses", icon: TrendingUp, component: TendanceCaisses },
  { id: "riz-sec", label: "Préparation riz sec", icon: Utensils, component: RizSec },
  { id: "jour-julien", label: "Jour julien", icon: Hash, component: JourJulien },
  { id: "parametres", label: "Paramètres", icon: Settings, component: Parametres },
];

const NAV_STORAGE_KEY = "dashboard-mono-navigation-order";

function restoreNavigation() {
  try {
    const saved = JSON.parse(localStorage.getItem(NAV_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_NAVIGATION;

    const map = new Map(DEFAULT_NAVIGATION.map((item) => [item.id, item]));
    const restored = saved.map((id) => map.get(id)).filter(Boolean);
    const missing = DEFAULT_NAVIGATION.filter(
      (item) => !restored.some((savedItem) => savedItem.id === item.id)
    );

    return [...restored, ...missing];
  } catch {
    return DEFAULT_NAVIGATION;
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Connexion au nuage…");
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navigation, setNavigation] = useState(restoreNavigation);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordStatus, setPasswordStatus] = useState("");
  const [accessMode, setAccessMode] = useState("creator");
  const [zoomLevel, setZoomLevel] = useState(() => Number(localStorage.getItem("expedition-zoom") || 100));
  const [mobileMode, setMobileMode] = useState(() => localStorage.getItem("expedition-mobile-mode") === "true");
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", role: "readonly" });
  const [userCreateStatus, setUserCreateStatus] = useState("");
  const [userCreating, setUserCreating] = useState(false);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (mounted) setSession(currentSession);
      })
      .catch((error) => console.error("Erreur de session Supabase:", error))
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const assignedRole = session?.user?.user_metadata?.role;
    setAccessMode(assignedRole === "readonly" ? "readonly" : "creator");
  }, [session?.user?.id, session?.user?.user_metadata?.role]);

  useEffect(() => {
    localStorage.setItem("expedition-zoom", String(zoomLevel));
  }, [zoomLevel]);

  useEffect(() => {
    localStorage.setItem("expedition-mobile-mode", String(mobileMode));
    if (mobileMode) {
      setSidebarOpen(false);
      setZoomLevel(100);
    }
  }, [mobileMode]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 760) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setCloudLoading(false);
      return undefined;
    }

    let active = true;
    let saveTimer = null;
    let initialized = false;
    const clientId = sessionStorage.getItem("expedition-client-id") || crypto.randomUUID();
    sessionStorage.setItem("expedition-client-id", clientId);

    const persist = async () => {
      if (!active || accessMode === "readonly") return;
      setSyncStatus("Sauvegarde…");
      try {
        await saveState({
          version: 1,
          meta: { clientId, savedAt: new Date().toISOString() },
          storage: readLocalSnapshot(),
        });
        if (active) setSyncStatus("Synchronisé");
      } catch (error) {
        console.error("Autosave Supabase:", error);
        if (active) setSyncStatus("Erreur de synchronisation");
      }
    };

    const scheduleSave = () => {
      if (!active || !initialized || accessMode === "readonly") return;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persist, 650);
    };

    const initialize = async () => {
      setCloudLoading(true);
      setSyncStatus("Chargement…");
      try {
        const row = await loadState();
        if (!active) return;
        if (row?.data?.storage) {
          applyLocalSnapshot(row.data.storage);
        } else {
          window.setTimeout(() => persist(), 1000);
        }
        setSyncStatus("Synchronisé");
      } catch (error) {
        console.error("Chargement Supabase:", error);
        if (active) setSyncStatus("Erreur de synchronisation");
      } finally {
        initialized = true;
        if (active) setCloudLoading(false);
      }
    };

    initialize();
    const stopLocal = onLocalStateChange(scheduleSave);
    const stopRemoteApplied = onRemoteStateApplied(({ keys } = {}) => {
      if (Array.isArray(keys) && keys.length > 0) {
        // Remonte uniquement le contenu de la page courante. On conserve la page
        // active, le menu, le scroll global et les autres préférences d'interface.
        setDataRevision((revision) => revision + 1);
      }
    });
    const stopRealtime = subscribeToState(session.user.id, (row) => {
      const remote = row?.data;
      if (!remote?.storage || remote?.meta?.clientId === clientId) return;
      applyLocalSnapshot(remote.storage);
      setSyncStatus("Synchronisé");
    });

    return () => {
      active = false;
      window.clearTimeout(saveTimer);
      stopLocal?.();
      stopRemoteApplied?.();
      stopRealtime?.();
    };
  }, [session?.user?.id, accessMode]);

  useEffect(() => {
    localStorage.setItem(
      NAV_STORAGE_KEY,
      JSON.stringify(navigation.map((item) => item.id))
    );
    notifyLocalStateChange(NAV_STORAGE_KEY);
  }, [navigation]);

  const current = useMemo(
    () => navigation.find((item) => item.id === activePage) ?? navigation[0],
    [activePage, navigation]
  );

  const CurrentPage = current.component;

  const navigate = (pageId) => {
    setActivePage(pageId);
    if (window.innerWidth < 900) setSidebarOpen(false);
  };

  const handleDragStart = (event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (event, id) => {
    event.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedId;

    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setNavigation((items) => {
      const sourceIndex = items.findIndex((item) => item.id === sourceId);
      const targetIndex = items.findIndex((item) => item.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) return items;

      const next = [...items];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const resetNavigation = () => {
    setNavigation(DEFAULT_NAVIGATION);
    localStorage.removeItem(NAV_STORAGE_KEY);
  };

  const changeZoom = (delta) => {
    setZoomLevel((value) => Math.max(70, Math.min(130, value + delta)));
  };

  const resetZoom = () => setZoomLevel(100);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordStatus("");
    if (passwordForm.password.length < 6) {
      setPasswordStatus("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordStatus("Les deux mots de passe ne correspondent pas.");
      return;
    }
    try {
      await changePassword(passwordForm.password);
      setPasswordStatus("Mot de passe modifié.");
      setPasswordForm({ password: "", confirm: "" });
      window.setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordStatus("");
      }, 900);
    } catch (error) {
      setPasswordStatus(error.message || "Impossible de modifier le mot de passe.");
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setUserCreateStatus("");

    if (!userForm.email.trim()) {
      setUserCreateStatus("Entrez une adresse courriel.");
      return;
    }
    if (userForm.password.length < 6) {
      setUserCreateStatus("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setUserCreating(true);
    try {
      const data = await createUserAccount({
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
      });
      const confirmationRequired = !data?.session;
      setUserCreateStatus(
        confirmationRequired
          ? "Utilisateur créé. Une confirmation par courriel peut être requise avant la première connexion."
          : "Utilisateur créé avec succès."
      );
      setUserForm({ email: "", password: "", role: "readonly" });
    } catch (error) {
      setUserCreateStatus(error.message || "Impossible de créer l’utilisateur.");
    } finally {
      setUserCreating(false);
    }
  };

  const blockReadOnlyInteraction = (event) => {
    if (accessMode !== "readonly") return;
    event.preventDefault();
    event.stopPropagation();
  };

  if (authLoading || (session && cloudLoading)) {
    return <div className="auth-loading">Chargement sécurisé des données…</div>;
  }

  if (!session) {
    return <Login onLoggedIn={setSession} />;
  }

  const userEmail = session.user?.email || "Utilisateur";
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div
      className={`app-shell ${mobileMode ? "app-shell--mobile" : ""} ${accessMode === "readonly" ? "app-shell--readonly" : ""}`}
      style={{ zoom: `${zoomLevel}%` }}
    >
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : "sidebar--closed"}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">E</div>
          <div>
            <strong>EXPÉDITION</strong>
            <span>Gestion des opérations</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Navigation principale">
          {navigation.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-row ${dragOverId === id ? "nav-row--drag-over" : ""} ${
                draggedId === id ? "nav-row--dragging" : ""
              }`}
              draggable
              onDragStart={(event) => handleDragStart(event, id)}
              onDragOver={(event) => handleDragOver(event, id)}
              onDrop={(event) => handleDrop(event, id)}
              onDragEnd={handleDragEnd}
            >
              <button
                type="button"
                className={`nav-item ${activePage === id ? "nav-item--active" : ""}`}
                onClick={() => navigate(id)}
                title={label}
              >
                <GripVertical
                  className={`nav-drag-handle ${customizing ? "nav-drag-handle--active" : ""}`}
                  size={15}
                  strokeWidth={2}
                />
                <Icon size={20} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-customize">
          <button
            type="button"
            className={customizing ? "active" : ""}
            onClick={() => setCustomizing((value) => !value)}
          >
            <GripVertical size={15} />
            {customizing ? "Terminer la personnalisation" : "Personnaliser le menu"}
          </button>

          <button type="button" onClick={resetNavigation} disabled={accessMode === "readonly"}>
            <RotateCcw size={15} />
            Réinitialiser l’ordre
          </button>

          <div className="sidebar-zoom" aria-label="Zoom de l'application">
            <button type="button" onClick={() => changeZoom(-10)} title="Réduire le zoom">
              <Minus size={14} />
            </button>
            <button type="button" className="sidebar-zoom__value" onClick={resetZoom} title="Réinitialiser le zoom">
              {zoomLevel}%
            </button>
            <button type="button" onClick={() => changeZoom(10)} title="Augmenter le zoom">
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            className={mobileMode ? "active" : ""}
            onClick={() => setMobileMode((value) => !value)}
          >
            <Smartphone size={15} />
            {mobileMode ? "Quitter le mode Samsung" : "Mode cellulaire Samsung"}
          </button>

          <small>
            Glissez-déposez les onglets pour modifier leur ordre.
          </small>
        </div>

        <div className="sidebar__footer">
          <span>Projet Expédition</span>
          <small>Version 1.15.0</small>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              type="button"
              className="icon-button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div>
              <h1>{current.label}</h1>
              <p>Département Expédition</p>
            </div>
          </div>

          <div className="user-menu-wrap">
            <button
              type="button"
              className="user-badge user-badge--button"
              onClick={() => setUserMenuOpen((value) => !value)}
              aria-expanded={userMenuOpen}
            >
              <div className="user-badge__avatar">{initials}</div>
              <div className="user-badge__content">
                <strong>{userEmail}</strong>
                <span className={`sync-status ${syncStatus === "Synchronisé" ? "sync-status--ok" : ""}`}>
                  {syncStatus} · {accessMode === "creator" ? "Créateur" : "Lecture seule"}
                </span>
              </div>
              <ChevronDown size={16} />
            </button>

            {userMenuOpen && (
              <div className="user-menu">
                <div className="user-menu__identity">
                  <strong>{userEmail}</strong>
                  <span>{syncStatus}</span>
                </div>

                <div className="user-menu__role">
                  {accessMode === "creator" ? <Pencil size={17} /> : <Eye size={17} />}
                  <span>Mode : {accessMode === "creator" ? "Créateur" : "Lecture seule"}</span>
                </div>

                {accessMode === "creator" && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserModalOpen(true);
                      setUserMenuOpen(false);
                    }}
                  >
                    <UserPlus size={17} />
                    Créer un nouvel utilisateur
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(true);
                    setUserMenuOpen(false);
                  }}
                >
                  <KeyRound size={17} />
                  Modifier le mot de passe
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMode((value) => !value);
                    setUserMenuOpen(false);
                  }}
                >
                  <Smartphone size={17} />
                  {mobileMode ? "Affichage bureau" : "Affichage Samsung"}
                </button>

                <div className="user-menu__zoom">
                  <button type="button" onClick={() => changeZoom(-10)} aria-label="Zoom moins">
                    <Minus size={15} />
                  </button>
                  <span>Zoom {zoomLevel}%</span>
                  <button type="button" onClick={() => changeZoom(10)} aria-label="Zoom plus">
                    <Plus size={15} />
                  </button>
                  <button type="button" onClick={resetZoom} aria-label="Réinitialiser le zoom">
                    <RefreshCcw size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  className="user-menu__danger"
                  onClick={() => signOut().catch((error) => console.error("Déconnexion:", error))}
                >
                  <LogOut size={17} />
                  Changer d’utilisateur / Déconnexion
                </button>
              </div>
            )}
          </div>
        </header>

        <main
          className={`page-container ${accessMode === "readonly" ? "page-container--readonly" : ""}`}
          onClickCapture={blockReadOnlyInteraction}
          onSubmitCapture={blockReadOnlyInteraction}
          onKeyDownCapture={(event) => {
            if (event.key !== "Tab") blockReadOnlyInteraction(event);
          }}
        >
          {accessMode === "readonly" && (
            <div className="readonly-banner">
              <Eye size={16} />
              Mode lecture seule — les données peuvent être consultées, mais pas modifiées.
            </div>
          )}
          <CurrentPage key={`${current.id}:${dataRevision}`} />
        </main>

        {passwordModalOpen && (
          <div className="account-modal-backdrop" onMouseDown={() => setPasswordModalOpen(false)}>
            <form className="account-modal" onSubmit={handlePasswordChange} onMouseDown={(event) => event.stopPropagation()}>
              <div className="account-modal__header">
                <div>
                  <h2>Modifier le mot de passe</h2>
                  <p>{userEmail}</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setPasswordModalOpen(false)}>
                  <X size={19} />
                </button>
              </div>
              <div className="account-modal__body">
                <label>
                  Nouveau mot de passe
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Confirmer le mot de passe
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
                    required
                  />
                </label>
                {passwordStatus && <div className="account-modal__status">{passwordStatus}</div>}
              </div>
              <div className="account-modal__footer">
                <button type="button" onClick={() => setPasswordModalOpen(false)}>Annuler</button>
                <button type="submit" className="account-modal__primary">Enregistrer</button>
              </div>
            </form>
          </div>
        )}

        {userModalOpen && accessMode === "creator" && (
          <div className="account-modal-backdrop" onMouseDown={() => setUserModalOpen(false)}>
            <form className="account-modal" onSubmit={handleCreateUser} onMouseDown={(event) => event.stopPropagation()}>
              <div className="account-modal__header">
                <div>
                  <h2>Créer un utilisateur</h2>
                  <p>Attribuez son accès à Expédition Mono.</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setUserModalOpen(false)}>
                  <X size={19} />
                </button>
              </div>
              <div className="account-modal__body">
                <label>
                  Courriel
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Mot de passe temporaire
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={userForm.password}
                    onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Rôle
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="creator">Créateur</option>
                    <option value="readonly">Lecture seule</option>
                  </select>
                </label>
                {userCreateStatus && <div className="account-modal__status">{userCreateStatus}</div>}
              </div>
              <div className="account-modal__footer">
                <button type="button" onClick={() => setUserModalOpen(false)}>Annuler</button>
                <button type="submit" className="account-modal__primary" disabled={userCreating}>
                  {userCreating ? "Création…" : "Créer l’utilisateur"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
