import { useLocalSearchParams } from 'expo-router'
import { AuthScreen } from '@/screens/auth/AuthScreen'
import { parseResetToken } from '@/lib/resetLink'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>()
  return <AuthScreen mode="reset" resetToken={parseResetToken(params.token)} />
}
