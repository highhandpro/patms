import React, { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check, FileImage, X } from 'lucide-react';
import type { Season, Member, Tournament } from '../types';
import type { PlayerStanding } from '../utils/stats';

interface SeasonStandingsFlyerProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season;
  standings: PlayerStanding[];
  members: Member[];
  tournaments: Tournament[];
}

export const SeasonStandingsFlyer: React.FC<SeasonStandingsFlyerProps> = ({
  isOpen,
  onClose,
  season,
  standings,
  members,
  tournaments
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [limit, setLimit] = useState<number>(20); // Default to Top 20

  // Refs to store preloaded images
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  // Preload images when component mounts
  useEffect(() => {
    let bgLoaded = false;
    let logoLoaded = false;

    const checkAllLoaded = () => {
      if (bgLoaded && logoLoaded) {
        setImagesLoaded(true);
      }
    };

    const bg = new Image();
    bg.src = '/bg-felt.png';
    bg.onload = () => {
      bgImageRef.current = bg;
      bgLoaded = true;
      checkAllLoaded();
    };
    bg.onerror = () => {
      bgLoaded = true;
      checkAllLoaded();
    };

    const logo = new Image();
    logo.src = '/club-logo.png';
    logo.onload = () => {
      logoImageRef.current = logo;
      logoLoaded = true;
      checkAllLoaded();
    };
    logo.onerror = () => {
      logoLoaded = true;
      checkAllLoaded();
    };
  }, []);

  // Helper to draw rounded rectangles on Canvas
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Drawing logic
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size is a constant high-res square
    canvas.width = 1080;
    canvas.height = 1080;

    // 1. Draw Background
    const gradient = ctx.createRadialGradient(540, 540, 100, 540, 540, 750);
    gradient.addColorStop(0, '#1b4332'); // deep green felt center
    gradient.addColorStop(1, '#081c15'); // extremely dark green edges
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Felt texture pattern
    if (bgImageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'overlay';
      const pattern = ctx.createPattern(bgImageRef.current, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 1080, 1080);
      }
      ctx.restore();
    }

    // 2. Draw Premium Gold Borders
    ctx.save();
    // Outer border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 1080 - 48, 1080 - 48);

    // Inner thin border
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(32, 32, 1080 - 64, 1080 - 64);
    ctx.restore();

    // 3. Draw Header Logo
    if (logoImageRef.current) {
      ctx.save();
      const logoWidth = 240;
      const logoHeight = 160;
      const logoX = 540 - logoWidth / 2;
      const logoY = 45;
      ctx.drawImage(logoImageRef.current, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();
    }

    // 4. Dynamic Season Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 36px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText(`${season.name.toUpperCase()} LEADERBOARD`, 540, 260);
    ctx.restore();

    // 5. Calculate Stats
    const completedTours = tournaments.filter(
      t => t.seasonId === season.id && t.status === 'completed' && !t.name.toLowerCase().includes('beta') && !t.isBetaTest
    );
    const seasonToCPool = completedTours.reduce((sum, t) => sum + t.totalDealerAppreciation, 0);

    // 6. Draw Stat Blocks (3 columns)
    ctx.save();
    const statCols = [
      { val: String(completedTours.length), label: 'GAMES PLAYED', x: 260 },
      { val: `$${seasonToCPool}`, label: 'TOC PRIZE POOL', x: 540 },
      { val: String(standings.length), label: 'ACTIVE PLAYERS', x: 820 }
    ];

    statCols.forEach(col => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, col.x - 110, 310, 220, 75, 8);
      ctx.fill();
      ctx.stroke();

      // Stat Value
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 28px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(col.val, col.x, 345);

      // Stat Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '700 10px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(col.label, col.x, 370);
    });
    ctx.restore();

    // 7. Grid Header Label
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 22px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText('LEADERBOARD STANDINGS', 540, 425);
    ctx.restore();

    // 8. Standings Grid
    ctx.save();
    const itemsToShow = standings.slice(0, limit);
    const rowsCount = 10; // Keep always 10 rows to preserve square layout
    
    let colsCount = 1;
    let cardWidth = 500;
    
    if (limit === 20) {
      colsCount = 2;
      cardWidth = 465;
    } else if (limit === 30) {
      colsCount = 3;
      cardWidth = 310;
    }

    const colGap = 20;
    const rowHeight = 52;
    const startY = 455;

    itemsToShow.forEach((standing, index) => {
      const colIdx = Math.floor(index / rowsCount);
      const rowIdx = index % rowsCount;

      let x = 540 - cardWidth / 2;
      if (colsCount === 2) {
        x = 540 + (colIdx - 0.5) * (cardWidth + colGap) - cardWidth / 2;
      } else if (colsCount === 3) {
        x = 540 + (colIdx - 1) * (cardWidth + colGap) - cardWidth / 2;
      }
      const y = startY + rowIdx * rowHeight;

      const playerMember = members.find(m => m.id === standing.memberId);
      const playerName = playerMember ? `${playerMember.firstName} ${playerMember.lastName}` : standing.name;

      // Draw Card Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      const isTop3 = index < 3;
      ctx.strokeStyle = isTop3 ? 'rgba(251, 191, 36, 0.65)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isTop3 ? 1.5 : 1;

      drawRoundedRect(ctx, x, y, cardWidth, 45, 6);
      ctx.fill();
      ctx.stroke();

      // Rank Text
      ctx.textAlign = 'left';
      ctx.fillStyle = isTop3 ? '#fbbf24' : '#ffffff';
      ctx.font = '800 15px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(`${index + 1}.`, x + 10, y + 20);

      // Player Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px "Outfit", "Segoe UI", sans-serif';
      let displayPlayName = playerName;
      const maxNameLen = colsCount === 3 ? 14 : 20;
      if (displayPlayName.length > maxNameLen) {
        displayPlayName = displayPlayName.substring(0, maxNameLen - 2) + '..';
      }
      ctx.fillText(displayPlayName, x + 34, y + 20);

      // Points (large on the right)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 17px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(`${standing.points} pts`, x + cardWidth - 10, y + 20);

      // Stats Subtitle
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '600 10px "Outfit", "Segoe UI", sans-serif';
      const statsText = `${standing.played} GP  |  ${standing.wins} Wins  |  $${standing.earnings} Won`;
      ctx.fillText(statsText, x + 34, y + 36);
    });
    ctx.restore();

    // 9. Draw Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '700 11px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText('PENNY ANTE POKER CLUB  •  PATMS v2.20', 540, 1025);
    ctx.restore();
  };

  // Redraw when ready
  useEffect(() => {
    if (imagesLoaded && isOpen) {
      const timer = setTimeout(drawCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [imagesLoaded, isOpen, season, standings, members, tournaments, limit]);

  if (!isOpen) return null;

  // Actions: Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `season_standings_${season.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Actions: Copy to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setCopyStatus('idle');
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCopyStatus('error');
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopyStatus('success');
          setTimeout(() => setCopyStatus('idle'), 3000);
        } catch (err) {
          console.error(err);
          setCopyStatus('error');
          setTimeout(() => setCopyStatus('idle'), 3000);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setCopyStatus('error');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#0c1b15',
          border: '1px solid rgba(251,191,36,0.15)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '650px',
          padding: '24px',
          maxHeight: '95vh',
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileImage size={24} style={{ color: 'var(--color-gold)' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Season Standings Flyer
          </h2>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
          Generate a premium, ready-to-share graphic summarizing the season leaderboard. Download it directly or copy it to your clipboard.
        </p>

        {/* Configurations */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Show Players:</span>
          <select 
            value={limit} 
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="form-input"
            style={{ width: '130px', padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={30}>Top 30</option>
          </select>
        </div>

        {/* Canvas Preview Container */}
        <div 
          style={{ 
            borderRadius: '16px', 
            border: '1px solid rgba(251, 191, 36, 0.2)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            backgroundColor: '#050f0c',
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: 'block'
            }} 
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
          <button className="btn btn-emerald" onClick={handleDownload} style={{ gap: '8px' }}>
            <Download size={16} />
            <span>Download PNG</span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleCopyToClipboard} 
            style={{ 
              gap: '8px', 
              borderColor: copyStatus === 'success' ? '#fbbf24' : 'rgba(255,255,255,0.08)',
              color: copyStatus === 'success' ? '#fbbf24' : '#ffffff'
            }}
          >
            {copyStatus === 'success' ? <Check size={16} /> : <Copy size={16} />}
            <span>{copyStatus === 'success' ? 'Copied!' : copyStatus === 'error' ? 'Failed to Copy' : 'Copy Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
