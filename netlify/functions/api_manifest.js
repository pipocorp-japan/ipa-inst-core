/**
 * Vercel, Netlify Functionsなどで使用できる、Node.jsベースのサーバーレス関数です。
 * クエリパラメータからアプリ情報を受け取り、動的にPLIST (XML) を生成して返します。
 *
 * デプロイパスの例: /api/manifest
 *
 * @param {object} req - HTTPリクエストオブジェクト
 * @param {object} res - HTTPレスポンスオブジェクト
 */

// PLIST XML 生成関数 (HTMLファイルと同じロジック)
function generatePlist(ipaUrl, bundleId, version, appName) {
    // XMLエスケープ処理
    const escapeXml = (str) => {
        return str.replace(/[&<>"']/g, function(match) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;'
            })[match];
        });
    };

    const escapedIpaUrl = escapeXml(ipaUrl);
    const escapedBundleId = escapeXml(bundleId);
    const escapedVersion = escapeXml(version);
    const escapedAppName = escapeXml(appName);

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
					<string>${escapedIpaUrl}</string>
				</dict>
			</array>
			<key>metadata</key>
			<dict>
				<key>bundle-identifier</key>
				<string>${escapedBundleId}</string>
				<key>bundle-version</key>
				<string>${escapedVersion}</string>
				<key>kind</key>
				<string>software</string>
				<key>title</key>
				<string>${escapedAppName}</string>
			</dict>
		</dict>
	</array>
</dict>
</plist>`;
}


// Vercel / Netlify Function のエントリポイント
module.exports = (req, res) => {
    // URLSearchParamsを使用してクエリパラメータをパース
    const url = require('url');
    const { query } = url.parse(req.url, true);

    const ipaUrl = query.ipaUrl;
    const bundleId = query.bundleId;
    const version = query.version;
    const appName = query.appName;

    if (!ipaUrl || !bundleId || !version || !appName) {
        // 必要なパラメータがない場合、エラーを返す
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(400).send('Error: Missing required query parameters (ipaUrl, bundleId, version, appName).');
        return;
    }

    // iOSのOTA配信はHTTPSが必須のため、IPA URLの検証を推奨
    if (!ipaUrl.startsWith('https://')) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(400).send('Error: ipaUrl must use HTTPS scheme.');
        return;
    }


    try {
        const plistContent = generatePlist(ipaUrl, bundleId, version, appName);

        // iOSデバイスがPLISTファイルとして認識するためのヘッダーを設定
        res.setHeader('Content-Type', 'application/x-plist');
        // HTTPSサーバーから配信するために必要
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.status(200).send(plistContent);
    } catch (error) {
        console.error('PLIST generation error:', error);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(500).send('Internal Server Error during PLIST generation.');
    }
};
