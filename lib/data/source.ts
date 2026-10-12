import type { Game, Match, Participant, Sponsor, Station } from "@/lib/types";

export interface DataSource {
  getGames(): Promise<Game[]>;
  getParticipants(gameId?: string): Promise<Participant[]>;
  getStations(gameId?: string): Promise<Station[]>;
  getMatches(gameId?: string): Promise<Match[]>;
  getSponsors(): Promise<Sponsor[]>;

  updateMatchScore(
    matchId: string,
    patch: Pick<Match, "a_series" | "b_series" | "games"> & Partial<Pick<Match, "status">>,
  ): Promise<Match>;
  confirmMatch(matchId: string): Promise<Match>;
  setCheckIn(participantId: string, checkedIn: boolean): Promise<Participant>;
}
