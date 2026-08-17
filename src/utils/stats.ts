import type { DatabaseState } from '../types';

export interface PlayerStanding {
  memberId: string;
  name: string;
  points: number;
  played: number;
  wins: number;
  top10: number;
  cashes: number;
  itmRate: number;
  finalTableRate: number;
  earnings: number;
  bounties: number;
  gamePoints: Record<string, number>;
  badges?: PlayerBadge[];
}

export interface PlayerBadge {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  isUnlocked: boolean;
  progress?: string;
}

// Calculate standings for a specific season or all seasons if seasonId is empty
export const calculateStandings = (state: DatabaseState, seasonId?: string): PlayerStanding[] => {
  const activeMembers = state.members.filter(m => !m.isDeleted);
  const targetTournaments = state.tournaments.filter(t => 
    t.status === 'completed' && (!seasonId || t.seasonId === seasonId) && !t.name.toLowerCase().includes('beta') && !t.isBetaTest
  );

  const standingsMap: Record<string, PlayerStanding> = {};

  // Initialize standings for all active members
  activeMembers.forEach(m => {
    standingsMap[m.id] = {
      memberId: m.id,
      name: `${m.firstName} ${m.lastName}`,
      points: 0,
      played: 0,
      wins: 0,
      top10: 0,
      cashes: 0,
      itmRate: 0,
      finalTableRate: 0,
      earnings: 0,
      bounties: 0,
      gamePoints: {}
    };
  });

  // Accumulate from tournaments
  targetTournaments.forEach(t => {
    t.entries.forEach(entry => {
      // If member is soft-deleted, we still show them in stats, but might need to initialize map
      if (!standingsMap[entry.memberId]) {
        const deletedMember = state.members.find(m => m.id === entry.memberId);
        standingsMap[entry.memberId] = {
          memberId: entry.memberId,
          name: deletedMember ? `${deletedMember.firstName} ${deletedMember.lastName} (Retired)` : 'Unknown Player',
          points: 0,
          played: 0,
          wins: 0,
          top10: 0,
          cashes: 0,
          itmRate: 0,
          finalTableRate: 0,
          earnings: 0,
          bounties: 0,
          gamePoints: {}
        };
      }

      const standing = standingsMap[entry.memberId];
      standing.points = Number((standing.points + entry.pointsEarned).toFixed(1));
      standing.played += 1;
      if (entry.finishPosition === 1) standing.wins += 1;
      if (entry.finishPosition && entry.finishPosition <= 10) standing.top10 += 1;
      if (entry.payoutEarned > 0) standing.cashes += 1;
      standing.bounties += entry.bountiesCollected;
      standing.gamePoints[t.id] = entry.pointsEarned;
    });
  });

  // Calculate career/all-tournament earnings for all entries in standingsMap
  const allCompletedTournaments = state.tournaments.filter(t =>
    t.status === 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest
  );

  allCompletedTournaments.forEach(t => {
    t.entries.forEach(entry => {
      const standing = standingsMap[entry.memberId];
      if (standing) {
        standing.earnings += (entry.payoutEarned || 0) + ((entry.bountiesCollected || 0) * (t.bountyAmount || 0));
      }
    });
  });

  // Finalize rates and badges
  Object.values(standingsMap).forEach(s => {
    s.itmRate = s.played > 0 ? Math.round((s.cashes / s.played) * 100) : 0;
    s.finalTableRate = s.played > 0 ? Math.round((s.top10 / s.played) * 100) : 0;
    s.badges = calculatePlayerBadges({
      played: s.played,
      wins: s.wins,
      top10: s.top10,
      cashes: s.cashes,
      itmRate: s.itmRate,
      finalTableRate: s.finalTableRate,
      earnings: s.earnings,
      bounties: s.bounties,
      points: s.points,
      avgFinish: 0,
      recentFinishes: []
    });
  });

  // Convert map to sorted array
  return Object.values(standingsMap)
    .filter(s => s.played > 0) // only show players who played
    .sort((a, b) => b.points - a.points || b.earnings - a.earnings || b.wins - a.wins);
};

// Calculate lifetime stats for a single player
export interface MemberStats {
  played: number;
  wins: number;
  top10: number;
  cashes: number;
  itmRate: number;
  finalTableRate: number;
  earnings: number;
  bounties: number;
  points: number;
  avgFinish: number;
  recentFinishes: number[]; // positions of last 5 games
}

export const calculateMemberStats = (state: DatabaseState, memberId: string): MemberStats => {
  const completedTournaments = state.tournaments.filter(t => t.status === 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest);
  
  let played = 0;
  let wins = 0;
  let top10 = 0;
  let cashes = 0;
  let earnings = 0;
  let bounties = 0;
  let points = 0;
  let totalFinishPositions = 0;
  let finishesCount = 0;
  const recentFinishes: number[] = [];

  // Sort tournaments chronologically to get recent finishes
  const sortedTournaments = [...completedTournaments].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedTournaments.forEach(t => {
    const entry = t.entries.find(e => e.memberId === memberId);
    if (entry) {
      played += 1;
      if (entry.finishPosition === 1) wins += 1;
      if (entry.finishPosition && entry.finishPosition <= 10) top10 += 1;
      if (entry.payoutEarned > 0) cashes += 1;
      earnings += entry.payoutEarned + (entry.bountiesCollected * t.bountyAmount);
      bounties += entry.bountiesCollected;
      points = Number((points + entry.pointsEarned).toFixed(1));
      if (entry.finishPosition) {
        totalFinishPositions += entry.finishPosition;
        finishesCount += 1;
        recentFinishes.push(entry.finishPosition);
      }
    }
  });

  const avgFinish = finishesCount > 0 ? Number((totalFinishPositions / finishesCount).toFixed(1)) : 0;
  const itmRate = played > 0 ? Math.round((cashes / played) * 100) : 0;
  const finalTableRate = played > 0 ? Math.round((top10 / played) * 100) : 0;
  
  return {
    played,
    wins,
    top10,
    cashes,
    itmRate,
    finalTableRate,
    earnings,
    bounties,
    points,
    avgFinish,
    recentFinishes: recentFinishes.slice(-5).reverse() // last 5, newest first
  };
};

export const calculatePlayerBadges = (stats: MemberStats): PlayerBadge[] => {
  return [
    {
      id: 'champion',
      title: 'Club Champion',
      icon: '👑',
      description: 'Won 1st place in an official tournament',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      isUnlocked: stats.wins >= 1,
      progress: `${stats.wins} Win${stats.wins === 1 ? '' : 's'}`
    },
    {
      id: 'bounty_hunter',
      title: 'Bounty Hunter',
      icon: '🎯',
      description: 'Collected 5 or more career knockouts',
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      isUnlocked: stats.bounties >= 5,
      progress: `${stats.bounties} Bounties`
    },
    {
      id: 'money_maker',
      title: 'Money Maker',
      icon: '💰',
      description: 'Achieved an In-The-Money (ITM) rate of 35% or higher',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      isUnlocked: stats.played >= 3 && stats.itmRate >= 35,
      progress: `${stats.itmRate}% ITM`
    },
    {
      id: 'final_table_vet',
      title: 'Final Table Veteran',
      icon: '🌟',
      description: 'Reached 5 or more career Final Tables',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.15)',
      isUnlocked: stats.top10 >= 5,
      progress: `${stats.top10} Final Tables`
    },
    {
      id: 'iron_player',
      title: 'Iron Player',
      icon: '🛡️',
      description: 'High tournament attendance and club dedication',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      isUnlocked: stats.played >= 5,
      progress: `${stats.played} Events`
    }
  ];
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
};

export function getAutoPayoutPercentages(playerCount: number): number[] {
  if (playerCount < 10) {
    return [60, 40, 0, 0, 0, 0, 0, 0, 0, 0];
  } else if (playerCount <= 15) {
    return [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
  } else if (playerCount <= 24) {
    return [40, 30, 20, 10, 0, 0, 0, 0, 0, 0];
  } else if (playerCount <= 30) {
    return [35, 25, 18, 12, 10, 0, 0, 0, 0, 0];
  } else if (playerCount <= 34) {
    return [30, 22, 17, 13, 10, 8, 0, 0, 0, 0];
  } else if (playerCount <= 40) {
    return [28, 20, 16, 12, 10, 8, 6, 0, 0, 0];
  } else {
    return [26, 19, 15, 12, 10, 8, 6, 4, 0, 0];
  }
}

export function calculateDollarPayouts(prizePool: number, pcts: number[]): number[] {
  if (prizePool <= 0) return new Array(pcts.length).fill(0);
  const rawAmts = pcts.map(pct => {
    if (pct <= 0) return 0;
    return Math.floor((prizePool * pct / 100) / 5) * 5;
  });
  const totalAwarded = rawAmts.reduce((a, b) => a + b, 0);
  const leftover = prizePool - totalAwarded;
  if (leftover > 0 && pcts[0] > 0) {
    rawAmts[0] += leftover;
  }
  return rawAmts;
}
