export interface Member {
  id: string;          // E.g., "PA-001"
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  joinedDate: string;  // ISO Date string
  notes?: string;
  isDeleted: boolean;
}

export interface TournamentEntry {
  memberId: string;
  hasBuyIn: boolean;
  hasAddon: boolean;
  hasDealerAppreciation: boolean;
  eliminatedAt?: string;    // ISO timestamp
  eliminatedBy?: string;    // Member ID of who eliminated them
  finishPosition?: number;  // 1, 2, 3...
  payoutEarned: number;
  bountiesCollected: number;
  pointsEarned: number;
}

export interface Tournament {
  id: string;
  seasonId: string;
  date: string;         // YYYY-MM-DD
  name: string;
  status: 'draft' | 'active' | 'completed';
  
  // Financial Rules
  buyInAmount: number;
  addonAmount: number;
  bountyAmount: number;
  dealerAppreciationAmount: number;
  
  entries: TournamentEntry[];
  
  // Totals (Cached/calculated upon finalization or dynamically)
  totalPrizePool: number;
  totalBountyPool: number;
  totalDealerAppreciation: number;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Settings {
  defaultBuyIn: number;
  defaultAddon: number;
  defaultBounty: number;
  defaultDealerAppreciation: number;
  pointsBaseAttendance: number;
  maxPlayersPerTable: number;
}

export interface DatabaseState {
  members: Member[];
  tournaments: Tournament[];
  seasons: Season[];
  settings: Settings;
}
