Historian.setWorkerPath('bower_components/chrome-historian/src/workers/');
moment.locale('en', {
    calendar : {
        lastDay : '[Yesterday]',
        sameDay : '[Today]',
        nextDay : '[Tomorrow at]',
        lastWeek : '[last] dddd [at]',
        nextWeek : 'dddd [at]',
        sameElse : 'L'
    }
});

var Merged = {};

var today = moment().toDate();
var yesterday = moment().subtract(1, 'days').toDate();
var devices = new Historian.Devices();
var dayHistory = new Historian.Day(today);
var yesterdayHistory = new Historian.Day(yesterday);

devices.fetch(function(devices){
  if (devices) { Merged.devices = devices; }
});

chrome.bookmarks.getRecent(200, function(bookmarks) {
  Merged.bookmarks = _.pluck(bookmarks, 'url');
});

dayHistory.fetch(function(visits) {
  Merged.todayVisits = visits;
});

yesterdayHistory.fetch(function(visits) {
  Merged.yesterdayVisits = visits;
});

Merged.renderTemplate = function(data) {
  var context = {
    "days" : data,
    "devices": Merged.devices
  };
  var source = $("#historyTemplate").html();
  var template = Handlebars.compile(source);
  $('.stream').append(template(context));
  console.log(context);
};

Merged.isBookmarked = function(item) {
  // console.log(item.url);
  var saved = false;
  function checkIfSaved() {
    for (var i = 0; i < Merged.bookmarks.length; i++) {
      if (item.url == Merged.bookmarks[i]) {
        saved = true;
      }
    }
  }
  checkIfSaved();
  return saved;
};

Merged.getMergedStream = function() {
  var merged = _.union(this.todayVisits, this.yesterdayVisits);
  // var merged = _.union(merged, this.bookmarks);

  for (var i = 0; i < merged.length; i++) {
    var item = merged[i];

    // Page visit event
    if(item.lastVisitTime) {
      item.dateNormalized = moment(item.lastVisitTime);
      item.eventType = 'urlVisited';
    };

    // Download event
    if (item.bytesReceived) {
      item.dateNormalized = moment(item.endTime);
      item.downloaded = true;
      item.eventType = 'download';
    }

    item.timeFromNow = moment(item.dateNormalized).fromNow();
    item.calendarTime = moment(item.dateNormalized).calendar();
    item.hour = moment(item.dateNormalized).format('h A');
    item.title = _.truncateString(item.title, 100);
    item.bookmarked = this.isBookmarked(item);
  };

  var mergedSorted = _.sortBy(merged, function(o) {
    return o.dateNormalized;
  });

  mergedSorted = mergedSorted.reverse();
  var grouped = _.groupByMulti(mergedSorted, ['calendarTime', 'hour', 'host']);
  this.renderTemplate(grouped);
};

$( ".type-filter" ).change(function(e) {
  $('body').removeClass();
  var selectedFilter = e.target.options[e.target.selectedIndex].value;
  $('body').addClass('filter-' + selectedFilter);
});



setTimeout(function () {
  var stream = Merged.getMergedStream();
  $('.host-group > li').on('click', function (el) {
    var target;
    if (el.toElement.tagName == 'LI') {
      target = el.toElement;
    } else {
      target = el.toElement.parentNode;
    }
    target.parentNode.classList.toggle('expanded');
  });

  $('.row-select').on('click', function (el) {
    el.toElement.parentNode.parentNode.classList.toggle('event-selected');
  })
}, 250);
