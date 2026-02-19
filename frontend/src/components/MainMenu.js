import { useState } from 'react';
import { Play, Edit, Trash2, Trophy, Zap } from 'lucide-react';

const MainMenu = ({ onPlayMode, onOpenEditor, levels, onDeleteLevel }) => {
  const [selectedLevel, setSelectedLevel] = useState(levels[0] || null);
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const handlePlay = (mode) => {
    if (!selectedLevel) {
      alert('Please select a level first!');
      return;
    }
    onPlayMode(mode, selectedLevel);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Title */}
        <div className="text-center mb-12" data-testid="main-menu">
          <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4 animate-pulse">
            TURBO SPORK
          </h1>
          <p className="text-gray-400 text-xl">AI-Powered Platformer Battle Arena</p>
        </div>

        {/* Selected Level Display */}
        <div className="bg-gray-800/50 backdrop-blur border border-cyan-500/30 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-cyan-400">Selected Level</h2>
            <button
              onClick={() => setShowLevelSelect(!showLevelSelect)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
              data-testid="toggle-level-select-btn"
            >
              {showLevelSelect ? 'Hide Levels' : 'Change Level'}
            </button>
          </div>
          
          {selectedLevel && (
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-white mb-2">{selectedLevel.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>Platforms: {selectedLevel.platforms?.length || 0}</div>
                <div>Spikes: {selectedLevel.spikes?.length || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Level Selection */}
        {showLevelSelect && (
          <div className="bg-gray-800/50 backdrop-blur border border-purple-500/30 rounded-lg p-6 mb-8 max-h-96 overflow-y-auto" data-testid="level-list">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Choose a Level</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((level) => (
                <div
                  key={level.id}
                  onClick={() => {
                    setSelectedLevel(level);
                    setShowLevelSelect(false);
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedLevel?.id === level.id
                      ? 'bg-cyan-600 border-2 border-cyan-400'
                      : 'bg-gray-900/50 hover:bg-gray-800 border border-gray-700'
                  }`}
                  data-testid={`level-item-${level.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{level.name}</h4>
                      <p className="text-xs text-gray-400">
                        {level.platforms?.length || 0} platforms, {level.spikes?.length || 0} spikes
                      </p>
                    </div>
                    {level.author && level.author !== 'default' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this level?')) {
                            onDeleteLevel(level.id);
                          }
                        }}
                        className="ml-2 p-1 text-red-400 hover:text-red-300"
                        data-testid={`delete-level-${level.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => handlePlay('human_vs_ai')}
            className="group relative overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 p-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-cyan-500/50"
            data-testid="play-human-vs-ai-btn"
          >
            <div className="relative z-10">
              <Play className="mx-auto mb-4 text-white" size={48} />
              <h3 className="text-2xl font-bold text-white mb-2">Human vs AI</h3>
              <p className="text-cyan-100">Challenge the AI opponent!</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
          </button>

          <button
            onClick={() => handlePlay('ai_vs_ai')}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-700 hover:from-purple-500 hover:to-pink-600 p-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
            data-testid="play-ai-vs-ai-btn"
          >
            <div className="relative z-10">
              <Zap className="mx-auto mb-4 text-white" size={48} />
              <h3 className="text-2xl font-bold text-white mb-2">AI vs AI</h3>
              <p className="text-purple-100">Watch two AIs battle!</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
          </button>
        </div>

        {/* Editor Button */}
        <button
          onClick={onOpenEditor}
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-yellow-500/50 flex items-center justify-center gap-3"
          data-testid="open-editor-btn"
        >
          <Edit size={24} />
          <span className="text-xl">Create Custom Level</span>
        </button>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Use Arrow Keys or WASD to move • Space or Up to jump</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
