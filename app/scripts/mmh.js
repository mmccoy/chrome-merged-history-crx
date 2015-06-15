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
var devices = new Historian.Devices();

var today = moment().toDate();
var yesterday = moment().subtract(1, 'days').toDate();

var dayHistory = new Historian.Day(today);
var yesterdayHistory = new Historian.Day(yesterday);

_.groupByMulti = function (obj, values, context) {
    if (!values.length)
        return obj;
    var byFirst = _.groupBy(obj, values[0], context),
        rest = values.slice(1);
    for (var prop in byFirst) {
        byFirst[prop] = _.groupByMulti(byFirst[prop], rest, context);
    }
    return byFirst;
};

_.truncateString = function(str, len) {
  if (str.length > len && str.length > 0) {
      var new_str = str + " ";
      new_str = str.substr (0, len);
      new_str = str.substr (0, new_str.lastIndexOf(" "));
      new_str = (new_str.length > 0) ? new_str : str.substr (0, len);

      return new_str + '...';
  }
  return str;
}

devices.fetch(function(devices){
  if (devices) { Merged.devices = devices; }
});

chrome.bookmarks.getTree(function(items) {
  Merged.bookmarkKeys = items;
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

Merged.getMergedStream = function() {
  var merged = _.union(this.todayVisits, this.yesterdayVisits);
  // var merged = _.union(merged, this.bookmarks);

  for (var i = 0; i < merged.length; i++) {
    var item = merged[i];

    item.downloads = [];

    // Bookmark event
    if (item.dateAdded) {
      item.dateNormalized = moment(item.dateAdded);
      item.eventType = 'bookmarkAdded';
    } ;

    // Page visit event
    if(item.lastVisitTime) {
      item.dateNormalized = moment(item.lastVisitTime);
      item.eventType = 'urlVisited';
    };

    // Download event
    if (item.endTime) {
      item.dateNormalized = moment(item.endTime);
      item.eventType = 'download';
    }

    item.timeFromNow = moment(item.dateNormalized).fromNow();
    item.calendarTime = moment(item.dateNormalized).calendar();
    // item.hour = moment(item.dateNormalized).get('hour');
    item.hour = moment(item.dateNormalized).format('h A');
    item.title = _.truncateString(item.title, 100);
  }

  var mergedSorted = _.sortBy(merged, function(o) {
    return o.dateNormalized;
  });

  mergedSorted = mergedSorted.reverse();
  var grouped = _.groupByMulti(mergedSorted, ['calendarTime', 'hour']);
  this.renderTemplate(grouped);
};

Handlebars.registerHelper('dateFormat', function(context, block) {
  if (window.moment) {
    var f = block.hash.format || "MMM DD, YYYY hh:mm:ss A";
    return moment(context).format(f);
  } else {
    return context;
  };
});

Handlebars.registerHelper('ifEqual', function(item, eventType, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
    if( item.eventType != eventType ) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});

$( ".type-filter" ).change(function(e) {
  $('body').removeClass();
  var selectedFilter = e.target.options[e.target.selectedIndex].value;
  $('body').addClass('filter-' + selectedFilter);
});

setTimeout(function () {
  var stream = Merged.getMergedStream();
}, 250);
