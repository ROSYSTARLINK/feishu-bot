const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// 飞书配置（替换为实际值）
const ENCRYPT_KEY = 'EUqqvvm4wAu0Ht4J39nSBdLra8c3Ntur'; // 必须与飞书后台一致
const VERIFICATION_TOKEN = 'Fdk0RL6yflrb62JGA1lUchkWDGjQaeqO';

// 统一处理所有 POST 请求到根路径
app.post('/', (req, res) => {
  res.type('json');
  try {
    console.log('请求体:', req.body);
    const { type, challenge, encrypt, token } = req.body;

    // Token 验证（可选）
    if (token && token !== VERIFICATION_TOKEN) {
      return res.status(403).json({ code: 403, msg: 'Invalid token' });
    }

    // URL 验证
    if (type === 'url_verification') {
      if (encrypt) {
        const decrypted = decryptFeishuMessage(encrypt, ENCRYPT_KEY);
        return res.json({ challenge: decrypted.challenge });
      }
      return res.json({ challenge });
    }

    // 其他事件
    res.json({ code: 0, msg: 'success' });
  } catch (error) {
    console.error('处理错误:', error);
    res.status(500).json({ code: 500, msg: error.message });
  }
});

// 解密函数
function decryptFeishuMessage(encrypt, key) {
  const keyBuf = Buffer.from(key, 'base64');
  const decoded = Buffer.from(encrypt, 'base64');
  const iv = decoded.slice(0, 16);
  const ciphertext = decoded.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 必须使用 Railway 的 PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
