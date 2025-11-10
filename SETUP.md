# IPA OTA リンクジェネレーター セットアップガイド

## 必要な環境変数

このアプリケーションを動作させるには、以下の環境変数をNetlifyに設定する必要があります。

### Firebase Admin SDK（サーバーレス関数用）

`netlify/functions/api_manifest.js`で使用されます：

- `FIREBASE_PROJECT_ID` - FirebaseプロジェクトID
- `FIREBASE_CLIENT_EMAIL` - サービスアカウントのクライアントメール
- `FIREBASE_PRIVATE_KEY` - サービスアカウントの秘密鍵（改行は`\n`で表現）
- `FIREBASE_APP_ID` - アプリケーションID（オプション、デフォルト: `default-app-id`）

### Firebase Web SDK（フロントエンド用）

`index.html`で使用されます：

- `__firebase_config` - Firebase設定のJSON文字列
- `__app_id` - アプリケーションID（オプション）
- `__initial_auth_token` - 初期認証トークン（オプション）

## Firebase Admin SDKの設定方法

1. Firebaseコンソールで、プロジェクト設定 > サービスアカウント に移動
2. "新しい秘密鍵を生成"をクリックしてJSONファイルをダウンロード
3. JSONファイルから以下の値を取得：
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## Firebase Web SDKの設定方法

1. Firebaseコンソールで、プロジェクト設定 > 一般 に移動
2. "Firebase SDK snippet"から設定をコピー
3. 以下の形式でJSON文字列を作成：

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

4. この JSON を `__firebase_config` 環境変数として設定

## Netlifyでの環境変数設定

1. Netlifyダッシュボードでサイトを開く
2. Site settings > Environment variables に移動
3. 上記の環境変数を追加

## Firestoreのセキュリティルール

以下のセキュリティルールを設定してください：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## トラブルシューティング

### "データベースへの保存に失敗しました"エラー

このエラーは以下の原因で発生します：

1. **Firebase設定が未設定または不正** - `__firebase_config`環境変数が正しく設定されているか確認
2. **認証が完了していない** - ページ読み込み後、認証が完了するまで待機
3. **Firestoreのセキュリティルールが厳しすぎる** - 上記のセキュリティルールを確認
4. **サーバーレス関数の環境変数が未設定** - Admin SDK用の環境変数を確認

### デバッグ方法

1. ブラウザのデベロッパーツールを開く
2. Consoleタブでエラーメッセージを確認
3. Networkタブで`api_manifest`へのリクエストを確認
4. Netlify Functionsのログを確認（Netlifyダッシュボード > Functions）
