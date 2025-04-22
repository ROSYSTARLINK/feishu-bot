const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // Node.js 内置加密模块

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// 飞书加密密钥（从飞书开放平台获取）
const ENCRYPT_KEY = 'EUqqvvm4wAu0Ht4J39nSBdLra8c3Ntur'; // 替换为实际密钥
const VERIFICATION_TOKEN = 'Fdk0RL6yflrb62JGA1lUchkWDGjQaeqO'; // 可选，用于额外验证

// 统一设置 JSON Content-Type
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// 飞书消息解密函数
function decryptFeishuMessage(encrypt, key) {
  const keyBuf = Buffer.from(key + '=', 'base64'); // 飞书密钥需要补等号
  const decoded = Buffer.from(encrypt, 'base64');
  const iv = decoded.slice(0, 16);
  const ciphertext = decoded.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 处理飞书事件（支持加密）
app.post('/feishu/event', (req, res) => {
  try {
    const { type, challenge, encrypt, token } = req.body;

    // 1. 验证 Token（可选）
    if (token && token !== VERIFICATION_TOKEN) {
      return res.status(403).json({ code: 403, msg: 'Invalid token' });
    }

    // 2. 处理飞书URL验证（加密或明文模式）
    if (type === 'url_verification') {
      if (encrypt) {
        // 解密 challenge
        const decrypted = decryptFeishuMessage(encrypt, ENCRYPT_KEY);
        return res.json({ challenge: decrypted.challenge });
      } else {
        return res.json({ challenge });
      }
    }

    // 3. 处理加密事件
    if (encrypt) {
      const decryptedData = decryptFeishuMessage(encrypt, ENCRYPT_KEY);
      console.log('解密后数据:', decryptedData);
      // 实际业务逻辑处理...
      return res.json({ code: 0, msg: 'success' });
    }

    // 4. 明文事件（不推荐）
    console.log('明文事件:', JSON.stringify(req.body, null, 2));
    res.json({ code: 0, msg: 'success' });

  } catch (error) {
    console.error('处理飞书事件异常:', error);
    res.status(500).json({ code: 500, msg: 'Internal Server Error' });
  }
});

// 其他路由和错误处理...
app.get('/', (req, res) => res.json({ status: 'running' }));
app.use((err, req, res, next) => res.status(500).json({ code: 500, msg: 'Server Error' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
