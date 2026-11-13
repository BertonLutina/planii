import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { isTrackReference } from '@livekit/components-core'
import { useConnectionState, useLocalParticipant, useTracks } from '@livekit/components-react/hooks'
import {
  AudioSession, LiveKitRoom, VideoTrack, registerGlobals,
} from '@livekit/react-native'
import { ConnectionState, Track } from 'livekit-client'
import { Banner, Ic } from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { errMsg } from '../lib/flow'

/* Avant toute connexion : pose les globales WebRTC (mediaDevices, RTCPeerConnection). */
registerGlobals()

interface Creds { url: string; token: string }

export function VideoCall({ projectId }: { projectId: string }) {
  const { c } = useTheme()
  const router = useRouter()
  const [creds, setCreds] = useState<Creds | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    api<Creds>('POST', '/projects/' + projectId + '/meeting/livekit')
      .then((r) => { if (alive) setCreds({ url: r.url, token: r.token }) })
      .catch((e) => { if (alive) setErr(errMsg(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [projectId])

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [load])

  useEffect(() => {
    AudioSession.startAudioSession().catch(() => { /* la session démarre au branchement */ })
    return () => { AudioSession.stopAudioSession().catch(() => { /* déjà arrêtée */ }) }
  }, [])

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
        <Text style={[s.wait, { color: c.muted }]}>{t('meet.videoConnecting')}</Text>
      </View>
    )
  }

  if (err || !creds) {
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <Banner tone="danger" icon="alert" text={err ?? t('meet.videoConnecting')} />
        <Pressable onPress={load} accessibilityRole="button" style={s.textBtn}>
          <Text style={[s.textBtnTxt, { color: c.accentOn }]}>{t('ad.refresh')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={s.textBtn}>
          <Text style={[s.textBtnTxt, { color: c.muted }]}>{t('meet.videoLeave')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={creds.url}
      token={creds.token}
      connect
      audio
      video
      onError={(e) => setErr(e.message)}
    >
      <Stage onLeave={() => router.back()} roomError={err} />
    </LiveKitRoom>
  )
}

function Stage({ onLeave, roomError }: { onLeave: () => void; roomError: string | null }) {
  const { c } = useTheme()
  const { width } = useWindowDimensions()
  const connection = useConnectionState()
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const tracks = useTracks([Track.Source.Camera])
  const cameras = tracks.filter(isTrackReference)
  const remotes = cameras.filter((tr) => !tr.participant.isLocal)
  const local = cameras.find((tr) => tr.participant.isLocal)
  const main = remotes.length > 0 ? remotes : (local ? [local] : [])
  const tileW = main.length <= 1 ? width - 24 : (width - 32) / 2
  const connecting = connection === ConnectionState.Connecting || connection === ConnectionState.Reconnecting

  return (
    <View style={[s.stage, { backgroundColor: c.bg }]}>
      {!!roomError && <Banner tone="danger" icon="alert" text={roomError} style={s.banner} />}
      <View style={s.grid}>
        {main.map((tr) => (
          <View key={tr.publication.trackSid} style={[s.tile, { width: tileW, backgroundColor: c.surface2 }]}>
            <VideoTrack
              trackRef={tr}
              style={s.video}
              objectFit="cover"
              mirror={tr.participant.isLocal}
              zOrder={tr.participant.isLocal ? 1 : 0}
            />
            <View style={[s.name, { backgroundColor: c.surface }]}>
              <Text numberOfLines={1} style={[s.nameTxt, { color: c.text }]}>{tr.participant.name || tr.participant.identity}</Text>
            </View>
          </View>
        ))}
        {main.length === 0 && (
          <Text style={[s.wait, { color: c.muted }]}>
            {connecting ? t('meet.videoConnecting') : t('meet.videoWait')}
          </Text>
        )}
      </View>

      {!!local && remotes.length > 0 && (
        <View style={[s.pip, { borderColor: c.line }]}>
          <VideoTrack trackRef={local} style={s.video} objectFit="cover" mirror zOrder={1} />
        </View>
      )}

      <View style={[s.bar, { backgroundColor: c.surface, borderTopColor: c.line }]}>
        <Ctrl
          label={isMicrophoneEnabled ? t('meet.videoMicOff') : t('meet.videoMicOn')}
          icon={isMicrophoneEnabled ? 'mic' : 'mic-off'}
          on={isMicrophoneEnabled}
          onPress={() => { localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => { /* refus système */ }) }}
        />
        <Ctrl
          label={isCameraEnabled ? t('meet.videoCamOff') : t('meet.videoCamOn')}
          icon={isCameraEnabled ? 'video' : 'video-off'}
          on={isCameraEnabled}
          onPress={() => { localParticipant.setCameraEnabled(!isCameraEnabled).catch(() => { /* refus système */ }) }}
        />
        <Ctrl label={t('meet.videoLeave')} icon="x" danger onPress={onLeave} />
      </View>
    </View>
  )
}

function Ctrl({
  label, icon, on, danger, onPress,
}: {
  label: string
  icon: string
  on?: boolean
  danger?: boolean
  onPress: () => void
}) {
  const { c } = useTheme()
  const bg = danger ? c.danger : on ? c.accent : c.surface2
  const fg = danger || on ? c.onAccent : c.text
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.ctrl, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}
    >
      <Ic name={icon} s={20} c={fg} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  stage: { flex: 1 },
  banner: { margin: 16 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, alignContent: 'center', justifyContent: 'center' },
  tile: { aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', maxHeight: '70%' },
  video: { flex: 1 },
  name: { position: 'absolute', left: 8, bottom: 8, maxWidth: '80%', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  nameTxt: { fontSize: 12.5, fontWeight: '700' },
  wait: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 24 },
  pip: {
    position: 'absolute', right: 16, bottom: 108, width: 104, height: 148,
    borderRadius: 14, overflow: 'hidden', borderWidth: 1,
  },
  bar: {
    flexDirection: 'row', justifyContent: 'center', gap: 18,
    paddingTop: 14, paddingBottom: 28, borderTopWidth: 1,
  },
  ctrl: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  textBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  textBtnTxt: { fontSize: 16, fontWeight: '700' },
})
