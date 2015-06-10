Historian.setWorkerPath('bower_components/chrome-historian/src/workers/');

var Merged = {};
var devices = new Historian.Devices();
var dayHistory = new Historian.Day(new Date());

devices.fetch(function(devices){
  if (devices) { Merged.devices = devices; }
});

chrome.bookmarks.getRecent(100, function(data) {
  Merged.bookmarks = data;
});

dayHistory.fetch(function(visits) {
  Merged.visits = visits;
});

Merged.renderTemplate = function(data) {
  var context = {
    "days" : data
  }
  console.log(context);
  var source = $("#historyTemplate").html();
  var template = Handlebars.compile(source);
  $('.stream').append(template(context));
};

Merged.getMergedStream = function() {
  var merged = _.union(this.visits, this.bookmarks);
  for (var i = 0; i < merged.length; i++) {
    var item = merged[i];

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
  }

  var mergedSorted = _.sortBy(merged, function(o) {
    return o.dateNormalized;
  });

  mergedSorted = mergedSorted.reverse();

  var groupedByDay = _.groupBy(mergedSorted, function(item) {
    return item.dateNormalized.format('MMMM Do, YYYY');
  });

  this.renderTemplate(groupedByDay);
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

Handlebars.registerHelper('trimFilename', function(context, block) {
  console.log(context, block);
});

setTimeout(function () {
  var stream = Merged.getMergedStream();
}, 250);
