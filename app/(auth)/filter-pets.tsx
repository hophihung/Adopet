/**
 * FilterPetScreen
 * Màn hình filter sở thích về pet (chỉ để vui, không lưu vào database)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const PET_TYPES = [
  { label: 'Dog', value: 'dog', emoji: '🐕' },
  { label: 'Cat', value: 'cat', emoji: '🐈' },
  { label: 'Hamster', value: 'hamster', emoji: '🐹' },
  { label: 'Bird', value: 'bird', emoji: '🦜' },
  { label: 'Rabbit', value: 'rabbit', emoji: '🐰' },
  { label: 'Other', value: 'other', emoji: '🐾' },
];

const AGE_RANGES = [
  { label: 'Puppy/Kitten (0-12 months)', value: '0-12' },
  { label: 'Young (1-3 years)', value: '1-3' },
  { label: 'Adult (3-7 years)', value: '3-7' },
  { label: 'Senior (7+ years)', value: '7+' },
];

const REGIONS = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Can Tho',
  'Hai Phong',
  'Nha Trang',
  'Other',
];

export default function FilterPetScreen() {
  const { completeOnboarding } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((item) => item !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const handleContinue = async () => {
    // Đánh dấu đã hoàn thành onboarding
    await completeOnboarding();
    // Navigate tới main screen
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    // Đánh dấu đã hoàn thành onboarding
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={['#FFE5B4', '#FFDAB9', '#FFB6C1']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🔍</Text>
            <Text variant="headlineMedium" style={styles.title}>
              Find Your Perfect Match
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Tell us what kind of pet you're looking for
            </Text>
          </View>

        {/* Pet Types */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Pet Type
          </Text>
          <View style={styles.chipContainer}>
            {PET_TYPES.map((type) => (
              <Chip
                key={type.value}
                selected={selectedTypes.includes(type.value)}
                onPress={() => toggleSelection(type.value, selectedTypes, setSelectedTypes)}
                style={styles.chip}
              >
                {type.emoji} {type.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Age Preference
          </Text>
          <View style={styles.chipContainer}>
            {AGE_RANGES.map((age) => (
              <Chip
                key={age.value}
                selected={selectedAges.includes(age.value)}
                onPress={() => toggleSelection(age.value, selectedAges, setSelectedAges)}
                style={styles.chip}
              >
                {age.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Preferred Location
          </Text>
          <View style={styles.chipContainer}>
            {REGIONS.map((region) => (
              <Chip
                key={region}
                selected={selectedRegions.includes(region)}
                onPress={() => toggleSelection(region, selectedRegions, setSelectedRegions)}
                style={styles.chip}
              >
                {region}
              </Chip>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Button mode="contained" onPress={handleContinue} style={styles.button}>
            Continue
          </Button>
          <Button mode="text" onPress={handleSkip} style={styles.skipButton}>
            Skip for now
          </Button>
        </View>
      </View>
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B4513',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    fontSize: 18,
    color: '#8B4513',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  buttons: {
    marginTop: 32,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#FF69B4',
  },
  skipButton: {
    marginTop: 12,
  },
});
