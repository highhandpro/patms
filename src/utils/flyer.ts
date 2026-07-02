export interface FlyerInfo {
  url: string;
  type: 'pdf' | 'image' | 'iframe';
}

export const getEmbeddableFlyerUrl = (url: string, explicitType?: 'pdf' | 'image' | null): FlyerInfo => {
  if (!url) return { url: '', type: 'image' };
  
  if (url.includes('drive.google.com')) {
    let id = '';
    const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      id = matchD[1];
    } else {
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        id = matchId[1];
      }
    }
    
    if (id) {
      return {
        url: `https://drive.google.com/file/d/${id}/preview`,
        type: 'iframe'
      };
    }
  }
  
  // Handle explicit types or detect by extension
  if (explicitType === 'pdf' || url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?')) {
    return { url, type: 'pdf' };
  }
  
  if (explicitType === 'image') {
    return { url, type: 'image' };
  }
  
  return { url, type: 'image' };
};
