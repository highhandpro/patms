export interface TableBalanceRecommendation {
  type: 'rebalance' | 'break';
  sourceTable?: string;
  targetTable?: string;
  sourceActivePlayers?: string[];
  sourceActiveCount?: number;
  targetActiveCount?: number;
  breakTable?: string;
  breakPlayerIds?: string[];
  remainingTables?: string[];
  message: string;
}

const TABLE_ORDER = ['red table', 'blue table', 'gold table', 'gray table', 'purple table'];

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
 * Breaks a table and distributes all active players into open seats across remaining tables.
 */
export const executeTableBreak = (
  seating: Record<string, string[]>,
  breakTable: string,
  activeTournament: any
): Record<string, string[]> => {
  const updatedSeating: Record<string, string[]> = {};
  const activeEntries = activeTournament.entries.filter((e: any) => !e.eliminatedAt);
  const activeSet = new Set<string>(activeEntries.map((e: any) => e.memberId));

  const playersToMove = (seating[breakTable] || []).filter(id => id && activeSet.has(id));

  // Copy remaining tables
  Object.entries(seating).forEach(([tName, seats]) => {
    if (tName !== breakTable) {
      updatedSeating[tName] = [...seats];
    }
  });

  const remainingTableNames = Object.keys(updatedSeating).sort(
    (a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b)
  );

  if (remainingTableNames.length === 0) return seating;

  let tableIdx = 0;
  playersToMove.forEach(pId => {
    const targetTable = remainingTableNames[tableIdx % remainingTableNames.length];
    const emptyIndex = updatedSeating[targetTable].findIndex(id => !id || id === "");
    if (emptyIndex !== -1) {
      updatedSeating[targetTable][emptyIndex] = pId;
    } else {
      updatedSeating[targetTable].push(pId);
    }
    tableIdx++;
  });

  return updatedSeating;
};
