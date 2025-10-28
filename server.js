const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 현재 디렉토리(프로젝트 루트)의 모든 파일을 정적 파일로 제공합니다.
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
