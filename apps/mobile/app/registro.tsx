import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CITIES, COVENANT_V1, DENOMINATIONS, es, isAdult } from '@yugo/shared';
import { useReach } from '@yugo/app-core';
import {
  Button,
  CheckMark,
  Chip,
  Field,
  H,
  ListRow,
  Notice,
  ProgressBar,
  Sub,
  YugoMark,
} from '../components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Registro corto (RF-AUT-01..04, RF-PER-01): cuenta → edad → pacto → lo
 * esencial. Fotos, iglesia, testimonio y prácticas se completan después
 * desde «Completa tu perfil». Antes eran ocho pasos y el de fotos no subía
 * nada.
 */
const TOTAL_STEPS = 4;

/**
 * The account is created once the birth date is known, because the API refuses
 * to register anyone under 18 (RF-AUT-03) — so the code is sent after step 2
 * against the live API, and after step 1 in demo mode, where nothing is sent.
 */
const OTP_AFTER_STEP = DEMO_MODE ? 1 : 2;

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [covenant, setCovenant] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [otherCity, setOtherCity] = useState(false);
  const [intention, setIntention] = useState<'MARRIAGE' | 'FRIENDSHIP' | 'BOTH' | null>(null);
  const [denomination, setDenomination] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prueba de valor en cuanto sabemos lo suficiente para que signifique algo.
  const { data: reach } = useReach(denomination ?? undefined);

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
        return displayName.trim().length >= 2 && city.trim().length >= 2 && !!intention;
      default:
        return false;
    }
  }, [
    step,
    email,
    password,
    parsedBirth,
    underage,
    gender,
    covenant,
    displayName,
    city,
    intention,
  ]);

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

  /** Lo esencial; el rango de edad lo calcula la API a partir de la edad. */
  const saveProfile = async () => {
    const client = getApiClient();
    let denominationId: string | undefined;
    if (denomination) {
      const denominations = await client.catalog.denominations().catch(() => []);
      denominationId = denominations.find((item) => item.slug === denomination)?.id;
    }
    await client.profiles.update({
      displayName: displayName.trim(),
      city: city.trim(),
      intention: intention ?? undefined,
      denominationId,
    });
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center' }]}>
        <YugoMark size={56} color={colors.ink} />
        <H size={26} style={{ marginTop: 16 }}>
          {es.onboarding.doneTitle}
        </H>
        <Sub style={{ marginTop: 6 }}>{es.onboarding.doneSub}</Sub>
        <Text style={[styles.stepLabel, { marginTop: 20 }]}>
          {es.onboarding.nextStepsTitle.toUpperCase()}
        </Text>
        <ListRow
          label={es.onboarding.nextPhotos}
          hint={es.onboarding.nextPhotosHint}
          right={<Chip label="+15 %" tone="wheat" />}
          onPress={() => router.replace('/perfil/fotos')}
        />
        <ListRow
          label={es.onboarding.nextVerify}
          hint={es.onboarding.nextVerifyHint}
          right={<Chip label={es.common.recommended} tone="olive" />}
          onPress={() => router.replace('/perfil/verificacion')}
        />
        <ListRow
          label={es.onboarding.nextComplete}
          hint={es.onboarding.nextCompleteHint}
          onPress={() => router.replace('/perfil/editar')}
        />
        <Button
          label={es.onboarding.goHome}
          tone="olive"
          style={{ marginTop: 20 }}
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
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder={es.onboarding.password}
              autoComplete="new-password"
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
              keyboardType="numbers-and-punctuation"
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
                accessibilityLabel={es.covenant.acceptLabel}
              />
              <Text style={[styles.covenantText, { flex: 1 }]}>{es.covenant.acceptLabel}</Text>
            </View>
          </View>
        ) : null}

        {step === 4 && !otpStage ? (
          <View>
            <H size={26}>{es.onboarding.essentialsTitle}</H>
            <Sub style={{ marginVertical: 8 }}>{es.onboarding.essentialsSub}</Sub>

            <Text style={styles.fieldTitle}>{es.onboarding.displayName}</Text>
            <TextInput
              style={styles.input}
              maxLength={40}
              autoComplete="given-name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.fieldTitle}>{es.onboarding.cityLabel}</Text>
            <View style={styles.chipWrap}>
              {CITIES.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => {
                    setOtherCity(false);
                    setCity(item.name);
                  }}
                >
                  <Chip
                    label={item.name}
                    tone={!otherCity && city === item.name ? 'olive' : 'default'}
                  />
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setOtherCity(true);
                  setCity('');
                }}
              >
                <Chip label={es.onboarding.cityOther} tone={otherCity ? 'olive' : 'default'} />
              </Pressable>
            </View>
            {otherCity ? (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder={es.onboarding.cityOther}
                maxLength={80}
                value={city}
                onChangeText={setCity}
              />
            ) : null}

            <Text style={styles.fieldTitle}>{es.onboarding.intentionTitle}</Text>
            <View style={{ gap: 8 }}>
              {(
                [
                  ['MARRIAGE', es.onboarding.intentionMarriage],
                  ['FRIENDSHIP', es.onboarding.intentionFriendship],
                  ['BOTH', es.onboarding.intentionBoth],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  label={label}
                  tone={intention === value ? 'olive' : 'ghost'}
                  onPress={() => setIntention(value)}
                />
              ))}
            </View>

            <Text style={styles.fieldTitle}>{es.onboarding.denominationOptional}</Text>
            <View style={styles.chipWrap}>
              {DENOMINATIONS.map((item) => (
                <Pressable
                  key={item.slug}
                  onPress={() => setDenomination(denomination === item.slug ? null : item.slug)}
                >
                  <Chip label={item.name} tone={denomination === item.slug ? 'olive' : 'default'} />
                </Pressable>
              ))}
            </View>
            {denomination && reach ? (
              <View style={{ marginTop: 10 }}>
                <Notice
                  text={
                    reach.hasPeople
                      ? reach.approximate
                        ? es.onboarding.reachWithNumber(reach.approximate)
                        : es.onboarding.reachWithout
                      : es.onboarding.reachFirst
                  }
                />
              </View>
            ) : null}
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
                  ? 'Entrar a Yugo'
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
  fieldTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
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
  covenantText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text,
    flexShrink: 1,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
