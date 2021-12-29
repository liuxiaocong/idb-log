import _toConsumableArray from '@babel/runtime-corejs3/helpers/toConsumableArray';
import _typeof from '@babel/runtime-corejs3/helpers/typeof';
import _JSON$stringify from '@babel/runtime-corejs3/core-js-stable/json/stringify';
import _concatInstanceProperty from '@babel/runtime-corejs3/core-js-stable/instance/concat';
import _forEachInstanceProperty from '@babel/runtime-corejs3/core-js-stable/instance/for-each';
import _Object$keys from '@babel/runtime-corejs3/core-js-stable/object/keys';
import ExportJsonExcel from 'js-export-excel';

var pendingLog = [];

var getTimeDisplay = function getTimeDisplay(timeStamp, format) {
  if (!timeStamp) {
    return "";
  }

  var date;
  var time = timeStamp;

  if (typeof timeStamp === "string") {
    try {
      date = new Date(time);
    } catch (ex) {
      return "";
    }
  } else {
    date = new Date(time);
  }

  if (!date) {
    return "";
  } //'yyyy-MM-dd hh:mm:ss'


  var result = format || "yyyy-MM-dd hh:mm";
  var keyMap = {
    "M+": date.getMonth() + 1,
    //month
    "d+": date.getDate(),
    //date
    "h+": date.getHours(),
    //hour
    "m+": date.getMinutes(),
    //min
    "s+": date.getSeconds() //second

  };

  if (/(y+)/.test(result)) {
    result = result.replace(RegExp.$1, (date.getFullYear() + "").substring(4 - RegExp.$1.length));
  }

  for (var k in keyMap) {
    if (new RegExp("(" + k + ")").test(result)) {
      result = result.replace(RegExp.$1, RegExp.$1.length == 1 ? keyMap[k] : ("00" + keyMap[k]).substring(("" + keyMap[k]).length));
    }
  }

  return result;
};

var readWithLabel = function readWithLabel(props) {
  var db = props.db,
      dbTableName = props.dbTableName,
      label = props.label,
      callback = props.callback,
      keepValueObject = props.keepValueObject;
  var objectStore = db.transaction(dbTableName).objectStore(dbTableName);
  var listData = [];

  objectStore.openCursor().onsuccess = function (event) {
    var _event$target;

    var cursor = event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result;

    if (cursor) {
      var data = cursor.value;

      if (!label || label === data.label) {
        listData.push({
          label: data.label,
          time: data.time,
          value: !!keepValueObject ? data.value : _typeof(data.value) === "object" ? _JSON$stringify(data.value) : "".concat(data.value)
        });
      }

      cursor["continue"]();
    } else {
      callback(listData);
    }
  };
};

var logExport = function logExport(db, dbTableName, label, count) {
  var _context;

  var option = {};
  option.fileName = _concatInstanceProperty(_context = "db-log-".concat(label, "-")).call(_context, getTimeDisplay(new Date().getTime(), "yyyy-MM-dd"));
  var sheetData = [];
  var sheetHeader = ["Label", "Time", "Log Info"];
  var columnWidths = [];
  readWithLabel({
    db: db,
    dbTableName: dbTableName,
    label: label,
    callback: function callback(list) {
      if (list && list.length > 0) {
        var _context2;

        _forEachInstanceProperty(_context2 = _Object$keys(list[0])).call(_context2, function (key) {
          columnWidths.push(10);
        });

        sheetData.push.apply(sheetData, _toConsumableArray(list));
      }

      option.datas = [{
        sheetData: sheetData,
        sheetName: "data",
        sheetHeader: sheetHeader,
        columnWidths: columnWidths
      }];
      var toExcel = new ExportJsonExcel(option);
      toExcel.saveExcel();
    }
  });
};

var addLog = function addLog(props) {
  var db = props.db,
      dbTableName = props.dbTableName,
      label = props.label,
      value = props.value,
      max = props.max,
      project = props.project;

  if (!db) {
    //console.error("please init first");
    pendingLog.push({
      label: label,
      value: value,
      time: new Date().toLocaleString()
    });
    return;
  }

  var transaction = db.transaction([dbTableName], "readwrite");
  var add = transaction.objectStore(dbTableName).add({
    label: label,
    value: value,
    time: new Date().toLocaleString()
  });

  add.onsuccess = function (event) {
    deleteWhenOverAmount(db, dbTableName, max);
  };

  add.onerror = function (event) {//console.log("data write fail");
  };

  transaction.onabort = function (event) {
    event.stopPropagation();

    if (event.target.error && event.target.error.name == "QuotaExceededError") {
      // Encountered disk full while committing transaction.
      // An attempt was made to add something to storage that exceeded the quota
      removeDb(project, db, undefined);
    }
  };
};

var removeDb = function removeDb(project, db, callbackDBRemoved) {
  db && db.close();
  var request = window.indexedDB.deleteDatabase(project);

  request.onerror = function (event) {
    // 1. Internal error opening backing store for indexedDB.deleteDatabase.
    // 2. Internal error deleting database.
    return console.error("clean_error", event.target.error); // 每天200+
  };

  request.onsuccess = function (event) {
    callbackDBRemoved && callbackDBRemoved();
  };
};

var openDb = function openDb(project, callbackDBReady) {
  var request = window.indexedDB.open(project);

  request.onerror = function (event) {
    console.error("IndexedDB open error");

    if (event.target.error && event.target.error.name == "QuotaExceededError") {
      //remove db
      removeDb(project, undefined, function () {
        //only try one time
        var secondTimeRequest = window.indexedDB.open(project);

        secondTimeRequest.onsuccess = function (event) {
          var db = request.result;
          callbackDBReady(db);
        };

        secondTimeRequest.onupgradeneeded = function (event) {
          var _event$target2;

          var db = (_event$target2 = event.target) === null || _event$target2 === void 0 ? void 0 : _event$target2.result;
          callbackDBReady(db);
        };
      });
    }
  };

  request.onsuccess = function (event) {
    var db = request.result;
    callbackDBReady(db);
  }; //unable to using evant: IDBVersionChangeEvent


  request.onupgradeneeded = function (event) {
    var _event$target3;

    var db = (_event$target3 = event.target) === null || _event$target3 === void 0 ? void 0 : _event$target3.result;
    callbackDBReady(db);
  };
};

var downloadIdbLog = function downloadIdbLog(project, nameSpace, label) {
  var dbTableName = "".concat(nameSpace, "_log");
  openDb(project, function (db) {
    logExport(db, dbTableName, label);
  });
};

var showIdbLog = function showIdbLog(project, nameSpace, label) {
  var dbTableName = "".concat(nameSpace, "_log");
  openDb(project, function (db) {
    readWithLabel({
      db: db,
      dbTableName: dbTableName,
      label: label,
      keepValueObject: true,
      callback: function callback(list) {
        console.log(_JSON$stringify(list));
      }
    });
  });
};

var removeByID = function removeByID(db, dbTableName, id) {
  var request = db.transaction([dbTableName], "readwrite").objectStore(dbTableName)["delete"](id);

  request.onsuccess = function (event) {};
};

var deleteWhenOverAmount = function deleteWhenOverAmount(db, dbTableName, max) {
  var dbTable = db.transaction([dbTableName]).objectStore(dbTableName);
  var request = dbTable.getAll();

  request.onsuccess = function (event) {
    var logObjectArray = event.target.result;

    if (logObjectArray && logObjectArray.length > max) {
      var removeCount = logObjectArray.length - max + Math.floor(max / 10); //keep 10% buffer

      if (removeCount > logObjectArray.length) {
        removeCount = logObjectArray.length;
      }

      for (var i = 0; i < removeCount; i++) {
        var item = logObjectArray[i];
        removeByID(db, dbTableName, item.id);
      }
    }
  };
};

var createLogConn = function createLogConn(props) {
  var project = props.project,
      nameSpace = props.nameSpace;
      props.version;
      var maxLogCount = props.maxLogCount;
  var max = maxLogCount || 2000;
  var db;
  var dbTableName = "".concat(nameSpace, "_log");

  var detectDb = function detectDb() {
    if (!db) {
      console.error("db fail to open");
      return false;
    }

    return true;
  };

  openDb(project, function (dbConn) {
    db = dbConn;

    if (!db.objectStoreNames.contains(dbTableName)) {
      var objectStore = db.createObjectStore(dbTableName, {
        autoIncrement: true,
        keyPath: "id"
      });
      objectStore.createIndex("label", "label");
      objectStore.createIndex("value", "value");
    }
  });
  return {
    log: function log(label, value) {
      if (detectDb()) {
        addLog({
          db: db,
          dbTableName: dbTableName,
          label: label,
          value: value,
          max: max,
          project: project
        });
      }
    },
    exportLog: function exportLog(label, count) {
      if (detectDb()) {
        logExport(db, dbTableName, label);
      }
    }
  };
}; // @ts-ignore


window.downloadIdbLog = downloadIdbLog; // @ts-ignore

window.showIdbLog = showIdbLog;

export { createLogConn };
