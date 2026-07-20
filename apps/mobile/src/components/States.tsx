import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text } from '../theme/primitives';
import { AlertCircle, WifiOff, ShieldAlert, Inbox } from 'lucide-react-native';

export const LoadingState: React.FC = () => {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" bg="backgroundPrimary" p="m">
      <ActivityIndicator size="large" color="#708C84" />
      <Text variant="muted" mt="s">Loading secure context...</Text>
    </Box>
  );
};

export const EmptyState: React.FC<{ message?: string }> = ({ message = 'No items found.' }) => {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" bg="backgroundPrimary" p="m">
      <Inbox size={48} color="#94A3B8" />
      <Text variant="muted" mt="m" textAlign="center">{message}</Text>
    </Box>
  );
};

export const ErrorState: React.FC<{ message?: string }> = ({ message = 'An unexpected error occurred.' }) => {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" bg="backgroundPrimary" p="m">
      <AlertCircle size={48} color="#EF4444" />
      <Text variant="body" mt="m" color="error" textAlign="center">Error</Text>
      <Text variant="muted" mt="s" textAlign="center">{message}</Text>
    </Box>
  );
};

export const OfflineState: React.FC = () => {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" bg="backgroundPrimary" p="m">
      <WifiOff size={48} color="#94A3B8" />
      <Text variant="body" mt="m" textAlign="center">You are Offline</Text>
      <Text variant="muted" mt="s" textAlign="center">Please check your internet connection.</Text>
    </Box>
  );
};

export const AccessDeniedState: React.FC<{ message?: string }> = ({ message = 'Access to this context is denied.' }) => {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" bg="backgroundPrimary" p="m">
      <ShieldAlert size={48} color="#EF4444" />
      <Text variant="subheader" mt="m" color="error" textAlign="center">Access Denied</Text>
      <Text variant="muted" mt="s" textAlign="center">{message}</Text>
    </Box>
  );
};
