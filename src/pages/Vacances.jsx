import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { EMPLOYES_INITIAUX as EMPLOYES, METIERS } from "../data/employees";

import { notifyLocalStateChange } from "../services/stateBridge";

const STORAGE_KEY = "dashboard-mono-vacances-v1";

const TYPES = [
  { value: "VACANCES", label: "Vacances" },
  { value: "TEMPS_BANQUE", label: "Temps en banque" },
  { value: "HEURES_ACCUMULEES", label: "Heures accumulées" },
  { value: "MALADIE", label: "Maladie" },
];

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const JOURS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

const MOUVEMENTS_INITIAUX = [
  {
    id: "m1",
    employeeId: "EMP-002",
    date: "2026-08-03",
    hours: 8,
    type: "VACANCES",
    comment: "Vacances approuvées",
  },
  {
    id: "m2",
    employeeId: "EMP-002",
    date: "2026-08-04",
    hours: 8,
    type: "VACANCES",
    comment: "",
  },
  {
    id: "m3",
    employeeId: "EMP-002",
    date: "2026-08-05",
    hours: 8,
    type: "VACANCES",
    comment: "",
  },
  {
    id: "m4",
    employeeId: "EMP-002",
    date: "2026-08-06",
    hours: 8,
    type: "VACANCES",
    comment: "",
  },
  {
    id: "m5",
    employeeId: "EMP-002",
    date: "2026-08-07",
    hours: 8,
    type: "VACANCES",
    comment: "",
  },
  {
    id: "m6",
    employeeId: "EMP-004",
    date: "2026-08-12",
    hours: 8,
    type: "MALADIE",
    comment: "",
  },
  {
    id: "m7",
    employeeId: "EMP-004",
    date: "2026-08-13",
    hours: 8,
    type: "MALADIE",
    comment: "",
  },
];

const toIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatLongDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function getMonthDays(year, month) {
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => new Date(year, month, index + 1));
}

function enumerateDates(startDate, endDate) {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(toIso(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getTypeLabel(type) {
  return TYPES.find((item) => item.value === type)?.label ?? type;
}

function loadMovements() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : MOUVEMENTS_INITIAUX;
  } catch {
    return MOUVEMENTS_INITIAUX;
  }
}

export default function Vacances() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7);
  const [weekAnchor, setWeekAnchor] = useState("2026-08-01");
  const [viewMode, setViewMode] = useState("mois");
  const [displayMode, setDisplayMode] = useState("globale");
  const [nameFormat, setNameFormat] = useState("prenomNom");
  const [sortOrder, setSortOrder] = useState("az");
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [movements, setMovements] = useState(loadMovements);
  const [modal, setModal] = useState(null);
  const [deleteRangeMode, setDeleteRangeMode] = useState(false);
  const [form, setForm] = useState({
    hours: 8,
    type: "VACANCES",
    comment: "",
    rangeMode: false,
    startDate: "",
    endDate: "",
    deleteStartDate: "",
    deleteEndDate: "",
  });

  const historyRef = useRef([movements]);
  const historyIndexRef = useRef(0);
  const [, forceHistoryRender] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
    notifyLocalStateChange(STORAGE_KEY);
  }, [movements]);

  const days = useMemo(() => {
    if (viewMode === "semaine") {
      const anchor = new Date(`${weekAnchor}T00:00:00`);
      const dayOfWeek = anchor.getDay();
      const daysSinceSaturday = (dayOfWeek + 1) % 7;
      const saturday = new Date(anchor);
      saturday.setDate(anchor.getDate() - daysSinceSaturday);

      return Array.from({ length: 9 }, (_, index) => {
        const date = new Date(saturday);
        date.setDate(saturday.getDate() + index);
        return date;
      });
    }

    if (viewMode === "année") {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      const result = [];
      const current = new Date(firstDay);

      while (current <= lastDay) {
        result.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      return result;
    }

    return getMonthDays(year, month);
  }, [year, month, viewMode, weekAnchor]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = EMPLOYES.filter((employee) => {
      const okSearch = !term || employee.nom.toLowerCase().includes(term);
      const okTrade = !tradeFilter || employee.metier === tradeFilter;
      return okSearch && okTrade;
    });

    return [...result].sort((a, b) => {
      const comparison = a.nom.localeCompare(b.nom, "fr");
      return sortOrder === "az" ? comparison : -comparison;
    });
  }, [search, tradeFilter, sortOrder]);

  const pushHistory = (next) => {
    const index = historyIndexRef.current;
    const base = historyRef.current.slice(0, index + 1);
    historyRef.current = [...base, next];
    historyIndexRef.current = historyRef.current.length - 1;
    setMovements(next);
    forceHistoryRender((value) => value + 1);
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = () => {
    if (!canUndo) return;
    historyIndexRef.current -= 1;
    setMovements(historyRef.current[historyIndexRef.current]);
    forceHistoryRender((value) => value + 1);
  };

  const redo = () => {
    if (!canRedo) return;
    historyIndexRef.current += 1;
    setMovements(historyRef.current[historyIndexRef.current]);
    forceHistoryRender((value) => value + 1);
  };

  const shiftPeriod = (direction) => {
    if (viewMode === "semaine") {
      const anchor = new Date(`${weekAnchor}T00:00:00`);
      anchor.setDate(anchor.getDate() + direction * 7);
      setWeekAnchor(toIso(anchor));
      setYear(anchor.getFullYear());
      setMonth(anchor.getMonth());
      return;
    }

    if (viewMode === "année") {
      setYear((value) => value + direction);
      return;
    }

    setMonth((current) => {
      const next = current + direction;

      if (next < 0) {
        setYear((value) => value - 1);
        return 11;
      }

      if (next > 11) {
        setYear((value) => value + 1);
        return 0;
      }

      return next;
    });
  };

  const movementForCell = (employeeId, date) =>
    movements.find(
      (movement) =>
        movement.employeeId === employeeId && movement.date === date
    );

  const openCell = (employee, date) => {
    const existing = movementForCell(employee.id, date);

    setModal({
      employee,
      date,
      existingId: existing?.id ?? null,
    });

    setForm({
      hours: existing?.hours ?? 8,
      type: existing?.type ?? "VACANCES",
      comment: existing?.comment ?? "",
      rangeMode: false,
      startDate: date,
      endDate: date,
      deleteStartDate: date,
      deleteEndDate: date,
    });
    setDeleteRangeMode(false);
  };

  const saveMovement = (event) => {
    event.preventDefault();
    if (!modal) return;

    const hours = Number(form.hours || 0);
    if (hours <= 0) return;

    if (form.rangeMode) {
      if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
        return;
      }

      const dates = enumerateDates(form.startDate, form.endDate);

      const existingKeys = new Set(
        movements.map((movement) => `${movement.employeeId}-${movement.date}`)
      );

      const newEntries = dates.map((date, index) => {
        const existing = movements.find(
          (movement) =>
            movement.employeeId === modal.employee.id && movement.date === date
        );

        return {
          id: existing?.id ?? `m-${Date.now()}-${index}`,
          employeeId: modal.employee.id,
          date,
          hours,
          type: form.type,
          comment: form.comment.trim(),
        };
      });

      const idsToReplace = new Set(newEntries.map((entry) => entry.id));
      const dateKeysToReplace = new Set(
        newEntries.map((entry) => `${entry.employeeId}-${entry.date}`)
      );

      const untouched = movements.filter(
        (movement) =>
          !idsToReplace.has(movement.id) &&
          !dateKeysToReplace.has(`${movement.employeeId}-${movement.date}`)
      );

      pushHistory([...untouched, ...newEntries]);
      setModal(null);
      return;
    }

    const nextMovement = {
      id: modal.existingId ?? `m-${Date.now()}`,
      employeeId: modal.employee.id,
      date: modal.date,
      hours,
      type: form.type,
      comment: form.comment.trim(),
    };

    const next = modal.existingId
      ? movements.map((movement) =>
          movement.id === modal.existingId ? nextMovement : movement
        )
      : [...movements, nextMovement];

    pushHistory(next);
    setModal(null);
  };

  const deleteMovementRange = () => {
    if (!modal) return;

    const startDate = form.deleteStartDate;
    const endDate = form.deleteEndDate;

    if (!startDate || !endDate || endDate < startDate) return;

    const next = movements.filter(
      (movement) =>
        !(
          movement.employeeId === modal.employee.id &&
          movement.date >= startDate &&
          movement.date <= endDate
        )
    );

    pushHistory(next);
    setModal(null);
    setDeleteRangeMode(false);
  };

  const deleteMovement = () => {
    if (!modal?.existingId) return;
    pushHistory(
      movements.filter((movement) => movement.id !== modal.existingId)
    );
    setModal(null);
  };

  const formatEmployeeName = (name) => {
    if (nameFormat === "nomPrenom") {
      const parts = name.split(",").map((part) => part.trim());
      return parts.length === 2 ? `${parts[0]}, ${parts[1]}` : name;
    }

    const parts = name.split(",").map((part) => part.trim());
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
  };

  const totalHours = movements.reduce(
    (total, movement) => total + Number(movement.hours || 0),
    0
  );

  const periodTitle = useMemo(() => {
    if (viewMode === "année") return `${year}`;

    if (viewMode === "semaine") {
      const anchor = new Date(`${weekAnchor}T00:00:00`);
      return `${MOIS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }

    return `${MOIS[month]} ${year}`;
  }, [month, viewMode, weekAnchor, year]);

  return (
    <div className="vacation-page">
      <section className="vacation-toolbar-card">
        <div className="vacation-toolbar vacation-toolbar--sunkiss">
          <div className="vacation-toolbar__period-group">
            <div className="view-switcher">
              {["semaine", "mois", "année"].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={viewMode === mode ? "active" : ""}
                  onClick={() => {
                    setViewMode(mode);
                    if (mode === "semaine") {
                      const date = new Date(year, month, 1);
                      setWeekAnchor(toIso(date));
                    }
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="period-button"
              onClick={() => shiftPeriod(-1)}
              aria-label="Période précédente"
            >
              <ChevronLeft size={18} />
            </button>

            <strong className="vacation-period-title" title={periodTitle}>
              {periodTitle}
            </strong>

            <button
              type="button"
              className="period-button"
              onClick={() => shiftPeriod(1)}
              aria-label="Période suivante"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="vacation-toolbar__filters">
            <label className="search-field">
              <Search size={18} />
              <input
                placeholder="Rechercher un employé..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select value={tradeFilter} onChange={(event) => setTradeFilter(event.target.value)}>
              <option value="">Tous les métiers</option>
              {METIERS.map((trade) => <option key={trade}>{trade}</option>)}
            </select>

            <select value={displayMode} onChange={(event) => setDisplayMode(event.target.value)}>
              <option value="globale">Vue globale</option>
              <option value="vacances">Vacances seulement</option>
              <option value="banques">Banques seulement</option>
              <option value="maladie">Maladie seulement</option>
            </select>

            <select value={nameFormat} onChange={(event) => setNameFormat(event.target.value)}>
              <option value="prenomNom">Prénom Nom</option>
              <option value="nomPrenom">Nom, Prénom</option>
            </select>

            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="az">Nom A → Z</option>
              <option value="za">Nom Z → A</option>
            </select>

            <div className="history-actions">
              <button type="button" disabled={!canUndo} onClick={undo} title="Annuler">
                <RotateCcw size={17} />
              </button>
              <button type="button" disabled={!canRedo} onClick={redo} title="Rétablir">
                <RotateCw size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="vacation-stats">
          <span><strong>{filteredEmployees.length}</strong> employés affichés</span>
          <span><strong>{movements.length}</strong> inscriptions</span>
          <span><strong>{totalHours}</strong> heures d'absence</span>
          <small>Cliquez dans une cellule pour inscrire ou modifier des heures.</small>
        </div>
      </section>

      <section className="page-card vacation-calendar-card">
        <div className="vacation-legend">
          {TYPES.map((type) => (
            <span key={type.value}>
              <i className={`vacation-color vacation-color--${type.value.toLowerCase()}`} />
              {type.label}
            </span>
          ))}
          <span><i className="vacation-color vacation-color--weekend" /> Fin de semaine</span>
        </div>

        <div className="vacation-grid-wrapper">
          <table className="vacation-grid vacation-grid--hours">
            <thead>
              <tr>
                <th className="vacation-sticky vacation-sticky--name">Employé</th>
                <th className="vacation-sticky vacation-sticky--trade">Métier</th>
                <th className="vacation-sticky vacation-sticky--team">Équipe</th>

                {days.map((date) => {
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  const monthStart = date.getDate() === 1;
                  const currentMonth =
                    date.getFullYear() === new Date().getFullYear() &&
                    date.getMonth() === new Date().getMonth();

                  return (
                    <th
                      key={toIso(date)}
                      className={[
                        weekend ? "weekend-head" : "",
                        monthStart ? "month-start-head" : "",
                        currentMonth ? "current-month-head" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span>{JOURS[date.getDay()]}</span>
                      <small>
                        {String(date.getDate()).padStart(2, "0")}
                        {viewMode === "année" ? ` ${MOIS[date.getMonth()].slice(0, 4).toLowerCase()}.` : ""}
                      </small>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="vacation-sticky vacation-sticky--name employee-name-cell">
                    {formatEmployeeName(employee.nom)}
                  </td>
                  <td className="vacation-sticky vacation-sticky--trade">
                    {employee.metier}
                  </td>
                  <td className="vacation-sticky vacation-sticky--team">
                    {employee.equipe}
                  </td>

                  {days.map((date) => {
                    const dateIso = toIso(date);
                    const weekend = date.getDay() === 0 || date.getDay() === 6;
                    const monthStart = date.getDate() === 1;
                    const currentMonth =
                      date.getFullYear() === new Date().getFullYear() &&
                      date.getMonth() === new Date().getMonth();
                    const movementRaw = movementForCell(employee.id, dateIso);
                    const movement =
                      !movementRaw
                        ? null
                        : displayMode === "globale"
                          ? movementRaw
                          : displayMode === "vacances" && movementRaw.type === "VACANCES"
                            ? movementRaw
                            : displayMode === "banques" &&
                                ["TEMPS_BANQUE", "HEURES_ACCUMULEES"].includes(movementRaw.type)
                              ? movementRaw
                              : displayMode === "maladie" && movementRaw.type === "MALADIE"
                                ? movementRaw
                                : null;

                    return (
                      <td
                        key={`${employee.id}-${dateIso}`}
                        className={[
                          "vacation-cell",
                          "vacation-cell--clickable",
                          weekend ? "weekend-cell" : "",
                          monthStart ? "month-start-cell" : "",
                          currentMonth ? "current-month-cell" : "",
                          movement
                            ? `vacation-cell--${movement.type.toLowerCase()}`
                            : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => openCell(employee, dateIso)}
                        title={
                          movement
                            ? `${getTypeLabel(movement.type)} · ${movement.hours} h`
                            : "Cliquer pour inscrire une absence"
                        }
                      >
                        {movement && (
                          <div className="vacation-hours-entry">
                            <strong>{movement.hours} h</strong>
                            <small>{getTypeLabel(movement.type)}</small>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop">
          <form className="employee-modal vacation-cell-modal" onSubmit={saveMovement}>
            <div className="employee-modal__header">
              <div>
                <h2>Inscrire une absence</h2>
                <p>
                  <strong>{modal.employee.nom}</strong><br />
                  {form.rangeMode
                    ? "Sélectionne une date de début et une date de fin"
                    : formatLongDate(modal.date)}
                </p>
                {modal.existingId && (
                  <small className="modal-help-text">
                    Le bouton Supprimer permet aussi d’effacer plusieurs jours à la fois.
                  </small>
                )}
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setModal(null)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="employee-modal__body">
              <div className="form-grid">
                <label className="checkbox-field form-field--wide">
                  <input
                    type="checkbox"
                    checked={form.rangeMode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rangeMode: event.target.checked,
                        startDate: modal.date,
                        endDate: modal.date,
                      }))
                    }
                  />
                  <span>Inscrire une plage de dates</span>
                </label>

                {form.rangeMode && (
                  <>
                    <label className="form-field">
                      <span>Date de début</span>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Date de fin</span>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                )}

                <label className="form-field form-field--wide">
                  <span>Nombre d'heures par jour</span>
                  <input
                    autoFocus
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={form.hours}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        hours: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field form-field--wide">
                  <span>Déduire de</span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    {TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field form-field--wide">
                  <span>Commentaire</span>
                  <textarea
                    rows="4"
                    placeholder="Facultatif"
                    value={form.comment}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="employee-modal__footer vacation-cell-modal__footer">
              {modal.existingId ? (
                <div className="delete-range-area">
                  {!deleteRangeMode ? (
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => setDeleteRangeMode(true)}
                    >
                      Supprimer
                    </button>
                  ) : (
                    <div className="delete-range-controls">
                      <label className="form-field">
                        <span>Début</span>
                        <input
                          type="date"
                          value={form.deleteStartDate}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              deleteStartDate: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="form-field">
                        <span>Fin</span>
                        <input
                          type="date"
                          value={form.deleteEndDate}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              deleteEndDate: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="delete-button delete-button--confirm"
                        onClick={deleteMovementRange}
                      >
                        Effacer la plage
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setDeleteRangeMode(false)}
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              ) : <span />}

              <div>
                <button type="button" className="secondary-button" onClick={() => setModal(null)}>
                  Annuler
                </button>
                <button type="submit" className="primary-button">
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}