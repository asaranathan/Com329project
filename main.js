d3.json("California_County_Boundaries.geojson").then((geojson, err1) => {
    console.log(geojson);
    d3.dsv(",", "RealEstate_California.csv", (d) => {
        return {
            county: d.county,
            homeType: d.homeType,
            latitude: +d.latitude,
            longitude: +d.longitude,
            streetAddress: d.streetAddress,
            city: d.city,
            price: +d.price,
            pricePerSquareFoot: +d.pricePerSquareFoot,
            homeType: d.homeType,
            garageSpaces: +d.garageSpaces,
        };
    }).then((data, err2) => {
        console.log(data);


        // I am going to center the map around CA.
        // Longitude needs to be negative because we are west of the prime meridian
        var map = L.map('map').setView([35.7783, -118.4179], 6); // Centered on California

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        //Because there are so many houses in this dataset for California, I am using MarkerClusterGroup
        //This is a functionality of Leaflet that makes clusters allowing for people to get a picture of the data even when zoomed out
        //Allegedly its also faster
        //Shoutout leaflet
        //https://leafletjs.com/2012/08/20/guest-post-markerclusterer-0-1-released.html

        //This line creates the cluster group. After this I have to add the actual points to the cluster
        var markers = L.markerClusterGroup();

        // This adds the points to the clusterGroup. Loops thru the data and adds each point to the group
        data.forEach(function (point) {
            //if statement checks for if the row has a coordinate
            if (point.latitude && point.longitude) {
                var marker = L.marker([point.latitude, point.longitude]).bindPopup(`${point.streetAddress}, ${point.city}</b><br>Price: $${point.price.toLocaleString()}<br>Home Type: ${point.homeType}`);
                markers.addLayer(marker);
            }
        });

        //adds the markers to the leaflet map
        map.addLayer(markers);


        //incorporating the style function into the geoJson here
        //if the region is coastal, blue
        //

        function getColor(d) {
            return d === "Coastal" ? 'blue' :
                d === "Inland" ? 'tan' :
                'lightgreen';
        }

        L.geoJSON(geojson, {
            style: function (feature) {
                return {
                    fillColor: getColor(feature.properties.AdminRegion),
                    weight: 2,
                    opacity: 1,
                    color: 'white', // Outline color
                    dashArray: '3',
                    fillOpacity: 0.7,
                };
            },
            onEachFeature: function (feature, layer) {
                layer.on({
                    mouseover: function (e) {
                        info.update(feature.properties);
                    },
                    mouseout: function (e) {
                        info.update();
                    },
                    click: zoomToFeature
                });

            }
        }).addTo(map);


        var info = L.control();


        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };

        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            this._div.innerHTML = '<h4>[Adi S and Jordan M COM 329 Project] [Data: https://www.kaggle.com/datasets/yellowj4acket/real-estate-california] Hover over a county to see the county name & region, click on markers to get info about the property for sale (first 6 months of 2021). There is also a lolipop chart to the right containing info about how much of our data is of certain property types. </h4>' +  (props ?
                '<b>' + props.CountyName + '</b><br />' + props.AdminRegion + ''
                : 'Hover over a county');
        };

        info.addTo(map);

        function highlightFeature(e) {
            var layer = e.target

            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });

            layer.bringToFront();
            info.update(layer.Feature.properties);

        }

        function resetHighlight(e) {
            geojson.resetStyle(e.target);
            info.update();

        }

        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }


        var legend = L.control({position: 'bottomright'});

        legend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend'),
                categories = ["Coastal", "Southern", "Inland"],
                labels = [];

            for (var i = 0; i < categories.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(categories[i]) + '"></i> ' +
                    categories[i] + '<br>';
            }

            return div;
        };


        legend.addTo(map);



        //Need to transform my data to make datasets where I have number of occurences
        //Making a pie chart
        //Update: After reading about issues of interpretation of pie charts, deciding between lolipop plot or bar plot. leaning towards lolipop plot
        //Going to use the function reduce
        //https://www.freecodecamp.org/news/how-to-use-javascript-array-reduce-method/

        const groupedItems1 = data.reduce((accumulator, item) => {
            accumulator[item.homeType] = (accumulator[item.homeType] || 0) + 1;
            return accumulator;
        }, {});


        console.log(groupedItems1);

        // Dont need the below comment anymore

        // const groupedItems2 = data.reduce((accumulator, item) => {
        //     accumulator[item.garageSpaces] = (accumulator[item.garageSpaces] || 0) + 1;
        //     return accumulator;
        // }, {});
        //
        // console.log(groupedItems2);

        //deciding on making a lolipop plot

        //in order to use lolipop plot, groupedItems1 needs to be an array. other it wont be able to accessed, to my understanding
        const groupedArray = Object.entries(groupedItems1).map(([homeType, count]) => ({
            homeType: homeType,
            count: count
        }));

        const margin = {top: 100, right: 100, bottom: 100, left: 100},
            width = 500
            height = 500

        const radius = Math.min(width, height) / 2 - margin;

        const svg = d3.select("#lollipop").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const y = d3.scaleLinear()
            .domain([0, d3.max(groupedArray, d => d.count)])
            .range([ height, 20]);

        svg.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .style("text-anchor", "end")
            .style("font-size", "12px")
            .text("Count of Home Types");

        const x = d3.scaleBand()
            .range([ 0, width ])
            .domain(groupedArray.map(d => d.homeType))
            .padding(1);


        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(0,0)rotate(-45)")
            .style("text-anchor", "end")


        svg.selectAll("myline")
            .data(groupedArray)
            .enter()
            .append("line")
            .attr("x1", function(d) { return x(d.homeType); })
            .attr("x2", function(d) { return x(d.homeType); })
            .attr("y1", function(d) { return y(d.count); })
            .attr("y2", y(0))
            .attr("stroke", "black")

        svg.selectAll("mycircle")
            .data(groupedArray)
            .join("circle")
            .attr("cx", function(d) { return x(d.homeType); })
            .attr("cy", function(d) { return y(d.count); })
            .attr("r", "4")
            .style("fill", "blue")
            .attr("stroke", "black")

    });


});