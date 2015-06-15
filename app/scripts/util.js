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
