import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { Button, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Confirmación dentro de la pantalla, en vez de `Alert.alert`.
 *
 * El diálogo nativo no respeta la tipografía ni los colores de Yugo, no se
 * puede probar y en web ni siquiera existe. Esta hoja se ve igual en las tres
 * plataformas y deja la acción destructiva marcada en vino, nunca en el color
 * del botón principal.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = es.common.cancel,
  destructive,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Pinta la acción en vino: eliminar, cancelar, quitar. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Contenido extra entre el texto y los botones (una nota, un campo). */
  children?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      />
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {body ? <Sub style={{ fontSize: 12.5, lineHeight: 18 }}>{body}</Sub> : null}
        {children}
        <Button
          label={busy ? es.common.loading : confirmLabel}
          tone={destructive ? 'ghost' : 'ink'}
          disabled={busy}
          style={[
            styles.confirm,
            destructive ? { borderColor: colors.wine, backgroundColor: colors.wineSoft } : null,
          ]}
          textColor={destructive ? colors.wine : undefined}
          onPress={onConfirm}
        />
        <Button label={cancelLabel} tone="ghost" style={{ marginTop: 8 }} onPress={onCancel} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(24,28,44,.4)' },
  sheet: {
    backgroundColor: colors.linen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
  },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginBottom: 6 },
  confirm: { marginTop: 14 },
});
