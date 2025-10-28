# 🚀 にっスマ！GitHub Pages デプロイメントガイド

このガイドでは、にっスマ！をGitHub Pagesで公開する手順を説明します。

## 📋 事前準備チェックリスト

- [x] Firebase プロジェクトが作成済み（nissuma-7ef8f）
- [x] `index.html` と `app.js` が準備済み
- [ ] GitHubアカウントを持っている
- [ ] Firebaseセキュリティルールの設定が必要なことを理解している

---

## ステップ 1️⃣: GitHubリポジトリの作成

### 1.1 GitHubにログイン
[https://github.com](https://github.com) にアクセスしてログイン

### 1.2 新しいリポジトリを作成
1. 右上の「+」アイコンをクリック → 「New repository」を選択
2. リポジトリ情報を入力：
   - **Repository name**: `nissuma` （または任意の名前）
   - **Description**: `にっスマ！- バドミントンイベント参加管理システム`
   - **Public** を選択（GitHub Pages無料版はPublicのみ）
   - **Add a README file** にチェック（オプション）
3. 「Create repository」をクリック

---

## ステップ 2️⃣: ファイルのアップロード

### 方法A: Web UIから直接アップロード（簡単！）

1. 作成したリポジトリのページで「Add file」→「Upload files」をクリック
2. 以下のファイルをドラッグ&ドロップ：
   ```
   ✅ index.html
   ✅ app.js
   ✅ README.md
   📄 DEPLOYMENT_GUIDE.md（このファイル）
   📄 FIREBASE_SECURITY_RULES.md
   ```
3. Commit message に「Initial commit」と入力
4. 「Commit changes」をクリック

### 方法B: Git コマンドラインを使用（上級者向け）

```bash
# リポジトリをクローン
git clone https://github.com/あなたのユーザー名/nissuma.git
cd nissuma

# ファイルをコピー（このプロジェクトフォルダから）
# index.html, app.js, README.md などをコピー

# Git に追加
git add .
git commit -m "Initial commit"
git push origin main
```

---

## ステップ 3️⃣: GitHub Pages の有効化

### 3.1 Settings に移動
リポジトリページで「Settings」タブをクリック

### 3.2 Pages 設定を開く
左サイドバーから「Pages」をクリック

### 3.3 ソースを設定
1. **Source** セクションで：
   - Branch: `main` を選択
   - Folder: `/ (root)` を選択
2. 「Save」をクリック

### 3.4 デプロイ完了を待つ
- 数分後、ページ上部に緑色のバナーが表示されます
- 「Your site is live at https://あなたのユーザー名.github.io/nissuma/」
- このURLをクリックしてサイトにアクセス！

---

## ステップ 4️⃣: Firebase セキュリティルールの設定（重要！）

⚠️ **現在、Firebaseは誰でもデータを読み書きできる状態です！**

### 4.1 Firebase Console にアクセス
[https://console.firebase.google.com](https://console.firebase.google.com)

### 4.2 プロジェクトを選択
`nissuma-7ef8f` プロジェクトをクリック

### 4.3 Firestore Database に移動
左サイドバーから「Firestore Database」をクリック

### 4.4 ルールを設定
1. 上部の「ルール」タブをクリック
2. 詳細な設定方法は `FIREBASE_SECURITY_RULES.md` を参照
3. 基本的なルール例：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // イベントは誰でも読める、作成可能
    match /events/{eventId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null || 
        request.resource.data.organizer_password == resource.data.organizer_password;
    }
    
    // レスポンスは誰でも読める、作成・更新可能
    match /responses/{responseId} {
      allow read, create, update: if true;
      allow delete: if request.auth != null;
    }
  }
}
```

4. 「公開」をクリック

---

## ステップ 5️⃣: 動作確認

### 5.1 サイトにアクセス
`https://あなたのユーザー名.github.io/nissuma/` を開く

### 5.2 テストシナリオ
1. ✅ **イベント作成タブ**で新しいイベントを作成
2. ✅ **イベント一覧タブ**でイベントが表示されることを確認
3. ✅ イベントカードをクリックして詳細モーダルを開く
4. ✅ 参加表明を送信（出席・欠席・未定）
5. ✅ 参加者名をクリックして編集メニューを開く
6. ✅ **イベント管理タブ**でパスワードを入力して管理
7. ✅ 仮スケジュール → 確定スケジュールへの変更

### 5.3 ブラウザの開発者ツールで確認
- `F12` キーを押して Console を開く
- エラーメッセージがないか確認
- Firebase接続エラーがある場合は設定を見直す

---

## 🎉 デプロイ完了！

おめでとうございます！にっスマ！が公開されました！

### 📱 URLを共有
- チームメンバーにURLを共有
- QRコードを生成してポスターに掲載
- SNSで告知

### 🔧 今後の更新方法
1. ローカルでファイルを編集
2. GitHubリポジトリにアップロード（方法Aまたは方法B）
3. GitHub Pagesが自動的に再デプロイ（数分で反映）

---

## ❓ トラブルシューティング

### 問題: サイトが表示されない（404エラー）
**解決策:**
- GitHub Pages設定で正しいブランチ（main）が選択されているか確認
- `index.html` がリポジトリのルートにあるか確認
- 数分待ってからリロード（初回デプロイには時間がかかる）

### 問題: Firebaseエラー（Firebase: Error (auth/...)）
**解決策:**
- Firebaseプロジェクト設定が正しいか確認
- `index.html` の firebaseConfig が正しいか確認
- ブラウザのコンソールでエラー詳細を確認

### 問題: データが保存されない
**解決策:**
- Firebaseセキュリティルールを確認（厳しすぎないか）
- ブラウザのコンソールで「permission-denied」エラーを確認
- Firebase Console でデータが作成されているか確認

### 問題: イベント一覧が空
**解決策:**
- ブラウザのコンソールでエラーを確認
- Firebaseプロジェクトに `events` コレクションが存在するか確認
- テストイベントを作成してみる

### 問題: デザインが崩れている
**解決策:**
- Tailwind CSS CDNが読み込まれているか確認（ネットワークタブ）
- Font Awesome CDNが読み込まれているか確認
- キャッシュをクリアしてリロード（Ctrl + Shift + R）

---

## 📞 サポート

問題が解決しない場合：
1. ブラウザのコンソール（F12）でエラーメッセージを確認
2. Firebase Console でデータとルールを確認
3. GitHub Actions タブでデプロイログを確認

---

## 🔗 便利なリンク

- [GitHub Pages ドキュメント](https://docs.github.com/ja/pages)
- [Firebase Firestore ドキュメント](https://firebase.google.com/docs/firestore)
- [にっスマ！README](./README.md)
- [Firebase セキュリティルール設定ガイド](./FIREBASE_SECURITY_RULES.md)

---

**最終更新**: 2025-10-28
