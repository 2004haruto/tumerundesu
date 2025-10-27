import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleSignUp = async () => {
    // 入力バリデーション
    const validation = InputValidator.validateSignUpInput(name, email, password, confirmPassword);
    if (!validation.isValid) {
      Alert.alert('入力エラー', validation.message);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password: password,
      });
      // 登録成功時は AuthProvider が自動的に認証済み画面に遷移する
    } catch (error: any) {
      // 開発時のみデバッグログを出力（ネットワークエラー以外は出力しない）
      if (__DEV__ && error instanceof AuthError && error.type === AuthErrorType.NETWORK_ERROR) {
        console.log('Register network error:', error.message);
      }
      
      if (error instanceof AuthError) {
        handleAuthError(error);
      } else {
        Alert.alert('登録エラー', error.message || 'アカウント作成に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: AuthError) => {
    switch (error.type) {
      case AuthErrorType.EMAIL_ALREADY_EXISTS:
        Alert.alert(
          'メールアドレスが既に登録されています',
          'このメールアドレスは既に使用されています。\n\n・別のメールアドレスでアカウント作成を行ってください\n・既にアカウントをお持ちの場合はログインしてください',
          [
            { text: 'OK', style: 'default' },
            { text: 'ログイン', style: 'default', onPress: () => navigation.navigate('Login') }
          ]
        );
        break;
        
      case AuthErrorType.VALIDATION_ERROR:
        Alert.alert(
          '入力エラー',
          error.message + '\n\n以下を確認してください：\n・メールアドレスの形式が正しいか\n・パスワードが6文字以上か\n・お名前が2文字以上か'
        );
        break;
        
      case AuthErrorType.NETWORK_ERROR:
        Alert.alert(
          'ネットワークエラー',
          'インターネット接続を確認してください。\n\n・Wi-Fiまたはモバイルデータ通信がオンになっていますか？\n・サーバーに接続できない場合があります',
          [
            { text: 'OK', style: 'default' },
            { text: '再試行', style: 'default', onPress: handleSignUp }
          ]
        );
        break;
        
      default:
        Alert.alert('登録エラー', error.message || 'アカウント作成に失敗しました。');
        break;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>アカウント作成</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="お名前"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード（確認用）"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity 
            style={[styles.signUpButton, isLoading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signUpButtonText}>アカウント作成</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.textButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.textButtonText}>アカウントをお持ちの方はこちら</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
  signUpButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textButton: {
    padding: 10,
    marginTop: 15,
    alignItems: 'center',
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

export default SignUpScreen;