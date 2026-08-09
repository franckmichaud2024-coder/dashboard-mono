import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
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
import { getCurrentSession, onAuthStateChange, signOut } from "./services/auth";
import { loadState, saveState, subscribeToState } from "./services/appState";
import {
  applyLocalSnapshot,
  notifyLocalStateChange,
  onLocalStateChange,
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
      if (!active) return;
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
      if (!active || !initialized) return;
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
    const stopRealtime = subscribeToState(session.user.id, (row) => {
      const remote = row?.data;
      if (!remote?.storage || remote?.meta?.clientId === clientId) return;
      applyLocalSnapshot(remote.storage);
      window.location.reload();
    });

    return () => {
      active = false;
      window.clearTimeout(saveTimer);
      stopLocal?.();
      stopRealtime?.();
    };
  }, [session?.user?.id]);

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

  if (authLoading || (session && cloudLoading)) {
    return <div className="auth-loading">Chargement sécurisé des données…</div>;
  }

  if (!session) {
    return <Login onLoggedIn={setSession} />;
  }

  const userEmail = session.user?.email || "Utilisateur";
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
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

          <button type="button" onClick={resetNavigation}>
            <RotateCcw size={15} />
            Réinitialiser l’ordre
          </button>

          <small>
            Glissez-déposez les onglets pour modifier leur ordre.
          </small>
        </div>

        <div className="sidebar__footer">
          <span>Projet Expédition</span>
          <small>Version 1.12.0</small>
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

          <div className="user-badge">
            <div className="user-badge__avatar">{initials}</div>
            <div>
              <strong>{userEmail}</strong>
              <span className={`sync-status ${syncStatus === "Synchronisé" ? "sync-status--ok" : ""}`}>{syncStatus}</span>
              <button
                type="button"
                className="user-badge__logout"
                onClick={() => signOut().catch((error) => console.error("Déconnexion:", error))}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        <main className="page-container">
          <CurrentPage />
        </main>
      </section>
    </div>
  );
}
