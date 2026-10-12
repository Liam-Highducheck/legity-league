import { useLocalSearchParams } from 'expo-router'
import { JoinScreen } from '../../components/JoinScreen'

export default function JoinWithCodePage() {
  const { code } = useLocalSearchParams<{ code: string }>()
  return <JoinScreen initialCode={code ?? ''} />
}
