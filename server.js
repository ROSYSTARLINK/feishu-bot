const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });
let currentPlanFile = null;

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;

async function getTenantToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: APP_ID,
    app_secret: APP_SECRET
  });
  return res.data.tenant_access_token;
}

async function getUserIdByName(name, token) {
  const res = await axios.post(
    'https://open.feishu.cn/open-apis/contact/v3/users/search',
    { query: name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const users = res.data.data.user_list;
  return users && users[0] ? users[0].user_id : null;
}

async function sendMessageToUser(userId, content, token) {
  const res = await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages',
    {
      receive_id: userId,
      content: JSON.stringify({ text: content }),
      msg_type: 'text'
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `msg-${Date.now()}`,
        Receive_Id_Type: 'user_id'
      }
    }
  );
  return res.data;
}

app.get('/', (req, res) => {
  res.send(`<form action="/upload" method="post" enctype="multipart/form-data">
    <input type="file" name="plan" />
    <button type="submit">Upload Plan</button>
  </form>`);
});

app.post('/upload', upload.single('plan'), (req, res) => {
  currentPlanFile = req.file.path;
  res.send('Plan uploaded. Now send "开始" to the bot.');
});

app.post('/webhook', express.json(), async (req, res) => {
  const { challenge, event } = req.body;
  if (challenge) return res.send({ challenge });

  if (event && event.message && event.message.content.includes('开始')) {
    console.log('收到开始指令，执行计划...');
    if (!currentPlanFile) return res.send('no plan uploaded');
    const content = fs.readFileSync(currentPlanFile, 'utf8');
    await processTasks(content);
  }
  res.send('ok');
});

async function processTasks(txt) {
  const token = await getTenantToken();
  const sections = txt.split(/---+/);

  for (const sec of sections) {
    const taskType = (sec.match(/\[任务类型\]:\s*(.+)/) || [])[1];
    if (!taskType) continue;

    if (taskType.includes('回复消息')) {
      const target = (sec.match(/\[目标\]:\s*(.+)/) || [])[1];
      const content = (sec.match(/\[内容\]:\s*([\s\S]+)/) || [])[1];
      console.log(`给 ${target} 发消息：${content}`);
      const userId = await getUserIdByName(target, token);
      if (userId) {
        await sendMessageToUser(userId, content, token);
        console.log(`已发送给 ${target}`);
      } else {
        console.log(`找不到用户 ${target}`);
      }
    }

    if (taskType.includes('修改文档')) {
      const docLink = (sec.match(/\[文档链接\]:\s*(.+)/) || [])[1];
      const method = (sec.match(/\[修改方式\]:\s*([\s\S]+)/) || [])[1];
      console.log(`修改文档 ${docLink}，方式：${method}`);
    }

    if (taskType.includes('合成语音')) {
      const content = (sec.match(/\[内容\]:\s*([\s\S]+?)(\n\[|$)/) || [])[1];
      console.log(`准备合成语音内容：${content}`);
    }
  }
}

app.listen(port, () => {
  console.log(`feishu bot web server running at http://localhost:${port}`);
});