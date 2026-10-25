import { ServiceStatusBar } from './ServiceStatusBar';
import React from 'react';
import { Box, Typography, TextField, Button, Alert, CircularProgress, Stack, LinearProgress, MenuItem } from '@mui/material';

export function TopBar({ 
  dirPath, setDirPath, isScanning, onScan, imgurStatus, 
  isConsoleOpen, setIsConsoleOpen, overallPercent, overallCompleted, overallTotal,
  incompleteItems, onResumeAll, providerInfo, onCancelAll, isConvertingAny, backendId, setBackendId, temporaryFixGames, serviceStatuses, checkingServices, onRefreshServices
}: any) {
  const handleBrowse = async () => {
    const p = await window.electronAPI.openDirectory();
    if (p) setDirPath(p);
  };

  return (
    <Box className="header-bar">
      {(!providerInfo || providerInfo.requiresLocalDownload) && (
        <Alert severity={imgurStatus.status} sx={{ mb: 2 }}>
          {imgurStatus.text}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h5">TableTop Simulator Converter</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          {incompleteItems.length > 0 && (
            <Button variant="contained" color="warning" onClick={onResumeAll}>
              Resume All Incomplete ({incompleteItems.length})
            </Button>
          )}
          <ServiceStatusBar providers={providerInfo?.providers || []} statuses={serviceStatuses} checking={checkingServices} onRefresh={onRefreshServices} />
          <Button variant="outlined" size="small" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
            {isConsoleOpen ? 'Close Console' : 'Open Console'}
          </Button>
        </Stack>
      </Box>
      
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        <TextField 
          size="small" label="Workshop Directory" sx={{ flex: '1 1 260px', minWidth: 0 }}
          value={dirPath} onChange={e => setDirPath(e.target.value)}
        />
        <Button variant="outlined" onClick={handleBrowse} sx={{ minWidth: '100px' }}>
          Browse...
        </Button>
        <Button variant="contained" onClick={onScan} disabled={isScanning} sx={{ minWidth: '100px' }}>
          {isScanning ? <CircularProgress size={24} color="inherit" /> : 'Scan'}
        </Button>
        <TextField select size="small" label="Image backend" value={backendId} sx={{ width: 250, maxWidth: '100%' }}
          onChange={e => { setBackendId(e.target.value); }} disabled={isConvertingAny}>
          <MenuItem value="auto">Automatic (recommended)</MenuItem>
          {(providerInfo?.providers || []).map((provider: {id: string, name: string}) => (
            <MenuItem key={provider.id} value={provider.id}>{provider.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {temporaryFixGames.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Temporary fix applied to game(s): {temporaryFixGames.join(', ')}.
          Proxy links still depend on Imgur and the proxy. Use “Rehost with {providerInfo?.permanentBackend?.shortName || 'a permanent host'}”
          when uploads are available for a permanent rehosted copy.
        </Alert>
      )}

      {overallTotal > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">Overall Progress</Typography>
              <Typography variant="body2" color="text.secondary">{overallCompleted} / {overallTotal} ({overallPercent}%)</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={overallPercent} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          {isConvertingAny && (
            <Button variant="outlined" color="error" onClick={onCancelAll}>
              Cancel
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
