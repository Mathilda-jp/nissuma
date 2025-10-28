# 🔒 Firebase セキュリティルール設定ガイド

にっスマ！のFirebase Firestoreセキュリティルールを設定するための詳細ガイドです。

## ⚠️ 重要な警告

現在のFirebase設定では、**誰でもデータを読み書きできる状態**になっています！
本番環境で使用する前に、必ずセキュリティルールを設定してください。

---

## 📋 セキュリティルール設定手順

### ステップ 1: Firebase Console にアクセス

1. [Firebase Console](https://console.firebase.google.com) を開く
2. プロジェクト `nissuma-7ef8f` を選択
3. 左サイドバーから「Firestore Database」をクリック
4. 上部の「ルール」タブをクリック

### ステップ 2: ルールを選択

以下の3つのセキュリティレベルから選択してください：

---

## 🟢 レベル1: 基本セキュリティ（推奨）

**特徴:**
- 誰でもイベント・レスポンスを読める
- 誰でもイベント・レスポンスを作成できる
- 主催者パスワードがあればイベントを編集・削除できる
- レスポンスは誰でも編集・削除できる

**適用場面:** 小規模なチーム・信頼できるメンバーのみの環境

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // イベントコレクション
    match /events/{eventId} {
      // 読み取りと作成は誰でも可能
      allow read, create: if true;
      
      // 更新・削除は主催者パスワードが一致する場合のみ
      allow update, delete: if request.resource.data.organizer_password == resource.data.organizer_password;
    }
    
    // レスポンスコレクション
    match /responses/{responseId} {
      // すべての操作を許可（小規模チーム向け）
      allow read, create, update, delete: if true;
    }
  }
}
```

---

## 🟡 レベル2: 中程度のセキュリティ

**特徴:**
- 誰でもイベント・レスポンスを読める
- 誰でもイベント・レスポンスを作成できる
- 主催者パスワードがあればイベントを編集・削除できる
- レスポンスは参加者名が一致する場合のみ編集・削除可能

**適用場面:** 中規模のコミュニティ・一般公開する場合

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // イベントコレクション
    match /events/{eventId} {
      allow read, create: if true;
      
      // パスワードチェック
      allow update, delete: if request.resource.data.organizer_password == resource.data.organizer_password;
    }
    
    // レスポンスコレクション
    match /responses/{responseId} {
      allow read, create: if true;
      
      // 更新・削除は参加者名が一致する場合のみ
      allow update, delete: if request.resource.data.participant_name == resource.data.participant_name;
    }
  }
}
```

---

## 🔴 レベル3: 厳格なセキュリティ（Firebase Authentication必須）

**特徴:**
- 認証済みユーザーのみがイベントを作成できる
- 認証済みユーザーのみが自分のイベントを編集・削除できる
- レスポンスは誰でも作成できるが、自分のもののみ編集・削除可能

**適用場面:** 大規模コミュニティ・セキュリティが重要な環境

⚠️ **注意:** このレベルを使用するには、アプリにFirebase Authenticationを実装する必要があります（現在未実装）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // イベントコレクション
    match /events/{eventId} {
      allow read: if true;
      
      // 認証済みユーザーのみ作成可能
      allow create: if request.auth != null;
      
      // 自分が作成したイベントかつパスワードが一致する場合のみ編集・削除
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.creator_uid &&
        request.resource.data.organizer_password == resource.data.organizer_password;
    }
    
    // レスポンスコレクション
    match /responses/{responseId} {
      allow read, create: if true;
      
      // 参加者名が一致する場合のみ編集・削除
      allow update, delete: if request.resource.data.participant_name == resource.data.participant_name;
    }
  }
}
```

---

## 🛠️ ルールの適用方法

### 方法1: Firebase Console から直接編集

1. 上記のルールコードをコピー
2. Firebase Console の「ルール」タブでエディタに貼り付け
3. 右上の「公開」ボタンをクリック
4. 確認ダイアログで「公開」をクリック

### 方法2: Firebase CLI を使用（上級者向け）

```bash
# Firebase CLI をインストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトを初期化
firebase init firestore

# firestore.rules ファイルを編集して上記ルールを貼り付け

# デプロイ
firebase deploy --only firestore:rules
```

---

## ✅ ルール設定後の動作確認

### テスト1: イベント作成
1. にっスマ！で新しいイベントを作成
2. エラーが表示されないことを確認

### テスト2: イベント編集
1. イベント管理タブで正しいパスワードを入力
2. イベントを編集または削除できることを確認
3. 間違ったパスワードでエラーになることを確認

### テスト3: レスポンス作成
1. イベント詳細から参加表明を送信
2. エラーが表示されないことを確認

### テスト4: レスポンス編集（レベル2以上の場合）
1. 参加者名をクリックして編集メニューを開く
2. 同じ参加者名で編集できることを確認
3. 別の参加者名では編集できないことを確認（期待される動作）

---

## 🔍 ルールのデバッグ

### ブラウザのコンソールでエラーを確認

```
F12 → Console タブ
```

よくあるエラー：

**エラー1:** `FirebaseError: Missing or insufficient permissions`
- **原因:** セキュリティルールが厳しすぎる
- **解決:** ルールを見直して、必要な操作が許可されているか確認

**エラー2:** `FirebaseError: PERMISSION_DENIED`
- **原因:** 認証が必要な操作を認証なしで実行している
- **解決:** レベル1または2のルールを使用

### Firebase Console でルールをテスト

1. Firebase Console の「ルール」タブ
2. 右上の「ルールのシミュレーター」をクリック
3. テストしたい操作を入力してシミュレーション実行

---

## 📊 推奨セキュリティレベル

| 使用環境 | 推奨レベル | 理由 |
|---------|-----------|------|
| 小規模チーム（5-10人） | レベル1 | シンプルで管理しやすい |
| 中規模コミュニティ（10-50人） | レベル2 | 参加者が自分のレスポンスのみ編集可能 |
| 大規模・公開サイト（50人以上） | レベル3 | Firebase Authentication実装後に推奨 |
| 開発・テスト環境 | テストモード | 期限付きで全許可（本番では使用しない） |

---

## ⚙️ 現在の設定確認方法

Firebase Console で現在のルールを確認：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // ← すべて拒否
      // または
      allow read, write: if true;   // ← すべて許可（危険！）
    }
  }
}
```

上記のような設定になっている場合は、このガイドのルールに置き換えてください。

---

## 🚨 セキュリティのベストプラクティス

1. **テストモードのまま放置しない**
   - Firebase作成時の「テストモード」は30日で期限切れ
   - 期限前に適切なルールに変更

2. **パスワードは共有しない**
   - 主催者パスワードはチーム内で安全に共有
   - 公開しない

3. **定期的にルールを見直す**
   - 使用状況に応じてルールを更新
   - 不要な権限は削除

4. **Firebase Consoleでアクティビティを監視**
   - 「使用状況」タブで読み書き回数を確認
   - 異常なアクセスがないかチェック

---

## 📞 サポート

セキュリティルールに関する質問：
- [Firebase セキュリティルール公式ドキュメント](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase セキュリティルールの書き方ガイド](https://firebase.google.com/docs/firestore/security/rules-structure)

---

**最終更新**: 2025-10-28
