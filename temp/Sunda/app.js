const path = require('path');

const express = require('express');

const app = express();

const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const http = require('http').Server(app);

app.get('/', (req, res) => {
  res.send('hi');
});

http.listen(7777, (req, res) => {
  console.log('Controller Server is Running', 7777);
});
