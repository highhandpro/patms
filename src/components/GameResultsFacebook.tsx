import React, { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check, FileImage } from 'lucide-react';
import type { Tournament, Member } from '../types';

interface GameResultsFacebookProps {
  tournament: Tournament;
  members: Member[];
}

export const GameResultsFacebook: React.FC<GameResultsFacebookProps> = ({ tournament, members }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Refs to store preloaded images
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  // Preload images
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
      // Fallback if background fails
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

  // Drawing logic
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-resolution dimensions (1080x1080)
    canvas.width = 1080;
    canvas.height = 1080;

    // 1. Draw Background
    // Radial Gradient
    const gradient = ctx.createRadialGradient(540, 540, 100, 540, 540, 700);
    gradient.addColorStop(0, '#1b4332'); // deep green felt center
    gradient.addColorStop(1, '#081c15'); // extremely dark green edges
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Felt texture pattern
    if (bgImageRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'overlay';
      // Draw tiling pattern
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

    // 3. Draw Header (Logo & Brand Text)
    if (logoImageRef.current) {
      ctx.save();
      // Draw centered logo (width 300px, height 200px)
      const logoWidth = 300;
      const logoHeight = 200;
      const logoX = 540 - logoWidth / 2;
      const logoY = 45;
      ctx.drawImage(logoImageRef.current, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();
    }

    // 4. Dynamic Title: "MONTH DD, YYYY TOURNAMENT RESULTS"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 36px "Outfit", "Segoe UI", sans-serif';
    
    // Parse and format date dynamically
    let formattedDate = 'TOURNAMENT RESULTS';
    try {
      const dateObj = new Date(tournament.date + 'T00:00:00');
      formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase() + ' TOURNAMENT RESULTS';
    } catch (e) {
      console.error(e);
    }
    ctx.fillText(formattedDate, 540, 285);
    ctx.restore();

    // 5. Draw Champion Section
    // Determine the champion
    const championEntry = tournament.entries.find(e => e.finishPosition === 1);
    const championMember = championEntry ? members.find(m => m.id === championEntry.memberId) : null;
    const championName = championMember ? `${championMember.firstName} ${championMember.lastName}` : 'TBD';

    ctx.save();
    // Rounded box background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 140, 315, 800, 130, 12);
    ctx.fill();
    ctx.stroke();

    // Champion Label
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 16px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText('CHAMPION', 540, 350);

    // Champion Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText(championName, 540, 405);
    ctx.restore();

    // 6. Draw Stat Blocks (3 columns)
    ctx.save();
    const statCols = [
      { val: String(tournament.entries.length), label: 'PLAYERS', x: 260 },
      { val: `$${tournament.totalPrizePool}`, label: 'PRIZE POOL', x: 540 },
      { 
        val: (() => {
          try {
            const dateObj = new Date(tournament.date + 'T00:00:00');
            return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          } catch (e) {
            return '';
          }
        })(), 
        label: 'EVENT DATE', 
        x: 820 
      }
    ];

    statCols.forEach(col => {
      // Background pill for each stat
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, col.x - 110, 465, 220, 90, 8);
      ctx.fill();
      ctx.stroke();

      // Stat Value
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 32px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(col.val, col.x, 505);

      // Stat Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '700 12px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(col.label, col.x, 535);
    });
    ctx.restore();

    // 7. Standings Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 24px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText('FINAL STANDINGS', 540, 595);
    ctx.restore();

    // 8. Standings Grid (3 columns x 8 rows)
    const sortedEntries = [...tournament.entries]
      .filter(e => e.finishPosition !== undefined && e.finishPosition > 0)
      .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99))
      .slice(0, 24); // top 24 players

    ctx.save();
    const colWidth = 270;
    const rowHeight = 42;
    const colGap = 25;
    const startY = 625;

    sortedEntries.forEach((entry, index) => {
      const colIdx = Math.floor(index / 8);
      const rowIdx = index % 8;

      const x = 540 + (colIdx - 1) * (colWidth + colGap) - colWidth / 2;
      const y = startY + rowIdx * rowHeight;

      const playerMember = members.find(m => m.id === entry.memberId);
      const playerName = playerMember ? `${playerMember.firstName} ${playerMember.lastName}` : 'Unknown';

      // Rounded pill background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      // Highlight top finishers or payout winners with a gold border
      const isWinner = entry.payoutEarned > 0 || (entry.finishPosition !== undefined && entry.finishPosition <= 2);
      ctx.strokeStyle = isWinner ? 'rgba(251, 191, 36, 0.65)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isWinner ? 1.5 : 1;

      drawRoundedRect(ctx, x, y, colWidth, 34, 6);
      ctx.fill();
      ctx.stroke();

      // Rank text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 18px "Outfit", "Segoe UI", sans-serif';
      ctx.fillText(`${entry.finishPosition}.`, x + 10, y + 22.5);

      // Player Name (truncated if too long)
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 18px "Outfit", "Segoe UI", sans-serif';
      let nameText = playerName;
      if (nameText.length > 18) nameText = nameText.substring(0, 16) + '...';
      ctx.fillText(nameText, x + 36, y + 22.5);

      // Points earned text (payout + points)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 18px "Outfit", "Segoe UI", sans-serif';
      let scoreText = `${entry.pointsEarned} pts`;
      if (entry.payoutEarned && entry.payoutEarned > 0) {
        scoreText = `$${entry.payoutEarned} / ${entry.pointsEarned}p`;
      }
      ctx.fillText(scoreText, x + colWidth - 10, y + 22.5);
    });
    ctx.restore();
  };

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

  // Redraw when ready
  useEffect(() => {
    if (imagesLoaded) {
      const timer = setTimeout(drawCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [imagesLoaded, tournament, members]);

  // Actions: Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `toc_results_${tournament.date}.png`;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
      
      {/* Description card */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileImage size={24} style={{ color: 'var(--color-gold)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Facebook Results Graphic</h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Generate a premium, ready-to-share graphic summarizing this game's final standings, payouts, and player count. Download it directly or copy it to your clipboard to paste it onto Facebook.
        </p>
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
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

      {/* Graphic Canvas Preview Container */}
      <div 
        style={{ 
          borderRadius: '16px', 
          border: '1px solid rgba(251, 191, 36, 0.2)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          backgroundColor: '#050f0c',
          width: '100%',
          maxWidth: '540px',
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
            display: 'block',
            aspectRatio: '1/1'
          }} 
        />
      </div>

    </div>
  );
};
