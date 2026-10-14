// RGB Color Simulator — server version for Cloud Run, protected by AgentGuard.
//
// The page itself is the same index.html / style.css / script.js that GitHub Pages serves.
// AgentGuard (ownership check + protection) lives in agentguard.cjs. Its connection key is read
// from the AGENTGUARD_KEY environment variable, or from the .agentguard folder (never committed).
const path = require("node:path");
const express = require("express");

const PAGES = { "/": "index.html", "/index.html": "index.html", "/style.css": "style.css", "/script.js": "script.js" };

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
require("./agentguard.cjs")(app);

// The site: only its own page files are served (never server.js, package.json, ...).
app.get(Object.keys(PAGES), (req, res) => res.sendFile(path.join(__dirname, PAGES[req.path])));
app.use((req, res) => res.status(404).type("text/plain; charset=utf-8").send("Not Found"));

app.listen(Number(process.env.PORT) || 8080, () => console.log("RGB Color Simulator is running"));
