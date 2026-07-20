import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Box, Text } from '../theme/primitives';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  OfflineState,
  AccessDeniedState,
} from '../components/States';

export default function ComponentGalleryScreen() {
  const [selectedState, setSelectedState] = useState<'none' | 'loading' | 'empty' | 'error' | 'offline' | 'denied'>('none');

  if (selectedState === 'loading') {
    return (
      <Box flex={1} bg="backgroundPrimary">
        <LoadingState />
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedState('none')}>
          <Text variant="button">Back to Gallery</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  if (selectedState === 'empty') {
    return (
      <Box flex={1} bg="backgroundPrimary">
        <EmptyState message="No operational tasks registered for today." />
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedState('none')}>
          <Text variant="button">Back to Gallery</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  if (selectedState === 'error') {
    return (
      <Box flex={1} bg="backgroundPrimary">
        <ErrorState message="Could not resolve connection to Firestore Emulators." />
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedState('none')}>
          <Text variant="button">Back to Gallery</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  if (selectedState === 'offline') {
    return (
      <Box flex={1} bg="backgroundPrimary">
        <OfflineState />
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedState('none')}>
          <Text variant="button">Back to Gallery</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  if (selectedState === 'denied') {
    return (
      <Box flex={1} bg="backgroundPrimary">
        <AccessDeniedState message="You are not authorized to view Voyage #456." />
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedState('none')}>
          <Text variant="button">Back to Gallery</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0B0F19' }}>
      <Box p="m" bg="backgroundPrimary" flex={1}>
        <Text variant="header" mb="s">UI Gallery</Text>
        <Text variant="muted" mb="l">Tuamotu Premium Visual Tokens & Primitives</Text>

        {/* Semantic Design Colors Tokens List */}
        <Box mb="l">
          <Text variant="subheader" mb="m">Semantic Color Tokens</Text>
          <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
            <Box width="48%" bg="backgroundCard" p="m" borderRadius={8} mb="m" borderWidth={1} borderColor="border">
              <Box height={40} bg="interactivePrimary" borderRadius={4} mb="s" />
              <Text variant="body" fontWeight="bold">Teal Accent</Text>
              <Text variant="muted">#708C84</Text>
            </Box>
            <Box width="48%" bg="backgroundCard" p="m" borderRadius={8} mb="m" borderWidth={1} borderColor="border">
              <Box height={40} bg="success" borderRadius={4} mb="s" />
              <Text variant="body" fontWeight="bold">Success</Text>
              <Text variant="muted">#10B981</Text>
            </Box>
            <Box width="48%" bg="backgroundCard" p="m" borderRadius={8} mb="m" borderWidth={1} borderColor="border">
              <Box height={40} bg="error" borderRadius={4} mb="s" />
              <Text variant="body" fontWeight="bold">Error</Text>
              <Text variant="muted">#EF4444</Text>
            </Box>
            <Box width="48%" bg="backgroundCard" p="m" borderRadius={8} mb="m" borderWidth={1} borderColor="border">
              <Box height={40} bg="backgroundPrimary" borderRadius={4} mb="s" borderWidth={1} borderColor="border" />
              <Text variant="body" fontWeight="bold">Obsidian Base</Text>
              <Text variant="muted">#0B0F19</Text>
            </Box>
          </Box>
        </Box>

        {/* View States Interactive Gating */}
        <Box mb="l">
          <Text variant="subheader" mb="m">Interactive View States</Text>
          <Box gap="s">
            <TouchableOpacity style={styles.button} onPress={() => setSelectedState('loading')}>
              <Text variant="button">Trigger LoadingState</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setSelectedState('empty')}>
              <Text variant="button">Trigger EmptyState</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setSelectedState('error')}>
              <Text variant="button">Trigger ErrorState</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setSelectedState('offline')}>
              <Text variant="button">Trigger OfflineState</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setSelectedState('denied')}>
              <Text variant="button">Trigger AccessDeniedState</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#161F30',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#708C84',
    marginBottom: 8,
  },
  backButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#708C84',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});
