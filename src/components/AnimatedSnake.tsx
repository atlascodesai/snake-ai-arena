import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AnimatedSnakeProps {
  size?: number;
  className?: string;
  clickable?: boolean;
}

function SnakeCanvas({ size, className = '' }: { size: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = size / 2;
    const scale = size / 200; // Original was 200px

    // Snake properties
    const snake = {
      segments: [] as { x: number; y: number }[],
      numSegments: 25,
      segmentLength: 8 * scale,
      headSize: 14 * scale,
      blinkTimer: 0,
      isBlinking: false,
      tongueOut: 0,
    };

    // Initialize snake segments
    for (let i = 0; i < snake.numSegments; i++) {
      snake.segments.push({ x: center, y: center });
    }

    let time = 0;

    function updateSnake() {
      time += 0.02;

      const head = snake.segments[0];

      // Spiral that breathes in and out
      const breathe = Math.sin(time * 0.5) * 0.15 + 1;
      const spiralSpeed = time * 1.5;
      const maxRadius = 35 * scale * breathe;
      const minRadius = 8 * scale;

      // Create a looping spiral motion
      const loopPhase = (time * 0.3) % (Math.PI * 2);
      const radiusT = (Math.sin(loopPhase) + 1) / 2;
      const currentRadius = minRadius + radiusT * (maxRadius - minRadius);

      head.x = center + Math.cos(spiralSpeed) * currentRadius;
      head.y = center + Math.sin(spiralSpeed) * currentRadius;

      // Each segment follows the one before it
      for (let i = 1; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        const prev = snake.segments[i - 1];
        const dx = prev.x - seg.x;
        const dy = prev.y - seg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > snake.segmentLength) {
          seg.x += (dx / dist) * (dist - snake.segmentLength);
          seg.y += (dy / dist) * (dist - snake.segmentLength);
        }
      }

      // Blink randomly
      snake.blinkTimer++;
      if (snake.blinkTimer > 80 && Math.random() < 0.03) {
        snake.isBlinking = true;
        snake.blinkTimer = 0;
      }
      if (snake.isBlinking && snake.blinkTimer > 5) {
        snake.isBlinking = false;
      }

      // Tongue flick
      snake.tongueOut = Math.sin(time * 4) > 0.5 ? Math.sin(time * 4) : 0;
    }

    function drawSnake() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Draw body segments (tail to head, getting thicker)
      for (let i = snake.segments.length - 1; i >= 1; i--) {
        const seg = snake.segments[i];
        const prev = snake.segments[i - 1];
        const thickness = (4 + (1 - i / snake.segments.length) * 14) * scale;

        ctx.beginPath();
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#4CAF50';
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(prev.x, prev.y);
        ctx.stroke();
      }

      // Head
      const head = snake.segments[0];
      const neck = snake.segments[1];
      const angle = Math.atan2(head.y - neck.y, head.x - neck.x);

      ctx.beginPath();
      ctx.arc(head.x, head.y, snake.headSize, 0, Math.PI * 2);
      ctx.fillStyle = '#4CAF50';
      ctx.fill();

      // Tongue
      if (snake.tongueOut > 0) {
        const tongueLength = 15 * scale * snake.tongueOut;
        const tongueX = head.x + Math.cos(angle) * (snake.headSize + tongueLength);
        const tongueY = head.y + Math.sin(angle) * (snake.headSize + tongueLength);
        const tongueStartX = head.x + Math.cos(angle) * snake.headSize;
        const tongueStartY = head.y + Math.sin(angle) * snake.headSize;

        ctx.beginPath();
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = '#F44336';
        ctx.lineCap = 'round';
        ctx.moveTo(tongueStartX, tongueStartY);
        ctx.lineTo(tongueX, tongueY);
        ctx.stroke();

        // Fork
        const forkLen = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(tongueX, tongueY);
        ctx.lineTo(tongueX + Math.cos(angle + 0.5) * forkLen, tongueY + Math.sin(angle + 0.5) * forkLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tongueX, tongueY);
        ctx.lineTo(tongueX + Math.cos(angle - 0.5) * forkLen, tongueY + Math.sin(angle - 0.5) * forkLen);
        ctx.stroke();
      }

      // Eyes
      const leftEyeX = head.x + Math.cos(angle + 0.7) * 8 * scale;
      const leftEyeY = head.y + Math.sin(angle + 0.7) * 8 * scale;
      const rightEyeX = head.x + Math.cos(angle - 0.5) * 9 * scale;
      const rightEyeY = head.y + Math.sin(angle - 0.5) * 9 * scale;

      const eyeHeight = snake.isBlinking ? 0.15 : 1;

      // Left eye (bigger)
      ctx.beginPath();
      ctx.save();
      ctx.translate(leftEyeX, leftEyeY);
      ctx.scale(1, eyeHeight);
      ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.restore();

      // Left pupil
      if (!snake.isBlinking) {
        ctx.beginPath();
        ctx.arc(leftEyeX + 1 * scale, leftEyeY + 2 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
      }

      // Right eye (smaller)
      ctx.beginPath();
      ctx.save();
      ctx.translate(rightEyeX, rightEyeY);
      ctx.scale(1, eyeHeight);
      ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.restore();

      // Right pupil
      if (!snake.isBlinking) {
        ctx.beginPath();
        ctx.arc(rightEyeX - 1 * scale, rightEyeY + 1 * scale, 2.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
      }
    }

    function animate() {
      updateSnake();
      drawSnake();
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ background: 'transparent' }}
    />
  );
}

function SnakeModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <SnakeCanvas size={300} />
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

export function AnimatedSnake({ size = 200, className = '', clickable = true }: AnimatedSnakeProps) {
  const [showModal, setShowModal] = useState(false);

  if (!clickable) {
    return <SnakeCanvas size={size} className={className} />;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="cursor-pointer hover:scale-110 transition-transform"
        aria-label="View larger snake animation"
      >
        <SnakeCanvas size={size} className={className} />
      </button>
      {showModal && <SnakeModal onClose={() => setShowModal(false)} />}
    </>
  );
}
