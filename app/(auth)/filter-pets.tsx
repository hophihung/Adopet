/**
 * FilterPetScreen
 * Màn hình filter sở thích về pet (chỉ để vui, không lưu vào database)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Chip } from 'react-native-paper';
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

  const handleContinue = () => {
    // Không lưu vào database, chỉ navigate tới main screen
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            What are you looking for? 🔍
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Help us personalize your experience
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
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
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 6,
  },
  skipButton: {
    marginTop: 12,
  },
});
