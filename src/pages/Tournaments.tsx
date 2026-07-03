import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import type { Member } from '../types';
import { formatDate } from '../utils/stats';
import { SeatingDisplayModal } from '../components/SeatingDisplayModal';
import { 
  Trophy, Play, RotateCcw, Plus, Trash2, 
  UserMinus, ChevronLeft, Unlock, Calendar, ShieldAlert, Award
} from 'lucide-react';

interface TournamentsProps {
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
  isCreateTourOpen: boolean;
  setIsCreateTourOpen: (open: boolean) => void;
}

export const Tournaments: React.FC<TournamentsProps> = ({
  selectedTournamentId,
  setSelectedTournamentId,
  isCreateTourOpen,
  setIsCreateTourOpen
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
  const [subTab, setSubTab] = useState<'checkin' | 'seating' | 'players' | 'results' | 'rsvp'>('rsvp');

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
    }
  }, [activeTournament, isPayoutModalOpen]);

  useEffect(() => {
    if (activeTournament) {
      // Default sub-tab based on status
      if (activeTournament.status === 'draft') setSubTab('rsvp');
      else if (activeTournament.status === 'active') setSubTab('players');
      else if (activeTournament.status === 'completed') setSubTab('results');

      // Load seating
      const savedSeating = localStorage.getItem(`patms_seating_${activeTournament.id}`);
      if (savedSeating) {
        setSeating(JSON.parse(savedSeating));
      } else {
        setSeating({});
      }

      // Load dealers
      const savedDealers = localStorage.getItem(`patms_dealers_${activeTournament.id}`);
      if (savedDealers) {
        setDealers(JSON.parse(savedDealers));
      } else {
        setDealers({});
      }

      // Load preassigned dealers
      const savedPreassigned = localStorage.getItem(`patms_preassigned_dealers_${activeTournament.id}`);
      if (savedPreassigned) {
        setPreassignedDealers(JSON.parse(savedPreassigned));
      } else {
        setPreassignedDealers([]);
      }
    }
  }, [selectedTournamentId, activeTournament?.status]);

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
    const currentDealerId = dealers[tableName];
    const newDealers = { ...dealers };
    const newSeating = { ...seating };
    let updatedPreassigned = [...preassignedDealers];

    if (currentDealerId === playerId) {
      delete newDealers[tableName];
      updatedPreassigned = updatedPreassigned.filter(id => id !== playerId);
    } else {
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

      if (currentDealerId) {
        updatedPreassigned = updatedPreassigned.filter(id => id !== currentDealerId);
      }
      if (!updatedPreassigned.includes(playerId)) {
        updatedPreassigned.push(playerId);
      }
    }

    setDealers(newDealers);
    localStorage.setItem(`patms_dealers_${activeTournament.id}`, JSON.stringify(newDealers));
    setSeating(newSeating);
    localStorage.setItem(`patms_seating_${activeTournament.id}`, JSON.stringify(newSeating));
    setPreassignedDealers(updatedPreassigned);
    localStorage.setItem(`patms_preassigned_dealers_${activeTournament.id}`, JSON.stringify(updatedPreassigned));
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
    }
  };

  const generateSeating = () => {
    if (!activeTournament) return;
    const players = activeTournament.entries.filter(e => e.hasBuyIn).map(e => e.memberId);
    if (players.length === 0) return;

    const checkedInDealers = players.filter(id => preassignedDealers.includes(id));
    const checkedInNonDealers = players.filter(id => !preassignedDealers.includes(id));

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

      let dealerIdx = 0;
      let nonDealerIdx = 0;

      Object.entries(tableConfigs).forEach(([tableName, size]) => {
        const tablePlayers: string[] = [];
        let dealerId = "";

        if (dealerIdx < shuffledDealers.length) {
          dealerId = shuffledDealers[dealerIdx++];
          tablePlayers.push(dealerId);
          candidateDealers[tableName] = dealerId;
        }

        const remainingTablePlayers: string[] = [];
        while (tablePlayers.length + remainingTablePlayers.length < size) {
          if (nonDealerIdx < shuffledNonDealers.length) {
            remainingTablePlayers.push(shuffledNonDealers[nonDealerIdx++]);
          } else if (dealerIdx < shuffledDealers.length) {
            remainingTablePlayers.push(shuffledDealers[dealerIdx++]);
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
  };

  const movePlayerTable = (playerId: string, sourceTable: string, targetTable: string) => {
    const updated = { ...seating };
    
    if (updated[sourceTable]) {
      updated[sourceTable] = updated[sourceTable].map(id => id === playerId ? "" : id);
    }
    
    const targetPlayers = [...(updated[targetTable] || Array(10).fill(""))];
    const firstEmptyIdx = targetPlayers.indexOf("");
    if (firstEmptyIdx !== -1) {
      targetPlayers[firstEmptyIdx] = playerId;
    } else {
      targetPlayers.push(playerId);
    }
    updated[targetTable] = targetPlayers;

    const hasAnyPlayers = updated[sourceTable]?.some(id => id !== "") ?? false;
    if (!hasAnyPlayers && updated[sourceTable]) {
      delete updated[sourceTable];
    }

    setSeating(updated);
    localStorage.setItem(`patms_seating_${activeTournament!.id}`, JSON.stringify(updated));

    const updatedDealers = { ...dealers };
    if (updatedDealers[sourceTable] === playerId) {
      delete updatedDealers[sourceTable];
      setDealers(updatedDealers);
      localStorage.setItem(`patms_dealers_${activeTournament!.id}`, JSON.stringify(updatedDealers));
    }
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
      await updateTournament(activeTournament.id, { entries: updatedEntries });

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
    if (confirm(`Are you sure you want to permanently delete tournament "${name}"? This cannot be undone.`)) {
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
          <button className="btn btn-primary" onClick={() => setIsCreateTourOpen(true)}>
            <Plus size={18} />
            <span>New Tournament</span>
          </button>
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
                                Manage
                              </button>
                              <button
                                onClick={() => handleDeleteTour(t.id, t.name)}
                                className="btn btn-ghost"
                                style={{ padding: '6px', color: 'var(--color-danger)' }}
                              >
                                <Trash2 size={16} />
                              </button>
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
    : Math.max(0, rawPrizePool - (activeTournament.highHandAmount || 0));

  const currentBountyPool = activeTournament.status === 'completed'
    ? activeTournament.totalBountyPool
    : bountyCount * activeTournament.bountyAmount;

  const currentDealerPool = activeTournament.status === 'completed'
    ? activeTournament.totalDealerAppreciation
    : dealerCount * activeTournament.dealerAppreciationAmount;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
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
            Date: <strong>{formatDate(activeTournament.date)}</strong> | Total checked in: <strong>{activeTournament.entries.length} players</strong>
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
        <div className="glass-card" style={{
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
        </div>
      )}

      {/* Navigation tabs inside tournament */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
        {activeTournament.status === 'draft' ? (
          <>
            <button 
              className={`btn btn-ghost ${subTab === 'rsvp' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('rsvp')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'rsvp' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'rsvp' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'rsvp' ? 600 : 400
              }}
            >
              RSVP
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'checkin' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('checkin')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'checkin' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'checkin' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'checkin' ? 600 : 400
              }}
            >
              Check-in Registration
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'seating' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('seating')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'seating' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'seating' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'seating' ? 600 : 400
              }}
            >
              Seating Preview
            </button>
          </>
        ) : activeTournament.status === 'active' ? (
          <>
            <button 
              className={`btn btn-ghost ${subTab === 'rsvp' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('rsvp')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'rsvp' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'rsvp' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'rsvp' ? 600 : 400
              }}
            >
              RSVP
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'checkin' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('checkin')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'checkin' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'checkin' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'checkin' ? 600 : 400
              }}
            >
              Edit Check-ins
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'seating' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('seating')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'seating' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'seating' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'seating' ? 600 : 400
              }}
            >
              Seating Tables
            </button>
            <button 
              className={`btn btn-ghost ${subTab === 'players' ? 'active-subtab' : ''}`}
              onClick={() => setSubTab('players')}
              style={{
                borderRadius: '8px 8px 0 0',
                borderBottom: subTab === 'players' ? '3px solid var(--color-emerald)' : 'none',
                color: subTab === 'players' ? 'var(--color-emerald)' : 'var(--text-secondary)',
                fontWeight: subTab === 'players' ? 600 : 400
              }}
            >
              Eliminations Tracker ({activeTournament.entries.filter(e => !e.eliminatedAt).length} alive)
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
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px' }}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
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
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px' }}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
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
                                  style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: 'auto', borderRadius: '6px' }}
                                >
                                  Check In
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleCheckedInDealer(entry.memberId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
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
            <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '20px' }}>
              {renderFastPlayerLookup("Fast Player Lookup", checkinSearchRef)}

              {/* Configure Game Pricing */}
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
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Flyer Type</label>
                    <select
                      value={activeTournament.flyerType || ''}
                      onChange={(e) => updateTournament(activeTournament.id, { flyerType: (e.target.value as any) || null })}
                      className="form-input"
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
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
            </div>
          ) : (
            renderFastPlayerLookup("Fast Player Lookup (Late Entry / Registration)", lateSearchRef)
          )}
          
          {/* Checked-in list */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Checked-in Registrations</h4>
            {activeTournament.entries.filter(e => e.hasBuyIn).length > 0 ? (
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
                    {activeTournament.entries
                      .filter(e => e.hasBuyIn)
                      .sort((a, b) => Number(a.memberId) - Number(b.memberId))
                      .map((entry) => {
                        const m = state.members.find(member => member.id === entry.memberId);
                        if (!m) return null;

                      return (
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
                            {preassignedDealers.includes(entry.memberId) ? '👑 ' : ''}
                            {m.firstName} {m.lastName}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{m.id}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggleCheckedInDealer(entry.memberId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
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
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasBuyIn}
                              onChange={() => toggleEntryBuyIn(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={activeTournament.status !== 'draft' && activeTournament.status !== 'active'}
                            />
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.hasDealerAppreciation}
                              onChange={() => toggleEntryDealerApp(activeTournament.id, entry.memberId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-emerald)' }}
                              disabled={activeTournament.status !== 'draft' && activeTournament.status !== 'active'}
                            />
                          </td>
                          {activeTournament.status === 'draft' && (
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No players registered yet. Search for names to register check-ins.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seating Tab (Draft & Active) */}
      {subTab === 'seating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Seating Assignments</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setIsDisplayModeOpen(true)}>
                <Play size={16} />
                <span>Display Mode</span>
              </button>
              <button className="btn btn-secondary" onClick={generateSeating}>
                <RotateCcw size={16} />
                <span>Reshuffle & Balance Seating</span>
              </button>
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
                        const isDealer = dealers[tableName] === playerId;
                        
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
                                  cursor: 'pointer',
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
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  padding: '2px 4px',
                                  cursor: 'pointer'
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
        const half = Math.ceil(activePlayers.length / 2);
        const activeCol1 = activePlayers.slice(0, half);
        const activeCol2 = activePlayers.slice(half);
        const eliminatedEntries = activeTournament.entries
          .filter(e => e.eliminatedAt)
          .sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-up">
            
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Tournament Standings & Tracker</h3>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'start' }}>
              
              {/* Column 1: Active Players */}
              <div className="glass-card" style={{ padding: '12px 16px', borderColor: 'rgba(16,185,129,0.1)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-emerald)' }}>
                  Active Players (Part 1 - {activeCol1.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeCol1.map((p, idx) => (
                    <div 
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-emerald)', marginRight: '6px', fontWeight: 700 }}>{idx + 1}.</span>
                        {p.firstName} {p.lastName}
                      </span>
                      <button 
                        onClick={() => {
                          setEliminatingPlayerId(p.id);
                          setBountiesWon(0);
                        }}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', height: '28px' }}
                      >
                        Eliminate
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Active Players (continuation) */}
              <div className="glass-card" style={{ padding: '12px 16px', borderColor: 'rgba(16,185,129,0.1)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-emerald)' }}>
                  Active Players (Part 2 - {activeCol2.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeCol2.map((p, idx) => (
                    <div 
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-emerald)', marginRight: '6px', fontWeight: 700 }}>{half + idx + 1}.</span>
                        {p.firstName} {p.lastName}
                      </span>
                      <button 
                        onClick={() => {
                          setEliminatingPlayerId(p.id);
                          setBountiesWon(0);
                        }}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', height: '28px' }}
                      >
                        Eliminate
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: Eliminated Players */}
              <div className="glass-card" style={{ padding: '12px 16px', borderColor: 'rgba(248,113,113,0.1)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-danger)' }}>
                  Eliminated Players ({eliminatedEntries.length})
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                  {eliminatedEntries.map((entry) => {
                    const name = getMemberName(entry.memberId);
                    const killer = entry.eliminatedBy ? getMemberName(entry.eliminatedBy) : 'None';
                    
                    return (
                      <div 
                        key={entry.memberId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(248,113,113,0.01)',
                          border: '1px solid rgba(248,113,113,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {entry.finishPosition ? `#${entry.finishPosition} - ` : ''}
                            {name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            <span>By: <strong style={{ color: 'var(--text-gold)' }}>{killer}</strong></span>
                            <span>• Bounties: <strong style={{ color: 'var(--text-gold)' }}>{entry.bountiesCollected}</strong></span>
                            <span>• Total Won: <strong style={{ color: 'var(--color-emerald)' }}>${entry.payoutEarned + (entry.bountiesCollected * activeTournament.bountyAmount)}</strong></span>
                          </span>
                        </div>
                        <button 
                          onClick={() => undoElimination(activeTournament.id, entry.memberId)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 6px', fontSize: '0.75rem', minHeight: 'auto', height: '28px', color: 'var(--text-secondary)' }}
                        >
                          Undo
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

          {/* Elimination details prompt modal */}
          {eliminatingPlayerId && (
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
              zIndex: 1000001
            }}>
              <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
                  Eliminate {getMemberName(eliminatingPlayerId)}
                </h3>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Number of Bounties Won</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' }}>
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBountiesWon(num)}
                        className={`btn ${bountiesWon === num ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          width: '45px',
                          height: '45px',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          padding: 0,
                          border: bountiesWon === num ? '2px solid var(--color-emerald)' : '1px solid var(--border-subtle)'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Or enter custom bounties won:</label>
                    <input
                      type="number"
                      min={0}
                      value={bountiesWon}
                      onChange={(e) => setBountiesWon(Math.max(0, parseInt(e.target.value) || 0))}
                      className="form-input"
                      style={{ textAlign: 'center', padding: '8px 12px', fontSize: '1rem', width: '100%' }}
                      placeholder="Enter bounties won"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button onClick={() => setEliminatingPlayerId(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={submitElimination} className="btn btn-danger">
                    Confirm Elimination
                  </button>
                </div>
              </div>
            </div>
          )}

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
              updateTournament(activeTournament.id, {
                totalAddons: modalAddons,
                payoutPercentages: modalPayoutPcts
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
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '12px', fontSize: '0.9rem' }}>Payout Percentages (1st - 10th Place)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {[1, 6, 2, 7, 3, 8, 4, 9, 5, 10].map(place => (
                    <div key={place} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', width: '35px', textAlign: 'right' }}>{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}:</span>
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
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                  Total: <strong style={{ color: modalPayoutPcts.reduce((a,b)=>a+b,0) === 100 ? 'var(--color-emerald)' : 'var(--text-secondary)' }}>
                    {modalPayoutPcts.reduce((a,b)=>a+b,0)}%
                  </strong> (should be 100%)
                </div>
              </div>

              {/* Dynamic Live Payout Preview Table */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Live Payout Breakdown</h4>
                {(() => {
                  const netBuyIn = activeTournament.buyInAmount - activeTournament.bountyAmount - activeTournament.dealerAppreciationAmount;
          const rawCalculatedPrizePool = (buyInCount * netBuyIn) + (modalAddons * activeTournament.addonAmount);
          const calculatedPrizePool = Math.max(0, rawCalculatedPrizePool - (activeTournament.highHandAmount || 0));
                  const previewRows = modalPayoutPcts.map((pct, idx) => {
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
                        <span>Total Prize Pool:</span>
                        <span style={{ color: 'var(--color-emerald)' }}>${calculatedPrizePool}</span>
                      </div>
                      {previewRows.length > 0 ? previewRows : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No payouts. Configure percentages above.</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                        <span>High Hand Payout:</span>
                        <strong style={{ color: 'var(--color-gold)' }}>${activeTournament.highHandAmount || 0}</strong>
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
                  disabled={modalPayoutPcts.reduce((a,b)=>a+b,0) !== 100}
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
      {isLateEntryOpen && activeTournament && (
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
          zIndex: 1001,
          padding: '20px'
        }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Add Late Entry</h3>
            
            {/* Search Input for Member Lookup */}
            <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Search Registry Player</label>
              <input
                type="text"
                placeholder="Type member name or ID..."
                value={lateSearchQuery}
                onChange={(e) => {
                  setLateSearchQuery(e.target.value);
                  setShowLateDropdown(true);
                }}
                onFocus={() => setShowLateDropdown(true)}
                className="form-input"
                style={{ padding: '10px 14px' }}
              />

              {showLateDropdown && lateSearchQuery.trim() !== '' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  zIndex: 20,
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {(() => {
                    const registeredIds = activeTournament.entries.map(e => e.memberId);
                    const matched = state.members
                      .filter(m => !registeredIds.includes(m.id))
                      .filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(lateSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(lateSearchQuery.toLowerCase()));

                    if (matched.length > 0) {
                      return matched.map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedLateMemberId(m.id);
                            setLateSearchQuery(`${m.firstName} ${m.lastName}`);
                            setShowLateDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)'
                          }}
                          className="interactive"
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.firstName} {m.lastName}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8' + 'rem' }}>{m.id}</span>
                        </div>
                      ));
                    }

                    return (
                      <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
                        No unregistered members match.
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {selectedLateMemberId && (
              <div style={{ fontSize: '0.85rem', padding: '10px 12px', backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: 'var(--color-emerald)' }}>
                Selected Player: <strong>{getMemberName(selectedLateMemberId)} ({selectedLateMemberId})</strong>
              </div>
            )}

            {/* Select Destination Table */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>Assign to Table</label>
              <select
                value={selectedLateTable}
                onChange={(e) => setSelectedLateTable(e.target.value)}
                className="form-input"
                style={{ padding: '10px 14px' }}
              >
                <option value="" disabled>-- Select a Table --</option>
                {Object.keys(seating).map(tableName => {
                  const currentSize = seating[tableName]?.filter(id => id !== "").length ?? 0;
                  const isFull = currentSize >= 10;
                  return (
                    <option key={tableName} value={tableName} disabled={isFull}>
                      {tableName.toUpperCase()} ({currentSize}/10 seated) {isFull ? ' (FULL)' : ''}
                    </option>
                  );
                })}
                {Object.keys(seating).length < 5 && (
                  <option value="create_new">
                    + Create New Table
                  </option>
                )}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsLateEntryOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLateEntry}
                className="btn btn-primary"
                disabled={!selectedLateMemberId || !selectedLateTable}
                style={{ padding: '8px 16px' }}
              >
                Confirm late entry
              </button>
            </div>
          </div>
        </div>
      )}

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