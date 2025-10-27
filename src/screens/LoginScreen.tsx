import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { AuthError, AuthErrorType } from '../services/api';
import { InputValidator } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (): Promise<void> => {
    // 入力バリデーション
    const validation = InputValidator.validateLoginInput(email, password);
    if (!validation.isValid) {
      Alert.alert('入力エラー', validation.message);
      return;
    }

    setIsLoading(true);

    try {
      await login({
        email: email.trim(),
        password: password,
      });
      // ログイン成功時は AuthProvider が自動的に認証済み画面に遷移する
    } catch (error: any) {
      // 開発時のみデバッグログを出力（ネットワークエラー以外は出力しない）
      if (__DEV__ && error instanceof AuthError && error.type === AuthErrorType.NETWORK_ERROR) {
        console.log('Login network error:', error.message);
      }
      
      if (error instanceof AuthError) {
        handleAuthError(error);
      } else {
        Alert.alert('ログインエラー', error.message || 'ログインに失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: AuthError) => {
    switch (error.type) {
      case AuthErrorType.USER_NOT_FOUND:
        Alert.alert(
          'アカウントが見つかりません', 
          'このメールアドレスで登録されたアカウントが見つかりません。\n\n・メールアドレスをもう一度確認してください\n・アカウントをお持ちでない場合は新規登録してください',
          [
            { text: 'OK', style: 'default' },
            { text: '新規登録', style: 'default', onPress: () => navigation.navigate('SignUp') }
          ]
        );
        break;
        
      case AuthErrorType.INVALID_PASSWORD:
        Alert.alert(
          'パスワードが正しくありません',
          'パスワードをもう一度確認してください。\n\n・大文字・小文字を正しく入力していますか？\n・全角文字が含まれていませんか？',
          [
            { text: 'OK', style: 'default' },
            { text: 'パスワードを忘れた', style: 'default', onPress: () => handleForgotPassword() }
          ]
        );
        break;
        
      case AuthErrorType.NETWORK_ERROR:
        Alert.alert(
          'ネットワークエラー',
          'インターネット接続を確認してください。\n\n・Wi-Fiまたはモバイルデータ通信がオンになっていますか？\n・サーバーに接続できない場合があります',
          [
            { text: 'OK', style: 'default' },
            { text: '再試行', style: 'default', onPress: handleLogin }
          ]
        );
        break;
        
      case AuthErrorType.VALIDATION_ERROR:
        Alert.alert('入力エラー', error.message);
        break;
        
      default:
        Alert.alert('ログインエラー', error.message || 'ログインに失敗しました。');
        break;
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'パスワードリセット', 
      '現在、パスワードリセット機能は開発中です。\n\n新しいアカウントを作成するか、正しいパスワードでログインしてください。',
      [
        { text: 'OK', style: 'default' },
        { text: '新規登録', style: 'default', onPress: () => navigation.navigate('SignUp') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ログイン</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={(text: string) => setEmail(text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={(text: string) => setPassword(text)}
          secureTextEntry
        />
        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>ログイン</Text>
          )}
        </TouchableOpacity>

        <View style={styles.additionalButtonsContainer}>
          <TouchableOpacity 
            style={styles.textButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.textButtonText}>新規登録はこちら</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.textButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.textButtonText}>パスワードを忘れた方はこちら</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  additionalButtonsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  textButton: {
    padding: 10,
    marginVertical: 5,
  },
  textButtonText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default LoginScreen;
