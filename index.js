const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// 中间件配置
app.use(bodyParser.json());
app.use((req, res, next) => {
  // 强制设置JSON响应头
  res.setHeader('Content-Type', 'application/json');
  next();
});

// 飞书验证Token（可选）
const VERIFICATION_TOKEN = 'Fdk0RL6yflrb62JGA1lUchkWDGjQaeqO';

// 主路由处理
app.post('/', (req, res) => {
  try {
    console.log('收到飞书请求:', JSON.stringify(req.body, null, 2));
    
    const { type, challenge, token } = req.body;

    // 1. Token验证（可选）
    if (token && token !== VERIFICATION_TOKEN) {
      console.warn('Token验证失败: 收到', token, '预期', VERIFICATION_TOKEN);
      return res.status(403).json({ 
        code: 403, 
        msg: 'Invalid token' 
      });
    }

    // 2. 处理URL验证
    if (type === 'url_verification') {
      if (!challenge) {
        throw new Error('缺少challenge字段');
      }
      
      console.log('URL验证通过，返回challenge:', challenge);
      return res.json({ challenge });
    }

    // 3. 其他事件处理
    console.log('处理常规事件');
    return res.json({ code: 0, msg: 'success' });

  } catch (error) {
    console.error('处理错误:', error);
    return res.status(500).json({ 
      code: 500,
      msg: error.message 
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
  console.log('飞书验证Token:', VERIFICATION_TOKEN);
});
