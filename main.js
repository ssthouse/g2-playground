$.getJSON('/assets/data/usa.geo.json', mapData => {
    var map = [];
    var features = mapData.features;
    // 获取出所有的地图区域名称
    for (var i = 0; i < features.length; i++) {
        var name = features[i].properties.name;
        map.push({
            "name": name
        });
    }
    var chart = new G2.Chart({
        container: 'mountNode',
        forceFit: true,
        height: window.innerHeight,
        animate: false,
        padding: 0
    });
    chart.tooltip({
        showTitle: false
    });
    // 同步度量
    chart.scale({
        longitude: {
            max: -66,
            min:-125,
            sync: true
        },
        latitude: {
            max: 50,
            min:24,
            sync: true,
            range: [0,1]
        },
    });
    chart.axis(false);
    chart.legend('trend', {
        position: 'left'
    });
    var mapDv = new DataSet.View().source(mapData, {
        type: 'GeoJSON'
    });
    mapDv.transform({
        type: 'map',
        callback: function(row) {
            row.code = row.properties.code;
            return row;
        }
    });
    var bgView = chart.view();
    bgView.source(mapDv);
    bgView.tooltip(false);
    bgView.polygon()
        .position('longitude*latitude')
        .style({
            fill: '#DDDDDD',
            stroke: '#b1b1b1',
            lineWidth: 0.5,
            fillOpacity: 0.85
        });

    $.getJSON('/assets/data/flights-airport.json', function (flights) {
         var countByAirport = {};
         var subFlights = [];
        // 计算飞机的起飞、降落数
        flights.forEach(function (flight) {
            var origin = flight.origin,
                destination = flight.destination;
            countByAirport[origin] = (countByAirport[origin] || 0) + 1;
            countByAirport[destination] = (countByAirport[destination] || 0) + 1;
        });
        $.getJSON('/assets/data/airport.json', function (airports) {
            // Only consider airports with at least one flight.
            var airportByIata = {};
            airports = airports.filter(function (airport) {
                airportByIata[airport.iata] = airport;
                if (countByAirport[airport.iata]) {
                    airport.count = countByAirport[airport.iata]; // 加入班次数量
                    airport.id = airport.iata;
                    return true;
                }
            });
            flights.forEach(function(flight) {
                var origin = airportByIata[flight.origin];
                var destination = airportByIata[flight.destination];
                flight.longitude = [origin.longitude, destination.longitude];
                flight.latitude = [origin.latitude, destination.latitude];
            });
            console.log('all data:')
            console.log(airports)
            var airView = chart.view();
            airView.source(airports);
            airView.point().position('longitude*latitude')
                .color('rgb(97,145,185)')
                .shape('circle')
                .style({
                    stroke: '#eee',
                    lineWidth: 1
                })
                .size('count', [3,3])
                .tooltip('iata*count');
            airView.point().position('longitude*latitude')
                .color('transparent')
                .shape('text')
                .style({
                    stroke: '#eee',
                    lineWidth: 1
                })
                .size('count', [3,3])
                .label('iata*count');
            var flightView = chart.view(); // 飞行路线
            flightView.tooltip(false);
            flightView.source(subFlights);
            flightView.edge()
                .position('longitude*latitude');
            chart.render();

            function getFlights(iata) {
                var rst = [];
                flights.forEach(function (flight) {
                    if (flight.origin === iata || flight.destination === iata) {
                        rst.push(flight);
                    }
                });
                return rst;
            }

            var preId;
            airView.on('plotmove', function (ev) {
                var records = airView.getSnapRecords({
                    x: ev.x,
                    y: ev.y
                });
                console.log('x: ' + ev.x + '   y: ' + ev.y)
                if(records.length){
                    console.log(records)
                    console.log({
                        x: ev.x,
                        y: ev.y
                    })

                    airView.getSnapRecords({
                        x: ev.x,
                        y: ev.y
                    });
                }
                if (records.length) {
                    var obj = records[0]._origin;
                    var iata = obj.iata;
                    if (preId !== iata) {
                        subFlights = getFlights(iata);
                        flightView.changeData(subFlights);
                        preId = iata;
                    }
                }
            });
            chart.on('plotleave', function () {
                if (subFlights.length) {
                    subFlights = [];
                    flightView.changeData([]);
                }
            });
        });
    });
});