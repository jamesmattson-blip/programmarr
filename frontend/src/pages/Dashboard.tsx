import {
  ActionIcon, Alert, Badge, Box, Button, Card, Group,
  Loader, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import {
  IconBroadcast, IconCircleCheck, IconCircleX,
  IconPlayerPlay, IconRefresh, IconSettings,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ConnStatus, TunarrChannel } from '../api/client';

function ConnectionCard({ label, status }: { label: string; status: ConnStatus | undefined }) {
  const ok = status?.ok ?? false;
  return (
    <Card p="sm">
      <Group gap="sm">
        <ThemeIcon size="md" radius="xl" color={ok ? 'green' : 'red'} variant="light">
          {ok ? <IconCircleCheck size={16} /> : <IconCircleX size={16} />}
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600}>{label}</Text>
          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 180 }}>
            {status?.url || 'Not configured'}
          </Text>
          {!ok && status?.error && (
            <Text size="xs" c="red.4" truncate>{status.error}</Text>
          )}
        </Box>
        <Badge color={ok ? 'green' : 'red'} variant="dot">{ok ? 'Online' : 'Offline'}</Badge>
      </Group>
    </Card>
  );
}

const SHUFFLE_COLOR: Record<string, string> = { ordered: 'blue', block: 'violet', shuffle: 'teal' };

function ChannelCard({ ch, onClick }: { ch: TunarrChannel; onClick: () => void }) {
  return (
    <Card
      p="sm"
      style={{ cursor: 'pointer', transition: 'border-color 120ms' }}
      onClick={onClick}
      styles={{ root: { '&:hover': { borderColor: 'var(--mantine-color-orange-5)' } } }}
    >
      <Group gap="sm" wrap="nowrap">
        <Badge
          size="lg"
          variant="filled"
          color="dark"
          radius="sm"
          style={{ minWidth: 48, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
        >
          {ch.number}
        </Badge>
        <Text size="sm" fw={600} truncate style={{ flex: 1 }}>{ch.name}</Text>
      </Group>
    </Card>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [status, setStatus] = useState<{ tunarr: ConnStatus; plex: ConnStatus } | null>(null);
  const [channels, setChannels] = useState<TunarrChannel[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [s, ch, cs] = await Promise.all([
        api.getStatus(),
        api.getTunarrChannels(),
        api.getConfigStatus(),
      ]);
      setStatus(s);
      setChannels([...ch].sort((a, b) => a.number - b.number));
      setConfigured(cs.configured);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <Stack align="center" justify="center" h={400}><Loader color="orange" /></Stack>;
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>Dashboard</Title>
        <ActionIcon variant="subtle" onClick={() => load(true)} loading={refreshing} color="gray">
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      {!configured && (
        <Alert
          color="orange"
          variant="light"
          icon={<IconSettings size={18} />}
          title="Setup required"
        >
          Tunarr URL, Plex URL, and Plex Token aren't configured yet.{' '}
          <Button
            variant="subtle"
            color="orange"
            size="compact-sm"
            onClick={() => nav('/settings')}
            style={{ verticalAlign: 'baseline' }}
          >
            Go to Settings →
          </Button>
        </Alert>
      )}

      {/* Connections */}
      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: '0.08em' }}>
          Connections
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <ConnectionCard label="Tunarr" status={status?.tunarr} />
          <ConnectionCard label="Plex"   status={status?.plex} />
        </SimpleGrid>
      </Box>

      {/* Channel grid */}
      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: '0.08em' }}>
          Live Channels ({channels.length})
        </Text>

        {channels.length === 0 ? (
          <Card p="xl">
            <Stack align="center" gap="md">
              <ThemeIcon size={52} variant="light" color="orange" radius="xl">
                <IconBroadcast size={30} />
              </ThemeIcon>
              <Stack align="center" gap={4}>
                <Text fw={600}>No channels in Tunarr yet</Text>
                <Text size="sm" c="dimmed">Run the pipeline to build your first channels</Text>
              </Stack>
              <Button leftSection={<IconPlayerPlay size={16} />} color="orange" onClick={() => nav('/run')}>
                Run Pipeline
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
            {channels.map((ch) => (
              <ChannelCard key={ch.number} ch={ch} onClick={() => nav(`/channels/${ch.number}`)} />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
