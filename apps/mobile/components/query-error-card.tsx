import { StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { Button } from './ui';
import { errorMessage } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Una consulta que falló, dicho en voz alta y con un botón para reintentar.
 *
 * Existe para que ninguna pestaña quede en blanco o en «Cargando…» cuando la
 * petición ya falló: eso deja a la persona esperando algo que no va a llegar
 * sin saber por qué.
 */
export function QueryErrorCard({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.text}>{error ? errorMessage(error) : es.errors.generic}</Text>
      <Button
        label={es.common.retry}
        tone="ghost"
        small
        style={{ alignSelf: 'center', marginTop: 10 }}
        onPress={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.wine,
    textAlign: 'center',
  },
});
