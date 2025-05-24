// GLOBAL VARIABLES

const window_width = window.innerWidth;
const window_height = window.innerHeight;

let globalData = [];
let activeBrushLine = "primary"; // Tracks which line is currently active for brushing

// Function that handles the type of entries to be displayed
function metricLabel(metric) {
    switch (metric) {
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

function formatLocationLabel(value) {
    if (value === "__ALL__") {
        return "All Locations";
    }
    return value.replace(/^region:|^country:/, ""); // Removes the prefix (simple regex)
}

// Function parses the input data and extracts the most important fields (not all will be used, but many extras are extracted for convenience)
function parseData(rawData) {
    return rawData.map(d => {
        return {
            // Time
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
    })
        .filter(d => !isNaN(d.year));
}

// SANKEY DIAGRAM STARTS -- Supports only the region/country selection (support for comparisons will likely be added in homework 3's submission)

// Function prepares the data for the Sankey Diagram, turning them into nodes and links for a 4 stage diagram
// Order of the stages: Attack Type -> Weapon Type -> Target Type -> Outcome
function prepareSankeyData(data) {
    const nodeMap = new Map(); // Maps the node's name to the index
    const links = []; // Links between the diagram's stages
    let nodeIndex = 0; // Tracks indices for the IDs for the nodes

    // Helper function that just takes the name of the node as the input and assigns a new id (and increments the index) if it doesn't exist in nodeMap or returns the ID if it does
    function getNodeId(name) {
        if (!nodeMap.has(name)) {
            nodeMap.set(name, nodeIndex++);
        }
        return nodeMap.get(name);
    }

    // Go through everything in the data to build the relationships
    data.forEach(d => {

        // The longest name was "Vehicle ([etc])" so I shortened it to "Vehicle" to reduce clutter
        let cleanedWeapon = d.weapon_type?.includes("Vehicle") ? "Vehicle" : d.weapon_type;

        // We defined the 4 stages as Attack -> Weapon -> Target -> Outcome
        const stages = [
            `Attack: ${d.attack_type}`,
            `Weapon: ${cleanedWeapon}`,
            `Target: ${d.target_type}`,
            `Outcome: ${d.outcome}`
        ];

        const unique = new Set(stages);
        if (unique.size < stages.length) {
            return;
        }// avoids circular links

        // Creates links between the stages
        for (let i = 0; i < stages.length - 1; i += 1) 
            {
            const source = getNodeId(stages[i]);
            const target = getNodeId(stages[i + 1]);
            const key = `${source}->${target}`;

            // Increments the values of links that already exists, if not, creates a new link
            const existing = links.find(l => l.key === key && l.outcome === d.outcome);
            if (existing) {
                existing.value += 1;
            }
            else {
                links.push({
                    source,
                    target,
                    value: 1,
                    key,
                    outcome: d.outcome  // added to ALL links
                });
            }
        }
    });

    // Converts the nodeMap into an array of nodes (sorted by index)
    const nodes = Array.from(nodeMap.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => ({ name }));

    return { nodes, links };
}

// Draws the Sankey Diagram
function drawSankeyDiagram(graph) {

    // Selects the SVG container and clears it of previous contents
    const svg = d3.select("#sankeyChartSvg");
    svg.selectAll("*").remove();

    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    // Holds the diagram and is centered in the SVG container
    const g = svg.append("g")
        .attr("transform", `translate(${(svg.node().clientWidth - width) / 2}, ${(svg.node().clientHeight - height) / 2})`); // Centers the chart

    // Sets up the Sankey diagram generator with the specified node width and padding (exact values just randomly chosen and altered to fit the chart)
    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(15)
        .extent([[0, 20], [width, height - 20]]);

    // Generates the Sankey graph from the provided nodes and links
    const sankeyGraph = sankey({
        nodes: graph.nodes.map(d => Object.assign({}, d)),
        links: graph.links.map(d => Object.assign({}, d))
    });

    // Links
    g.append("g")
        .selectAll("path")
        .data(sankeyGraph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal()) // Built in horizontal Sankey layout
        .attr("fill", "none")
        .attr("stroke", d => {
            if (d.outcome === "Success") {
                return "#27ae60"; // Green for success
            }
            if (d.outcome === "Failure") {
                return "#c0392b"; // Red for failure 
            }
            // Debated switching the above since a successful attack is obviously bad, but green being successful is a pretty rigid association in most people's minds
            return "#aaa";  // Default gray
        })
        .attr("stroke-width", d => Math.max(1, d.width)) //Line thickness based on value
        .attr("stroke-opacity", 0.6)
        .attr("opacity", 0.5);

    // Nodes
    const node = g.append("g")
        .selectAll("g")
        .data(sankeyGraph.nodes)
        .join("g");

    // Draws the rectangles for the nodes
    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        // Colors assigned based on the node's depth (whether it's an attack, weapon, target, or outcome)
        .attr("fill", d => {
            switch (d.depth) {
                case 0: return "#F6602D"; // ATTACK
                case 1: return "#665544"; // WEAPON
                case 2: return "#1A5BD3"; // TARGET
                case 3: return "#000000"; // OUTCOME
                default: return "#999"; //Default gray color (Won't end up being used)
            }
        })
        .attr("stroke", "#000");

    // Node labels (with Target stage labels always on the right side)
    node.append("text")
        .attr("x", d => {
            // Outcome nodes gets labels on the left
            if (d.depth === 3) {
                return d.x0 - 6;
            }
            // All other nodes get labels on the right
            return d.x1 + 6;
        })
        .attr("y", d => (d.y0 + d.y1) / 2) // Label is centered vertically
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.depth === 3 ? "end" : "start")
        .text(d => {
            const name = d.name.split(": ")[1] || d.name; // Removes the prefix 
            return name.length > 42 ? name.slice(0, 39) + "..." : name; // Truncates long labels (above 42 characters)
        });

    // Chart title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Flow of Terrorist Methods → Weapons → Targets → Outcomes");

    // Stage Labels for each column
    const stageLabels = ["ATTACK", "WEAPON", "TARGET", "OUTCOME"];
    const columnWidth = width / stageLabels.length;

    // 
    g.selectAll(".stage-label")
        .data(stageLabels)
        .enter()
        .append("text")
        .attr("x", (d, i) => columnWidth * i + columnWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(d => d);
}

// SANKEY DIAGRAM ENDS

// BAR CHART BEGINS

// Prepares bar chart data by aggregating selected metric per year
function prepareBarData(data, metric) {
    const grouped = d3.rollup(
        data,
        v => metric === "count" ? v.length : d3.sum(v, d => d[metric] || 0), // Count the entries or get the sum of the values given the metric
        d => d.year // Grouped by year
    );

    // Converts the grouped data into an array of objects with year and value
    return Array.from(grouped, ([year, value]) => ({
        year,
        value: value || 0
    })).sort((a, b) => a.year - b.year);
}

// Draws the bar chart with the provided primary and comparison data
function drawBarChart(primaryData, compareData, metric, primaryLabel, compareLabel) {
    // Clears the SVG container
    const svg = d3.select("#barChartSvg");
    svg.selectAll("*").remove();

    // Sets up the dimensions and margins for the chart
    const margin = { top: 50, right: 30, bottom: 80, left: 80 };
    const width = svg.node().clientWidth - margin.left - margin.right;
    const height = svg.node().clientHeight - margin.top - margin.bottom;

    // Creates a group element to hold the chart elements, positioned according to the margins
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    // Tooltip for displaying values on hover
    const tooltip = d3.select("#tooltip");

    // Gets the list of years and merges the primary and comparison data if applicable
    const years = primaryData.map(d => d.year);
    const allData = compareData ? [...primaryData, ...compareData] : primaryData;

    // Scales for the x and y axes (x0 for years, x1 for comparison if applicable, and y for values)
    const x0 = d3.scaleBand().domain(years).range([0, width]).padding(compareData ? 0.2 : 0.1);
    const x1 = compareData ? d3.scaleBand().domain(["primary", "compare"]).range([0, x0.bandwidth()]).padding(0.05) : null;
    const y = d3.scaleLinear().domain([0, d3.max(allData, d => d.value)]).nice().range([height, 0]);

    // Axes (X-axis specifically)
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Y-axis
    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    // Primary set of bars
    const primaryBars = g.selectAll(".bar-primary")
        .data(primaryData)
        .enter()
        .append("rect")
        .attr("class", "bar-primary")
        .attr("x", d => x0(d.year) + (compareData ? x1("primary") : 0))
        .attr("width", compareData ? x1.bandwidth() : x0.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", "#1f77b4");

    // Animates the rise of the bars--starts from 0 and goes till the value. 
    primaryBars.transition()
        .duration(800)
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));

    // Logic below adds the interactivity to the bars, showing a tooltip that displays the country/region, year, and the value of the metric
    primaryBars
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .style("opacity", 1)
                .html(`${primaryLabel}<br>${d.year}<br><strong>${metricLabel(metric)}:</strong> ${metric === "property_damage" ? "$" : ""}${d.value.toLocaleString()}`);
            d3.select(this).attr("fill", "#105a93");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function () {
            tooltip.style("opacity", 0).style("display", "none");
            d3.select(this).attr("fill", "#1f77b4");
        });

    // Bars for comparison dataset, only if applicable
    if (compareData && compareLabel !== "None") {
        const compareBars = g.selectAll(".bar-compare")
            .data(compareData)
            .enter()
            .append("rect")
            .attr("class", "bar-compare")
            .attr("x", d => x0(d.year) + x1("compare"))
            .attr("width", x1.bandwidth())
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", "#d62728");

        // Animates the rise of the comparison bars (same logic at core as the primary sets of bars)
        compareBars.transition()
            .duration(800)
            .attr("y", d => y(d.value))
            .attr("height", d => height - y(d.value));

        // Same tooltip logic as the primary bars, but with the comparison data instead
        compareBars
            .on("mouseover", function (event, d) {
                tooltip.style("display", "block")
                    .style("opacity", 1)
                    .html(`${compareLabel}<br>${d.year}<br><strong>${metricLabel(metric)}:</strong> ${metric === "property_damage" ? "$" : ""}${d.value.toLocaleString()}`);
                d3.select(this).attr("fill", "#921616");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0).style("display", "none");
                d3.select(this).attr("fill", "#d62728");
            });
    }

    // Chart titles
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(`${metricLabel(metric)} Per Year`);

    // Y-Axis
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text(metricLabel(metric));

    // X-Axis
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Year");

    // Legend box is defined
    const legend = svg.append("g").attr("transform", `translate(${width / 2}, ${height + margin.top + 50})`);

    // Legened additions for the primary data
    legend.append("rect").attr("x", -120).attr("width", 20).attr("height", 10).attr("fill", "#1f77b4");
    legend.append("text").attr("x", -90).attr("y", 10).attr("font-size", "12px").text(primaryLabel);


    // Legend additions for the comparison data, only if applicable
    if (compareData && compareData.length > 0 && compareLabel !== "None") {
        legend.append("rect").attr("x", 135).attr("y", 0).attr("width", 20).attr("height", 10).attr("fill", "#d62728");
        legend.append("text").attr("x", 165).attr("y", 10).attr("font-size", "12px").text(compareLabel);
    }
}


// BAR CHART ENDS

// LINE CHART BEGINS

// Prepares the data for the line chart by aggregating the selected metric per year (called on the initial data and comparison, if applicable)
// Similar logic as the previous functions, but this one is for the line chart
// Some code from when I tried to implement a brush feature that would work alongside selecting a line, but had a hard time, so it's just the brush
function prepareLineData(data) {
    // Groups the data by year and aggregates the values for each metric (variable names are self-explanatory)
    const grouped = d3.rollup(
        data,
        v => ({
            count: v.length, // Counts the number of incidents for the year
            num_deaths: d3.sum(v, d => d.num_deaths || 0),
            num_injuries: d3.sum(v, d => d.num_injuries || 0),
            property_damage: d3.sum(v, d => d.property_damage || 0)
        }),
        d => d.year
    );

    // Converts the grouped data into an array of objects with year and aggregated values
    return Array.from(grouped, ([year, values]) => ({
        year,
        count: values.count || 0,
        num_deaths: values.num_deaths || 0,
        num_injuries: values.num_injuries || 0,
        property_damage: values.property_damage || 0
    })).sort((a, b) => a.year - b.year); // Sorts by ascending year
}

// Draws the line chart with the provided primary and comparison data
function drawLineChart(dataPrimary, dataCompare, metric, primaryLabel, compareLabel) {
    // Clears the SVG container for the line chart
    const svg = d3.select("#lineChartSvg");
    // Clears all previous contents
    svg.selectAll("*").remove();

    // Sets up the container, dimensions, and margins for the chart
    const container = svg.node().getBoundingClientRect();
    const margin = { top: 50, right: 30, bottom: 60, left: 80 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // Creates a group element to hold the chart elements, positioned according to the margins
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Sets up the x and y scales for the chart
    const x = d3.scaleLinear().domain(d3.extent(dataPrimary, d => d.year)).range([0, width]);
    const maxY = d3.max([
        d3.max(dataPrimary, d => d[metric] || 0),
        dataCompare ? d3.max(dataCompare, d => d[metric] || 0) : 0
    ]);
    const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]).nice();

    // Adds the x axis to the chart with rotated labels
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Y-axis with formatted numbers
    g.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    // Line generator function for the primary and comparison data
    const line = d3.line().x(d => x(d.year)).y(d => y(d[metric] || 0));

    // Below variable not actually effectively used (selection before brushing was abandonded due to implementation issues)
    let selected = null;

    // Draw primary line
    const primaryPath = g.append("path")
        .datum(dataPrimary)
        .attr("fill", "none")
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 2.5)
        .attr("d", line)
        .style("cursor", "pointer")
        .on("click", () => {
            selected = "primary";
            updateLegendHighlight();
        });

    // Draw comparison line if available 
    let comparePath = null;
    if (dataCompare && dataCompare.length > 0) {
        comparePath = g.append("path")
            .datum(dataCompare)
            .attr("fill", "none")
            .attr("stroke", "#d62728")
            .attr("stroke-width", 2.5)
            .attr("d", line)
            .style("cursor", "pointer")
            .on("click", () => {
                selected = "compare";
                updateLegendHighlight();
            });
    }

    // Adds a brushing overlay to select a region in the x-axis
    const brushOverlay = g.append("g").attr("class", "brush");
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", (event) => {
            const extent = event.selection;
            if (!extent) {
                // Resets the selected window if brush is cleared 
                g.select(".summary-text").remove();
                return;
            }
            
            // Converts the brush coords to the year values
            const [x0, x1] = extent.map(x.invert);
            const data = selected === "compare" ? dataCompare : dataPrimary;
            if (!data)
            {
                return;
            }

            // Sums the metric within the brush year range
            const total = d3.sum(data.filter(d => d.year >= x0 && d.year <= x1), d => d[metric] || 0);

            // Displays the total value below the chart, and also modifies the the summary text to contain the total for the metric
            g.select(".summary-text").remove();
            g.append("text")
                .attr("class", "summary-text")
                .attr("x", width / 2)
                .attr("y", height + 30)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .text(`${selected === "compare" ? compareLabel : primaryLabel}: ${metricLabel(metric)} Total: ${metric === "property_damage" ? "$" : ""}${total.toLocaleString()}`);
        });

    // Actually calls the brush overlay to the chart
    brushOverlay.call(brush);

    // Adds the title and axis labels to the chart
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(`${metricLabel(metric)} Over Time`);

    // X axis
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Year");

    // Y axis
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text(metricLabel(metric));

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height + margin.top + 50})`);

    // Adds the name of the primary data
    const primaryText = legend.append("text")
        .attr("x", -90)
        .attr("y", 15)
        .attr("font-size", "12px")
        .text(primaryLabel);

    // Adds the legend for the primary data
    legend.append("rect")
        .attr("x", -120)
        .attr("y", 5)
        .attr("width", 20)
        .attr("height", 10)
        .attr("fill", "#1f77b4");

    // Adds the legend for the comparison data, if applicable
    let compareText = null;
    // Same logic as with the primary data
    if (dataCompare && dataCompare.length > 0) {
        legend.append("rect")
            .attr("x", 135)
            .attr("y", 5)
            .attr("width", 20)
            .attr("height", 10)
            .attr("fill", "#d62728");

        compareText = legend.append("text")
            .attr("x", 165)
            .attr("y", 15)
            .attr("font-size", "12px")
            .text(compareLabel);
    }

    // Updates the legend highlight based on the selected line (primary or compare)
    function updateLegendHighlight() {
        primaryText.style("font-weight", selected === "primary" ? "bold" : "normal");
        if (compareText) {
            compareText.style("font-weight", selected === "compare" ? "bold" : "normal");
        }
    }

    // Set default selected line to primary
    selected = "primary";
    updateLegendHighlight();
}

// LINE CHART ENDS

// Applies all of the selected filters, and draws the charts wih the filtered data as the input
function applyAllFiltersAndGo() {
    // Gets the starting and ending years 
    const startYear = +document.getElementById("startYear").value || 1970;
    const endYear = +document.getElementById("endYear").value || 2017;

    // Gets the selected locations from the dropdowns in the top bar
    const primaryLocation = document.getElementById("locationPrimary").value;
    const compareLocation = document.getElementById("locationCompare").value;

    // Gets the selected metrics the user wants to see from the drop downs in the charts
    const barMetric = document.getElementById("barMetricSelect").value;
    const lineMetric = document.getElementById("lineMetricSelect").value;

    // Both functions below are the same, just with different locations
    // Takes the whole processed dataset, filters it by year and then by location (getting rid of the region: and country: )
    let filteredPrimary = globalData.filter(d =>
        d.year >= startYear && d.year <= endYear &&
        (primaryLocation === "__ALL__" ||
            (primaryLocation.startsWith("region:") && d.region_text === primaryLocation.replace("region:", "")) ||
            (primaryLocation.startsWith("country:") && d.country_text === primaryLocation.replace("country:", "")))
    );

    let filteredCompare = compareLocation && compareLocation !== "None" ? globalData.filter(d =>
        d.year >= startYear && d.year <= endYear &&
        (compareLocation.startsWith("region:") && d.region_text === compareLocation.replace("region:", "")) ||
        (compareLocation.startsWith("country:") && d.country_text === compareLocation.replace("country:", ""))
    ) : [];

    // If the primary location is "None", we just set it to the global data
    const primaryLabel = formatLocationLabel(primaryLocation);
    // If the compare location is "None", we just set it to "None" (no comparison)
    const compareLabel = formatLocationLabel(compareLocation);

    // Sankey diagram is prepared and drawn
    const sankeyData = prepareSankeyData(filteredPrimary);
    drawSankeyDiagram(sankeyData);

    // Bar chart is prepared and drawn
    const barDataPrimary = prepareBarData(filteredPrimary, barMetric);
    const barDataCompare = compareLocation !== "None" ? prepareBarData(filteredCompare, barMetric) : null;

    drawBarChart(
        barDataPrimary,
        barDataCompare,
        barMetric,
        formatLocationLabel(primaryLocation),
        formatLocationLabel(compareLocation)
    );

    // Line chart is prepared and drawn
    const lineDataPrimary = prepareLineData(filteredPrimary);
    const lineDataCompare = compareLocation !== "None" ? prepareLineData(filteredCompare) : null;
    drawLineChart(lineDataPrimary, lineDataCompare, lineMetric, primaryLabel, compareLabel);
}

// Listeners for the dropdowns and filter apply buttons (not needed for the year ranges since they're inputs)
window.onload = function () {
    document.getElementById("applyFilters").addEventListener("click", applyAllFiltersAndGo);
    document.getElementById("barMetricSelect").addEventListener("change", applyAllFiltersAndGo);
    document.getElementById("lineMetricSelect").addEventListener("change", applyAllFiltersAndGo);
};

d3.csv("globalterrorismdb_0718dist.csv").then(rawData => {
    globalData = parseData(rawData);
    const regions = Array.from(new Set(globalData.map(d => d.region_text))).sort();
    const countries = Array.from(new Set(globalData.map(d => d.country_text))).sort();

    // Populate dropdowns
    // Populate unified dropdowns
    const regionGroupPrimary = d3.select("#regionOptionsPrimary");
    const regionGroupCompare = d3.select("#regionOptionsCompare");
    const countryGroupPrimary = d3.select("#countryOptionsPrimary");
    const countryGroupCompare = d3.select("#countryOptionsCompare");

    regions.forEach(region => {
        regionGroupPrimary.append("option")
            .attr("value", `region:${region}`)
            .text(region);
        regionGroupCompare.append("option")
            .attr("value", `region:${region}`)
            .text(region);
    });

    countries.forEach(country => {
        countryGroupPrimary.append("option")
            .attr("value", `country:${country}`)
            .text(country);
        countryGroupCompare.append("option")
            .attr("value", `country:${country}`)
            .text(country);
    });



    applyAllFiltersAndGo(); // Initial draw with all data

    d3.select("#applyFilters").on("click", applyAllFiltersAndGo);

}).catch(function (error) {
    console.log("Error loading or parsing data:", error);
});