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
    let wall = jQuery.infinitedrag("#canvas", {}, {
        width: 10000,
        height: 10000,
        oncreate: function($element, col, row) {
            $element.text("");
        }
    });

    jsPlumb.setContainer("outer-canvas");

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
        div.addEventListener("mousedown", function() {
            this.style.cursor = "grabbing";
        });
        div.addEventListener("mouseup", function() {
            this.style.cursor = "grab";
        });

        jsPlumbInit(div);
    }

    function jsPlumbInit(div) {
        // Making the elements draggable
        jsPlumb.draggable(div, {
            containment: true,
        });

        div.addEventListener("click", gateSelect);

        // Prevent div from being selected after being dragged
        div.addEventListener("mousedown", function() {
            div.addEventListener("mousemove", removeGateSelect);
        });
        div.addEventListener("mouseup", function() {
            div.removeEventListener("mousemove", removeGateSelect);
        });
        div.addEventListener("click", function() {
            div.addEventListener("click", gateSelect);
        });

        // Toggle input when right-clicked
        if (div.classList.contains("startGate")) {
            div.addEventListener("contextmenu", function() {
                if (this.classList.contains("true")) {
                    this.classList.replace("true", "false");
                    this.innerHTML = "<p>0</p>";
                } else {
                    this.classList.replace("false", "true");
                    this.innerHTML = "<p>1</p>";
                }
            });
        }

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

    function gateSelect() {
        let prevSelected = document.querySelectorAll(".selected");
        if (prevSelected.length !== 0) {
            prevSelected[0].classList.remove("selected");
        }

        this.classList.add("selected");
        jsPlumb.repaintEverything();
        selectedElement = this;
    }

    function removeGateSelect() {
        this.removeEventListener("click", gateSelect);
    }

    let start = document.getElementById("execute");
    start.addEventListener("click", function() {
        if (this.classList.contains("running")) {
            this.classList.replace("running", "run");
            stop(this);
        } else {
            this.classList.replace("run", "running");
            run(this);
        }
    });

    // Because run() is async, the execute function could finish execution before
    // run does (i.e. infinite loop). run() will continue execution until the
    // execute button is pressed again and the running class is removed.
    async function run(button) {
        button.innerHTML = "<p>Stop!</p>";
        let gateQueue = Array.prototype.slice.call(document.querySelectorAll(".startGate"));
        let shouldRun = button.classList.contains("running");

        while (gateQueue.length > 0 && shouldRun) {
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
            // This seems to let jsPlumb color the connections in an infinite loop
            await new Promise(r => setTimeout(r, 0));

            // Only continue with the while loop if the execute button is active
            shouldRun = button.classList.contains("running");
        }
    }

    function stop(button) {
        button.innerHTML = "<p>Run!</p>";
        jsPlumb.selectEndpoints().setType("inactive");
        jsPlumb.select().setType("inactive");
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

    jsPlumb.bind("connection", (info) => {
        info.connection.bind("click", (info) => {connectionClick(info)});
    })

    let selectedElement;
    function connectionClick(info) {
        let prevSelected = document.querySelectorAll(".selected");
        if (prevSelected.length !== 0) {
            prevSelected[0].classList.remove("selected");
        }

        info.connector.svg.classList.add("selected");
        jsPlumb.repaintEverything();
        selectedElement = info;
    }

    // Delete selected element when "delete" key is pressed
    document.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
            if (selectedElement.classList !== undefined) {
                if (selectedElement.classList.contains("gate")) {
                    // Delete connections from gate
                    jsPlumb.select({source:selectedElement.id}).delete();
                    jsPlumb.select({target:selectedElement.id}).delete();
                    // Delete endpoints from gate
                    jsPlumb.selectEndpoints({source:selectedElement.id}).delete();
                    jsPlumb.selectEndpoints({target:selectedElement.id}).delete();
                    // Remove element from DOM
                    let canvas = document.getElementById("canvas");
                    canvas.removeChild(selectedElement);
                }
            } else {
                jsPlumb.select({
                    source: selectedElement.source
                }).delete();
            }
        }
    })
});
