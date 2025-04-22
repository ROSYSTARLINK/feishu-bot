const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// 处理飞书事件
app.post('/feishu/event', (req, res) => {
  const { type, challenge, encrypt } = req.body;

  // 解密处理可在这里加逻辑（如果启用了加密）

  if (type === 'url_verification') {
    return res.send({ challenge });
  }

  // 其他事件处理逻辑
  console.log('事件接收：', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// 默认首页
app.get('/', (req, res) => {
  res.send('Feishu bot is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});