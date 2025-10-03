import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';

// ナビゲーションのパラメータ型を定義
export type RootStackParamList = {
  Login: undefined; // パラメータなしの場合はundefined
  // 後で追加する画面のパラメータ型もここに定義
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id="RootNavigator"
        initialRouteName="Login"
        screenOptions={{
          headerShown: false // ヘッダーを非表示にする場合
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* 後で他の画面も追加*/}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
