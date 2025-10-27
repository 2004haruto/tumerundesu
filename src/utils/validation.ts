// src/utils/validation.ts

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export class InputValidator {
  // メールアドレスの検証
  static validateEmail(email: string): ValidationResult {
    if (!email.trim()) {
      return { isValid: false, message: 'メールアドレスを入力してください。' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, message: '正しいメールアドレス形式で入力してください。' };
    }
    
    return { isValid: true };
  }

  // パスワードの検証
  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, message: 'パスワードを入力してください。' };
    }
    
    if (password.length < 6) {
      return { isValid: false, message: 'パスワードは6文字以上で入力してください。' };
    }
    
    return { isValid: true };
  }

  // 名前の検証
  static validateName(name: string): ValidationResult {
    if (!name.trim()) {
      return { isValid: false, message: 'お名前を入力してください。' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, message: 'お名前は2文字以上で入力してください。' };
    }
    
    return { isValid: true };
  }

  // パスワード確認の検証
  static validatePasswordConfirm(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, message: 'パスワード（確認用）を入力してください。' };
    }
    
    if (password !== confirmPassword) {
      return { isValid: false, message: 'パスワードが一致しません。' };
    }
    
    return { isValid: true };
  }

  // ログイン用の一括検証
  static validateLoginInput(email: string, password: string): ValidationResult {
    const emailResult = this.validateEmail(email);
    if (!emailResult.isValid) {
      return emailResult;
    }
    
    if (!password) {
      return { isValid: false, message: 'パスワードを入力してください。' };
    }
    
    return { isValid: true };
  }

  // 新規登録用の一括検証
  static validateSignUpInput(
    name: string, 
    email: string, 
    password: string, 
    confirmPassword: string
  ): ValidationResult {
    const nameResult = this.validateName(name);
    if (!nameResult.isValid) {
      return nameResult;
    }
    
    const emailResult = this.validateEmail(email);
    if (!emailResult.isValid) {
      return emailResult;
    }
    
    const passwordResult = this.validatePassword(password);
    if (!passwordResult.isValid) {
      return passwordResult;
    }
    
    const confirmResult = this.validatePasswordConfirm(password, confirmPassword);
    if (!confirmResult.isValid) {
      return confirmResult;
    }
    
    return { isValid: true };
  }

  // シンプルなメールアドレス検証（boolean返却）
  static isValidEmail(email: string): boolean {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}