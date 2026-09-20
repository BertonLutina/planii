import { useLocalSearchParams } from 'expo-router'
import { AuthScreen } from '@/screens/auth/AuthScreen'

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const value = Array.isArray(token) ? token[0] : token
  return <AuthScreen mode="reset" resetToken={value || ''} />
}
