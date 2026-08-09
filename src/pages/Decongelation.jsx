import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  RotateCcw,
  Save,
  Scale,
} from "lucide-react";

import { notifyLocalStateChange } from "../services/stateBridge";

const STORAGE_KEY = "dashboard-mono-decongelation-v2";
const REFERENCE_WEIGHT = 2.5;

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
  productName: "41290 - Imitation chair de crabe",
  packageWeight: 2.5,
  startDate: "2026-08-01",
  weeks: {
    "2026-08-01": {
      rows: [
        { costcoForecast: 300, costcoActual: 400, foodForecast: 100, foodActual: 100 },
        { costcoForecast: 400, costcoActual: 500, foodForecast: 200, foodActual: 250 },
        { costcoForecast: 300, costcoActual: 400, foodForecast: 400, foodActual: 300 },
        { costcoForecast: 200, costcoActual: 100, foodForecast: 100, foodActual: 300 },
        { costcoForecast: 100, costcoActual: 50, foodForecast: 0, foodActual: 100 },
        { costcoForecast: 0, costcoActual: 100, foodForecast: 0, foodActual: 0 },
        { costcoForecast: 100, costcoActual: 200, foodForecast: 0, foodActual: 0 },
      ],
      note: "",
    },
    "2026-08-08": {
      rows: DAYS.map(() => ({
        costcoForecast: 0,
        costcoActual: 0,
        foodForecast: 0,
        foodActual: 0,
      })),
      note: "",
    },
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const toIso = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIso = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (value, amount) => {
  const date = parseIso(value);
  date.setDate(date.getDate() + amount);
  return toIso(date);
};

const formatDate = (value) =>
  parseIso(value).toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const makeEmptyWeek = () => ({
  rows: DAYS.map(() => ({
    costcoForecast: 0,
    costcoActual: 0,
    foodForecast: 0,
    foodActual: 0,
  })),
  note: "",
});

const formatSigned = (value) => {
  const amount = numberValue(value);
  if (amount > 0) return `+${amount}`;
  return String(amount);
};

export default function Decongelation() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : clone(DEFAULT_STATE);
    } catch {
      return clone(DEFAULT_STATE);
    }
  });

  const activeStart = data.startDate;
  const nextStart = addDays(activeStart, 7);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyLocalStateChange(STORAGE_KEY);
  }, [data]);

  const packageWeight = Math.max(0.01, numberValue(data.packageWeight) || 2.5);
  const conversionFactor = REFERENCE_WEIGHT / packageWeight;

  const ensureWeek = (state, weekStart) => {
    if (state.weeks[weekStart]) return state;
    return {
      ...state,
      weeks: {
        ...state.weeks,
        [weekStart]: makeEmptyWeek(),
      },
    };
  };

  const changeWeek = (direction) => {
    const newStart = addDays(activeStart, direction * 7);
    setData((current) => {
      const ensured = ensureWeek(current, newStart);
      const withNext = ensureWeek(ensured, addDays(newStart, 7));
      return { ...withNext, startDate: newStart };
    });
  };

  const updateRoot = (field, value) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const updateWeek = (weekStart, updater) => {
    setData((current) => {
      const ensured = ensureWeek(current, weekStart);
      return {
        ...ensured,
        weeks: {
          ...ensured.weeks,
          [weekStart]: updater(clone(ensured.weeks[weekStart])),
        },
      };
    });
  };

  const updateCell = (weekStart, rowIndex, field, value) => {
    updateWeek(weekStart, (week) => {
      week.rows[rowIndex][field] = numberValue(value);
      return week;
    });
  };

  const resetModule = () => {
    if (!window.confirm("Réinitialiser toutes les données de décongélation?")) return;
    setData(clone(DEFAULT_STATE));
  };

  const handleZeroReplaceKeyDown = (
    event,
    weekStart,
    rowIndex,
    field,
    currentValue
  ) => {
    if (
      Number(currentValue) === 0 &&
      /^[0-9]$/.test(event.key)
    ) {
      event.preventDefault();
      updateCell(weekStart, rowIndex, field, event.key);
    }
  };

  const renderNumberInput = (weekStart, rowIndex, field, value) => (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onFocus={(event) => {
        if (Number(value) === 0) {
          event.currentTarget.select();
        }
      }}
      onKeyDown={(event) =>
        handleZeroReplaceKeyDown(
          event,
          weekStart,
          rowIndex,
          field,
          value
        )
      }
      onChange={(event) =>
        updateCell(weekStart, rowIndex, field, event.target.value)
      }
    />
  );

  const renderWeek = (weekStart, title) => {
    const week = data.weeks[weekStart] ?? makeEmptyWeek();

    const totals = week.rows.reduce(
      (sum, row) => {
        const costcoForecast = numberValue(row.costcoForecast);
        const costcoActual = numberValue(row.costcoActual);
        const foodForecast = numberValue(row.foodForecast);
        const foodActual = numberValue(row.foodActual);

        return {
          costcoForecast: sum.costcoForecast + costcoForecast,
          costcoActual: sum.costcoActual + costcoActual,
          costcoAdjustment:
            sum.costcoAdjustment + (costcoActual - costcoForecast),
          foodForecast: sum.foodForecast + foodForecast,
          foodActual: sum.foodActual + foodActual,
          foodAdjustment:
            sum.foodAdjustment + (foodActual - foodForecast),
          thawed: sum.thawed + costcoActual + foodActual,
        };
      },
      {
        costcoForecast: 0,
        costcoActual: 0,
        costcoAdjustment: 0,
        foodForecast: 0,
        foodActual: 0,
        foodAdjustment: 0,
        thawed: 0,
      }
    );

    const adjustedThawedTotal = Math.round(totals.thawed * conversionFactor);

    return (
      <section className="thaw-week-card">
        <div className="thaw-week-header">
          <div>
            <span>{title}</span>
            <h3>
              {formatDate(weekStart)} au {formatDate(addDays(weekStart, 6))}
            </h3>
          </div>
        </div>

        <div className="thaw-table-wrapper">
          <table className="thaw-table thaw-table--new-logic">
            <thead>
              <tr>
                <th>Date</th>
                <th>Prévision Costco<br /><small>en paquets</small></th>
                <th>Vente réelle Costco<br /><small>en paquets</small></th>
                <th>Ajusté Costco<br /><small>vente réelle − prévision</small></th>
                <th>Prévision service alimentaire<br /><small>en paquets</small></th>
                <th>Vente réelle service alimentaire<br /><small>en paquets</small></th>
                <th>Ajusté service alimentaire<br /><small>vente réelle − prévision</small></th>
                <th>Qté décongelée<br /><small>format actuel</small></th>
              </tr>
            </thead>

            <tbody>
              {week.rows.map((row, index) => {
                const costcoForecast = numberValue(row.costcoForecast);
                const costcoActual = numberValue(row.costcoActual);
                const foodForecast = numberValue(row.foodForecast);
                const foodActual = numberValue(row.foodActual);

                const costcoAdjustment = costcoActual - costcoForecast;
                const foodAdjustment = foodActual - foodForecast;
                const thawed = Math.round(
                  (costcoActual + foodActual) * conversionFactor
                );

                return (
                  <tr key={`${weekStart}-${DAYS[index]}`}>
                    <td className="thaw-date-cell">
                      <strong>{DAYS[index]}</strong>
                      <span>{formatDate(addDays(weekStart, index))}</span>
                    </td>

                    <td className="thaw-input-costco">
                      {renderNumberInput(
                        weekStart,
                        index,
                        "costcoForecast",
                        row.costcoForecast
                      )}
                    </td>

                    <td className="thaw-input-costco">
                      {renderNumberInput(
                        weekStart,
                        index,
                        "costcoActual",
                        row.costcoActual
                      )}
                    </td>

                    <td className={`thaw-adjustment-cell ${
                      costcoAdjustment > 0
                        ? "positive"
                        : costcoAdjustment < 0
                          ? "negative"
                          : ""
                    }`}>
                      {formatSigned(costcoAdjustment)}
                    </td>

                    <td>
                      {renderNumberInput(
                        weekStart,
                        index,
                        "foodForecast",
                        row.foodForecast
                      )}
                    </td>

                    <td>
                      {renderNumberInput(
                        weekStart,
                        index,
                        "foodActual",
                        row.foodActual
                      )}
                    </td>

                    <td className={`thaw-adjustment-cell ${
                      foodAdjustment > 0
                        ? "positive"
                        : foodAdjustment < 0
                          ? "negative"
                          : ""
                    }`}>
                      {formatSigned(foodAdjustment)}
                    </td>

                    <td className="thaw-total-cell">
                      <strong>{thawed}</strong>
                      <small>
                        {packageWeight.toLocaleString("fr-CA")} lb / paquet
                      </small>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <th>Total</th>
                <th>{totals.costcoForecast}</th>
                <th>{totals.costcoActual}</th>
                <th>{formatSigned(totals.costcoAdjustment)}</th>
                <th>{totals.foodForecast}</th>
                <th>{totals.foodActual}</th>
                <th>{formatSigned(totals.foodAdjustment)}</th>
                <th>{adjustedThawedTotal}</th>
              </tr>
            </tfoot>
          </table>
        </div>

        <label className="thaw-note-field">
          Note de la semaine
          <textarea
            rows="2"
            value={week.note}
            onChange={(event) =>
              updateWeek(weekStart, (current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            placeholder="Information ou commentaire facultatif"
          />
        </label>
      </section>
    );
  };

  const activeWeek = data.weeks[activeStart] ?? makeEmptyWeek();
  const activeThawed = activeWeek.rows.reduce(
    (total, row) =>
      total +
      numberValue(row.costcoActual) +
      numberValue(row.foodActual),
    0
  );

  const activeAdjustedTotal = Math.round(activeThawed * conversionFactor);
  const activeCaseTotal = activeAdjustedTotal / 12;

  const recordedWeeks = Object.entries(data.weeks || {})
    .map(([weekStart, week]) => {
      const rawPackages = (week.rows || []).reduce(
        (total, row) =>
          total +
          numberValue(row.costcoActual) +
          numberValue(row.foodActual),
        0
      );

      return {
        weekStart,
        packages: Math.round(rawPackages * conversionFactor),
      };
    })
    .filter((week) => week.packages > 0)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const periodPackageTotal = recordedWeeks.reduce(
    (total, week) => total + week.packages,
    0
  );
  const periodCaseTotal = periodPackageTotal / 12;

  return (
    <div className="thaw-page">
      <section className="page-card thaw-control-card">
        <div className="thaw-control-main">
          <label className="thaw-product-field">
            Produit
            <input
              value={data.productName}
              onChange={(event) => updateRoot("productName", event.target.value)}
            />
          </label>

          <label className="thaw-weight-field">
            <Scale size={18} />
            Poids du paquet
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={data.packageWeight}
              onChange={(event) =>
                updateRoot("packageWeight", event.target.value)
              }
            />
            <span>lb</span>
          </label>

          <div className="thaw-week-navigation">
            <button type="button" onClick={() => changeWeek(-1)}>
              <ChevronLeft size={18} />
            </button>
            <strong>{formatDate(activeStart)}</strong>
            <button type="button" onClick={() => changeWeek(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={resetModule}
          >
            <RotateCcw size={17} />
            Réinitialiser
          </button>
        </div>

        <div className="thaw-kpis">
          <article>
            <Package size={21} />
            <span>Format actuel</span>
            <strong>{packageWeight.toLocaleString("fr-CA")} lb</strong>
          </article>

          <article>
            <Scale size={21} />
            <span>Facteur de conversion</span>
            <strong>
              {conversionFactor.toLocaleString("fr-CA", {
                maximumFractionDigits: 3,
              })}
            </strong>
          </article>

          <article>
            <Save size={21} />
            <span>Total semaine active</span>
            <strong>{activeAdjustedTotal} paquets</strong>
            <small className="thaw-case-total">
              {activeCaseTotal.toLocaleString("fr-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} caisses
              <em>1 caisse = 12 paquets</em>
            </small>
          </article>

          <article>
            <Save size={21} />
            <span>Total période enregistrée</span>
            <strong>{periodPackageTotal.toLocaleString("fr-CA")} paquets</strong>
            <small className="thaw-case-total">
              {periodCaseTotal.toLocaleString("fr-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} caisses
              <em>{recordedWeeks.length} semaine{recordedWeeks.length > 1 ? "s" : ""} avec données</em>
            </small>
          </article>
        </div>

        <div className="thaw-formula-note">
          <strong>Nouvelle logique :</strong>
          <span>
            Ajusté = vente réelle − prévision. Quantité décongelée =
            vente réelle Costco + vente réelle service alimentaire,
            convertie selon le poids actuel du paquet.
          </span>
        </div>
      </section>

      {renderWeek(activeStart, "Semaine active")}
      {renderWeek(nextStart, "Semaine suivante")}
    </div>
  );
}