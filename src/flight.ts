import type { Flight, Occupancy } from "./types";

export function localDay(value: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions,
) {
  return value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat("es-PE", options).format(new Date(value))
    : "—";
}
export const time = (value: string | null) =>
  formatDate(value, { hour: "2-digit", minute: "2-digit" });
export const day = (value: string | null) =>
  formatDate(value, { day: "2-digit", month: "short" });
export function statusInfo(status: string | null): [string, string] {
  const names: Record<string, [string, string]> = {
    SCHEDULED: ["Programado", ""],
    PROGRAMADO: ["Programado", ""],
    BOARDING: ["Embarcando", "success"],
    DEPARTED: ["Despegó", "success"],
    IN_FLIGHT: ["En vuelo", "success"],
    LANDED: ["Aterrizó", "success"],
    ARRIVED: ["Llegó", "success"],
    DELAYED: ["Retrasado", "warning"],
    RETRASADO: ["Retrasado", "warning"],
    CANCELLED: ["Cancelado", "danger"],
    CANCELED: ["Cancelado", "danger"],
    CANCELADO: ["Cancelado", "danger"],
  };
  return (
    names[(status ?? "").trim().toUpperCase().replaceAll(" ", "_")] ?? [
      status || "Sin estado",
      "",
    ]
  );
}
export function demoData(): { flights: Flight[]; occupancy: Occupancy[] } {
  const today = localDay(new Date());
  const rows: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string | null,
    number,
    number,
  ][] = [
    [
      "LA 2041",
      "LATAM Airlines",
      "LIM",
      "CUZ",
      "07:20",
      "08:45",
      "ARRIVED",
      "A04",
      144,
      160,
    ],
    [
      "H2 5102",
      "SKY Airline",
      "LIM",
      "AQP",
      "09:15",
      "10:50",
      "DEPARTED",
      "A08",
      126,
      150,
    ],
    [
      "JA 7031",
      "JetSMART",
      "LIM",
      "PIU",
      "11:40",
      "13:10",
      "BOARDING",
      "B02",
      162,
      180,
    ],
    [
      "LA 2380",
      "LATAM Airlines",
      "LIM",
      "BOG",
      "12:10",
      "15:25",
      "DELAYED",
      "B06",
      152,
      180,
    ],
    [
      "CM 492",
      "Copa Airlines",
      "LIM",
      "PTY",
      "14:30",
      "18:05",
      "SCHEDULED",
      "B10",
      120,
      160,
    ],
    [
      "H2 5140",
      "SKY Airline",
      "LIM",
      "TRU",
      "16:45",
      "18:00",
      "SCHEDULED",
      "A03",
      108,
      150,
    ],
    [
      "LA 2468",
      "LATAM Airlines",
      "LIM",
      "SCL",
      "18:20",
      "21:50",
      "SCHEDULED",
      "B04",
      150,
      180,
    ],
    [
      "JA 7050",
      "JetSMART",
      "LIM",
      "CIX",
      "20:00",
      "21:25",
      "CANCELLED",
      null,
      0,
      180,
    ],
  ];
  return {
    flights: rows.map((r, i) => ({
      flightId: i + 1,
      flightCode: r[0],
      airlineName: r[1],
      originIata: r[2],
      destinationIata: r[3],
      scheduledDepartureUtc: new Date(`${today}T${r[4]}:00`).toISOString(),
      scheduledArrivalUtc: new Date(`${today}T${r[5]}:00`).toISOString(),
      flightStatus: r[6],
      departureGate: r[7],
      arrivalGate: null,
      actualDepartureUtc: null,
      actualArrivalUtc: null,
    })),
    occupancy: rows.map((r, i) => ({
      flightId: i + 1,
      ticketsSold: r[8],
      seatCapacity: r[9],
      registrationCode: `DEMO-${i + 1}`,
    })),
  };
}
