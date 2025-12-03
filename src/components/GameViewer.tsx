/**
 * 3D Snake Game Viewer Component
 * Renders the game state using React Three Fiber
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Position, GameState } from '../game/types';
import { GRID_SIZE } from '../game/utils';

interface GameViewerProps {
  gameState: GameState;
  className?: string;
}

// Snake segment component
function SnakeSegment({ position, isHead, index }: { position: Position; isHead: boolean; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate head glow
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
    <mesh
      ref={meshRef}
      position={[position.x * 2, position.y * 2, position.z * 2]}
    >
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
    <mesh
      ref={meshRef}
      position={[position.x * 2, position.y * 2, position.z * 2]}
    >
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

// Grid cage - simpler version that works on mobile
function GridCage() {
  const size = GRID_SIZE * 2;
  const halfSize = size / 2;

  return (
    <group>
      {/* Floor and ceiling grids (horizontal) */}
      <gridHelper args={[size, GRID_SIZE, '#444466', '#333355']} position={[0, -halfSize, 0]} />
      <gridHelper args={[size, GRID_SIZE, '#333355', '#222244']} position={[0, halfSize, 0]} />

      {/* Vertical grids using rotated gridHelpers */}
      {/* Front and back walls */}
      <group position={[0, 0, -halfSize]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <group position={[0, 0, halfSize]} rotation={[Math.PI / 2, 0, 0]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>

      {/* Left and right walls */}
      <group position={[-halfSize, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>
      <group position={[halfSize, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <gridHelper args={[size, GRID_SIZE, '#333366', '#222244']} />
      </group>

      {/* Wireframe cube for edge definition */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
        <lineBasicMaterial color="#444488" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}

// Camera controller with auto-rotation
function CameraController() {
  const controlsRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.5;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={30}
      maxDistance={80}
      autoRotate
      autoRotateSpeed={0.5}
    />
  );
}

// Main scene
function Scene({ gameState }: { gameState: GameState }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[30, 30, 30]} intensity={1} color="#ffffff" />
      <pointLight position={[-30, -30, 30]} intensity={0.5} color="#00ffff" />
      <pointLight position={[0, 0, -30]} intensity={0.5} color="#ff00ff" />

      {/* Grid */}
      <GridCage />

      {/* Snake */}
      {gameState.snake.map((segment, index) => (
        <SnakeSegment
          key={index}
          position={segment}
          isHead={index === 0}
          index={index}
        />
      ))}

      {/* Food */}
      <Food position={gameState.food} />

      {/* Camera */}
      <CameraController />
    </>
  );
}

export default function GameViewer({ gameState, className = '' }: GameViewerProps) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [35, 25, 35], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene gameState={gameState} />
      </Canvas>

      {/* Score overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <div className="bg-dark-800/80 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
          <span className="text-gray-400 text-sm">Score</span>
          <span className="ml-2 text-neon-green font-bold text-xl">{gameState.score}</span>
        </div>
        <div className="bg-dark-800/80 backdrop-blur px-4 py-2 rounded-lg border border-dark-600">
          <span className="text-gray-400 text-sm">Length</span>
          <span className="ml-2 text-neon-blue font-bold text-xl">{gameState.snake.length}</span>
        </div>
      </div>

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
