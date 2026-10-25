import React from 'react';
import { Stack, Chip, Tooltip, Button } from '@mui/material';
import { ServiceStatus } from '../types';

const labels = { available: 'Available', reachable: 'Reachable (uploads unverified)', paused: 'Uploads paused', unavailable: 'Check failed' };

export function ServiceStatusBar({ providers, statuses, checking, onRefresh }: {
  providers: { id: string; shortName: string }[]; statuses: ServiceStatus[]; checking: boolean; onRefresh: () => void;
}) {
  return <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
    {providers.map(({id, shortName}) => {
      const status = statuses.find(item => item.id === id);
      const color = !status ? 'default' : status.state === 'available' ? 'success' : status.state === 'reachable' ? 'info' : status.state === 'paused' ? 'warning' : 'error';
      return <Tooltip key={id} title={status ? `${status.detail} — checked ${new Date(status.checkedAt).toLocaleTimeString()}` : 'Waiting for service check'}>
        <Chip size="small" variant="outlined" color={color} label={`${shortName}: ${status ? labels[status.state] : checking ? 'Checking…' : 'Unknown'}`} />
      </Tooltip>;
    })}
    <Button size="small" onClick={onRefresh} disabled={checking}>{checking ? 'Checking…' : 'Refresh status'}</Button>
  </Stack>;
}
