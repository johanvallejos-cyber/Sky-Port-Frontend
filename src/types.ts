export interface Session {
  accessToken: string;
  expiresAtUtc: string;
  userId: number;
  username: string;
  role: string;
}

export interface Flight {
  flightId: number | null;
  flightCode: string | null;
  airlineName: string | null;
  originIata: string | null;
  destinationIata: string | null;
  scheduledDepartureUtc: string | null;
  scheduledArrivalUtc: string | null;
  actualDepartureUtc: string | null;
  actualArrivalUtc: string | null;
  flightStatus: string | null;
  departureGate: string | null;
  arrivalGate: string | null;
}

export interface Occupancy {
  flightId: number | null;
  registrationCode: string | null;
  seatCapacity: number | null;
  ticketsSold: number | null;
  occupancyPercent?: number | null;
}
