import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../contexts/ProfileContext';
import { useTranslation } from '../../../hooks/use-translation';
import { useColors } from '../../../features/officials/shared/constants/theme';
import { CROPS, INCOME_SOURCES, GENDERS } from '@/data';
import {
  isBdPhone,
  isFarmerNid,
  isNonNegativeNumber,
  isPlausibleDob,
  isPositiveInteger,
  parseAmount,
  MAX_FAMILY_MEMBERS,
  MAX_LAND_ACRES,
  MAX_LOAN_AMOUNT,
} from '../../../lib/validation';

type FormErrors = Partial<Record<
  | 'nameBn' | 'nameEn' | 'nid' | 'phone' | 'dob'
  | 'totalLand' | 'ownLand' | 'leasedLand' | 'location'
  | 'farmingIncome' | 'otherIncome' | 'familyMembers' | 'occupation'
  | 'loanAmount' | 'loanPurpose' | 'loanSource',
  string
>>;

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
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (key: keyof FormErrors) => setErrors((p) => ({ ...p, [key]: undefined }));

  // The profile is fetched asynchronously, so it may still be empty when this
  // screen first mounts. Re-seed the form fields whenever the profile changes
  // so the inputs reflect the loaded values instead of blanks.
  useEffect(() => {
    setNameBn(profile.nameBn);
    setNameEn(profile.nameEn);
    setNid(profile.nid);
    setPhone(profile.phone);
    setDob(profile.dob);
    setGender(profile.gender);
    setTotalLand(String(profile.totalLand));
    setOwnLand(String(profile.ownLand));
    setLeasedLand(String(profile.leasedLand));
    setSelectedCrops(profile.selectedCrops);
    setLocation(profile.location);
    setFarmingIncome(String(profile.farmingIncome));
    setSelectedSources(profile.otherSources);
    setOtherIncome(String(profile.otherIncome));
    setFamilyMembers(String(profile.familyMembers));
    setOccupation(profile.occupation);
    setHasLoan(profile.hasLoan);
    setLoanAmount(profile.hasLoan ? String(profile.loanAmount) : '');
    setLoanPurpose(profile.hasLoan ? profile.loanPurpose : '');
    setLoanSource(profile.hasLoan ? profile.loanSource : '');
  }, [profile]);

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

  const validate = (): boolean => {
    const e: FormErrors = {};

    if (!nameBn.trim()) e.nameBn = t('errNameBnRequired');
    if (!nameEn.trim()) e.nameEn = t('errNameEnRequired');
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(nameEn.trim())) e.nameEn = t('errNameEnLetters');

    if (!nid.trim()) e.nid = t('errNidRequired');
    else if (!isFarmerNid(nid)) e.nid = t('errNidFormat');

    if (!phone.trim()) e.phone = t('errPhoneRequired');
    else if (!isBdPhone(phone)) e.phone = t('errPhoneFormat');

    if (dob.trim() && !isPlausibleDob(dob)) e.dob = t('errDobFormat');

    if (!location.trim()) e.location = t('errLocationRequired');

    if (totalLand.trim() && !isNonNegativeNumber(totalLand)) e.totalLand = t('errTotalLandValid');
    if (ownLand.trim() && !isNonNegativeNumber(ownLand)) e.ownLand = t('errOwnLandValid');
    if (leasedLand.trim() && !isNonNegativeNumber(leasedLand)) e.leasedLand = t('errLeasedLandValid');
    const totalN = parseAmount(totalLand) || 0;
    const ownN = parseAmount(ownLand) || 0;
    const leasedN = parseAmount(leasedLand) || 0;
    if (!e.totalLand && totalN > MAX_LAND_ACRES) e.totalLand = t('errLandTooLarge');
    if (!e.ownLand && !e.leasedLand && !e.totalLand && totalN > 0 && ownN + leasedN > totalN) {
      e.ownLand = t('errLandBreakdown');
    }

    if (farmingIncome.trim() && !isNonNegativeNumber(farmingIncome)) e.farmingIncome = t('errFarmingIncomeValid');
    if (otherIncome.trim() && !isNonNegativeNumber(otherIncome)) e.otherIncome = t('errOtherIncomeValid');

    if (familyMembers.trim()) {
      if (!isPositiveInteger(familyMembers)) e.familyMembers = t('errFamilyValid');
      else if (Number(familyMembers) > MAX_FAMILY_MEMBERS) e.familyMembers = t('errFamilyRange');
    }

    if (occupation.trim() && occupation.trim().length < 2) e.occupation = t('errOccupationShort');

    if (hasLoan) {
      if (!loanAmount.trim()) e.loanAmount = t('errLoanAmountRequired');
      else if (!isNonNegativeNumber(loanAmount) || parseAmount(loanAmount) <= 0) e.loanAmount = t('errLoanAmountValid');
      else if (parseAmount(loanAmount) > MAX_LOAN_AMOUNT) e.loanAmount = t('errLoanAmountRange');
      if (!loanPurpose.trim()) e.loanPurpose = t('errLoanPurposeRequired');
      if (!loanSource.trim()) e.loanSource = t('errLoanSourceRequired');
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;
    try {
      setIsSaving(true);
      await updateProfile({
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
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(t('profileSaved'));
        router.back();
      } else {
        Alert.alert(t('saved'), t('profileSaved'), [
          { text: t('ok'), onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to update profile';
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(t('error'), msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.dashboard.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.dashboard.cardBg, borderBottomColor: colors.dashboard.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.dashboard.border }]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')}>
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
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.nameBn ? colors.dashboard.redDown : colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameBn}
          onChangeText={(v) => { setNameBn(v); clearError('nameBn'); }}
          placeholder={t('nameBnPlaceholder')}
          placeholderTextColor={colors.dashboard.textSecondary}
        />
        {errors.nameBn && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nameBn}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nameEnLabel')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.nameEn ? colors.dashboard.redDown : colors.dashboard.border, color: colors.dashboard.textPrimary }]}
          value={nameEn}
          onChangeText={(v) => { setNameEn(v); clearError('nameEn'); }}
          placeholder={t('nameEnPlaceholder')}
          placeholderTextColor={colors.dashboard.textSecondary}
        />
        {errors.nameEn && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nameEn}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('nidLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.nid ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={nid}
            onChangeText={(v) => { setNid(v); clearError('nid'); }}
            keyboardType="number-pad"
            placeholder={t('nidPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.nid && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.nid}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('phoneLabel2')}</Text>
        <View style={styles.phoneContainer}>
          <View style={[styles.countryCode, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}>
            <Text style={[styles.countryCodeText, { color: colors.dashboard.textPrimary }]}>+880</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.phone ? colors.dashboard.redDown : colors.dashboard.border, color: colors.dashboard.textPrimary }]}
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            keyboardType="phone-pad"
            placeholder={t('phonePlaceholder2')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.phone && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.phone}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('dobLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.dob ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={dob}
            onChangeText={(v) => { setDob(v); clearError('dob'); }}
            placeholder={t('dobPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.dob && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.dob}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('genderLabel')}</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((item) => (
            <TouchableOpacity
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === item }}
              accessibilityLabel={item}
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
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.totalLand ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="map-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={totalLand}
            onChangeText={(v) => { setTotalLand(v); setErrors((p) => ({ ...p, totalLand: undefined, ownLand: undefined })); }}
            keyboardType="decimal-pad"
            placeholder={t('totalLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.totalLand && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.totalLand}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('ownLandLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.ownLand ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="home-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={ownLand}
            onChangeText={(v) => { setOwnLand(v); setErrors((p) => ({ ...p, ownLand: undefined })); }}
            keyboardType="decimal-pad"
            placeholder={t('ownLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.ownLand && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.ownLand}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('leasedLandLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.leasedLand ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="document-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={leasedLand}
            onChangeText={(v) => { setLeasedLand(v); setErrors((p) => ({ ...p, leasedLand: undefined, ownLand: undefined })); }}
            keyboardType="decimal-pad"
            placeholder={t('leasedLandPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.leasedLand && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.leasedLand}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('mainCropsLabel')}</Text>
        <View style={styles.chipContainer}>
          {CROPS.map((crop) => (
            <TouchableOpacity
              key={crop}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCrops.includes(crop) }}
              accessibilityLabel={crop}
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
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.location ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="location-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={location}
            onChangeText={(v) => { setLocation(v); clearError('location'); }}
            placeholder={t('locationPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.location && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.location}</Text>}

        <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('incomeSection')}</Text>

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('annualFarmingLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.farmingIncome ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="cash-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={farmingIncome}
            onChangeText={(v) => { setFarmingIncome(v); clearError('farmingIncome'); }}
            keyboardType="decimal-pad"
            placeholder={t('annualFarmingPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.farmingIncome && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.farmingIncome}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('otherSourcesLabel')}</Text>
        <View style={styles.chipContainer}>
          {INCOME_SOURCES.map((source) => (
            <TouchableOpacity
              key={source}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedSources.includes(source) }}
              accessibilityLabel={source}
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
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.otherIncome ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="wallet-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={otherIncome}
            onChangeText={(v) => { setOtherIncome(v); clearError('otherIncome'); }}
            keyboardType="decimal-pad"
            placeholder={t('otherIncomePlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.otherIncome && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.otherIncome}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('familyLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.familyMembers ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="people-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={familyMembers}
            onChangeText={(v) => { setFamilyMembers(v); clearError('familyMembers'); }}
            keyboardType="number-pad"
            placeholder={t('familyPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.familyMembers && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.familyMembers}</Text>}

        <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('occupationLabel')}</Text>
        <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.occupation ? colors.dashboard.redDown : colors.dashboard.border }]}>
          <Ionicons name="briefcase-outline" size={20} color={colors.dashboard.textSecondary} />
          <TextInput
            style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
            value={occupation}
            onChangeText={(v) => { setOccupation(v); clearError('occupation'); }}
            placeholder={t('occupationPlaceholder')}
            placeholderTextColor={colors.dashboard.textSecondary}
          />
        </View>
        {errors.occupation && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.occupation}</Text>}

        <View style={[styles.divider, { backgroundColor: colors.dashboard.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.deepGreen }]}>{t('loanInfoSection')}</Text>

        <View style={styles.radioRow}>
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ checked: hasLoan === true }}
            accessibilityLabel={t('yes')}
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
            accessibilityRole="radio"
            accessibilityState={{ checked: hasLoan === false }}
            accessibilityLabel={t('no')}
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
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.loanAmount ? colors.dashboard.redDown : colors.dashboard.border }]}>
              <Ionicons name="trending-down-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanAmount}
                onChangeText={(v) => { setLoanAmount(v); clearError('loanAmount'); }}
                keyboardType="decimal-pad"
                placeholder={t('loanAmountPlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>
            {errors.loanAmount && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanAmount}</Text>}

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('purposeLabel')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.loanPurpose ? colors.dashboard.redDown : colors.dashboard.border }]}>
              <Ionicons name="flag-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanPurpose}
                onChangeText={(v) => { setLoanPurpose(v); clearError('loanPurpose'); }}
                placeholder={t('purposePlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>
            {errors.loanPurpose && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanPurpose}</Text>}

            <Text style={[styles.label, { color: colors.dashboard.textSecondary }]}>{t('sourceLabel')}</Text>
            <View style={[styles.inputIcon, { backgroundColor: colors.dashboard.cardBg, borderColor: errors.loanSource ? colors.dashboard.redDown : colors.dashboard.border }]}>
              <Ionicons name="business-outline" size={20} color={colors.dashboard.textSecondary} />
              <TextInput
                style={[styles.iconInput, { color: colors.dashboard.textPrimary }]}
                value={loanSource}
                onChangeText={(v) => { setLoanSource(v); clearError('loanSource'); }}
                placeholder={t('sourcePlaceholder')}
                placeholderTextColor={colors.dashboard.textSecondary}
              />
            </View>
            {errors.loanSource && <Text style={[styles.error, { color: colors.dashboard.redDown }]}>{errors.loanSource}</Text>}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.deepGreen }, isSaving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('saveChanges')}
          accessibilityState={{ disabled: isSaving, busy: isSaving }}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{isSaving ? t('saving') : t('saveChanges')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.dashboard.cardBg, borderColor: colors.dashboard.border }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
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
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
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
