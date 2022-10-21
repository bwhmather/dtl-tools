"use strict";

const express = require("express");
const path = require("path");

const app = express();

app.use(
  "/data",
  express.static("./trace/arrays", {
    index: false,
    extensions: ["parquet"],
    setHeaders: (res, path, stat) => {
      res.setHeader("Access-Control-Allow-Origin", "*"); // "localhost:3000");
    },
  })
);

app.use("/static", express.static(path.join(__dirname, "dist")));
app.use("/static", express.static(path.join(__dirname, "..", "..", "dist")));
app.use(
  "/static",
  express.static(path.join(__dirname, "node_modules", "bootstrap", "dist"))
);

app.get("/manifest.json", (req, res) => {
  res.statusCode = 200;
  res.sendFile("./trace/trace.json");
});

app.get("/", (req, res) => {
  res.statusCode = 200;
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000);
