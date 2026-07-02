import React from 'react';

interface PlayerBannerProps {
  children?: React.ReactNode;
  height?: string;
}

export const PlayerBanner: React.FC<PlayerBannerProps> = ({ 
  children,
  height = 'auto' 
}) => {
  return (
    <div 
      className="player-banner poker-pattern"
      style={{ minHeight: height }}
    >
      <div className="player-banner-content">
        {children}
      </div>
    </div>
  );
};
