/**
 * Manual Play Page
 * Play the snake game with keyboard/touch controls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Position, Direction, GameState } from '../game/types';
import { GRID_SIZE, wrapPosition, posEqual } from '../game/utils';
import AudioToggle from '../components/AudioToggle';
import { useAudio } from '../contexts/AudioContext';
import { api, ManualScoreResult, ControlType } from '../api/client';

// Transform XZ direction based on camera angle for view-relative controls
// This rotates the direction so "forward" is always away from the camera
function transformDirectionForCamera(dir: Direction, cameraAngle: number): Direction {
  // Only transform XZ plane movement, Y stays the same
  if (dir.y !== 0) return dir;

  // Round camera angle to nearest 90 degrees for discrete movement
  // This snaps to 4 cardinal directions relative to view
  // Negate angle so controls rotate WITH the camera view
  const snappedAngle = -Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2);

  const cos = Math.round(Math.cos(snappedAngle));
  const sin = Math.round(Math.sin(snappedAngle));

  // Rotate the XZ direction by the camera angle
  const newX = dir.x * cos - dir.z * sin;
  const newZ = dir.x * sin + dir.z * cos;

  return { x: newX, y: 0, z: newZ };
}

// First-person controls: pitch and yaw relative to snake's orientation
// We track the snake's "up" vector to maintain consistent orientation
// - Pitch up/down: rotate in the plane containing forward and up
// - Yaw left/right: rotate in the plane perpendicular to up (horizontal turn)
function getFirstPersonDirection(
  input: 'up' | 'down' | 'left' | 'right',
  snakeDirection: Direction,
  snakeUp: Direction
): Direction {
  const forward = snakeDirection;
  const up = snakeUp;

  // Calculate right vector (cross product of forward and up)
  const right: Direction = {
    x: forward.y * up.z - forward.z * up.y,
    y: forward.z * up.x - forward.x * up.z,
    z: forward.x * up.y - forward.y * up.x,
  };

  switch (input) {
    case 'up':
      // Pitch up: move in the "up" direction relative to snake
      return up;
    case 'down':
      // Pitch down: move in the "down" direction relative to snake
      return { x: -up.x, y: -up.y, z: -up.z };
    case 'left':
      // Yaw left: turn left (negative right direction)
      return { x: -right.x, y: -right.y, z: -right.z };
    case 'right':
      // Yaw right: turn right
      return right;
  }
}

// Calculate new "up" vector after a direction change
// This maintains consistent orientation for the camera and controls
function getNewUpVector(oldDirection: Direction, newDirection: Direction, oldUp: Direction): Direction {
  // If direction didn't change, up stays the same
  if (oldDirection.x === newDirection.x &&
      oldDirection.y === newDirection.y &&
      oldDirection.z === newDirection.z) {
    return oldUp;
  }

  // If we pitched (up/down changed), the old forward becomes the new up (or negative)
  if (newDirection.x === oldUp.x && newDirection.y === oldUp.y && newDirection.z === oldUp.z) {
    // Pitched up: old forward direction becomes down, so new up is negative old forward
    return { x: -oldDirection.x, y: -oldDirection.y, z: -oldDirection.z };
  }
  if (newDirection.x === -oldUp.x && newDirection.y === -oldUp.y && newDirection.z === -oldUp.z) {
    // Pitched down: old forward direction becomes up
    return oldDirection;
  }

  // If we yawed (left/right), up stays the same
  return oldUp;
}

// Control scheme definitions
const CONTROL_SCHEMES: Record<ControlType, {
  name: string;
  description: string;
  xzKeys: { up: string[]; down: string[]; left: string[]; right: string[] };
  yKeys: { up: string[]; down: string[] };
  hint: string;
}> = {
  'wasd-zx': {
    name: 'WASD + ZX',
    description: 'Classic layout',
    xzKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
      left: ['a', 'A'],
      right: ['d', 'D'],
    },
    yKeys: {
      up: ['z', 'Z'],
      down: ['x', 'X'],
    },
    hint: 'WASD + Z/X',
  },
  'wasd-qe': {
    name: 'WASD + QE',
    description: 'Ergonomic',
    xzKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
      left: ['a', 'A'],
      right: ['d', 'D'],
    },
    yKeys: {
      up: ['q', 'Q'],
      down: ['e', 'E'],
    },
    hint: 'WASD + Q/E',
  },
  'arrows-ws': {
    name: 'Arrows + WS',
    description: 'Two hands',
    xzKeys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
    yKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
    },
    hint: 'Arrows + W/S',
  },
};

// Snake segment component
function SnakeSegment({ position, isHead }: { position: Position; isHead: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && isHead) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.3;
    }
  });

  const scale = 1.8;
  const color = isHead ? '#00ff88' : '#00cc66';
  const emissive = isHead ? '#00ff88' : '#004422';

  return (
    <mesh ref={meshRef} position={[position.x * 2, position.y * 2, position.z * 2]}>
      <boxGeometry args={[scale, scale, scale]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={isHead ? 0.8 : 0.2}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// Food component
function Food({ position }: { position: Position }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.elapsedTime * 2;
      meshRef.current.rotation.y = clock.elapsedTime * 1.5;
      const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={[position.x * 2, position.y * 2, position.z * 2]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ff0088"
        emissive="#ff0088"
        emissiveIntensity={0.8}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// Firework particle
interface FireworkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
}

// Fireworks effect component
function Fireworks({ trigger, position }: { trigger: number; position: Position }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const lastTriggerRef = useRef(0);

  const colors = ['#ff0088', '#00ff88', '#00ffff', '#ffff00', '#ff00ff', '#ffffff'];

  useFrame((_, delta) => {
    // Spawn new particles when trigger changes
    if (trigger !== lastTriggerRef.current && trigger > 0) {
      lastTriggerRef.current = trigger;
      const centerPos = new THREE.Vector3(position.x * 2, position.y * 2, position.z * 2);

      // Create burst of particles
      for (let i = 0; i < 30; i++) {
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI - Math.PI / 2;
        const speed = 8 + Math.random() * 12;

        particlesRef.current.push({
          position: centerPos.clone(),
          velocity: new THREE.Vector3(
            Math.cos(angle1) * Math.cos(angle2) * speed,
            Math.sin(angle2) * speed + 5,
            Math.sin(angle1) * Math.cos(angle2) * speed
          ),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          maxLife: 0.8 + Math.random() * 0.4,
        });
      }
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= delta / p.maxLife;
      p.velocity.y -= 15 * delta; // Gravity
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      return p.life > 0;
    });
  });

  return (
    <group ref={groupRef}>
      {particlesRef.current.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color={particle.color}
            emissive={particle.color}
            emissiveIntensity={particle.life * 2}
            transparent
            opacity={particle.life}
          />
        </mesh>
      ))}
    </group>
  );
}

// Grid cage
function GridCage() {
  const size = GRID_SIZE * 2;
  const halfSize = size / 2;

  return (
    <group>
      <gridHelper args={[size, GRID_SIZE, '#444466', '#333355']} position={[0, -halfSize, 0]} />
      <gridHelper args={[size, GRID_SIZE, '#333355', '#222244']} position={[0, halfSize, 0]} />
      <group position={[0, 0, -halfSize]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <group position={[0, 0, halfSize]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <group position={[-halfSize, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <group position={[halfSize, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
        <lineBasicMaterial color="#444488" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}

// Camera controller with optional auto-rotation (orbit mode)
function CameraController({
  autoRotate,
  onAngleChange
}: {
  autoRotate: boolean;
  onAngleChange?: (angle: number) => void;
}) {
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current && onAngleChange) {
      const angle = controlsRef.current.getAzimuthalAngle();
      onAngleChange(angle);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={30}
      maxDistance={80}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
    />
  );
}

// First-person camera that follows the snake head - positioned at the eyes looking forward
function FirstPersonCamera({
  snakeHead,
  lastDirection,
  snakeUp,
}: {
  snakeHead: Position;
  lastDirection: Direction;
  snakeUp: Direction;
}) {
  const { camera } = useThree();
  const smoothPosition = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3());
  const smoothUp = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    const dir = lastDirection;

    // Position camera at the snake head (at the "eyes")
    const headPos = new THREE.Vector3(
      snakeHead.x * 2,
      snakeHead.y * 2,
      snakeHead.z * 2
    );

    // Look direction is the snake's movement direction
    const lookDir = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();

    // Up vector comes from the tracked snake orientation
    const targetUp = new THREE.Vector3(snakeUp.x, snakeUp.y, snakeUp.z);

    // Camera position: slightly forward from head center (at the "eyes")
    const targetCameraPos = headPos.clone().add(lookDir.clone().multiplyScalar(0.5));

    // Look at point: far ahead in the direction of travel
    const targetLookAt = headPos.clone().add(lookDir.clone().multiplyScalar(20));

    // Smooth interpolation for fluid camera movement
    smoothPosition.current.lerp(targetCameraPos, 0.15);
    smoothTarget.current.lerp(targetLookAt, 0.15);
    smoothUp.current.lerp(targetUp, 0.15);

    camera.position.copy(smoothPosition.current);
    camera.up.copy(smoothUp.current);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}

// Scene component
function Scene({
  gameState,
  autoRotate,
  onCameraAngleChange,
  isFirstPerson,
  lastDirection,
  snakeUp,
  fireworkTrigger,
  fireworkPosition,
}: {
  gameState: GameState;
  autoRotate: boolean;
  onCameraAngleChange?: (angle: number) => void;
  isFirstPerson: boolean;
  lastDirection: Direction;
  snakeUp: Direction;
  fireworkTrigger: number;
  fireworkPosition: Position;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[30, 30, 30]} intensity={1} color="#ffffff" />
      <pointLight position={[-30, -30, 30]} intensity={0.5} color="#00ffff" />
      <pointLight position={[0, 0, -30]} intensity={0.5} color="#ff00ff" />
      <GridCage />
      {gameState.snake.map((segment, index) => (
        <SnakeSegment key={index} position={segment} isHead={index === 0} />
      ))}
      <Food position={gameState.food} />
      <Fireworks trigger={fireworkTrigger} position={fireworkPosition} />
      {isFirstPerson ? (
        <FirstPersonCamera
          snakeHead={gameState.snake[0]}
          lastDirection={lastDirection}
          snakeUp={snakeUp}
        />
      ) : (
        <CameraController autoRotate={autoRotate} onAngleChange={onCameraAngleChange} />
      )}
    </>
  );
}

export default function Play() {
  const navigate = useNavigate();
  const { playWin, playWhammy } = useAudio();
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewRelativeControls, setViewRelativeControls] = useState(true);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const cameraAngleRef = useRef(0);
  const [fireworkTrigger, setFireworkTrigger] = useState(0);
  const [fireworkPosition, setFireworkPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [gameState, setGameState] = useState<GameState>({
    snake: [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ],
    food: { x: 3, y: 0, z: 0 },
    score: 0,
    frame: 0,
    gameOver: false,
    deathReason: null,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlType, setControlType] = useState<ControlType>('wasd-zx');
  const [showControlPicker, setShowControlPicker] = useState(false);

  // Score submission state
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<ManualScoreResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const directionRef = useRef<Direction | null>(null);
  const lastDirectionRef = useRef<Direction>({ x: 1, y: 0, z: 0 });
  const snakeUpRef = useRef<Direction>({ x: 0, y: 1, z: 0 }); // Track snake's "up" for FPV orientation
  const gameLoopRef = useRef<number | null>(null);

  // Spawn food at random position
  const spawnFood = useCallback((snake: Position[]): Position => {
    const occupied = new Set(snake.map(p => `${p.x},${p.y},${p.z}`));
    const HALF = GRID_SIZE / 2;
    let pos: Position;
    let attempts = 0;

    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE) - HALF,
        y: Math.floor(Math.random() * GRID_SIZE) - HALF,
        z: Math.floor(Math.random() * GRID_SIZE) - HALF,
      };
      attempts++;
    } while (occupied.has(`${pos.x},${pos.y},${pos.z}`) && attempts < 1000);

    if (occupied.has(`${pos.x},${pos.y},${pos.z}`)) {
      for (let x = -HALF; x < HALF; x++) {
        for (let y = -HALF; y < HALF; y++) {
          for (let z = -HALF; z < HALF; z++) {
            pos = { x, y, z };
            if (!occupied.has(`${pos.x},${pos.y},${pos.z}`)) {
              return pos;
            }
          }
        }
      }
    }

    return pos;
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const initialSnake = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];
    setGameState({
      snake: initialSnake,
      food: spawnFood(initialSnake),
      score: 0,
      frame: 0,
      gameOver: false,
      deathReason: null,
    });
    directionRef.current = null;
    lastDirectionRef.current = { x: 1, y: 0, z: 0 };
    snakeUpRef.current = { x: 0, y: 1, z: 0 };
    setShowNameInput(false);
    setPlayerName('');
    setSubmitResult(null);
    setSubmitError(null);
  }, [spawnFood]);

  // Submit score
  const handleSubmitScore = useCallback(async () => {
    if (isSubmitting || !playerName.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await api.submitManualScore({
        name: playerName.trim().slice(0, 20),
        score: gameState.score,
        length: gameState.snake.length,
        controlType,
      });
      setSubmitResult(result);
      playWin();
    } catch (error) {
      setSubmitError('Failed to submit score. Try again!');
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [playerName, gameState.score, gameState.snake.length, isSubmitting, playWin, controlType]);

  // Set direction (queue it for next tick)
  const setDirection = useCallback((dir: Direction) => {
    const last = lastDirectionRef.current;
    if (dir.x === -last.x && dir.y === -last.y && dir.z === -last.z) {
      return;
    }
    directionRef.current = dir;
  }, []);

  // Set direction with view-relative transformation for XZ movements
  const setDirectionWithViewTransform = useCallback((dir: Direction) => {
    if (viewRelativeControls && dir.y === 0) {
      setDirection(transformDirectionForCamera(dir, cameraAngleRef.current));
    } else {
      setDirection(dir);
    }
  }, [setDirection, viewRelativeControls]);

  // Set direction for first-person view (pitch/yaw relative to snake orientation)
  const setFirstPersonDirection = useCallback((input: 'up' | 'down' | 'left' | 'right') => {
    const newDir = getFirstPersonDirection(input, lastDirectionRef.current, snakeUpRef.current);
    setDirection(newDir);
  }, [setDirection]);

  // Game loop
  useEffect(() => {
    const tick = () => {
      setGameState(prev => {
        if (prev.gameOver) return prev;

        const dir = directionRef.current || lastDirectionRef.current;
        if (directionRef.current) {
          // Update the "up" vector based on direction change (for FPV camera orientation)
          snakeUpRef.current = getNewUpVector(lastDirectionRef.current, directionRef.current, snakeUpRef.current);
          lastDirectionRef.current = directionRef.current;
          directionRef.current = null;
        }

        const head = prev.snake[0];
        const newHead = wrapPosition({
          x: head.x + dir.x,
          y: head.y + dir.y,
          z: head.z + dir.z,
        });

        const hitBody = prev.snake.slice(1).some(seg => posEqual(seg, newHead));
        if (hitBody) {
          playWhammy();
          return { ...prev, gameOver: true, deathReason: 'Hit own body' };
        }

        const eating = posEqual(newHead, prev.food);
        if (eating) {
          playWin();
          setFireworkPosition(prev.food);
          setFireworkTrigger(t => t + 1);
        }

        const newSnake = [newHead, ...prev.snake];
        if (!eating) {
          newSnake.pop();
        }

        return {
          ...prev,
          snake: newSnake,
          food: eating ? spawnFood(newSnake) : prev.food,
          score: eating ? prev.score + 10 : prev.score,
          frame: prev.frame + 1,
        };
      });
    };

    gameLoopRef.current = window.setInterval(tick, 200);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [spawnFood, playWin, playWhammy]);

  // Keyboard controls
  useEffect(() => {
    const scheme = CONTROL_SCHEMES[controlType];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showNameInput && !submitResult) {
        if (e.key === 'Escape') {
          setShowNameInput(false);
        }
        return;
      }

      if (gameState.gameOver) {
        if (e.key === ' ' || e.key === 'Enter') {
          if (submitResult) {
            resetGame();
          } else {
            setShowNameInput(true);
          }
        }
        if (e.key === 'Escape') {
          resetGame();
        }
        return;
      }

      if (isFirstPerson) {
        // First-person controls: all relative to snake's POV (pitch/yaw)
        // Up = pitch up, Down = pitch down, Left = yaw left, Right = yaw right
        if (scheme.xzKeys.up.includes(e.key)) {
          setFirstPersonDirection('up');
        } else if (scheme.xzKeys.down.includes(e.key)) {
          setFirstPersonDirection('down');
        } else if (scheme.xzKeys.left.includes(e.key)) {
          setFirstPersonDirection('left');
        } else if (scheme.xzKeys.right.includes(e.key)) {
          setFirstPersonDirection('right');
        }
      } else {
        // Orbit view controls
        const applyDirection = (dir: Direction) => {
          if (viewRelativeControls && dir.y === 0) {
            setDirection(transformDirectionForCamera(dir, cameraAngleRef.current));
          } else {
            setDirection(dir);
          }
        };

        if (scheme.xzKeys.up.includes(e.key)) {
          applyDirection({ x: 0, y: 0, z: -1 });
        } else if (scheme.xzKeys.down.includes(e.key)) {
          applyDirection({ x: 0, y: 0, z: 1 });
        } else if (scheme.xzKeys.left.includes(e.key)) {
          applyDirection({ x: -1, y: 0, z: 0 });
        } else if (scheme.xzKeys.right.includes(e.key)) {
          applyDirection({ x: 1, y: 0, z: 0 });
        } else if (scheme.yKeys.up.includes(e.key)) {
          setDirection({ x: 0, y: 1, z: 0 });
        } else if (scheme.yKeys.down.includes(e.key)) {
          setDirection({ x: 0, y: -1, z: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gameOver, resetGame, setDirection, setFirstPersonDirection, showNameInput, submitResult, controlType, viewRelativeControls, isFirstPerson]);

  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-dark-700 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { navigate('/'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏠</span><span>Arena Home</span>
                    </button>
                    <button
                      onClick={() => { navigate('/editor'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>✏️</span><span>Editor</span>
                    </button>
                    <button
                      onClick={() => { navigate('/play'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-neon-green hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🎮</span><span>Manual Play</span>
                    </button>
                    <button
                      onClick={() => { navigate('/leaderboard'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏆</span><span>Leaderboard</span>
                    </button>
                    <hr className="my-1 border-dark-700" />
                    <button
                      onClick={() => { navigate('/about'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-gray-400 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                    >
                      <span>ℹ️</span><span>About</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <span className="text-2xl">🐍</span>
            <div>
              <h1 className="text-base font-bold text-white">Manual Play</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {isFirstPerson ? 'First-person view' : `${CONTROL_SCHEMES[controlType].hint} controls`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Control scheme picker */}
            <div className="relative">
              <button
                onClick={() => setShowControlPicker(!showControlPicker)}
                className="px-2 py-1.5 bg-dark-700 text-gray-300 text-xs font-medium rounded-lg hover:bg-dark-600 transition-colors border border-dark-600"
              >
                {CONTROL_SCHEMES[controlType].name}
              </button>

              {showControlPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowControlPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1">
                    {(Object.keys(CONTROL_SCHEMES) as ControlType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => { setControlType(type); setShowControlPicker(false); }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-dark-700 flex items-center justify-between ${
                          controlType === type ? 'text-neon-green' : 'text-white'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{CONTROL_SCHEMES[type].name}</div>
                          <div className="text-xs text-gray-500">{CONTROL_SCHEMES[type].description}</div>
                        </div>
                        {controlType === type && <span className="text-neon-green">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <AudioToggle />
            <button
              onClick={resetGame}
              className="px-3 py-1.5 bg-neon-green text-dark-900 text-sm font-semibold rounded-lg hover:bg-neon-green/90 transition-colors"
            >
              Restart
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-auto md:overflow-hidden">
        {/* Game canvas */}
        <div className="h-[45vh] md:h-auto md:flex-1 relative flex-shrink-0">
          <Canvas
            camera={{ position: [35, 25, 35], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <Scene
              gameState={gameState}
              autoRotate={autoRotate}
              onCameraAngleChange={(angle) => { cameraAngleRef.current = angle; }}
              isFirstPerson={isFirstPerson}
              lastDirection={lastDirectionRef.current}
              snakeUp={snakeUpRef.current}
              fireworkTrigger={fireworkTrigger}
              fireworkPosition={fireworkPosition}
            />
          </Canvas>

          {/* Score overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className="bg-dark-800/90 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
              <span className="text-gray-400 text-sm">Score</span>
              <span className="ml-2 text-neon-green font-bold text-2xl">{gameState.score}</span>
            </div>
            <div className="bg-dark-800/90 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
              <span className="text-gray-400 text-sm">Length</span>
              <span className="ml-2 text-neon-blue font-bold text-2xl">{gameState.snake.length}</span>
            </div>
          </div>

          {/* Control toggles - bottom right */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {/* First-person view toggle */}
            <button
              onClick={() => setIsFirstPerson(!isFirstPerson)}
              className={`p-2 rounded-lg border transition-colors ${
                isFirstPerson
                  ? 'bg-neon-pink/20 border-neon-pink text-neon-pink'
                  : 'bg-dark-800/90 border-dark-600 text-gray-400 hover:text-white'
              }`}
              title={isFirstPerson ? 'Switch to orbit view' : 'Switch to first-person view'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            {/* View-relative toggle - only shown in orbit view */}
            {!isFirstPerson && (
              <button
                onClick={() => setViewRelativeControls(!viewRelativeControls)}
                className={`p-2 rounded-lg border transition-colors ${
                  viewRelativeControls
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
                    : 'bg-dark-800/90 border-dark-600 text-gray-400 hover:text-white'
                }`}
                title={viewRelativeControls ? 'View-relative controls (ON)' : 'Absolute controls (OFF)'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {/* Rotation toggle - only shown in orbit view */}
            {!isFirstPerson && (
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-2 rounded-lg border transition-colors ${
                  autoRotate
                    ? 'bg-neon-green/20 border-neon-green text-neon-green'
                    : 'bg-dark-800/90 border-dark-600 text-gray-400 hover:text-white'
                }`}
                title={autoRotate ? 'Stop rotation' : 'Start rotation'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>

          {/* Game over overlay */}
          {gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-500 mb-2">GAME OVER</div>
                <div className="text-gray-400 mb-2">{gameState.deathReason}</div>
                <div className="text-2xl text-neon-green mb-4">Final Score: {gameState.score}</div>

                {submitResult && (
                  <div className="mb-4 bg-dark-800 rounded-lg p-4 border border-neon-green">
                    <div className="text-neon-green font-bold text-lg mb-1">Score Submitted!</div>
                    <div className="text-white text-xl font-mono">{submitResult.name}</div>
                    <div className="text-gray-400 text-sm">Rank #{submitResult.rank} of {submitResult.totalScores}</div>
                  </div>
                )}

                {showNameInput && !submitResult && (
                  <div className="mb-4">
                    <div className="text-gray-300 text-sm mb-3">Enter your name:</div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmitScore(); }} className="flex flex-col items-center gap-3">
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Your name"
                        maxLength={20}
                        autoFocus
                        className="w-48 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-center text-lg focus:outline-none focus:border-neon-green"
                      />

                      {submitError && (
                        <div className="text-red-400 text-sm">{submitError}</div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !playerName.trim()}
                          className="px-4 py-2 bg-neon-green text-dark-900 font-bold rounded-lg hover:bg-neon-green/90 transition-colors disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNameInput(false)}
                          className="px-4 py-2 bg-dark-700 text-gray-300 font-bold rounded-lg hover:bg-dark-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {!showNameInput && (
                  <div className="flex flex-col gap-2 items-center">
                    {!submitResult && gameState.score > 0 && (
                      <button
                        onClick={() => setShowNameInput(true)}
                        className="px-6 py-3 bg-neon-blue text-white font-bold rounded-lg hover:bg-neon-blue/90 transition-colors"
                      >
                        Submit Score
                      </button>
                    )}
                    <button
                      onClick={resetGame}
                      className="px-6 py-3 bg-neon-green text-dark-900 font-bold rounded-lg hover:bg-neon-green/90 transition-colors"
                    >
                      Play Again
                    </button>
                    <button
                      onClick={() => navigate('/leaderboard')}
                      className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      View Leaderboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls panel - Gameboy layout with modern styling */}
        <div className="flex-shrink-0 md:w-80 border-t md:border-t-0 md:border-l border-dark-700 p-4 md:p-6 flex items-center justify-center bg-dark-800/50">
          <div className="w-full max-w-[280px]">
            {/* Main controls area - D-pad left, A/B right */}
            <div className="flex justify-between items-center">
              {/* D-Pad - In FPV: all 4 directions for pitch/yaw. In orbit: XZ movement */}
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">
                  {isFirstPerson ? 'Pitch/Turn' : 'Move'}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onPointerDown={() => {
                      if (isFirstPerson) {
                        setFirstPersonDirection('up');
                      } else {
                        setDirectionWithViewTransform({ x: 0, y: 0, z: -1 });
                      }
                    }}
                    className="w-12 h-9 bg-dark-700 hover:bg-dark-600 active:bg-neon-green/20 active:border-neon-green border border-dark-600 rounded-lg flex items-center justify-center text-gray-300 active:text-neon-green transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onPointerDown={() => {
                        if (isFirstPerson) {
                          setFirstPersonDirection('left');
                        } else {
                          setDirectionWithViewTransform({ x: -1, y: 0, z: 0 });
                        }
                      }}
                      className="w-9 h-12 bg-dark-700 hover:bg-dark-600 active:bg-neon-green/20 active:border-neon-green border border-dark-600 rounded-lg flex items-center justify-center text-gray-300 active:text-neon-green transition-colors select-none"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="w-12 h-12 bg-dark-900 border border-dark-600 rounded-lg flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-dark-600 rounded-full" />
                    </div>
                    <button
                      onPointerDown={() => {
                        if (isFirstPerson) {
                          setFirstPersonDirection('right');
                        } else {
                          setDirectionWithViewTransform({ x: 1, y: 0, z: 0 });
                        }
                      }}
                      className="w-9 h-12 bg-dark-700 hover:bg-dark-600 active:bg-neon-green/20 active:border-neon-green border border-dark-600 rounded-lg flex items-center justify-center text-gray-300 active:text-neon-green transition-colors select-none"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onPointerDown={() => {
                      if (isFirstPerson) {
                        setFirstPersonDirection('down');
                      } else {
                        setDirectionWithViewTransform({ x: 0, y: 0, z: 1 });
                      }
                    }}
                    className="w-12 h-9 bg-dark-700 hover:bg-dark-600 active:bg-neon-green/20 active:border-neon-green border border-dark-600 rounded-lg flex items-center justify-center text-gray-300 active:text-neon-green transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Y-axis Buttons - only shown in orbit view */}
              {!isFirstPerson && (
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Up/Down</div>
                  <div className="flex gap-3 -rotate-12">
                    {/* Down button - lower left */}
                    <div className="flex flex-col items-center mt-6">
                      <button
                        onPointerDown={() => setDirection({ x: 0, y: -1, z: 0 })}
                        className="w-14 h-14 bg-dark-700 hover:bg-dark-600 active:bg-neon-pink/30 border-2 border-dark-500 active:border-neon-pink rounded-full flex items-center justify-center text-gray-300 active:text-neon-pink transition-colors select-none shadow-lg"
                      >
                        <span className="font-bold text-lg">{CONTROL_SCHEMES[controlType].yKeys.down[0].toUpperCase()}</span>
                      </button>
                      <span className="text-[9px] text-gray-500 mt-1 rotate-12">Down</span>
                    </div>
                    {/* Up button - upper right */}
                    <div className="flex flex-col items-center">
                      <button
                        onPointerDown={() => setDirection({ x: 0, y: 1, z: 0 })}
                        className="w-14 h-14 bg-dark-700 hover:bg-dark-600 active:bg-neon-blue/30 border-2 border-dark-500 active:border-neon-blue rounded-full flex items-center justify-center text-gray-300 active:text-neon-blue transition-colors select-none shadow-lg"
                      >
                        <span className="font-bold text-lg">{CONTROL_SCHEMES[controlType].yKeys.up[0].toUpperCase()}</span>
                      </button>
                      <span className="text-[9px] text-gray-500 mt-1 rotate-12">Up</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="mt-6 text-center">
              <div className="text-[10px] text-gray-600 bg-dark-900/50 rounded px-3 py-2 inline-block">
                <span className="text-gray-500">Keys:</span>{' '}
                <span className="text-gray-400">
                  {isFirstPerson
                    ? `${CONTROL_SCHEMES[controlType].xzKeys.up[0].toUpperCase()}/${CONTROL_SCHEMES[controlType].xzKeys.down[0].toUpperCase()} pitch, ${CONTROL_SCHEMES[controlType].xzKeys.left[0].toUpperCase()}/${CONTROL_SCHEMES[controlType].xzKeys.right[0].toUpperCase()} turn`
                    : CONTROL_SCHEMES[controlType].hint
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
