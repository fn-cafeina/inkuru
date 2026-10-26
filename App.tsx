import './global.css';

import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-lg font-semibold text-black dark:text-white">inkuru</Text>
      <StatusBar style="auto" />
    </View>
  );
}
