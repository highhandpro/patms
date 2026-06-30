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
  defaultBuyIn: 40,
  defaultAddon: 10,
  defaultBounty: 5,
  defaultDealerAppreciation: 9,
  pointsBaseAttendance: 10,
  maxPlayersPerTable: 8
};

// Initial default mock database to make the app look stunning right away
const defaultMockData: DatabaseState = {
  members: [
    { id: 'PA-001', firstName: 'Tim', lastName: 'Hufler', phone: '(360) 869-2538', email: 'thufler@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-002', firstName: 'Brian', lastName: 'Pennebaker', phone: '(425) 286-4544', email: 'pennebd@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-003', firstName: 'Derek', lastName: 'Allen', phone: '(360) 772-9768', email: 'steerbully777@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-004', firstName: 'Gabe', lastName: 'Elliott', phone: '(503) 516-1643', email: 'gabelliott@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-005', firstName: 'Tony', lastName: 'Slaven', phone: '(360) 607-8596', email: 'arskaven@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-006', firstName: 'Lynn', lastName: 'Villemyer', phone: '(360) 713-3806', email: 'lvillemyer@gmail.coml', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-007', firstName: 'Chad', lastName: 'Larsen', phone: '(503) 804-2066', email: 'chadelarsen@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-008', firstName: 'Kerri', lastName: 'Lind', phone: '(360) 433-5524', email: 'kerrilind70@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-009', firstName: 'Cristina', lastName: 'Miller', phone: '(480) 688-2757', email: 'cristinammiller@icloud.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-010', firstName: 'Jason', lastName: 'Hofbauer', phone: '(360) 521-7129', email: 'zagsfan78@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-011', firstName: 'Doug', lastName: 'Berg', phone: '(360) 910-6884', email: 'dmberg2@comcast.net', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-012', firstName: 'Christopher', lastName: 'Woody', phone: '(503) 757-1693', email: 'chriswoody1968@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-013', firstName: 'Guy', lastName: 'Vider', phone: '(408) 550-6489', email: 'guy@guyvider.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-014', firstName: 'Dave', lastName: 'Morales', phone: '(360) 609-6724', email: 'd.morales23@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-015', firstName: 'Rachelle', lastName: 'Allen', phone: '(360) 980-3548', email: 'raeallenbooks@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-016', firstName: 'Ron', lastName: 'Hawkins', phone: '(360) 910-1831', email: 'hawkster101@hotmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-017', firstName: 'Brian', lastName: 'Syfrett', phone: '(360) 989-5638', email: 'briansyfrett@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-018', firstName: 'Terri', lastName: 'Angell', phone: '(360) 901-5768', email: 'terter59@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-019', firstName: 'Thomas', lastName: 'Scharf', phone: '(360) 989-7370', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-020', firstName: 'Christopher', lastName: 'Hirsh', phone: '(917) 573-4785', email: 'christopher.hirsh@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-021', firstName: 'Chris', lastName: 'Imai', phone: '(360) 910-3462', email: 'chugluglug@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-022', firstName: 'Bill', lastName: 'Yentsch', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-023', firstName: 'Bruce', lastName: 'Knutson', phone: '(858) 761-8830', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-024', firstName: 'Dan', lastName: 'Grimani', phone: '(777) 777-7777', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-025', firstName: 'James', lastName: 'Marcy', phone: '', email: 'cjmary@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-026', firstName: 'Evan', lastName: 'Elliott', phone: '(360) 726-8122', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-027', firstName: 'Abbi', lastName: 'Sweet', phone: '(360) 947-0933', email: 'abbigaler@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-028', firstName: 'Zac', lastName: 'Hawkins', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-029', firstName: 'Dennis', lastName: 'Mccord', phone: '(360) 921-2486', email: 'dennislmccord@duck.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-030', firstName: 'David', lastName: 'Philossof', phone: '(360) 991-4837', email: 'dpcountry46@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-031', firstName: 'Paul', lastName: 'Hollomon', phone: '(575) 644-1408', email: 'phhollo@aol.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-032', firstName: 'Albert', lastName: 'Jamito', phone: '(360) 719-8906', email: 'albertjh2k@msn.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-033', firstName: 'Angela', lastName: 'Koontz', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-034', firstName: 'Berta', lastName: 'Allen', phone: '(360) 450-1438', email: 'bertadog@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-035', firstName: 'Bill', lastName: 'Baker', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-036', firstName: 'Bill', lastName: 'Foley', phone: '', email: 'tomthumb69@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-037', firstName: 'Carlie', lastName: 'Sharling', phone: '(975) 863-5214', email: 'bkpatroncu@protonmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-038', firstName: 'Chris', lastName: 'Robbins', phone: '(850) 554-9720', email: 'ctrobbins70@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-039', firstName: 'Christopher', lastName: 'Miles', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-040', firstName: 'Cody', lastName: 'Dempsey', phone: '(360) 921-1627', email: 'codydempsey81@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-041', firstName: 'Cody', lastName: 'Glaess', phone: '(541) 921-3011', email: 'codebeng@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-042', firstName: 'Dan', lastName: 'Pietila', phone: '(503) 791-9625', email: 'dan_pietila@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-043', firstName: 'Denny', lastName: 'Wade', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-044', firstName: 'James', lastName: 'Patterson', phone: '', email: 'jmpaterson9@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-045', firstName: 'Jermaine', lastName: 'Spino', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-046', firstName: 'Johnathan', lastName: 'Viloria', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-047', firstName: 'Juanito', lastName: 'Cunanan', phone: '', email: 'juanito.cunanan48@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-048', firstName: 'Kacy', lastName: 'Schlosser Buffum', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-049', firstName: 'Katrina', lastName: 'Hambleton', phone: '', email: 'katrinahambleton@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-050', firstName: 'Luke', lastName: 'Hewlett', phone: '(520) 903-8228', email: 'ljhewlett@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-051', firstName: 'Mark', lastName: 'Browning', phone: '(360) 839-7734', email: 'markbco@yahoo.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-052', firstName: 'Mark', lastName: 'Tanner', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-053', firstName: 'Mary', lastName: 'Lind Handy', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-054', firstName: 'Michelle', lastName: 'Boyle', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-055', firstName: 'Michelle', lastName: 'Hanning', phone: '(360) 624-7343', email: 'mfrogger30@myctl.net', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-056', firstName: 'Mihail', lastName: 'Gizea', phone: '(703) 940-2931', email: 'gizea.v13@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-057', firstName: 'Nichlas', lastName: 'Priest', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-058', firstName: 'Nick', lastName: 'Stoltz', phone: '(702) 493-5485', email: 'dstoltz@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-059', firstName: 'Rita', lastName: 'Turney', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-060', firstName: 'Ryan', lastName: 'Buell', phone: '(360) 989-4050', email: 'ryanbuell15@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-061', firstName: 'Sean', lastName: 'Manley', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-062', firstName: 'Sebastian', lastName: 'Osorio', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-063', firstName: 'Shawn', lastName: 'Cagle', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-064', firstName: 'Steve', lastName: 'Hambleton', phone: '', email: 'steve@wheelkraftnw.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-065', firstName: 'Steve', lastName: 'Hanning', phone: '(360) 624-8739', email: 'smhanning@myctl.net', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-066', firstName: 'Test', lastName: 'Sample', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-067', firstName: 'Tiffany', lastName: 'Field', phone: '(702) 665-3555', email: 'fieldtjean@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-068', firstName: 'Tom', lastName: 'Colemon', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-069', firstName: 'Tom', lastName: 'Scharf', phone: '(360) 989-7370', email: 't.e.scharf@gmail.com', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-070', firstName: 'Tory', lastName: 'Thom', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-071', firstName: 'Travis', lastName: 'Baker', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-072', firstName: 'Trent', lastName: 'Sundvick', phone: '', email: '', joinedDate: '2026-01-01', notes: '', isDeleted: false },
    { id: 'PA-073', firstName: 'Wendy', lastName: 'Bumgardner', phone: '(503) 799-1004', email: 'walking@teleport.com', joinedDate: '2026-01-01', notes: '', isDeleted: false }
  ],
  seasons: [
    { id: 'season-2026', name: 'Season 2026', startDate: '2026-01-01', endDate: '2026-12-31', isActive: false },
    { id: 'season-4', name: 'Season 4', startDate: '2026-01-01', endDate: '2026-06-30', isActive: true }
  ],
  tournaments: [
    {
      id: 'tour-s4g1',
      seasonId: 'season-4',
      date: '2026-01-08',
      name: 'Season 4, Game 1',
      status: 'completed',
      buyInAmount: 40,
      addonAmount: 10,
      bountyAmount: 5,
      dealerAppreciationAmount: 9,
      totalPrizePool: 1450,
      totalBountyPool: 155,
      totalDealerAppreciation: 279,
      entries: [
        { memberId: 'PA-001', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 1, payoutEarned: 522.0, bountiesCollected: 12, pointsEarned: 139.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-002', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 2, payoutEarned: 334, bountiesCollected: 2, pointsEarned: 76.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-003', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 3, payoutEarned: 203.00000000000003, bountiesCollected: 2, pointsEarned: 74.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-004', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 4, payoutEarned: 145.0, bountiesCollected: 4, pointsEarned: 78.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-005', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 5, payoutEarned: 116.0, bountiesCollected: 3, pointsEarned: 73.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-006', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 6, payoutEarned: 73, bountiesCollected: 0, pointsEarned: 62.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-007', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 7, payoutEarned: 58.0, bountiesCollected: 2, pointsEarned: 66.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-008', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 8, payoutEarned: 0.0, bountiesCollected: 2, pointsEarned: 64.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-009', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 9, payoutEarned: 0.0, bountiesCollected: 1, pointsEarned: 59.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-010', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 10, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 54.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-011', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 11, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 31.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-012', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 12, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 30.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-013', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 13, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 29.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-014', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 14, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 28.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-015', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 15, payoutEarned: 0.0, bountiesCollected: 1, pointsEarned: 30.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-016', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 16, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 26.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-017', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 17, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 25.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-018', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 18, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 24.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-019', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 19, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 23.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-020', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 20, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 22.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-021', hasBuyIn: true, hasAddon: true, hasDealerAppreciation: true, finishPosition: 21, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 21.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-022', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 22, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 10.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-023', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 23, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 19.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-024', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 24, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 8.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-025', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 25, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 17.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-026', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 26, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 16.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-027', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 27, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 15.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-028', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 28, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 14.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-029', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 29, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 13.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-030', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 30, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 12.0, eliminatedAt: '2026-01-08T22:00:00.000Z' },
        { memberId: 'PA-031', hasBuyIn: true, hasAddon: false, hasDealerAppreciation: true, finishPosition: 31, payoutEarned: 0.0, bountiesCollected: 0, pointsEarned: 11.0, eliminatedAt: '2026-01-08T22:00:00.000Z' }
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
              Math.ceil(totalPrizePool * 0.70),
              Math.ceil(totalPrizePool * 0.30)
            ];
          } else if (entriesCount <= 20) {
            // 1st: 50%, 2nd: 30%, 3rd: 20%
            payouts = [
              Math.ceil(totalPrizePool * 0.50),
              Math.ceil(totalPrizePool * 0.30),
              Math.ceil(totalPrizePool * 0.20)
            ];
          } else {
            // 21+ players: 1st: 45%, 2nd: 25%, 3rd: 18%, 4th: 12%
            payouts = [
              Math.ceil(totalPrizePool * 0.45),
              Math.ceil(totalPrizePool * 0.25),
              Math.ceil(totalPrizePool * 0.18),
              Math.ceil(totalPrizePool * 0.12)
            ];
          }

          // Distribute payouts and points
          const N = entriesCount; // Field size
          const attendancePoints = prev.settings.pointsBaseAttendance;

          updatedEntries = updatedEntries.map(e => {
            const pos = e.finishPosition || N;
            
            // Payout
            const payoutEarned = payouts[pos - 1] || 0;

            // Points Formula: (Base Position Points * Multiplier) + (Bounties * 3) + 10
            // where Base Position Points = Field Size - Finish Position + 1
            // Multipliers: 1st place gets 3x, 2nd to 10th (Final Table) gets 2x, 11th+ gets 1x.
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
