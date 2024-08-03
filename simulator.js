// simulator.js
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let simulation;
let link, node, label, weightLabel;

// Node colors
const staticNodeColor = "#ff00de";
const movingNodeColor = "#00ffff";

// Default values for sliders
const defaultValues = {
    centerForce: 0.1,
    repelForce: 300,
    linkForce: 1,
    linkDistance: 100
};

function initializeGraph(data) {
    const { nodes, edges, graphSettings } = data;

    // Initialize node positions at the center
    nodes.forEach((node) => {
        node.x = width / 2;
        node.y = height / 2;
        node.color = node.isStatic ? staticNodeColor : movingNodeColor;
        if (node.isStatic) {
            node.fx = node.x;
            node.fy = node.y;
        }
    });

    // Create the force simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(edges).id(d => d.id).distance(graphSettings.linkDistance).strength(graphSettings.linkForce))
        .force("charge", d3.forceManyBody().strength(-graphSettings.repelForce))
        .force("center", d3.forceCenter(width / 2, height / 2).strength(graphSettings.centerForce))
        .on("tick", ticked);

    // Create the graph elements
    link = svg.append("g")
        .selectAll("line")
        .data(edges)
        .enter().append("line")
        .attr("stroke", "#ffffff")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.weight));

    node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 5)
        .attr("fill", d => d.color)
        .attr("class", "neon")
        .call(drag(simulation));

    label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.name)
        .attr("font-size", 12)
        .attr("dx", 8)
        .attr("dy", 3)
        .attr("fill", "#ffffff");

    weightLabel = svg.append("g")
        .selectAll("text")
        .data(edges)
        .enter().append("text")
        .text(d => d.weight.toFixed(2))
        .attr("font-size", 10)
        .attr("fill", "#ffffff")
        .attr("text-anchor", "middle");

    // Set up slider listeners
    setupSliderListeners();
}

function setupSliderListeners() {
    d3.select("#centerForce").on("input", function() {
        simulation.force("center").strength(+this.value);
        simulation.alpha(1).restart();
    });

    d3.select("#repelForce").on("input", function() {
        simulation.force("charge").strength(-this.value);
        simulation.alpha(1).restart();
    });

    d3.select("#linkForce").on("input", function() {
        simulation.force("link").strength(+this.value);
        simulation.alpha(1).restart();
    });

    d3.select("#linkDistance").on("input", function() {
        simulation.force("link").distance(+this.value);
        simulation.alpha(1).restart();
    });
}

// Toggle controls visibility
d3.select("#toggleControls").on("click", function() {
    const controls = d3.select("#controls");
    const isHidden = controls.style("display") === "none";
    controls.style("display", isHidden ? "block" : "none");
    this.textContent = isHidden ? "Hide Controls" : "Show Controls";
});

// Reset sliders
d3.select("#resetSliders").on("click", function() {
    Object.entries(defaultValues).forEach(([id, value]) => {
        d3.select(`#${id}`).property("value", value);
        simulation.force(id === "repelForce" ? "charge" : id.replace("Force", ""))
            .strength(id === "repelForce" ? -value : value);
    });
    simulation.force("link").distance(defaultValues.linkDistance);
    simulation.alpha(1).restart();
});

// Update positions on each tick
function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.isStatic ? d.fx : d.x)
        .attr("cy", d => d.isStatic ? d.fy : d.y);

    label
        .attr("x", d => d.isStatic ? d.fx : d.x)
        .attr("y", d => d.isStatic ? d.fy : d.y);

    weightLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
}

// Drag functionality
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!d.isStatic) {
            d.fx = null;
            d.fy = null;
        }
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// File upload functionality
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const jsonData = JSON.parse(e.target.result);
            updateGraph(jsonData);
        };
        reader.readAsText(file);
    }
});

function updateGraph(data) {
    // Remove existing graph elements
    svg.selectAll("*").remove();

    // Reinitialize the graph with new data
    initializeGraph(data);
}

// Initial graph load
fetch('https://raw.githubusercontent.com/eledah/elasticity-sim/main/data/graph-data-json.json')
    .then(response => response.json())
    .then(data => {
        initializeGraph(data);
    });