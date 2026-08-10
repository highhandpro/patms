export interface PlayerMoveAssignment {
  playerId: string;
  orderNumber: number; // 1, 2, 3...
  targetTable: string;
  targetSeatIndex: number; // 0-indexed
  targetSeatNumber: number; // 1-indexed (Seat 1 - 10)
}

export interface TableBalanceRecommendation {
  type: 'rebalance' | 'break';
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
 * Calculates deterministic numbered player assignments to destination tables and open seats.
 */
export const calculateBreakAssignments = (
  seating: Record<string, string[]>,
  breakTable: string,
  activeTournament: any
): PlayerMoveAssignment[] => {
  if (!activeTournament || !activeTournament.entries || !seating || !seating[breakTable]) return [];

  const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
  const activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));

  // Get active players at break table in seat order (Seat 1 to 10)
  const playersToMove = (seating[breakTable] || []).filter(id => id && activeSet.has(id));
  if (playersToMove.length === 0) return [];

  // Get remaining active tables in standard order
  const remainingTableNames = Object.keys(seating)
    .filter(t => t !== breakTable)
    .sort((a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b));

  if (remainingTableNames.length === 0) return [];

  // Find open seat indices for each remaining table
  const openSeatsByTable: Record<string, number[]> = {};
  remainingTableNames.forEach(tName => {
    const seats = seating[tName] || [];
    const openSeats: number[] = [];
    for (let i = 0; i < 10; i++) {
      const occupant = seats[i];
      if (!occupant || !activeSet.has(occupant)) {
        openSeats.push(i);
      }
    }
    openSeatsByTable[tName] = openSeats;
  });

  const assignments: PlayerMoveAssignment[] = [];
  const tablePlayerCounts: Record<string, number> = {};
  remainingTableNames.forEach(tName => {
    tablePlayerCounts[tName] = 0;
  });

  let tableIdx = 0;
  playersToMove.forEach(pId => {
    const targetTable = remainingTableNames[tableIdx % remainingTableNames.length];
    tablePlayerCounts[targetTable] = (tablePlayerCounts[targetTable] || 0) + 1;
    const orderNumber = tablePlayerCounts[targetTable]; // 1, 2, 3...

    const availableSeats = openSeatsByTable[targetTable] || [];
    // 1st player gets 1st open seat (availableSeats[0]), 2nd gets availableSeats[1], etc.
    let seatIndex = availableSeats[orderNumber - 1];
    if (seatIndex === undefined) {
      seatIndex = (seating[targetTable]?.length || 10) + (orderNumber - 1);
    }

    assignments.push({
      playerId: pId,
      orderNumber,
      targetTable,
      targetSeatIndex: seatIndex,
      targetSeatNumber: seatIndex + 1
    });

    tableIdx++;
  });

  return assignments;
};

/**
 * Checks whether tables are currently unbalanced (difference >= 2) or if a table break threshold is reached.
 */
export const checkTableBalance = (
  seating: Record<string, string[]>,
  activeTournament: any
): TableBalanceRecommendation | null => {
  if (!activeTournament || !activeTournament.entries || !seating) return null;

  const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
  const activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));

  // Determine active tables that have at least 1 active seated player
  const tableStats: { name: string; activePlayers: string[]; count: number }[] = [];

  Object.entries(seating)
    .sort((a, b) => TABLE_ORDER.indexOf(a[0]) - TABLE_ORDER.indexOf(b[0]))
    .forEach(([tableName, seats]) => {
      const activePlayers = seats.filter(id => id && activeSet.has(id));
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

  // 1. Check Table Break Thresholds (Consolidation)
  if (numActiveTables === 5 && totalActive <= 37) {
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
    return {
      type: 'break',
      breakTable: breakTableObj.name,
      breakPlayerIds: breakTableObj.activePlayers,
      breakAssignments: calculateBreakAssignments(seating, breakTableObj.name, activeTournament),
      remainingTables: remaining,
      message: `Final Table Reached! Break ${breakTableObj.name.toUpperCase()} (${totalActive} players remaining).`
    };
  }

  // 2. Check 1-Player Rebalance Condition (Max active - Min active >= 2)
  let maxTable = tableStats[0];
  let minTable = tableStats[0];

  for (const t of tableStats) {
    if (t.count > maxTable.count) maxTable = t;
    if (t.count < minTable.count) minTable = t;
  }

  if (maxTable.count - minTable.count >= 2) {
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
 */
export const executePlayerMove = (
  seating: Record<string, string[]>,
  playerId: string,
  sourceTable: string,
  targetTable: string
): Record<string, string[]> => {
  const updatedSeating: Record<string, string[]> = {};

  Object.entries(seating).forEach(([tName, seats]) => {
    updatedSeating[tName] = [...seats];
  });

  // 1. Remove player from source table (replace with empty string)
  if (updatedSeating[sourceTable]) {
    updatedSeating[sourceTable] = updatedSeating[sourceTable].map(id => (id === playerId ? "" : id));
  }

  // 2. Insert into first open seat on target table (or append if full)
  if (!updatedSeating[targetTable]) {
    updatedSeating[targetTable] = Array(10).fill("");
  }

  const emptyIndex = updatedSeating[targetTable].findIndex(id => !id || id === "");
  if (emptyIndex !== -1) {
    updatedSeating[targetTable][emptyIndex] = playerId;
  } else {
    // If no empty seat exists among first 10, find first available or replace an empty slot
    let inserted = false;
    for (let i = 0; i < 10; i++) {
      if (!updatedSeating[targetTable][i]) {
        updatedSeating[targetTable][i] = playerId;
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      updatedSeating[targetTable].push(playerId);
    }
  }

  return updatedSeating;
};

/**
 * Breaks a table and distributes all active players into open seats across remaining tables in numbered 1, 2, 3 order.
 */
export const executeTableBreak = (
  seating: Record<string, string[]>,
  breakTable: string,
  activeTournament: any
): Record<string, string[]> => {
  const assignments = calculateBreakAssignments(seating, breakTable, activeTournament);
  const updatedSeating: Record<string, string[]> = {};

  // Copy remaining tables
  Object.entries(seating).forEach(([tName, seats]) => {
    if (tName !== breakTable) {
      updatedSeating[tName] = [...seats];
    }
  });

  // Apply the assignments to the target tables in exact seat order
  assignments.forEach(item => {
    if (!updatedSeating[item.targetTable]) {
      updatedSeating[item.targetTable] = Array(10).fill("");
    }
    while (updatedSeating[item.targetTable].length <= item.targetSeatIndex) {
      updatedSeating[item.targetTable].push("");
    }
    updatedSeating[item.targetTable][item.targetSeatIndex] = item.playerId;
  });

  return updatedSeating;
};
