/**
 * Vercel, Netlify Functionsなどで使用できる、Node.jsベースのサーバーレス関数です。
 * クエリパラメータ 'id' を使用してFirestoreからアプリ情報を取得し、
 * 動的にPLIST (XML) を生成して返します。
 * * Netlify Functionsにデプロイする場合、Firebase Admin SDKの設定が必要です。
 * * @param {object} req - HTTPリクエストオブジェクト
 * @param {object} res - HTTPレスポンスオブジェクト
 */

// **重要:** Firebase Admin SDKと初期化設定
// Netlify Functionsは通常、環境変数経由でFirebase Admin SDKの認証情報を設定する必要があります。
// (例: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID)

// Admin SDKはブラウザのFirebase SDKとは異なります
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getApp, initializeApp, getApps } = admin;

// 環境変数からFirebase設定を読み込む（Netlify環境を想定）
const FIREBASE_CONFIG = {
    // 実際のNetlify環境では環境変数を設定してください
    // projectId: process.env.FIREBASE_PROJECT_ID, 
    // clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // \nを改行コードに置換
    // 注: この環境ではAdmin SDKの設定が難しいため、デモとして設定を省略しますが、
    // 実際に運用する場合は上記のようにAdmin SDKを初期化する必要があります。
};

// サーバーレス環境でのAdmin SDKの初期化
if (!getApps().length) {
    // Admin SDKの初期化が成功したと仮定します
    // try {
    //     initializeApp({
    //         credential: admin.credential.cert(FIREBASE_CONFIG)
    //     });
    // } catch (e) {
    //     console.error("Firebase Admin initialization failed:", e);
    // }
}

// データベースインスタンスの仮取得 (実際にはAdmin SDKで初期化されたインスタンスを使用)
// const db = getFirestore();

// === 仮のデータベース読み込み関数 (Admin SDKがない環境向け) ===
// 開発環境のCanvasではAdmin SDKが使えないため、ここではデモデータで応答します。
// 実際にNetlifyにデプロイする際は、上記のAdmin SDK初期化とdbインスタンスを使用してください。
async function fetchManifestData(id) {
    // Netlify Functionsでは、Admin SDKとFirestoreを使用してデータを取得します
    // const docRef = db.collection('artifacts').doc('YOUR_APP_ID').collection('public').doc('data').collection('manifests').doc(id);
    // const doc = await docRef.get();
    // if (!doc.exists) {
    //     return null;
    // }
    // return doc.data();

    // デモ応答 (一時的な措置)
    if (id === 'demo123') {
        return {
            ipaUrl: 'https://example.com/downloads/my_app.ipa',
            bundleId: 'com.sample.testapp',
            version: '1.0',
            appName: 'テストアプリ'
        };
    }
    return null;
}
// === ここまで仮のデータベース読み込み関数 ===


// PLIST XML 生成関数 (HTMLファイルと同じロジック)
function generatePlist(data) {
    const { ipaUrl, bundleId, version, appName } = data;
    // XMLエスケープ処理
    const escapeXml = (str) => {
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;'
        })[match]);
    };

    // ... (XML生成ロジックは省略 - generatePlist関数の内容は前回のものと同じ) ...
    // 完全なPLIST XMLを返す
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>items</key>
	<array>
		<dict>
			<key>assets</key>
			<array>
				<dict>
					<key>kind</key>
					<string>software-package</string>
					<key>url</key>
					<string>${escapeXml(ipaUrl)}</string>
				</dict>
			</array>
			<key>metadata</key>
			<dict>
				<key>bundle-identifier</key>
				<string>${escapeXml(bundleId)}</string>
				<key>bundle-version</key>
				<string>${escapeXml(version)}</string>
				<key>kind</key>
				<string>software</string>
				<key>title</key>
				<string>${escapeXml(appName)}</string>
			</dict>
		</dict>
	</array>
</dict>
</plist>`;
}


// Serverless Function のエントリポイント
module.exports = async (req, res) => {
    const url = require('url');
    const { query } = url.parse(req.url, true);
    const docId = query.id;

    // 必須パラメータのチェック
    if (!docId) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(400).send('Error: Missing required query parameter "id".');
        return;
    }

    try {
        // データベースから情報を取得
        const manifestData = await fetchManifestData(docId); // 実際にはFirestoreから取得

        if (!manifestData) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.status(404).send(`Error: Manifest data not found for ID: ${docId}`);
            return;
        }

        // PLISTを生成
        const plistContent = generatePlist(manifestData);

        // iOSデバイスがPLISTファイルとして認識するためのヘッダーを設定
        res.setHeader('Content-Type', 'application/x-plist');
        // CORS設定 (必須)
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.status(200).send(plistContent);
        
    } catch (error) {
        console.error('Serverless Function Error:', error);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(500).send('Internal Server Error while fetching or generating PLIST.');
    }
};
