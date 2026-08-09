import { useEffect, useMemo, useState } from "react";
import { Edit3, Search, X } from "lucide-react";
import {
  buildEmployeeBanks,
  EMPLOYES_INITIAUX,
  METIERS,
} from "../data/employees";

import { notifyLocalStateChange } from "../services/stateBridge";

const STORAGE_KEY = "dashboard-mono-banques-v1";

const TYPES = ["Vacances", "Temps en banque", "Heures accumulées", "Maladie"];

function CarteBanque({ titre, donnees }) {
  const restant = donnees.accorde - donnees.utilise;
  const ratio =
    donnees.accorde > 0
      ? Math.max(0, Math.min(100, (restant / donnees.accorde) * 100))
      : 0;

  return (
    <article className="bank-card">
      <div className="bank-card__header">
        <strong>{titre}</strong>
        <b className={restant < 0 ? "negative" : ""}>{restant} h</b>
      </div>

      <div className="bank-card__stats">
        <span>
          Accordé <b>{donnees.accorde} h</b>
        </span>
        <span>
          Utilisé <b>{donnees.utilise} h</b>
        </span>
        <span>
          Restant{" "}
          <b className={restant < 0 ? "negative" : ""}>{restant} h</b>
        </span>
      </div>

      <div className="bank-progress">
        <i style={{ width: `${ratio}%` }} />
      </div>
    </article>
  );
}

function loadBanks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : EMPLOYES_INITIAUX.map(buildEmployeeBanks);
  } catch {
    return EMPLOYES_INITIAUX.map(buildEmployeeBanks);
  }
}

export default function Banques() {
  const [employes, setEmployes] = useState(loadBanks);
  const [selectionId, setSelectionId] = useState(EMPLOYES_INITIAUX[0]?.id);
  const [recherche, setRecherche] = useState("");
  const [metier, setMetier] = useState("");
  const [typeHistorique, setTypeHistorique] = useState("");
  const [modalOuverte, setModalOuverte] = useState(false);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employes));
    notifyLocalStateChange(STORAGE_KEY);
  }, [employes]);

  const [formBanques, setFormBanques] = useState({
    Vacances: 0,
    "Temps en banque": 0,
    "Heures accumulées": 0,
    Maladie: 0,
  });

  const employesFiltres = useMemo(() => {
    const terme = recherche.toLowerCase().trim();

    return employes.filter((employe) => {
      const correspondRecherche =
        !terme || employe.nom.toLowerCase().includes(terme);
      const correspondMetier = !metier || employe.metier === metier;
      return correspondRecherche && correspondMetier;
    });
  }, [employes, recherche, metier]);

  const selection =
    employes.find((employe) => employe.id === selectionId) ?? employes[0];

  const historique = useMemo(() => {
    const lignes = [];

    TYPES.forEach((type, typeIndex) => {
      for (let index = 0; index < 5; index += 1) {
        lignes.push({
          id: `${type}-${index}`,
          date: `${String(25 - index).padStart(2, "0")} août 2026`,
          type,
          heures: -(typeIndex + 1) * 2,
          commentaire: index % 2 === 0 ? "Ajustement automatique" : "—",
        });
      }
    });

    return typeHistorique
      ? lignes.filter((ligne) => ligne.type === typeHistorique)
      : lignes;
  }, [typeHistorique]);

  const soldeTotal = (employe) =>
    TYPES.reduce((total, type) => {
      const valeur = employe.banques[type];
      return total + valeur.accorde - valeur.utilise;
    }, 0);

  const ouvrirModification = () => {
    if (!selection) return;

    setFormBanques({
      Vacances: selection.banques.Vacances.accorde,
      "Temps en banque": selection.banques["Temps en banque"].accorde,
      "Heures accumulées": selection.banques["Heures accumulées"].accorde,
      Maladie: selection.banques.Maladie.accorde,
    });

    setModalOuverte(true);
  };

  const enregistrerBanques = (event) => {
    event.preventDefault();
    if (!selection) return;

    setEmployes((liste) =>
      liste.map((employe) => {
        if (employe.id !== selection.id) return employe;

        return {
          ...employe,
          banques: {
            Vacances: {
              ...employe.banques.Vacances,
              accorde: Number(formBanques.Vacances || 0),
            },
            "Temps en banque": {
              ...employe.banques["Temps en banque"],
              accorde: Number(formBanques["Temps en banque"] || 0),
            },
            "Heures accumulées": {
              ...employe.banques["Heures accumulées"],
              accorde: Number(formBanques["Heures accumulées"] || 0),
            },
            Maladie: {
              ...employe.banques.Maladie,
              accorde: Number(formBanques.Maladie || 0),
            },
          },
        };
      })
    );

    setModalOuverte(false);
  };

  return (
    <div className="banks-page">
      <div className="banks-filters">
        <label className="search-field">
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
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="banks-layout">
        <aside className="banks-employees">
          {employesFiltres.map((employe) => {
            const total = soldeTotal(employe);

            return (
              <button
                type="button"
                key={employe.id}
                className={selection?.id === employe.id ? "active" : ""}
                onClick={() => setSelectionId(employe.id)}
              >
                <div>
                  <strong>{employe.nom}</strong>
                  <span>
                    {employe.metier} · {employe.equipe}
                  </span>
                </div>

                <div className="employee-bank-total">
                  <small>Solde total</small>
                  <b className={total < 0 ? "negative" : ""}>{total} h</b>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="banks-detail">
          <div className="banks-detail__header">
            <div>
              <h2>{selection?.nom}</h2>
              <p>
                {selection?.metier} · {selection?.equipe}
              </p>
            </div>

            <button
              type="button"
              className="edit-button"
              onClick={ouvrirModification}
            >
              <Edit3 size={16} />
              Modifier les banques
            </button>
          </div>

          {selection && (
            <>
              <div className="bank-cards-grid">
                {TYPES.map((type) => (
                  <CarteBanque
                    key={type}
                    titre={type}
                    donnees={selection.banques[type]}
                  />
                ))}
              </div>

              <div className="history-heading">
                <h3>Historique des mouvements</h3>

                <select
                  value={typeHistorique}
                  onChange={(event) => setTypeHistorique(event.target.value)}
                >
                  <option value="">Tous les types</option>
                  {TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Heures</th>
                      <th>Commentaire</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historique.map((ligne) => (
                      <tr key={ligne.id}>
                        <td>{ligne.date}</td>
                        <td>{ligne.type}</td>
                        <td>{ligne.heures} h</td>
                        <td>{ligne.commentaire}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {modalOuverte && selection && (
        <div className="modal-backdrop">
          <form className="employee-modal bank-edit-modal" onSubmit={enregistrerBanques}>
            <div className="employee-modal__header">
              <div>
                <h2>Modifier les banques</h2>
                <p>{selection.nom}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOuverte(false)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="employee-modal__body">
              <div className="form-grid bank-edit-grid">
                <label className="form-field">
                  <span>Vacances accordées</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formBanques.Vacances}
                    onChange={(event) =>
                      setFormBanques((actuel) => ({
                        ...actuel,
                        Vacances: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Temps en banque</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formBanques["Temps en banque"]}
                    onChange={(event) =>
                      setFormBanques((actuel) => ({
                        ...actuel,
                        "Temps en banque": event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Heures accumulées</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formBanques["Heures accumulées"]}
                    onChange={(event) =>
                      setFormBanques((actuel) => ({
                        ...actuel,
                        "Heures accumulées": event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Maladie</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formBanques.Maladie}
                    onChange={(event) =>
                      setFormBanques((actuel) => ({
                        ...actuel,
                        Maladie: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="employee-modal__footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setModalOuverte(false)}
              >
                Annuler
              </button>

              <button type="submit" className="primary-button">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}