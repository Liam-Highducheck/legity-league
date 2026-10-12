import { Alert } from 'react-native'

/** The web's window.confirm: resolves true when the person taps the destructive/confirm button. */
export function confirm(title: string, message: string, confirmLabel = 'Confirm', destructive = true): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    )
  })
}
