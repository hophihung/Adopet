import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../src/features/profile/context/ProfileContext';
import { nearbyPetsService } from '../../../src/services/nearby-pets.service';
import { colors } from '@/src/theme/colors';
import { LanguageSelector } from '@/src/components/LanguageSelector';
import { CurrencySelector } from '@/src/components/CurrencySelector';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [searchRadius, setSearchRadius] = useState(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.search_radius_km) {
      setSearchRadius(profile.search_radius_km);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      await updateProfile({ search_radius_km: searchRadius });
      await refreshProfile();
      
      Alert.alert(
        'Thành công',
        `Đã cập nhật phạm vi tìm kiếm thành ${Math.round(searchRadius)}km. Ứng dụng sẽ tự động tìm người trong phạm vi này.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving search radius:', error);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Language Section */}
        <View style={styles.section}>
          <LanguageSelector />
        </View>

        {/* Currency Section */}
        <View style={styles.section}>
          <CurrencySelector />
        </View>

        {/* Search Radius Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Phạm vi tìm kiếm</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Đặt phạm vi tìm kiếm để hiển thị card pet của những người trong phạm vi này. Bạn có thể giao dịch với những người trong phạm vi mong muốn.
          </Text>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Khoảng cách</Text>
              <Text style={styles.sliderValue}>{Math.round(searchRadius)} km</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={500}
              value={searchRadius}
              onValueChange={setSearchRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              step={1}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderMinMax}>1 km</Text>
              <Text style={styles.sliderMinMax}>500 km</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Mẹo: Phạm vi nhỏ hơn sẽ tìm thấy người gần bạn hơn, phạm vi lớn hơn sẽ tìm thấy nhiều người hơn.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu cài đặt</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderMinMax: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  infoBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D0E7FF',
  },
  infoText: {
    fontSize: 14,
    color: '#0066CC',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

