import {
  Alert, Box, Button, Card, Center, Divider, Group,
  PasswordInput, Stack, Stepper, Text, TextInput, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBroadcast, IconCheck, IconLock, IconPlugConnected, IconArrowRight,
} from '@tabler/icons-react';
import { useState } from 'react';
import { api } from '../api/client';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — Security
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 1 — Connections
  const [tunarrUrl, setTunarrUrl] = useState('http://');
  const [plexUrl, setPlexUrl] = useState('http://');
  const [plexToken, setPlexToken] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');

  const passwordMismatch = password !== passwordConfirm && passwordConfirm !== '';

  async function saveAndFinish() {
    setSaving(true);
    try {
      const config: Record<string, string> = {
        tunarr_url: tunarrUrl.trim(),
        plex_url: plexUrl.trim(),
        plex_token: plexToken.trim(),
      };
      if (tmdbKey.trim()) config.tmdb_api_key = tmdbKey.trim();
      if (username.trim() && password) {
        config.auth_username = username.trim();
        config.auth_password = password;
      }
      await api.saveConfig(config);
      notifications.show({
        title: 'Setup complete',
        message: 'Welcome to Programmarr!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onComplete();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Center style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-dark-8)' }}>
      <Box style={{ width: '100%', maxWidth: 520 }} p="xl">
        {/* Logo */}
        <Stack align="center" mb="xl" gap="xs">
          <IconBroadcast size={48} color="var(--mantine-color-orange-5)" />
          <Title order={1} c="orange.5" style={{ letterSpacing: '-1px' }}>Programmarr</Title>
          <Text c="dimmed" size="sm">Let's get you set up</Text>
        </Stack>

        <Card p="xl">
          <Stepper active={step} color="orange" mb="xl" size="sm">
            <Stepper.Step label="Security" icon={<IconLock size={16} />} />
            <Stepper.Step label="Connect" icon={<IconPlugConnected size={16} />} />
          </Stepper>

          {step === 0 && (
            <Stack gap="md">
              <Box>
                <Text fw={700} mb={4}>Create login credentials</Text>
                <Text size="sm" c="dimmed">
                  Protects the UI with HTTP Basic Auth. Skip this if you're on a trusted home network.
                </Text>
              </Box>

              <TextInput
                label="Username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                autoComplete="username"
              />
              <PasswordInput
                label="Password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                autoComplete="new-password"
                error={passwordMismatch ? 'Passwords do not match' : undefined}
              />
              <PasswordInput
                label="Confirm password"
                placeholder="Repeat password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
                autoComplete="new-password"
                error={passwordMismatch ? ' ' : undefined}
              />

              <Divider />

              <Group justify="space-between">
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => setStep(1)}
                >
                  Skip — no auth
                </Button>
                <Button
                  color="orange"
                  rightSection={<IconArrowRight size={16} />}
                  disabled={!!username && (!password || passwordMismatch)}
                  onClick={() => setStep(1)}
                >
                  Next
                </Button>
              </Group>
            </Stack>
          )}

          {step === 1 && (
            <Stack gap="md">
              <Box>
                <Text fw={700} mb={4}>Connect your services</Text>
                <Text size="sm" c="dimmed">
                  Tunarr and Plex must be running and reachable on your network.
                </Text>
              </Box>

              <TextInput
                label="Tunarr URL"
                placeholder="http://192.168.1.10:8000"
                value={tunarrUrl}
                onChange={(e) => setTunarrUrl(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Plex URL"
                placeholder="http://192.168.1.10:32400"
                value={plexUrl}
                onChange={(e) => setPlexUrl(e.currentTarget.value)}
                required
              />
              <PasswordInput
                label="Plex Token"
                description={
                  <Text size="xs" c="dimmed">
                    Find yours at{' '}
                    <Text
                      component="a"
                      href="https://www.plexopedia.com/plex-media-server/general/plex-token/"
                      target="_blank"
                      size="xs"
                      c="orange.4"
                    >
                      plexopedia.com
                    </Text>
                  </Text>
                }
                placeholder="Your Plex token"
                value={plexToken}
                onChange={(e) => setPlexToken(e.currentTarget.value)}
                required
              />
              <PasswordInput
                label="TMDB API Key"
                description="Optional — for channel logo images. Free key at themoviedb.org"
                placeholder="Leave blank to skip"
                value={tmdbKey}
                onChange={(e) => setTmdbKey(e.currentTarget.value)}
              />

              <Divider />

              <Group justify="space-between">
                <Button variant="subtle" color="gray" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  color="orange"
                  leftSection={<IconCheck size={16} />}
                  disabled={!tunarrUrl.trim() || !plexUrl.trim() || !plexToken.trim()}
                  loading={saving}
                  onClick={saveAndFinish}
                >
                  Finish Setup
                </Button>
              </Group>
            </Stack>
          )}
        </Card>
      </Box>
    </Center>
  );
}
