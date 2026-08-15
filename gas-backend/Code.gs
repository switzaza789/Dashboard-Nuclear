function doOptions(e) {
  return handleResponse({});
}

function handleResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------
// 1. ดึงข้อมูลจากชีตส่งให้เว็บ (React)
// ----------------------------------------------------
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName("Config");
    var configList = [];
    var activeEmployees = [];

    // อ่านข้อมูลจากแท็บ Config
    if (configSheet) {
      var configData = configSheet.getDataRange().getDisplayValues();
      for (var i = 1; i < configData.length; i++) {
        var name = (configData[i][0] || "").toString().trim();
        var email = (configData[i][1] || "").toString().trim();
        var status = (configData[i][2] || "Active").toString().trim();
        
        if (name && email) {
          var item = {
            rowIndex: i + 1,
            name: name,
            email: email,
            status: status.toLowerCase() === "inactive" ? "Inactive" : "Active"
          };
          configList.push(item);
          if (item.status === "Active") {
            activeEmployees.push(item);
          }
        }
      }
    }

    var allData = [];
    
    // ดึงเฉพาะข้อมูลปฏิทินของพนักงานที่มีสถานะ Active
    if (activeEmployees.length > 0) {
      activeEmployees.forEach(function(emp) {
        var sheet = ss.getSheetByName(emp.name);
        if (sheet) {
          var data = sheet.getDataRange().getDisplayValues();
          if (data.length > 1) {
            var rows = data.slice(1);
            allData = allData.concat(rows);
          }
        }
      });
    } else {
      // Fallback กรณีไม่มี Config
      var sheets = ss.getSheets();
      sheets.forEach(function(sheet) {
        if (sheet.getName() === "Config") return;
        var data = sheet.getDataRange().getDisplayValues();
        if (data.length > 1) {
          var rows = data.slice(1);
          allData = allData.concat(rows);
        }
      });
    }
    
    return handleResponse({
      success: true,
      config: configList,
      activeEmployees: activeEmployees,
      events: allData,
      data: allData
    });
  } catch(err) {
    return handleResponse({ success: false, error: err.message });
  }
}

// ----------------------------------------------------
// 2. รับคำสั่งจากหน้าเว็บ (ตอบสนองรวดเร็วระดับ < 0.5 วินาที)
// ----------------------------------------------------
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 2.1 สร้างนัดหมายปฏิทิน
    if (action === 'create') {
      var email = payload.data.email;
      var title = payload.data.title;
      var start = new Date(payload.data.start);
      var end = new Date(payload.data.end);
      var location = payload.data.location || '';
      
      var cal = CalendarApp.getCalendarById(email);
      if (cal) {
        cal.createEvent(title, start, end, { location: location });
        return handleResponse({ success: true, message: "Event created" });
      } else {
        throw new Error("Calendar not found for: " + email);
      }
    }
    
    // 2.2 ลบนัดหมายปฏิทิน
    if (action === 'delete') {
      var email = payload.data.email;
      var title = payload.data.title;
      var start = new Date(payload.data.start);
      var end = new Date(payload.data.end);
      
      var cal = CalendarApp.getCalendarById(email);
      if (cal) {
        var events = cal.getEvents(start, end);
        for (var i = 0; i < events.length; i++) {
          if (events[i].getTitle() === title) {
            events[i].deleteEvent();
            break; 
          }
        }
        return handleResponse({ success: true, message: "Event deleted" });
      } else {
        throw new Error("Calendar not found for: " + email);
      }
    }

    // 2.3 ซิงค์ปฏิทินลงชีต (เมื่อผู้ใช้กดปุ่มซิงค์)
    if (action === 'sync_calendar') {
      importCalendarsToSeparateSheets();
      return handleResponse({ success: true, message: "Calendars synced successfully" });
    }

    // 2.4 เพิ่มพนักงานใหม่ในแท็บ Config (อัปเดตทันทีแบบ Ultra-Fast)
    if (action === 'add_employee') {
      var empData = payload.data;
      var configSheet = ss.getSheetByName("Config");
      if (!configSheet) {
        configSheet = ss.insertSheet("Config");
        configSheet.appendRow(["ชื่อพนักงาน", "อีเมลปฏิทิน", "สถานะ"]);
      }

      var name = (empData.name || "").toString().trim();
      var email = (empData.email || "").toString().trim();
      var status = empData.status || "Active";

      if (!name || !email) {
        throw new Error("Missing employee name or email");
      }

      configSheet.appendRow([name, email, status]);
      setupConditionalFormatting(configSheet);

      // สร้างแท็บประจำตัวให้พนักงานใหม่ถ้ายังไม่มี
      var empSheet = ss.getSheetByName(name);
      if (!empSheet) {
        empSheet = ss.insertSheet(name);
        empSheet.appendRow([
          "ชื่อพนักงาน/ปฏิทิน", 
          "ชื่องาน/กิจกรรม", 
          "เวลาเริ่ม", 
          "เวลาสิ้นสุด", 
          "รายละเอียด", 
          "Day Name", 
          "Day Index"
        ]);
      }

      return handleResponse({ success: true, message: "Employee added successfully" });
    }

    // 2.5 แก้ไขพนักงาน หรือ สลับสถานะ Active / Inactive (อัปเดตทันทีแบบ Ultra-Fast)
    if (action === 'update_employee' || action === 'toggle_employee_status') {
      var updateData = payload.data;
      var configSheet = ss.getSheetByName("Config");
      if (!configSheet) throw new Error("Config sheet not found");

      var displayValues = configSheet.getDataRange().getDisplayValues();
      var targetRow = -1;

      for (var r = 1; r < displayValues.length; r++) {
        var rowName = displayValues[r][0].trim();
        var rowEmail = displayValues[r][1].trim();
        if (
          (updateData.originalName && rowName === updateData.originalName.trim()) ||
          (updateData.originalEmail && rowEmail === updateData.originalEmail.trim()) ||
          (rowName === updateData.name.trim()) ||
          (rowEmail === updateData.email.trim())
        ) {
          targetRow = r + 1;
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error("Employee not found in Config sheet");
      }

      var newName = updateData.name !== undefined ? updateData.name.trim() : displayValues[targetRow - 1][0];
      var newEmail = updateData.email !== undefined ? updateData.email.trim() : displayValues[targetRow - 1][1];
      var newStatus = updateData.status !== undefined ? updateData.status : displayValues[targetRow - 1][2];

      configSheet.getRange(targetRow, 1).setValue(newName);
      configSheet.getRange(targetRow, 2).setValue(newEmail);
      configSheet.getRange(targetRow, 3).setValue(newStatus);

      // ถ้าชื่อเปลี่ยน ให้เปลี่ยนชื่อแท็บชีตตาม
      var oldName = displayValues[targetRow - 1][0].trim();
      if (oldName !== newName) {
        var oldSheet = ss.getSheetByName(oldName);
        if (oldSheet && !ss.getSheetByName(newName)) {
          oldSheet.setName(newName);
        }
      }

      return handleResponse({ success: true, message: "Employee updated successfully" });
    }

    // 2.6 ลบพนักงานออกจาก Config (อัปเดตทันทีแบบ Ultra-Fast)
    if (action === 'delete_employee') {
      var deleteData = payload.data;
      var configSheet = ss.getSheetByName("Config");
      if (!configSheet) throw new Error("Config sheet not found");

      var displayValues = configSheet.getDataRange().getDisplayValues();
      for (var r = 1; r < displayValues.length; r++) {
        if (
          displayValues[r][0].trim() === deleteData.name.trim() ||
          displayValues[r][1].trim() === deleteData.email.trim()
        ) {
          configSheet.deleteRow(r + 1);
          break;
        }
      }

      return handleResponse({ success: true, message: "Employee deleted from Config" });
    }
    
    return handleResponse({ success: false, error: "Unknown action: " + action });
    
  } catch(err) {
    return handleResponse({ success: false, error: err.message });
  }
}

// ----------------------------------------------------
// 3. ระบบอัตโนมัติ: เปลี่ยนชื่อแท็บชีตทันทีเมื่อแก้ชื่อใน Config
// ----------------------------------------------------
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sheet = range.getSheet();
  
  if (sheet.getName() !== "Config" || range.getRow() === 1) return;
  
  var col = range.getColumn();
  var ss = e.source;
  
  // กรณีแก้ไขคอลัมน์ A (ชื่อพนักงาน) -> เปลี่ยนชื่อแท็บชีตตามทันที
  if (col === 1) {
    var oldName = e.oldValue;
    var newName = range.getValue().toString().trim();
    
    if (oldName && newName && oldName !== newName) {
      var targetSheet = ss.getSheetByName(oldName);
      if (targetSheet && !ss.getSheetByName(newName)) {
        targetSheet.setName(newName);
      }
    }
  }
}

// ----------------------------------------------------
// 4. ฟังก์ชันดึงปฏิทินลงชีต + จัดการ Dropdown และสีอัตโนมัติ
// ----------------------------------------------------
function importCalendarsToSeparateSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config");
    configSheet.appendRow(["ชื่อพนักงาน", "อีเมลปฏิทิน", "สถานะ"]);
    configSheet.appendRow(["Tanut", "tanut@nuclear-system.com", "Active"]);
    configSheet.appendRow(["Pongpon", "pongpon@nuclear-system.com", "Active"]);
    configSheet.appendRow(["Anan", "anan@nuclear-system.com", "Active"]);
    configSheet.appendRow(["Chainarong", "chainarong@nuclear-system.com", "Active"]);
    configSheet.appendRow(["free", "dashboard@nuclear-system.com", "Inactive"]);
  }
  
  // ตั้งค่า Dropdown ในคอลัมน์ C (Active / Inactive)
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Active", "Inactive"], true)
    .setAllowInvalid(false)
    .build();
  configSheet.getRange("C2:C100").setDataValidation(rule);
  
  // ตั้งค่าสีเขียว/แดงอัตโนมัติ (Conditional Formatting)
  setupConditionalFormatting(configSheet);

  var configData = configSheet.getDataRange().getValues();
  var employees = [];
  
  for (var i = 1; i < configData.length; i++) {
    var name = String(configData[i][0]).trim();
    var email = String(configData[i][1]).trim();
    var status = String(configData[i][2]).trim().toLowerCase();
    
    if (name && email && (status === "active" || status === "")) {
      employees.push({ name: name, email: email });
    }
  }

  var today = new Date();
  var startTime = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
  var endTime = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  employees.forEach(function(emp) {
    try {
      var sheet = ss.getSheetByName(emp.name);
      
      if (!sheet) {
        sheet = ss.insertSheet(emp.name);
        sheet.appendRow([
          "ชื่อพนักงาน/ปฏิทิน", 
          "ชื่องาน/กิจกรรม", 
          "เวลาเริ่ม", 
          "เวลาสิ้นสุด", 
          "รายละเอียด", 
          "Day Name", 
          "Day Index"
        ]);
      }
      
      var existingRows = sheet.getDataRange().getValues();
      var existingKeys = {};
      
      if (existingRows.length > 1) {
        for (var j = 1; j < existingRows.length; j++) {
          var row = existingRows[j];
          var oldTitle = row[1];
          var oldStart = row[2];
          
          if (oldTitle && oldStart) {
            var oldStartTimeStr = new Date(oldStart).getTime();
            var key = oldTitle + "_" + oldStartTimeStr;
            existingKeys[key] = true;
          }
        }
      }
      
      var cal = CalendarApp.getCalendarById(emp.email);
      if (!cal) {
        Logger.log("❌ ไม่พบปฏิทิน หรือไม่มีสิทธิ์ของ: " + emp.name + " (" + emp.email + ")");
        return; 
      }
      
      var calendarEvents = cal.getEvents(startTime, endTime);
      var newEventCount = 0;
      
      calendarEvents.forEach(function(event) {
        var title = event.getTitle();
        var startDateTime = event.getStartTime();
        var eventKey = title + "_" + startDateTime.getTime();
        
        if (!existingKeys[eventKey]) {
          var dayName = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), "EEE");
          var jsDay = startDateTime.getDay(); 
          var dayIndex = (jsDay === 0) ? 7 : jsDay; 
          
          sheet.appendRow([
            emp.name,              
            title,       
            startDateTime,          
            event.getEndTime(),     
            event.getDescription(), 
            dayName,                
            dayIndex                
          ]);
          
          existingKeys[eventKey] = true; 
          newEventCount++;
        }
      });
      
      Logger.log("✅ " + emp.name + ": เพิ่มงานใหม่ " + newEventCount + " รายการ");
      
    } catch(e) {
      Logger.log("❌ ข้อผิดพลาดของ " + emp.name + ": " + e.message);
    }
  });
}

// ฟังก์ชันสร้างเงื่อนไขสี เขียว = Active / แดง = Inactive
function setupConditionalFormatting(sheet) {
  var range = sheet.getRange("C2:C100");
  var rules = sheet.getConditionalFormatRules();
  
  // ลบกฎเดิมเฉพาะคอลัมน์ C ออกก่อนป้องกันกฎซ้ำซ้อน
  var newRules = rules.filter(function(r) {
    return r.getRanges().every(function(rg) {
      return rg.getSheet().getName() !== sheet.getName() || rg.getA1Notation().indexOf("C") === -1;
    });
  });
  
  var greenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Active")
    .setBackground("#D9EAD3")
    .setFontColor("#274E13")
    .setRanges([range])
    .build();
    
  var redRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Inactive")
    .setBackground("#F4CCCC")
    .setFontColor("#783F04")
    .setRanges([range])
    .build();
    
  newRules.push(greenRule, redRule);
  sheet.setConditionalFormatRules(newRules);
}
