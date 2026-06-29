import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Tournaments } from './pages/Tournaments';
import { Standings } from './pages/Standings';
import { Settings } from './pages/Settings';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // Global modal triggers that can be activated from dashboard quick actions
  const [isCreateTourOpen, setIsCreateTourOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Wrap tab change to clear tournament selection when clicking on main menu items
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedTournamentId(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            setActiveTab={setActiveTab}
            setSelectedTournamentId={setSelectedTournamentId}
            setIsCreateTourOpen={setIsCreateTourOpen}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        );
      case 'members':
        return (
          <Members
            isAddMemberOpen={isAddMemberOpen}
            setIsAddMemberOpen={setIsAddMemberOpen}
          />
        );
      case 'tournaments':
        return (
          <Tournaments
            selectedTournamentId={selectedTournamentId}
            setSelectedTournamentId={setSelectedTournamentId}
            isCreateTourOpen={isCreateTourOpen}
            setIsCreateTourOpen={setIsCreateTourOpen}
          />
        );
      case 'standings':
        return <Standings />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} setSelectedTournamentId={setSelectedTournamentId} setIsCreateTourOpen={setIsCreateTourOpen} setIsAddMemberOpen={setIsAddMemberOpen} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
