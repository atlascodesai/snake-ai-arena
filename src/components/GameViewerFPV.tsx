/**
 * 3D Snake Game Viewer Component with First-Person View Support
 * Enhanced version of GameViewer with FPV camera mode
 */

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Position, Direction, GameState } from '../game/types';
import { GRID_SIZE, wrapPosition, posEqual } from '../game/utils';

interface GameViewerFPVProps {
  gameState: GameState;
  className?: string;
  isFirstPerson?: boolean;
  onToggleFPV?: () => void;
  showFPVToggle?: boolean;
}

// Snake segment component
function SnakeSegment({
  position,
  isHead,
  hidden
}: {
  position: Position;
  isHead: boolean;
  hidden?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && isHead) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.3;
    }
  });

  if (hidden) return null;

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

// Food component with animation
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

// Camera controller with auto-rotation (orbit mode)
function CameraController() {
  return (
    <OrbitControls
      enablePan={false}
      minDistance={30}
      maxDistance={80}
      autoRotate
      autoRotateSpeed={0.5}
    />
  );
}

// First-person camera that follows the snake head
function FirstPersonCamera({
  snake,
  fov = 90,
}: {
  snake: Position[];
  fov?: number;
}) {
  const { camera } = useThree();
  const smoothPosition = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3());
  const smoothUp = useRef(new THREE.Vector3(0, 1, 0));
  const lastDirection = useRef<Direction>({ x: 1, y: 0, z: 0 });
  const snakeUp = useRef<Direction>({ x: 0, y: 1, z: 0 });

  useFrame(() => {
    if (snake.length < 2) return;

    const head = snake[0];
    const neck = snake[1];

    // Calculate direction from neck to head
    let dir: Direction = {
      x: head.x - neck.x,
      y: head.y - neck.y,
      z: head.z - neck.z,
    };

    // Handle wrapping (when head wraps around, distance is ~GRID_SIZE)
    if (Math.abs(dir.x) > 1) dir.x = dir.x > 0 ? -1 : 1;
    if (Math.abs(dir.y) > 1) dir.y = dir.y > 0 ? -1 : 1;
    if (Math.abs(dir.z) > 1) dir.z = dir.z > 0 ? -1 : 1;

    // Update up vector based on direction change
    const oldDir = lastDirection.current;
    if (dir.x !== oldDir.x || dir.y !== oldDir.y || dir.z !== oldDir.z) {
      // Check if we pitched (direction changed to/from up direction)
      if (dir.x === snakeUp.current.x && dir.y === snakeUp.current.y && dir.z === snakeUp.current.z) {
        snakeUp.current = { x: -oldDir.x, y: -oldDir.y, z: -oldDir.z };
      } else if (dir.x === -snakeUp.current.x && dir.y === -snakeUp.current.y && dir.z === -snakeUp.current.z) {
        snakeUp.current = { ...oldDir };
      }
      lastDirection.current = { ...dir };
    }

    const headPos = new THREE.Vector3(head.x * 2, head.y * 2, head.z * 2);
    const lookDir = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
    const targetUp = new THREE.Vector3(snakeUp.current.x, snakeUp.current.y, snakeUp.current.z);

    // Position camera at the front edge of the head
    const targetCameraPos = headPos.clone().add(lookDir.clone().multiplyScalar(1.2));
    const targetLookAt = headPos.clone().add(lookDir.clone().multiplyScalar(50));

    // Smooth interpolation
    smoothPosition.current.lerp(targetCameraPos, 0.15);
    smoothTarget.current.lerp(targetLookAt, 0.15);
    smoothUp.current.lerp(targetUp, 0.15);

    // Update camera
    const perspCamera = camera as THREE.PerspectiveCamera;
    perspCamera.fov = fov;
    perspCamera.updateProjectionMatrix();

    camera.position.copy(smoothPosition.current);
    camera.up.copy(smoothUp.current);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}

// Main scene
function Scene({
  gameState,
  isFirstPerson,
  fpvFov = 90,
}: {
  gameState: GameState;
  isFirstPerson: boolean;
  fpvFov?: number;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[30, 30, 30]} intensity={1} color="#ffffff" />
      <pointLight position={[-30, -30, 30]} intensity={0.5} color="#00ffff" />
      <pointLight position={[0, 0, -30]} intensity={0.5} color="#ff00ff" />
      <GridCage />
      {gameState.snake.map((segment, index) => (
        <SnakeSegment
          key={index}
          position={segment}
          isHead={index === 0}
          hidden={isFirstPerson && index === 0}
        />
      ))}
      <Food position={gameState.food} />
      {isFirstPerson ? (
        <FirstPersonCamera snake={gameState.snake} fov={fpvFov} />
      ) : (
        <CameraController />
      )}
    </>
  );
}

export default function GameViewerFPV({
  gameState,
  className = '',
  isFirstPerson = false,
  onToggleFPV,
  showFPVToggle = true,
}: GameViewerFPVProps) {
  const [fpvFov, setFpvFov] = useState(90);

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [35, 25, 35], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene
          gameState={gameState}
          isFirstPerson={isFirstPerson}
          fpvFov={fpvFov}
        />
      </Canvas>

      {/* Score overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <div className="bg-dark-800/80 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
          <span className="text-gray-400 text-sm">Score</span>
          <span className="ml-2 text-neon-green font-bold text-xl">{gameState.score}</span>
        </div>
        <div className="bg-dark-800/80 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
          <span className="text-gray-400 text-sm">Length</span>
          <span className="ml-2 text-neon-blue font-bold text-xl">{gameState.snake.length}</span>
        </div>
      </div>

      {/* FPV controls */}
      {showFPVToggle && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* FOV slider - only shown in first-person view */}
          {isFirstPerson && (
            <div className="flex items-center gap-2 bg-dark-800/90 backdrop-blur px-3 py-2 rounded-lg border border-dark-600">
              <span className="text-xs text-gray-400">FOV</span>
              <input
                type="range"
                min="50"
                max="120"
                value={fpvFov}
                onChange={(e) => setFpvFov(Number(e.target.value))}
                className="w-16 h-1 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-neon-pink"
              />
              <span className="text-xs text-neon-pink font-mono w-6">{fpvFov}</span>
            </div>
          )}

          {/* FPV toggle button */}
          {onToggleFPV && (
            <button
              onClick={onToggleFPV}
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
          )}
        </div>
      )}

      {/* Game over overlay */}
      {gameState.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-4xl font-bold text-red-500 mb-2">GAME OVER</div>
            <div className="text-gray-400">{gameState.deathReason}</div>
            <div className="text-2xl text-neon-green mt-4">Final Score: {gameState.score}</div>
          </div>
        </div>
      )}
    </div>
  );
}
