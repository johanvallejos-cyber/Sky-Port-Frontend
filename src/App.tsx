import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Clock3,
  LayoutDashboard,
  Plane,
  RefreshCw,
} from "lucide-react";
import { ApiError, request } from "./api";
import { day, demoData, localDay, statusInfo, time } from "./flight";
import type { Flight, Occupancy, Session } from "./types";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const number = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });
type Data = {
  flights: Flight[];
  occupancy: Occupancy[] | null;
  updatedAt: string;
};
function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <Plane size={25} aria-hidden="true" />
      </span>
      SkyPort
    </div>
  );
}
function Badge({ status }: { status: string | null }) {
  const [label, tone] = statusInfo(status);
  return <span className={`badge ${tone}`}>{label}</span>;
}
function Login({
  onLogin,
  onDemo,
  notice,
}: {
  onLogin: (session: Session) => void;
  onDemo: () => void;
  notice: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const session = await request<Session>("auth/login", undefined, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (
        !session.accessToken ||
        !(new Date(session.expiresAtUtc).getTime() > Date.now())
      )
        throw new Error("El servidor devolvió una sesión inválida.");
      setPassword("");
      onLogin(session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="login-layout">
      <div className="login-story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow">CENTRO DE OPERACIONES AEROPORTUARIAS</span>
          <h1>
            Cada vuelo.
            <br />
            Cada detalle.
            <br />
            Todo conectado.
          </h1>
          <p>
            Una vista clara de tus operaciones, desde la primera salida hasta el
            último aterrizaje.
          </p>
          <div className="runway" aria-hidden="true">
            <span>
              <Plane size={64} />
            </span>
          </div>
        </div>
        <p className="story-footer">Control en tierra. Confianza en el aire.</p>
      </div>
      <main className="login-main">
        <div className="login-card">
          <span className="eyebrow">BIENVENIDO A SKYPORT</span>
          <h2>Tu operación empieza aquí</h2>
          <p className="muted">Ingresa con tu cuenta para acceder al panel.</p>
          <form id="login-form" onSubmit={submit}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              autoComplete="username"
              placeholder="Tu nombre de usuario"
              required
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input
                id="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={
                  visible ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="form-error" role="alert">
              {error || notice}
            </p>
            <button
              className="button primary full"
              type="submit"
              disabled={pending}
            >
              {pending ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
          <div className="divider">
            <span>EXPLORA LA INTERFAZ</span>
          </div>
          <button
            id="demo-button"
            className="button secondary full"
            disabled={pending}
            onClick={onDemo}
          >
            Ver demostración
          </button>
          <p className="login-note">
            Explora el panel con datos ficticios, sin conectar con el servidor
            ni modificar registros.
          </p>
        </div>
      </main>
    </section>
  );
}

function FlightDetail({
  flight,
  occupancy,
  close,
}: {
  flight: Flight;
  occupancy?: Occupancy;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current!.open) dialog.current!.showModal();
  }, []);
  const fullTime = (value: string | null) =>
    value ? `${day(value)} · ${time(value)}` : "No registrada";
  return (
    <dialog
      ref={dialog}
      onCancel={close}
      onClose={close}
      aria-labelledby="detail-title"
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">DETALLE DEL VUELO</span>
          <h2 id="detail-title">{flight.flightCode || "Sin código"}</h2>
        </div>
        <button className="button secondary" onClick={close}>
          Cerrar
        </button>
      </div>
      <div className="detail-route">
        <strong>{flight.originIata || "—"}</strong>
        <Plane aria-hidden="true" />
        <strong>{flight.destinationIata || "—"}</strong>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Aerolínea</dt>
          <dd>{flight.airlineName || "—"}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <Badge status={flight.flightStatus} />
          </dd>
        </div>
        <div>
          <dt>Salida programada</dt>
          <dd>{fullTime(flight.scheduledDepartureUtc)}</dd>
        </div>
        <div>
          <dt>Llegada programada</dt>
          <dd>{fullTime(flight.scheduledArrivalUtc)}</dd>
        </div>
        <div>
          <dt>Salida real</dt>
          <dd>{fullTime(flight.actualDepartureUtc)}</dd>
        </div>
        <div>
          <dt>Llegada real</dt>
          <dd>{fullTime(flight.actualArrivalUtc)}</dd>
        </div>
        <div>
          <dt>Puerta de salida</dt>
          <dd>{flight.departureGate || "Por asignar"}</dd>
        </div>
        <div>
          <dt>Puerta de llegada</dt>
          <dd>{flight.arrivalGate || "Por asignar"}</dd>
        </div>
        <div>
          <dt>Matrícula</dt>
          <dd>{occupancy?.registrationCode || "Sin datos"}</dd>
        </div>
        <div>
          <dt>Boletos / Capacidad</dt>
          <dd>
            {occupancy?.ticketsSold != null && occupancy.seatCapacity != null
              ? `${occupancy.ticketsSold} / ${occupancy.seatCapacity}`
              : "Sin datos"}
          </dd>
        </div>
      </dl>
      <p className="detail-note">Horarios mostrados en {timezone}.</p>
    </dialog>
  );
}

function Dashboard({
  data,
  onFlights,
}: {
  data: Data | null;
  onFlights: () => void;
}) {
  const today =
    data?.flights.filter(
      (f) => localDay(f.scheduledDepartureUtc) === localDay(new Date()),
    ) ?? [];
  const count = (statuses: string[]) =>
    today.filter((f) =>
      statuses.includes((f.flightStatus ?? "").trim().toUpperCase()),
    ).length;
  const delayed = today.filter(
    (f) => statusInfo(f.flightStatus)[1] === "warning",
  ).length;
  const departed = today.filter(
    (f) =>
      f.actualDepartureUtc ||
      ["DEPARTED", "IN_FLIGHT", "LANDED", "ARRIVED"].includes(
        (f.flightStatus ?? "").toUpperCase(),
      ),
  ).length;
  const ids = new Set(today.map((f) => f.flightId));
  const capacityRows =
    data?.occupancy?.filter(
      (o) =>
        o.flightId != null &&
        ids.has(o.flightId) &&
        o.seatCapacity != null &&
        o.seatCapacity > 0 &&
        o.ticketsSold != null,
    ) ?? [];
  const capacity = capacityRows.reduce(
    (sum, row) => sum + row.seatCapacity!,
    0,
  );
  const sold = capacityRows.reduce((sum, row) => sum + row.ticketsSold!, 0);
  const cards = [
    {
      title: "Vuelos de hoy",
      value: data ? today.length : "—",
      note: "Salidas programadas para hoy",
      icon: Plane,
    },
    {
      title: "Vuelos con salida",
      value: data ? departed : "—",
      note: "Despegados, en vuelo o llegados",
      icon: ArrowUpRight,
    },
    {
      title: "Vuelos retrasados",
      value: data ? delayed : "—",
      note: "Según el estado registrado",
      icon: Clock3,
    },
    {
      title: "Ocupación",
      value: capacity ? `${number.format((sold / capacity) * 100)}%` : "—",
      note: capacity
        ? `${capacityRows.length} vuelos con datos de capacidad`
        : "Sin datos de capacidad para hoy",
      icon: ChartNoAxesColumnIncreasing,
    },
  ];
  const statuses = [
    {
      label: "Programados",
      value: count(["SCHEDULED", "PROGRAMADO"]),
      tone: "",
    },
    { label: "Embarcando", value: count(["BOARDING"]), tone: "success" },
    { label: "Retrasados", value: delayed, tone: "warning" },
  ];
  return (
    <section aria-label="Resumen de hoy">
      <div className="stats-grid">
        {cards.map((card) => (
          <article className="stat-card" key={card.title}>
            <div className="stat-top">
              <span>{card.title}</span>
              <span className="stat-icon">
                <card.icon size={19} aria-hidden="true" />
              </span>
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-note">{card.note}</div>
          </article>
        ))}
      </div>
      <div className="overview-grid">
        <section className="traffic-card">
          <div>
            <span className="eyebrow">PANORAMA DEL DÍA</span>
            <h2>
              El próximo destino
              <br />
              empieza aquí.
            </h2>
            <p>
              {!data
                ? "Consulta las próximas salidas de tu operación."
                : today.length
                  ? `${today.length} vuelos en el tablero de hoy. Consulta cada ruta y acompaña la operación.`
                  : "No hay salidas registradas para hoy. Explora otras fechas en el tablero."}
            </p>
            <button className="button light" onClick={onFlights}>
              Consultar vuelos
            </button>
          </div>
          <div className="radar" aria-hidden="true">
            <span>
              <Plane size={65} />
            </span>
            <i />
            <b />
          </div>
        </section>
        <section className="panel status-panel">
          <div className="section-heading">
            <h2>Estado de la operación</h2>
            <span className="muted">Hoy</span>
          </div>
          {statuses.map((status) => (
            <div className="status-row" key={status.label}>
              <span>{status.label}</span>
              <div className="progress-track">
                <div
                  className={`progress-fill ${status.tone}`}
                  style={{
                    width: `${today.length ? (status.value / today.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{data ? status.value : "—"}</strong>
            </div>
          ))}
          <p className="card-footnote">
            Según el estado registrado en el tablero de vuelos.
          </p>
        </section>
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [notice, setNotice] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<"dashboard" | "flights">("dashboard");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(localDay(new Date()));
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Flight | null>(null);
  const active = demo || !!session;
  const logout = useCallback((message = "") => {
    setSession(null);
    setDemo(false);
    setData(null);
    setSelected(null);
    setError("");
    setNotice(message);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => logout("Tu sesión venció. Inicia sesión nuevamente."),
      Math.max(0, new Date(session.expiresAtUtc).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, logout]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (demo) {
          setData({ ...demoData(), updatedAt: new Date().toISOString() });
          return;
        }
        const results = await Promise.allSettled([
          request<Flight[]>("flight-board", session!.accessToken, {
            signal: controller.signal,
          }),
          request<Occupancy[]>("flight-occupancy", session!.accessToken, {
            signal: controller.signal,
          }),
        ]);
        if (controller.signal.aborted) return;
        if (
          results.some(
            (result) =>
              result.status === "rejected" &&
              result.reason instanceof ApiError &&
              result.reason.status === 401,
          )
        ) {
          logout("Tu sesión venció. Inicia sesión nuevamente.");
          return;
        }
        if (results[0].status === "rejected") throw results[0].reason;
        const flights = results[0].value;
        const occupancy =
          results[1].status === "fulfilled" ? results[1].value : null;
        if (
          !Array.isArray(flights) ||
          (occupancy !== null && !Array.isArray(occupancy))
        )
          throw new Error(
            "La respuesta de la API no tiene el formato esperado.",
          );
        setData({
          flights: flights
            .slice()
            .sort((a, b) =>
              (a.scheduledDepartureUtc || "").localeCompare(
                b.scheduledDepartureUtc || "",
              ),
            ),
          occupancy,
          updatedAt: new Date().toISOString(),
        });
        if (occupancy === null)
          setError(
            "Los vuelos están disponibles, pero no se pudo consultar la ocupación. Intenta actualizar.",
          );
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            `${err instanceof Error ? err.message : "No se pudo cargar el tablero."} Si hay datos visibles, corresponden a la última consulta exitosa.`,
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [active, demo, session, revision, logout]);
  const filtered = useMemo(
    () =>
      (data?.flights ?? []).filter(
        (f) =>
          (!date || localDay(f.scheduledDepartureUtc) === date) &&
          (!status || f.flightStatus === status) &&
          [f.flightCode, f.airlineName, f.originIata, f.destinationIata]
            .join(" ")
            .toLocaleLowerCase("es")
            .includes(search.trim().toLocaleLowerCase("es")),
      ),
    [data, date, status, search],
  );
  const statuses = [
    ...new Set(
      data?.flights
        .map((f) => f.flightStatus)
        .filter((s): s is string => !!s) ?? [],
    ),
  ].sort();
  function enter(next: Session | null) {
    setSession(next);
    setDemo(!next);
    setData(null);
    setView("dashboard");
    setDate(localDay(new Date()));
    setSearch("");
    setStatus("");
    setNotice("");
  }
  if (!active)
    return <Login onLogin={enter} onDemo={() => enter(null)} notice={notice} />;
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand />
        <span className="sidebar-caption">ESPACIO DE TRABAJO</span>
        <nav aria-label="Navegación principal">
          {(
            [
              { key: "dashboard", label: "Resumen", icon: LayoutDashboard },
              { key: "flights", label: "Vuelos", icon: Plane },
            ] as const
          ).map((item) => (
            <button
              className={`nav-item ${view === item.key ? "active" : ""}`}
              aria-current={view === item.key ? "page" : undefined}
              key={item.key}
              onClick={() => setView(item.key)}
            >
              <span>
                <item.icon size={20} aria-hidden="true" />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="airport-mark">SP</div>
          <div>
            <strong>SkyPort Manager</strong>
            <small>Operaciones aeroportuarias</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Operaciones <span>/</span>
            <strong>{view === "dashboard" ? "Resumen" : "Vuelos"}</strong>
          </div>
          <div className="user-area">
            <span className="connection-label">
              {demo ? "Vista de demostración" : "Sesión con la API"}
            </span>
            <span className="avatar">
              {(session?.username || "SP").slice(0, 2).toUpperCase()}
            </span>
            <div className="user-info">
              <strong>{session?.username || "Visitante"}</strong>
              <small>{session?.role || "Demostración"}</small>
            </div>
            <button className="text-button" onClick={() => logout()}>
              Salir
            </button>
          </div>
        </header>
        <main className="content">
          {demo && (
            <div className="demo-notice">
              Estás en modo demostración · Los vuelos y las cifras son
              ficticios.
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">CONTROL AEROPORTUARIO</span>
              <h1>
                {view === "dashboard"
                  ? "Resumen de operaciones"
                  : "Gestión de vuelos"}
              </h1>
              <p className="muted">
                {view === "dashboard"
                  ? "Tu tráfico aéreo, en una sola vista."
                  : "Consulta rutas, horarios y estados de tu operación."}
              </p>
            </div>
            <button
              className="button secondary refresh-button"
              onClick={() => setRevision((r) => r + 1)}
              disabled={loading}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Actualizar datos
            </button>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          {loading && (
            <p className="loading" role="status">
              Cargando operaciones…
            </p>
          )}
          {view === "dashboard" && (
            <Dashboard data={data} onFlights={() => setView("flights")} />
          )}
          <section
            className="panel flight-panel"
            aria-labelledby="flights-title"
            aria-busy={loading}
          >
            <div className="section-heading">
              <div>
                <h2 id="flights-title">Tablero de vuelos</h2>
                <p className="muted">Horarios en tu zona local · {timezone}</p>
              </div>
              <span className="count-label">
                {filtered.length} {filtered.length === 1 ? "vuelo" : "vuelos"}
              </span>
            </div>
            <div className="filters">
              <label className="search-label">
                <span className="sr-only">
                  Buscar vuelo, aerolínea o aeropuerto
                </span>
                <input
                  type="search"
                  placeholder="Buscar vuelo, aerolínea o aeropuerto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Fecha de salida</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Estado del vuelo</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusInfo(s)[0]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setSearch("");
                  setDate("");
                  setStatus("");
                }}
              >
                Limpiar filtros
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vuelo / Aerolínea</th>
                    <th>Ruta</th>
                    <th>Salida</th>
                    <th>Llegada</th>
                    <th>Puerta</th>
                    <th>Estado</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => (
                    <tr key={`${f.flightId}-${i}`}>
                      <td>
                        <strong>{f.flightCode || "Sin código"}</strong>
                        <small>{f.airlineName || "Sin aerolínea"}</small>
                      </td>
                      <td>
                        <div className="route">
                          {f.originIata || "—"}
                          <span aria-label="a">—</span>
                          {f.destinationIata || "—"}
                        </div>
                      </td>
                      <td>
                        <strong>{time(f.scheduledDepartureUtc)}</strong>
                        <small>{day(f.scheduledDepartureUtc)}</small>
                      </td>
                      <td>
                        <strong>{time(f.scheduledArrivalUtc)}</strong>
                        <small>{day(f.scheduledArrivalUtc)}</small>
                      </td>
                      <td>{f.departureGate || "Por asignar"}</td>
                      <td>
                        <Badge status={f.flightStatus} />
                      </td>
                      <td>
                        <button
                          className="text-button detail-button"
                          aria-label={`Ver detalle de ${f.flightCode || "vuelo"}`}
                          onClick={() => setSelected(f)}
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && !loading && (
              <div className="empty-state">
                <Plane size={30} aria-hidden="true" />
                <h3>
                  {data ? "Sin vuelos para mostrar" : "Tablero no disponible"}
                </h3>
                <p>
                  {data
                    ? "Prueba otra fecha o cambia los filtros de búsqueda."
                    : "Actualiza los datos para intentar consultar la API."}
                </p>
              </div>
            )}
            <footer className="table-footer">
              <span>
                {data
                  ? `Actualizado a las ${time(data.updatedAt)}`
                  : "Sin actualizar"}
              </span>
              <span>SkyPort · Centro de operaciones</span>
            </footer>
          </section>
        </main>
        <footer className="workspace-footer">
          SkyPort Manager<span>Una operación más conectada.</span>
        </footer>
      </div>
      {selected && (
        <FlightDetail
          flight={selected}
          occupancy={data?.occupancy?.find(
            (o) => o.flightId != null && o.flightId === selected.flightId,
          )}
          close={() => setSelected(null)}
        />
      )}
    </div>
  );
}
