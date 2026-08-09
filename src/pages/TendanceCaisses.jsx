import { useEffect, useMemo, useState } from "react";
import { Boxes, CalendarRange, TrendingUp } from "lucide-react";

const STORAGE_KEY = "dashboard-mono-decongelation-v2";
const REFERENCE_WEIGHT = 2.5;
const PACKAGES_PER_CASE = 12;

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseIso = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatWeek = (value) =>
  parseIso(value).toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCases = (value) =>
  numberValue(value).toLocaleString("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function loadThawingData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function TendanceCaisses() {
  const [data, setData] = useState(loadThawingData);
  const [showEmptyWeeks, setShowEmptyWeeks] = useState(false);

  useEffect(() => {
    const refresh = () => setData(loadThawingData());

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const points = useMemo(() => {
    if (!data?.weeks) return [];

    const packageWeight = Math.max(
      0.01,
      numberValue(data.packageWeight) || REFERENCE_WEIGHT
    );
    const conversionFactor = REFERENCE_WEIGHT / packageWeight;

    return Object.entries(data.weeks)
      .map(([weekStart, week]) => {
        const packageTotal = (week.rows || []).reduce(
          (sum, row) =>
            sum +
            numberValue(row.costcoActual) +
            numberValue(row.foodActual),
          0
        );

        const convertedPackages = packageTotal * conversionFactor;
        const cases = convertedPackages / PACKAGES_PER_CASE;

        return {
          weekStart,
          packages: convertedPackages,
          cases,
        };
      })
      .filter((point) => showEmptyWeeks || point.packages > 0)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }, [data, showEmptyWeeks]);

  const stats = useMemo(() => {
    if (points.length === 0) {
      return {
        total: 0,
        average: 0,
        maximum: 0,
        latest: 0,
        change: 0,
      };
    }

    const total = points.reduce((sum, point) => sum + point.cases, 0);
    const maximum = Math.max(...points.map((point) => point.cases));
    const latest = points.at(-1)?.cases || 0;
    const previous = points.at(-2)?.cases || 0;
    const change =
      previous === 0 ? 0 : ((latest - previous) / previous) * 100;

    return {
      total,
      average: total / points.length,
      maximum,
      latest,
      change,
    };
  }, [points]);

  const chart = useMemo(() => {
    const width = 1100;
    const height = 390;
    const padding = { top: 30, right: 34, bottom: 74, left: 76 };

    if (points.length === 0) {
      return { width, height, padding, path: "", coordinates: [], ticks: [] };
    }

    const maxValue = Math.max(...points.map((point) => point.cases), 1);
    const roundedMax = Math.ceil(maxValue / 25) * 25;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const coordinates = points.map((point, index) => {
      const x =
        points.length === 1
          ? padding.left + plotWidth / 2
          : padding.left + (index / (points.length - 1)) * plotWidth;
      const y =
        padding.top +
        plotHeight -
        (point.cases / roundedMax) * plotHeight;

      return { ...point, x, y };
    });

    const path = coordinates
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(" ");

    const ticks = Array.from({ length: 6 }, (_, index) => {
      const value = (roundedMax / 5) * index;
      const y =
        padding.top +
        plotHeight -
        (value / roundedMax) * plotHeight;
      return { value, y };
    });

    return { width, height, padding, path, coordinates, ticks };
  }, [points]);

  return (
    <div className="cases-trend-page">
      <section className="cases-trend-controls">
        <div>
          <h2>Courbe de tendance — caisses utilisées</h2>
          <p>
            Calcul automatique selon les ventes réelles de décongélation.
            Une caisse contient {PACKAGES_PER_CASE} paquets.
          </p>
        </div>

        <label className="cases-empty-toggle">
          <input
            type="checkbox"
            checked={showEmptyWeeks}
            onChange={(event) => setShowEmptyWeeks(event.target.checked)}
          />
          Afficher les semaines à zéro
        </label>
      </section>

      <section className="cases-trend-kpis">
        <article>
          <Boxes size={21} />
          <span>Dernière semaine</span>
          <strong>{formatCases(stats.latest)} caisses</strong>
        </article>

        <article>
          <TrendingUp size={21} />
          <span>Moyenne hebdomadaire</span>
          <strong>{formatCases(stats.average)} caisses</strong>
        </article>

        <article>
          <CalendarRange size={21} />
          <span>Total de la période · {points.length} semaine{points.length > 1 ? "s" : ""}</span>
          <strong>{formatCases(stats.total)} caisses</strong>
        </article>

        <article>
          <TrendingUp size={21} />
          <span>Variation dernière semaine</span>
          <strong className={stats.change < 0 ? "trend-down" : "trend-up"}>
            {stats.change > 0 ? "+" : ""}
            {stats.change.toLocaleString("fr-CA", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} %
          </strong>
        </article>
      </section>

      <section className="cases-chart-card">
        {points.length === 0 ? (
          <div className="cases-chart-empty">
            Aucune semaine contenant des ventes réelles n’est disponible.
          </div>
        ) : (
          <>
            <div className="cases-chart-summary">
              <div>
                <span>Maximum observé</span>
                <strong>{formatCases(stats.maximum)} caisses</strong>
              </div>
              <div>
                <span>Nombre de semaines</span>
                <strong>{points.length}</strong>
              </div>
            </div>

            <div className="cases-chart-scroll">
              <svg
                className="cases-line-chart"
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-label="Courbe du nombre de caisses utilisées par semaine"
              >
                {chart.ticks.map((tick) => (
                  <g key={tick.value}>
                    <line
                      x1={chart.padding.left}
                      x2={chart.width - chart.padding.right}
                      y1={tick.y}
                      y2={tick.y}
                      className="cases-grid-line"
                    />
                    <text
                      x={chart.padding.left - 12}
                      y={tick.y + 5}
                      textAnchor="end"
                      className="cases-axis-label"
                    >
                      {Math.round(tick.value)}
                    </text>
                  </g>
                ))}

                <line
                  x1={chart.padding.left}
                  x2={chart.padding.left}
                  y1={chart.padding.top}
                  y2={chart.height - chart.padding.bottom}
                  className="cases-axis-line"
                />
                <line
                  x1={chart.padding.left}
                  x2={chart.width - chart.padding.right}
                  y1={chart.height - chart.padding.bottom}
                  y2={chart.height - chart.padding.bottom}
                  className="cases-axis-line"
                />

                <path d={chart.path} className="cases-trend-line" />

                {chart.coordinates.map((point) => (
                  <g key={point.weekStart}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      className="cases-trend-dot"
                    />
                    <text
                      x={point.x}
                      y={point.y - 13}
                      textAnchor="middle"
                      className="cases-point-value"
                    >
                      {formatCases(point.cases)}
                    </text>
                    <text
                      x={point.x}
                      y={chart.height - chart.padding.bottom + 28}
                      textAnchor="middle"
                      className="cases-week-label"
                    >
                      {formatWeek(point.weekStart)}
                    </text>
                  </g>
                ))}

                <text
                  x="20"
                  y={chart.height / 2}
                  transform={`rotate(-90 20 ${chart.height / 2})`}
                  textAnchor="middle"
                  className="cases-axis-title"
                >
                  Caisses utilisées
                </text>
              </svg>
            </div>
          </>
        )}
      </section>

      <section className="cases-history-card">
        <h3>Historique hebdomadaire</h3>
        <div className="cases-history-table-wrapper">
          <table className="cases-history-table">
            <thead>
              <tr>
                <th>Semaine du</th>
                <th>Paquets utilisés</th>
                <th>Caisses utilisées</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.weekStart}>
                  <td>{formatWeek(point.weekStart)}</td>
                  <td>
                    {Math.round(point.packages).toLocaleString("fr-CA")}
                  </td>
                  <td>{formatCases(point.cases)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
