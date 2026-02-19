import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { AIController } from '@/game/AIController';
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Skull } from 'lucide-react';

const GameScreen = ({ mode, level, onBack, onSaveResult }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState('ready'); // ready, playing, paused, won
  const [time, setTime] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);

  const handleWin = (winnerName, result) => {
    setWinner(winnerName);
    setShowWinModal(true);
    
    // Save match result
    onSaveResult({
      level_id: level.id,
      mode: mode,
      winner: winnerName,
      time_ms: result.time,
      deaths: result.deaths,
    });
  };

  useEffect(() => {
    if (!canvasRef.current || !level) return;

    // Initialize AI controllers based on mode
    let aiController = null;
    let aiEnabled = false;

    if (mode === 'human_vs_ai') {
      aiController = new AIController({ difficulty: 'normal' });
      aiEnabled = true;
    } else if (mode === 'ai_vs_ai') {
      // For AI vs AI, we'll use the human player as AI too
      aiController = new AIController({ difficulty: 'normal' });
      aiEnabled = true;
    }

    // Create game engine
    const engine = new GameEngine(canvasRef.current, {
      width: 960,
      height: 540,
      aiEnabled,
      aiController,
      onDeath: (deathCount) => {
        setDeaths(deathCount);
      },
      onWin: (result) => {
        handleWin('human', result);
      },
      onTimeUpdate: (t) => {
        setTime(t);
      },
      onStateChange: (state) => {
        setGameState(state);
        if (state === 'won') {
          // Check who won
          if (engine.aiPlayer && engine.aiPlayer.won) {
            handleWin('ai', { time: engine.time, deaths: engine.deaths });
          }
        }
      },
    });

    engineRef.current = engine;
    engine.loadLevel(level);

    // For AI vs AI mode, replace human input with AI
    if (mode === 'ai_vs_ai') {
      const humanAI = new AIController({ difficulty: 'normal' });
      const originalUpdate = engine._updatePlayerInput.bind(engine);
      engine._updatePlayerInput = (p, keys, dt) => {
        if (p === engine.player) {
          // Replace human keys with AI decisions
          const aiKeys = humanAI.getActions(p, engine.level);
          originalUpdate(p, aiKeys, dt);
        } else {
          originalUpdate(p, keys, dt);
        }
      };
    }

    return () => {
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, mode]);

  const handleStart = () => {
    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      if (gameState === 'playing') {
        engineRef.current.pause();
      } else if (gameState === 'paused') {
        engineRef.current.resume();
      }
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.fullRestart();
      setShowWinModal(false);
      setWinner(null);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4" data-testid="game-screen">
      {/* Top Bar */}
      <div className="w-full max-w-5xl mb-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
          data-testid="back-to-menu-btn"
        >
          <ArrowLeft size={20} />
          Back to Menu
        </button>

        <div className="text-white text-lg font-semibold" data-testid="level-name">
          {level?.name || 'Custom Level'}
        </div>

        <div className="text-cyan-400 text-lg font-mono" data-testid="mode-display">
          {mode === 'human_vs_ai' ? '🎮 Human vs AI' : '🤖 AI vs AI'}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-4 border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/20"
          data-testid="game-canvas"
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          {/* Stats */}
          <div className="bg-black/70 backdrop-blur px-6 py-3 rounded-lg border border-cyan-500/30" data-testid="game-stats">
            <div className="text-cyan-400 text-sm mb-1">TIME</div>
            <div className="text-white text-2xl font-mono font-bold" data-testid="time-display">
              {formatTime(time)}
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur px-6 py-3 rounded-lg border border-red-500/30" data-testid="death-counter">
            <div className="text-red-400 text-sm mb-1 flex items-center gap-2">
              <Skull size={16} />
              DEATHS
            </div>
            <div className="text-white text-2xl font-mono font-bold text-center" data-testid="deaths-display">
              {deaths}
            </div>
          </div>
        </div>

        {/* Ready State */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-6">Ready to Play?</h2>
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-bold rounded-lg transition-all transform hover:scale-110 shadow-lg flex items-center gap-3 mx-auto"
                data-testid="start-game-btn"
              >
                <Play size={24} />
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* Paused State */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-yellow-400 mb-6">PAUSED</h2>
              <button
                onClick={handlePause}
                className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white text-xl font-bold rounded-lg transition-all transform hover:scale-110"
                data-testid="resume-game-btn"
              >
                Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-5xl mt-4 flex justify-center gap-4">
        {gameState === 'playing' && (
          <button
            onClick={handlePause}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
            data-testid="pause-game-btn"
          >
            <Pause size={20} />
            Pause
          </button>
        )}
        <button
          onClick={handleRestart}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
          data-testid="restart-game-btn"
        >
          <RotateCcw size={20} />
          Restart
        </button>
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50" data-testid="win-modal">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 border-4 border-green-500 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <Trophy className="mx-auto mb-4 text-yellow-400 animate-bounce" size={64} />
              <h2 className="text-4xl font-bold text-green-400 mb-4">Victory!</h2>
              <div className="text-white text-lg mb-2" data-testid="winner-display">
                Winner: <span className="font-bold text-cyan-400">
                  {winner === 'human' ? '👤 Human Player' : '🤖 AI Player'}
                </span>
              </div>
              <div className="bg-black/50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-white">
                  <div>
                    <div className="text-gray-400 text-sm">Time</div>
                    <div className="text-2xl font-mono font-bold text-cyan-400">{formatTime(time)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Deaths</div>
                    <div className="text-2xl font-mono font-bold text-red-400">{deaths}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleRestart}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all"
                  data-testid="play-again-btn"
                >
                  Play Again
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
                  data-testid="back-to-menu-from-win-btn"
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center mt-4 text-gray-400 text-sm">
        <p>Arrow Keys / WASD to move • Space / Up to jump</p>
      </div>
    </div>
  );
};

export default GameScreen;
