import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Square, Triangle, Target, Play } from 'lucide-react';

const LevelEditor = ({ onBack, onSave }) => {
  const canvasRef = useRef(null);
  const [levelName, setLevelName] = useState('My Custom Level');
  const [platforms, setPlatforms] = useState([]);
  const [spikes, setSpikes] = useState([]);
  const [spawn, setSpawn] = useState({ x: 50, y: 480 });
  const [goal, setGoal] = useState({ x: 860, y: 400, w: 40, h: 60 });
  const [tool, setTool] = useState('platform'); // platform, spike, spawn, goal
  const [platformType, setPlatformType] = useState('static'); // static, moving, collapsing
  const [spikeDir, setSpikeDir] = useState('up'); // up, down, left, right
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const W = 960;
  const H = 540;

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Platforms
    platforms.forEach((plat, idx) => {
      if (plat.type === 'moving') {
        ctx.fillStyle = '#2A2A3E';
        ctx.strokeStyle = 'rgba(0,240,255,0.5)';
      } else if (plat.type === 'collapsing') {
        ctx.fillStyle = '#2E1A1A';
        ctx.strokeStyle = 'rgba(255,0,60,0.5)';
      } else {
        ctx.fillStyle = '#1A1A1E';
        ctx.strokeStyle = '#333336';
      }
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      if (selectedItem?.type === 'platform' && selectedItem?.index === idx) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(plat.x - 3, plat.y - 3, plat.w + 6, plat.h + 6);
      }
    });

    // Spikes
    spikes.forEach((spike, idx) => {
      ctx.fillStyle = '#FF003C';
      ctx.strokeStyle = 'rgba(255,0,60,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sw = spike.w || 20;
      const sh = spike.h || 20;
      if (spike.dir === 'up') {
        ctx.moveTo(spike.x, spike.y + sh);
        ctx.lineTo(spike.x + sw / 2, spike.y);
        ctx.lineTo(spike.x + sw, spike.y + sh);
      } else if (spike.dir === 'down') {
        ctx.moveTo(spike.x, spike.y);
        ctx.lineTo(spike.x + sw / 2, spike.y + sh);
        ctx.lineTo(spike.x + sw, spike.y);
      } else if (spike.dir === 'left') {
        ctx.moveTo(spike.x + sw, spike.y);
        ctx.lineTo(spike.x, spike.y + sh / 2);
        ctx.lineTo(spike.x + sw, spike.y + sh);
      } else {
        ctx.moveTo(spike.x, spike.y);
        ctx.lineTo(spike.x + sw, spike.y + sh / 2);
        ctx.lineTo(spike.x, spike.y + sh);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (selectedItem?.type === 'spike' && selectedItem?.index === idx) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(spike.x - 3, spike.y - 3, sw + 6, sh + 6);
      }
    });

    // Spawn
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(spawn.x, spawn.y, 22, 22);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(spawn.x - 2, spawn.y - 2, 26, 26);
    ctx.font = '12px monospace';
    ctx.fillText('START', spawn.x - 10, spawn.y - 10);

    // Goal
    ctx.fillStyle = '#39FF14';
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 2;
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.globalAlpha = 1;
    ctx.font = '12px monospace';
    ctx.fillText('GOAL', goal.x + 5, goal.y - 10);

    // Drag preview
    if (isDragging && dragStart && tool === 'platform') {
      const currentPos = dragStart;
      ctx.fillStyle = 'rgba(0,240,255,0.3)';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.fillRect(currentPos.x, currentPos.y, 100, 20);
      ctx.strokeRect(currentPos.x, currentPos.y, 100, 20);
    }
  };

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platforms, spikes, spawn, goal, tool, isDragging, dragStart]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const snapToGrid = (val) => Math.floor(val / 30) * 30;

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const snappedX = snapToGrid(pos.x);
    const snappedY = snapToGrid(pos.y);

    // Check if clicking on existing item
    const clickedPlatform = platforms.findIndex(p => 
      pos.x >= p.x && pos.x <= p.x + p.w && pos.y >= p.y && pos.y <= p.y + p.h
    );
    
    const clickedSpike = spikes.findIndex(s => 
      pos.x >= s.x && pos.x <= s.x + (s.w || 20) && pos.y >= s.y && pos.y <= s.y + (s.h || 20)
    );

    if (e.button === 2) { // Right click - delete
      e.preventDefault();
      if (clickedPlatform !== -1) {
        setPlatforms(platforms.filter((_, i) => i !== clickedPlatform));
      } else if (clickedSpike !== -1) {
        setSpikes(spikes.filter((_, i) => i !== clickedSpike));
      }
      return;
    }

    // Select item
    if (clickedPlatform !== -1) {
      setSelectedItem({ type: 'platform', index: clickedPlatform });
      return;
    }
    if (clickedSpike !== -1) {
      setSelectedItem({ type: 'spike', index: clickedSpike });
      return;
    }

    setSelectedItem(null);

    // Place new item
    if (tool === 'platform') {
      setIsDragging(true);
      setDragStart({ x: snappedX, y: snappedY });
    } else if (tool === 'spike') {
      setSpikes([...spikes, {
        x: snappedX,
        y: snappedY,
        w: 20,
        h: 20,
        dir: spikeDir,
      }]);
    } else if (tool === 'spawn') {
      setSpawn({ x: snappedX, y: snappedY });
    } else if (tool === 'goal') {
      setGoal({ ...goal, x: snappedX, y: snappedY });
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging && dragStart && tool === 'platform') {
      const pos = getMousePos(e);
      const snappedX = snapToGrid(pos.x);
      const snappedY = snapToGrid(pos.y);
      
      const width = Math.max(60, Math.abs(snappedX - dragStart.x));
      const height = 20;
      
      const newPlatform = {
        x: Math.min(dragStart.x, snappedX),
        y: dragStart.y,
        w: width,
        h: height,
        type: platformType,
      };

      if (platformType === 'moving') {
        newPlatform.axis = 'x';
        newPlatform.range = 100;
        newPlatform.speed = 2;
        newPlatform.originalX = newPlatform.x;
        newPlatform.originalY = newPlatform.y;
      } else if (platformType === 'collapsing') {
        newPlatform.delay = 30;
      }

      setPlatforms([...platforms, newPlatform]);
    }
    setIsDragging(false);
    setDragStart(null);
  };

  const handleSave = () => {
    if (!levelName.trim()) {
      alert('Please enter a level name');
      return;
    }

    if (platforms.length === 0) {
      alert('Please add at least one platform');
      return;
    }

    const levelData = {
      name: levelName,
      width: W,
      height: H,
      spawn,
      goal,
      platforms,
      spikes,
      author: 'player',
    };

    onSave(levelData);
  };

  const handleClear = () => {
    if (window.confirm('Clear all objects?')) {
      setPlatforms([]);
      setSpikes([]);
      setSpawn({ x: 50, y: 480 });
      setGoal({ x: 860, y: 400, w: 40, h: 60 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4" data-testid="level-editor">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
            data-testid="back-from-editor-btn"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          
          <input
            type="text"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-500"
            placeholder="Level Name"
            data-testid="level-name-input"
          />

          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all flex items-center gap-2"
              data-testid="clear-level-btn"
            >
              <Trash2 size={20} />
              Clear
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all flex items-center gap-2"
              data-testid="save-level-btn"
            >
              <Save size={20} />
              Save Level
            </button>
          </div>
        </div>

        {/* Tools */}
        <div className="mb-4 bg-gray-800/50 backdrop-blur border border-cyan-500/30 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <button
              onClick={() => setTool('platform')}
              className={`p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                tool === 'platform' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              data-testid="tool-platform-btn"
            >
              <Square size={20} />
              Platform
            </button>
            <button
              onClick={() => setTool('spike')}
              className={`p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                tool === 'spike' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              data-testid="tool-spike-btn"
            >
              <Triangle size={20} />
              Spike
            </button>
            <button
              onClick={() => setTool('spawn')}
              className={`p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                tool === 'spawn' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              data-testid="tool-spawn-btn"
            >
              <Play size={20} />
              Spawn
            </button>
            <button
              onClick={() => setTool('goal')}
              className={`p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                tool === 'goal' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              data-testid="tool-goal-btn"
            >
              <Target size={20} />
              Goal
            </button>
          </div>

          {/* Tool Options */}
          {tool === 'platform' && (
            <div className="flex gap-2">
              <span className="text-white mr-2">Type:</span>
              <button
                onClick={() => setPlatformType('static')}
                className={`px-4 py-2 rounded ${platformType === 'static' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="platform-type-static"
              >
                Static
              </button>
              <button
                onClick={() => setPlatformType('moving')}
                className={`px-4 py-2 rounded ${platformType === 'moving' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="platform-type-moving"
              >
                Moving
              </button>
              <button
                onClick={() => setPlatformType('collapsing')}
                className={`px-4 py-2 rounded ${platformType === 'collapsing' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="platform-type-collapsing"
              >
                Collapsing
              </button>
            </div>
          )}

          {tool === 'spike' && (
            <div className="flex gap-2">
              <span className="text-white mr-2">Direction:</span>
              <button
                onClick={() => setSpikeDir('up')}
                className={`px-4 py-2 rounded ${spikeDir === 'up' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="spike-dir-up"
              >
                ↑ Up
              </button>
              <button
                onClick={() => setSpikeDir('down')}
                className={`px-4 py-2 rounded ${spikeDir === 'down' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="spike-dir-down"
              >
                ↓ Down
              </button>
              <button
                onClick={() => setSpikeDir('left')}
                className={`px-4 py-2 rounded ${spikeDir === 'left' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="spike-dir-left"
              >
                ← Left
              </button>
              <button
                onClick={() => setSpikeDir('right')}
                className={`px-4 py-2 rounded ${spikeDir === 'right' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                data-testid="spike-dir-right"
              >
                → Right
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            className="border-4 border-cyan-500/50 rounded-lg shadow-2xl cursor-crosshair"
            data-testid="editor-canvas"
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-gray-800/50 backdrop-blur border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Instructions:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Left Click</strong>: Place object or drag to create platform</li>
            <li>• <strong>Right Click</strong>: Delete object</li>
            <li>• Objects snap to a 30px grid for clean alignment</li>
            <li>• Make sure to set spawn point and goal before saving</li>
          </ul>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 backdrop-blur border border-cyan-500/30 rounded-lg p-4" data-testid="editor-stats">
            <div className="text-cyan-400 text-sm mb-1">Platforms</div>
            <div className="text-white text-2xl font-bold">{platforms.length}</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur border border-red-500/30 rounded-lg p-4">
            <div className="text-red-400 text-sm mb-1">Spikes</div>
            <div className="text-white text-2xl font-bold">{spikes.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelEditor;
