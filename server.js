const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Express가 현재 디렉토리의 모든 파일(HTML, JS, CSS, 이미지, JSON)을 웹에 노출하도록 설정
app.use(express.static(path.join(__dirname))); 

// 기본 요청 처리: index.html 파일 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
