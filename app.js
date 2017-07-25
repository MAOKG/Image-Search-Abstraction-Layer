var express = require('express'),
    app = express(),
    mongoose = require('mongoose'),
    request = require('request');

mongoose.Promise = global.Promise;
// Connect database
db_url = process.env.DATABASEURL || 'mongodb://localhost/image_search';
mongoose.connect(db_url, {
  useMongoClient: true
});

// Schema setup
var historySchema = new mongoose.Schema({
  term: String,
  when: {type: Date, default: Date.now}
});

var History = mongoose.model('History', historySchema);
var apiUrl = 'https://www.googleapis.com/customsearch/v1?searchType=image';
var key = process.env.key;
var cx = process.env.cx;
apiUrl += '&&key='+key+'&&cx='+cx;

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('landing');
});

app.get('/api/imagesearch/:term', function(req, res) {
  var sUrl = apiUrl;
  if (req.params.term) {
    sUrl += '&&q=' + req.params.term;
    if (req.query.offset) {
      sUrl += '&&num=' + req.query.offset;
    } else {
      sUrl += '&&num=10';
    }
    request.get(sUrl,function(error, response, body) {
      if (!error && response.statusCode == 200) {
        History.create({term: req.params.term}, function(e, createdHistory) {
          if (e) {
            res.send('Error, fail to add this search to search history!');
          } else {
            var items = JSON.parse(body).items;
            var displayItems = [];
            if (items) {
              for (var i = 0; i < items.length; i++) {
                displayItems.push({
                  url: items[i].link,
                  snippet: items[i].snippet,
                  thumbnail: items[i].image.thumbnailLink,
                  context: items[i].image.contextLink
                });
              }
              res.send(displayItems);
            } else {
              res.send('Cannot find related results, please retry!');
            }
          }
        });
      } else {
        res.send('An error has occuered, please retry!');
      }
    });
  } else {
    res.send('Please enter a correct search string!');
  }
});

app.get('/api/recentsearch', function(req, res) {
  History.find({}, '-_id -__v').sort({when: -1}).limit(10).exec(function (err, docs) {
    if (err) {
      res.send('Fail to load search history!');
    } else {
      res.send(docs);
    }
  });
});



app.listen(3000, function() {
  console.log('The server has started!');
});
// app.listen(process.env.PORT, process.env.IP, function() {
//    console.log('The Server Has Started!');
// })
