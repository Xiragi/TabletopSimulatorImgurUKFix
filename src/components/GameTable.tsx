import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button, Stack } from '@mui/material';
import { getGameStatus } from '../gameStatus';
import { GameItem } from '../types';

interface GameTableProps {
  displayResults: GameItem[];
  onConvert: (item: GameItem, forceRestart?: boolean) => void;
  hasScanned: boolean;
  isConvertingAny: boolean;
  permanentBackendName?: string;
  onRehost: (item: GameItem) => void;
}

function ActionCell({ item, onConvert }: { item: GameItem, onConvert: (item: GameItem, forceRestart?: boolean) => void }) {
  if (item.convertState === 'Update Available') {
    return <Button variant="contained" color="info" size="small" onClick={() => onConvert(item)}>Update</Button>;
  }
  
  if (item.isConverted || item.convertState === 'Already Converted') {
    return <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Already Converted</Typography>;
  }
  
  if (!item.hasImgur) {
    return <Button variant="contained" size="small" disabled>Convert</Button>;
  }
  
  if (['Convert', 'Error'].includes(item.convertState)) {
    return <Button variant="contained" color="primary" size="small" onClick={() => onConvert(item)}>Convert</Button>;
  }
  
  if (item.convertState === 'Incomplete') {
    return (
      <Stack direction="row" spacing={1} justifyContent="center">
        <Button variant="contained" color="warning" size="small" onClick={() => onConvert(item)}>Resume</Button>
        <Button variant="outlined" color="error" size="small" onClick={() => onConvert(item, true)}>Restart</Button>
      </Stack>
    );
  }
  
  return <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.convertState}</Typography>;
}

export function GameTable({ displayResults, onConvert, hasScanned, onRehost, isConvertingAny, permanentBackendName }: GameTableProps) {
  return (
    <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto', borderRadius: 0 }} elevation={0}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Picture</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Game Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Imgur Links</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Other Links</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '150px', textAlign: 'center' }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!hasScanned && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                <Typography variant="h6">Ready to start</Typography>
                <Typography>Click "Scan" above to load TableTop Simulator games from your Workshop folder.</Typography>
              </TableCell>
            </TableRow>
          )}
          {hasScanned && displayResults.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                <Typography variant="h6">No games found</Typography>
                <Typography>There are no games matching your current filters in this directory.</Typography>
              </TableCell>
            </TableRow>
          )}
          {displayResults.map((item, idx) => {
            const status = getGameStatus(item);

            return (
              <TableRow key={`${item.id}-${idx}`} className={status.className}>
                <TableCell>
                  {item.imagePath ? <img src={`file://${item.imagePath}`} className="table-image" /> : 'No Image'}
                </TableCell>
                <TableCell>{item.saveName}<Typography variant="caption" display="block">{status.label}</Typography></TableCell>
                <TableCell>{item.imgurCount}</TableCell>
                <TableCell>{item.nonImgurCount}</TableCell>
                <TableCell align="center">
                  <Stack spacing={0.5} alignItems="center">
                    <ActionCell item={item} onConvert={onConvert} />
                    {item.temporaryFix && <Typography variant="caption" color="warning.main">Temporary proxy fix</Typography>}
                    {(item.temporaryFix || (item.isConverted && item.hasImgur)) && permanentBackendName && item.originalId && !['Queued...', 'Converting...'].includes(item.convertState) && (
                      <Button size="small" variant="outlined" disabled={isConvertingAny} onClick={() => onRehost(item)}>Rehost with {permanentBackendName}</Button>
                    )}
                    {item.progress && <Typography variant="caption" sx={{textAlign: 'center'}}>{item.progress}</Typography>}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
