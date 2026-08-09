import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { notifyLocalStateChange } from "../services/stateBridge";

const STORAGE_KEY = "dashboard-mono-riz-sec-v1";
const PACKAGES_PER_CASE = 3;

const DAYS = [
  "Samedi",
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
];

const DEFAULT_STATE = {
  startDate: "2026-07-25",
  weeks: {
    "2026-07-25": {
      rows: [
        { forecast: 60, added: 0, actual: 0, preparedBy: "", note: "20 pour Amadou, 20 pour Evens, 20 pour Dimitry" },
        { forecast: 60, added: 0, actual: 0, preparedBy: "", note: "20 pour Amadou, 20 pour Evens, 20 pour Dimitry" },
        { forecast: 45, added: 20, actual: 0, preparedBy: "", note: "20cs sur la palette" },
        { forecast: 50, added: 20, actual: 0, preparedBy: "", note: "20cs sur la palette" },
        { forecast: 50, added: 20, actual: 0, preparedBy: "", note: "20cs sur la palette" },
        { forecast: 40, added: 20, actual: 0, preparedBy: "", note: "20cs sur la palette" },
        { forecast: 40, added: 20, actual: 0, preparedBy: "", note: "20cs sur la palette" },
      ],
    },
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const parseIso = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (value, amount) => {
  const date = parseIso(value);
  date.setDate(date.getDate() + amount);
  return toIso(date);
};

const formatDate = (value) =>
  parseIso(value).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const formatWeekLabel = (startDate) => {
  const start = parseIso(startDate);
  const end = parseIso(addDays(startDate, 6));

  const startText = start.toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "long",
  });
  const endText = end.toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${startText} au ${endText}`;
};

const makeEmptyWeek = () => ({
  rows: DAYS.map(() => ({
    forecast: 0,
    added: 0,
    actual: 0,
    preparedBy: "",
    note: "",
  })),
});

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function RizSec() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : clone(DEFAULT_STATE);
    } catch {
      return clone(DEFAULT_STATE);
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyLocalStateChange(STORAGE_KEY);
  }, [data]);

  const startDate = data.startDate;
  const week = data.weeks[startDate] ?? makeEmptyWeek();

  const ensureWeek = (current, weekStart) => {
    if (current.weeks[weekStart]) return current;
    return {
      ...current,
      weeks: {
        ...current.weeks,
        [weekStart]: makeEmptyWeek(),
      },
    };
  };

  const changeWeek = (direction) => {
    const next = addDays(startDate, direction * 7);
    setData((current) => {
      const ensured = ensureWeek(current, next);
      return { ...ensured, startDate: next };
    });
  };

  const updateRow = (rowIndex, field, value) => {
    setData((current) => {
      const ensured = ensureWeek(current, startDate);
      const nextWeek = clone(ensured.weeks[startDate]);
      nextWeek.rows[rowIndex][field] =
        ["forecast", "added", "actual"].includes(field)
          ? numberValue(value)
          : value;

      return {
        ...ensured,
        weeks: {
          ...ensured.weeks,
          [startDate]: nextWeek,
        },
      };
    });
  };

  const totals = useMemo(() => {
    return week.rows.reduce(
      (acc, row) => {
        const forecast = numberValue(row.forecast);
        const added = numberValue(row.added);
        const toPrepare = forecast + added;
        const actual = numberValue(row.actual);

        acc.forecast += forecast;
        acc.added += added;
        acc.toPrepare += toPrepare;
        acc.actual += actual;
        return acc;
      },
      { forecast: 0, added: 0, toPrepare: 0, actual: 0 }
    );
  }, [week]);

  const numericInput = (rowIndex, field, value) => (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onFocus={(event) => {
        if (Number(value) === 0) event.currentTarget.select();
      }}
      onKeyDown={(event) => {
        if (Number(value) === 0 && /^[0-9]$/.test(event.key)) {
          event.preventDefault();
          updateRow(rowIndex, field, event.key);
        }
      }}
      onChange={(event) => updateRow(rowIndex, field, event.target.value)}
    />
  );

  const reset = () => {
    if (!window.confirm("Réinitialiser le tableau de préparation du riz sec?")) return;
    setData(clone(DEFAULT_STATE));
  };

  return (
    <div className="rice-page">
      <section className="rice-toolbar">
        <div>
          <h2>Préparation riz sec (Fuji Mai)</h2>
          <p>1 caisse rouge = 3 paquets · 1 paquet Fuji Mai = 20 lb</p>
        </div>

        <div className="rice-week-nav">
          <button type="button" onClick={() => changeWeek(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <span>Semaine du</span>
            <strong>{formatWeekLabel(startDate)}</strong>
          </div>
          <button type="button" onClick={() => changeWeek(1)}>
            <ChevronRight size={18} />
          </button>
          <button type="button" className="secondary-button" onClick={reset}>
            <RotateCcw size={17} />
            Réinitialiser
          </button>
        </div>
      </section>

      <section className="rice-table-card">
        <div className="rice-table-wrap">
          <table className="rice-table">
            <thead>
              <tr>
                <th>Jour de la semaine</th>
                <th>Prévision<br /><small>en caisse</small></th>
                <th>Qté rajoutée<br /><small>en caisse</small></th>
                <th>Qté à préparer<br /><small>en caisse</small></th>
                <th>Qté préparée réelle<br /><small>en caisse</small></th>
                <th>Préparé par</th>
                <th>Note</th>
              </tr>
            </thead>

            <tbody>
              {week.rows.map((row, index) => {
                const toPrepare =
                  numberValue(row.forecast) + numberValue(row.added);

                return (
                  <tr key={`${startDate}-${index}`}>
                    <td className="rice-date-cell">
                      <strong>{DAYS[index]}</strong>
                      <span>{formatDate(addDays(startDate, index))}</span>
                    </td>
                    <td>{numericInput(index, "forecast", row.forecast)}</td>
                    <td>{numericInput(index, "added", row.added)}</td>
                    <td className="rice-calculated">{toPrepare}</td>
                    <td>{numericInput(index, "actual", row.actual)}</td>
                    <td>
                      <input
                        type="text"
                        value={row.preparedBy}
                        onChange={(event) =>
                          updateRow(index, "preparedBy", event.target.value)
                        }
                        placeholder="Nom"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.note}
                        onChange={(event) =>
                          updateRow(index, "note", event.target.value)
                        }
                        placeholder="Note"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <th>Total en caisse</th>
                <th>{totals.forecast}</th>
                <th>{totals.added}</th>
                <th>{totals.toPrepare}</th>
                <th>{totals.actual}</th>
              </tr>
              <tr>
                <th>Total paquets</th>
                <th>{totals.forecast * PACKAGES_PER_CASE}</th>
                <th>{totals.added * PACKAGES_PER_CASE}</th>
                <th>{totals.toPrepare * PACKAGES_PER_CASE}</th>
                <th>{totals.actual * PACKAGES_PER_CASE}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}