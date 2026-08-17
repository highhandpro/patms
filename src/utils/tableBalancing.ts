export interface PlayerMoveAssignment {
  playerId: string;
  orderNumber: number; // 1, 2, 3...
  targetTable: string;
  targetSeatIndex: number; // 0-indexed (0 - 9)
  targetSeatNumber: number; // 1-indexed (Seat 1 - 10)
}

export interface TableBalanceRecommendation {
  type: 'rebalance' | 'break';
  isFinalTable?: boolean;
  finalTableDealerId?: string;
  sourceTable?: string;
  targetTable?: string;
  sourceActivePlayers?: string[];
  sourceActiveCount?: number;
  targetActiveCount?: number;
  breakTable?: string;
  breakPlayerIds?: string[];
  breakAssignments?: PlayerMoveAssignment[];
  remainingTables?: string[];
  message: string;
}

const TABLE_ORDER = ['red table', 'blue table', 'gold table', 'gray table', 'purple table'];

/**
 * Calculates a complete random redraw for the Final Table (Red Table).
 * Assigns a designated dealer to Seat 1 (index 0).
 * Dealer Priority:
 *  1. Derek Allen (if active in tournament)
 *  2. Tim Hufler (if active in tournament)
 *  3. Any other remaining active dealer in preassignedDealers
 *  4. Any remaining active player
 * All other active players are randomly shuffled into Seats 2..N (indices 1..N-1).
 */
export const calculateFinalTableRedraw = (
  _seating: Record<string, string[]>,
  activeTournament: any,
  members: any[] = []
): { assignments: PlayerMoveAssignment[]; dealerId: string; finalSeating: Record<string, string[]> } => {
  const activeEntries = activeTournament?.entries?.filter((e: any) => !e.eliminatedAt) || [];
  const activeIds: string[] = activeEntries.map((e: any) => e.memberId);
  const activeSet = new Set<string>(activeIds);

  const preassignedDealers: string[] = activeTournament?.preassignedDealers || [];

  // Find member IDs for Derek Allen, Tim Hufler, and Ron Hawkins
  const derekMember = members.find(m => m.firstName?.toLowerCase() === 'derek' && m.lastName?.toLowerCase() === 'allen');
  const derekId = derekMember?.id;
  const timMember = members.find(m => m.firstName?.toLowerCase() === 'tim' && m.lastName?.toLowerCase() === 'hufler');
  const timId = timMember?.id;
  const ronMember = members.find(m => m.firstName?.toLowerCase() === 'ron' && m.lastName?.toLowerCase() === 'hawkins');
  const ronId = ronMember?.id;

  // 1. Pick dealer for Seat 1
  let dealerId = '';
  if (derekId && activeSet.has(derekId)) {
    dealerId = derekId;
  } else if (timId && activeSet.has(timId)) {
    dealerId = timId;
  } else if (ronId && activeSet.has(ronId)) {
    dealerId = ronId;
  } else {
    // 4th priority: other active preassigned dealer
    const otherActiveDealers = preassignedDealers.filter((id: string) => activeSet.has(id));
    if (otherActiveDealers.length > 0) {
      dealerId = otherActiveDealers[0];
    } else if (activeIds.length > 0) {
      // 5th priority: any active player
      dealerId = activeIds[0];
    }
  }

  // 2. Remaining active players randomly shuffled
  const remainingPlayers: string[] = activeIds.filter((id: string) => id !== dealerId).sort(() => Math.random() - 0.5);

  const assignments: PlayerMoveAssignment[] = [];
  const redTableSeats: string[] = Array(10).fill('');

  // Seat 1 (index 0): Dealer
  if (dealerId) {
    redTableSeats[0] = dealerId;
    assignments.push({
      playerId: dealerId,
      orderNumber: 1,
      targetTable: 'red table',
      targetSeatIndex: 0,
      targetSeatNumber: 1
    });
  }

  // Seats 2..N (indices 1..N-1): Remaining players
  remainingPlayers.forEach((pId: string, idx: number) => {
    const seatIdx = idx + 1;
    if (seatIdx < 10) {
      redTableSeats[seatIdx] = pId;
      assignments.push({
        playerId: pId,
        orderNumber: seatIdx + 1,
        targetTable: 'red table',
        targetSeatIndex: seatIdx,
        targetSeatNumber: seatIdx + 1
      });
    }
  });

  const finalSeating: Record<string, string[]> = {
    'red table': redTableSeats
  };

  return { assignments, dealerId, finalSeating };
};

/**
 * Calculates deterministic numbered player assignments to destination tables and open seats.
 * STRICT RULE: A table can NEVER have more than 10 players.
 * Players from broken table are distributed to tables with fewest active players first.
 */
export const calculateBreakAssignments = (
  seating: Record<string, string[]>,
  breakTable: string,
  activeTournament: any
): PlayerMoveAssignment[] => {
  if (!activeTournament || !activeTournament.entries || !seating || !seating[breakTable]) return [];

  const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
  const activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));

  // Get active players at break table in seat order (Seats 1 to 10)
  const breakSeats = (seating[breakTable] || []).slice(0, 10);
  const playersToMove = breakSeats.filter(id => id && activeSet.has(id));
  if (playersToMove.length === 0) return [];

  // Get remaining active tables in standard order
  const remainingTableNames = Object.keys(seating)
    .filter(t => t !== breakTable)
    .sort((a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b));

  if (remainingTableNames.length === 0) return [];

  // Track active count and open seat indices (0..9) for each remaining table
  const currentActiveCount: Record<string, number> = {};
  const availableSeatsByTable: Record<string, number[]> = {};
  const tablePlayerMoveCount: Record<string, number> = {};

  remainingTableNames.forEach(tName => {
    const seats = (seating[tName] || []).slice(0, 10);
    let count = 0;
    const openSeats: number[] = [];
    for (let i = 0; i < 10; i++) {
      const occupant = seats[i];
      if (occupant && activeSet.has(occupant)) {
        count++;
      } else {
        openSeats.push(i);
      }
    }
    currentActiveCount[tName] = count;
    availableSeatsByTable[tName] = openSeats;
    tablePlayerMoveCount[tName] = 0;
  });

  const assignments: PlayerMoveAssignment[] = [];

  playersToMove.forEach(pId => {
    // Pick the remaining table with fewest active players that is NOT full (< 10) and has open seats
    const candidateTables = remainingTableNames
      .filter(tName => currentActiveCount[tName] < 10 && (availableSeatsByTable[tName]?.length || 0) > 0)
      .sort((a, b) => {
        if (currentActiveCount[a] !== currentActiveCount[b]) {
          return currentActiveCount[a] - currentActiveCount[b];
        }
        return TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b);
      });

    // Fallback if all candidates are full (strictly should not happen)
    const targetTable = candidateTables.length > 0 ? candidateTables[0] : remainingTableNames[0];

    tablePlayerMoveCount[targetTable] = (tablePlayerMoveCount[targetTable] || 0) + 1;
    currentActiveCount[targetTable] = (currentActiveCount[targetTable] || 0) + 1;
    const orderNumber = tablePlayerMoveCount[targetTable];

    // Take the first available open seat index (0..9)
    const seatIndex = (availableSeatsByTable[targetTable] && availableSeatsByTable[targetTable].length > 0)
      ? availableSeatsByTable[targetTable].shift()!
      : 0;

    assignments.push({
      playerId: pId,
      orderNumber,
      targetTable,
      targetSeatIndex: seatIndex,
      targetSeatNumber: seatIndex + 1
    });
  });

  return assignments;
};

/**
 * Checks whether tables are currently unbalanced (difference >= 2) or if a table break threshold is reached.
 * Enforces maximum 10 players per table.
 */
export const checkTableBalance = (
  seating: Record<string, string[]>,
  activeTournament: any,
  members: any[] = []
): TableBalanceRecommendation | null => {
  if (!activeTournament || !activeTournament.entries || !seating) return null;

  const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
  const activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));

  // Determine active tables that have at least 1 active seated player (clamped to max 10 seats)
  const tableStats: { name: string; activePlayers: string[]; count: number }[] = [];

  Object.entries(seating)
    .sort((a, b) => TABLE_ORDER.indexOf(a[0]) - TABLE_ORDER.indexOf(b[0]))
    .forEach(([tableName, seats]) => {
      const activePlayers = (seats || []).slice(0, 10).filter(id => id && activeSet.has(id));
      if (activePlayers.length > 0) {
        tableStats.push({
          name: tableName,
          activePlayers,
          count: activePlayers.length
        });
      }
    });

  if (tableStats.length <= 1) return null;

  const totalActive = activeEntries.length;
  const numActiveTables = tableStats.length;

  // 1. Check Table Break Thresholds (Consolidation at 40, 30, 20, 10)
  if (numActiveTables === 5 && totalActive <= 40) {
    const breakTableObj = tableStats[tableStats.length - 1]; // purple table
    const remaining = tableStats.slice(0, tableStats.length - 1).map(t => t.name);
    return {
      type: 'break',
      breakTable: breakTableObj.name,
      breakPlayerIds: breakTableObj.activePlayers,
      breakAssignments: calculateBreakAssignments(seating, breakTableObj.name, activeTournament),
      remainingTables: remaining,
      message: `Consolidate to 4 tables: Break ${breakTableObj.name.toUpperCase()} (${totalActive} players remaining).`
    };
  }

  if (numActiveTables === 4 && totalActive <= 30) {
    const breakTableObj = tableStats[tableStats.length - 1]; // gray table
    const remaining = tableStats.slice(0, tableStats.length - 1).map(t => t.name);
    return {
      type: 'break',
      breakTable: breakTableObj.name,
      breakPlayerIds: breakTableObj.activePlayers,
      breakAssignments: calculateBreakAssignments(seating, breakTableObj.name, activeTournament),
      remainingTables: remaining,
      message: `Consolidate to 3 tables: Break ${breakTableObj.name.toUpperCase()} (${totalActive} players remaining).`
    };
  }

  if (numActiveTables === 3 && totalActive <= 20) {
    const breakTableObj = tableStats[tableStats.length - 1]; // gold table
    const remaining = tableStats.slice(0, tableStats.length - 1).map(t => t.name);
    return {
      type: 'break',
      breakTable: breakTableObj.name,
      breakPlayerIds: breakTableObj.activePlayers,
      breakAssignments: calculateBreakAssignments(seating, breakTableObj.name, activeTournament),
      remainingTables: remaining,
      message: `Consolidate to 2 tables: Break ${breakTableObj.name.toUpperCase()} (${totalActive} players remaining).`
    };
  }

  if (numActiveTables === 2 && totalActive <= 10) {
    const breakTableObj = tableStats[tableStats.length - 1]; // blue table
    const remaining = [tableStats[0].name]; // red table / Final Table
    const finalRedraw = calculateFinalTableRedraw(seating, activeTournament, members);
    return {
      type: 'break',
      isFinalTable: true,
      finalTableDealerId: finalRedraw.dealerId,
      breakTable: breakTableObj.name,
      breakPlayerIds: breakTableObj.activePlayers,
      breakAssignments: finalRedraw.assignments,
      remainingTables: remaining,
      message: `Final Table Reached (${totalActive} players remaining)! Random redraw with Dealer in Seat #1.`
    };
  }

  // 2. Check 1-Player Rebalance Condition (Max active - Min active >= 2)
  let maxTable = tableStats[0];
  let minTable = tableStats[0];

  for (const t of tableStats) {
    if (t.count > maxTable.count) maxTable = t;
    if (t.count < minTable.count) minTable = t;
  }

  // Only rebalance if source has at least 2 more than target AND target has open seats (< 10)
  if (maxTable.count - minTable.count >= 2 && minTable.count < 10) {
    return {
      type: 'rebalance',
      sourceTable: maxTable.name,
      targetTable: minTable.name,
      sourceActivePlayers: maxTable.activePlayers,
      sourceActiveCount: maxTable.count,
      targetActiveCount: minTable.count,
      message: `Tables unbalanced: ${maxTable.name.toUpperCase()} (${maxTable.count} players) vs ${minTable.name.toUpperCase()} (${minTable.count} players). Move 1 player (next Big Blind) to balance.`
    };
  }

  return null;
};

/**
 * Moves a player to the first open/empty seat at the target table.
 * STRICT RULE: Target table array is always strictly 10 elements.
 */
export const executePlayerMove = (
  seating: Record<string, string[]>,
  playerId: string,
  sourceTable: string,
  targetTable: string,
  activeTournament?: any
): Record<string, string[]> => {
  const updatedSeating: Record<string, string[]> = {};

  Object.entries(seating).forEach(([tName, seats]) => {
    const copy = Array(10).fill("");
    for (let i = 0; i < 10; i++) {
      copy[i] = seats[i] || "";
    }
    updatedSeating[tName] = copy;
  });

  // 1. Remove player from source table (replace with empty string)
  if (updatedSeating[sourceTable]) {
    updatedSeating[sourceTable] = updatedSeating[sourceTable].map(id => (id === playerId ? "" : id));
  }

  // 2. Insert into first open seat on target table (strictly within index 0..9)
  if (!updatedSeating[targetTable]) {
    updatedSeating[targetTable] = Array(10).fill("");
  }

  let activeSet = new Set<string>();
  if (activeTournament && activeTournament.entries) {
    const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
    activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));
  }

  let emptyIndex = -1;
  const targetSeats = updatedSeating[targetTable];
  for (let i = 0; i < 10; i++) {
    const occupant = targetSeats[i];
    if (!occupant || occupant === "" || (activeTournament && !activeSet.has(occupant))) {
      emptyIndex = i;
      break;
    }
  }

  if (emptyIndex !== -1 && emptyIndex < 10) {
    updatedSeating[targetTable][emptyIndex] = playerId;
  }

  // Ensure all table arrays are strictly 10 items
  Object.keys(updatedSeating).forEach(tName => {
    updatedSeating[tName] = updatedSeating[tName].slice(0, 10);
    while (updatedSeating[tName].length < 10) {
      updatedSeating[tName].push("");
    }
  });

  return updatedSeating;
};

/**
 * Breaks a table and distributes all active players into open seats across remaining tables in numbered 1, 2, 3 order.
 * STRICT RULE: Every table is capped at 10 seats max.
 */
export const executeTableBreak = (
  seating: Record<string, string[]>,
  breakTable: string,
  activeTournament: any
): Record<string, string[]> => {
  const assignments = calculateBreakAssignments(seating, breakTable, activeTournament);
  const updatedSeating: Record<string, string[]> = {};

  // Copy remaining tables ensuring exactly 10 slots each
  Object.entries(seating).forEach(([tName, seats]) => {
    if (tName !== breakTable) {
      const copy = Array(10).fill("");
      for (let i = 0; i < 10; i++) {
        copy[i] = seats[i] || "";
      }
      updatedSeating[tName] = copy;
    }
  });

  // Apply assignments into the assigned target seat index (strictly 0..9)
  assignments.forEach(item => {
    if (!updatedSeating[item.targetTable]) {
      updatedSeating[item.targetTable] = Array(10).fill("");
    }
    const idx = Math.min(Math.max(item.targetSeatIndex, 0), 9);
    updatedSeating[item.targetTable][idx] = item.playerId;
  });

  // Ensure all tables are strictly 10 slots
  Object.keys(updatedSeating).forEach(tName => {
    updatedSeating[tName] = updatedSeating[tName].slice(0, 10);
    while (updatedSeating[tName].length < 10) {
      updatedSeating[tName].push("");
    }
  });

  return updatedSeating;
};
