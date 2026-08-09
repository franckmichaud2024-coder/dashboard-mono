const stats = [
  { label: "Employés actifs", value: "0" },
  { label: "En vacances", value: "0" },
  { label: "Absences aujourd’hui", value: "0" },
  { label: "Actions à suivre", value: "0" },
];

export default function Dashboard() {
  return (
    <>
      <section className="dashboard-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="page-card">
        <h2>Bienvenue dans Expédition</h2>
        <p>
          La structure de l’application est prête. Nous pouvons maintenant construire
          chaque module ensemble, en commençant par la base des employés et le tableau
          de vacances.
        </p>
      </section>
    </>
  );
}
