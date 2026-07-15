import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../contexts/ProfileContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';
import { CROPS, INCOME_SOURCES, GENDERS } from '@/data';

export default function EditProfileScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useProfile();
  const { t } = useTranslation();

  const [nameBn, setNameBn] = useState(profile.nameBn);
  const [nameEn, setNameEn] = useState(profile.nameEn);
  const [nid, setNid] = useState(profile.nid);
  const [phone, setPhone] = useState(profile.phone);
  const [dob, setDob] = useState(profile.dob);
  const [gender, setGender] = useState(profile.gender);
  const [totalLand, setTotalLand] = useState(String(profile.totalLand));
  const [ownLand, setOwnLand] = useState(String(profile.ownLand));
  const [leasedLand, setLeasedLand] = useState(String(profile.leasedLand));
  const [selectedCrops, setSelectedCrops] = useState<string[]>(profile.selectedCrops);
  const [location, setLocation] = useState(profile.location);
  const [farmingIncome, setFarmingIncome] = useState(String(profile.farmingIncome));
  const [selectedSources, setSelectedSources] = useState<string[]>(profile.otherSources);
  const [otherIncome, setOtherIncome] = useState(String(profile.otherIncome));
  const [familyMembers, setFamilyMembers] = useState(String(profile.familyMembers));
  const [occupation, setOccupation] = useState(profile.occupation);
  const [hasLoan, setHasLoan] = useState(profile.hasLoan);
  const [loanAmount, setLoanAmount] = useState(profile.hasLoan ? String(profile.loanAmount) : '');
  const [loanPurpose, setLoanPurpose] = useState(profile.hasLoan ? profile.loanPurpose : '');
  const [loanSource, setLoanSource] = useState(profile.hasLoan ? profile.loanSource : '');

  const toggleCrop = (crop: string) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleSave = () => {
    updateProfile({
      nameBn,
      nameEn,
      nid,
      phone,
      dob,
      gender,
      totalLand: Number(totalLand) || 0,
      ownLand: Number(ownLand) || 0,
      leasedLand: Number(leasedLand) || 0,
      selectedCrops,
      location,
      farmingIncome: Number(farmingIncome) || 0,
      otherSources: selectedSources,
      otherIncome: Number(otherIncome) || 0,
      familyMembers: Number(familyMembers) || 0,
      occupation,
      hasLoan,
      loanAmount: hasLoan ? Number(loanAmount) || 0 : 0,
      loanPurpose: hasLoan ? loanPurpose : '',
      loanSource: hasLoan ? loanSource : '',
    });
    Alert.alert(t('saved'), t('profileSaved'), [
      { text: t('ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.dashboard.border }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.dashboard.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.headerLogo, { backgroundColor: colors.deepGreen }]}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: colors.dashboard.textPrimary }]}>{t('editProfile')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('personalInfoSection')}</Text>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nameBnLabel')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameBn}
          onChangeText={setNameBn}
          placeholder={t('nameBnPlaceholder')}
          placeholderTextColor={colors.dashboard.textSecondary}
        />

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nameEnLabel')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameEn}
          onChangeText={setNameEn}
          placeholder={t('nameEnPlaceholder')}
          placeholderTextColor={colors.dashboard.textSecondary}
        />

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nidLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={nid}
            onChangeText={setNid}
            keyboardType="number-pad"
            placeholder={t('nidPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('phoneLabel2')}</Text>
        <View style={styles.phoneContainer}>
          <View style={[styles.countryCode, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Text style={[styles.countryCodeText, { color: colors.dashboard.textPrimary }]}>+880</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border, color: colors.dashboard.textPrimary }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('phonePlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('dobLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={dob}
            onChangeText={setDob}
            placeholder={t('dobPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('genderLabel')}</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.genderBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, gender === item && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => setGender(item)}
            >
              <Text style={[styles.genderText, { color: colors.dashboard.textSecondary }, gender === item && { color: colors.deepGreen, fontWeight: '700' }]}>
                {gender === item ? '✓ ' : ''}{item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('landCropsSection')}</Text>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('totalLandLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="map-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={totalLand}
            onChangeText={setTotalLand}
            keyboardType="decimal-pad"
            placeholder={t('totalLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('ownLandLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="home-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={ownLand}
            onChangeText={setOwnLand}
            keyboardType="decimal-pad"
            placeholder={t('ownLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('leasedLandLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="document-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={leasedLand}
            onChangeText={setLeasedLand}
            keyboardType="decimal-pad"
            placeholder={t('leasedLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('mainCropsLabel')}</Text>
        <View style={styles.chipContainer}>
          {CROPS.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[styles.chip, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, selectedCrops.includes(crop) && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => toggleCrop(crop)}
            >
              <Text style={[styles.chipText, { color: colors.dashboard.textSecondary }, selectedCrops.includes(crop) && { color: colors.deepGreen, fontWeight: '700' }]}>
                {selectedCrops.includes(crop) ? '✓ ' : ''}{crop}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('locationLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="location-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={location}
            onChangeText={setLocation}
            placeholder={t('locationPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('incomeSection')}</Text>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('annualFarmingLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="cash-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={farmingIncome}
            onChangeText={setFarmingIncome}
            keyboardType="decimal-pad"
            placeholder={t('annualFarmingPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('otherSourcesLabel')}</Text>
        <View style={styles.chipContainer}>
          {INCOME_SOURCES.map((source) => (
            <TouchableOpacity
              key={source}
              style={[styles.chip, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, selectedSources.includes(source) && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
              onPress={() => toggleSource(source)}
            >
              <Text style={[styles.chipText, { color: colors.dashboard.textSecondary }, selectedSources.includes(source) && { color: colors.deepGreen, fontWeight: '700' }]}>
                {selectedSources.includes(source) ? '✓ ' : ''}{source}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('otherIncomeLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="wallet-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={otherIncome}
            onChangeText={setOtherIncome}
            keyboardType="decimal-pad"
            placeholder={t('otherIncomePlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('familyLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="people-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={familyMembers}
            onChangeText={setFamilyMembers}
            keyboardType="number-pad"
            placeholder={t('familyPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('occupationLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
          <Ionicons name="briefcase-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={occupation}
            onChangeText={setOccupation}
            placeholder={t('occupationPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('loanInfoSection')}</Text>

        <View style={styles.radioRow}>
          <TouchableOpacity
            style={[styles.radioBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, hasLoan === true && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
            onPress={() => setHasLoan(true)}
          >
            <Ionicons
              name={hasLoan === true ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={hasLoan === true ? colors.deepGreen : colors.dashboard.textSecondary}
            />
            <Text style={[styles.radioText, { color: colors.dashboard.textSecondary }, hasLoan === true && { color: colors.deepGreen, fontWeight: '700' }]}>
              {t('yes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }, hasLoan === false && { borderColor: colors.deepGreen, borderWidth: 2, backgroundColor: colors.userVerified }]}
            onPress={() => setHasLoan(false)}
          >
            <Ionicons
              name={hasLoan === false ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={hasLoan === false ? colors.deepGreen : colors.dashboard.textSecondary}
            />
            <Text style={[styles.radioText, { color: colors.dashboard.textSecondary }, hasLoan === false && { color: colors.deepGreen, fontWeight: '700' }]}>
              {t('no')}
            </Text>
          </TouchableOpacity>
        </View>

        {hasLoan && (
          <>
            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('loanAmountLabel2')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <Ionicons name="trending-down-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType="decimal-pad"
                placeholder={t('loanAmountPlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('purposeLabel')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <Ionicons name="flag-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
                placeholder={t('purposePlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('sourceLabel')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
              <Ionicons name="business-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanSource}
                onChangeText={setLoanSource}
                placeholder={t('sourcePlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.deepGreen }]} onPress={handleSave} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={[styles.cancelBtnText, { color: colors.dashboard.textSecondary }]}>{t('cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerRight: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 15,
  },
  inputIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  iconInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  phoneContainer: {
    flexDirection: 'row',
  },
  countryCode: {
    width: 70,
    height: 54,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  countryCodeText: {
    fontWeight: '700',
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 8,
  },
  radioText: {
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
