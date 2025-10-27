import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import BentoMenuScreen from './src/screens/BentoMenuScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MenuDetailScreen from './src/screens/MenuDetailScreen';
import MenuReviewScreen from './src/screens/MenuReviewScreen';
import NutritionDashboardScreen from './src/screens/NutritionDashboardScreen';
import PackingGuideScreen from './src/screens/PackingGuideScreen';
import ProposalHistoryScreen from './src/screens/ProposalHistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import SignUpScreen from './src/screens/SignUpScreen';

// ナビゲーションのパラメータ型を定義
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  Settings: undefined;
  NutritionDashboard: undefined;
  BentoMenu: undefined;
  ProposalHistory: undefined;
  MenuDetail: { 
    recipe?: any; // ProcessedRecipe
    bento?: any;  // GeneratedBento
  };
  Favorites: undefined;
  PackingGuide: undefined;
  MenuReview: undefined;
  ShoppingList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 認証状態に応じたナビゲーション
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id="RootNavigator"
        screenOptions={{
          headerShown: false
        }}
      >
        {!isAuthenticated ? (
          // 未認証時の画面
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          // 認証済み時の画面
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="NutritionDashboard" component={NutritionDashboardScreen} />
            <Stack.Screen name="BentoMenu" component={BentoMenuScreen} />
            <Stack.Screen name="ProposalHistory" component={ProposalHistoryScreen} />
            <Stack.Screen name="MenuDetail" component={MenuDetailScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="PackingGuide" component={PackingGuideScreen} />
            <Stack.Screen name="MenuReview" component={MenuReviewScreen} />
            <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
