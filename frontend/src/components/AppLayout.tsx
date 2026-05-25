import { AppShell, Box, Divider, Group, NavLink, Text } from '@mantine/core';
import { version } from '../../package.json';
import {
  IconBroadcast,
  IconFileText,
  IconLayoutDashboard,
  IconList,
  IconPlayerPlay,
  IconSettings,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { label: 'Dashboard', icon: IconLayoutDashboard, path: '/dashboard' },
  { label: 'Run',       icon: IconPlayerPlay,      path: '/run' },
  { label: 'Channels',  icon: IconList,            path: '/channels' },
  { label: 'Settings',  icon: IconSettings,        path: '/settings' },
  { label: 'Logs',      icon: IconFileText,        path: '/logs' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  return (
    <AppShell navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="xs">
        {/* Logo */}
        <Box px="sm" py="md">
          <Group gap="xs">
            <IconBroadcast size={26} color="var(--mantine-color-orange-5)" />
            <Text size="lg" fw={800} c="orange.5" style={{ letterSpacing: '-0.5px' }}>
              Programmarr
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={2} ml={34}>Channel factory</Text>
        </Box>

        <Divider mb="xs" />

        {NAV.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={item.path}
            label={item.label}
            leftSection={<item.icon size={17} stroke={1.5} />}
            active={loc.pathname.startsWith(item.path)}
            styles={{ root: { borderRadius: 'var(--mantine-radius-sm)', marginBottom: 2 } }}
          />
        ))}

        <Box mt="auto" px="sm" pb="sm">
          <Text size="xs" c="dimmed">v{version}</Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
