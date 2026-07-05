import { jsPDF } from 'jspdf';
import type { Member } from '../types';

export const generateSignInSheetPDF = (date: string, players: Member[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const itemsPerPage = 50;
  const pageCount = Math.max(1, Math.ceil(players.length / itemsPerPage));

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }

    const pagePlayers = players.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
    const leftCol = pagePlayers.slice(0, 25);
    const rightCol = pagePlayers.slice(25, 50);

    // Title / Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Penny Ante Club - Player Sign-In Sheet', 0.5, 0.6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${date} | Page ${pageIdx + 1} of ${pageCount}`, 8.0, 0.6, { align: 'right' });

    // Draw header divider line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.02);
    doc.line(0.5, 0.7, 8.0, 0.7);

    // Columns Sub-headers
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('ID', 0.9, 0.95);
    doc.text('Player Name', 1.6, 0.95);

    doc.text('ID', 4.7, 0.95);
    doc.text('Player Name', 5.4, 0.95);

    // Draw column divider vertical line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.015);
    doc.line(4.15, 0.8, 4.15, 10.2);

    // Draw horizontal sub-header divider
    doc.line(0.5, 1.05, 8.0, 1.05);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);

    // Loop 25 rows
    const startY = 1.35;
    const rowHeight = 0.35;

    for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
      const y = startY + rowIdx * rowHeight;
      const leftPlayer = leftCol[rowIdx];
      const rightPlayer = rightCol[rowIdx];

      // Draw bottom row line
      doc.setDrawColor(220, 220, 220); // light gray
      doc.setLineWidth(0.005);
      doc.line(0.5, y + 0.1, 8.0, y + 0.1);

      // Left Column
      if (leftPlayer) {
        // Draw checkbox square
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.015);
        doc.rect(0.5, y - 0.12, 0.16, 0.16);

        // Member ID
        doc.setFont('Helvetica', 'bold');
        doc.text(leftPlayer.id, 0.9, y);

        // Full Name
        doc.setFont('Helvetica', 'normal');
        doc.text(`${leftPlayer.firstName} ${leftPlayer.lastName || ''}`, 1.6, y);
      }

      // Right Column
      if (rightPlayer) {
        // Draw checkbox square
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.015);
        doc.rect(4.3, y - 0.12, 0.16, 0.16);

        // Member ID
        doc.setFont('Helvetica', 'bold');
        doc.text(rightPlayer.id, 4.7, y);

        // Full Name
        doc.setFont('Helvetica', 'normal');
        doc.text(`${rightPlayer.firstName} ${rightPlayer.lastName || ''}`, 5.4, y);
      }
    }
  }

  doc.save('Player_Sign_In_Sheet.pdf');
};

export const generateTDScoreSheetPDF = (tournamentName: string, date: string, players: Member[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const itemsPerPage = 50;
  const pageCount = Math.max(1, Math.ceil(players.length / itemsPerPage));

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }

    const pagePlayers = players.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
    const leftCol = pagePlayers.slice(0, 25);
    const rightCol = pagePlayers.slice(25, 50);

    // Title / Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${tournamentName} - TD Score Sheet`, 0.5, 0.6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${date} | Page ${pageIdx + 1} of ${pageCount}`, 8.0, 0.6, { align: 'right' });

    // Draw header divider line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.02);
    doc.line(0.5, 0.7, 8.0, 0.7);

    // Columns Sub-headers
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    
    // Left column table headers
    doc.text('FIRST NAME', 0.5, 0.95);
    doc.text('LAST NAME', 1.85, 0.95);
    doc.text('PLACE', 3.03, 0.95);
    doc.text('BOUNTIES', 3.52, 0.95);

    // Right column table headers
    doc.text('FIRST NAME', 4.35, 0.95);
    doc.text('LAST NAME', 5.7, 0.95);
    doc.text('PLACE', 6.88, 0.95);
    doc.text('BOUNTIES', 7.37, 0.95);

    // Draw division vertical lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.015);
    doc.line(4.15, 0.8, 4.15, 10.25); // main center division line

    doc.line(3.0, 0.8, 3.0, 10.25); // left column place boundary
    doc.line(3.5, 0.8, 3.5, 10.25); // left column bounties boundary

    doc.line(6.85, 0.8, 6.85, 10.25); // right column place boundary
    doc.line(7.35, 0.8, 7.35, 10.25); // right column bounties boundary

    // Draw horizontal sub-header divider
    doc.line(0.5, 1.05, 8.0, 1.05);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);

    // Loop 25 rows
    const startY = 1.35;
    const rowHeight = 0.35;

    for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
      const y = startY + rowIdx * rowHeight;
      const leftPlayer = leftCol[rowIdx];
      const rightPlayer = rightCol[rowIdx];

      // Draw bottom row line
      doc.setDrawColor(200, 200, 200); // light gray
      doc.setLineWidth(0.005);
      doc.line(0.5, y + 0.1, 8.0, y + 0.1);

      // Left Column
      if (leftPlayer) {
        doc.setFont('Helvetica', 'bold');
        doc.text(leftPlayer.firstName, 0.5, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(leftPlayer.lastName || '', 1.85, y);
      }

      // Right Column
      if (rightPlayer) {
        doc.setFont('Helvetica', 'bold');
        doc.text(rightPlayer.firstName, 4.35, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(rightPlayer.lastName || '', 5.7, y);
      }
    }
  }

  doc.save('TD_Score_Sheet.pdf');
};
