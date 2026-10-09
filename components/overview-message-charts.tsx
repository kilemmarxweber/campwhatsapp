type ChannelMessageStats = {
  channel: "whatsapp" | "sms";
  completed: number;
  failed: number;
};

function formatCount(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function Donut({
  completed,
  failed,
  accent,
}: {
  completed: number;
  failed: number;
  accent: string;
}) {
  const total = completed + failed;
  const size = 132;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const completedLen =
    total === 0 ? 0 : (completed / total) * circumference;
  const failedLen = total === 0 ? 0 : (failed / total) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
        opacity={0.55}
      />
      {total > 0 ? (
        <>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${completedLen} ${circumference - completedLen}`}
            strokeDashoffset={circumference * 0.25}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--tvs-red)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${failedLen} ${circumference - failedLen}`}
            strokeDashoffset={circumference * 0.25 - completedLen}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </>
      ) : null}
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[var(--tvs-blue-deep)] text-[1.35rem] font-semibold"
        style={{ fontSize: "1.35rem", fontWeight: 600 }}
      >
        {formatCount(total)}
      </text>
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: "0.7rem", fill: "var(--fg-muted)" }}
      >
        messages
      </text>
    </svg>
  );
}

function ChannelCard({
  title,
  hint,
  stats,
  accent,
}: {
  title: string;
  hint: string;
  stats: ChannelMessageStats;
  accent: string;
}) {
  const total = stats.completed + stats.failed;
  const successRate =
    total === 0 ? null : Math.round((stats.completed / total) * 100);

  return (
    <div className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
      <Donut
        completed={stats.completed}
        failed={stats.failed}
        accent={accent}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-medium text-[var(--tvs-blue-deep)]">{title}</h3>
            <p className="text-xs text-[var(--fg-muted)]">{hint}</p>
          </div>
          {successRate != null ? (
            <p className="text-sm font-medium" style={{ color: accent }}>
              {successRate}% ok
            </p>
          ) : (
            <p className="text-sm text-[var(--fg-muted)]">Aucune donnée</p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--fg-muted)]">Envoyés / livrés</span>
              <span className="font-medium text-[var(--tvs-blue-deep)]">
                {formatCount(stats.completed)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: total ? `${(stats.completed / total) * 100}%` : "0%",
                  background: accent,
                }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--fg-muted)]">Échoués</span>
              <span className="font-medium text-[var(--tvs-red-deep)]">
                {formatCount(stats.failed)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: total ? `${(stats.failed / total) * 100}%` : "0%",
                  background: "var(--tvs-red)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonBars({
  whatsapp,
  sms,
}: {
  whatsapp: ChannelMessageStats;
  sms: ChannelMessageStats;
}) {
  const max = Math.max(
    whatsapp.completed,
    whatsapp.failed,
    sms.completed,
    sms.failed,
    1,
  );

  const rows = [
    {
      label: "WhatsApp réussis",
      value: whatsapp.completed,
      color: "var(--tvs-blue)",
    },
    {
      label: "WhatsApp échoués",
      value: whatsapp.failed,
      color: "var(--tvs-red)",
    },
    {
      label: "SMS réussis",
      value: sms.completed,
      color: "#1f7a5c",
    },
    {
      label: "SMS échoués",
      value: sms.failed,
      color: "#c45c2a",
    },
  ];

  return (
    <div className="surface p-5">
      <h3 className="font-medium text-[var(--tvs-blue-deep)]">
        Comparaison des messages
      </h3>
      <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
        Réussis (envoyés / livrés / lus) vs échoués
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
            <span className="truncate text-xs text-[var(--fg-muted)]">
              {row.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: row.color,
                  minWidth: row.value > 0 ? "0.35rem" : 0,
                }}
              />
            </div>
            <span className="w-10 text-right text-xs font-medium tabular-nums text-[var(--tvs-blue-deep)]">
              {formatCount(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverviewMessageCharts({
  whatsapp,
  sms,
  title = "Messages WhatsApp & SMS",
  subtitle = "Volume des messages réussis et échoués par canal",
}: {
  whatsapp: ChannelMessageStats;
  sms: ChannelMessageStats;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-[var(--fg-muted)]">{subtitle}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelCard
          title="WhatsApp"
          hint="Canal conversationnel"
          stats={whatsapp}
          accent="var(--tvs-blue)"
        />
        <ChannelCard
          title="SMS"
          hint="Canal Infobip"
          stats={sms}
          accent="#1f7a5c"
        />
      </div>
      <ComparisonBars whatsapp={whatsapp} sms={sms} />
    </section>
  );
}
