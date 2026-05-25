import {
  ActionIcon, Badge, Box, Button, Card, Divider, Group,
  Loader, Modal, Select, Stack, Text, TextInput, Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCheck, IconEdit, IconPlus, IconTag, IconTrash, IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Channel } from '../api/client';

const SHUFFLE_COLOR: Record<string, string> = { ordered: 'blue', block: 'violet', shuffle: 'teal' };
const SHUFFLE_OPTIONS = [
  { value: 'shuffle',  label: 'Shuffle — random order' },
  { value: 'ordered',  label: 'Ordered — sequential' },
  { value: 'block',    label: 'Block — grouped by show' },
];

// ── Channel editor modal ───────────────────────────────────────────────────────

function ChannelModal({
  channel,
  opened,
  onClose,
  onSaved,
}: {
  channel: Channel | null;
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [shuffle, setShuffle] = useState<string>('shuffle');
  const [content, setContent] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setNumber(String(channel.number));
      setShuffle(channel.shuffle || 'shuffle');
      setContent(
        channel.content.map((c) =>
          typeof c === 'string' ? c : `{collection: ${(c as any).collection}}`
        )
      );
    }
  }, [channel]);

  function addItem() {
    if (!newItem.trim()) return;
    setContent((c) => [...c, newItem.trim()]);
    setNewItem('');
  }

  function removeItem(i: number) {
    setContent((c) => c.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!channel) return;
    setSaving(true);
    try {
      const rawContent = content.map((c) => {
        const m = c.match(/^\{collection:\s*(.+)\}$/);
        return m ? { collection: m[1] } : c;
      });
      await api.updateChannel(channel.number, {
        number: Number(number),
        name,
        shuffle,
        content: rawContent,
      });
      notifications.show({ message: 'Channel saved', color: 'green', icon: <IconCheck size={14} /> });
      onSaved();
      onClose();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700}>Edit Channel #{channel?.number}</Text>}
      size="lg"
    >
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="Channel number"
            value={number}
            onChange={(e) => setNumber(e.currentTarget.value)}
          />
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </Group>

        <Select
          label="Shuffle mode"
          data={SHUFFLE_OPTIONS}
          value={shuffle}
          onChange={(v) => setShuffle(v || 'shuffle')}
        />

        <Divider label="Content" labelPosition="left" />

        <Stack gap={4}>
          {content.map((item, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <Text size="sm" style={{ flex: 1, fontFamily: 'ui-monospace, monospace' }} truncate>
                {item}
              </Text>
              <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeItem(i)}>
                <IconX size={14} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>

        <Group gap="xs">
          <TextInput
            placeholder="Add title or {collection: Name}"
            value={newItem}
            onChange={(e) => setNewItem(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            style={{ flex: 1 }}
            size="sm"
          />
          <Button size="sm" variant="light" color="orange" onClick={addItem} leftSection={<IconPlus size={14} />}>
            Add
          </Button>
        </Group>

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Cancel</Button>
          <Button color="orange" onClick={save} loading={saving}>Save Channel</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Channel row ────────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  onEdit,
  onDelete,
}: {
  channel: Channel;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function del() {
    if (!confirm(`Delete channel #${channel.number} "${channel.name}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteChannel(channel.number);
      onDelete();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
      setDeleting(false);
    }
  }

  return (
    <Card p="sm" mb="xs">
      <Group gap="sm" wrap="nowrap">
        <Badge
          size="lg"
          variant="filled"
          color="dark"
          radius="sm"
          style={{ minWidth: 52, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
        >
          {channel.number}
        </Badge>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>{channel.name}</Text>
          <Group gap={4} mt={2}>
            <Badge size="xs" color={SHUFFLE_COLOR[channel.shuffle] || 'gray'} variant="light">
              {channel.shuffle}
            </Badge>
            <Badge size="xs" color="dark" variant="light" leftSection={<IconTag size={10} />}>
              {channel.content.length} item{channel.content.length !== 1 ? 's' : ''}
            </Badge>
          </Group>
        </Box>

        <Group gap={4} style={{ flexShrink: 0 }}>
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" color="gray" onClick={onEdit}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={del} loading={deleting}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function Channels() {
  const { number } = useParams<{ number?: string }>();
  const nav = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  async function load() {
    const data = await api.getChannels();
    const sorted = [...data.channels].sort((a, b) => a.number - b.number);
    setChannels(sorted);
    setLoading(false);

    // Deep-link: if URL has a channel number, open that channel for editing
    if (number) {
      const ch = sorted.find((c) => c.number === Number(number));
      if (ch) { setEditing(ch); open(); }
    }
  }

  useEffect(() => { load(); }, []);

  function edit(ch: Channel) {
    setEditing(ch);
    nav(`/channels/${ch.number}`, { replace: true });
    open();
  }

  function handleClose() {
    close();
    nav('/channels', { replace: true });
  }

  if (loading) {
    return <Stack align="center" justify="center" h={400}><Loader color="orange" /></Stack>;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Channels ({channels.length})</Title>
      </Group>

      {channels.length === 0 ? (
        <Card p="xl">
          <Stack align="center" gap="xs">
            <Text c="dimmed">No channels.json found — run the pipeline first</Text>
          </Stack>
        </Card>
      ) : (
        <Box>
          {channels.map((ch) => (
            <ChannelRow
              key={ch.number}
              channel={ch}
              onEdit={() => edit(ch)}
              onDelete={() => load()}
            />
          ))}
        </Box>
      )}

      <ChannelModal
        channel={editing}
        opened={opened}
        onClose={handleClose}
        onSaved={load}
      />
    </Stack>
  );
}
