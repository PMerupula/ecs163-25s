/* 
 * Global variables, names and functionalities defined below:
 * 
 * 
 */

let globalData = [];
// let countryGeometries = [];
// let selectedMetric = "count"; // Default metric sent to the number of terrorist attacks
// let colorScale;

// const window_height = window.innerHeight;
// const window_width = window.innerWidth;

// let projection, path;

function metricLabel(metric)
{
    switch(metric)
    {
        case "count":
            return "Number of Attacks";
        case "num_deaths":
            return "Number of Fatalities";
        case "num_injuries":
            return "Number of Injuries";
        case "property_damage":
            return "Property Damage (USD)";
        default:
            return metric;
    }
}

function parseData(rawData) 
{
    return rawData.map(d => {
        return {
            year: +d.iyear,
            month: +d.imonth || 0,
            day: +d.iday || 0,
            extended: +d.extended || 0,

            // Location
            latitude: +d.latitude || null,
            longitude: +d.longitude || null,
            country_code: d.country,
            country_text: d.country_txt,
            region_code: d.region,
            region_text: d.region_txt,
            state: d.provstate || null,
            city: d.city || null,
            in_city: d.vicinity === "0" ? "Yes" : "No",

            // Terrorists
            criteria_one: d.crit1, //Does the terrorist action aim to achieve a political, economic, religious, or social goal?
            criteria_two: d.crit2, //Was there evidence of intention to intimidate/convey a message to an audience outside the victims?
            criteria_three: d.crit3, //Did this violate international humantiarian law?
            terrorism_doubted: d.doubtterr === "1" ? "Yes" : "No",
            alternative_designation: d.alternative_text,
            terrorist_group: d.gname,
            terrorist_subgroup: d.gsubname,
            num_terrorists: d.nperps,
            num_captured_terrorists: d.nperpcap,
            claimed_responsibility: d.claimed === "1" ? "Yes" : "No",
            num_terrorist_deaths: d.nkillter,

            // Victims
            target_type: d.targtype1_txt,
            target_subtype: d.target_subtype1_txt,
            num_deaths: d.nkill || 0,
            num_injuries: d.nwound || 0,
            property_damage: d.propvalue,
            ransom: d.ransom == "1" ? "Yes" : "No/Unknown",


            // Attack
            attack_type: d.attacktype1_txt,
            suicide: d.suicide === "1" ? "Yes" : "No",
            outcome: d.success === "1" ? "Success" : "Failure",
            weapon_type: d.weaptype1_txt,
            weapon_subtype: d.weapsubtype1_txt,

        };
    }).filter(d => !isNaN(d.year));
}

function aggregateByCountry(data, metricKey)
{
    const rolledUp = d3.rollup(
        data, 
        v => d3.sum(v, d => d[metricKey] || 0),
        d => d.country
    );
    return new Map(rolledUp);
}

function aggregateByRegion(data, metricKey)
{
    const rolledUp = d3.rollup(
        data, 
        v => d3.sum(v, d => d[metricKey]), 
        d => d.region
    );
    return new Map(rolledUp);
}


// /* Below are the functions and declarations for the choropleth map visualization.
//  *
//  *
//  * 
//  */

// function setUpChoropleth()
// {
//     const svg = d3.select("svg"),
//     width = +svg.attr("width"),
//     height = +svg.attr("height");

//     const path = d3.geoPath();
//     const projection = d3.geoMercator()
//         .scale(150)
//         .translate([width / 2, height / 2]);

//     const data = new Map();
//     colorScale = d3.scaleThreshold()
//     .domain([10000, 100000, 1000000, 1000000, 100000, 2000000])
//     .range(d3.schemeBlues[7]);

    
// }

// function drawChoropleth(svg, countries, path, colorScale, metricMap) {

//     // Define mouse events
//     function mouseOver(event, d) {
//         d3.selectAll(".country")
//             .transition()
//             .duration(150)
//             .style("opacity", 0.4);

//         d3.select(this)
//             .transition()
//             .duration(150)
//             .style("opacity", 1)
//             .style("stroke", "#000");
//     }

//     function mouseLeave(event, d) {
//         d3.selectAll(".country")
//             .transition()
//             .duration(150)
//             .style("opacity", 0.85);

//         d3.select(this)
//             .transition()
//             .duration(150)
//             .style("stroke", "#333");
//     }

//     // Draw each country
//     svg.append("g")
//         .selectAll("path")
//         .data(countries)
//         .join("path")
//         .attr("d", path)
//         .attr("fill", d => {
//             const val = metricMap.get(+d.id);
//             return val != null ? colorScale(val) : "#ccc";
//         })
//         .attr("class", "country")
//         .attr("stroke", "#333")
//         .attr("stroke-width", 0.5)
//         .style("opacity", 0.85)
//         .on("mouseover", mouseOver)
//         .on("mouseleave", mouseLeave);
// }

// Promise.all([
//     d3.json("countries-110m.json"),
//     d3.csv("globalterrorismdb_0718dist.csv").then(rawData => {
//         globalData = parseData(rawData);
//         console.log("Data successfully loaded");
//         return globalData;
//     })
// ]).then(([world, terrorismData]) => {
//     countryGeometries = topojson.feature(world, world.objects.countries).features;

//     // Set up the SVG canvas
//     const panel = document.getElementById("mapPanel");
//     const width = panel.clientWidth || 960;
//     const height = panel.clientHeight || 600;

//     d3.select("#mapPanel").selectAll("svg").remove(); // Clear previous SVG

//     const svg = d3.select("#mapPanel")
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height);

//     projection = d3.geoMercator()
//         .fitSize([width, height], { type: "FeatureCollection", features: countryGeometries });

//     path = d3.geoPath().projection(projection);

//     // Draw the choropleth map
//     setUpChoropleth();
// }).catch(err => {
//     console.error("Error loading data:", err);
// }
//     );

// Promise.all([
//     d3.json("countries-110m.json"),
//     d3.csv("globalterrorismdb_0718dist.csv")
// ]).then(([worldData, rawData]) => {
//     globalData = parseData(rawData); // assume this function exists and is correct

//     const metricKey = "count"; // could be "count", "num_deaths", etc.
//     const metricMap = d3.rollup(
//         globalData,
//         v => metricKey === "count" ? v.length : d3.sum(v, d => d[metricKey] || 0),
//         d => +d.country_code
//     );

//     setupMapCanvas(worldData, metricMap, metricKey);
// }).catch(error => {
//     console.error("Error loading data:", error);
// });


// // Sets up the map canvas and rendering
// function setupMapCanvas(worldData, metricMap, metricKey) {
//     const container = document.getElementById("mapPanel");
//     const width = container.clientWidth || 800;
//     const height = container.clientHeight || 600;

//     // Remove existing SVG if rerun
//     d3.select(container).selectAll("svg").remove();

//     const svg = d3.select(container)
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height);

//     // ✅ Convert TopoJSON to GeoJSON
//     const geo = topojson.feature(worldData, worldData.objects.countries);
//     const countries = geo.features;

//     if (!countries || countries.length === 0) {
//         console.error("No countries found in TopoJSON.");
//         return;
//     }

//     // ✅ Check geometry validity
//     const hasInvalidCountry = countries.some(c => !c.geometry || !c.geometry.coordinates || c.geometry.coordinates.length === 0);
//     if (hasInvalidCountry) {
//         console.warn("Some countries have invalid geometry and may cause NaN paths.");
//     }

//     // ✅ Projection setup with error handling
//     let projection;
//     try {
//         projection = d3.geoMercator().fitSize([width, height], geo);
//     } catch (e) {
//         console.error("Projection fitSize failed:", e);
//         return;
//     }

//     const path = d3.geoPath().projection(projection);

//     const maxValue = d3.max(Array.from(metricMap.values()));
//     const colorScale = d3.scaleThreshold()
//         .domain([10, 100, 1000, 5000, 20000, maxValue])
//         .range(d3.schemeBlues[7]);

//     drawChoropleth(svg, countries, path, colorScale, metricMap);
//     createLegend(svg, colorScale);

//     console.log("✅ Map drawn with", countries.length, "countries");
// }

// // Draws the choropleth map
// function drawChoropleth(svg, countries, path, colorScale, metricMap) {
//     function mouseOver(event, d) {
//         d3.selectAll(".country")
//             .transition()
//             .duration(150)
//             .style("opacity", 0.4);

//         d3.select(this)
//             .transition()
//             .duration(150)
//             .style("opacity", 1)
//             .style("stroke", "black");
//     }

//     function mouseLeave(event, d) {
//         d3.selectAll(".country")
//             .transition()
//             .duration(150)
//             .style("opacity", 0.85);

//         d3.select(this)
//             .transition()
//             .duration(150)
//             .style("stroke", "#333");
//     }

//     svg.append("g")
//         .selectAll("path")
//         .data(countries)
//         .join("path")
//         .attr("d", path)
//         .attr("fill", d => {
//             const val = metricMap.get(+d.id);
//             return val != null ? colorScale(val) : "#ccc";
//         })
//         .attr("class", "country")
//         .attr("stroke", "#333")
//         .attr("stroke-width", 0.5)
//         .style("opacity", 0.85)
//         .on("mouseover", mouseOver)
//         .on("mouseleave", mouseLeave);
// }

// // Creates a basic legend for the color scale
// function createLegend(svg, colorScale) {
//     const legendWidth = 260;
//     const legendHeight = 10;
//     const spacing = 40;
//     const legendData = colorScale.range().map((color, i) => {
//         const domain = colorScale.domain();
//         const lower = i === 0 ? 0 : domain[i - 1];
//         const upper = domain[i] || "";
//         return { color, label: `${lower} - ${upper}` };
//     });

//     const legend = svg.append("g")
//         .attr("transform", `translate(30, 30)`);

//     legend.selectAll("rect")
//         .data(legendData)
//         .join("rect")
//         .attr("x", (d, i) => i * spacing)
//         .attr("y", 0)
//         .attr("width", spacing)
//         .attr("height", legendHeight)
//         .attr("fill", d => d.color);

//     legend.selectAll("text")
//         .data(legendData)
//         .join("text")
//         .attr("x", (d, i) => i * spacing)
//         .attr("y", legendHeight + 12)
//         .attr("font-size", "10px")
//         .text(d => d.label);
// }


// Creates and draws the map, legend, and listeners
function setupMapCanvas(worldData, metricMap, metricKey) {
    const container = document.getElementById("mapPanel");

    if (!container) {
        console.error("Map container not found.");
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear any existing SVG first
    d3.select(container).selectAll("svg").remove();

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);


    const countries = topojson.feature(worldData, worldData.objects.countries).features;
    const topoCountryIds = countries.map(d => d.properties.name);
    console.log("Countries loaded:", topoCountryIds);


    const projection = d3.geoMercator()
        .fitSize([width, height], { type: "FeatureCollection", features: countries });
    const path = d3.geoPath().projection(projection);

    // Compute thresholds dynamically using quantiles
    const values = Array.from(metricMap.values());
    const colorScale = d3.scaleSequential()
    .domain(values)  // or a clamped upper value like [0, 1000]
    .interpolator(d3.interpolateReds);  // much better visibility

    drawChoropleth(svg, countries, path, colorScale, metricMap);
    drawLegend(svg, colorScale, width);
}

// Draws the countries with color and interactivity
function drawChoropleth(svg, countries, path, colorScale, metricMap) {
    svg.append("g")
        .selectAll("path")
        .data(countries)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const val = metricMap.get(+d.id);
            return val != null ? colorScale(val) : "#ccc";
        })
        .attr("stroke", "#444")
        .attr("stroke-width", 0.5)
        .attr("class", "country")
        .style("opacity", 1)
        .on("mouseover", function (event, d) {
            d3.selectAll(".country").style("opacity", 0.5);
            d3.select(this).style("opacity", 1).attr("stroke", "black");
        })
        .on("mouseleave", function () {
            d3.selectAll(".country")
                .style("opacity", 0.9)
                .attr("stroke", "#444");
        });
}

// Creates and appends a horizontal color legend
function drawLegend(svg, colorScale, svgWidth) {
    const legend = svg.append("g").attr("transform", `translate(${svgWidth - 300}, 40)`);
    const legendData = colorScale.quantiles();

    legend.selectAll("rect")
        .data(colorScale.range())
        .join("rect")
        .attr("x", (d, i) => i * 40)
        .attr("y", 0)
        .attr("width", 40)
        .attr("height", 10)
        .attr("fill", d => d);

    legend.selectAll("text")
        .data(legendData)
        .join("text")
        .attr("x", (d, i) => i * 40)
        .attr("y", 22)
        .attr("font-size", "10px")
        .text((d, i) => {
            const start = i === 0 ? 0 : Math.round(legendData[i - 1]);
            return `${start} - ${Math.round(d)}`;
        });
}

// Load data and build map
// Promise.all([
//     d3.json("countries-110m.json"),
//     d3.csv("globalterrorismdb_0718dist.csv")
// ]).then(([worldData, rawData]) => {
//     globalData = parseData(rawData);
//     const metricKey = "count";
//     const metricMap = aggregateByCountry(globalData, metricKey);
//     setupMapCanvas(worldData, metricMap, metricKey);

//     // Redraw map on window resize
//     window.addEventListener("resize", () => {
//         setupMapCanvas(worldData, metricMap, metricKey);
//     });
// }).catch(error => {
//     console.error("Error loading data:", error);
// });


Promise.all([
    d3.json("countries-110m.json"),
    d3.csv("globalterrorismdb_0718dist.csv")
]).then(([worldData, rawData]) => {
    globalData = parseData(rawData);
    const gtdCountryNames = Array.from(new Set(globalData.map(d => d.country_text))).sort();

console.log("✅ Unique Country Names in GTD:");
gtdCountryNames.forEach((name, i) => {
    console.log(`${i + 1}. ${name}`);
});

    const metricKey = "count"; // You can change this later
    const metricMap = d3.rollup(
        globalData,
        v => metricKey === "count" ? v.length : d3.sum(v, d => d[metricKey] || 0),
        d => +d.country_code // convert to Number to match topojson country `id`s
    );

    setupMapCanvas(worldData, metricMap, metricKey);
}).catch(error => {
    console.error("Error loading data:", error);
});
