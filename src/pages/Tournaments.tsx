import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import type { Member } from '../types';
import { formatDate } from '../utils/stats';
import { generateSignInSheetPDF, generateTDScoreSheetPDF } from '../utils/pdf';
import { SeatingDisplayModal } from '../components/SeatingDisplayModal';
import { EliminationModal } from '../components/EliminationModal';
import { LateEntryModal } from '../components/LateEntryModal';
import { TournamentClock } from '../components/TournamentClock';
import { 
  Trophy, Play, RotateCcw, Plus, Trash2, 
  UserMinus, ChevronLeft, Unlock, Calendar, ShieldAlert, Award
} from 'lucide-react';

interface TournamentsProps {
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
  isCreateTourOpen: boolean;
  setIsCreateTourOpen: (open: boolean) => void;
  isSubAdmin?: boolean;
  isChiefAdmin?: boolean;
}

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};



export const Tournaments: React.FC<TournamentsProps> = ({
  selectedTournamentId,
  setSelectedTournamentId,
  isCreateTourOpen,
  setIsCreateTourOpen,
  isSubAdmin,
  isChiefAdmin
}) => {
  const { 
    state, 
    activeSeason,
    createTournament, 
    updateTournament, 
    deleteTournament,
    registerPlayer,
    updateMember,
    unregisterPlayer,
    toggleEntryBuyIn,
    toggleEntryDealerApp,
    eliminatePlayer,
    undoElimination,
    finalizeTournament,
    reopenTournament
  } = useApp();

  // Create Form State
  const [tourName, setTourName] = useState('');
  const [tourDate, setTourDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyIn, setBuyIn] = useState(state.settings.defaultBuyIn);
  const [addon, setAddon] = useState(state.settings.defaultAddon);
  const [bounty, setBounty] = useState(state.settings.defaultBounty);
  const [dealerApp, setDealerApp] = useState(state.settings.defaultDealerAppreciation);

  // Active Sub-tab inside Selected Tournament
  // draft: 'checkin' | 'seating'
  // active: 'seating' | 'players'
  // completed: 'results'
  const [subTab, setSubTab] = useState<'checkin' | 'seating' | 'players' | 'results' | 'rsvp' | 'summary' | 'print' | 'clock' | 'accounting'>('rsvp');
  const [printType, setPrintType] = useState<'signin' | 'scoresheet'>('signin');

  // Player search in checkin
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Search input refs for autofocusing
  const rsvpSearchRef = useRef<HTMLInputElement>(null);
  const checkinSearchRef = useRef<HTMLInputElement>(null);
  const lateSearchRef = useRef<HTMLInputElement>(null);

  // Seating State (stored in localStorage keyed by tournament ID)
  const [seating, setSeating] = useState<Record<string, string[]>>({});
  const [dealers, setDealers] = useState<Record<string, string>>({});
  const [preassignedDealers, setPreassignedDealers] = useState<string[]>([]);
  const [isDisplayModeOpen, setIsDisplayModeOpen] = useState(false);

  // Late Entry state variables
  const [isLateEntryOpen, setIsLateEntryOpen] = useState(false);
  const [selectedLateMemberId, setSelectedLateMemberId] = useState('');
  const [selectedLateTable, setSelectedLateTable] = useState('');
  const [lateSearchQuery, setLateSearchQuery] = useState('');
  const [showLateDropdown, setShowLateDropdown] = useState(false);

  // Elimination selector modal state
  const [eliminatingPlayerId, setEliminatingPlayerId] = useState<string | null>(null);
  const [bountiesWon, setBountiesWon] = useState<number>(0);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [payoutPcts, setPayoutPcts] = useState<number[]>([50, 30, 20, 0, 0, 0, 0, 0, 0, 0]);

  // Payout and Add-ons configuration states
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [modalAddons, setModalAddons] = useState(0);
  const [modalPayoutPcts, setModalPayoutPcts] = useState<number[]>([50, 30, 20, 0, 0, 0, 0, 0, 0, 0]);
  const [modalHighHand, setModalHighHand] = useState(0);
  const [modalBubble, setModalBubble] = useState(0);

  // Check-in phone prompt modal states
  const [phonePromptMember, setPhonePromptMember] = useState<Member | null>(null);
  const [phonePromptInput, setPhonePromptInput] = useState('');
  const [onPhonePromptComplete, setOnPhonePromptComplete] = useState<((phone?: string) => void) | null>(null);

  // Edit Tournament Details states
  const [isEditTourDetailsOpen, setIsEditTourDetailsOpen] = useState(false);
  const [editTourName, setEditTourName] = useState('');
  const [editTourDate, setEditTourDate] = useState('');
  const [editBuyIn, setEditBuyIn] = useState(50);
  const [editAddon, setEditAddon] = useState(15);
  const [editBounty, setEditBounty] = useState(20);
  const [editDealerApp, setEditDealerApp] = useState(5);
  const [editTime, setEditTime] = useState('7:00 PM');
  const [editLocation, setEditLocation] = useState('Wasougal Eagles Club');
  const [editStartingStack, setEditStartingStack] = useState('20,000 Starting Chips');
  const [editRoundLength, setEditRoundLength] = useState(15);
  const [editRebuys, setEditRebuys] = useState('None');
  const [editLateEntry, setEditLateEntry] = useState('Allowed');
  const [editAddonChips, setEditAddonChips] = useState(10000);
  const [editMaxPlayers, setEditMaxPlayers] = useState(24);
  const [editHighHand, setEditHighHand] = useState(100);
  const [editFlyerUrl, setEditFlyerUrl] = useState('');
  const [editFlyerType, setEditFlyerType] = useState<'pdf' | 'image' | null>(null);

  // Create Tournament states
  const [tourTime, setTourTime] = useState('7:00 PM');
  const [tourLocation, setTourLocation] = useState('Wasougal Eagles Club');
  const [tourStartingStack, setTourStartingStack] = useState('20,000 Starting Chips');
  const [tourRoundLength, setTourRoundLength] = useState(15);
  const [tourRebuys, setTourRebuys] = useState('None');
  const [tourLateEntry, setTourLateEntry] = useState('Allowed');
  const [tourAddonChips, setTourAddonChips] = useState(10000);
  const [tourMaxPlayers, setTourMaxPlayers] = useState(24);
  const [tourHighHand, setTourHighHand] = useState(100);

  useEffect(() => {
    if (state.settings && isCreateTourOpen) {
      setBuyIn(state.settings.defaultBuyIn || 50);
      setAddon(state.settings.defaultAddon || 15);
      setBounty(state.settings.defaultBounty || 20);
      setDealerApp(state.settings.defaultDealerAppreciation || 5);
    }
  }, [state.settings, isCreateTourOpen]);

  // Create Tournament Flyer states
  const [tourFlyerUrl, setTourFlyerUrl] = useState('');
  const [tourFlyerType, setTourFlyerType] = useState<'pdf' | 'image' | null>(null);

  // Load tournament specific states when ID changes
  const activeTournament = state.tournaments.find(t => t.id === selectedTournamentId) || null;

  useEffect(() => {
    if (activeTournament) {
      setModalAddons(activeTournament.totalAddons || 0);
      setModalPayoutPcts(activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0]);
      setModalHighHand(activeTournament.highHandAmount || 0);
      setModalBubble(activeTournament.bubbleAmount || 0);
    }
  }, [activeTournament, isPayoutModalOpen]);

  useEffect(() => {
    if (activeTournament) {
      // Default sub-tab based on status
      if (activeTournament.status === 'draft') setSubTab('rsvp');
      else if (activeTournament.status === 'active') setSubTab('players');
      else if (activeTournament.status === 'completed') setSubTab('results');

      // Load seating
      if (activeTournament.seating) {
        setSeating(activeTournament.seating);
      } else {
        const savedSeating = localStorage.getItem(`patms_seating_${activeTournament.id}`);
        if (savedSeating) {
          try {
            const parsed = JSON.parse(savedSeating);
            setSeating(parsed);
            updateTournament(activeTournament.id, { seating: parsed });
          } catch (e) {
            setSeating({});
          }
        } else {
          setSeating({});
        }
      }

      // Load dealers
      if (activeTournament.dealers) {
        setDealers(activeTournament.dealers);
      } else {
        const savedDealers = localStorage.getItem(`patms_dealers_${activeTournament.id}`);
        if (savedDealers) {
          try {
            const parsed = JSON.parse(savedDealers);
            setDealers(parsed);
            updateTournament(activeTournament.id, { dealers: parsed });
          } catch (e) {
            setDealers({});
          }
        } else {
          setDealers({});
        }
      }

      // Load preassigned dealers
      if (activeTournament.preassignedDealers) {
        setPreassignedDealers(activeTournament.preassignedDealers);
      } else {
        const savedPreassigned = localStorage.getItem(`patms_preassigned_dealers_${activeTournament.id}`);
        if (savedPreassigned) {
          try {
            const parsed = JSON.parse(savedPreassigned);
            setPreassignedDealers(parsed);
            updateTournament(activeTournament.id, { preassignedDealers: parsed });
          } catch (e) {
            setPreassignedDealers([]);
          }
        } else {
          setPreassignedDealers([]);
        }
      }
    }
  }, [selectedTournamentId, activeTournament?.status]);

  // Keep local states synced in real-time if updated on other clients
  useEffect(() => {
    if (activeTournament) {
      if (activeTournament.seating) {
        setSeating(activeTournament.seating);
      }
      if (activeTournament.dealers) {
        setDealers(activeTournament.dealers);
      }
      if (activeTournament.preassignedDealers) {
        setPreassignedDealers(activeTournament.preassignedDealers);
      }
    }
  }, [
    activeTournament?.seating,
    activeTournament?.dealers,
    activeTournament?.preassignedDealers
  ]);

  // Seating Algorithm based on seatingChart.xlsx rules
  const getTableConfigurations = (n: number) => {
    let numTables = 1;
    let tableNames = ['red table'];
    
    if (n > 10 && n <= 20) {
      numTables = 2;
      tableNames = ['red table', 'blue table'];
    } else if (n > 20 && n <= 30) {
      numTables = 3;
      tableNames = ['red table', 'blue table', 'gold table'];
    } else if (n > 30 && n <= 37) {
      numTables = 4;
      tableNames = ['red table', 'blue table', 'gold table', 'gray table'];
    } else if (n > 37) {
      numTables = 5;
      tableNames = ['red table', 'blue table', 'gold table', 'gray table', 'purple table'];
    }
    
    const baseSize = Math.floor(n / numTables);
    const remainder = n % numTables;
    
    const configs: Record<string, number> = {};
    tableNames.forEach((name, idx) => {
      configs[name] = baseSize + (idx < remainder ? 1 : 0);
    });
    
    return configs;
  };

  const toggleDealerStatus = (playerId: string, tableName: string) => {
    if (!activeTournament) return;
    
    let updatedPreassigned = [...preassignedDealers];
    const newDealers = { ...dealers };
    const newSeating = { ...seating };

    if (updatedPreassigned.includes(playerId)) {
      // Remove dealer
      updatedPreassigned = updatedPreassigned.filter(id => id !== playerId);
      if (newDealers[tableName] === playerId) {
        // If they were the primary dealer, clear them
        delete newDealers[tableName];
        // If there are other dealers at this table, promote one to primary dealer
        const otherDealersAtTable = (newSeating[tableName] || []).filter(id => id !== playerId && updatedPreassigned.includes(id));
        if (otherDealersAtTable.length > 0) {
          newDealers[tableName] = otherDealersAtTable[0];
        }
      }
    } else {
      // Add dealer
      updatedPreassigned.push(playerId);
      
      // Find if there is any table that currently has 0 dealers
      let tableWithoutDealer = '';
      for (const [tName, tPlayers] of Object.entries(newSeating)) {
        const hasDealer = tPlayers.some(pId => pId && updatedPreassigned.includes(pId));
        if (!hasDealer) {
          tableWithoutDealer = tName;
          break;
        }
      }

      if (tableWithoutDealer && tableWithoutDealer !== tableName) {
        // Swap playerId with a non-dealer from that table to keep sizes balanced
        const sourcePlayers = [...(newSeating[tableName] || Array(10).fill(""))];
        const targetPlayers = [...(newSeating[tableWithoutDealer] || Array(10).fill(""))];

        // Find a non-dealer in target table
        const nonDealerIdxInTarget = targetPlayers.findIndex(pId => pId && !updatedPreassigned.includes(pId));

        if (nonDealerIdxInTarget !== -1) {
          const targetPlayerId = targetPlayers[nonDealerIdxInTarget];
          const sourcePlayerIdx = sourcePlayers.indexOf(playerId);

          if (sourcePlayerIdx !== -1) {
            // Perform the swap
            sourcePlayers[sourcePlayerIdx] = targetPlayerId;
            targetPlayers[nonDealerIdxInTarget] = playerId;

            // Move the new dealer to Seat 1 (index 0) of the target table by swapping positions
            const targetPlayerCurrentIdx = targetPlayers.indexOf(playerId);
            if (targetPlayerCurrentIdx !== -1 && targetPlayerCurrentIdx !== 0) {
              const prevSeat1 = targetPlayers[0];
              targetPlayers[0] = playerId;
              targetPlayers[targetPlayerCurrentIdx] = prevSeat1;
            }

            newSeating[tableName] = sourcePlayers;
            newSeating[tableWithoutDealer] = targetPlayers;
            newDealers[tableWithoutDealer] = playerId;
          }
        }
      } else {
        // Standard flow: if table has no primary dealer, make this player the primary dealer and move to Seat 1
        if (!newDealers[tableName]) {
          newDealers[tableName] = playerId;
          
          // Move player to Seat 1 (index 0) of this table by swapping positions
          const players = [...(newSeating[tableName] || Array(10).fill(""))];
          const targetIdx = players.indexOf(playerId);
          if (targetIdx !== -1) {
            const prevSeat1 = players[0];
            players[0] = playerId;
            players[targetIdx] = prevSeat1;
            newSeating[tableName] = players;
          }
        }
      }
    }

    setDealers(newDealers);
    localStorage.setItem(`patms_dealers_${activeTournament.id}`, JSON.stringify(newDealers));
    setSeating(newSeating);
    localStorage.setItem(`patms_seating_${activeTournament.id}`, JSON.stringify(newSeating));
    setPreassignedDealers(updatedPreassigned);
    localStorage.setItem(`patms_preassigned_dealers_${activeTournament.id}`, JSON.stringify(updatedPreassigned));
    updateTournament(activeTournament.id, {
      dealers: newDealers,
      seating: newSeating,
      preassignedDealers: updatedPreassigned
    });
  };

  const toggleCheckedInDealer = (playerId: string) => {
    if (!activeTournament) return;

    const hasSeating = Object.keys(seating).length > 0;

    if (hasSeating) {
      let tableFound = '';
      for (const [tableName, players] of Object.entries(seating)) {
        if (players.includes(playerId)) {
          tableFound = tableName;
          break;
        }
      }
      if (tableFound) {
        toggleDealerStatus(playerId, tableFound);
      }
    } else {
      let updated;
      if (preassignedDealers.includes(playerId)) {
        updated = preassignedDealers.filter(id => id !== playerId);
      } else {
        updated = [...preassignedDealers, playerId];
      }
      setPreassignedDealers(updated);
      localStorage.setItem(`patms_preassigned_dealers_${activeTournament.id}`, JSON.stringify(updated));
      updateTournament(activeTournament.id, { preassignedDealers: updated });
    }
  };

  const generateSeating = () => {
    if (!activeTournament) return;
    const players = activeTournament.entries.filter(e => e.hasBuyIn).map(e => e.memberId);
    if (players.length === 0) return;

    const derekMember = state.members.find(m => m.email.toLowerCase() === 'steerbully777@gmail.com');
    const derekId = derekMember ? derekMember.id : '';
    const isDerekPlaying = derekId && players.includes(derekId);

    let checkedInDealers = players.filter(id => preassignedDealers.includes(id));
    let checkedInNonDealers = players.filter(id => !preassignedDealers.includes(id));

    if (isDerekPlaying) {
      if (!checkedInDealers.includes(derekId)) {
        checkedInDealers.push(derekId);
      }
      checkedInNonDealers = checkedInNonDealers.filter(id => id !== derekId);
    }

    const tableConfigs = getTableConfigurations(players.length);

    const getLastName = (memberId: string) => {
      const m = state.members.find(member => member.id === memberId);
      return m ? m.lastName.trim().toLowerCase() : "";
    };

    const evaluateLayout = (layout: Record<string, string[]>) => {
      let penalty = 0;

      Object.entries(layout).forEach(([_, seats]) => {
        const seated = seats
          .map((id, index) => ({ id, index, lastName: id ? getLastName(id) : "" }))
          .filter(p => p.id !== "");

        const lastNameCounts: Record<string, number> = {};
        seated.forEach(p => {
          if (p.lastName) {
            lastNameCounts[p.lastName] = (lastNameCounts[p.lastName] || 0) + 1;
          }
        });

        Object.values(lastNameCounts).forEach(count => {
          if (count > 1) {
            penalty += (count - 1) * 10000;
          }
        });

        for (let i = 0; i < seated.length; i++) {
          for (let j = i + 1; j < seated.length; j++) {
            const pA = seated[i];
            const pB = seated[j];
            if (pA.lastName && pA.lastName === pB.lastName) {
              const diff = Math.abs(pA.index - pB.index);
              const dist = Math.min(diff, 10 - diff);

              if (dist <= 3) {
                penalty += (4 - dist) * 1000;
              }
              penalty += (5 - dist) * 10;
            }
          }
        }
      });

      return penalty;
    };

    const generateCandidateLayout = (
      shuffledDealers: string[],
      shuffledNonDealers: string[]
    ) => {
      const candidateSeating: Record<string, string[]> = {};
      const candidateDealers: Record<string, string> = {};

      const dealersWithoutDerek = shuffledDealers.filter(id => id !== derekId);
      let dealerIdx = 0;
      let nonDealerIdx = 0;

      Object.entries(tableConfigs).forEach(([tableName, size]) => {
        const tablePlayers: string[] = [];
        let dealerId = "";

        if (tableName === 'red table' && isDerekPlaying) {
          dealerId = derekId;
          tablePlayers.push(dealerId);
          candidateDealers[tableName] = dealerId;
        } else if (dealerIdx < dealersWithoutDerek.length) {
          dealerId = dealersWithoutDerek[dealerIdx++];
          tablePlayers.push(dealerId);
          candidateDealers[tableName] = dealerId;
        }

        const remainingTablePlayers: string[] = [];
        while (tablePlayers.length + remainingTablePlayers.length < size) {
          if (nonDealerIdx < shuffledNonDealers.length) {
            remainingTablePlayers.push(shuffledNonDealers[nonDealerIdx++]);
          } else if (dealerIdx < dealersWithoutDerek.length) {
            remainingTablePlayers.push(dealersWithoutDerek[dealerIdx++]);
          } else {
            break;
          }
        }

        const seats = Array(10).fill("");
        if (dealerId) {
          seats[0] = dealerId;
          const availableIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          remainingTablePlayers.forEach((pId, i) => {
            seats[availableIndices[i]] = pId;
          });
        } else {
          const availableIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          remainingTablePlayers.forEach((pId, i) => {
            seats[availableIndices[i]] = pId;
          });
        }

        candidateSeating[tableName] = seats;
      });

      return { seating: candidateSeating, dealers: candidateDealers };
    };

    let bestSeating: Record<string, string[]> = {};
    let bestDealers: Record<string, string> = {};
    let minPenalty = Infinity;

    for (let trial = 0; trial < 3000; trial++) {
      const trialDealers = [...checkedInDealers].sort(() => Math.random() - 0.5);
      const trialNonDealers = [...checkedInNonDealers].sort(() => Math.random() - 0.5);

      const candidate = generateCandidateLayout(trialDealers, trialNonDealers);
      const penalty = evaluateLayout(candidate.seating);

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestSeating = candidate.seating;
        bestDealers = candidate.dealers;
      }

      if (penalty === 0) {
        break;
      }
    }

    setSeating(bestSeating);
    localStorage.setItem(`patms_seating_${activeTournament.id}`, JSON.stringify(bestSeating));
    
    setDealers(bestDealers);
    localStorage.setItem(`patms_dealers_${activeTournament.id}`, JSON.stringify(bestDealers));

    let updatedPreassigned = [...preassignedDealers];
    if (isDerekPlaying && !updatedPreassigned.includes(derekId)) {
      updatedPreassigned.push(derekId);
      setPreassignedDealers(updatedPreassigned);
      localStorage.setItem(`patms_preassigned_dealers_${activeTournament.id}`, JSON.stringify(updatedPreassigned));
    }

    updateTournament(activeTournament.id, {
      seating: bestSeating,
      dealers: bestDealers,
      preassignedDealers: updatedPreassigned
    });
  };

  const movePlayerTable = (playerId: string, sourceTable: string, targetTable: string) => {
    const updated = { ...seating };
    const updatedDealers = { ...dealers };
    const isDealer = preassignedDealers.includes(playerId);

    // Remove from source table
    if (updated[sourceTable]) {
      updated[sourceTable] = updated[sourceTable].map(id => id === playerId ? "" : id);
    }
    if (updatedDealers[sourceTable] === playerId) {
      delete updatedDealers[sourceTable];
    }

    // Add to target table
    const targetPlayers = [...(updated[targetTable] || Array(10).fill(""))];
    
    if (isDealer && !updatedDealers[targetTable]) {
      // If they are a dealer and target table has no dealer, make them the dealer
      updatedDealers[targetTable] = playerId;
      
      // Place them at Seat 1 (index 0) of target table
      const prevSeat1 = targetPlayers[0];
      targetPlayers[0] = playerId;
      
      // If there was a player at Seat 1, move them to the first empty slot
      if (prevSeat1) {
        const firstEmptyIdx = targetPlayers.indexOf("", 1); // search from index 1
        if (firstEmptyIdx !== -1) {
          targetPlayers[firstEmptyIdx] = prevSeat1;
        } else {
          targetPlayers.push(prevSeat1);
        }
      }
    } else {
      // Standard non-dealer placement (or if target table already has a dealer)
      const firstEmptyIdx = targetPlayers.indexOf("");
      if (firstEmptyIdx !== -1) {
        targetPlayers[firstEmptyIdx] = playerId;
      } else {
        targetPlayers.push(playerId);
      }
    }
    
    updated[targetTable] = targetPlayers;

    const hasAnyPlayers = updated[sourceTable]?.some(id => id !== "") ?? false;
    if (!hasAnyPlayers && updated[sourceTable]) {
      delete updated[sourceTable];
    }

    setSeating(updated);
    localStorage.setItem(`patms_seating_${activeTournament!.id}`, JSON.stringify(updated));
    setDealers(updatedDealers);
    localStorage.setItem(`patms_dealers_${activeTournament!.id}`, JSON.stringify(updatedDealers));

    updateTournament(activeTournament!.id, {
      seating: updated,
      dealers: updatedDealers
    });
  };

  const exportTournamentResultsCSV = (tournament: any) => {
    const headers = ["Rank", "Player Name", "Player ID", "Buy-in", "Add-on", "ToC Appreciation", "Bounties Collected", "Cash Payout", "Points Earned"];
    const rows = [...tournament.entries]
      .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99))
      .map(entry => {
        const name = getMemberName(entry.memberId);
        return [
          entry.finishPosition || "",
          name,
          entry.memberId,
          "Yes",
          entry.hasAddon ? "Yes" : "No",
          entry.hasDealerAppreciation ? "Yes" : "No",
          entry.bountiesCollected,
          entry.payoutEarned,
          entry.pointsEarned
        ];
      });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tournament_${tournament.name.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitLateEntry = () => {
    if (!activeTournament || !selectedLateMemberId || !selectedLateTable) {
      alert("Please select a player and a destination table.");
      return;
    }

    if (activeTournament.maxPlayers && activeTournament.entries.length >= activeTournament.maxPlayers) {
      const confirm = window.confirm(`Warning: The tournament limit of ${activeTournament.maxPlayers} players has been reached. Do you want to override this limit?`);
      if (!confirm) return;
    }

    triggerCheckInFlow(selectedLateMemberId, async (phone) => {
      if (phone) {
        await updateMember(selectedLateMemberId, { phone });
      }

      const newEntry = {
        memberId: selectedLateMemberId,
        hasBuyIn: true,
        hasAddon: false,
        hasDealerAppreciation: true,
        payoutEarned: 0,
        bountiesCollected: 0,
        pointsEarned: 0,
        createdAt: new Date().toISOString()
      };

      const updatedEntries = [...activeTournament.entries, newEntry];

      const updatedSeating = { ...seating };
      const targetPlayers = [...(updatedSeating[selectedLateTable] || Array(10).fill(""))];
      const firstEmptyIdx = targetPlayers.indexOf("");
      if (firstEmptyIdx !== -1) {
        targetPlayers[firstEmptyIdx] = selectedLateMemberId;
      } else {
        targetPlayers.push(selectedLateMemberId);
      }
      updatedSeating[selectedLateTable] = targetPlayers;

      setSeating(updatedSeating);
      localStorage.setItem(`patms_seating_${activeTournament.id}`, JSON.stringify(updatedSeating));
      await updateTournament(activeTournament.id, {
        entries: updatedEntries,
        seating: updatedSeating
      });

      setIsLateEntryOpen(false);
      setSelectedLateMemberId('');
      setSelectedLateTable('');
      setLateSearchQuery('');
    });
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourName.trim()) return;

    const newId = createTournament(
      tourName, 
      tourDate, 
      buyIn, 
      addon, 
      bounty, 
      dealerApp, 
      tourMaxPlayers, 
      payoutPcts,
      tourTime,
      tourLocation,
      tourStartingStack,
      tourRoundLength,
      tourRebuys,
      tourLateEntry,
      tourAddonChips,
      tourFlyerUrl,
      tourFlyerType,
      tourHighHand
    );
    setIsCreateTourOpen(false);
    setSelectedTournamentId(newId);
    
    // Reset inputs
    setTourName('');
    setTourFlyerUrl('');
    setTourFlyerType(null);
  };

  const openEditTourDetails = () => {
    if (!activeTournament) return;
    setEditTourName(activeTournament.name);
    setEditTourDate(activeTournament.date);
    setEditBuyIn(activeTournament.buyInAmount);
    setEditAddon(activeTournament.addonAmount);
    setEditBounty(activeTournament.bountyAmount);
    setEditDealerApp(activeTournament.dealerAppreciationAmount);
    setEditTime(activeTournament.time || '7:00 PM');
    setEditLocation(activeTournament.location || 'Wasougal Eagles Club');
    setEditStartingStack(activeTournament.startingStack || '20,000 Starting Chips');
    setEditRoundLength(activeTournament.roundLength || 15);
    setEditRebuys(activeTournament.rebuys || 'None');
    setEditLateEntry(activeTournament.lateEntry || 'Allowed');
    setEditAddonChips(activeTournament.addonChips || 10000);
    setEditMaxPlayers(activeTournament.maxPlayers || 24);
    setEditHighHand(activeTournament.highHandAmount !== undefined ? activeTournament.highHandAmount : 100);
    setEditFlyerUrl(activeTournament.flyerUrl || '');
    setEditFlyerType(activeTournament.flyerType || null);
    setIsEditTourDetailsOpen(true);
  };

  const handleSaveTourDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament) return;
    
    await updateTournament(activeTournament.id, {
      name: editTourName,
      date: editTourDate,
      buyInAmount: editBuyIn,
      addonAmount: editAddon,
      bountyAmount: editBounty,
      dealerAppreciationAmount: editDealerApp,
      time: editTime,
      location: editLocation,
      startingStack: editStartingStack,
      roundLength: editRoundLength,
      rebuys: editRebuys,
      lateEntry: editLateEntry,
      addonChips: editAddonChips,
      maxPlayers: editMaxPlayers,
      highHandAmount: editHighHand,
      flyerUrl: editFlyerUrl,
      flyerType: editFlyerType
    });
    
    setIsEditTourDetailsOpen(false);
  };

  const handleDeleteTour = (id: string, name: string) => {
    const t = state.tournaments.find(tour => tour.id === id);
    if (!t) return;

    let confirmMsg = `Are you sure you want to permanently delete tournament "${name}"? This cannot be undone.`;
    if (t.status === 'completed') {
      confirmMsg = `WARNING: Tournament "${name}" is completed and finalized. Deleting it will permanently remove its points/payouts and instantly recalculate the seasonal standings. Do you want to proceed?`;
    }

    if (confirm(confirmMsg)) {
      deleteTournament(id);
      setSelectedTournamentId(null);
    }
  };

  const handleStartTournament = () => {
    if (!activeTournament) return;
    if (activeTournament.entries.length < 2) {
      alert('You need at least 2 registered players to start a tournament.');
      return;
    }
    
    // Generate seating automatically if not already set
    if (Object.keys(seating).length === 0) {
      generateSeating();
    }

    updateTournament(activeTournament.id, { status: 'active' });
    setSubTab('players');
  };

  const handleFinalize = () => {
    if (!activeTournament) return;
    
    const remaining = activeTournament.entries.filter(e => !e.eliminatedAt);
    if (remaining.length > 1) {
      alert(`There are still ${remaining.length} players active. Finalize all eliminations down to 1 player first.`);
      return;
    }

    setShowFinalizeModal(true);
  };

  const handleReopen = () => {
    if (!activeTournament) return;
    if (confirm('Reopen this tournament? Season standings points and payouts will be cleared until re-finalized.')) {
      reopenTournament(activeTournament.id);
      setSubTab('players');
    }
  };

  // Search autocomplete in checkin
  const availableMembers = state.members.filter(m => 
    !m.isDeleted && 
    !activeTournament?.entries.some(e => e.memberId === m.id)
  );

  const matchedMembers = searchQuery.trim() === '' 
    ? [] 
    : availableMembers.filter(m => {
        const q = searchQuery.toLowerCase();
        return (
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      });

  const triggerCheckInFlow = (memberId: string, onConfirm: (phone?: string) => void) => {
    const member = state.members.find(m => m.id === memberId);
    if (member && (!member.phone || !member.phone.trim())) {
      setPhonePromptMember(member);
      setPhonePromptInput('');
      setOnPhonePromptComplete(() => onConfirm);
    } else {
      onConfirm();
    }
  };

  const handlePlayerSelect = (m: Member) => {
    if (activeTournament) {
      if (subTab === 'checkin') {
        triggerCheckInFlow(m.id, async (phone) => {
          if (phone) {
            await updateMember(m.id, { phone });
          }
          const exists = activeTournament.entries.some(e => e.memberId === m.id);
          let updatedEntries = [];
          if (exists) {
            updatedEntries = activeTournament.entries.map(e => 
              e.memberId === m.id 
                ? { ...e, hasBuyIn: true, hasDealerAppreciation: true } 
                : e
            );
          } else {
            const newEntry = {
              memberId: m.id,
              hasBuyIn: true,
              hasAddon: false,
              hasDealerAppreciation: true,
              bountiesCollected: 0,
              pointsEarned: 0,
              payoutEarned: 0,
              seatingSeatNumber: 0,
              seatingTableNumber: 0
            };
            updatedEntries = [...activeTournament.entries, newEntry];
          }
          await updateTournament(activeTournament.id, { entries: updatedEntries });
        });
      } else {
        registerPlayer(activeTournament.id, m.id);
      }
      setSearchQuery('');
      setShowDropdown(false);

      // Auto-focus the active lookup input back
      setTimeout(() => {
        if (subTab === 'rsvp') {
          rsvpSearchRef.current?.focus();
        } else if (subTab === 'checkin') {
          if (activeTournament.status === 'draft') {
            checkinSearchRef.current?.focus();
          } else {
            lateSearchRef.current?.focus();
          }
        }
      }, 50);
    }
  };

  const renderFastPlayerLookup = (title: string, inputRef: React.RefObject<HTMLInputElement | null>) => (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h4>

      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type name, phone number, or Member ID..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="form-input"
        />

        {showDropdown && searchQuery.trim() !== '' && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0 0 10px 10px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: 'var(--shadow-md)'
          }}>
            {matchedMembers.length > 0 ? (
              matchedMembers.map(m => (
                <div
                  key={m.id}
                  onClick={() => handlePlayerSelect(m)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                  className="interactive"
                >
                  <span style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.id} • {m.phone || 'No phone'}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                No unregistered members match.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Elimination submit
  const submitElimination = () => {
    if (activeTournament && eliminatingPlayerId) {
      eliminatePlayer(activeTournament.id, eliminatingPlayerId, bountiesWon);
      setEliminatingPlayerId(null);
      setBountiesWon(0);
    }
  };

  const handleUpdateBounties = async (playerId: string, newCount: number) => {
    if (!activeTournament) return;
    const updatedEntries = activeTournament.entries.map(e => {
      if (e.memberId === playerId) {
        return {
          ...e,
          bountiesCollected: newCount
        };
      }
      return e;
    });
    await updateTournament(activeTournament.id, { entries: updatedEntries });
  };

  // Help getters
  const getMemberName = (id: string) => {
    const m = state.members.find(member => member.id === id);
    return m ? `${m.firstName} ${m.lastName}` : 'Unknown Player';
  };

  const getActivePlayersList = () => {
    if (!activeTournament) return [];
    return activeTournament.entries
      .filter(e => !e.eliminatedAt)
      .map(e => state.members.find(m => m.id === e.memberId))
      .filter(Boolean)
      .sort((a, b) => {
        const nameA = `${a?.firstName} ${a?.lastName}`;
        const nameB = `${b?.firstName} ${b?.lastName}`;
        return nameA.localeCompare(nameB);
      }) as Member[];
  };

  // Render Section 1: Tournament Selector List
  if (isCreateTourOpen) {
    if (!activeSeason) {
      return (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', padding: '40px 0', textAlign: 'center' }}>
          <ShieldAlert size={48} style={{ color: 'var(--color-danger)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>No Active Season</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '8px 0 16px 0' }}>
            No active season exists. You must create and activate a Season in the <strong>Standings</strong> page first before starting a tournament.
          </p>
          <button onClick={() => setIsCreateTourOpen(false)} className="btn btn-secondary">Ok</button>
        </div>
      );
    }

    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Initialize Tournament Draft
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Configure basic settings, buy-ins, fees, and payout percentages for the new game.
          </p>
        </div>

        <div className="glass-card" style={{ width: '100%', maxWidth: '1100px', backgroundColor: 'var(--bg-surface)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Tournament Settings</h3>
            <button 
              onClick={() => setIsCreateTourOpen(false)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Back to Registry
            </button>
          </div>

          <form onSubmit={handleCreateTournament} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '24px' }}>
            
            {/* Column 1: General Info & Financials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold)', margin: '0 0 6px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>General & Financials</h4>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600 }}>Tournament Name / Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Season 4, Game 2"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Date</label>
                  <input
                    type="date"
                    required
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch (err) { console.warn(err); } }}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Time</label>
                  <input
                    type="text"
                    required
                    value={tourTime}
                    onChange={(e) => setTourTime(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600 }}>Location</label>
                <input
                  type="text"
                  required
                  value={tourLocation}
                  onChange={(e) => setTourLocation(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Buy-in ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={buyIn}
                    onChange={(e) => setBuyIn(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Add-on ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={addon}
                    onChange={(e) => setAddon(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Bounty ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={bounty}
                    onChange={(e) => setBounty(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>ToC Fee ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={dealerApp}
                    onChange={(e) => setDealerApp(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>High Hand Deduction ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tourHighHand}
                    onChange={(e) => setTourHighHand(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Max Seats / Players Limit</label>
                  <input
                    type="number"
                    min={2}
                    required
                    value={tourMaxPlayers}
                    onChange={(e) => setTourMaxPlayers(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Chips, Rules & Flyer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold)', margin: '0 0 6px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>Chips, Formats & Flyer</h4>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600 }}>Starting Stack Description</label>
                <input
                  type="text"
                  required
                  value={tourStartingStack}
                  onChange={(e) => setTourStartingStack(e.target.value)}
                  className="form-input"
                  style={{ padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Add-on Chips Count</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tourAddonChips}
                    onChange={(e) => setTourAddonChips(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Level (mins)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={tourRoundLength}
                    onChange={(e) => setTourRoundLength(Number(e.target.value))}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Rebuys</label>
                  <input
                    type="text"
                    required
                    value={tourRebuys}
                    onChange={(e) => setTourRebuys(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Late Entry</label>
                  <input
                    type="text"
                    required
                    value={tourLateEntry}
                    onChange={(e) => setTourLateEntry(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
              </div>



              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Flyer / PDF URL (Google Drive)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://drive.google.com/..."
                    value={tourFlyerUrl}
                    onChange={(e) => setTourFlyerUrl(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Flyer Type</label>
                  <select
                    value={tourFlyerType || ''}
                    onChange={(e) => setTourFlyerType((e.target.value as any) || null)}
                    className="form-input"
                    style={{ padding: '10px 14px', cursor: 'pointer' }}
                  >
                    <option value="">None</option>
                    <option value="pdf">PDF</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 3: Payout Structure & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold)', margin: '0 0 6px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>Payout percentages</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                {[1, 6, 2, 7, 3, 8, 4, 9, 5, 10].map(place => (
                  <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', width: '36px', textAlign: 'right' }}>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={payoutPcts[place - 1]}
                      onChange={(e) => {
                        const next = [...payoutPcts];
                        next[place - 1] = Number(e.target.value);
                        setPayoutPcts(next);
                      }}
                      className="form-input"
                      style={{ padding: '6px 10px', flex: 1 }}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.85rem' }}>%</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                Total Percent: <strong style={{ color: payoutPcts.reduce((a,b)=>a+b, 0) === 100 ? 'var(--color-emerald)' : 'var(--text-secondary)' }}>
                  {payoutPcts.reduce((a,b)=>a+b, 0)}%
                </strong> (should be 100%)
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'auto', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateTourOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 20px' }}
                >
                  Initialize Draft
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
  // Render Section 1: Tournament Selector List
  if (!activeTournament) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
              Tournaments Manager
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Create, search, or administer Penny Ante club tournaments.
            </p>
          </div>
          {!isSubAdmin && (
            <button className="btn btn-primary" onClick={() => setIsCreateTourOpen(true)}>
              <Plus size={18} />
              <span>New Tournament</span>
            </button>
          )}
        </div>

        {/* List of Tournaments */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tournaments Registry</h3>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tournament Name</th>
                  <th>Date</th>
                  <th>Season</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Players</th>
                  <th style={{ textAlign: 'right' }}>Prize Pool</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.tournaments.length > 0 ? (
                  [...state.tournaments]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((t) => {
                      const seasonName = state.seasons.find(s => s.id === t.seasonId)?.name || 'Unassigned';
                      
                      // Calculate dynamic values for drafts
                      const addonsNum = t.totalAddons !== undefined ? t.totalAddons : t.entries.filter(e => e.hasAddon).length;
                      const prizePool = t.status === 'completed' 
                        ? t.totalPrizePool 
                        : (t.entries.filter(e => e.hasBuyIn).length * t.buyInAmount) + 
                          (addonsNum * t.addonAmount);

                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                              {formatDate(t.date)}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{seasonName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              t.status === 'completed' ? 'badge-secondary' :
                              t.status === 'active' ? 'badge-emerald' : 'badge-warning'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.entries.length}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-emerald)' }}>
                            ${prizePool}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                onClick={() => setSelectedTournamentId(t.id)}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                {isSubAdmin ? 'View' : 'Manage'}
                              </button>
                              {isChiefAdmin && (
                                <button
                                  onClick={() => handleDeleteTour(t.id, t.name)}
                                  className="btn btn-ghost"
                                  style={{ padding: '6px', color: 'var(--color-danger)' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No tournament records created yet. Create one using the button above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Tournament Details Modal */}
        {isEditTourDetailsOpen && activeTournament && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000001,
            padding: '20px'
          }}>
            <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '700px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Tournament Details</h3>
                <button 
                  onClick={() => setIsEditTourDetailsOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTourDetails} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Left Column: Metadata & Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tournament Name / Number</label>
                    <input
                      type="text"
                      required
                      value={editTourName}
                      onChange={(e) => setEditTourName(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tournament Date</label>
                    <input
                      type="date"
                      required
                      value={editTourDate}
                      onChange={(e) => setEditTourDate(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch (err) { console.warn(err); } }}
                      className="form-input"
                      style={{ padding: '8px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Buy-in ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editBuyIn}
                        onChange={(e) => setEditBuyIn(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Add-on ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editAddon}
                        onChange={(e) => setEditAddon(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Bounty ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editBounty}
                        onChange={(e) => setEditBounty(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>ToC Fee ($)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={editDealerApp}
                        onChange={(e) => setEditDealerApp(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Flyer configuration & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Flyer / PDF URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://example.com/flyer.pdf"
                      value={editFlyerUrl}
                      onChange={(e) => setEditFlyerUrl(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Flyer Type</label>
                    <select
                      value={editFlyerType || ''}
                      onChange={(e) => setEditFlyerType((e.target.value as any) || null)}
                      className="form-input"
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
                    >
                      <option value="">None (No flyer)</option>
                      <option value="pdf">PDF Document</option>
                      <option value="image">Image (PNG, JPG)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'auto', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditTourDetailsOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}



      </div>
    );
  }

  // Render Section 2: Manage View for a Selected Tournament
  // Calculate dynamic financials
  const buyInCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
  const addonCount = activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter(e => e.hasAddon).length;
  const bountyCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
  const dealerCount = activeTournament.entries.filter(e => e.hasDealerAppreciation).length;

  const netBuyIn = activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount;
  const rawPrizePool = (buyInCount * netBuyIn) + (addonCount * activeTournament.addonAmount);
  const currentPrizePool = activeTournament.status === 'completed' 
    ? activeTournament.totalPrizePool 
    : Math.max(0, rawPrizePool - (activeTournament.highHandAmount || 0) - (activeTournament.bubbleAmount || 0));

  const currentBountyPool = activeTournament.status === 'completed'
    ? activeTournament.totalBountyPool
    : bountyCount * activeTournament.bountyAmount;

  const currentDealerPool = activeTournament.status === 'completed'
    ? activeTournament.totalDealerAppreciation
    : dealerCount * activeTournament.dealerAppreciationAmount;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back & Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => setSelectedTournamentId(null)}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
        >
          <ChevronLeft size={16} />
          <span>Back to Registry</span>
        </button>

        <div style={{ display: 'inline-flex', gap: '10px' }}>
          {!isSubAdmin && (
            <>
              {activeTournament.status === 'draft' && (
                <button className="btn btn-primary" onClick={handleStartTournament}>
                  <Play size={16} fill="currentColor" />
                  <span>Lock Entries & Start Game</span>
                </button>
              )}
              {activeTournament.status !== 'completed' && (
                <button className="btn btn-primary" onClick={handleFinalize} style={{ backgroundColor: 'var(--color-gold)', color: '#78350f' }}>
                  <Award size={16} />
                  <span>Finalize Standings</span>
                </button>
              )}
              {activeTournament.status === 'completed' && (
                <button className="btn btn-secondary" onClick={handleReopen}>
                  <Unlock size={16} />
                  <span>Reopen Tournament</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tournament Meta Card */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{activeTournament.name}</h2>
            <span className={`badge ${
              activeTournament.status === 'completed' ? 'badge-secondary' :
              activeTournament.status === 'active' ? 'badge-emerald' : 'badge-warning'
            }`}>
              {activeTournament.status}
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Date: <strong>{formatDate(activeTournament.date)}</strong> | Total checked in: <strong>{activeTournament.entries.filter(e => e.hasBuyIn).length} players</strong>
          </span>
        </div>

        {/* Finance Box */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Prize Pool</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-emerald)', fontWeight: 700 }}>${currentPrizePool}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Bounties</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-gold)', fontWeight: 700 }}>${currentBountyPool}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>ToC Pool</span>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', fontWeight: 700 }}>${currentDealerPool}</h3>
          </div>
        </div>
      </div>

      {activeTournament.status !== 'completed' && (
        <div className="glass-card translucent-banner" style={{
          background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 100%)',
          borderLeft: '4px solid var(--color-gold)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 20px',
          marginTop: '-8px'
        }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold)', margin: 0 }}>
              Payouts & Add-ons Configuration
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>
              {activeTournament.totalAddons !== undefined ? (
                <>
                  Add-ons entered: <strong>{activeTournament.totalAddons}</strong> | Payout Structure configured (Total: <strong>{activeTournament.payoutPercentages?.reduce((a,b)=>a+b,0)}%</strong>)
                </>
              ) : (
                <>
                  Add-ons and payout structure have not been configured for this active game yet.
                </>
              )}
            </p>
          </div>
          {!isSubAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={openEditTourDetails}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Edit Tournament Details
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setIsPayoutModalOpen(true)}
                style={{ fontSize: '0.85rem', padding: '8px 16px', borderColor: 'rgba(251, 191, 36, 0.3)', color: 'var(--color-gold)' }}
              >
                {activeTournament.totalAddons !== undefined ? 'Edit Payouts & Add-ons' : 'Enter Add-ons & Payouts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation tabs inside tournament */}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
        {activeTournament.status === 'draft' || activeTournament.status === 'active' ? (
          <>
            <button 
              className={`btn btn-ghost ${subTab === 'rsvp' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('rsvp')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'rsvp' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'rsvp' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'rsvp' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              REGISTERED
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'checkin' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('checkin')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'checkin' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'checkin' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'checkin' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              CHECKED-IN
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'seating' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('seating')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'seating' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'seating' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'seating' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              {activeTournament.status === 'draft' ? "Seating Preview" : "Seating Tables"}
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'players' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('players')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'players' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'players' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'players' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              Players ({activeTournament.status === 'draft' ? 0 : activeTournament.entries.filter(e => !e.eliminatedAt).length} alive)
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'summary' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('summary')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'summary' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'summary' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'summary' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              Summary ({activeTournament.status === 'draft' ? 0 : activeTournament.entries.filter(e => e.eliminatedAt).length} busted)
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'accounting' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('accounting')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'accounting' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'accounting' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'accounting' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              ACCOUNTING
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'clock' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('clock')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'clock' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'clock' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'clock' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              TOURNAMENT CLOCK ⏱
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'print' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('print')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'print' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'print' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'print' ? 600 : 400,
                padding: '8px 12px',
                fontSize: '0.85rem'
              }}
            >
              TD Print Out
            </button>
          </>
        ) : (
          <button 
            className={`btn btn-ghost active-subtab`}
            onClick={() => setSubTab('results')}
            style={{
              borderRadius: '8px 8px 0 0',
              borderBottom: '3px solid var(--color-emerald)',
              color: 'var(--color-emerald)',
              fontWeight: 600
            }}
          >
            Standings & Results
          </button>
        )}
      </div>
      </div>

      {/* Sub-tab contents */}

      {/* RSVP Tab */}
      {subTab === 'rsvp' && (() => {
        const rsvpEntries = activeTournament.entries
          .filter(e => !e.hasBuyIn)
          .sort((a, b) => {
            const mA = state.members.find(m => m.id === a.memberId);
            const mB = state.members.find(m => m.id === b.memberId);
            const nameA = mA ? `${mA.firstName} ${mA.lastName}` : '';
            const nameB = mB ? `${mB.firstName} ${mB.lastName}` : '';
            return nameA.localeCompare(nameB);
          });
        const rsvpSize = Math.ceil(rsvpEntries.length / 3);
        const rsvpCol1 = rsvpEntries.slice(0, rsvpSize);
        const rsvpCol2 = rsvpEntries.slice(rsvpSize, rsvpSize * 2);
        const rsvpCol3 = rsvpEntries.slice(rsvpSize * 2);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
            <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '20px', alignItems: 'start' }}>
              {renderFastPlayerLookup("Fast RSVP Player Lookup", rsvpSearchRef)}

              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>RSVP Summary</h4>
                <div style={{ fontSize: '1.5rem', color: 'var(--color-emerald)', fontWeight: 700 }}>
                  {rsvpEntries.length} Players
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  These players have registered to attend. Click **Check In** to confirm their attendance and buy-in investment.
                </p>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Registered RSVPs (Unconfirmed Check-ins)</h4>
              {rsvpEntries.length > 0 ? (
                <div className="rsvp-columns-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '20px',
                  alignItems: 'start'
                }}>
                  {/* Column 1 */}
                  <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}></th>
                          <th>Player Name</th>
                          <th style={{ textAlign: 'center', width: '60px' }}>Dealer?</th>
                          <th style={{ textAlign: 'right', width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsvpCol1.map((entry) => {
                          const m = state.members.find(member => member.id === entry.memberId);
                          if (!m) return null;

                          return (
                            <tr key={entry.memberId}>
                              <td style={{ paddingLeft: '8px', paddingRight: '8px', width: '80px' }}>
                                <button
                                  onClick={() => {
                                    triggerCheckInFlow(entry.memberId, async (phone) => {
                                      if (phone) {
                                        await updateMember(entry.memberId, { phone });
                                      }
                                      await updateTournament(activeTournament.id, {
                                        entries: activeTournament.entries.map(e => 
                                          e.memberId === entry.memberId 
                                            ? { ...e, hasBuyIn: true, hasDealerAppreciation: true } 
                                            : e
                                        )
                                      });
                                    });
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px', opacity: isSubAdmin ? 0.5 : 1, cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                                  disabled={isSubAdmin}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  disabled={isSubAdmin}
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: isSubAdmin ? 'not-allowed' : 'pointer',
                                    fontSize: '1.25rem',
                                    opacity: preassignedDealers.includes(entry.memberId) ? 1 : 0.25,
                                    filter: preassignedDealers.includes(entry.memberId) ? 'grayscale(0)' : 'grayscale(100%)',
                                    transition: 'all 0.15s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Toggle Player Dealer status"
                                >
                                  👑
                                </button>
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                                <button
                                  onClick={() => unregisterPlayer(activeTournament.id, entry.memberId)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.02)', minHeight: 'auto' }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Column 2 */}
                  <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}></th>
                          <th>Player Name</th>
                          <th style={{ textAlign: 'center', width: '60px' }}>Dealer?</th>
                          <th style={{ textAlign: 'right', width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsvpCol2.map((entry) => {
                          const m = state.members.find(member => member.id === entry.memberId);
                          if (!m) return null;

                          return (
                            <tr key={entry.memberId}>
                              <td style={{ paddingLeft: '8px', paddingRight: '8px', width: '80px' }}>
                                <button
                                  onClick={() => {
                                    triggerCheckInFlow(entry.memberId, async (phone) => {
                                      if (phone) {
                                        await updateMember(entry.memberId, { phone });
                                      }
                                      await updateTournament(activeTournament.id, {
                                        entries: activeTournament.entries.map(e => 
                                          e.memberId === entry.memberId 
                                            ? { ...e, hasBuyIn: true, hasDealerAppreciation: true } 
                                            : e
                                        )
                                      });
                                    });
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px', opacity: isSubAdmin ? 0.5 : 1, cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                                  disabled={isSubAdmin}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  disabled={isSubAdmin}
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: isSubAdmin ? 'not-allowed' : 'pointer',
                                    fontSize: '1.25rem',
                                    opacity: preassignedDealers.includes(entry.memberId) ? 1 : 0.25,
                                    filter: preassignedDealers.includes(entry.memberId) ? 'grayscale(0)' : 'grayscale(100%)',
                                    transition: 'all 0.15s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Toggle Player Dealer status"
                                >
                                  👑
                                </button>
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                                <button
                                  onClick={() => unregisterPlayer(activeTournament.id, entry.memberId)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.02)', minHeight: 'auto' }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Column 3 */}
                  <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}></th>
                          <th>Player Name</th>
                          <th style={{ textAlign: 'center', width: '60px' }}>Dealer?</th>
                          <th style={{ textAlign: 'right', width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsvpCol3.map((entry) => {
                          const m = state.members.find(member => member.id === entry.memberId);
                          if (!m) return null;

                          return (
                            <tr key={entry.memberId}>
                              <td style={{ paddingLeft: '8px', paddingRight: '8px', width: '80px' }}>
                                <button
                                  onClick={() => {
                                    triggerCheckInFlow(entry.memberId, async (phone) => {
                                      if (phone) {
                                        await updateMember(entry.memberId, { phone });
                                      }
                                      await updateTournament(activeTournament.id, {
                                        entries: activeTournament.entries.map(e => 
                                          e.memberId === entry.memberId 
                                            ? { ...e, hasBuyIn: true, hasDealerAppreciation: true } 
                                            : e
                                        )
                                      });
                                    });
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px', opacity: isSubAdmin ? 0.5 : 1, cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                                  disabled={isSubAdmin}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  disabled={isSubAdmin}
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: isSubAdmin ? 'not-allowed' : 'pointer',
                                    fontSize: '1.25rem',
                                    opacity: preassignedDealers.includes(entry.memberId) ? 1 : 0.25,
                                    filter: preassignedDealers.includes(entry.memberId) ? 'grayscale(0)' : 'grayscale(100%)',
                                    transition: 'all 0.15s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Toggle Player Dealer status"
                                >
                                  👑
                                </button>
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                                <button
                                  onClick={() => unregisterPlayer(activeTournament.id, entry.memberId)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.02)', minHeight: 'auto' }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No unconfirmed RSVPs. All registered players are checked in!
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Check-in Tab */}
      {subTab === 'checkin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
          {activeTournament.status === 'draft' ? (
            !isSubAdmin && renderFastPlayerLookup("Fast Player Lookup", checkinSearchRef)
          ) : (
            !isSubAdmin && renderFastPlayerLookup("Fast Player Lookup (Late Entry / Registration)", lateSearchRef)
          )}
          
          {/* Checked-in list */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Checked-in Registrations</h4>
            {(() => {
              const checkedInEntries = activeTournament.entries
                .filter(e => e.hasBuyIn)
                .map(entry => {
                  const m = state.members.find(member => member.id === entry.memberId);
                  return { entry, member: m };
                })
                .filter((item): item is { entry: any; member: any } => item.member !== undefined)
                .sort((a, b) => {
                  const nameA = `${a.member.firstName} ${a.member.lastName}`.toLowerCase();
                  const nameB = `${b.member.firstName} ${b.member.lastName}`.toLowerCase();
                  return nameA.localeCompare(nameB);
                });

              const midpoint = Math.ceil(checkedInEntries.length / 2);
              const leftCol = checkedInEntries.slice(0, midpoint);
              const rightCol = checkedInEntries.slice(midpoint);

              const renderCheckedInTable = (items: typeof checkedInEntries) => (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Player Name</th>
                        <th>ID</th>
                        <th style={{ textAlign: 'center' }}>Dealer?</th>
                        <th style={{ textAlign: 'center' }}>Buy-in (${activeTournament.buyInAmount})</th>
                        <th style={{ textAlign: 'center' }}>ToC (${activeTournament.dealerAppreciationAmount})</th>
                        {activeTournament.status === 'draft' && <th style={{ textAlign: 'right' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(({ entry, member: m }) => (
                        <tr key={entry.memberId}>
                          <td 
                            style={{ 
                              fontWeight: 600, 
                              cursor: 'pointer', 
                              userSelect: 'none',
                              color: preassignedDealers.includes(entry.memberId) ? 'var(--color-gold)' : 'inherit' 
                            }}
                            onDoubleClick={() => toggleCheckedInDealer(entry.memberId)}
                            title="Double-click to toggle Dealer status"
                          >
                            <span>
                              {preassignedDealers.includes(entry.memberId) ? '👑 ' : ''}
                              {m.firstName} {m.lastName}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{m.id}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggleCheckedInDealer(entry.memberId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: isSubAdmin ? 'not-allowed' : 'pointer',
                                fontSize: '1.25rem',
                                opacity: preassignedDealers.includes(entry.memberId) ? 1 : 0.25,
                                filter: preassignedDealers.includes(entry.memberId) ? 'grayscale(0)' : 'grayscale(100%)',
                                transition: 'all 0.15s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Toggle Player Dealer status"
                              disabled={isSubAdmin}
                            >
                              👑
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasBuyIn}
                              onChange={() => toggleEntryBuyIn(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: isSubAdmin ? 'not-allowed' : 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={isSubAdmin || (activeTournament.status !== 'draft' && activeTournament.status !== 'active')}
                            />
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasDealerAppreciation}
                              onChange={() => toggleEntryDealerApp(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: isSubAdmin ? 'not-allowed' : 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={isSubAdmin || (activeTournament.status !== 'draft' && activeTournament.status !== 'active')}
                            />
                          </td>
                          {!isSubAdmin && activeTournament.status === 'draft' && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => unregisterPlayer(activeTournament.id, entry.memberId)}
                                className="btn btn-ghost"
                                style={{ padding: '4px', color: 'var(--color-danger)' }}
                              >
                                <UserMinus size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

              return checkedInEntries.length > 0 ? (
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  width: '100%',
                  flexWrap: 'wrap'
                }} className="summary-columns-container">
                  <div style={{ flex: 1 }}>
                    {renderCheckedInTable(leftCol)}
                  </div>
                  <div style={{ flex: 1 }}>
                    {rightCol.length > 0 ? renderCheckedInTable(rightCol) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
                        -
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No players registered yet. Search for names to register check-ins.
                </div>
              );
            })()}
          </div>

          {/* Configure Game Pricing (if draft and not sub-admin) */}
          {activeTournament.status === 'draft' && !isSubAdmin && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Configure Game Pricing</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Buy-In ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={activeTournament.buyInAmount}
                    onChange={(e) => updateTournament(activeTournament.id, { buyInAmount: Number(e.target.value) })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                    disabled={isSubAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Add-On ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={activeTournament.addonAmount}
                    onChange={(e) => updateTournament(activeTournament.id, { addonAmount: Number(e.target.value) })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                    disabled={isSubAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Bounty ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={activeTournament.bountyAmount}
                    onChange={(e) => updateTournament(activeTournament.id, { bountyAmount: Number(e.target.value) })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                    disabled={isSubAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ToC ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={activeTournament.dealerAppreciationAmount}
                    onChange={(e) => updateTournament(activeTournament.id, { dealerAppreciationAmount: Number(e.target.value) })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                    disabled={isSubAdmin}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Flyer / PDF URL (Google Drive)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://drive.google.com/..."
                    value={activeTournament.flyerUrl || ''}
                    onChange={(e) => updateTournament(activeTournament.id, { flyerUrl: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                    disabled={isSubAdmin}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Flyer Type</label>
                  <select
                    value={activeTournament.flyerType || ''}
                    onChange={(e) => updateTournament(activeTournament.id, { flyerType: (e.target.value as any) || null })}
                    className="form-input"
                    style={{ padding: '8px 12px', cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                    disabled={isSubAdmin}
                  >
                    <option value="">None</option>
                    <option value="pdf">PDF</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Payout Structure (% per place paid)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(place => {
                    const currentPctList = activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
                    return (
                      <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', width: '35px', textAlign: 'right' }}>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={currentPctList[place - 1]}
                          onChange={(e) => {
                            const next = [...currentPctList];
                            next[place - 1] = Number(e.target.value);
                            updateTournament(activeTournament.id, { payoutPercentages: next });
                          }}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '0.85rem', flex: 1 }}
                          disabled={isSubAdmin}
                        />
                        <span style={{ fontSize: '0.8rem' }}>%</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'right' }}>
                  Total: <strong>{(activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0]).reduce((a,b)=>a+b, 0)}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seating Tab (Draft & Active) */}
      {subTab === 'seating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Seating Assignments</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                Seating is generated only for checked-in (registered) players. RSVP'ed players who have not checked in yet will not be assigned a seat.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setIsDisplayModeOpen(true)}>
                <Play size={16} />
                <span>Display Mode</span>
              </button>
              {!isSubAdmin && (
                <button className="btn btn-secondary" onClick={generateSeating}>
                  <RotateCcw size={16} />
                  <span>Reshuffle & Balance Seating</span>
                </button>
              )}
            </div>
          </div>

          {Object.keys(seating).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {Object.entries(seating)
                .sort((a, b) => {
                  const tableOrder = ['red table', 'blue table', 'gold table', 'gray table', 'purple table'];
                  return tableOrder.indexOf(a[0]) - tableOrder.indexOf(b[0]);
                })
                .map(([tableName, players]) => {
                  const seatedCount = players.filter(id => id !== "").length;
                return (
                  <div key={tableName} className="glass-card accent-emerald" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{tableName}</h4>
                      <span className="badge badge-emerald">{seatedCount}/10 Seated</span>
                    </div>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {players.map((playerId, idx) => {
                        if (!playerId) {
                          return (
                            <li 
                              key={`empty-${idx}`} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '0.9rem',
                                color: 'var(--text-muted)',
                                borderBottom: '1px dashed rgba(255,255,255,0.05)',
                                paddingBottom: '4px'
                              }}
                            >
                              <span style={{ fontWeight: 400 }}>
                                <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Seat {idx + 1}:</span>
                                [Empty Seat]
                              </span>
                            </li>
                          );
                        }

                        const entry = activeTournament.entries.find(e => e.memberId === playerId);
                        const isEliminated = entry ? !!entry.eliminatedAt : false;
                        const isDealer = preassignedDealers.includes(playerId);
                        
                        return (
                          <li 
                            key={playerId} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '0.9rem',
                              opacity: isEliminated ? 0.4 : 1,
                              textDecoration: isEliminated ? 'line-through' : 'none',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              paddingBottom: '4px'
                            }}
                          >
                            <span 
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 500,
                                color: isDealer ? 'var(--color-gold)' : 'inherit',
                                userSelect: 'none'
                              }}
                            >
                              <span style={{ color: 'var(--text-muted)', marginRight: '2px' }}>Seat {idx + 1}:</span>
                              <button
                                type="button"
                                onClick={() => toggleDealerStatus(playerId, tableName)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: isSubAdmin ? 'not-allowed' : 'pointer',
                                  fontSize: '1rem',
                                  opacity: isDealer ? 1 : 0.2,
                                  filter: isDealer ? 'grayscale(0)' : 'grayscale(100%)',
                                  transition: 'all 0.15s ease',
                                  padding: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Toggle Dealer status"
                                disabled={isSubAdmin}
                              >
                                👑
                              </button>
                              {getMemberName(playerId)}
                            </span>

                            {/* Seating manual movement */}
                            {!isEliminated && Object.keys(seating).length > 1 && (
                              <select
                                value={tableName}
                                onChange={(e) => movePlayerTable(playerId, tableName, e.target.value)}
                                disabled={isSubAdmin}
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  padding: '2px 4px',
                                  cursor: isSubAdmin ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {Object.keys(seating).map(tName => (
                                  <option key={tName} value={tName}>{tName}</option>
                                ))}
                              </select>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              No seating generated yet. Click the button above to shuffle and balance players into tables.
            </div>
          )}
        </div>
      )}


      {/* Eliminations Tab (Active Game) */}
      {subTab === 'players' && (() => {
        const activePlayers = getActivePlayersList();
        const bustedEntries = activeTournament.entries
          .filter(e => e.eliminatedAt)
          .sort((a, b) => new Date(a.eliminatedAt!).getTime() - new Date(b.eliminatedAt!).getTime());
        const totalBountiesPaid = activeTournament.entries.reduce((sum: number, e: any) => sum + (e.bountiesCollected || 0), 0);
        const totalBountiesAvailable = activeTournament.entries.filter((e: any) => e.hasBuyIn).length;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-slide-up">
            
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Active Players ({activePlayers.length})</h3>
              {!isSubAdmin && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsLateEntryOpen(true);
                    setSelectedLateMemberId('');
                    setSelectedLateTable('');
                    setLateSearchQuery('');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                >
                  <Plus size={16} />
                  <span>Add Late Entry</span>
                </button>
              )}
            </div>

            {/* 5 Columns Responsive Grid of Active Players */}
            {activePlayers.length > 0 ? (
              <div className="active-players-columns-grid">
                {activePlayers.map(p => (
                  <div key={p.id} className="player-active-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.firstName} {p.lastName}
                      </span>
                    </div>
                    {!isSubAdmin && (
                      <button 
                        onClick={() => {
                          setEliminatingPlayerId(p.id);
                          setBountiesWon(0);
                        }}
                        className="btn btn-danger"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: 'auto', height: '24px', flexShrink: 0 }}
                      >
                        Bust Out
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', width: '100%' }}>
                No active players remaining.
              </div>
            )}

            {/* Bottom Section: Busted Players / Knockout Order */}
            <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(248,113,113,0.15)', marginTop: '12px' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Busted Players / Knockout Order</span>
                <span style={{ fontSize: '0.85rem', padding: '2px 8px', backgroundColor: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', fontWeight: 600 }}>
                  {bustedEntries.length} Busted
                </span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontWeight: 600,
                  backgroundColor: totalBountiesPaid > totalBountiesAvailable ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: totalBountiesPaid > totalBountiesAvailable 
                    ? '1px solid rgba(244, 63, 94, 0.4)' 
                    : (totalBountiesPaid === totalBountiesAvailable ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'),
                  color: totalBountiesPaid > totalBountiesAvailable 
                    ? 'var(--color-danger)' 
                    : (totalBountiesPaid === totalBountiesAvailable ? 'var(--color-emerald)' : 'var(--text-secondary)')
                }}>
                  Bounties Paid: {totalBountiesPaid} of {totalBountiesAvailable}
                </span>
              </h4>

              <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                {totalBountiesAvailable > 0 ? (
                  Array.from({ length: Math.ceil(totalBountiesAvailable / 10) }).map((_, colIdx) => {
                    const start = colIdx * 10 + 1;
                    const end = Math.min(start + 9, totalBountiesAvailable);
                    
                    return (
                      <div 
                        key={colIdx} 
                        style={{ 
                          flex: '1 0 250px',
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '8px'
                        }}
                      >
                        <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '4px', letterSpacing: '0.05em' }}>
                          Places {start} - {end}
                        </h5>
                        
                        {Array.from({ length: end - start + 1 }).map((_, itemIdx) => {
                          const place = start + itemIdx;
                          const entry = activeTournament.entries.find(e => e.finishPosition === place);

                          if (!entry) {
                            return (
                              <div 
                                key={`pos-empty-${place}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 14px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.005)',
                                  border: '1px dashed rgba(255, 255, 255, 0.03)',
                                  opacity: 0.5,
                                  minHeight: '62px'
                                }}
                              >
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                  <span style={{ marginRight: '6px' }}>{getOrdinal(place)}:</span>
                                  [Active Player]
                                </span>
                              </div>
                            );
                          }

                          const name = getMemberName(entry.memberId);
                          return (
                            <div 
                              key={entry.memberId}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(248,113,113,0.02)',
                                border: '1px solid rgba(248,113,113,0.08)',
                                minHeight: '62px'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  <span style={{ color: 'var(--color-danger)', marginRight: '6px' }}>{getOrdinal(place)}:</span>
                                  {name}
                                </span>
                                
                                {/* Bounty Editor Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bounties:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBounties(entry.memberId, Math.max(0, entry.bountiesCollected - 1))}
                                      className="btn btn-secondary"
                                      style={{ width: '22px', height: '22px', padding: 0, minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '0.75rem', cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                                      disabled={isSubAdmin}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={entry.bountiesCollected}
                                      onChange={(e) => handleUpdateBounties(entry.memberId, Math.max(0, parseInt(e.target.value) || 0))}
                                      disabled={isSubAdmin}
                                      style={{
                                        width: '36px',
                                        height: '22px',
                                        textAlign: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-subtle)',
                                        color: '#ffffff',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        padding: 0,
                                        cursor: isSubAdmin ? 'not-allowed' : 'text'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBounties(entry.memberId, entry.bountiesCollected + 1)}
                                      className="btn btn-secondary"
                                      style={{ width: '22px', height: '22px', padding: 0, minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '0.75rem', cursor: isSubAdmin ? 'not-allowed' : 'pointer' }}
                                      disabled={isSubAdmin}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {!isSubAdmin && (
                                <button 
                                  onClick={() => undoElimination(activeTournament.id, entry.memberId)}
                                  className="btn btn-ghost"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', minHeight: 'auto', height: '32px', color: 'var(--text-secondary)' }}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ flex: 1, textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    No players checked in yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      })()}

      {subTab === 'summary' && (() => {
        const bustedEntries = activeTournament.entries
          .filter(e => e.eliminatedAt)
          .sort((a, b) => (a.finishPosition || 0) - (b.finishPosition || 0));

        // Calculate total stats for calculations
        const buyInCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
        const N = buyInCount;
        const attendancePoints = state.settings.pointsBaseAttendance;
        const addonCount = activeTournament.totalAddons !== undefined 
          ? activeTournament.totalAddons 
          : activeTournament.entries.filter(e => e.hasAddon).length;
        const netBuyInContribution = activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount;
        const totalPrizePool = Math.max(0, (buyInCount * netBuyInContribution) + (addonCount * activeTournament.addonAmount) - (activeTournament.highHandAmount || 0) - (activeTournament.bubbleAmount || 0));
        const payoutPrizePool = activeTournament.overridePrizePool !== undefined && activeTournament.overridePrizePool > 0
          ? activeTournament.overridePrizePool
          : totalPrizePool;
        const pctList = activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
        const payouts = pctList.map(pct => Math.round(payoutPrizePool * (pct / 100)));

        // Generate all positions from 1 to N
        const allPositions = Array.from({ length: N }, (_, idx) => {
          const pos = idx + 1;
          const entry = activeTournament.entries.find(e => e.finishPosition === pos);
          return { pos, entry };
        });

        const midpoint = Math.ceil(allPositions.length / 2);
        const leftColumnEntries = allPositions.slice(0, midpoint);
        const rightColumnEntries = allPositions.slice(midpoint);

        const renderSummaryTable = (positions: typeof leftColumnEntries) => (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2.5px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-secondary)', width: '80px' }}>Position</th>
                  <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-secondary)' }}>Player Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', width: '100px' }}>Points</th>
                  <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', width: '110px' }}>Bounties</th>
                  <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right', width: '100px' }}>Money</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(({ pos, entry }) => {
                  if (!entry) {
                    return (
                      <tr 
                        key={`pos-summary-empty-${pos}`}
                        style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.002)' }}
                      >
                        <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          #{pos}
                        </td>
                        <td style={{ padding: '10px 10px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          [Active Player]
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                      </tr>
                    );
                  }

                  const m = state.members.find(member => member.id === entry.memberId);
                  const name = m ? `${m.firstName} ${m.lastName}` : getMemberName(entry.memberId);
                  
                  // Live dynamic calculations
                  let payoutEarned = payouts[pos - 1] || 0;
                  if (pos === 9) {
                    payoutEarned = activeTournament.bubbleAmount || 0;
                  }
                  const basePositionPoints = N - pos + 1;
                  let multiplier = 1;
                  if (pos === 1) {
                    multiplier = 3;
                  } else if (pos >= 2 && pos <= 10) {
                    multiplier = 2;
                  }
                  const pointsEarned = (basePositionPoints * multiplier) + (entry.bountiesCollected * 3) + attendancePoints;
                  const moneyReceived = payoutEarned + (entry.bountiesCollected * activeTournament.bountyAmount);

                  return (
                    <tr 
                      key={entry.memberId}
                      style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.005)' }}
                    >
                      <td style={{ padding: '10px 10px', fontWeight: 800, color: 'var(--color-danger)' }}>
                        #{pos}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, textAlign: 'center', color: 'var(--color-gold)' }}>
                        {pointsEarned} pts
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, textAlign: 'center', color: entry.bountiesCollected > 0 ? '#34d399' : 'var(--text-secondary)' }}>
                        {entry.bountiesCollected > 0 ? `${entry.bountiesCollected} bounty` + (entry.bountiesCollected > 1 ? 's' : '') : '0'}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, textAlign: 'right', color: 'var(--color-emerald)' }}>
                        ${moneyReceived}
                        {payoutEarned > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 400 }}>
                            (${payoutEarned} + ${entry.bountiesCollected * activeTournament.bountyAmount})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

        return (
          <div className="glass-card animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Tournament Elimination Summary</h3>
              <span style={{ fontSize: '0.85rem', padding: '4px 10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', fontWeight: 600 }}>
                {bustedEntries.length} of {N} Players Busted
              </span>
            </div>

            {bustedEntries.length > 0 ? (
              <div style={{
                display: 'flex',
                gap: '24px',
                width: '100%',
                flexWrap: 'wrap'
              }} className="summary-columns-container">
                <div style={{ flex: 1 }}>
                  {renderSummaryTable(leftColumnEntries)}
                </div>
                <div style={{ flex: 1 }}>
                  {rightColumnEntries.length > 0 ? renderSummaryTable(rightColumnEntries) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
                      Remaining players not yet knocked out.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No players have busted out yet.
              </div>
            )}
          </div>
        );
      })()}

          {/* Elimination details prompt modal */}
          <EliminationModal
            isOpen={!!eliminatingPlayerId}
            playerName={eliminatingPlayerId ? getMemberName(eliminatingPlayerId) : ''}
            bountiesWon={bountiesWon}
            setBountiesWon={setBountiesWon}
            onCancel={() => setEliminatingPlayerId(null)}
            onConfirm={submitElimination}
          />

          {/* Finalize Payouts Modal */}
          {showFinalizeModal && activeTournament && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              zIndex: 1000
            }}>
              <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                  Finalize Tournament Payouts
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Enter the final prize pool to distribute. Standings points and individual payouts will be calculated based on the configured percentages.
                </p>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ fontWeight: 600 }}>Total Prize Pool Cash ($)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder={`Calculated: $${(activeTournament.entries.filter(e => e.hasBuyIn).length * activeTournament.buyInAmount) + ((activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter(e => e.hasAddon).length) * activeTournament.addonAmount)}`}
                    value={activeTournament.overridePrizePool || ''}
                    onChange={(e) => updateTournament(activeTournament.id, { overridePrizePool: Number(e.target.value) || undefined })}
                    className="form-input"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>Payout Preview</h4>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      const countAddons = activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter(e => e.hasAddon).length;
                      const netBuyIn = activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount;
              const rawCalcPrizePool = (activeTournament.entries.filter(e => e.hasBuyIn).length * netBuyIn) + (countAddons * activeTournament.addonAmount);
              const calcPrizePool = Math.max(0, rawCalcPrizePool - (activeTournament.highHandAmount || 0));
                      const finalPool = activeTournament.overridePrizePool !== undefined && activeTournament.overridePrizePool > 0
                        ? activeTournament.overridePrizePool
                        : calcPrizePool;
                      const pctList = activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
                      
                      const activeAndElims = [...activeTournament.entries].sort((a,b) => {
                        const aPos = a.eliminatedAt ? (a.finishPosition || 999) : 1;
                        const bPos = b.eliminatedAt ? (b.finishPosition || 999) : 1;
                        return aPos - bPos;
                      });

                      const previewRows = pctList.map((pct, idx) => {
                        if (pct <= 0) return null;
                        const place = idx + 1;
                        const amt = Math.round(finalPool * (pct / 100));
                        const entry = activeAndElims[idx];
                        const playerName = entry ? getMemberName(entry.memberId) : 'TBD';
                        return (
                          <div key={place} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`} Place:</span>
                            <span style={{ fontWeight: 600 }}>
                              ${amt} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({playerName} - {pct}%)</span>
                            </span>
                          </div>
                        );
                      }).filter(Boolean);

                      return (
                        <>
                          {previewRows.length > 0 ? previewRows : <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>No places paid. Check payout structure configuration.</p>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                            <span>High Hand Payout:</span>
                            <strong style={{ color: 'var(--color-gold)' }}>${activeTournament.highHandAmount || 0}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setShowFinalizeModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      finalizeTournament(activeTournament.id);
                      setShowFinalizeModal(false);
                      setSubTab('results');
                    }}
                    className="btn btn-primary"
                    style={{ backgroundColor: 'var(--color-emerald)' }}
                  >
                    Confirm & Post Results
                  </button>
                </div>
              </div>
            </div>
          )}


      {/* Results Tab (Completed) */}
      {subTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-slide-up">
          
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={22} style={{ color: 'var(--color-gold)' }} />
                <span>Final Tournament Rankings</span>
              </h3>
              <button 
                className="btn btn-secondary" 
                onClick={() => exportTournamentResultsCSV(activeTournament)}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Export Results to CSV
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Rank</th>
                    <th>Player Name</th>
                    <th style={{ textAlign: 'center' }}>Buy-in</th>
                    <th style={{ textAlign: 'center' }}>Add-on</th>
                    <th style={{ textAlign: 'center' }}>ToC</th>
                    <th style={{ textAlign: 'center' }}>Bounties</th>
                    <th style={{ textAlign: 'right' }}>Cash Payout</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-gold)' }}>Standings Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeTournament.entries]
                    .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99))
                    .map((entry) => {
                      const name = getMemberName(entry.memberId);
                      return (
                        <tr key={entry.memberId}>
                          <td style={{ fontWeight: 700 }}>
                            {entry.finishPosition}
                          </td>
                          <td style={{ fontWeight: 600 }}>{name}</td>
                          <td style={{ textAlign: 'center' }}>✓</td>
                          <td style={{ textAlign: 'center' }}>{entry.hasAddon ? '✓' : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{entry.hasDealerAppreciation ? '✓' : '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.bountiesCollected}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-emerald)' }}>
                            {entry.payoutEarned > 0 ? `$${entry.payoutEarned}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-gold)' }}>
                            {entry.pointsEarned} pts
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {subTab === 'print' && (() => {

        // Retrieve registered members for active tournament (both check-in and RSVP)
        const registeredMembers = activeTournament.entries
          .map(e => state.members.find(m => m.id === e.memberId))
          .filter(Boolean) as Member[];
        // Sort registered members alphabetically by first name
        const sortedRegisteredMembers = [...registeredMembers].sort((a, b) => 
          a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)
        );

        // Decide which list to print
        const printPlayers = sortedRegisteredMembers;

        // Chunk players into pages of 50
        const itemsPerPage = 50;
        const pageChunks: Member[][] = [];
        for (let i = 0; i < printPlayers.length; i += itemsPerPage) {
          pageChunks.push(printPlayers.slice(i, i + itemsPerPage));
        }
        if (pageChunks.length === 0) {
          pageChunks.push([]); // Ensure at least one empty page renders
        }

        return (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Screen controls - hidden on print */}
            <div className="glass-card no-print" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Print Tournament Sheets</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Generate print-ready sheets optimized for standard 8.5" × 11" paper.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (printType === 'signin') {
                      generateSignInSheetPDF(activeTournament.date, sortedRegisteredMembers);
                    } else {
                      generateTDScoreSheetPDF(activeTournament.name, activeTournament.date, sortedRegisteredMembers);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                >
                  📥 Download PDF
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPrintType('signin')}
                  className={`btn ${printType === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    backgroundColor: printType === 'signin' ? 'var(--color-emerald)' : 'rgba(255,255,255,0.05)',
                    borderColor: printType === 'signin' ? 'var(--color-emerald)' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  Player Sign-In Sheet ({sortedRegisteredMembers.length} RSVPs)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintType('scoresheet')}
                  className={`btn ${printType === 'scoresheet' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    backgroundColor: printType === 'scoresheet' ? 'var(--color-emerald)' : 'rgba(255,255,255,0.05)',
                    borderColor: printType === 'scoresheet' ? 'var(--color-emerald)' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  TD Score Sheet ({sortedRegisteredMembers.length} Registered Players)
                </button>
              </div>
            </div>

            {/* Print Stylesheet Injection */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body, html {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                /* Hide screen-only containers */
                .sidebar, .top-navbar, .no-print, button, input, .subtab-navigation, .back-button,
                .tournament-header-banner, .payouts-config-banner, .tab-headers-container {
                  display: none !important;
                }
                /* Reset layout on parent containers */
                body, html, #root, .app-container, .admin-portal-layout, .main-content, 
                .animate-slide-up, .tournament-details-container {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                /* Hide siblings inside the animate-slide-up wrapper */
                .animate-slide-up > *:not(.print-root-container) {
                  display: none !important;
                }
                .print-root-container {
                  display: block !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .print-page-layout {
                  display: block !important;
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                  box-sizing: border-box !important;
                  width: 8.5in !important;
                  height: 11in !important;
                  padding: 0.5in !important;
                  margin: 0 auto !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  position: relative !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .print-row-item {
                  page-break-inside: avoid !important;
                }
              }
              
              /* Screen Preview Styles */
              .preview-pages-container {
                display: flex;
                flex-direction: column;
                gap: 24px;
                align-items: center;
                margin-top: 12px;
                width: 100%;
              }
              .preview-page-sheet {
                background: #ffffff;
                color: #000000;
                width: 8.5in;
                height: 11in;
                padding: 0.5in;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                border-radius: 4px;
                box-sizing: border-box;
                position: relative;
                border: 1px solid #ddd;
              }
            `}} />

            {/* Print Content Preview / Print Target Container */}
            <div className="print-root-container preview-pages-container">
              {pageChunks.map((chunk, pageIdx) => {
                const leftCol = chunk.slice(0, 25);
                const rightCol = chunk.slice(25, 50);

                return (
                  <div key={pageIdx} className="print-page-layout preview-page-sheet">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '14pt', fontWeight: 800, margin: 0, color: '#000' }}>
                        {printType === 'signin' ? 'Penny Ante Club - Player Sign-In Sheet' : `${activeTournament.name} - TD Score Sheet`}
                      </h3>
                      <span style={{ fontSize: '9pt', color: '#555', fontWeight: 600 }}>
                        Date: {activeTournament.date} | Page {pageIdx + 1} of {pageChunks.length}
                      </span>
                    </div>

                    {/* Layout Body */}
                    {printType === 'signin' ? (
                      /* Sign-In Sheet Columns Layout */
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '9pt', fontWeight: 700, borderBottom: '2px solid #000', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000' }}>
                          <div style={{ width: '50%', display: 'flex', paddingRight: '0.25in' }}>
                            <span style={{ width: '26px' }}></span>
                            <span style={{ width: '60px' }}>ID</span>
                            <span>Player Name</span>
                          </div>
                          <div style={{ width: '50%', display: 'flex', paddingLeft: '0.25in', borderLeft: '1px solid #000' }}>
                            <span style={{ width: '26px' }}></span>
                            <span style={{ width: '60px' }}>ID</span>
                            <span>Player Name</span>
                          </div>
                        </div>

                        {Array.from({ length: 25 }).map((_, rowIdx) => {
                          const leftPlayer = leftCol[rowIdx];
                          const rightPlayer = rightCol[rowIdx];

                          return (
                            <div 
                              key={rowIdx} 
                              className="print-row-item" 
                              style={{ 
                                display: 'flex', 
                                height: '0.35in', 
                                alignItems: 'center', 
                                fontSize: '11pt', 
                                borderBottom: '1px solid #ccc',
                                color: '#000'
                              }}
                            >
                              {/* Left Cell */}
                              <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingRight: '0.25in', height: '100%' }}>
                                {leftPlayer ? (
                                  <>
                                    <span style={{ 
                                      width: '14px', 
                                      height: '14px', 
                                      border: '1.5px solid #000', 
                                      marginRight: '12px', 
                                      display: 'inline-block',
                                      flexShrink: 0
                                    }} />
                                    <span style={{ width: '60px', fontWeight: 700 }}>{leftPlayer.id}</span>
                                    <span style={{ fontWeight: 500 }}>
                                      {leftPlayer.firstName} {leftPlayer.lastName || ''}
                                    </span>
                                  </>
                                ) : (
                                  <div style={{ visibility: 'hidden' }}>&nbsp;</div>
                                )}
                              </div>

                              {/* Right Cell */}
                              <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingLeft: '0.25in', borderLeft: '1px solid #000', height: '100%' }}>
                                {rightPlayer ? (
                                  <>
                                    <span style={{ 
                                      width: '14px', 
                                      height: '14px', 
                                      border: '1.5px solid #000', 
                                      marginRight: '12px', 
                                      display: 'inline-block',
                                      flexShrink: 0
                                    }} />
                                    <span style={{ width: '60px', fontWeight: 700 }}>{rightPlayer.id}</span>
                                    <span style={{ fontWeight: 500 }}>
                                      {rightPlayer.firstName} {rightPlayer.lastName || ''}
                                    </span>
                                  </>
                                ) : (
                                  <div style={{ visibility: 'hidden' }}>&nbsp;</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* TD Score Sheet Layout */
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', color: '#000' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #000', textTransform: 'uppercase', fontSize: '8.5pt', fontWeight: 700 }}>
                            {/* Left Column Headers */}
                            <th style={{ textAlign: 'left', padding: '6px 4px', width: '21%', color: '#000' }}>First Name</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px', width: '21%', color: '#000' }}>Last Name</th>
                            <th style={{ textAlign: 'center', padding: '6px 4px', width: '8%', borderRight: '1px solid #ccc', color: '#000' }}>place</th>
                            <th style={{ textAlign: 'center', padding: '6px 4px', width: '8%', borderRight: '2px solid #000', color: '#000' }}>bounties</th>
                            
                            {/* Right Column Headers */}
                            <th style={{ textAlign: 'left', padding: '6px 4px', width: '21%', paddingLeft: '12px', color: '#000' }}>First Name</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px', width: '21%', color: '#000' }}>Last Name</th>
                            <th style={{ textAlign: 'center', padding: '6px 4px', width: '8%', borderRight: '1px solid #ccc', color: '#000' }}>place</th>
                            <th style={{ textAlign: 'center', padding: '6px 4px', width: '8%', color: '#000' }}>bounties</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 25 }).map((_, rowIdx) => {
                            const leftPlayer = leftCol[rowIdx];
                            const rightPlayer = rightCol[rowIdx];

                            return (
                              <tr 
                                key={rowIdx} 
                                className="print-row-item" 
                                style={{ 
                                  height: '0.35in', 
                                  borderBottom: '1px solid #ccc'
                                }}
                              >
                                {/* Left Column Data */}
                                <td style={{ padding: '4px', fontWeight: 700, color: '#000' }}>
                                  {leftPlayer?.firstName || ''}
                                </td>
                                <td style={{ padding: '4px', color: '#000' }}>
                                  {leftPlayer?.lastName || ''}
                                </td>
                                <td style={{ padding: '4px', borderRight: '1px solid #ccc' }}></td>
                                <td style={{ padding: '4px', borderRight: '2px solid #000' }}></td>
                                
                                {/* Right Column Data */}
                                <td style={{ padding: '4px', paddingLeft: '12px', fontWeight: 700, color: '#000' }}>
                                  {rightPlayer?.firstName || ''}
                                </td>
                                <td style={{ padding: '4px', color: '#000' }}>
                                  {rightPlayer?.lastName || ''}
                                </td>
                                <td style={{ padding: '4px', borderRight: '1px solid #ccc' }}></td>
                                <td style={{ padding: '4px' }}></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {subTab === 'accounting' && (() => {
        // Calculate dynamic financials
        const buyInCount = activeTournament.entries.filter(e => e.hasBuyIn).length;
        const addonCount = buyInCount === 0 ? 0 : (activeTournament.totalAddons !== undefined ? activeTournament.totalAddons : activeTournament.entries.filter(e => e.hasAddon).length);
        const dealerCount = activeTournament.entries.filter(e => e.hasDealerAppreciation).length;

        const netBuyIn = activeTournament.buyInAmount - (activeTournament.dealerAppreciationAmount || 0) - (activeTournament.foodAmount || 0);
        const netAddon = activeTournament.addonAmount;
        const rawPrizePool = (buyInCount * netBuyIn) + (addonCount * netAddon);
        const currentPrizePool = activeTournament.status === 'completed' 
          ? activeTournament.totalPrizePool 
          : Math.max(0, rawPrizePool - (activeTournament.highHandAmount || 0) - (activeTournament.bubbleAmount || 0));

        const currentDealerPool = activeTournament.status === 'completed'
          ? activeTournament.totalDealerAppreciation
          : (dealerCount * (activeTournament.dealerAppreciationAmount || 0));

        const foodCollected = buyInCount * (activeTournament.foodAmount || 0);
        const totalCollected = (buyInCount * activeTournament.buyInAmount) + (addonCount * activeTournament.addonAmount);

        const payouts = (activeTournament.payoutPercentages || [50, 30, 20, 0, 0, 0, 0, 0, 0, 0])
          .map((pct, idx) => ({ place: idx + 1, pct }))
          .filter(p => p.pct > 0);

        return (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
            {/* Metrics cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              
              {/* Card 1: TOTAL collected */}
              <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  TOTAL COLLECTED
                </span>
                <h3 style={{ fontSize: '1.8rem', color: '#ffffff', fontWeight: 800, margin: 0 }}>
                  ${totalCollected.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {buyInCount} buy-ins @ ${activeTournament.buyInAmount} + {addonCount} add-ons @ ${activeTournament.addonAmount}
                </span>
              </div>

              {/* Card 2: Prize Pool */}
              <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gold)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  PRIZE POOL
                </span>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--color-emerald)', fontWeight: 800, margin: 0 }}>
                  ${currentPrizePool.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {buyInCount} net buy-ins @ ${netBuyIn} + {addonCount} add-ons @ ${netAddon}
                </span>
              </div>

              {/* Card 3: ToC Pool */}
              <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  TOC POOL
                </span>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
                  ${currentDealerPool.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {buyInCount} players checked in @ ${activeTournament.dealerAppreciationAmount || 0}
                </span>
              </div>

              {/* Card 4: Food Collected */}
              <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  FOOD COLLECTED
                </span>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
                  ${foodCollected.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {buyInCount} buy-ins @ ${activeTournament.foodAmount || 0}
                </span>
              </div>

            </div>

            {/* Payout Breakdown Section */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>
                  Prize Pool & Player Payouts
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
                  Based on the configured placing percentages and the net prize pool.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px', width: '80px', textAlign: 'center' }}>Place</th>
                      <th style={{ padding: '12px 8px', width: '120px', textAlign: 'center' }}>Percentage</th>
                      <th style={{ padding: '12px 8px', width: '150px', textAlign: 'right' }}>Prize Amount</th>
                      <th style={{ padding: '12px 8px', paddingLeft: '24px' }}>Recipient Player</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length > 0 ? (
                      payouts.map(p => {
                        const amount = (p.pct / 100) * currentPrizePool;
                        
                        // Find matching player if completed
                        const placingPlayer = activeTournament.entries.find(e => e.eliminatedAt && e.finishPosition === p.place);
                        const recipientName = placingPlayer 
                          ? getMemberName(placingPlayer.memberId) 
                          : (activeTournament.status === 'completed' ? 'Unplaced' : 'TBD (Game In Progress)');

                        return (
                          <tr key={p.place} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--color-gold)' }}>
                              {p.place === 1 ? '1st' : p.place === 2 ? '2nd' : p.place === 3 ? '3rd' : `${p.place}th`}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>
                              {p.pct}%
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-emerald)' }}>
                              ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '12px 8px', paddingLeft: '24px', color: placingPlayer ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: placingPlayer ? 'normal' : 'italic' }}>
                              {recipientName}
                            </td>
                          </tr>
                        );
                      })
                    ) : null}

                    {/* Pay-the-Bubble Row */}
                    {(activeTournament.bubbleAmount || 0) > 0 && (() => {
                      const placingPlayer = activeTournament.entries.find(e => e.eliminatedAt && e.finishPosition === 9); // Bubble is 9th position
                      const recipientName = placingPlayer 
                        ? getMemberName(placingPlayer.memberId) 
                        : (activeTournament.status === 'completed' ? 'Unplaced' : 'TBD (Bubble Player)');
                      return (
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(242, 193, 102, 0.05)' }}>
                          <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--color-gold)' }}>
                            Bubble
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Fixed
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-emerald)' }}>
                            ${(activeTournament.bubbleAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 8px', paddingLeft: '24px', color: placingPlayer ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: placingPlayer ? 'normal' : 'italic' }}>
                            {recipientName}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* High Hand Row */}
                    {(activeTournament.highHandAmount || 0) > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(242, 193, 102, 0.05)' }}>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--color-gold)' }}>
                          High Hand
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Fixed
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-emerald)' }}>
                          ${(activeTournament.highHandAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 8px', paddingLeft: '24px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          TBD (Highest Hand)
                        </td>
                      </tr>
                    )}

                    {payouts.length === 0 && (!activeTournament.bubbleAmount) && (!activeTournament.highHandAmount) && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '24px' }}>
                          No payouts configured yet. Click 'Edit Payouts & Add-ons' banner above to setup.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {subTab === 'clock' && (
        <TournamentClock 
          tournament={activeTournament}
          members={state.members}
          eliminatePlayer={(tId, mId) => eliminatePlayer(tId, mId, 0)}
          updateTournament={updateTournament}
          onAddLateEntry={() => setSubTab('checkin')}
        />
      )}

      {isPayoutModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflowY: 'auto',
          zIndex: 100,
          padding: '40px 20px'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '550px', backgroundColor: 'var(--bg-surface)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Configure Add-ons & Payouts</h3>
              <button 
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Enter the total add-ons and percentages from the external software. The prize pool and place payouts will recalculate live.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const finalPayoutPcts = [...modalPayoutPcts];
              finalPayoutPcts[8] = 0; // 9th is Bubble
              finalPayoutPcts[9] = 0; // 10th is High Hand
              updateTournament(activeTournament.id, {
                totalAddons: modalAddons,
                payoutPercentages: finalPayoutPcts,
                highHandAmount: modalHighHand,
                bubbleAmount: modalBubble
              });
              setIsPayoutModalOpen(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Total Add-ons Count</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={modalAddons}
                  onChange={(e) => setModalAddons(Number(e.target.value))}
                  className="form-input"
                  style={{ padding: '8px 12px' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '12px', fontSize: '0.9rem' }}>Payout Structure (1st - 10th Place)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {[1, 6, 2, 7, 3, 8, 4, 9, 5, 10].map(place => {
                    if (place === 9) {
                      return (
                        <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', width: '65px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Bubble:</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>$</span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={modalBubble}
                            onChange={(e) => setModalBubble(Number(e.target.value))}
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', flex: 1 }}
                          />
                        </div>
                      );
                    }
                    if (place === 10) {
                      return (
                        <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', width: '65px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Hi Hand:</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>$</span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={modalHighHand}
                            onChange={(e) => setModalHighHand(Number(e.target.value))}
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.85rem', flex: 1 }}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', width: '65px', textAlign: 'right' }}>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          required
                          value={modalPayoutPcts[place - 1]}
                          onChange={(e) => {
                            const next = [...modalPayoutPcts];
                            next[place - 1] = Number(e.target.value);
                            setModalPayoutPcts(next);
                          }}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '0.85rem', flex: 1 }}
                        />
                        <span style={{ fontSize: '0.8rem' }}>%</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                  Total: <strong style={{ color: modalPayoutPcts.slice(0, 8).reduce((a,b)=>a+b,0) === 100 ? 'var(--color-emerald)' : 'var(--text-secondary)' }}>
                    {modalPayoutPcts.slice(0, 8).reduce((a,b)=>a+b,0)}%
                  </strong> (should be 100%)
                </div>
              </div>

              {/* Dynamic Live Payout Preview Table */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Live Payout Breakdown</h4>
                {(() => {
                  const netBuyIn = activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount;
                  const rawCalculatedPrizePool = (buyInCount * netBuyIn) + (modalAddons * activeTournament.addonAmount);
                  const calculatedPrizePool = Math.max(0, rawCalculatedPrizePool - modalHighHand - modalBubble);
                  const previewRows = modalPayoutPcts.slice(0, 8).map((pct, idx) => {
                    if (pct <= 0) return null;
                    const place = idx + 1;
                    const amt = Math.round(calculatedPrizePool * (pct / 100));
                    return (
                      <div key={place} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`} Place:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>${amt} ({pct}%)</strong>
                      </div>
                    );
                  }).filter(Boolean);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '4px', marginBottom: '4px' }}>
                        <span>Percentage Prize Pool:</span>
                        <span style={{ color: 'var(--color-emerald)' }}>${calculatedPrizePool}</span>
                      </div>
                      {previewRows.length > 0 ? previewRows : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No payouts. Configure percentages above.</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                        <span>Bubble Payout:</span>
                        <strong style={{ color: 'var(--color-gold)' }}>${modalBubble}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>High Hand Payout:</span>
                        <strong style={{ color: 'var(--color-gold)' }}>${modalHighHand}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                        <span>Total Collected:</span>
                        <span style={{ color: '#ffffff' }}>${rawCalculatedPrizePool}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button type="button" onClick={() => setIsPayoutModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--color-gold)', color: '#78350f' }}
                  disabled={modalPayoutPcts.slice(0, 8).reduce((a,b)=>a+b,0) !== 100}
                >
                  Save Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Full Screen Seating Assignments Modal */}
      {activeTournament && (
        <SeatingDisplayModal
          isOpen={isDisplayModeOpen}
          onClose={() => setIsDisplayModeOpen(false)}
          tournamentName={activeTournament.name}
          tournamentDate={activeTournament.date}
          seating={seating}
          dealers={dealers}
          members={state.members}
          activeTournament={activeTournament}
          onEliminatePlayer={(playerId) => {
            setEliminatingPlayerId(playerId);
            setBountiesWon(0);
          }}
        />
      )}

      {/* Late Entry Overlay Modal */}
      <LateEntryModal
        isOpen={isLateEntryOpen}
        activeTournament={activeTournament}
        members={state.members}
        seating={seating}
        selectedLateMemberId={selectedLateMemberId}
        setSelectedLateMemberId={setSelectedLateMemberId}
        selectedLateTable={selectedLateTable}
        setSelectedLateTable={setSelectedLateTable}
        lateSearchQuery={lateSearchQuery}
        setLateSearchQuery={setLateSearchQuery}
        showLateDropdown={showLateDropdown}
        setShowLateDropdown={setShowLateDropdown}
        getMemberName={getMemberName}
        onCancel={() => setIsLateEntryOpen(false)}
        onSubmit={submitLateEntry}
      />

      {/* Edit Tournament Details Modal */}
      {isEditTourDetailsOpen && activeTournament && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000001,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '1100px', backgroundColor: 'var(--bg-surface)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Tournament Details</h3>
              <button 
                onClick={() => setIsEditTourDetailsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTourDetails} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '24px' }}>
              
              {/* Column 1: General Info & Financials */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold)', margin: '0 0 6px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>General & Financials</h4>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Tournament Name / Number</label>
                  <input
                    type="text"
                    required
                    value={editTourName}
                    onChange={(e) => setEditTourName(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Date</label>
                    <input
                      type="date"
                      required
                      value={editTourDate}
                      onChange={(e) => setEditTourDate(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch (err) { console.warn(err); } }}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Time</label>
                    <input
                      type="text"
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Location</label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Buy-in ($)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editBuyIn}
                      onChange={(e) => setEditBuyIn(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Add-on ($)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editAddon}
                      onChange={(e) => setEditAddon(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Bounty ($)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editBounty}
                      onChange={(e) => setEditBounty(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>ToC Fee ($)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editDealerApp}
                      onChange={(e) => setEditDealerApp(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>High Hand Deduction ($)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editHighHand}
                      onChange={(e) => setEditHighHand(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Max Seats / Players Limit</label>
                    <input
                      type="number"
                      min={2}
                      required
                      value={editMaxPlayers}
                      onChange={(e) => setEditMaxPlayers(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Chips, Rules & Flyer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold)', margin: '0 0 6px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>Chips, Formats & Flyer</h4>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Starting Stack Description</label>
                  <input
                    type="text"
                    required
                    value={editStartingStack}
                    onChange={(e) => setEditStartingStack(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Add-on Chips Count</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editAddonChips}
                      onChange={(e) => setEditAddonChips(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Level (mins)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editRoundLength}
                      onChange={(e) => setEditRoundLength(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Rebuys</label>
                    <input
                      type="text"
                      required
                      value={editRebuys}
                      onChange={(e) => setEditRebuys(e.target.value)}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Late Entry</label>
                    <input
                      type="text"
                      required
                      value={editLateEntry}
                      onChange={(e) => setEditLateEntry(e.target.value)}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                </div>



                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Flyer / PDF URL (Google Drive)</label>
                    <input
                      type="text"
                      placeholder="e.g. https://drive.google.com/..."
                      value={editFlyerUrl}
                      onChange={(e) => setEditFlyerUrl(e.target.value)}
                      className="form-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>Flyer Type</label>
                    <select
                      value={editFlyerType || ''}
                      onChange={(e) => setEditFlyerType((e.target.value as any) || null)}
                      className="form-input"
                      style={{ padding: '10px 14px', cursor: 'pointer' }}
                    >
                      <option value="">None</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Image</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Column 3: Actions Only (making layout balanced) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%', paddingBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditTourDetailsOpen(false)}
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '10px 20px' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Missing Phone Number Prompt Modal */}
      {phonePromptMember && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '100%',
            maxWidth: '450px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--color-emerald)',
                padding: '8px',
                borderRadius: '8px',
                display: 'inline-flex'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Verify Phone Number</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Confirming check-in for <strong>{phonePromptMember.firstName} {phonePromptMember.lastName}</strong>.
                </p>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                Phone Number (Optional)
              </label>
              <input
                type="text"
                placeholder="(XXX) XXX-XXXX"
                value={phonePromptInput}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 10) val = val.substring(0, 10);
                  let formatted = val;
                  if (val.length > 6) {
                    formatted = `(${val.substring(0, 3)}) ${val.substring(3, 6)}-${val.substring(6)}`;
                  } else if (val.length > 3) {
                    formatted = `(${val.substring(0, 3)}) ${val.substring(3)}`;
                  } else if (val.length > 0) {
                    formatted = `(${val}`;
                  }
                  setPhonePromptInput(formatted);
                }}
                className="form-input"
                style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Providing a phone number helps notify players about seating and event updates.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setPhonePromptMember(null);
                  setOnPhonePromptComplete(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPhonePromptComplete) {
                    onPhonePromptComplete("");
                  }
                  setPhonePromptMember(null);
                  setOnPhonePromptComplete(null);
                }}
                className="btn btn-ghost"
                style={{ padding: '8px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              >
                Skip & Check In
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPhonePromptComplete) {
                    onPhonePromptComplete(phonePromptInput);
                  }
                  setPhonePromptMember(null);
                  setOnPhonePromptComplete(null);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Save & Check In
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};