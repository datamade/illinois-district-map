/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 * 
 */
 
var MapsLib = MapsLib || {};
var MapsLib = {
  
  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info
  
  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  house2001_id:      "199FXtaeX3tF1XDmnVGeJht67habsQ6z1fn4bMz8",
  house2011_id:      "1M0FQ1XlbyNI4ClGy-zF8SFkphAs-267164Cv7vw",
  houseICAR_id:      "1NaFwd9TN9V2jkI_xUh3QgjK4yQg42tT_jpSXfkU",  
  candidates_id:     "12iQQ4X__dvvP4oSgdN6Qnmexq31XqPN7rEmV348",
  
  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/   
  //*Important* this key is for demonstration purposes. please register your own.   
  googleApiKey:       "AIzaSyA3FQFrNr5W2OEVmuENqhb2MBB2JabdaOY",        
  
  //name of the location column in your Fusion Table. 
  //NOTE: if your location column name has spaces in it, surround it with single quotes 
  //example: locationColumn:     "'my location'",
  locationColumn:     "geometry",  

  map_centroid:       new google.maps.LatLng(40.148377, -89.364818), //center that your map defaults to
  locationScope:      " IL",      //geographical area appended to all address searches
  
  searchRadius:       0.001,       //in meters ~ 1/2 mile
  defaultZoom:        7,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage: 'http://derekeder.com/images/icons/blue-pushpin.png',
  currentPinpoint: null,
  markers: [],
  
  initialize: function() {
    $("#district2001_results").html("");
    $("#district2011_results").html("<p>This is a tool for exploring Illinois Legislative Districts and the candidates that run in them.</p> <p>Enter an address above to get started.</p>");
    $("#districtICAR_results").html("");
  
    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -100 },
            { lightness: 40 }
          ]
        }
      ]
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);
    
    MapsLib.records2011 = null;
    MapsLib.records2001 = null;
    MapsLib.recordsICAR = null;

    MapsLib.recordsCandidates = null;
    
    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    $(":checkbox").attr("checked", "checked");
     
    //run the default search
    MapsLib.doSearch();
  },
  
  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#search_address").val();

    var whereClause = "";
    
    if (address != "") {
      if (address.indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;
  
      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;
          
          $.address.parameter('address', encodeURIComponent(address));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(10);
          
          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint, 
            map: map, 
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });
          
          whereClause += " ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";
          
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        } 
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },
  
  submitSearch: function(whereClause, map, location) {
    //get using all filters
    if (whereClause != '') {
      MapsLib.records2001 = new google.maps.FusionTablesLayer({
        query: {
          from:   MapsLib.house2001_id,
          select: MapsLib.locationColumn,
          where:  whereClause
        },
        styleId: 2,
        templateId: 2
      });
      MapsLib.records2001.setMap(map);
      MapsLib.getDistrict2001Number(whereClause);

      MapsLib.records2011 = new google.maps.FusionTablesLayer({
        query: {
          from:   MapsLib.house2011_id,
          select: MapsLib.locationColumn,
          where:  whereClause
        },
        styleId: 2,
        templateId: 2
      });
      MapsLib.records2011.setMap(map);
      MapsLib.getDistrict2011Number(whereClause);

      // MapsLib.recordsICAR = new google.maps.FusionTablesLayer({
      //   query: {
      //     from:   MapsLib.houseICAR_id,
      //     select: MapsLib.locationColumn,
      //     where:  whereClause
      //   },
      //   styleId: 2,
      //   templateId: 2
      // });
      // MapsLib.recordsICAR.setMap(map);
      // MapsLib.getDistrictICARNumber(whereClause);

      MapsLib.addMapBounds(whereClause);
    }
    else {
      MapsLib.records2011 = new google.maps.FusionTablesLayer({
        query: {
          from:   MapsLib.house2011_id,
          select: MapsLib.locationColumn
        },
        styleId: 2,
        templateId: 2
      });
      MapsLib.records2011.setMap(map);
    }
  },
  
  clearSearch: function() {
    if (MapsLib.records2011 != null)
      MapsLib.records2011.setMap(null);
    if (MapsLib.records2001 != null)
      MapsLib.records2001.setMap(null);
    if (MapsLib.recordsICAR != null)
      MapsLib.recordsICAR.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);  
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);  

    //clear map markers
    if (MapsLib.markers) {
      for (i in MapsLib.markers) {
        MapsLib.markers[i].setMap(null);
      }
      google.maps.event.clearListeners(map, 'click');
      MapsLib.markers = [];
    } 

    MapsLib.map_bounds = new google.maps.LatLngBounds();
  },
  
  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;
    
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },
  
  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },
  
  query: function(selectColumns, whereClause, fusionTableId, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + fusionTableId);
    if (whereClause != '')
      queryStr.push(" WHERE " + whereClause);
  
    //console.log(queryStr.join(" "));
    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    //console.log(json);
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getDistrict2001Number: function(whereClause) {
    var selectColumns = "'District Number'";
    MapsLib.query(selectColumns, whereClause, MapsLib.house2001_id, "MapsLib.displayDistrict2001Number");
  },
  
  displayDistrict2001Number: function(json) { 
    MapsLib.handleError(json);
    if (json["rows"] != null) {
      var data = json["rows"];

      number2001 = data[0][0];
      MapsLib.renderSidebar("district2001_results", "<h4 class='map-2001'>2001 House District: " + MapsLib.numberSuffix(number2001) + "</h4>")
      MapsLib.getCandidates('2001', number2001);
    }
  },
  
  getDistrict2011Number: function(whereClause) {
    var selectColumns = "name, TOTPOP, CompactScr, ASIAN_VAP, BLACK_VAP, HISP_VAP, NHW_VAP";
    MapsLib.query(selectColumns, whereClause, MapsLib.house2011_id, "MapsLib.displayDistrict2011Number");
  },
  
  displayDistrict2011Number: function(json) { 
    MapsLib.handleError(json);
    if (json["rows"] != null) {
      var data = json["rows"];

      number2011 = data[0][0];
      MapsLib.renderSidebar("district2011_results", "<h4 class='map-2011'>2011 House District: " + MapsLib.numberSuffix(number2011) + "</h4>")
      MapsLib.getCandidates('2011', number2011);
    }
  },

  getDistrictICARNumber: function(whereClause) {
    var selectColumns = "name, TOTPOP, CompactScr, ASIAN_VAP, BLACK_VAP, HISP_VAP, NHW_VAP";
    MapsLib.query(selectColumns, whereClause, MapsLib.houseICAR_id, "MapsLib.displayDistrictICARNumber");
  },
  
  displayDistrictICARNumber: function(json) { 
    MapsLib.handleError(json);
    if (json["rows"] != null) {
      var data = json["rows"];

      numberICAR = data[0][0];
      MapsLib.renderSidebar("districtICAR_results", "<h4 class='map-icar'>ICAR House District: " + MapsLib.numberSuffix(numberICAR) + "</h4>")
      // MapsLib.getCandidates('icar', numberICAR);
    }
  },

  getCandidates: function(district_type, district_number) {
    var selectColumns = "firstname, lastname, seeking, latitude, longitude, district_2001, district_2011, district_icar, firstname AS '" + district_type + "'";
    var whereClause = "district_" + district_type + " = " + district_number;
    MapsLib.query(selectColumns, whereClause, MapsLib.candidates_id, "MapsLib.renderCandidates");
  },

  renderCandidates: function(json) {
    //console.log(json["columns"]);
    MapsLib.handleError(json);
    var data = json["rows"];
    var template = "";

    var district_type = '2001';
    if (json["columns"][8] == '2011')
      district_type = '2011';
    //console.log('district_type: ' + district_type);

    var results = $("#candidatesList" + district_type);
    results.hide().empty(); //hide the existing list and empty it out first

    if (data == null) {
      //clear results list
      results.append("<li><span class='lead'>No candidates found</span></li>");
    }
    else {
      var counter = 0;
      for (var row in data) {
        
        setTimeout((function(row) {
             return function(){
                MapsLib.addCandidateMarker(data[row], district_type);
             };
         })(row), counter * 0); //change this to 100 for cool animation!

        counter++;

        template = "\
          <p>\
            <strong>" + data[row][0] + " " + data[row][1] + "</strong>\
            <br />\
            " + data[row][2] + "\
          </p>"

        results.append(template);
      }
    }
    var resultCount = 0;
    if (data != undefined)
      resultCount = data.length;
    results.fadeIn(); //tada!
  },

  renderSidebar: function(selector, text) {
    $("#" + selector).fadeOut(function() {
      $("#" + selector).html(text);
    });
    $("#" + selector).fadeIn();
  },

  addCandidateMarker: function(record, district_type) {
    //console.log(record);
    var coordinate = new google.maps.LatLng(record[3],record[4])
    var marker = new google.maps.Marker({
      map: map,
      position: coordinate,
      animation: google.maps.Animation.DROP
    });
    MapsLib.markers.push(marker);

    var content = "\
        <div class='googft-info-window' style='font-family: sans-serif'>\
          <span class='lead'>" + record[0] + " " + record[1] + "</span>\
          <br /><strong>Seeking:</strong> " + record[2] + "\
          <br /><strong>2001 district:</strong> " + record[5] + "\
          <br /><strong>2011 district:</strong> " + record[6] + "\
          <br /><strong>ICAR district:</strong> " + record[7] + "\
        </div>";

    //add a click listener to the marker to open an InfoWindow,
    google.maps.event.addListener(marker, 'click', function(event) {
      if(MapsLib.infoWindow) MapsLib.infoWindow.close();

      MapsLib.infoWindow = new google.maps.InfoWindow( {
        position: coordinate,
        content: content
      });
      MapsLib.infoWindow.open(map);
    });

  },

  addMapBounds: function(whereClause) {
    var selectColumns = "geometry";
    MapsLib.query(selectColumns, whereClause, MapsLib.house2001_id, "MapsLib.setMapBounds");
    MapsLib.query(selectColumns, whereClause, MapsLib.house2011_id, "MapsLib.setMapBounds");
    MapsLib.query(selectColumns, whereClause, MapsLib.houseICAR_id, "MapsLib.setMapBounds");
  },

  setMapBounds: function(json) {
    MapsLib.handleError(json);
    var rows = json["rows"];

    for (var i in rows) {
      var newCoordinates = [];
      var geometries = rows[0][0]['geometries'];
      if (geometries) {
        for (var j in geometries) {
          MapsLib.constructNewCoordinates(geometries[j]);
        }
      } else {
        MapsLib.constructNewCoordinates(rows[0][0]['geometry']);
      }
      map.fitBounds(MapsLib.map_bounds);
    }
  },

  constructNewCoordinates: function(polygon) {
    var coordinates = polygon['coordinates'][0];
    for (var i in coordinates) {
      MapsLib.map_bounds.extend(new google.maps.LatLng(coordinates[i][1], coordinates[i][0]));
    }
  },
  
  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },
  
  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  },

  numberSuffix: function(d) {
    var lastDigit = d[d.toString().length-1];
    
    // Default to "th"
    var suffix = "th";
    switch(lastDigit) {
        case 1: suffix = "st";
        case 2: suffix = "nd";
        case 3: suffix = "rd";
    }
    return d + suffix;
  }
}