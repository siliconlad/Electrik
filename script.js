let inputElement = {
    isTarget: true,
    endpoint: "Dot",
    createEndpoint: true,
    connector: "Flowchart",
    maxConnections: 1,
    type: "inactive",
    connectionType: "inactive"
}

let outputElement = {
    isSource: true,
    endpoint: "Dot",
    allowLoopback: false,
    createEndpoint: true,
    connector: "Flowchart",
    maxConnections: -1,
    anchor: [1, 0.5, 1, 0],
    type: "inactive",
    connectionType: "inactive"
}

jsPlumb.ready(function() {
    // Set a default container
    jsPlumb.setContainer("canvas");

    jsPlumb.registerConnectionType("active", {
        paintStyle: {stroke: "red", strokeWidth: 3},
    });

    jsPlumb.registerConnectionType("inactive", {
        paintStyle: {stroke: "grey", strokeWidth: 3},
    });

    jsPlumb.registerEndpointType("active", {
        paintStyle: {fill: "red"}
    })

    jsPlumb.registerEndpointType("inactive", {
        paintStyle: {fill: "grey"}
    })

    // Set callback on click of menu items
    let sources = document.querySelectorAll(".source");
    for (let i = 0; i < sources.length; i++) {
        sources[i].addEventListener("click", newGate);
    }

    function newGate() {
        let div = document.createElement("div");
        div.innerHTML = this.innerHTML;

        div.classList = this.classList;
        div.classList.replace("source", "gate");
        div.classList.remove("menuItem");

        div.style.left = '7em';
        div.style.top = '7em';

        let canvas = document.getElementById("canvas");
        canvas.appendChild(div);

        // Setting cursor when dragging elements
        div.addEventListener("mousedown", cursorGrabbing);
        div.addEventListener("mouseup", cursorGrab);

        jsPlumbInit(div);
    }

    function jsPlumbInit(div) {
        // Making the elements draggable
        jsPlumb.draggable(div, {
            containment: true,
        });

        // Setting cursor when dragging elements
        div.addEventListener("mousedown", cursorGrabbing);
        div.addEventListener("mouseup", cursorGrab);

        // Creating endpoints
        // Define the input points for each gate
        if (!div.classList.contains("startGate")) {
            if (div.classList.contains("not")) {
                jsPlumb.addEndpoint(div, {
                    anchor: [0, 0.5, -1, 0],
                }, inputElement);
            } else {
                jsPlumb.addEndpoint(div, {
                    anchor: [0, 0.25, -1, 0],
                }, inputElement);

                jsPlumb.addEndpoint(div, {
                    anchor: [0, 0.75, -1, 0],
                }, inputElement);
            }
        }

        // Define the output point for each gate
        jsPlumb.addEndpoint(div, outputElement);
    }

    function cursorGrabbing() {
        this.style.cursor = "grabbing";
    }

    function cursorGrab() {
        this.style.cursor = "grab";
    }

    let start = document.getElementById("run");
    start.addEventListener("click", run);

    async function run() {
        let gateQueue = Array.prototype.slice.call(document.querySelectorAll(".startGate"));

        while (gateQueue.length > 0) {
            console.log("This is inside the while loop");
            let item = gateQueue.shift();

            if (item.classList.contains("and")) {
                gateQueue = gateQueue.concat(updateOutput(item, and(item)));
            } else if (item.classList.contains("or")) {
                gateQueue = gateQueue.concat(updateOutput(item, or(item)));
            } else if (item.classList.contains("not")) {
                gateQueue = gateQueue.concat(updateOutput(item, not(item)));
            } else if (item.classList.contains("startGate")) {
                if (item.classList.contains("true")) {
                    gateQueue = gateQueue.concat(updateOutput(item, true));
                } else {
                    gateQueue = gateQueue.concat(updateOutput(item, false));
                }
            }
            await new Promise(r => setTimeout(r, 0));
        }
    }

    function updateOutput(item, isActive) {
        let type;
        if (isActive) {
            type = "active";
        } else {
            type = "inactive";
        }

        jsPlumb.selectEndpoints({source: item}).setType(type);
        let connections = jsPlumb.select({source: item});
        // Set connection to appropriate type
        connections.setType(type);
        // Set endpoints of the connection to the appropriate type
        // TODO could be optimized
        let gates = Array();
        for (let i = 0; i < connections.length; i++) {
            let connection = connections.get(i);
            gates.push(connection.endpoints[1].getElement());
            connection.endpoints.forEach((endpoint) => {
                endpoint.setType(type);
            })
        }
        return gates;
    }

    function or(item) {
        let inputs = jsPlumb.select({target: item});
        let isTrue = false;

        for (let i=0; i < inputs.length; i++) {
            if (inputs.get(i).getType().includes("active")) {
                isTrue = true;
                break;
            }
        }

        return isTrue;
    }

    function and(item) {
        let inputs = jsPlumb.select({target: item});
        let isTrue = true;
        for (let i=0; i < inputs.length; i++) {
            if (!inputs.get(i).getType().includes("active")) {
                isTrue = false;
            }
        }

        return isTrue;
    }

    function not(item) {
        let inputs = jsPlumb.select({target: item});
        let isTrue = !inputs.get(0).getType().includes("active");

        return isTrue;
    }
});
