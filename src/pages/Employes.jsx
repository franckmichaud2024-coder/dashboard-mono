import { useEffect, useMemo, useState } from "react";
import { EMPLOYES_INITIAUX, METIERS } from "../data/employees";

import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { notifyLocalStateChange } from "../services/stateBridge";

const STORAGE_KEY = "dashboard-mono-employes-v1";

const JOURS = [
  ["lundi", "Lundi"],
  ["mardi", "Mardi"],
  ["mercredi", "Mercredi"],
  ["jeudi", "Jeudi"],
  ["vendredi", "Vendredi"],
  ["samedi", "Samedi"],
  ["dimanche", "Dimanche"],
];

const FORMULAIRE_VIDE = {
  id: "",
  nom: "",
  metier: "Expédition jour",
  dateEmbauche: "",
  disponible: true,
  notes: "",
  horaire: {
    lundi: "",
    mardi: "",
    mercredi: "",
    jeudi: "",
    vendredi: "",
    samedi: "",
    dimanche: "",
  },
  heuresSemaine: 40,
  joursSemaine: 5,
};

const formatDate = (value) => {
  if (!value) return "—";
  const [annee, mois, jour] = value.split("-");
  return `${jour}/${mois}/${annee}`;
};

function loadEmployees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : EMPLOYES_INITIAUX;
  } catch {
    return EMPLOYES_INITIAUX;
  }
}

export default function Employes() {
  const [employes, setEmployes] = useState(loadEmployees);
  const [recherche, setRecherche] = useState("");
  const [filtreMetier, setFiltreMetier] = useState("");
  const [filtreDisponibilite, setFiltreDisponibilite] = useState("");
  const [tri, setTri] = useState("az");
  const [modalOuverte, setModalOuverte] = useState(false);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employes));
    notifyLocalStateChange(STORAGE_KEY);
  }, [employes]);

  const employesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    const liste = employes.filter((employe) => {
      const correspondRecherche =
        !terme ||
        [employe.nom, employe.metier, employe.notes, employe.dateEmbauche]
          .join(" ")
          .toLowerCase()
          .includes(terme);

      const correspondMetier =
        !filtreMetier || employe.metier === filtreMetier;

      const correspondDisponibilite =
        !filtreDisponibilite ||
        (filtreDisponibilite === "oui" && employe.disponible) ||
        (filtreDisponibilite === "non" && !employe.disponible);

      return (
        correspondRecherche &&
        correspondMetier &&
        correspondDisponibilite
      );
    });

    return [...liste].sort((a, b) =>
      tri === "az"
        ? a.nom.localeCompare(b.nom, "fr")
        : b.nom.localeCompare(a.nom, "fr")
    );
  }, [employes, recherche, filtreMetier, filtreDisponibilite, tri]);

  const ouvrirAjout = () => {
    setFormulaire({
      ...FORMULAIRE_VIDE,
      id: "",
      horaire: { ...FORMULAIRE_VIDE.horaire },
    });
    setModalOuverte(true);
  };

  const ouvrirModification = (employe) => {
    setFormulaire({
      ...employe,
      horaire: { ...employe.horaire },
    });
    setModalOuverte(true);
  };

  const fermerModal = () => {
    setModalOuverte(false);
    setFormulaire(FORMULAIRE_VIDE);
  };

  const enregistrer = (event) => {
    event.preventDefault();

    if (!formulaire.nom.trim()) return;

    if (formulaire.id) {
      setEmployes((liste) =>
        liste.map((employe) =>
          employe.id === formulaire.id
            ? {
                ...formulaire,
                nom: formulaire.nom.trim(),
                notes: formulaire.notes.trim(),
                heuresSemaine: Number(formulaire.heuresSemaine || 0),
                joursSemaine: Number(formulaire.joursSemaine || 0),
              }
            : employe
        )
      );
    } else {
      const nouvelId = `EMP-${String(employes.length + 1).padStart(3, "0")}`;
      setEmployes((liste) => [
        ...liste,
        {
          ...formulaire,
          id: nouvelId,
          nom: formulaire.nom.trim(),
          notes: formulaire.notes.trim(),
          equipe: formulaire.metier.replace('Expédition ', '').replace('Entrepôt sec', 'Entrepôt').replace(/^./, (c) => c.toUpperCase()),
          heuresSemaine: Number(formulaire.heuresSemaine || 0),
          joursSemaine: Number(formulaire.joursSemaine || 0),
        },
      ]);
    }

    fermerModal();
  };

  const supprimer = (id) => {
    const confirme = window.confirm("Supprimer cet employé?");
    if (!confirme) return;
    setEmployes((liste) => liste.filter((employe) => employe.id !== id));
  };

  const reinitialiserFiltres = () => {
    setRecherche("");
    setFiltreMetier("");
    setFiltreDisponibilite("");
    setTri("az");
  };

  return (
    <div className="employees-page employees-page--pro">
      <section className="employees-summary">
        <article className="summary-card">
          <Users size={22} />
          <div>
            <span>Employés affichés</span>
            <strong>{employesFiltres.length}</strong>
          </div>
        </article>

        <article className="summary-card">
          <Clock3 size={22} />
          <div>
            <span>Heures planifiées</span>
            <strong>
              {employesFiltres.reduce(
                (total, employe) => total + Number(employe.heuresSemaine || 0),
                0
              )}
            </strong>
          </div>
        </article>

        <article className="summary-card">
          <CalendarDays size={22} />
          <div>
            <span>Année</span>
            <strong>2026</strong>
          </div>
        </article>
      </section>

      <section className="page-card employees-card employees-card--pro">
        <div className="employees-heading">
          <div>
            <h2>Gestion des employés</h2>
            <p>
              Ajout, modification, filtre et horaire hebdomadaire complet des employés.
            </p>
          </div>

          <button className="primary-button" type="button" onClick={ouvrirAjout}>
            <Plus size={18} />
            Ajouter
          </button>
        </div>

        <div className="employees-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              type="search"
              placeholder="Rechercher un employé..."
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
            />
          </label>

          <select
            value={filtreMetier}
            onChange={(event) => setFiltreMetier(event.target.value)}
          >
            <option value="">Tous les métiers</option>
            {METIERS.map((metier) => (
              <option key={metier} value={metier}>
                {metier}
              </option>
            ))}
          </select>

          <select
            value={filtreDisponibilite}
            onChange={(event) => setFiltreDisponibilite(event.target.value)}
          >
            <option value="">Toutes disponibilités</option>
            <option value="oui">Disponible</option>
            <option value="non">Non disponible</option>
          </select>

          <select value={tri} onChange={(event) => setTri(event.target.value)}>
            <option value="az">Nom A → Z</option>
            <option value="za">Nom Z → A</option>
          </select>

          <button
            type="button"
            className="secondary-button"
            onClick={reinitialiserFiltres}
          >
            Réinitialiser
          </button>
        </div>

        <div className="employees-count">
          <strong>{employesFiltres.length}</strong> employés affichés sur{" "}
          {employes.length}
        </div>

        <div className="employees-table-wrapper">
          <table className="employees-list-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Métier</th>
                <th>Date d'embauche</th>
                <th>Disponible</th>
                <th>Lundi</th>
                <th>Mardi</th>
                <th>Mercredi</th>
                <th>Jeudi</th>
                <th>Vendredi</th>
                <th>Samedi</th>
                <th>Dimanche</th>
                <th>Heures/semaine</th>
                <th>Jours/semaine</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {employesFiltres.map((employe) => (
                <tr key={employe.id}>
                  <td className="employee-name-cell">{employe.nom}</td>
                  <td>{employe.metier}</td>
                  <td>{formatDate(employe.dateEmbauche)}</td>
                  <td>
                    <span
                      className={`availability-badge ${
                        employe.disponible
                          ? "availability-badge--yes"
                          : "availability-badge--no"
                      }`}
                    >
                      {employe.disponible ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="schedule-display-cell">{employe.horaire?.lundi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.mardi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.mercredi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.jeudi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.vendredi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.samedi || "—"}</td>
                  <td className="schedule-display-cell">{employe.horaire?.dimanche || "—"}</td>
                  <td>{employe.heuresSemaine}</td>
                  <td>{employe.joursSemaine}</td>
                  <td className="notes-cell">{employe.notes || "—"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => ouvrirModification(employe)}
                      >
                        <Edit3 size={16} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => supprimer(employe.id)}
                        aria-label={`Supprimer ${employe.nom}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {employesFiltres.length === 0 && (
                <tr>
                  <td colSpan="15" className="empty-state">
                    Aucun employé ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOuverte && (
        <div className="modal-backdrop" role="presentation">
          <form className="employee-modal" onSubmit={enregistrer}>
            <div className="employee-modal__header">
              <div>
                <h2>
                  {formulaire.id ? "Modifier l’employé" : "Ajouter un employé"}
                </h2>
                <p>
                  Complète la fiche de l’employé et son horaire régulier.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={fermerModal}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="employee-modal__body">
              <div className="form-grid">
                <label className="form-field form-field--wide">
                  <span>Nom</span>
                  <input
                    autoFocus
                    required
                    value={formulaire.nom}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        nom: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Métier</span>
                  <select
                    value={formulaire.metier}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        metier: event.target.value,
                      }))
                    }
                  >
                    {METIERS.map((metier) => (
                      <option key={metier} value={metier}>
                        {metier}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Date d'embauche</span>
                  <input
                    type="date"
                    value={formulaire.dateEmbauche}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        dateEmbauche: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Heures/semaine</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formulaire.heuresSemaine}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        heuresSemaine: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Jours/semaine</span>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={formulaire.joursSemaine}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        joursSemaine: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="checkbox-field form-field--wide">
                  <input
                    type="checkbox"
                    checked={formulaire.disponible}
                    onChange={(event) =>
                      setFormulaire((form) => ({
                        ...form,
                        disponible: event.target.checked,
                      }))
                    }
                  />
                  <span>Employé disponible</span>
                </label>
              </div>

              <div className="schedule-editor">
                <div className="schedule-editor__title">
                  <Clock3 size={18} />
                  <strong>Horaire régulier</strong>
                </div>

                <div className="schedule-grid">
                  {JOURS.map(([jour, libelle]) => (
                    <label className="form-field" key={jour}>
                      <span>{libelle}</span>
                      <input
                        placeholder="Ex. 7H00-15H30"
                        value={formulaire.horaire[jour]}
                        onChange={(event) =>
                          setFormulaire((form) => ({
                            ...form,
                            horaire: {
                              ...form.horaire,
                              [jour]: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="form-field form-field--wide">
                <span>Notes</span>
                <textarea
                  rows="4"
                  placeholder="Notes, restrictions, informations utiles, etc."
                  value={formulaire.notes}
                  onChange={(event) =>
                    setFormulaire((form) => ({
                      ...form,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="employee-modal__footer">
              <button
                type="button"
                className="secondary-button"
                onClick={fermerModal}
              >
                Annuler
              </button>
              <button type="submit" className="primary-button">
                <Check size={18} />
                {formulaire.id
                  ? "Enregistrer les modifications"
                  : "Ajouter l’employé"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}