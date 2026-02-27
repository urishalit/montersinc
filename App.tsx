import { useKeepAwake } from 'expo-keep-awake';
import { LaughterScreen } from './src/screens/LaughterScreen';

export default function App() {
  useKeepAwake();
  return <LaughterScreen />;
}
