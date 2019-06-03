var dataset = null;
var countries = [];
var previousCountry;
var colors = null; //["#FF0000", "#FFD700", "#FF8C00", "#7CFC00", "#228B22", "#8B4513", "#00FFFF", "#008080", "#0000FF", "#483D8B", "#FF00FF", "#4B0082", "#D2691E","#2F4F4F"];
var ddlCountries = document.getElementById('ddlCountries');
var ddlFuelType = document.getElementById('ddlFuelType');
var leg = document.getElementById('chklegend');
var figure = document.getElementById('chkfigure');
var tooltip = document.getElementById('chktooltip');
var sortBy = document.getElementById('ddlSortBy');

////draw the bar chart here
var margin = { top: 20, right: 60, bottom: 40, left: 30 };
const barWidth = 50; //every width of bar
const legendX = 885;
const maxsvgWidth = 940; //maximum SVG width
var svgHeight = 500;

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])

d3.csv("https://raw.githubusercontent.com/arahmancsd/power-plant-data/master/cleaned_dataset.csv", function (d) {
    d.capacity_mw = +d.capacity_mw;
    return d;
},
    function (error, data) {
        if (error) throw error;
        dataset = data;
        //load countries
        loadCountries();
        //draw chart
        updateChart(leg.checked, figure.checked, tooltip.checked);
        //load energy sources
        loadFuelType();
    });

function getEmptyElementIndexFromArray(array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].fuel == "")
            return i;
    }
    return -1;
}
//load Countries
function countryFocused(d) {
    if (d.selectedIndex > 0)
        previousCountry = d.value;
}
function loadFuelType() {
    if (ddlFuelType.options.length < 1) {
        //find distinct values from data array based of fuel1 column of the csv file
        var flags = [], output = [], i;
        for (i = 0; i < dataset.length; i++) {
            if (flags[dataset[i].fuel1]) continue;
            flags[dataset[i].fuel1] = true;
            output.push(
                dataset[i].fuel1
            );
        }

        var blankIndex = output.indexOf("");
        if (blankIndex!=-1)
            output.splice(blankIndex, 1);
        //sort by fuel (alphabetically)
        output.sort();
        //fill the drop down list
        var firstOption = document.createElement('option');
        firstOption.value = "-Energy source-";
        firstOption.innerHTML = "-Energy source-";
        ddlFuelType.appendChild(firstOption);
        var opt = null;
        for (i = 0; i < output.length; i++) {
            opt = document.createElement('option');
            opt.value = output[i];
            opt.innerHTML = output[i];
            ddlFuelType.appendChild(opt);
        }
    }
}
function loadCountries() {
    if (ddlCountries.options.length < 1) {
        //find distinct values from data array based of fuel1 column of the csv file
        var flags = [], output = [], i;
        for (i = 0; i < dataset.length; i++) {
            if (flags[dataset[i].country]) continue;
            flags[dataset[i].country] = true;
            output.push(
                {
                    country: dataset[i].country,
                    country_long: dataset[i].country_long
                });
        }

        //sort by fuel (alphabetically)
        output = output.sort(function (a, b) {
            if (a.country < b.country) { return -1; }
            if (a.country > b.country) { return 1; }
            return 0;
        });

        //fill the drop down list
        var firstOption = document.createElement('option');
        firstOption.value = "(All)";
        firstOption.innerHTML = "(All)";
        ddlCountries.appendChild(firstOption);
        var opt = null;
        for (i = 0; i < output.length; i++) {
            opt = document.createElement('option');
            opt.value = output[i].country
            opt.innerHTML = output[i].country_long + "  (" + output[i].country + ")";
            ddlCountries.appendChild(opt);
        }
    }
}
function updateChart() {
    ddlFuelType.selectedIndex = 0;
    //if compare is checked then perform comparing
    if (chkCompare.checked) {
        addCountryToList();
        compareCategory();
        return;
    }

    if (ddlCountries.selectedIndex > 0)
        $('#htitle').text(ddlCountries.options[ddlCountries.selectedIndex].text + ' energy source in megawatt');
    else
        $('#htitle').text('Global energy source in megawatt');

    //loop through data and filter based on selected country
    var newdata = new Array();
    if (ddlCountries.selectedIndex > 0) {
        for (var j = 0; j < dataset.length; j++) {
            if (dataset[j].country == ddlCountries.value) {
                newdata.push(
                    {
                        fuel: dataset[j].fuel1,
                        capacity_mw: dataset[j].capacity_mw
                    });
            }
        }

        //show the checkbox to compare
        $("#divchkCompare").show();
    }
    else {
        for (var j = 0; j < dataset.length; j++) {
            newdata.push(
                {
                    fuel: dataset[j].fuel1,
                    capacity_mw: dataset[j].capacity_mw
                });
        }
        //$("#divchkCompare").hide();
    }

    //find distinct values from data array in terms of fuel1 column
    var flags = [], output = [], l = newdata.length, i;
    for (i = 0; i < newdata.length; i++) {
        if (flags[newdata[i].fuel]) continue;
        flags[newdata[i].fuel] = true;
        output.push(
            {
                fuel: newdata[i].fuel,
                capacity_mw: null
            });
    }
    ////sum all capacity_mw values based on fuel1 column distinct values
    for (i = 0; i < output.length; i++) {//loop through new generated array of fuel1
        for (f = 0; f < newdata.length; f++) {//loop through all arrays and find equivalent items
            if (output[i].fuel == newdata[f].fuel) {
                if (!isNaN(parseFloat(newdata[f].capacity_mw))) {
                    output[i].capacity_mw += parseInt(newdata[f].capacity_mw, 10);
                }
            }
        }
    }
    ////fill the blank item with (Blank) text
    var emptyItemIndex = getEmptyElementIndexFromArray(output);
    if (emptyItemIndex > -1)
        output[emptyItemIndex].fuel = "(Blank)";

    //sort output array
    sortArray(output);

    const numberOfBars = output.length; //total bars

    var graphWidth = ((numberOfBars * barWidth) > 599) ? (maxsvgWidth - margin.left - margin.right) : (numberOfBars * barWidth);
    var graphHeight = (svgHeight - margin.top - margin.bottom);

    //clear SVG before adding
    d3.select("svg").remove();

    //create svg element in div data
    var svg = d3.select('#divdata').append('svg')
        .attr("width", maxsvgWidth)
        .attr("height", svgHeight)
        .attr("class", "bar-chart")

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    //create x and y range and domain
    var x = d3.scaleBand()
        .range([0, graphWidth])
        .padding(0.1);

    var y = d3.scaleLinear()
        .range([graphHeight, 0]);

    //bar colors = 14 bars at max
    var color = d3.scaleOrdinal().range(generateRandomColors(1, generateRandomColors(output.length)));

    ////arrange the domain of both x and y axis
    x.domain(output.map(function (d) { return d.fuel; }));
    y.domain([0, d3.max(output, function (d) { return d.capacity_mw; })]);

    svg.call(tip);

    //past bars in seperate g (group)
    g.append("g").selectAll("g")
        .data(output)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) { return x(d.fuel); })
        .attr("width", x.bandwidth())
        .attr("height", function (d) { return graphHeight - y(d.capacity_mw); })
        .style("fill", function (d, i) { return color(i); })
        .on("mouseover", function (d) {
            if (tooltip.checked) {
                tip.html("Energy source: <span><strong>" + d.fuel +
                    "</strong></span><br/>Capacity in mw: <span><strong>" + addCommas(d.capacity_mw) + "</strong></span>");
                tip.show();
            }
            //draw line
            line = g.append('line')
                .attr('id', 'limit')
                .attr('x1', 0)
                .attr('y1', y(d.capacity_mw))
                .attr('x2', graphWidth)
                .attr('y2', y(d.capacity_mw))
        })
        .on("mouseout", function (d) {
            tip.hide();
            //remove line
            svg.selectAll('#limit').remove();
        })
        .attr("y", function (d) {
            return y(0);
        })
        .transition()
        .duration(1000)
        .attr("y", function (d) { return y(d.capacity_mw); })

    if (leg.checked) {
        var legend = g.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(output)
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(" + legendX + "," + ((i * 22) - 10) + ")"; });

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", function (d, i) { return color(i); })

        legend.append("text")
            .attr("x", -10)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function (d) { return d.fuel; });
    }

    if (figure.checked) {
        //show the text in the middle of every bar
        g.append("g").selectAll(".text")
            .data(output)
            .enter()
            .append("text")
            .attr("class", "bartextLabels")
            .attr("x", (function (d) { return x(d.fuel) + x.bandwidth() / 2; }))
            .attr("dy", ".71em")
            .attr("text-anchor", "middle")
            .text(function (d) { return addCommas(d.capacity_mw); })
            .transition()
            .duration(1000)
            .attr("y", function (d) { return y(d.capacity_mw); })
    }
    //draw x axis
    g.append("g")
        .attr("transform", "translate(0," + graphHeight + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", graphWidth)
        .attr("y", 25)
        .attr("dy", "0.32em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text("Fuel type");

    //draw y axis
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(null, "s"))
        .append("text")
        .attr("x", 2)
        .attr("y", -10)
        .attr("dy", "0.32em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text("Capacity in meggawatt");
}
function updateChartByEnergySource() {
    ddlCountries.selectedIndex = 0;
    chkCompare.checked = false;
    $("#divCountriesToCompare").hide();

    if (ddlFuelType.selectedIndex > 0)
        $('#htitle').text('Global ' + ddlFuelType.options[ddlFuelType.selectedIndex].text + ' capacity in megawatt');
    else
        $('#htitle').text('Global energy source in megawatt');

    if (ddlFuelType.selectedIndex == 0) {
        updateChart();
        return;
    }
    
    //loop through data and filter based on selected country
    var newdata = new Array();
    if (ddlFuelType.selectedIndex > 0) {
        for (var j = 0; j < dataset.length; j++) {
            if (dataset[j].fuel1 == ddlFuelType.value) {
                newdata.push(
                    {
                        fuel: dataset[j].fuel1,
                        country: dataset[j].country,
                        capacity_mw: dataset[j].capacity_mw
                    });
            }
        }
    }
    //find distinct values from data array in terms of fuel1 column
    var flags = [], output = [], l = newdata.length, i;
    for (i = 0; i < newdata.length; i++) {
        if (flags[newdata[i].country]) continue;
        flags[newdata[i].country] = true;
        output.push(
            {
                country: newdata[i].country,
                capacity_mw: null
            });
    }
    ////sort by fuel (alphabetically)
    newdata.sort(function (a, b) {
        if (a.fuel < b.fuel) { return -1; }
        if (a.fuel > b.fuel) { return 1; }
        return 0;
    });
    
    ////sum all capacity_mw values based on fuel1 column distinct values
    for (i = 0; i < output.length; i++) {//loop through new generated array of country
        for (f = 0; f < newdata.length; f++) {//loop through all arrays and find equivalent items
            if (output[i].country == newdata[f].country && newdata[f].fuel == ddlFuelType.value) {
                if (!isNaN(parseFloat(newdata[f].capacity_mw))) {
                    output[i].capacity_mw += parseInt(newdata[f].capacity_mw, 10);
                }
            }
        }
    }

    //sort output
    sortArray(output);

    const numberOfBars = output.length; //total bars
    var graphWidth = ((numberOfBars * barWidth) > 599) ? (maxsvgWidth - margin.left - margin.right) : (numberOfBars * barWidth);
    var graphHeight = (svgHeight - margin.top - margin.bottom);

    //clear SVG before adding
    d3.select("svg").remove();

    //create svg element in div data
    var svg = d3.select('#divdata').append('svg')
        .attr("width", maxsvgWidth)
        .attr("height", svgHeight)
        .attr("class", "bar-chart")

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    //create x and y range and domain
    var x = d3.scaleBand()
        .range([0, graphWidth])
        .padding(0.1);

    var y = d3.scaleLinear()
        .range([graphHeight, 0]);

    svg.call(tip);

    //bar colors = 14 bars at max
    var color = d3.scaleOrdinal().range(generateRandomColors(1, generateRandomColors(output.length)));

    ////arrange the domain of both x and y axis
    x.domain(output.map(function (d) { return d.country; }));
    y.domain([0, d3.max(output, function (d) { return d.capacity_mw; })]);

    //past bars in seperate g (group)
    g.append("g").selectAll("g")
        .data(output)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) { return x(d.country); })
        .attr("width", x.bandwidth())
        .attr("height", function (d) { return graphHeight - y(d.capacity_mw); })
        .style("fill", function (d, i) { return color(i); })
        .on("mouseover", function (d) {
            if (tooltip.checked) {
                tip.html("Country: <span><strong>" + d.country +
                    "</strong></span><br/>Capacity in mw: <span><strong>" + addCommas(d.capacity_mw) + "</strong></span>");
                tip.show();
            }
            //draw line
            line = g.append('line')
                .attr('id', 'limit')
                .attr('x1', 0)
                .attr('y1', y(d.capacity_mw))
                .attr('x2', graphWidth)
                .attr('y2', y(d.capacity_mw))

        })
        .on("mouseout", function (d) {
            tip.hide();
            //remove line
            svg.selectAll('#limit').remove();

        })
        .attr("y", function (d) {
            return y(0);
        })
        .transition()
        .duration(1000)
        .attr("y", function (d) { return y(d.capacity_mw); })


    if (leg.checked) {
        var legend = g.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(output)
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(" + legendX + "," + ((i * 22) - 10) + ")"; });

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", function (d, i) { return color(i); })

        legend.append("text")
            .attr("x", -10)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function (d) { return d.country; });
    }
    //draw x axis
    g.append("g")
        .attr("transform", "translate(0," + graphHeight + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("y", 0)
        .attr("transform", "rotate(-90)");
    //draw y axis
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(null, "s"))
        .append("text")
        .attr("x", 2)
        .attr("y", -10)
        .attr("dy", "0.32em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text("capacity in meggawatt");
}
function activateddlCompare(c) {
    ddlFuelType.selectedIndex = 0;
    if (c.checked) {
        $('#htitle').text('Comparative energy source in megawatt');
        addCountryToList();
        compareCategory();
        $("#divCountriesToCompare").show();
    }
    else {
        $("#divCountriesToCompare").hide();
        updateChart();
    }
}
//compare part
function compareCategory() {
    if (countries.length < 2) {
        return;
    }
    var newdata = new Array();
    $.each(countries, function (i, v) {
        for (var j = 0; j < dataset.length; j++) {
            if (dataset[j].country == v) {
                newdata.push(
                    {
                        country: dataset[j].country,
                        country_long: dataset[j].country_long,
                        fuel: dataset[j].fuel1,
                        capacity_mw: dataset[j].capacity_mw
                    });
            }
        }
    });
    ////sort by country (alphabetically)
    newdata.sort(function (a, b) {
        if (a.country < b.country && a.fuel < b.fuel) { return -1; }
        if (a.country > b.country && a.fuel > b.fuel) { return 1; }
        return 0;
    });

    var outputCountryFuel = newdata.filter(function (a) {
        var key = a.country + '|' + a.fuel;
        if (!this[key]) {
            this[key] = true;
            return true;
        }
    }, Object.create(null));
    var total = 0;
    ////sum all capacity_mw values based on fuel1 column distinct values
    for (i = 0; i < outputCountryFuel.length; i++) {//loop through new generated array of fuel1
        for (f = 0; f < newdata.length; f++) {//loop through all arrays and find equivalent items
            if (outputCountryFuel[i].fuel == newdata[f].fuel && outputCountryFuel[i].country == newdata[f].country) {
                if (!isNaN(parseFloat(newdata[f].capacity_mw))) {
                    total += parseFloat(newdata[f].capacity_mw, 2);

                }

            }
        }
        outputCountryFuel[i].capacity_mw = total;
        total = 0;
    }
    //find distinct countries - This is the records for final output
    flags = [], outputCountries = [], l = outputCountryFuel.length;
    for (i = 0; i < l; i++) {
        if (flags[outputCountryFuel[i].country]) continue;
        flags[outputCountryFuel[i].country] = true;
        outputCountries.push(
            {
                country: outputCountryFuel[i].country
            });
    }

    //now fill array from countries and capacity
    output = [];
    for (i = 0; i < outputCountries.length; i++) {
        //add countries
        output.push(
            {
                country: outputCountries[i].country,
                Biomass: null,
                Coal: null,
                Cogeneration: null,
                Gas: null,
                Geothermal: null,
                Hydro: null,
                Nuclear: null,
                Oil: null,
                Other: null,
                Solar: null,
                Waste: null,
                WaveandTidal: null,
                Wind: null,
            });
    }
    //console.log(output);
    sortArray(output);
    for (i = 0; i < output.length; i++) {
        for (j = 0; j < outputCountryFuel.length; j++) {
            if (output[i].country == outputCountryFuel[j].country) {
                output[i][outputCountryFuel[j].fuel] = outputCountryFuel[j].capacity_mw;
            }
        }
    }

    //clear SVG before adding
    d3.select("svg").remove();

    //create svg element in div data

    var graphWidth = maxsvgWidth - margin.left - margin.right;
    var graphHeight = svgHeight - margin.top - margin.bottom;

    var svg = d3.select('#divdata').append("svg")
        .attr("width", maxsvgWidth)
        .attr("height", svgHeight)
        .attr("class", "bar-chart")

    var g = svg.append("g").attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    var x0 = d3.scaleBand()
        .rangeRound([0, graphWidth])
        .paddingInner(0.1);

    var x1 = d3.scaleBand()
        .padding(0.05);

    var y = d3.scaleLinear()
        .rangeRound([graphHeight, 0]);

    var z = d3.scaleOrdinal()
        .range(generateRandomColors(1, generateRandomColors(14)));
    svg.call(tip);
    //Find the energy sources and make them title
    let res = output.reduce((acc, curr) => {
        Object.keys(curr).forEach(
            (k, i) => !acc[k] && i > 0 && curr[k] && (acc[k] = true)
        );
        return acc;
    }, {});
    keys = Object.keys(res);

    x0.domain(output.map(function (d) { return d.country; }));
    x1.domain(keys).rangeRound([0, x0.bandwidth()]);
    y.domain([0, d3.max(output, function (d) { return d3.max(keys, function (key) { return d[key]; }); })]).nice();

    var x1b = x1.bandwidth();
    if (isNaN(x1b))
        x1b = 0;
    g.append("g")
        .selectAll("g")
        .data(output)
        .enter().append("g")
        .attr("transform", function (d) { return "translate(" + x0(d.country) + ",0)"; })
        .selectAll("rect")
        .data(function (d) { return keys.map(function (key) { return { key: key, value: d[key] }; }); })
        .enter().append("rect")
        .attr("x", function (d) {
            if (!isNaN(parseFloat(x1(d.key))))
                return x1(d.key);
            else return 0;
        })
        .attr("width", x1b)
        .attr("class", function (d) {
            if (d.value == null || isNaN(parseFloat(y(d.value)))) return "barZeroHeight";
            else return "bar";

        })
        .attr("height", function (d) {
            if (!isNaN(parseFloat(y(d.value))))
                return graphHeight - y(d.value);
            else
                return 0;
        })
        .style("fill", function (d, i) { return z(i); })
        .attr("y", function (d) {
            return y(0);
        })
        .on("mouseover", function (d) {
            if (tooltip.checked) {
                tip.html("Capacity (mw): <span><strong>" + addCommas(d.value) + "</strong></span>");
                tip.show();
            }
            //draw line
            line = g.append('line')
                .attr('id', 'limit')
                .attr('x1', 0)
                .attr('y1', y(d.value))
                .attr('x2', graphWidth)
                .attr('y2', y(d.value))

        })
        .on("mouseout", function (d) {
            tip.hide();
            //remove line
            svg.selectAll('#limit').remove();
        })
        .transition()
        .duration(1000)
        .attr("y", function (d) {
            if (!isNaN(parseFloat(y(d.value))))
                return y(d.value);
            else
                return 0;
        })

    g.selectAll("rect.barZeroHeight").remove();
    //reposition rectangles after removing rect with zero height

    //x axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + graphHeight + ")")
        .call(d3.axisBottom(x0))
    //y axis
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(null, "s"))
        .append("text")
        .attr("x", 2)
        .attr("y", y(y.ticks().pop()) + 0.5)
        .attr("dy", "0.32em")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text("capacity in megawatt");

    if (leg.checked) {
        var legend = g.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(keys.slice().reverse())
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(50," + ((i * 20) - 10) + ")"; });


        legend.append("rect")
            .attr("x", graphWidth - 19)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", function (d, i) { return z(i); });

        legend.append("text")
            .attr("x", graphWidth - 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(function (d) { return d; })
    }
}
function addCountryToList() {
    if (ddlCountries.selectedIndex > 0) {
        var country = ddlCountries.value;
        if (countries.indexOf(country) == -1) {
            countries.push(country);

            //add the lael
            var li = "<li class='list-group-item' id='" + country + "'> " + country;
            li += " <button id='" + country + "' type='button' class='close' aria-label='Close' onclick='removeCountryFromComparasion(this);'>";
            li += "<span aria-hidden='true'>&times;</span> ";
            li += "</button> ";
            li += "</li>";
            $("#ulx").append(li);
        }
    }
    if (countries.length > 0)
        $('#numberOfCountries').text('countries added ' + countries.length);
    else
        $('#numberOfCountries').text('add countries');
}
function removeCountryFromComparasion(c) {
    countries = jQuery.grep(countries, function (value) {
        return value != c.id;
    });
    $('#' + c.id).remove();
    if (countries.length > 0)
        $('#numberOfCountries').text('countries added ' + countries.length);
    else
        $('#numberOfCountries').text('add countries');
    compareCategory();
}
function addCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function updateChartOnChecked() {
    if (ddlFuelType.selectedIndex > 0)
        updateChartByEnergySource();
    else if (chkCompare.checked)
        compareCategory();
    else
        updateChart();
}
function sortArray(output) {
    ////sort by fuel (alphabetically)
    if (sortBy.value == 1) {
        output.sort(function (a, b) {
            return b.capacity_mw - a.capacity_mw;
        });
    }
    else if (sortBy.value == 2)
    {
        output.sort(function (a, b) {
            if (a.country < b.country) return -1;
            if (a.country > b.country) return 1;
            return 0;
        });
    }
    else if (sortBy.value == 3) {
        output.sort(function (a, b) {
            if (a.fuel < b.fuel) return -1;
            if (a.fuel > b.fuel) return 1;
            return 0;
        });
    }
}