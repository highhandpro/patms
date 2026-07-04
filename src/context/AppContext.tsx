import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Member, Tournament, Season, Settings, DatabaseState, TournamentEntry, PendingApproval } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  getDocs
} from 'firebase/firestore';

interface AppContextProps {
  state: DatabaseState;
  activeSeason: Season | null;
  addMember: (firstName: string, lastName: string, phone: string, email: string, notes?: string, customId?: string, logoUrl?: string) => void;
  updateMember: (id: string, updated: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addSeason: (name: string, startDate: string, endDate: string, isActive: boolean) => void;
  updateSeason: (id: string, updated: Partial<Season>) => void;
  setActiveSeason: (id: string) => void;
  deleteSeason: (id: string) => void;
  createTournament: (
    name: string,
    date: string,
    buyIn: number,
    addon: number,
    bounty: number,
    dealerApp: number,
    maxPlayers: number,
    payoutPercentages?: number[],
    time?: string,
    location?: string,
    startingStack?: string,
    roundLength?: number,
    rebuys?: string,
    lateEntry?: string,
    addonChips?: number,
    flyerUrl?: string,
    flyerType?: 'pdf' | 'image' | null,
    highHandAmount?: number
  ) => string;
  updateTournament: (id: string, updated: Partial<Tournament>) => void;
  deleteTournament: (id: string) => void;
  registerPlayer: (tournamentId: string, memberId: string) => void;
  publicRegisterPlayer: (tournamentId: string, player: { firstName: string; lastName: string; phone: string; email: string; memberId?: string }) => void;
  unregisterPlayer: (tournamentId: string, memberId: string) => void;
  togglePlayerCheckIn: (tournamentId: string, memberId: string) => void;
  toggleEntryBuyIn: (tournamentId: string, memberId: string) => void;
  toggleEntryAddon: (tournamentId: string, memberId: string) => void;
  toggleEntryDealerApp: (tournamentId: string, memberId: string) => void;
  eliminatePlayer: (tournamentId: string, memberId: string, bountiesWon: number) => void;
  undoElimination: (tournamentId: string, memberId: string) => void;
  finalizeTournament: (tournamentId: string) => void;
  reopenTournament: (tournamentId: string) => void;
  updateSettings: (settings: Settings) => void;
  importDatabase: (jsonString: string) => boolean;
  exportDatabase: () => string;
  resetDatabaseToDefault: () => void;
  submitMemberUpdate: (memberId: string, phone: string, email: string) => void;
  registerGuestPlayer: (firstName: string, lastName: string, phone: string, email: string, logoUrl?: string) => string;
  approveMemberUpdate: (approvalId: string) => void;
  rejectMemberUpdate: (approvalId: string) => void;
  submitPlayerInfoForm: (firstName: string, lastName: string, phone: string, email: string, textReminders: boolean, emailAnnouncements: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Initial default settings
const DEFAULT_SETTINGS = {
  defaultBuyIn: 40,
  defaultAddon: 0,
  defaultBounty: 5,
  defaultDealerAppreciation: 5,
  pointsBaseAttendance: 10,
  maxPlayersPerTable: 8,
  adminPassword: 'pennyante'
};

// Initial default mock database to make the app look stunning right away
// Migration helper to map old random IDs to clean sequential PA-XXX IDs chronologically
export const migrateDatabaseToSequentialIds = (db: DatabaseState): DatabaseState => {
  const needsMigration = db.members.some(m => {
    const num = parseInt(m.id, 10);
    return isNaN(num) || num < 101 || num > 500 || m.id.includes('PA-');
  });
  if (!needsMigration) return db;

  console.log("Running sequential Member ID migration starting with 101...");

  // Sort members:
  // 1. joinedDate ascending
  // 2. Derek Allen first
  // 3. Alphabetical by lastName, firstName
  const sorted = [...db.members].sort((a, b) => {
    if (a.joinedDate !== b.joinedDate) {
      return a.joinedDate.localeCompare(b.joinedDate);
    }
    const isDerekA = a.firstName === 'Derek' && a.lastName === 'Allen';
    const isDerekB = b.firstName === 'Derek' && b.lastName === 'Allen';
    if (isDerekA && !isDerekB) return -1;
    if (!isDerekA && isDerekB) return 1;

    const nameA = `${a.lastName}, ${a.firstName}`;
    const nameB = `${b.lastName}, ${b.firstName}`;
    return nameA.localeCompare(nameB);
  });

  // Create mapping
  const idMap: { [oldId: string]: string } = {};
  sorted.forEach((m, idx) => {
    idMap[m.id] = String(101 + idx);
  });

  // Map members
  const migratedMembers = db.members.map(m => ({
    ...m,
    id: idMap[m.id] || m.id
  }));

  // Map tournaments and entries
  const migratedTournaments = db.tournaments.map(t => ({
    ...t,
    entries: t.entries.map(e => ({
      ...e,
      memberId: idMap[e.memberId] || e.memberId,
      eliminatedBy: e.eliminatedBy ? (idMap[e.eliminatedBy] || e.eliminatedBy) : undefined
    }))
  }));

  console.log("Migration complete!");

  return {
    ...db,
    members: migratedMembers,
    tournaments: migratedTournaments
  };
};

const rawMockData: DatabaseState = {
  members: [
    { id: '2057', firstName: 'Abbi', lastName: 'Sweet', phone: '', email: 'abbigaler@yahoo.com', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '3244', firstName: 'Albert', lastName: 'Jamito', phone: '(360) 719-8906', email: 'albertjh2k@msn.com', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '7560', firstName: 'Alyssa', lastName: 'Johnson', phone: '', email: '', joinedDate: '2026-05-30', notes: '', isDeleted: false },
    { id: '5899', firstName: 'Amber', lastName: 'Keech', phone: '', email: '', joinedDate: '2018-05-07', notes: '', isDeleted: false },
    { id: '2134', firstName: 'Andrew', lastName: 'Palacios', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2067', firstName: 'Andrew', lastName: 'Richardson', phone: '', email: '', joinedDate: '2018-05-06', notes: '', isDeleted: false },
    { id: '7844', firstName: 'Andy', lastName: 'Robbins', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '9071', firstName: 'Andy', lastName: 'Wicks', phone: '', email: '', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '6636', firstName: 'Angel', lastName: 'Cerna', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2065', firstName: 'Angela', lastName: 'Koontz', phone: '', email: '', joinedDate: '2024-08-25', notes: '', isDeleted: false },
    { id: '4689', firstName: 'Angus', lastName: 'Young', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '6587', firstName: 'Austin', lastName: 'Summers', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '9716', firstName: 'Ben', lastName: 'Simpson', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '7709', firstName: 'Berta', lastName: 'Allen', phone: '', email: 'bertadogg@yahoo.com', joinedDate: '2018-05-06', notes: '', isDeleted: false },
    { id: '9826', firstName: 'Bill', lastName: 'Durgan', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '5900', firstName: 'Bill', lastName: 'Baker', phone: '', email: '', joinedDate: '2026-01-13', notes: '', isDeleted: false },
    { id: '5712', firstName: 'Bill', lastName: 'Foley', phone: '', email: 'tomthumb69@yahoo.com', joinedDate: '2025-07-09', notes: '', isDeleted: false },
    { id: '2397', firstName: 'Billy', lastName: 'Lind', phone: '', email: '', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '9294', firstName: 'Bobbie', lastName: 'Ellis', phone: '', email: '', joinedDate: '2026-01-18', notes: '', isDeleted: false },
    { id: '9916', firstName: 'Braum', lastName: 'Stewart', phone: '', email: '', joinedDate: '2025-07-26', notes: '', isDeleted: false },
    { id: '8408', firstName: 'Brent', lastName: 'Hopkins', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '6036', firstName: 'Brent', lastName: 'Boeckholt', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '9151', firstName: 'Brian', lastName: 'Lachenmeier', phone: '', email: '', joinedDate: '2025-06-19', notes: '', isDeleted: false },
    { id: '9009', firstName: 'Brian', lastName: 'Pennebaker', phone: '(425) 286-4544', email: 'pennebd@gmail.com', joinedDate: '2021-03-21', notes: '', isDeleted: false },
    { id: '6689', firstName: 'Brian', lastName: 'Syfrett', phone: '(360) 989-5638', email: 'briansyfrett@gmail.com', joinedDate: '2022-11-20', notes: '', isDeleted: false },
    { id: '2061', firstName: 'Bruce', lastName: 'Knutson', phone: '(858) 761-8830', email: 'brucewknutson@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2055', firstName: 'Carlie', lastName: 'Sharling', phone: '(975) 863-5214', email: 'bkpatroncu@protonmail.com', joinedDate: '2026-06-30', notes: '', isDeleted: false },
    { id: '9657', firstName: 'Carl', lastName: 'Stalcup', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '3019', firstName: 'Cassaundra', lastName: 'Wellwood', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2249', firstName: 'Chad', lastName: 'Larsen', phone: '(503) 804-2066', email: 'chadelarsen@gmail.com', joinedDate: '2024-07-14', notes: '', isDeleted: false },
    { id: '4488', firstName: 'Chase', lastName: 'Lopez', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4074', firstName: 'Chaz', lastName: 'Carpenter', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '5747', firstName: 'Chris', lastName: 'Imai', phone: '(360) 910-3462', email: 'chugluglug@yahoo.com', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '3545', firstName: 'Chris', lastName: 'Robbins', phone: '', email: '', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '3199', firstName: 'Chris', lastName: 'Farley', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '3841', firstName: 'Christina', lastName: 'Freadman', phone: '', email: '', joinedDate: '2023-02-19', notes: '', isDeleted: false },
    { id: '7583', firstName: 'Christina', lastName: 'Marie', phone: '', email: '', joinedDate: '2025-08-30', notes: '', isDeleted: false },
    { id: '4963', firstName: 'Christopher', lastName: 'Chesser', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2060', firstName: 'Christopher', lastName: 'Hirsh', phone: '(917) 573-4785', email: 'christopher.hirsh@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2223', firstName: 'Christopher', lastName: 'Woody', phone: '(503) 757-1693', email: 'chriswoody1968@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '7074', firstName: 'Christopher', lastName: 'Banks', phone: '', email: '', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '3578', firstName: 'Christopher', lastName: 'Miles', phone: '', email: '', joinedDate: '2026-04-18', notes: '', isDeleted: false },
    { id: '4644', firstName: 'Ciara', lastName: 'Hunt', phone: '', email: '', joinedDate: '2025-07-30', notes: '', isDeleted: false },
    { id: '2301', firstName: 'Cody', lastName: 'Jude', phone: '', email: '', joinedDate: '2026-04-30', notes: '', isDeleted: false },
    { id: '9284', firstName: 'Cody', lastName: 'Radford', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '3393', firstName: 'Cody', lastName: 'Dempsey', phone: '', email: 'codydempsey81@gmail.com', joinedDate: '2026-02-28', notes: '', isDeleted: false },
    { id: '7241', firstName: 'Cristina', lastName: 'Miller', phone: '(480) 688-2757', email: 'cristinammiller@icloud.com', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '2648', firstName: 'Curtis', lastName: 'Moroni', phone: '', email: '', joinedDate: '2025-12-30', notes: '', isDeleted: false },
    { id: '4520', firstName: 'Dale', lastName: 'Scheradella', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '9580', firstName: 'Dan', lastName: 'McDonough', phone: '', email: '', joinedDate: '2025-08-30', notes: '', isDeleted: false },
    { id: '2733', firstName: 'Dan', lastName: 'Majors', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '2434', firstName: 'Dane', lastName: 'Urban', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '7356', firstName: 'Dan', lastName: 'Pietila', phone: '(503) 791-9625', email: 'dan_pietila@yahoo.com', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '5942', firstName: 'Danny', lastName: 'Haag', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '5820', firstName: 'Daria', lastName: 'Da', phone: '', email: '', joinedDate: '2025-12-30', notes: '', isDeleted: false },
    { id: '2986', firstName: 'Darrell', lastName: 'Stefani', phone: '', email: '', joinedDate: '2023-02-22', notes: '', isDeleted: false },
    { id: '8671', firstName: 'Dave', lastName: 'Anderson', phone: '', email: '', joinedDate: '2021-05-01', notes: '', isDeleted: false },
    { id: '3493', firstName: 'Dave', lastName: 'Morales', phone: '', email: 'd.morales23@yahoo.com', joinedDate: '2022-11-20', notes: '', isDeleted: false },
    { id: '6026', firstName: 'David', lastName: 'Ciapanno', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '4504', firstName: 'David', lastName: 'Avalos', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '5209', firstName: 'David', lastName: 'Foster', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4660', firstName: 'David', lastName: 'Philossof', phone: '(360) 991-4837', email: 'dpcountry46@gmail.com', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '7375', firstName: 'Davin', lastName: 'Colby', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '8011', firstName: 'DeLorean', lastName: 'Walton', phone: '', email: '', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '7224', firstName: 'Derek', lastName: 'Allen', phone: '(360) 772-9768', email: 'steerbully777@gmail.com', joinedDate: '2018-05-06', notes: '', isDeleted: false },
    { id: '5915', firstName: 'Derek', lastName: 'Chilcoate', phone: '', email: '', joinedDate: '2025-10-15', notes: '', isDeleted: false },
    { id: '6948', firstName: 'Donald', lastName: 'Lund', phone: '', email: '', joinedDate: '2023-03-04', notes: '', isDeleted: false },
    { id: '4080', firstName: 'Doug', lastName: 'Berg', phone: '(360) 910-6884', email: 'dmberg2@comcast.net', joinedDate: '2024-08-25', notes: '', isDeleted: false },
    { id: '6491', firstName: 'Emilie', lastName: 'Urick', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '6836', firstName: 'Eric', lastName: 'Fleet', phone: '', email: '', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '5388', firstName: 'Erik', lastName: 'Wallway', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '3775', firstName: 'Evan', lastName: 'Elliott', phone: '(360) 726-8122', email: 'evanelliottprofile@gmail.com', joinedDate: '2025-11-15', notes: '', isDeleted: false },
    { id: '2593', firstName: 'Gabe', lastName: 'Smith', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '7086', firstName: 'Gabe', lastName: 'Raskin', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '8242', firstName: 'Gabe', lastName: 'Elliott', phone: '(503) 516-1643', email: 'gabelliott@gmail.com', joinedDate: '2025-10-18', notes: '', isDeleted: false },
    { id: '7872', firstName: 'Gagan', lastName: 'Deep Singh', phone: '', email: '', joinedDate: '2026-04-30', notes: '', isDeleted: false },
    { id: '5752', firstName: 'Gail', lastName: 'Sippey', phone: '', email: '', joinedDate: '2026-03-06', notes: '', isDeleted: false },
    { id: '7577', firstName: 'Glenn', lastName: 'Swire', phone: '', email: '', joinedDate: '2022-12-05', notes: '', isDeleted: false },
    { id: '4034', firstName: 'Glory', lastName: 'ToGod', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '4554', firstName: 'Holly', lastName: 'Stark', phone: '', email: '', joinedDate: '2026-02-28', notes: '', isDeleted: false },
    { id: '3225', firstName: 'Hunter', lastName: 'Dillman', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '7122', firstName: 'Isaiah', lastName: 'Avery', phone: '', email: '', joinedDate: '2023-02-23', notes: '', isDeleted: false },
    { id: '9123', firstName: 'Jack', lastName: 'Evans', phone: '', email: '', joinedDate: '2026-02-23', notes: '', isDeleted: false },
    { id: '5135', firstName: 'Jaime', lastName: 'Sherwood', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '8170', firstName: 'Jaime', lastName: 'Schuval', phone: '', email: '', joinedDate: '2025-05-23', notes: '', isDeleted: false },
    { id: '8437', firstName: 'James', lastName: 'Birkenfeld', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '5457', firstName: 'Jamie', lastName: 'Robb', phone: '', email: '', joinedDate: '2022-12-11', notes: '', isDeleted: false },
    { id: '7640', firstName: 'Jared', lastName: 'Johnson', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '5099', firstName: 'Jason', lastName: 'Hofbauer', phone: '', email: 'zagsfan78@gmail.com', joinedDate: '2018-05-07', notes: '', isDeleted: false },
    { id: '5795', firstName: 'Jasper', lastName: 'Behn', phone: '', email: '', joinedDate: '2026-06-26', notes: '', isDeleted: false },
    { id: '3430', firstName: 'Jennie', lastName: 'Richey', phone: '', email: '', joinedDate: '2024-10-04', notes: '', isDeleted: false },
    { id: '2267', firstName: 'Jeremy', lastName: 'Fenton', phone: '', email: '', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '9469', firstName: 'Jermaine', lastName: 'Spino', phone: '', email: '', joinedDate: '2026-04-18', notes: '', isDeleted: false },
    { id: '3985', firstName: 'Jerry', lastName: 'Layton', phone: '', email: '', joinedDate: '2023-04-09', notes: '', isDeleted: false },
    { id: '4247', firstName: 'Jesse', lastName: 'Saunders', phone: '', email: '', joinedDate: '2023-03-12', notes: '', isDeleted: false },
    { id: '9899', firstName: 'Jeylen', lastName: 'Alejaga', phone: '', email: '', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '8796', firstName: 'Jfree', lastName: 'McDee', phone: '', email: '', joinedDate: '2025-08-30', notes: '', isDeleted: false },
    { id: '4108', firstName: 'Jodi', lastName: 'Wicks', phone: '', email: '', joinedDate: '2026-01-25', notes: '', isDeleted: false },
    { id: '6986', firstName: 'John', lastName: 'Chang', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '3924', firstName: 'John', lastName: 'Sampson', phone: '', email: '', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '9008', firstName: 'John', lastName: 'Alden', phone: '', email: '', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '2062', firstName: 'Johnathan', lastName: 'Viloria', phone: '(580) 215-9838', email: 'johnathan.p.viloria@hotmail.com', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '2625', firstName: 'Jonazed', lastName: 'Vitug', phone: '', email: '', joinedDate: '2026-02-28', notes: '', isDeleted: false },
    { id: '8706', firstName: 'Joseph', lastName: 'Nameth', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '4546', firstName: 'Josh', lastName: 'Smith', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '7981', firstName: 'Juanito', lastName: 'Cunanan', phone: '', email: 'juanito.cunanan48@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4770', firstName: 'Julie', lastName: 'Folmar', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '2631', firstName: 'Justin', lastName: 'Gregory', phone: '', email: '', joinedDate: '2025-05-16', notes: '', isDeleted: false },
    { id: '2235', firstName: 'Kacy', lastName: 'Schlosser-Buffum', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '3115', firstName: 'Kari', lastName: 'Weiss', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '36442', firstName: 'Katrina', lastName: 'Hambleton', phone: '', email: '', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '3271', firstName: 'Ken', lastName: 'Nguyen', phone: '', email: '', joinedDate: '2025-07-30', notes: '', isDeleted: false },
    { id: '8896', firstName: 'Kerri', lastName: 'Lind', phone: '(360) 433-5524', email: 'kerrilind70@gmail.com', joinedDate: '2023-02-17', notes: '', isDeleted: false },
    { id: '4506', firstName: 'Kevin', lastName: 'Boyle', phone: '', email: '', joinedDate: '2022-02-10', notes: '', isDeleted: false },
    { id: '4727', firstName: 'Kevin', lastName: 'Martin', phone: '', email: '', joinedDate: '2021-03-16', notes: '', isDeleted: false },
    { id: '3817', firstName: 'Kristina', lastName: 'Johnson', phone: '', email: '', joinedDate: '2022-11-15', notes: '', isDeleted: false },
    { id: '5664', firstName: 'Kristy', lastName: 'Adams', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '8552', firstName: 'Kyler', lastName: 'Martin Sr.', phone: '', email: '', joinedDate: '2024-10-24', notes: '', isDeleted: false },
    { id: '9571', firstName: 'Les', lastName: 'Johnson', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '6037', firstName: 'Lianne', lastName: 'Martinez', phone: '', email: '', joinedDate: '2023-02-22', notes: '', isDeleted: false },
    { id: '8175', firstName: 'Lichi', lastName: 'Serna', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '8410', firstName: 'Luis', lastName: 'Niev', phone: '', email: '', joinedDate: '2025-08-30', notes: '', isDeleted: false },
    { id: '7927', firstName: 'Luke', lastName: 'Ashe', phone: '', email: '', joinedDate: '2025-01-19', notes: '', isDeleted: false },
    { id: '2058', firstName: 'Lynn', lastName: 'Villemyer', phone: '(360) 713-3806', email: 'lvillemyer@gmail.coml', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4195', firstName: 'Mara', lastName: 'Lynn', phone: '', email: '', joinedDate: '2023-04-29', notes: '', isDeleted: false },
    { id: '8948', firstName: 'Marc', lastName: 'Kinyon', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '3093', firstName: 'Mark', lastName: 'Browning', phone: '(360) 839-7734', email: 'markbco@yahoo.com', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '9547', firstName: 'Mark', lastName: 'Blanton', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '5123', firstName: 'Mary', lastName: 'Lund', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '3707', firstName: 'Mary', lastName: 'Lind Handy', phone: '', email: 'mary@test.com', joinedDate: '2023-02-11', notes: '', isDeleted: false },
    { id: '8914', firstName: 'Matteo', lastName: 'Karr', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4757', firstName: 'Matthew', lastName: 'Chookiatsirichai', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '6545', firstName: 'Mccord', lastName: 'Dennis', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '4330', firstName: 'Melissa', lastName: 'Sprowls', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '6935', firstName: 'Michelle', lastName: 'Hanning', phone: '(360) 624-7343', email: 'mfrogger30@myctl.net', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '6181', firstName: 'Mickey', lastName: 'Mann', phone: '', email: '', joinedDate: '2023-03-11', notes: '', isDeleted: false },
    { id: '2488', firstName: 'Michelle', lastName: 'Boyle', phone: '', email: 'michelle@gmail.com', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '9964', firstName: 'Molly', lastName: 'Sadewasser', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '5326', firstName: 'Monte', lastName: 'Flaherty', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '3853', firstName: 'Nichlas', lastName: 'Priest', phone: '(971) 221-5097', email: 'priest228@yahoo.com', joinedDate: '2025-02-16', notes: '', isDeleted: false },
    { id: '6580', firstName: 'Pace', lastName: 'Tauialo', phone: '', email: '', joinedDate: '2024-05-26', notes: '', isDeleted: false },
    { id: '3247', firstName: 'Patrick', lastName: 'Pape', phone: '', email: '', joinedDate: '2025-10-30', notes: '', isDeleted: false },
    { id: '4920', firstName: 'Paul', lastName: 'Hollomon', phone: '(575) 644-1408', email: 'phhollo@aol.com', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '8014', firstName: 'Phil', lastName: 'Paul', phone: '', email: '', joinedDate: '2025-03-13', notes: '', isDeleted: false },
    { id: '9497', firstName: 'Pj', lastName: 'Mcatee', phone: '', email: '', joinedDate: '2025-12-13', notes: '', isDeleted: false },
    { id: '5623', firstName: 'Rachelle', lastName: 'Allen', phone: '', email: 'raeallenbooks@gmail.com', joinedDate: '2022-11-13', notes: '', isDeleted: false },
    { id: '3700', firstName: 'Rae', lastName: 'Brashier', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '2660', firstName: 'Randy', lastName: 'Morales', phone: '', email: '', joinedDate: '2022-12-05', notes: '', isDeleted: false },
    { id: '8951', firstName: 'Ric', lastName: 'Lewis', phone: '', email: '', joinedDate: '2024-01-08', notes: '', isDeleted: false },
    { id: '6907', firstName: 'Rick', lastName: 'Lyon', phone: '', email: '', joinedDate: '2025-12-30', notes: '', isDeleted: false },
    { id: '4620', firstName: 'Riku', lastName: 'Sugahara', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '6802', firstName: 'Rob', lastName: 'Thompson', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '9726', firstName: 'Robert', lastName: 'Rowles', phone: '', email: '', joinedDate: '2023-04-09', notes: '', isDeleted: false },
    { id: '2009', firstName: 'Robert', lastName: 'Henson', phone: '', email: '', joinedDate: '2023-02-18', notes: '', isDeleted: false },
    { id: '5325', firstName: 'Rocy', lastName: 'Styles', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '3892', firstName: 'Ron', lastName: 'Hawkins', phone: '(360) 910-1831', email: 'hawkster101@hotmail.com', joinedDate: '2019-05-25', notes: '', isDeleted: false },
    { id: '3679', firstName: 'Rudy', lastName: 'Weiss', phone: '', email: '', joinedDate: '2026-06-20', notes: '', isDeleted: false },
    { id: '8902', firstName: 'Russell', lastName: 'Flores', phone: '', email: '', joinedDate: '2025-03-22', notes: '', isDeleted: false },
    { id: '5533', firstName: 'Ryan', lastName: 'Hoch', phone: '', email: '', joinedDate: '2026-04-30', notes: '', isDeleted: false },
    { id: '5681', firstName: 'Ryan', lastName: 'Gutenberger', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '3591', firstName: 'Ryan', lastName: 'Burlette', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '6200', firstName: 'Ryan', lastName: 'Brown', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '2050', firstName: 'Ryan', lastName: 'Buell', phone: '(360) 989-4050', email: 'ryanbuell15@gmail.com', joinedDate: '2022-05-13', notes: '', isDeleted: false },
    { id: '3757', firstName: 'Sally', lastName: 'Adair Carroll', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '5726', firstName: 'Samantha', lastName: 'Arnold', phone: '', email: '', joinedDate: '2023-06-30', notes: '', isDeleted: false },
    { id: '8675', firstName: 'Sasha', lastName: 'Lilley', phone: '', email: '', joinedDate: '2022-03-10', notes: '', isDeleted: false },
    { id: '3140', firstName: 'Scarlett', lastName: 'Thana', phone: '', email: '', joinedDate: '2025-08-30', notes: '', isDeleted: false },
    { id: '8306', firstName: 'Sean', lastName: 'Manley', phone: '', email: 'tempsean@gmail.com', joinedDate: '2025-09-29', notes: '', isDeleted: false },
    { id: '8044', firstName: 'Sebastian', lastName: 'Osorio', phone: '', email: 'tempsebstian@gmail.com', joinedDate: '2025-11-30', notes: '', isDeleted: false },
    { id: '4909', firstName: 'Shane', lastName: 'Mcpoil', phone: '', email: '', joinedDate: '2022-11-28', notes: '', isDeleted: false },
    { id: '9576', firstName: 'Shane', lastName: 'Bonnin', phone: '', email: '', joinedDate: '2025-02-16', notes: '', isDeleted: false },
    { id: '6488', firstName: 'Sharon', lastName: 'Diess', phone: '', email: '', joinedDate: '2026-02-28', notes: '', isDeleted: false },
    { id: '3575', firstName: 'Shawn', lastName: 'La Bar', phone: '', email: '', joinedDate: '2025-07-30', notes: '', isDeleted: false },
    { id: '7002', firstName: 'Shawn', lastName: 'Cagle', phone: '', email: 'tempshawn@gmail.com', joinedDate: '2025-07-30', notes: '', isDeleted: false },
    { id: '6825', firstName: 'Steve', lastName: 'Douglas', phone: '', email: '', joinedDate: '2026-05-30', notes: '', isDeleted: false },
    { id: '6609', firstName: 'Steve', lastName: 'Sutton', phone: '', email: '', joinedDate: '2025-07-08', notes: '', isDeleted: false },
    { id: '4351', firstName: 'Steve', lastName: 'Hambleton', phone: '', email: '', joinedDate: '2025-03-22', notes: '', isDeleted: false },
    { id: '5707', firstName: 'Steve', lastName: 'Hanning', phone: '(360) 624-8739', email: 'smhanning@myctl.net', joinedDate: '2025-11-25', notes: '', isDeleted: false },
    { id: '3868', firstName: 'Tanner', lastName: 'Trangmar', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '7058', firstName: 'Terri', lastName: 'Angell', phone: '(360) 901-5768', email: 'terter59@gmail.com', joinedDate: '2019-05-21', notes: '', isDeleted: false },
    { id: '5819', firstName: 'Tiffany', lastName: 'Field', phone: '(702) 665-3555', email: 'fieldtjean@gmail.com', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '6905', firstName: 'Tim', lastName: 'Hufler', phone: '(360) 869-2538', email: 'thufler@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '4877', firstName: 'Tina', lastName: 'Thorp', phone: '', email: '', joinedDate: '2023-11-11', notes: '', isDeleted: false },
    { id: '7410', firstName: 'Tom', lastName: 'Baker', phone: '', email: '', joinedDate: '2025-07-30', notes: '', isDeleted: false },
    { id: '6942', firstName: 'Tom', lastName: 'Scharf', phone: '(360) 989-7370', email: 't.e.scharf@gmail.com', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '5336', firstName: 'Tom', lastName: 'Ottman', phone: '', email: '', joinedDate: '2023-02-22', notes: '', isDeleted: false },
    { id: '9870', firstName: 'Tom', lastName: 'Coleman', phone: '', email: '', joinedDate: '2025-03-29', notes: '', isDeleted: false },
    { id: '6804', firstName: 'Tony', lastName: 'Slaven', phone: '(369) 607-8596', email: 'arslaven@gmail.com', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '3040', firstName: 'Tony', lastName: 'Walker', phone: '', email: '', joinedDate: '2023-03-12', notes: '', isDeleted: false },
    { id: '4943', firstName: 'Tori', lastName: 'Cox', phone: '', email: '', joinedDate: '2023-02-17', notes: '', isDeleted: false },
    { id: '8053', firstName: 'Tory', lastName: 'Thom', phone: '', email: '', joinedDate: '2026-01-10', notes: '', isDeleted: false },
    { id: '2053', firstName: 'Travis', lastName: 'Baker', phone: '', email: '', joinedDate: '2025-09-30', notes: '', isDeleted: false },
    { id: '6164', firstName: 'Trent', lastName: 'Sundvick', phone: '', email: '', joinedDate: '2022-06-30', notes: '', isDeleted: false },
    { id: '5408', firstName: 'Troy', lastName: 'Lansdon', phone: '', email: '', joinedDate: '2024-06-30', notes: '', isDeleted: false },
    { id: '6752', firstName: 'Tyler', lastName: 'Toedtli', phone: '', email: '', joinedDate: '2026-02-28', notes: '', isDeleted: false },
    { id: '3356', firstName: 'Tyler', lastName: 'Long', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '5922', firstName: 'Tyler', lastName: 'Henson', phone: '', email: '', joinedDate: '2025-08-12', notes: '', isDeleted: false },
    { id: '8957', firstName: 'Vinny', lastName: 'Biggart', phone: '', email: '', joinedDate: '2023-03-11', notes: '', isDeleted: false },
    { id: '3620', firstName: 'Wade', lastName: 'McGhee', phone: '', email: '', joinedDate: '2023-04-09', notes: '', isDeleted: false },
    { id: '2686', firstName: 'Wendy', lastName: 'Bumgardner', phone: '(503) 799-1004', email: 'walking@teleport.com', joinedDate: '2026-01-30', notes: '', isDeleted: false },
    { id: '5691', firstName: 'William', lastName: 'Slater', phone: '', email: '', joinedDate: '2025-06-30', notes: '', isDeleted: false },
    { id: '4046', firstName: 'Wyatt', lastName: 'Grimes', phone: '', email: '', joinedDate: '2026-03-30', notes: '', isDeleted: false },
    { id: '2063', firstName: 'Zac', lastName: 'Hawkins', phone: '', email: 'zac@gmail.com', joinedDate: '2020-02-20', notes: '', isDeleted: false },
    { id: '99901', firstName: 'Guy', lastName: 'Vider', phone: '(408) 550-6489', email: 'guy@guyvider.com', joinedDate: '2026-01-01', notes: 'Fallback unlisted', isDeleted: false },
    { id: '99902', firstName: 'Bill', lastName: 'Yentsch', phone: '', email: '', joinedDate: '2026-01-01', notes: 'Fallback unlisted', isDeleted: false },
    { id: '99903', firstName: 'Dan', lastName: 'Grimani', phone: '(777) 777-7777', email: '', joinedDate: '2026-01-01', notes: 'Fallback unlisted', isDeleted: false },
    { id: '99904', firstName: 'James', lastName: 'Marcy', phone: '', email: 'cjmary@gmail.com', joinedDate: '2026-01-01', notes: 'Fallback unlisted', isDeleted: false }
  ],
  seasons: [
    { id: 'season-2026', name: 'Season 2026', startDate: '2026-01-01', endDate: '2026-12-31', isActive: false },
    { id: 'season-4', name: 'Season 4', startDate: '2026-06-20', endDate: '2027-01-20', isActive: true }
  ],
  tournaments: [
    {
      id: 'tour-s4g1',
      seasonId: 'season-4',
      date: '2026-06-20',
      name: 'Season 4, Game 1',
      status: 'completed',
      buyInAmount: 40,
      addonAmount: 10,
      bountyAmount: 5,
      dealerAppreciationAmount: 5,
      maxPlayers: 36,
      totalPrizePool: 1450,
      totalBountyPool: 155,
      totalDealerAppreciation: 155,
      entries: [
        { memberId: '6905', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 1, payoutEarned: 522, bountiesCollected: 12, pointsEarned: 139.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '9009', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 2, payoutEarned: 334, bountiesCollected: 2, pointsEarned: 76.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '7224', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 3, payoutEarned: 203, bountiesCollected: 2, pointsEarned: 74.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '8242', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 4, payoutEarned: 145, bountiesCollected: 4, pointsEarned: 78.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '6804', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 5, payoutEarned: 116, bountiesCollected: 3, pointsEarned: 73.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2058', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 6, payoutEarned: 72, bountiesCollected: 0, pointsEarned: 62.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2249', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 7, payoutEarned: 58, bountiesCollected: 2, pointsEarned: 66.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '8896', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 8, payoutEarned: 0, bountiesCollected: 2, pointsEarned: 64.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '7241', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 9, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 59.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '5099', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 10, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 32.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '4080', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 11, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 31.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2223', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 12, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 30.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '99901', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 13, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 29.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '3493', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 14, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 28.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '5623', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 15, payoutEarned: 0, bountiesCollected: 1, pointsEarned: 30.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '3892', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 16, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 26.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '6689', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 17, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 25.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '7058', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 18, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 24.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '6942', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 19, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 23.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2060', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 20, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 22.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '5747', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 21, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 21.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '99902', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 22, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 20.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2061', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 23, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 19.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '99903', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 24, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 18.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '99904', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 25, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 17.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '3775', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 26, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 16.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2057', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 27, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 15.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '2063', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 28, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 14.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '6545', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 29, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 13.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '4660', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 30, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 11.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: '4920', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 31, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 12.0, eliminatedAt: '2026-01-08T22:00:00.000Z' }
      ]
    },
    {
      id: 'tour-s4g2',
      seasonId: 'season-4',
      date: '2026-07-18',
      time: '11:45 AM',
      location: 'Wasoughal Eagles Club',
      name: 'Season 4, Game 2',
      status: 'draft',
      buyInAmount: 50,
      bountyAmount: 20,
      dealerAppreciationAmount: 5,
      addonAmount: 15,
      addonChips: 15000,
      maxPlayers: 24,
      totalPrizePool: 0,
      totalBountyPool: 0,
      totalDealerAppreciation: 0,
      startingStack: '20,000 Starting Chips',
      roundLength: 18,
      rebuys: 'None — this is a freezeout format',
      lateEntry: 'Allowed through the end of Round 2',
      payoutPercentages: [50, 30, 20, 0, 0, 0, 0, 0, 0, 0],
      entries: [
        { memberId: '6905', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 0, createdAt: '2026-07-18T10:00:00.000Z' },
        { memberId: '3244', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 0, createdAt: '2026-07-18T10:05:00.000Z' },
        { memberId: '2057', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, payoutEarned: 0, bountiesCollected: 0, pointsEarned: 0, createdAt: '2026-07-18T10:10:00.000Z' }
      ]
    }
  ],
  settings: DEFAULT_SETTINGS,
  pendingApprovals: []
};

const defaultMockData: DatabaseState = migrateDatabaseToSequentialIds(rawMockData);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DatabaseState>({
    members: [],
    seasons: [],
    tournaments: [],
    settings: DEFAULT_SETTINGS,
    pendingApprovals: []
  });

  // Setup real-time listeners for Firestore
  useEffect(() => {
    let isUnmounted = false;

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const membersList: Member[] = [];
      snapshot.forEach(docSnap => membersList.push(docSnap.data() as Member));
      if (!isUnmounted) {
        setState(prev => ({ ...prev, members: membersList }));
      }
    });

    const unsubSeasons = onSnapshot(collection(db, 'seasons'), (snapshot) => {
      const seasonsList: Season[] = [];
      snapshot.forEach(docSnap => seasonsList.push(docSnap.data() as Season));
      if (!isUnmounted) {
        setState(prev => ({ ...prev, seasons: seasonsList }));
      }
    });

    const unsubTournaments = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const tournamentsList: Tournament[] = [];
      snapshot.forEach(docSnap => tournamentsList.push(docSnap.data() as Tournament));
      if (!isUnmounted) {
        setState(prev => ({ ...prev, tournaments: tournamentsList }));
      }
    });

    const unsubApprovals = onSnapshot(collection(db, 'pendingApprovals'), (snapshot) => {
      const approvalsList: PendingApproval[] = [];
      snapshot.forEach(docSnap => approvalsList.push(docSnap.data() as PendingApproval));
      if (!isUnmounted) {
        setState(prev => ({ ...prev, pendingApprovals: approvalsList }));
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists() && !isUnmounted) {
        setState(prev => ({ ...prev, settings: docSnap.data() as Settings }));
      }
    });

    return () => {
      isUnmounted = true;
      unsubMembers();
      unsubSeasons();
      unsubTournaments();
      unsubApprovals();
      unsubSettings();
    };
  }, []);

  // Firestore Auto-Seeder and Migration
  useEffect(() => {
    const checkAndSeed = async () => {
      try {
        const membersSnap = await getDocs(collection(db, 'members'));
        if (membersSnap.empty) {
          console.log('Firestore is empty. Starting migration/seeding...');
          let seedData: DatabaseState = defaultMockData;
          
          // Try to read existing local storage database to preserve Season 4, Game 1
          const saved = localStorage.getItem('patms_database');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
                seedData = migrateDatabaseToSequentialIds(parsed);
                console.log('Migrated local storage database to Firestore.');
              }
            } catch (err) {
              console.error('Failed to parse local storage database, falling back to mock data', err);
            }
          }

          // Seed Settings
          await setDoc(doc(db, 'settings', 'main'), seedData.settings || DEFAULT_SETTINGS);

          // Seed Members
          for (const m of seedData.members) {
            await setDoc(doc(db, 'members', m.id), m);
          }

          // Seed Seasons
          for (const s of seedData.seasons) {
            await setDoc(doc(db, 'seasons', s.id), s);
          }

          // Seed Tournaments
          for (const t of seedData.tournaments) {
            await setDoc(doc(db, 'tournaments', t.id), t);
          }

          // Seed Pending Approvals
          if (seedData.pendingApprovals) {
            for (const p of seedData.pendingApprovals) {
              await setDoc(doc(db, 'pendingApprovals', p.id), p);
            }
          }

          console.log('Firestore database successfully initialized.');
        }
      } catch (err) {
        console.error('Error checking/seeding Firestore', err);
      }
    };

    checkAndSeed();
  }, []);

  const activeSeason = state.seasons.find(s => s.isActive) || null;

  // Member Management
  const addMember = async (firstName: string, lastName: string, phone: string, email: string, notes?: string, customId?: string, logoUrl?: string) => {
    let id = '';
    if (customId && customId.trim()) {
      id = customId.trim();
    } else {
      const numbers = state.members.map(m => {
        const parsed = parseInt(m.id, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
      const nextNum = Math.max(100, ...numbers) + 1;
      id = String(nextNum);
    }

    const newMember: Member = {
      id,
      firstName,
      lastName,
      phone,
      email,
      joinedDate: new Date().toISOString().split('T')[0],
      notes,
      isDeleted: false,
      logoUrl: logoUrl || ''
    };
    await setDoc(doc(db, 'members', id), newMember);
  };

  const updateMember = async (id: string, updated: Partial<Member>) => {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    await setDoc(doc(db, 'members', id), { ...member, ...updated }, { merge: true });
  };

  const deleteMember = async (id: string) => {
    const member = state.members.find(m => m.id === id);
    if (!member) return;
    await setDoc(doc(db, 'members', id), { isDeleted: true }, { merge: true });
  };

  // Season Management
  const addSeason = async (name: string, startDate: string, endDate: string, isActive: boolean) => {
    const id = `season-${Date.now()}`;
    const newSeason: Season = { id, name, startDate, endDate, isActive };

    if (isActive) {
      for (const s of state.seasons) {
        if (s.isActive) {
          await setDoc(doc(db, 'seasons', s.id), { isActive: false }, { merge: true });
        }
      }
    }
    await setDoc(doc(db, 'seasons', id), newSeason);
  };

  const updateSeason = async (id: string, updated: Partial<Season>) => {
    if (updated.isActive) {
      for (const s of state.seasons) {
        if (s.id !== id && s.isActive) {
          await setDoc(doc(db, 'seasons', s.id), { isActive: false }, { merge: true });
        }
      }
    }
    await setDoc(doc(db, 'seasons', id), updated, { merge: true });
  };

  const setActiveSeason = async (id: string) => {
    for (const s of state.seasons) {
      await setDoc(doc(db, 'seasons', s.id), { isActive: s.id === id }, { merge: true });
    }
  };

  const deleteSeason = async (id: string) => {
    await deleteDoc(doc(db, 'seasons', id));
  };

  // Tournament Management
  const createTournament = (
    name: string,
    date: string,
    buyIn: number,
    addon: number,
    bounty: number,
    dealerApp: number,
    maxPlayers: number,
    payoutPercentages?: number[],
    time?: string,
    location?: string,
    startingStack?: string,
    roundLength?: number,
    rebuys?: string,
    lateEntry?: string,
    addonChips?: number,
    flyerUrl?: string,
    flyerType?: 'pdf' | 'image' | null,
    highHandAmount?: number
  ) => {
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
      totalDealerAppreciation: 0,
      payoutPercentages: payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0],
      time: time || '7:00 PM',
      location: location || 'Wasougal Eagles Club',
      startingStack: startingStack || '20,000 Starting Chips',
      roundLength: roundLength || 15,
      rebuys: rebuys || 'None',
      lateEntry: lateEntry || 'Allowed',
      addonChips: addonChips || 10000,
      maxPlayers: maxPlayers || 24,
      highHandAmount: highHandAmount || 0,
      flyerUrl: flyerUrl || '',
      flyerType: flyerType || null
    };

    setDoc(doc(db, 'tournaments', id), newTour);
    return id;
  };

  const updateTournament = async (id: string, updated: Partial<Tournament>) => {
    await setDoc(doc(db, 'tournaments', id), updated, { merge: true });
  };

  const deleteTournament = async (id: string) => {
    await deleteDoc(doc(db, 'tournaments', id));
  };

  const registerPlayer = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;
    if (t.entries.some(e => e.memberId === memberId)) return;

    const newEntry: TournamentEntry = {
      memberId,
      hasBuyIn: false,
      hasAddon: false,
      hasDealerAppreciation: false,
      payoutEarned: 0,
      bountiesCollected: 0,
      pointsEarned: 0,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'tournaments', tournamentId), {
      entries: [...t.entries, newEntry]
    }, { merge: true });
  };

  const publicRegisterPlayer = async (
    tournamentId: string,
    player: { firstName: string; lastName: string; phone: string; email: string; memberId?: string }
  ) => {
    const cleanPhone = player.phone.replace(/\D/g, '');
    let member = player.memberId
      ? state.members.find(m => m.id.toUpperCase() === player.memberId!.toUpperCase())
      : undefined;

    if (!member && cleanPhone) {
      member = state.members.find(m => m.phone.replace(/\D/g, '') === cleanPhone);
    }

    let memberId = '';
    if (member) {
      memberId = member.id;
      await setDoc(doc(db, 'members', member.id), {
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone || member.phone
      }, { merge: true });
    } else {
      if (player.memberId) {
        memberId = player.memberId.trim().toUpperCase();
      } else {
        const numbers = state.members.map(m => {
          const parsed = parseInt(m.id, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
        const nextNum = Math.max(100, ...numbers) + 1;
        memberId = String(nextNum);
      }

      const newMember: Member = {
        id: memberId,
        firstName: player.firstName,
        lastName: player.lastName,
        phone: player.phone,
        email: player.email,
        joinedDate: new Date().toISOString().split('T')[0],
        isDeleted: false
      };
      await setDoc(doc(db, 'members', memberId), newMember);
    }

    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (t && !t.entries.some(e => e.memberId === memberId)) {
      const newEntry: TournamentEntry = {
        memberId,
        hasBuyIn: false,
        hasAddon: false,
        hasDealerAppreciation: false,
        payoutEarned: 0,
        bountiesCollected: 0,
        pointsEarned: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'tournaments', tournamentId), {
        entries: [...t.entries, newEntry]
      }, { merge: true });
    }
  };

  const unregisterPlayer = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;
    await setDoc(doc(db, 'tournaments', tournamentId), {
      entries: t.entries.filter(e => e.memberId !== memberId)
    }, { merge: true });
  };

  const togglePlayerCheckIn = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const updatedEntries = t.entries.map(e => {
      if (e.memberId === memberId) {
        const newVal = !e.hasBuyIn;
        return {
          ...e,
          hasBuyIn: newVal,
          hasDealerAppreciation: newVal
        };
      }
      return e;
    });

    await setDoc(doc(db, 'tournaments', tournamentId), {
      entries: updatedEntries
    }, { merge: true });
  };

  const toggleEntryBuyIn = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const updatedEntries = t.entries.map(e => e.memberId === memberId ? { ...e, hasBuyIn: !e.hasBuyIn } : e);
    await setDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries }, { merge: true });
  };

  const toggleEntryAddon = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const updatedEntries = t.entries.map(e => e.memberId === memberId ? { ...e, hasAddon: !e.hasAddon } : e);
    await setDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries }, { merge: true });
  };

  const toggleEntryDealerApp = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const updatedEntries = t.entries.map(e => e.memberId === memberId ? { ...e, hasDealerAppreciation: !e.hasDealerAppreciation } : e);
    await setDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries }, { merge: true });
  };

  const eliminatePlayer = async (tournamentId: string, memberId: string, bountiesWon: number) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const eliminatedCount = t.entries.filter(e => e.eliminatedAt).length;
    const totalEntries = t.entries.filter(e => e.hasBuyIn).length;
    const finishPosition = totalEntries - eliminatedCount;

    const updatedEntries = t.entries.map(e => {
      if (e.memberId === memberId) {
        return {
          ...e,
          eliminatedAt: new Date().toISOString(),
          finishPosition,
          bountiesCollected: bountiesWon
        };
      }
      return e;
    });

    await setDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries }, { merge: true });
  };

  const undoElimination = async (tournamentId: string, memberId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const updatedEntries = t.entries.map(e => {
      if (e.memberId === memberId) {
        return {
          ...e,
          eliminatedAt: undefined,
          eliminatedBy: undefined,
          finishPosition: undefined,
          bountiesCollected: 0
        };
      }
      return e;
    });

    await setDoc(doc(db, 'tournaments', tournamentId), { entries: updatedEntries }, { merge: true });
  };

  const finalizeTournament = async (tournamentId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const entriesCount = t.entries.length;
    if (entriesCount === 0) {
      await setDoc(doc(db, 'tournaments', tournamentId), { status: 'completed' }, { merge: true });
      return;
    }

    let updatedEntries = [...t.entries];
    const remainingPlayers = updatedEntries.filter(e => !e.eliminatedAt);
    if (remainingPlayers.length === 1) {
      const winner = remainingPlayers[0];
      updatedEntries = updatedEntries.map(e => e.memberId === winner.memberId ? { ...e, finishPosition: 1, eliminatedAt: new Date().toISOString() } : e);
    } else if (remainingPlayers.length > 1) {
      let place = remainingPlayers.length;
      remainingPlayers.forEach(p => {
        updatedEntries = updatedEntries.map(e => e.memberId === p.memberId ? { ...e, finishPosition: place--, eliminatedAt: new Date().toISOString() } : e);
      });
    }

    const buyInCount = updatedEntries.filter(e => e.hasBuyIn).length;
    const addonCount = t.totalAddons !== undefined ? t.totalAddons : updatedEntries.filter(e => e.hasAddon).length;
    const bountyCount = updatedEntries.filter(e => e.hasBuyIn).length;
    const dealerCount = updatedEntries.filter(e => e.hasDealerAppreciation).length;

    const netBuyInContribution = t.buyInAmount - t.bountyAmount - t.dealerAppreciationAmount;
    const totalPrizePool = Math.max(0, (buyInCount * netBuyInContribution) + (addonCount * t.addonAmount) - (t.highHandAmount || 0));
    const totalBountyPool = bountyCount * t.bountyAmount;
    const totalDealerAppreciation = dealerCount * t.dealerAppreciationAmount;

    const payoutPrizePool = t.overridePrizePool !== undefined && t.overridePrizePool > 0
      ? t.overridePrizePool
      : totalPrizePool;

    const pctList = t.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
    const payouts = pctList.map(pct => Math.round(payoutPrizePool * (pct / 100)));

    const N = buyInCount;
    const attendancePoints = state.settings.pointsBaseAttendance;

    updatedEntries = updatedEntries.map(e => {
      const pos = e.finishPosition || N;
      const payoutEarned = payouts[pos - 1] || 0;

      const basePositionPoints = N - pos + 1;
      let multiplier = 1;
      if (pos === 1) {
        multiplier = 3;
      } else if (pos >= 2 && pos <= 10) {
        multiplier = 2;
      }
      const pointsEarned = (basePositionPoints * multiplier) + (e.bountiesCollected * 3) + attendancePoints;

      return {
        ...e,
        payoutEarned,
        pointsEarned
      };
    });

    await setDoc(doc(db, 'tournaments', tournamentId), {
      status: 'completed',
      totalPrizePool: payoutPrizePool,
      totalBountyPool,
      totalDealerAppreciation,
      entries: updatedEntries
    }, { merge: true });
  };

  const reopenTournament = async (tournamentId: string) => {
    const t = state.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return;

    const resetEntries = t.entries.map(e => ({
      ...e,
      payoutEarned: 0,
      pointsEarned: 0
    }));

    await setDoc(doc(db, 'tournaments', tournamentId), {
      status: 'active',
      entries: resetEntries
    }, { merge: true });
  };

  const updateSettings = async (settings: Settings) => {
    await setDoc(doc(db, 'settings', 'main'), settings);
  };

  const exportDatabase = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        parsed &&
        Array.isArray(parsed.members) &&
        Array.isArray(parsed.tournaments) &&
        Array.isArray(parsed.seasons) &&
        parsed.settings
      ) {
        const migrated = migrateDatabaseToSequentialIds(parsed);
        setDoc(doc(db, 'settings', 'main'), migrated.settings);
        migrated.members.forEach(m => setDoc(doc(db, 'members', m.id), m));
        migrated.seasons.forEach(s => setDoc(doc(db, 'seasons', s.id), s));
        migrated.tournaments.forEach(t => setDoc(doc(db, 'tournaments', t.id), t));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import database', e);
      return false;
    }
  };

  const submitMemberUpdate = async (memberId: string, phone: string, email: string) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const approvalId = `ap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newApproval: PendingApproval = {
      id: approvalId,
      type: 'update',
      memberId,
      firstName: member.firstName,
      lastName: member.lastName,
      phone,
      email,
      timestamp: new Date().toISOString()
    };

    // Remove prior update approvals for this member
    for (const p of state.pendingApprovals) {
      if (p.memberId === memberId && p.type === 'update') {
        await deleteDoc(doc(db, 'pendingApprovals', p.id));
      }
    }

    await setDoc(doc(db, 'pendingApprovals', approvalId), newApproval);
  };

  const registerGuestPlayer = (firstName: string, lastName: string, phone: string, email: string, logoUrl?: string): string => {
    const numbers = state.members.map(m => {
      const parsed = parseInt(m.id, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
    const nextNum = Math.max(100, ...numbers) + 1;
    const guestId = String(nextNum);

    const newMember: Member = {
      id: guestId,
      firstName,
      lastName,
      phone,
      email,
      joinedDate: new Date().toISOString().split('T')[0],
      isDeleted: false,
      notes: 'Guest Player Registration',
      logoUrl: logoUrl || ''
    };

    const approvalId = `ap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newApproval: PendingApproval = {
      id: approvalId,
      type: 'guest',
      memberId: guestId,
      firstName,
      lastName,
      phone,
      email,
      timestamp: new Date().toISOString()
    };

    setDoc(doc(db, 'members', guestId), newMember);
    setDoc(doc(db, 'pendingApprovals', approvalId), newApproval);

    return guestId;
  };

  const approveMemberUpdate = async (approvalId: string) => {
    const approval = state.pendingApprovals.find(p => p.id === approvalId);
    if (!approval) return;

    if (approval.type === 'update') {
      const member = state.members.find(m => m.id === approval.memberId);
      if (member) {
        await setDoc(doc(db, 'members', approval.memberId), {
          firstName: approval.firstName !== undefined ? approval.firstName : member.firstName,
          lastName: approval.lastName !== undefined ? approval.lastName : member.lastName,
          phone: approval.phone !== undefined ? approval.phone : member.phone,
          email: approval.email !== undefined ? approval.email : member.email,
          textReminders: approval.textReminders !== undefined ? approval.textReminders : (member.textReminders ?? true),
          emailAnnouncements: approval.emailAnnouncements !== undefined ? approval.emailAnnouncements : (member.emailAnnouncements ?? true)
        }, { merge: true });
      }
    } else if (approval.type === 'guest') {
      const newMember: Member = {
        id: approval.memberId,
        firstName: approval.firstName,
        lastName: approval.lastName,
        phone: approval.phone || '',
        email: approval.email || '',
        joinedDate: new Date().toISOString().split('T')[0],
        isDeleted: false,
        notes: 'Approved Member',
        textReminders: approval.textReminders !== undefined ? approval.textReminders : true,
        emailAnnouncements: approval.emailAnnouncements !== undefined ? approval.emailAnnouncements : true
      };
      await setDoc(doc(db, 'members', approval.memberId), newMember);
    }

    await deleteDoc(doc(db, 'pendingApprovals', approvalId));
  };

  const rejectMemberUpdate = async (approvalId: string) => {
    const approval = state.pendingApprovals.find(p => p.id === approvalId);
    if (!approval) return;

    // No need to delete member from members collection because it hasn't been created yet
    

    await deleteDoc(doc(db, 'pendingApprovals', approvalId));
  };

  const submitPlayerInfoForm = async (
    firstName: string,
    lastName: string,
    phone: string,
    email: string,
    textReminders: boolean,
    emailAnnouncements: boolean
  ) => {
    const cleanInputPhone = phone.replace(/\D/g, '');
    const existingMember = state.members.find(m => !m.isDeleted && m.phone.replace(/\D/g, '') === cleanInputPhone);

    const approvalId = `ap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (existingMember) {
      const newApproval: PendingApproval = {
        id: approvalId,
        type: 'update',
        memberId: existingMember.id,
        firstName,
        lastName,
        phone,
        email,
        textReminders,
        emailAnnouncements,
        timestamp: new Date().toISOString()
      };

      for (const p of state.pendingApprovals) {
        if (p.memberId === existingMember.id && p.type === 'update') {
          await deleteDoc(doc(db, 'pendingApprovals', p.id));
        }
      }

      await setDoc(doc(db, 'pendingApprovals', approvalId), newApproval);
    } else {
      const numbers = state.members.map(m => {
        const parsed = parseInt(m.id, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
      const nextNum = Math.max(100, ...numbers) + 1;
      const guestId = String(nextNum);


      const newApproval: PendingApproval = {
        id: approvalId,
        type: 'guest',
        memberId: guestId,
        firstName,
        lastName,
        phone,
        email,
        textReminders,
        emailAnnouncements,
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, 'pendingApprovals', approvalId), newApproval);
    }
  };

  const resetDatabaseToDefault = async () => {
    // Delete all current seasons/tournaments/members/approvals
    // Overwrite with default mock data
    await setDoc(doc(db, 'settings', 'main'), defaultMockData.settings);
    
    // Seed default seasons
    for (const s of defaultMockData.seasons) {
      await setDoc(doc(db, 'seasons', s.id), s);
    }
    // Seed default members
    for (const m of defaultMockData.members) {
      await setDoc(doc(db, 'members', m.id), m);
    }
    // Seed default tournaments
    for (const t of defaultMockData.tournaments) {
      await setDoc(doc(db, 'tournaments', t.id), t);
    }
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
        publicRegisterPlayer,
        unregisterPlayer,
        togglePlayerCheckIn,
        toggleEntryBuyIn,
        toggleEntryAddon,
        toggleEntryDealerApp,
        eliminatePlayer,
        undoElimination,
        finalizeTournament,
        reopenTournament,
        updateSettings,
        importDatabase,
        exportDatabase,
        resetDatabaseToDefault,
        submitMemberUpdate,
        registerGuestPlayer,
        approveMemberUpdate,
        rejectMemberUpdate,
        submitPlayerInfoForm
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
