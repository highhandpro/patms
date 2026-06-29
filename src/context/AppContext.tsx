import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Member, Tournament, Season, Settings, DatabaseState, TournamentEntry } from '../types';

interface AppContextProps {
  state: DatabaseState;
  activeSeason: Season | null;
  addMember: (firstName: string, lastName: string, phone: string, email: string, notes?: string) => void;
  updateMember: (id: string, updated: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addSeason: (name: string, startDate: string, endDate: string, isActive: boolean) => void;
  updateSeason: (id: string, updated: Partial<Season>) => void;
  setActiveSeason: (id: string) => void;
  deleteSeason: (id: string) => void;
  createTournament: (name: string, date: string, buyIn: number, addon: number, bounty: number, dealerApp: number) => string;
  updateTournament: (id: string, updated: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  registerPlayer: (tournamentId: string, memberId: string) => void;
  unregisterPlayer: (tournamentId: string, memberId: string) => void;
  toggleEntryAddon: (tournamentId: string, memberId: string) => void;
  toggleEntryDealerApp: (tournamentId: string, memberId: string) => void;
  eliminatePlayer: (tournamentId: string, memberId: string, eliminatedBy?: string) => void;
  undoElimination: (tournamentId: string, memberId: string) => void;
  finalizeTournament: (tournamentId: string) => void;
  reopenTournament: (tournamentId: string) => void;
  updateSettings: (settings: Settings) => void;
  importDatabase: (jsonString: string) => boolean;
  exportDatabase: () => string;
  resetDatabaseToDefault: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Initial default settings
const defaultSettings: Settings = {
  defaultBuyIn: 20,
  defaultAddon: 10,
  defaultBounty: 5,
  defaultDealerAppreciation: 5,
  pointsBaseAttendance: 2,
  maxPlayersPerTable: 8
};

// Initial default mock database to make the app look stunning right away
const defaultMockData: DatabaseState = {
  members: [
    { id: 'PA-001', firstName: 'John', lastName: 'Doe', phone: '(555) 010-0001', email: 'john.doe@poker.com', joinedDate: '2026-01-10', notes: 'Regular player, prefers table 1', isDeleted: false },
    { id: 'PA-002', firstName: 'Jane', lastName: 'Smith', phone: '(555) 010-0002', email: 'jane.smith@poker.com', joinedDate: '2026-01-12', notes: 'Dealer volunteer', isDeleted: false },
    { id: 'PA-003', firstName: 'Bob', lastName: 'Johnson', phone: '(555) 010-0003', email: 'bob.j@poker.com', joinedDate: '2026-01-15', notes: '', isDeleted: false },
    { id: 'PA-004', firstName: 'Alice', lastName: 'Williams', phone: '(555) 010-0004', email: 'alice.w@poker.com', joinedDate: '2026-01-20', notes: 'Aggressive player', isDeleted: false },
    { id: 'PA-005', firstName: 'Charlie', lastName: 'Brown', phone: '(555) 010-0005', email: 'charlie.b@poker.com', joinedDate: '2026-02-01', notes: 'Good sport', isDeleted: false },
    { id: 'PA-006', firstName: 'David', lastName: 'Miller', phone: '(555) 010-0006', email: 'david.m@poker.com', joinedDate: '2026-02-05', notes: '', isDeleted: false },
    { id: 'PA-007', firstName: 'Eva', lastName: 'Davis', phone: '(555) 010-0007', email: 'eva.d@poker.com', joinedDate: '2026-02-12', notes: '', isDeleted: false },
    { id: 'PA-008', firstName: 'Frank', lastName: 'Wilson', phone: '(555) 010-0008', email: 'frank.w@poker.com', joinedDate: '2026-02-18', notes: 'Likes to blind-out early', isDeleted: false },
    { id: 'PA-009', firstName: 'Grace', lastName: 'Moore', phone: '(555) 010-0009', email: 'grace.m@poker.com', joinedDate: '2026-02-22', notes: '', isDeleted: false },
    { id: 'PA-010', firstName: 'Henry', lastName: 'Taylor', phone: '(555) 010-0010', email: 'henry.t@poker.com', joinedDate: '2026-03-01', notes: '', isDeleted: false },
    { id: 'PA-011', firstName: 'Ivy', lastName: 'Thomas', phone: '(555) 010-0011', email: 'ivy.t@poker.com', joinedDate: '2026-03-10', notes: '', isDeleted: false },
    { id: 'PA-012', firstName: 'Jack', lastName: 'Anderson', phone: '(555) 010-0012', email: 'jack.a@poker.com', joinedDate: '2026-03-15', notes: 'Always buys the dealer appreciation', isDeleted: false }
  ],
  seasons: [
    { id: 'season-2026', name: 'Season 2026', startDate: '2026-01-01', endDate: '2026-12-31', isActive: true }
  ],
  tournaments: [
    {
      id: 'tour-1',
      seasonId: 'season-2026',
      date: '2026-06-10',
      name: 'Season Kickoff Warmup',
      status: 'completed',
      buyInAmount: 20,
      addonAmount: 10,
      bountyAmount: 5,
      dealerAppreciationAmount: 5,
      totalPrizePool: 340, // 12 buyins ($240) + 10 addons ($100)
      totalBountyPool: 60, // 12 bounties
      totalDealerAppreciation: 60, // 12 dealer apps
      entries: [
        { memberId: 'PA-001', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 1, payoutEarned: 170, bountiesCollected: 3, pointsEarned: 39.6 },
        { memberId: 'PA-002', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 2, payoutEarned: 102, bountiesCollected: 2, pointsEarned: 28.5 },
        { memberId: 'PA-003', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 3, payoutEarned: 68, bountiesCollected: 1, pointsEarned: 23.0 },
        { memberId: 'PA-004', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 4, payoutEarned: 0, bountiesCollected: 2, pointsEarned: 21.3 },
        { memberId: 'PA-005', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 5, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 18.5 },
        { memberId: 'PA-006', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 6, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 17.1 },
        { memberId: 'PA-007', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 7, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 16.1 },
        { memberId: 'PA-008', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 8, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 14.2 },
        { memberId: 'PA-009', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 9, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 13.5 },
        { memberId: 'PA-010', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 10, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 13.9 },
        { memberId: 'PA-011', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 11, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 12.4 },
        { memberId: 'PA-012', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 12, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 12.0 }
      ]
    },
    {
      id: 'tour-2',
      seasonId: 'season-2026',
      date: '2026-06-17',
      name: 'Weekly Bounty Brawl #2',
      status: 'completed',
      buyInAmount: 20,
      addonAmount: 10,
      bountyAmount: 5,
      dealerAppreciationAmount: 5,
      totalPrizePool: 280, // 10 buyins + 8 addons
      totalBountyPool: 50,
      totalDealerAppreciation: 50,
      entries: [
        { memberId: 'PA-004', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 1, payoutEarned: 196, bountiesCollected: 4, pointsEarned: 37.6 },
        { memberId: 'PA-005', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 2, payoutEarned: 84, bountiesCollected: 2, pointsEarned: 26.4 },
        { memberId: 'PA-001', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 3, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 21.3 },
        { memberId: 'PA-006', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 4, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 18.8 },
        { memberId: 'PA-007', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 5, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 16.5 },
        { memberId: 'PA-008', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 6, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 15.9 },
        { memberId: 'PA-009', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 7, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 14.8 },
        { memberId: 'PA-010', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 8, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 13.5 },
        { memberId: 'PA-011', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 9, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 12.3 },
        { memberId: 'PA-012', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 10, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 12.0 }
      ]
    }
  ],
  settings: defaultSettings
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('patms_database');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse database from localStorage, using defaults', e);
      }
    }
    return defaultMockData;
  });

  useEffect(() => {
    localStorage.setItem('patms_database', JSON.stringify(state));
  }, [state]);

  const activeSeason = state.seasons.find(s => s.isActive) || null;

  // Member Management
  const addMember = (firstName: string, lastName: string, phone: string, email: string, notes?: string) => {
    setState(prev => {
      // Find next member number
      const numbers = prev.members.map(m => {
        const match = m.id.match(/PA-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      const nextNum = Math.max(0, ...numbers) + 1;
      const id = `PA-${String(nextNum).padStart(3, '0')}`;

      const newMember: Member = {
        id,
        firstName,
        lastName,
        phone,
        email,
        joinedDate: new Date().toISOString().split('T')[0],
        notes,
        isDeleted: false
      };

      return {
        ...prev,
        members: [...prev.members, newMember]
      };
    });
  };

  const updateMember = (id: string, updated: Partial<Member>) => {
    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, ...updated } : m)
    }));
  };

  const deleteMember = (id: string) => {
    // Soft delete to keep historical records intact
    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, isDeleted: true } : m)
    }));
  };

  // Season Management
  const addSeason = (name: string, startDate: string, endDate: string, isActive: boolean) => {
    const id = `season-${Date.now()}`;
    const newSeason: Season = { id, name, startDate, endDate, isActive };

    setState(prev => {
      let updatedSeasons = prev.seasons;
      if (isActive) {
        updatedSeasons = prev.seasons.map(s => ({ ...s, isActive: false }));
      }
      return {
        ...prev,
        seasons: [...updatedSeasons, newSeason]
      };
    });
  };

  const updateSeason = (id: string, updated: Partial<Season>) => {
    setState(prev => {
      let updatedSeasons = prev.seasons.map(s => s.id === id ? { ...s, ...updated } : s);
      if (updated.isActive) {
        // Force all other seasons to inactive
        updatedSeasons = updatedSeasons.map(s => s.id === id ? s : { ...s, isActive: false });
      }
      return {
        ...prev,
        seasons: updatedSeasons
      };
    });
  };

  const setActiveSeason = (id: string) => {
    setState(prev => ({
      ...prev,
      seasons: prev.seasons.map(s => ({ ...s, isActive: s.id === id }))
    }));
  };

  const deleteSeason = (id: string) => {
    setState(prev => ({
      ...prev,
      seasons: prev.seasons.filter(s => s.id !== id)
    }));
  };

  // Tournament Management
  const createTournament = (
    name: string,
    date: string,
    buyIn: number,
    addon: number,
    bounty: number,
    dealerApp: number
  ): string => {
    const id = `tour-${Date.now()}`;
    const newTour: Tournament = {
      id,
      seasonId: activeSeason?.id || 'unassigned',
      date,
      name,
      status: 'draft',
      buyInAmount: buyIn,
      addonAmount: addon,
      bountyAmount: bounty,
      dealerAppreciationAmount: dealerApp,
      entries: [],
      totalPrizePool: 0,
      totalBountyPool: 0,
      totalDealerAppreciation: 0
    };

    setState(prev => ({
      ...prev,
      tournaments: [...prev.tournaments, newTour]
    }));

    return id;
  };

  const updateTournament = (id: string, updated: Partial<Tournament>) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => t.id === id ? { ...t, ...updated } : t)
    }));
  };

  const deleteTournament = (id: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.filter(t => t.id !== id)
    }));
  };

  const registerPlayer = (tournamentId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        // Check if already registered
        if (t.entries.some(e => e.memberId === memberId)) return t;

        const newEntry: TournamentEntry = {
          memberId,
          hasBuyIn: true,
          hasAddon: false,
          hasDealerAppreciation: true,
          payoutEarned: 0,
          bountiesCollected: 0,
          pointsEarned: 0
        };

        return {
          ...t,
          entries: [...t.entries, newEntry]
        };
      })
    }));
  };

  const unregisterPlayer = (tournamentId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        return {
          ...t,
          entries: t.entries.filter(e => e.memberId !== memberId)
        };
      })
    }));
  };

  const toggleEntryAddon = (tournamentId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        return {
          ...t,
          entries: t.entries.map(e => e.memberId === memberId ? { ...e, hasAddon: !e.hasAddon } : e)
        };
      })
    }));
  };

  const toggleEntryDealerApp = (tournamentId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        return {
          ...t,
          entries: t.entries.map(e => e.memberId === memberId ? { ...e, hasDealerAppreciation: !e.hasDealerAppreciation } : e)
        };
      })
    }));
  };

  const eliminatePlayer = (tournamentId: string, memberId: string, eliminatedBy?: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        
        // Count already eliminated to determine place
        const eliminatedCount = t.entries.filter(e => e.eliminatedAt).length;
        const totalEntries = t.entries.length;
        
        // Finish position: e.g. if 10 entries and 0 eliminated, next is 10th.
        const finishPosition = totalEntries - eliminatedCount;

        return {
          ...t,
          entries: t.entries.map(e => {
            if (e.memberId === memberId) {
              return {
                ...e,
                eliminatedAt: new Date().toISOString(),
                eliminatedBy,
                finishPosition
              };
            }
            // If this player is the bounty hunter, increment their bounty collection
            if (eliminatedBy && e.memberId === eliminatedBy) {
              return {
                ...e,
                bountiesCollected: e.bountiesCollected + 1
              };
            }
            return e;
          })
        };
      })
    }));
  };

  const undoElimination = (tournamentId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        
        const entryToUndo = t.entries.find(e => e.memberId === memberId);
        if (!entryToUndo || !entryToUndo.eliminatedAt) return t;

        const originalEliminator = entryToUndo.eliminatedBy;

        return {
          ...t,
          entries: t.entries.map(e => {
            if (e.memberId === memberId) {
              return {
                ...e,
                eliminatedAt: undefined,
                eliminatedBy: undefined,
                finishPosition: undefined
              };
            }
            // Decrement bounties collected for the eliminator
            if (originalEliminator && e.memberId === originalEliminator) {
              return {
                ...e,
                bountiesCollected: Math.max(0, e.bountiesCollected - 1)
              };
            }
            return e;
          })
        };
      })
    }));
  };

  // Finalize Tournament and calculate Payouts + Standings Points
  const finalizeTournament = (tournamentId: string) => {
    setState(prev => {
      return {
        ...prev,
        tournaments: prev.tournaments.map(t => {
          if (t.id !== tournamentId) return t;

          const entriesCount = t.entries.length;
          if (entriesCount === 0) return { ...t, status: 'completed' };

          // Automatically assign 1st place to the last standing player (one who has no eliminatedAt)
          let updatedEntries = [...t.entries];
          const remainingPlayers = updatedEntries.filter(e => !e.eliminatedAt);
          if (remainingPlayers.length === 1) {
            const winner = remainingPlayers[0];
            updatedEntries = updatedEntries.map(e => e.memberId === winner.memberId ? { ...e, finishPosition: 1, eliminatedAt: new Date().toISOString() } : e);
          } else if (remainingPlayers.length > 1) {
            // If somehow finalized without full eliminations, sort randomly or leave as is
            let place = remainingPlayers.length;
            remainingPlayers.forEach(p => {
              updatedEntries = updatedEntries.map(e => e.memberId === p.memberId ? { ...e, finishPosition: place--, eliminatedAt: new Date().toISOString() } : e);
            });
          }

          // Calculate pools
          const buyInCount = updatedEntries.filter(e => e.hasBuyIn).length;
          const addonCount = updatedEntries.filter(e => e.hasAddon).length;
          const bountyCount = updatedEntries.filter(e => e.hasBuyIn).length; // bounty is paid per buy-in
          const dealerCount = updatedEntries.filter(e => e.hasDealerAppreciation).length;

          const totalPrizePool = (buyInCount * t.buyInAmount) + (addonCount * t.addonAmount);
          const totalBountyPool = bountyCount * t.bountyAmount;
          const totalDealerAppreciation = dealerCount * t.dealerAppreciationAmount;

          // Payout structures
          // Dynamic based on total player entries
          let payouts: number[] = [];
          if (entriesCount <= 5) {
            // 1st gets 100%
            payouts = [totalPrizePool];
          } else if (entriesCount <= 10) {
            // 1st: 70%, 2nd: 30%
            payouts = [
              Math.round(totalPrizePool * 0.70),
              Math.round(totalPrizePool * 0.30)
            ];
          } else if (entriesCount <= 20) {
            // 1st: 50%, 2nd: 30%, 3rd: 20%
            payouts = [
              Math.round(totalPrizePool * 0.50),
              Math.round(totalPrizePool * 0.30),
              Math.round(totalPrizePool * 0.20)
            ];
          } else {
            // 21+ players: 1st: 45%, 2nd: 25%, 3rd: 18%, 4th: 12%
            payouts = [
              Math.round(totalPrizePool * 0.45),
              Math.round(totalPrizePool * 0.25),
              Math.round(totalPrizePool * 0.18),
              Math.round(totalPrizePool * 0.12)
            ];
          }

          // Distribute payouts and points
          const N = entriesCount; // Field size
          const attendancePoints = prev.settings.pointsBaseAttendance;

          updatedEntries = updatedEntries.map(e => {
            const pos = e.finishPosition || N;
            
            // Payout
            const payoutEarned = payouts[pos - 1] || 0;

            // Points Formula: 10 * (sqrt(N) / sqrt(P)) + attendance + bounties
            // (Round to 1 decimal place)
            const pointsFormulaValue = 10 * (Math.sqrt(N) / Math.sqrt(pos));
            const pointsEarned = Number((pointsFormulaValue + attendancePoints + e.bountiesCollected).toFixed(1));

            return {
              ...e,
              payoutEarned,
              pointsEarned
            };
          });

          return {
            ...t,
            status: 'completed',
            totalPrizePool,
            totalBountyPool,
            totalDealerAppreciation,
            entries: updatedEntries
          };
        })
      };
    });
  };

  const reopenTournament = (tournamentId: string) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t => {
        if (t.id !== tournamentId) return t;
        
        // Clear payouts and points, reset status to active
        const resetEntries = t.entries.map(e => ({
          ...e,
          payoutEarned: 0,
          pointsEarned: 0
        }));

        return {
          ...t,
          status: 'active',
          entries: resetEntries
        };
      })
    }));
  };

  const updateSettings = (settings: Settings) => {
    setState(prev => ({
      ...prev,
      settings
    }));
  };

  // Database Backup Systems
  const exportDatabase = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Basic structure validation
      if (
        parsed &&
        Array.isArray(parsed.members) &&
        Array.isArray(parsed.tournaments) &&
        Array.isArray(parsed.seasons) &&
        parsed.settings
      ) {
        setState(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import database', e);
      return false;
    }
  };

  const resetDatabaseToDefault = () => {
    setState(defaultMockData);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        activeSeason,
        addMember,
        updateMember,
        deleteMember,
        addSeason,
        updateSeason,
        setActiveSeason,
        deleteSeason,
        createTournament,
        updateTournament,
        deleteTournament,
        registerPlayer,
        unregisterPlayer,
        toggleEntryAddon,
        toggleEntryDealerApp,
        eliminatePlayer,
        undoElimination,
        finalizeTournament,
        reopenTournament,
        updateSettings,
        importDatabase,
        exportDatabase,
        resetDatabaseToDefault
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
