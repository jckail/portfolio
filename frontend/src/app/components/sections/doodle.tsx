import React, { useCallback, useEffect, useRef, useState } from 'react';

import '../../../styles/components/doodle.css';

interface DoodleProps {
  isVisible: boolean;
  isPartyMode: boolean;
}

interface Point {
  x: number;
  y: number;
}

const COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#22d3ee',
];

const Doodle: React.FC<DoodleProps> = ({ isVisible, isPartyMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const colorIndex = useRef(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const active = isVisible || isPartyMode;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active, resize]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(event);
    colorIndex.current = (colorIndex.current + 1) % COLORS.length;
  };

  const drawStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const next = getPoint(event);
    ctx.strokeStyle = isPartyMode
      ? COLORS[Math.floor(Math.random() * COLORS.length)]
      : COLORS[colorIndex.current];
    ctx.lineWidth = isPartyMode ? 4 + Math.random() * 6 : 3.5;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();

    // Soft glow dots for party mode
    if (isPartyMode) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(next.x, next.y, 8 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    lastPoint.current = next;
  };

  const endStroke = () => {
    if (drawing.current) {
      setStrokeCount(count => count + 1);
    }
    drawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
  };

  const containerClass = isPartyMode
    ? 'visible party-mode'
    : isVisible
      ? 'visible'
      : '';

  return (
    <section
      id="doodle"
      className={`doodle-container ${containerClass}`}
      aria-hidden={!active}
    >
      <div className={`doodle-section ${active ? 'visible' : ''}`}>
        <div className="doodle-toolbar">
          <h2 className="doodle-title">
            {isPartyMode ? 'Party doodle board' : 'Doodle board'}
          </h2>
          <p className="doodle-hint">
            Draw with your pointer
            {strokeCount > 0 ? ` · ${strokeCount} stroke${strokeCount === 1 ? '' : 's'}` : ''}
          </p>
          <button type="button" className="doodle-clear" onClick={clearCanvas}>
            Clear
          </button>
        </div>
        <div className="doodle-content">
          {active && (
            <canvas
              ref={canvasRef}
              className="doodle-canvas"
              aria-label="Drawing canvas"
              onPointerDown={startStroke}
              onPointerMove={drawStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default Doodle;
