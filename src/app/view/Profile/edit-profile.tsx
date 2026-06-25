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

const CROPS = ['ধান', 'পাট', 'গম', 'আলু', 'পেঁয়াজ', 'সবজি', 'চা', 'আম'];
const INCOME_SOURCES = ['কৃষি শ্রমিক', 'ছোট ব্যবসা', 'চাকরি', 'অন্যান্য'];
const GENDERS = ['পুরুষ', 'মহিলা', 'অন্যান্য'];

export default function EditProfileScreen() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerLogo}>
            <Ionicons name="leaf" size={18} color="#fff" />
          </View>
        </View>
        <Text style={styles.headerTitle}>{t('editProfile')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionLabel}>{t('personalInfoSection')}</Text>

        <Text style={styles.label}>{t('nameBnLabel')}</Text>
        <TextInput
          style={styles.input}
          value={nameBn}
          onChangeText={setNameBn}
          placeholder={t('nameBnPlaceholder')}
        />

        <Text style={styles.label}>{t('nameEnLabel')}</Text>
        <TextInput
          style={styles.input}
          value={nameEn}
          onChangeText={setNameEn}
          placeholder={t('nameEnPlaceholder')}
        />

        <Text style={styles.label}>{t('nidLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="document-text-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={nid}
            onChangeText={setNid}
            keyboardType="number-pad"
            placeholder={t('nidPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('phoneLabel2')}</Text>
        <View style={styles.phoneContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+880</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('phonePlaceholder2')}
          />
        </View>

        <Text style={styles.label}>{t('dobLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="calendar-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={dob}
            onChangeText={setDob}
            placeholder={t('dobPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('genderLabel')}</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.genderBtn, gender === item && styles.genderBtnActive]}
              onPress={() => setGender(item)}
            >
              <Text style={[styles.genderText, gender === item && styles.genderTextActive]}>
                {gender === item ? '✓ ' : ''}{item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>{t('landCropsSection')}</Text>

        <Text style={styles.label}>{t('totalLandLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="map-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={totalLand}
            onChangeText={setTotalLand}
            keyboardType="decimal-pad"
            placeholder={t('totalLandPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('ownLandLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="home-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={ownLand}
            onChangeText={setOwnLand}
            keyboardType="decimal-pad"
            placeholder={t('ownLandPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('leasedLandLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="document-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={leasedLand}
            onChangeText={setLeasedLand}
            keyboardType="decimal-pad"
            placeholder={t('leasedLandPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('mainCropsLabel')}</Text>
        <View style={styles.chipContainer}>
          {CROPS.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[styles.chip, selectedCrops.includes(crop) && styles.chipActive]}
              onPress={() => toggleCrop(crop)}
            >
              <Text style={[styles.chipText, selectedCrops.includes(crop) && styles.chipTextActive]}>
                {selectedCrops.includes(crop) ? '✓ ' : ''}{crop}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('locationLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="location-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={location}
            onChangeText={setLocation}
            placeholder={t('locationPlaceholder')}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>{t('incomeSection')}</Text>

        <Text style={styles.label}>{t('annualFarmingLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="cash-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={farmingIncome}
            onChangeText={setFarmingIncome}
            keyboardType="decimal-pad"
            placeholder={t('annualFarmingPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('otherSourcesLabel')}</Text>
        <View style={styles.chipContainer}>
          {INCOME_SOURCES.map((source) => (
            <TouchableOpacity
              key={source}
              style={[styles.chip, selectedSources.includes(source) && styles.chipActive]}
              onPress={() => toggleSource(source)}
            >
              <Text style={[styles.chipText, selectedSources.includes(source) && styles.chipTextActive]}>
                {selectedSources.includes(source) ? '✓ ' : ''}{source}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('otherIncomeLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="wallet-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={otherIncome}
            onChangeText={setOtherIncome}
            keyboardType="decimal-pad"
            placeholder={t('otherIncomePlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('familyLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="people-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={familyMembers}
            onChangeText={setFamilyMembers}
            keyboardType="number-pad"
            placeholder={t('familyPlaceholder')}
          />
        </View>

        <Text style={styles.label}>{t('occupationLabel')}</Text>
        <View style={styles.inputIcon}>
          <Ionicons name="briefcase-outline" size={20} color="#7B8A8B" />
          <TextInput
            style={styles.iconInput}
            value={occupation}
            onChangeText={setOccupation}
            placeholder={t('occupationPlaceholder')}
          />
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>{t('loanInfoSection')}</Text>

        <View style={styles.radioRow}>
          <TouchableOpacity
            style={[styles.radioBtn, hasLoan === true && styles.radioBtnActive]}
            onPress={() => setHasLoan(true)}
          >
            <Ionicons
              name={hasLoan === true ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={hasLoan === true ? '#157A5A' : '#7B8A8B'}
            />
            <Text style={[styles.radioText, hasLoan === true && styles.radioTextActive]}>
              {t('yes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioBtn, hasLoan === false && styles.radioBtnActive]}
            onPress={() => setHasLoan(false)}
          >
            <Ionicons
              name={hasLoan === false ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={hasLoan === false ? '#157A5A' : '#7B8A8B'}
            />
            <Text style={[styles.radioText, hasLoan === false && styles.radioTextActive]}>
              {t('no')}
            </Text>
          </TouchableOpacity>
        </View>

        {hasLoan && (
          <>
            <Text style={styles.label}>{t('loanAmountLabel2')}</Text>
            <View style={styles.inputIcon}>
              <Ionicons name="trending-down-outline" size={20} color="#7B8A8B" />
              <TextInput
                style={styles.iconInput}
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType="decimal-pad"
                placeholder={t('loanAmountPlaceholder')}
              />
            </View>

            <Text style={styles.label}>{t('purposeLabel')}</Text>
            <View style={styles.inputIcon}>
              <Ionicons name="flag-outline" size={20} color="#7B8A8B" />
              <TextInput
                style={styles.iconInput}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
                placeholder={t('purposePlaceholder')}
              />
            </View>

            <Text style={styles.label}>{t('sourceLabel')}</Text>
            <View style={styles.inputIcon}>
              <Ionicons name="business-outline" size={20} color="#7B8A8B" />
              <TextInput
                style={styles.iconInput}
                value={loanSource}
                onChangeText={setLoanSource}
                placeholder={t('sourcePlaceholder')}
              />
            </View>
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#006847',
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
    color: '#006847',
    marginTop: 10,
    marginBottom: 6,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '600',
    color: '#425466',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#fff',
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E4ECE9',
    fontSize: 15,
  },
  inputIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4ECE9',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4ECE9',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4ECE9',
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
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#157A5A',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  genderText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#157A5A',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5E2',
  },
  chipActive: {
    borderColor: '#157A5A',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  chipText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#157A5A',
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE5E2',
    justifyContent: 'center',
    gap: 8,
  },
  radioBtnActive: {
    borderColor: '#157A5A',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  radioText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
  },
  radioTextActive: {
    color: '#157A5A',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#006847',
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
