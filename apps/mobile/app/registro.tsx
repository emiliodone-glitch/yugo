import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ATTENDANCE_OPTIONS,
  COVENANT_V1,
  DENOMINATIONS,
  es,
  isAdult,
  LIMITS,
  SERVICE_AREAS,
  type ProfileUpdateInput,
} from '@yugo/shared';
import { Button, CheckMark, Chip, Field, H, Notice, ProgressBar, Sub, YugoMark } from '../components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;
const TOTAL_STEPS = 8;

/**
 * The account is created once the birth date is known, because the API refuses
 * to register anyone under 18 (RF-AUT-03) — so the code is sent after step 2
 * against the live API, and after step 1 in demo mode, where nothing is sent.
 */
const OTP_AFTER_STEP = DEMO_MODE ? 1 : 2;

/** Onboarding de 8 pasos (mockups): cuenta → nacimiento → pacto → fe →
 * intención → fotos → testimonio y prácticas → preferencias. */
export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [covenant, setCovenant] = useState(false);
  const [denomination, setDenomination] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<string | null>(null);
  const [intention, setIntention] = useState<string | null>(null);
  const [openness, setOpenness] = useState<string | null>(null);
  const [photos, setPhotos] = useState(0);
  const [testimony, setTestimony] = useState('');
  const [practices, setPractices] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedBirth = useMemo(() => {
    const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(birthDate) : null;
  }, [birthDate]);
  const underage = parsedBirth ? !isAdult(parsedBirth) : false;

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return email.includes('@') && password.length >= 8;
      case 2:
        return !!parsedBirth && !underage && !!gender;
      case 3:
        return covenant;
      case 4:
        return !!denomination && !!attendance;
      case 5:
        return !!intention && !!openness;
      case 6:
        return photos >= LIMITS.PHOTOS_MIN;
      case 7:
        return testimony.trim().length >= 40 && practices.length >= 2;
      default:
        return true;
    }
  }, [step, email, password, parsedBirth, underage, gender, covenant, denomination, attendance, intention, openness, photos, testimony, practices]);

  const next = async () => {
    setError(null);
    setBusy(true);
    try {
      if (otpStage) {
        if (!DEMO_MODE) await getApiClient().auth.verifyOtp(email, otp);
        setOtpStage(false);
        setStep(OTP_AFTER_STEP + 1);
        return;
      }

      if (step === OTP_AFTER_STEP) {
        if (!DEMO_MODE) {
          await getApiClient().auth.register({
            email,
            password,
            birthDate,
            gender: gender as 'MALE' | 'FEMALE',
          });
        }
        setOtpStage(true);
        return;
      }

      // RF-AUT-04: the covenant is recorded with its version before anything else.
      if (step === 3 && !DEMO_MODE) {
        await getApiClient().auth.acceptCovenant(COVENANT_V1.version);
      }

      if (step === TOTAL_STEPS) {
        if (!DEMO_MODE) await saveProfile();
        setDone(true);
        return;
      }

      setStep((current) => current + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  /** Sends everything the wizard collected once the member finishes it. */
  const saveProfile = async () => {
    const client = getApiClient();
    const denominations = await client.catalog.denominations().catch(() => []);
    const denominationId = denominations.find((item) => item.slug === denomination)?.id;

    await client.profiles.update({
      denominationId,
      attendance: (attendance ?? undefined) as ProfileUpdateInput['attendance'],
      intention: (intention ?? undefined) as ProfileUpdateInput['intention'],
      openness: (openness ?? undefined) as ProfileUpdateInput['openness'],
      testimony: testimony || undefined,
      practiceSlugs: practices,
    });
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <YugoMark size={64} color={colors.ink} />
        <H size={26} style={{ marginTop: 20 }}>
          {es.onboarding.doneTitle}
        </H>
        <Sub style={{ textAlign: 'center', marginTop: 8, maxWidth: 280 }}>{es.onboarding.doneSub}</Sub>
        <Button
          label={es.common.continue}
          tone="olive"
          style={{ marginTop: 24, width: 240 }}
          onPress={() => router.replace('/(tabs)/inicio')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ProgressBar value={(step / TOTAL_STEPS) * 100} style={{ marginBottom: 14 }} />
      <Text style={styles.stepLabel}>{es.common.step(step, TOTAL_STEPS)}</Text>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {step === 1 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.accountTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.accountSub}</Sub>
            <TextInput
              style={styles.input}
              placeholder={es.onboarding.email}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder={es.onboarding.password}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        ) : null}

        {otpStage ? (
          <View>
            <H size={26}>{es.onboarding.otpTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.otpSub(email)}</Sub>
            <Field
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
              placeholder="······"
              keyboardType="number-pad"
              maxLength={6}
              centered
            />
          </View>
        ) : null}

        {step === 2 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.birthTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.birthSub}</Sub>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              value={birthDate}
              onChangeText={setBirthDate}
            />
            {underage ? <Text style={styles.error}>{es.onboarding.birthUnderage}</Text> : null}
            <Text style={styles.fieldTitle}>{es.onboarding.genderTitle}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label={es.onboarding.male}
                tone={gender === 'MALE' ? 'olive' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setGender('MALE')}
              />
              <Button
                label={es.onboarding.female}
                tone={gender === 'FEMALE' ? 'olive' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setGender('FEMALE')}
              />
            </View>
          </View>
        ) : null}

        {step === 3 && !otpStage ? (
          <View>
            <H size={26}>{es.covenant.title}</H>
            <Sub style={{ marginVertical: 8 }}>{es.covenant.intro}</Sub>
            <View style={styles.card}>
              {COVENANT_V1.points.map((point) => (
                <View key={point} style={styles.covenantRow}>
                  <CheckMark size={18} color={colors.olive} />
                  <Text style={styles.covenantText}>{point}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Switch
                value={covenant}
                onValueChange={setCovenant}
                trackColor={{ true: colors.olive, false: '#D5D2C8' }}
                thumbColor="#fff"
              />
              <Text style={[styles.covenantText, { flex: 1 }]}>{es.covenant.acceptLabel}</Text>
            </View>
          </View>
        ) : null}

        {step === 4 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.faithTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.faithSub}</Sub>
            <Text style={styles.fieldTitle}>{es.onboarding.denomination}</Text>
            <View style={styles.chipWrap}>
              {DENOMINATIONS.map((item) => (
                <Pressable key={item.slug} onPress={() => setDenomination(item.slug)}>
                  <Chip label={item.name} tone={denomination === item.slug ? 'olive' : 'default'} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldTitle}>{es.onboarding.attendance}</Text>
            <View style={styles.chipWrap}>
              {ATTENDANCE_OPTIONS.map((option) => (
                <Pressable key={option.value} onPress={() => setAttendance(option.value)}>
                  <Chip label={option.label} tone={attendance === option.value ? 'olive' : 'default'} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 5 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.intentionTitle}</H>
            <View style={{ marginTop: 12, gap: 8 }}>
              {[
                ['MARRIAGE', es.onboarding.intentionMarriage],
                ['FRIENDSHIP', es.onboarding.intentionFriendship],
                ['BOTH', es.onboarding.intentionBoth],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  label={label}
                  tone={intention === value ? 'olive' : 'ghost'}
                  onPress={() => setIntention(value)}
                />
              ))}
            </View>
            <Text style={styles.fieldTitle}>{es.onboarding.opennessTitle}</Text>
            <View style={{ gap: 8 }}>
              {[
                ['SAME', es.onboarding.opennessSame],
                ['AFFINE', es.onboarding.opennessAffine],
                ['ALL', es.onboarding.opennessAll],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  label={label}
                  tone={openness === value ? 'olive' : 'ghost'}
                  onPress={() => setOpenness(value)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 6 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.photosTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.photosSub}</Sub>
            <View style={styles.photoGrid}>
              {Array.from({ length: LIMITS.PHOTOS_MAX }, (_, index) => (
                <Pressable
                  key={index}
                  style={[styles.photoSlot, index < photos ? styles.photoSlotFilled : null]}
                  onPress={() => setPhotos(index < photos ? photos - 1 : photos + 1)}
                >
                  <Text style={{ fontSize: 24, color: index < photos ? colors.olive : colors.line }}>
                    {index < photos ? '✓' : '+'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Sub style={{ marginTop: 8 }}>
              {photos} de {LIMITS.PHOTOS_MAX} · mínimo {LIMITS.PHOTOS_MIN}
            </Sub>
          </View>
        ) : null}

        {step === 7 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.testimonyTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.testimonySub}</Sub>
            <TextInput
              style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
              multiline
              maxLength={LIMITS.TESTIMONY_MAX}
              value={testimony}
              onChangeText={setTestimony}
            />
            <Text style={styles.fieldTitle}>{es.onboarding.practicesTitle}</Text>
            <View style={styles.chipWrap}>
              {SERVICE_AREAS.map((area) => {
                const active = practices.includes(area.slug);
                return (
                  <Pressable
                    key={area.slug}
                    onPress={() =>
                      setPractices((current) =>
                        active ? current.filter((slug) => slug !== area.slug) : [...current, area.slug],
                      )
                    }
                  >
                    <Chip label={area.name} tone={active ? 'olive' : 'default'} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 8 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.preferencesTitle}</H>
            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.covenantText}>{es.visibility.wantToMeet}</Text>
                <Text style={[styles.covenantText, { fontFamily: fonts.bodyBold }]}>26 – 38 años</Text>
              </View>
              <Sub style={{ marginTop: 8 }}>{es.onboarding.ageRangeHelp}</Sub>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {error ? <Notice tone="wine" text={error} /> : null}
      <Button
        label={
          busy
            ? es.common.loading
            : otpStage
              ? es.common.continue
              : step === 3
                ? es.covenant.commit
                : step === TOTAL_STEPS
                  ? 'Crear mi perfil'
                  : es.common.continue
        }
        tone={step === 3 && !otpStage ? 'olive' : 'ink'}
        disabled={busy || !(otpStage ? otp.length === 6 : canContinue)}
        onPress={next}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.linen },
  stepLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.olive,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 10,
    color: colors.text,
  },
  error: {
    backgroundColor: colors.wineSoft,
    color: colors.wine,
    fontFamily: fonts.body,
    fontSize: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  fieldTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginTop: 14, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
  },
  covenantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  covenantText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.text, flexShrink: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: {
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: colors.olive, backgroundColor: colors.oliveSoft },
});
