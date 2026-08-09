import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Hash, RotateCcw } from "lucide-react";

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(value, days) {
  const date = parseIso(value);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

function dayOfYear(value) {
  const date = parseIso(value);
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

/*
  Logique reprise du classeur Excel fourni :
  - dernier chiffre de l'année
  - jour de l'année sur 3 chiffres
  - chiffre de contrôle = nombre à 4 chiffres modulo 9

  Exemple 2026-01-01 :
  6 + 001 = 6001 ; 6001 MOD 9 = 7 => 60017
*/
function julianCode(value) {
  if (!value) return "";
  const date = parseIso(value);
  const yearDigit = String(date.getFullYear()).slice(-1);
  const ordinal = String(dayOfYear(value)).padStart(3, "0");
  const base = `${yearDigit}${ordinal}`;
  const checkDigit = Number(base) % 9;
  return `${base}${checkDigit}`;
}

function formatLong(value) {
  if (!value) return "";
  return parseIso(value).toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JourJulien() {
  const [date, setDate] = useState(todayIso());

  const result = useMemo(() => {
    if (!date) return null;

    return {
      code: julianCode(date),
      ordinal: dayOfYear(date),
      dma: addDays(date, 270),
    };
  }, [date]);

  const reset = () => setDate(todayIso());

  return (
    <div className="julian-page">
      <section className="julian-card">
        <div className="julian-heading">
          <div>
            <span className="julian-eyebrow">CALCULATEUR</span>
            <h2>Calculateur de jour julien</h2>
            <p>
              Sélectionnez une date pour obtenir automatiquement le code julien
              selon la logique de votre tableau Excel.
            </p>
          </div>

          <button type="button" className="secondary-button" onClick={reset}>
            <RotateCcw size={17} />
            Aujourd'hui
          </button>
        </div>

        <div className="julian-input-area">
          <label>
            <span>Date</span>
            <div className="julian-date-input">
              <CalendarDays size={20} />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </label>

          {result && (
            <div className="julian-selected-date">
              {formatLong(date)}
            </div>
          )}
        </div>

        {result && (
          <div className="julian-results">
            <article className="julian-result julian-result--primary">
              <Hash size={23} />
              <span>Jour julien</span>
              <strong>{result.code}</strong>
            </article>

            <article className="julian-result">
              <CalendarDays size={23} />
              <span>Jour de l'année</span>
              <strong>{result.ordinal}</strong>
              <small>sur {new Date(parseIso(date).getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365} jours</small>
            </article>

            <article className="julian-result">
              <Clock3 size={23} />
              <span>DMA (+270 jours)</span>
              <strong>{result.dma}</strong>
              <small>{formatLong(result.dma)}</small>
            </article>
          </div>
        )}

        <div className="julian-explanation">
          <strong>Logique du code :</strong>
          <span>
            dernier chiffre de l'année + jour de l'année sur 3 chiffres +
            chiffre de contrôle modulo 9.
          </span>
        </div>
      </section>
    </div>
  );
}
