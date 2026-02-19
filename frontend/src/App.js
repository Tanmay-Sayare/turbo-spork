import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import MainMenu from '@/components/MainMenu';
import GameScreen from '@/components/GameScreen';
import LevelEditor from '@/components/LevelEditor';
import { DEFAULT_LEVELS } from '@/game/DefaultLevels';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [screen, setScreen] = useState('menu'); // menu, game, editor
  const [gameMode, setGameMode] = useState(null); // human_vs_ai, ai_vs_ai
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [customLevels, setCustomLevels] = useState([]);
  const [allLevels, setAllLevels] = useState(DEFAULT_LEVELS); // Initialize with default levels

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await axios.get(`${API}/levels`);
      setCustomLevels(response.data);
      setAllLevels([...DEFAULT_LEVELS, ...response.data]);
    } catch (error) {
      console.error('Failed to load custom levels:', error);
      setAllLevels(DEFAULT_LEVELS);
    }
  };

  const handlePlayMode = (mode, level) => {
    setGameMode(mode);
    setSelectedLevel(level);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    setGameMode(null);
    setSelectedLevel(null);
  };

  const handleOpenEditor = () => {
    setScreen('editor');
  };

  const handleSaveLevel = async (levelData) => {
    try {
      await axios.post(`${API}/levels`, levelData);
      await loadLevels();
      alert('Level saved successfully!');
    } catch (error) {
      console.error('Failed to save level:', error);
      alert('Failed to save level');
    }
  };

  const handleDeleteLevel = async (levelId) => {
    try {
      await axios.delete(`${API}/levels/${levelId}`);
      await loadLevels();
    } catch (error) {
      console.error('Failed to delete level:', error);
    }
  };

  const saveMatchResult = async (result) => {
    try {
      await axios.post(`${API}/matches`, result);
    } catch (error) {
      console.error('Failed to save match result:', error);
    }
  };

  return (
    <div className="App">
      {screen === 'menu' && (
        <MainMenu
          onPlayMode={handlePlayMode}
          onOpenEditor={handleOpenEditor}
          levels={allLevels}
          onDeleteLevel={handleDeleteLevel}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          mode={gameMode}
          level={selectedLevel}
          onBack={handleBackToMenu}
          onSaveResult={saveMatchResult}
        />
      )}
      {screen === 'editor' && (
        <LevelEditor
          onBack={handleBackToMenu}
          onSave={handleSaveLevel}
        />
      )}
    </div>
  );
}

export default App;
