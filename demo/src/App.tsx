import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { createLogConn } from "idb-log";
let id = 1;
const { log, exportLog } = createLogConn({
  project: "Todo",
  nameSpace: "user-action-log",
  maxLogCount: 20,
});
function App() {
  return (
    <div className="App">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          <button
            onClick={() => {
              log("ISSUE-47337", { name: "test" + id++, age: id });
            }}
          >
            Log Object
          </button>
        </p>
        <p>
          <button
            onClick={() => {
              log("ISSUE-47337", "this is a simple string");
            }}
          >
            Log String
          </button>
        </p>
        <p>
          <button
            onClick={() => {
              exportLog("ISSUE-47337");
            }}
          >
            Export
          </button>
        </p>
    </div>
  );
}

export default App;
