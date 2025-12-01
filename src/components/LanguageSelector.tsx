import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { I18n, Language } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LanguageSelectorProps {
  onLanguageChange?: (language: Language) => void;
}

const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

export function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(I18n.getLanguage());

  useEffect(() => {
    loadUserLanguage();
  }, [user]);

  const loadUserLanguage = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('preferred_language')
        .eq('user_id', user.id)
        .single();

      if (data?.preferred_language) {
        const lang = data.preferred_language as Language;
        setSelectedLanguage(lang);
        I18n.setLanguage(lang);
      }
    } catch (error) {
      console.error('Error loading user language:', error);
    }
  };

  const handleSelectLanguage = async (language: Language) => {
    setSelectedLanguage(language);
    I18n.setLanguage(language);

    // Save to database
    if (user?.id) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_language: language,
            updated_at: new Date().toISOString(),
          });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }

    onLanguageChange?.(language);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Globe size={20} color={colors.primary} />
        <Text style={styles.title}>Ngôn ngữ</Text>
      </View>
      <ScrollView style={styles.languagesList} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                isSelected && styles.languageItemSelected,
              ]}
              onPress={() => handleSelectLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={styles.languageCode}>{lang.name}</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkIcon}>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  languagesList: {
    maxHeight: 200,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  languageItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  languageNameSelected: {
    color: colors.primary,
  },
  languageCode: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkIcon: {
    marginLeft: 12,
  },
});

