import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { EMPLOYES_INITIAUX as EMPLOYES, METIERS } from "../data/employees";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const JOURS_COURTS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

function construireJours(annee, moisIndex, vue) {
  if (vue === "semaine") {
    const debut = new Date(annee, moisIndex, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(debut);
      date.setDate(debut.getDate() + index);
      return date;
    });
  }

  if (vue === "année") {
    return Array.from({ length: 12 }, (_, index) => new Date(annee, index, 1));
  }

  const nbJours = new Date(annee, moisIndex + 1, 0).getDate();
  return Array.from({ length: nbJours }, (_, index) => new Date(annee, moisIndex, index + 1));
}

export default function Horaire() {
  const [vue, setVue] = useState("mois");
  const [annee, setAnnee] = useState(2026);
  const [moisIndex, setMoisIndex] = useState(7);
  const [recherche, setRecherche] = useState("");
  const [metier, setMetier] = useState("");
  const [valeurs, setValeurs] = useState({});

  const jours = useMemo(
    () => construireJours(annee, moisIndex, vue),
    [annee, moisIndex, vue]
  );

  const employesFiltres = useMemo(() => {
    const terme = recherche.toLowerCase().trim();
    return EMPLOYES.filter((employe) => {
      const okRecherche = !terme || employe.nom.toLowerCase().includes(terme);
      const okMetier = !metier || employe.metier === metier;
      return okRecherche && okMetier;
    });
  }, [recherche, metier]);

  const changerPeriode = (direction) => {
    if (vue === "année") {
      setAnnee((valeur) => valeur + direction);
      return;
    }

    setMoisIndex((index) => {
      const suivant = index + direction;
      if (suivant < 0) {
        setAnnee((valeur) => valeur - 1);
        return 11;
      }
      if (suivant > 11) {
        setAnnee((valeur) => valeur + 1);
        return 0;
      }
      return suivant;
    });
  };

  const titrePeriode =
    vue === "année" ? `${annee}` : `${MOIS[moisIndex]} ${annee}`;

  const modifierCellule = (employeId, dateCle, valeur) => {
    setValeurs((actuel) => ({
      ...actuel,
      [`${employeId}-${dateCle}`]: valeur,
    }));
  };

  return (
    <section className="page-card schedule-page">
      <div className="schedule-toolbar">
        <div className="view-switcher">
          {["semaine", "mois", "année"].map((option) => (
            <button
              type="button"
              key={option}
              className={vue === option ? "active" : ""}
              onClick={() => setVue(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button className="period-button" type="button" onClick={() => changerPeriode(-1)}>
          <ChevronLeft size={18} />
        </button>

        <strong className="period-title">{titrePeriode}</strong>

        <button className="period-button" type="button" onClick={() => changerPeriode(1)}>
          <ChevronRight size={18} />
        </button>

        <label className="search-field schedule-search">
          <Search size={18} />
          <input
            placeholder="Rechercher un employé..."
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
          />
        </label>

        <select value={metier} onChange={(event) => setMetier(event.target.value)}>
          <option value="">Tous les métiers</option>
          {METIERS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="schedule-legend">
        <span><i className="legend-dot legend-dot--absence" /> Heures d'absence</span>
        <span><i className="legend-dot legend-dot--weekend" /> Fin de semaine</span>
        <small>Cliquez dans une cellule pour inscrire librement le nombre d'heures.</small>
      </div>

      <div className="schedule-table-wrapper">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-col--name">Employé</th>
              <th className="sticky-col sticky-col--trade">Métier</th>
              <th className="sticky-col sticky-col--team">Équipe</th>
              {jours.map((date) => {
                const weekend = date.getDay() === 0 || date.getDay() === 6;
                const cle = date.toISOString().slice(0, 10);
                return (
                  <th key={cle} className={weekend ? "weekend-head" : ""}>
                    {vue === "année" ? (
                      <>{MOIS[date.getMonth()]}</>
                    ) : (
                      <>
                        <span>{JOURS_COURTS[date.getDay()]}</span>
                        <small>{String(date.getDate()).padStart(2, "0")} {MOIS[date.getMonth()].slice(0, 4).toLowerCase()}</small>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {employesFiltres.map((employe) => (
              <tr key={employe.id}>
                <td className="sticky-col sticky-col--name employee-name-cell">{employe.nom}</td>
                <td className="sticky-col sticky-col--trade">{employe.metier}</td>
                <td className="sticky-col sticky-col--team">{employe.equipe}</td>
                {jours.map((date) => {
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  const dateCle = date.toISOString().slice(0, 10);
                  const cle = `${employe.id}-${dateCle}`;
                  return (
                    <td key={cle} className={weekend ? "weekend-cell" : ""}>
                      <input
                        aria-label={`${employe.nom} ${dateCle}`}
                        value={valeurs[cle] ?? ""}
                        onChange={(event) =>
                          modifierCellule(employe.id, dateCle, event.target.value)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
