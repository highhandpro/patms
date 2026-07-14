export interface Member {
  id: string;          // E.g., "101"
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  joinedDate: string;  // ISO Date string
  notes?: string;
  isDeleted: boolean;
  nickname?: string;
  textReminders?: boolean;
  emailAnnouncements?: boolean;
  logoUrl?: string;
  cardUrl?: string;
  role?: 'chief-admin' | 'tournament-director' | 'admin' | 'player';
  pin?: string;
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
  rebuys?: number;
  createdAt?: string;       // ISO timestamp for waitlist sorting
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
  payoutPercentages?: number[]; // Percentages for 1st to 10th place
  overridePrizePool?: number;    // Manual prize pool input at the end
  totalAddons?: number;          // Centralized total addons count
  time?: string;
  location?: string;
  startingStack?: string;
  roundLength?: number;
  rebuys?: string;
  lateEntry?: string;
  addonChips?: number;
  maxPlayers: number;
  highHandAmount?: number;
  bubbleAmount?: number;
  flyerUrl?: string;
  flyerType?: 'pdf' | 'image' | null;
  seating?: Record<string, string[]>;
  dealers?: Record<string, string>;
  preassignedDealers?: string[];
  clockState?: {
    currentLevelIndex: number;
    timeRemainingSeconds: number;
    isRunning: boolean;
    lastUpdated: string;
  };
  finalTableTriggered?: boolean;
  foodAmount?: number;
  startingChips?: number;
}

export interface BlindLevel {
  type: 'round' | 'break';
  roundNumber?: number;
  duration: number; // in minutes
  smallBlind?: number;
  bigBlind?: number;
  chipUp?: boolean;
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
  adminPassword?: string;
  blinds?: BlindLevel[];
  colorPalette?: string;
}

export interface PendingApproval {
  id: string;
  type: 'update' | 'guest';
  memberId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  textReminders?: boolean;
  emailAnnouncements?: boolean;
  timestamp: string;
}

export interface DatabaseState {
  members: Member[];
  tournaments: Tournament[];
  seasons: Season[];
  settings: Settings;
  pendingApprovals: PendingApproval[];
}
