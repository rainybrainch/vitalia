// Firebase API統合・Firestore保存機能
class FirebaseAPI {
  constructor() {
    this.initFirebase();
    this.userId = this.getUserId();
  }

  initFirebase() {
    // Firebase初期化設定
    // プロジェクトID: vitalia-coaching（サンプル）
    // Firestoreデータベース: vitalia-prod
    const firebaseConfig = {
      apiKey: "AIzaSyBlZzQ0P6Q1K2R3S4T5U6V7W8X9Y0Z1a2b",
      authDomain: "vitalia-coaching.firebaseapp.com",
      projectId: "vitalia-coaching",
      storageBucket: "vitalia-coaching.appspot.com",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:1a2b3c4d5e6f7g8h9"
    };

    // Firebase SDK (CDNから読み込み想定)
    if (!window.firebase) {
      console.warn('Firebase SDK not loaded. Please include Firebase CDN script.');
      return;
    }

    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  /**
   * localStorageからuserIdを取得（DataManagerと同期）
   * DataManager が既にuserIdを生成している場合は、それを使用
   */
  getUserId() {
    // DataManager が vitalia_user_id を使用しているため、それを参照
    let userId = localStorage.getItem('vitalia_user_id');

    // DataManager が初期化されていない場合のフォールバック
    if (!userId) {
      // Firebase 専用のuserId も確認
      userId = localStorage.getItem('firebase_user_id');
    }

    if (!userId) {
      userId = this.generateUserId();
      // 両方に保存（DataManager との同期）
      localStorage.setItem('vitalia_user_id', userId);
      localStorage.setItem('firebase_user_id', userId);
      console.log('Generated new userId:', userId);
    }

    return userId;
  }

  /**
   * ランダムなuserIdを生成
   */
  generateUserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${random}`;
  }

  /**
   * プロフィールをFirestore保存
   * @param {Object} profile - プロフィールオブジェクト
   * @returns {Promise} 保存完了を示すPromise
   */
  async saveProfile(profile) {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      // users/{userId}ドキュメント内のprofileフィールドに保存
      const userRef = this.db.collection('users').doc(this.userId);

      // Firestoreのサーバータイムスタンプを使用
      const profileData = {
        profile: {
          ...profile,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        onboardingCompleted: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await userRef.update(profileData);

      console.log('Profile saved successfully to Firestore:', this.userId);
      return {
        success: true,
        userId: this.userId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving profile to Firestore:', error);
      throw new Error(`Failed to save profile: ${error.message}`);
    }
  }

  /**
   * Firestoreからプロフィールを読み込み
   * @returns {Promise<Object>} プロフィールオブジェクト
   */
  async loadProfile() {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userRef = this.db.collection('users').doc(this.userId);
      const doc = await userRef.get();

      if (doc.exists && doc.data().profile) {
        console.log('Profile loaded from Firestore');
        return doc.data().profile;
      } else {
        console.log('No profile found in Firestore');
        return null;
      }
    } catch (error) {
      console.error('Error loading profile from Firestore:', error);
      throw new Error(`Failed to load profile: ${error.message}`);
    }
  }

  /**
   * ゲーム進捗状態を更新
   * @param {Object} gameState - ゲーム状態オブジェクト
   * @returns {Promise} 更新完了を示すPromise
   */
  async updateGameState(gameState) {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userRef = this.db.collection('users').doc(this.userId);

      const updateData = {
        'profile.game_state': gameState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await userRef.update(updateData);

      console.log('Game state updated successfully');
      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating game state:', error);
      throw new Error(`Failed to update game state: ${error.message}`);
    }
  }

  /**
   * 日次チェックデータを記録
   * @param {Object} dailyCheck - 日次チェックデータ
   * @returns {Promise} 記録完了を示すPromise
   */
  async saveDailyCheck(dailyCheck) {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userRef = this.db.collection('users').doc(this.userId);
      const todayDate = new Date().toISOString().split('T')[0];

      const checkData = {
        userId: this.userId,
        date: todayDate,
        answer: dailyCheck.answer,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      // サブコレクション: users/{userId}/dailyChecks/{date}
      await userRef.collection('dailyChecks').doc(todayDate).set(checkData);

      console.log('Daily check saved successfully');
      return {
        success: true,
        date: todayDate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving daily check:', error);
      throw new Error(`Failed to save daily check: ${error.message}`);
    }
  }

  /**
   * エラーメッセージを標準化
   * @param {Error} error - エラーオブジェクト
   * @returns {string} ユーザーフレンドリーなエラーメッセージ
   */
  getErrorMessage(error) {
    const errorCode = error.code || '';

    if (errorCode.includes('permission-denied')) {
      return 'データベースへのアクセス権限がありません。管理者に連絡してください。';
    } else if (errorCode.includes('network')) {
      return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    } else if (errorCode.includes('unavailable')) {
      return 'サービスが一時的に利用できません。しばらくしてから再度お試しください。';
    } else {
      return 'データ保存に失敗しました。再度お試しください。';
    }
  }
}

// グローバルインスタンス
const firebaseAPI = new FirebaseAPI();
