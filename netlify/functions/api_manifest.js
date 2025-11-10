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

const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

let db = null;

if (!getApps().length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

        if (projectId && clientEmail && privateKey) {
            initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
            db = getFirestore();
            console.log('Firebase Admin SDK initialized successfully');
        } else {
            console.error('Firebase Admin SDK configuration is incomplete. Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        }
    } catch (e) {
        console.error("Firebase Admin initialization failed:", e);
    }
} else {
    db = getFirestore();
}

async function fetchManifestData(id) {
    if (!db) {
        console.error('Firestore is not initialized');
        return null;
    }

    try {
        const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('manifests').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            console.log(`Document not found for ID: ${id}`);
            return null;
        }
        
        return doc.data();
    } catch (error) {
        console.error('Error fetching manifest data:', error);
        return null;
    }
}


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
