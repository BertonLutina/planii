import { useLocalSearchParams } from 'expo-router'
import { VideoCall } from '@/screens/project/meeting/VideoCall'

export default function MeetingCallScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  return <VideoCall projectId={String(projectId ?? '')} />
}
