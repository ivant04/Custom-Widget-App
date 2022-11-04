const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, dialog, shell } = require('electron');
const { SetBottomMost } = require("electron-bottom-most");
const { DisableMinimize } = require("electron-disable-minimize");
const AutoLaunch = require("auto-launch");
const path = require("path");
const fs = require("fs");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const MAX_WIDGETS = 10;


let showDash = false;
let Currently_Rendering = -1;

for(let i = 0; i < process.argv.length; i++)
{
    // Open the dashboard and display all the shown widgets
    if(process.argv[i].startsWith("--dashboard") || process.argv[i].startsWith("-dashboard") || process.argv[i].startsWith("dashboard"))
    {
        showDash = true;
        break;
    }
    // Otherwise only display shown widgets, if there are not any exit the app
}

const roamingPath = process.env.APPDATA + '\\CustomWidgetApp';
if(!fs.existsSync(roamingPath))
{
    fs.mkdirSync(roamingPath);
}
if(!fs.existsSync(roamingPath + '\\settings.json'))
{
    fs.appendFileSync(roamingPath + '\\settings.json', "{}");
    showDash = true;
}

let rawdata = fs.readFileSync(roamingPath + '\\settings.json');
let sett = JSON.parse(rawdata);

if(rawdata == "" || rawdata == " " || rawdata == "{}" || rawdata == "{ }" || rawdata == undefined)
{
    showDash = true;
    global.Currently_Rendering = Currently_Rendering;
    global.Cur_Widget_Scroll = 0;
    fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
}

global.Currently_Rendering = Currently_Rendering;
global.Cur_Widget_Scroll = 0;
let win = {}, winW = {}, tempwin = {};
let wtempreload = [], wtemprender = [];
win.shown = false;
tempwin.rendering = false;
let tempwid = -1;
let widgetFails_Busy = [];
let widgetFails_Busy_Timer = [];


function createDashboard()
{
    win = new BrowserWindow({
        width: sett.Dashboard_Size_X || 864,
        height: sett.Dashboard_Size_Y || 687,
        minWidth: 800,
        minHeight: 600,
        title: "Custom Widget App",
        icon: "icon.ico",
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            preload: `${__dirname}/dashboard/preload_sendData.js`
        }
    });
    win.on("page-title-updated", (event) => {
        event.preventDefault();
    });
    win.on("closed", (ev) => {
        win.shown = false;

        fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));

        let j = false;
        for(let i = 0; i < MAX_WIDGETS; i++)
        {
            if(winW["w" + i] != null && winW["w" + i] != undefined)
            {
                if(winW["w" + i].shown)
                {
                    if(winW["w" + i].isResizable()) winW["w" + i].setResizable(false);
                    if(winW["w" + i].isMovable()) winW["w" + i].setMovable(false);
                    j = true;
                }
            }
        }
        if(!j) app.exit();
    });
    win.on("resized", () => {
        const [ sx, sy ] = win.getSize();
        sett.Dashboard_Size_X = sx;
        sett.Dashboard_Size_Y = sy;
    });
    ipcMain.on('inputData', (event, obj) => { // get data from the renderer
        if(obj.tag == "_saveData")
        {
            try
            {
                fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett)); // write data to the JSON
                if(tempwin.rendering && wtemprender[Number(obj.data)])
                {
                    dialog.showMessageBox(winW["w" + Number(obj.data)], {
                        type: "warning",
                        icon: "icon.ico",
                        buttons: ["OK"],
                        title: "Custom Widget App",
                        defaultId: 0,
                        cancelId: 1,
                        noLink: true,
                        message: "The app can't render the widget at the moment, try again in a few seconds..."
                    });
                }
                else
                {
                    widgetSetData(Number(obj.data)); // apply the data to the widget window
                }
            }
            catch (err)
            {
                console.error(err);
            } 
        }
        else if(obj.tag == "_resizeWindow" && obj.data > -1)
        {
            winW["w" + obj.data].setResizable(true);
        }
        else if(obj.tag == "_moveWindow" && obj.data > -1)
        {
            winW["w" + obj.data].setMovable(true);
        }
        else if(obj.tag == "_requestData") // called when dashboard is ready (DOM loaded)
        {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            win.webContents.send('screenResX', width);
            win.webContents.send('screenResY', height);

            win.webContents.send('loadData', sett); // send data from main to renderer
        }
        else
        {
            let pass = false;
            for(let i = 0; i < MAX_WIDGETS; i++)
            {
                if(obj.tag.startsWith(i + "_"))
                {
                    let eidx = obj.tag.search("_");
                    if(eidx == -1 || eidx == 0)
                    {
                        console.log("main.js recieved unidentified data from the renderer");
                    }
                    else
                    {
                        let numm = obj.tag.substring(0, eidx);
                        let tagg = obj.tag.substring(eidx+1);

                        if(sett["widget" + Number(numm)] == undefined)
                        {
                            sett["widget" + Number(numm)] = {};
                        }

                        if(tagg == "URL" || tagg == "Scroll")
                        {
                            if(sett["widget" + Number(numm)][tagg] != obj.data) wtemprender[Number(numm)] = true;
                        }
                        if(tagg == "Zoom" || tagg == "Zoom_Pos_X" || tagg == "Zoom_Pos_Y" || tagg == "Size_X" || tagg == "Size_Y" || tagg == "Round_Edges" || tagg == "Border_Width" || tagg == "Border_Color")
                        {
                            if(sett["widget" + Number(numm)][tagg] != obj.data) wtempreload[Number(numm)] = true;
                        }

                        sett["widget" + Number(numm)][tagg] = obj.data;

                        pass = true;
                    }
                    break;
                }
            }
            if(!pass)
            {
                console.log("main.js recieved unidentified data from the renderer.");
            }
        }
    });
    ipcMain.on('minimizeWin', (event, val) => {
        if(val) win.minimize();
    });
    ipcMain.on('closeWin', (event, val) => {
        if(val) win.close();
    });
    ipcMain.on('openGitHub', (event, val) => {
        if(val) shell.openExternal("https://github.com/Toxic48");
    });
    
    win.loadFile("dashboard/index.html");
    win.shown = true;

}

function createWidget(id)
{   
    winW["w" + id] = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 40,
        minHeight: 40,
        title: "Custom Widget - ID " + id,
        icon: "icon.ico",
        frame: false,
        backgroundColor: '#00000000',
        skipTaskbar: true,
        focusable: false,
        closable: false,
        minimizable: false,
        resizable: false,
        movable: false,
        transparent: true,
        offscreen: true,
        webPreferences: {
            nodeIntegration: true,
            preload: `${__dirname}/preload_widget.js`
        }
    });
    winW["w" + id].on("page-title-updated", (event) => {
        event.preventDefault();
    });
    winW["w" + id].on("resized", () => {
        if(win.shown) // when resized, position has to be updated as well in some cases
        {
            let [sizx, sizy] = winW["w" + id].getSize();
            if(sizx < 40 || sizy < 40) { sizx = 40; sizy = 40; winW["w" + id].setSize(40, 40); }
            win.webContents.send('resizeEvent', {wid: id, x: sizx, y: sizy});
            sett["widget" + id].Size_X = sizx;
            sett["widget" + id].Size_Y = sizy;

            const [posx, posy] = winW["w" + id].getPosition();
            win.webContents.send('moveEvent', {wid: id, x: posx, y: posy});
            sett["widget" + id].Pos_X = posx;
            sett["widget" + id].Pos_Y = posy;
        }
    });
    winW["w" + id].on("moved", () => {
        if(win.shown)
        {
            const [posx, posy] = winW["w" + id].getPosition();
            win.webContents.send('moveEvent', {wid: id, x: posx, y: posy});
            sett["widget" + id].Pos_X = posx;
            sett["widget" + id].Pos_Y = posy;
        }
    });
    winW["w" + id].on("closed", () => {
        winW["w" + id] = null;
    });
    remoteMain.enable(winW["w" + id].webContents);

    winW["w" + id].loadFile("index.html");

    widgetSetData(id);

    winW["w" + id].shown = true;
    winW["w" + id].renderFailCount = 0;
    widgetFails_Busy[id] = 0;
    winW["w" + id].updateInterval = null;

    renderWidget(id);
}
ipcMain.on('widgetLogs', (event, obj) => {
    let values = "";
    for(let i = 0; i < obj.value.length; i++)
    {
        values += obj.value;
        if(obj.value.length > 1) values += "; ";
    }
    console.log("[Widget " + obj.type + "] " + values);
});

function createShownWidgets()
{
    let any = 0;
    for(let i = 0; i < MAX_WIDGETS; i++)
    {
        if(sett["widget" + i] != undefined)
        {
            if(sett["widget" + i]["Shown"] != undefined && Number(sett["widget" + i]["Shown"]) == 1)
            {
                createWidget(i);
                any++;
            }
        }
    }
    if(!any && win.shown != true) app.exit();
}

function widgetSetData(id)
{
    if(win.shown) // if dashboard is open
    {
        if(winW["w" + id] == undefined && Number(sett["widget" + id].Shown) == 1)
        {
            createWidget(id);
            SetBottomMost(winW["w" + id].getNativeWindowHandle());
            DisableMinimize(winW["w" + id].getNativeWindowHandle());
        }
        else if(winW["w" + id] != undefined && Number(sett["widget" + id].Shown) == 1)
        {
            winW["w" + id].show();
            winW["w" + id].shown = true;
            SetBottomMost(winW["w" + id].getNativeWindowHandle());
            DisableMinimize(winW["w" + id].getNativeWindowHandle());
        }
        else if(winW["w" + id] !== undefined && Number(sett["widget" + id].Shown) == 0)
        {
            winW["w" + id].hide();
            winW["w" + id].shown = false;
            return;
        }
    }

    if(winW["w" + id] != undefined)
    {
        if(sett["widget" + id].Pos_X != undefined && sett["widget" + id].Pos_Y != undefined) winW["w" + id].setPosition(Number(sett["widget" + id].Pos_X), Number(sett["widget" + id].Pos_Y));
        if(sett["widget" + id].Size_X != undefined && sett["widget" + id].Size_Y != undefined)
        {
            winW["w" + id].setMinimumSize(Number(sett["widget" + id].Size_X), Number(sett["widget" + id].Size_Y));
            winW["w" + id].setSize(Number(sett["widget" + id].Size_X), Number(sett["widget" + id].Size_Y));
            setTimeout(() => {
                winW["w" + id].setMinimumSize(40, 40);
            }, 300);
        }
        if(sett["widget" + id].Opacity != undefined) winW["w" + id].setOpacity(sett["widget" + id].Opacity / 100);

        winW["w" + id].shown = true;
    }

    
    if(wtemprender[id] && wtempreload[id] && winW["w" + id] != undefined && winW["w" + id].webContents != undefined)
    {
        winW["w" + id].webContents.reload();
        setTimeout(() => {
            winW["w" + id].webContents.send('sendData', { // send data from main to renderer
                inprogress: 1
            });
        }, 500);
        winW["w" + id].renderFailCount = 0;
        renderWidget(id);
        wtemprender[id] = false;
        wtempreload[id] = false;
    }
    else if(wtemprender[id] && winW["w" + id] != undefined && winW["w" + id].webContents != undefined)
    {
        winW["w" + id].renderFailCount = 0;
        renderWidget(id);
        wtemprender[id] = false;
    }
    else if(wtempreload[id] && winW["w" + id] != undefined && winW["w" + id].webContents != undefined)
    {
        winW["w" + id].webContents.reload();
        setTimeout(() => {
            winW["w" + id].webContents.send('sendData', { // send data from main to renderer
                imgsrc: roamingPath + "\\widgetRender" + id + ".png"
            });
        }, 500);
        wtempreload[id] = false;
    }

}

function createTempWin()
{
    tempwin = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "Custom Widget Temporary Window",
        icon: "icon.ico",
        show: false,
        webPreferences: {
            nodeIntegration: true,
            preload: `${__dirname}/preload_widgetRenderer.js`
        }
    });
    tempwin.on("page-title-updated", (event, title) => {
        if(title === "Renderer-Ready-Toxic48" && tempwin.rendering)
        {
            clearTimeout(tempwin.failtimer);
            setTimeout(renderWidgetCallback, 700); // delay before rendering
        }
    });
    tempwin.webContents.on("did-fail-load", (error, errorCode) => {
        if(tempwin.rendering)
        {
            failedRender();
        }
    });
    tempwin.webContents.setAudioMuted(true);
    tempwin.on("closed", (event) => {
        app.exit();
    });
    remoteMain.enable(tempwin.webContents);
}
//----------//

let tray = null;

const gotTheLock = app.requestSingleInstanceLock();
if(!gotTheLock) app.quit();

app.on("second-instance", (event, commandLine, workingDirectory) => {
    for(let i = 0; i < commandLine.length; i++)
    {
        if(commandLine[i].startsWith("--dashboard") || commandLine[i].startsWith("-dashboard") || commandLine[i].startsWith("dashboard"))
        {
            if(win.shown != true) createDashboard();
        }
    }
    
});

app.whenReady().then(() => {
    createTempWin();

    if(showDash && win.shown != true)
    {
        createDashboard();
    }
    
    createShownWidgets();

    for(let i = 0; i < MAX_WIDGETS; i++)
    {
        if(winW["w" + i] != undefined)
        {
            SetBottomMost(winW["w" + i].getNativeWindowHandle());
            DisableMinimize(winW["w" + i].getNativeWindowHandle());
        }
    }
    //----------//

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createTempWin();
            if(showDash)
            {
                createDashboard();
            }
            createWidget();
            for(let i = 0; i < MAX_WIDGETS; i++)
            {
                if(winW["w" + i] != undefined)
                {
                    SetBottomMost(winW["w" + i].getNativeWindowHandle());
                    DisableMinimize(winW["w" + i].getNativeWindowHandle());
                }
            }
        }
    });

    // Tray
    const iconPath = path.join(__dirname, "icon.ico");
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
    {
        label: 'Dashboard', click () {
            if(win.shown != true) createDashboard();
            else if(win.shown && win.isMinimized()) win.restore();
        }
    },
    {
        label: 'Exit', click () {
            app.exit();
        }
    }]);
    tray.setToolTip("Custom Widget App");
    tray.setContextMenu(contextMenu);

    // Auto-launch on startup
    if(!app.getPath("exe").startsWith(app.getPath("desktop")))
    {
        let autoLaunch = new AutoLaunch({
            name: "Custom Widget App",
            path: app.getPath("exe")
        });
        autoLaunch.isEnabled().then((isEnabled) => {
            if(!isEnabled) autoLaunch.enable();
        });
    }
});

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') 
    {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

function renderWidget(id, loadingAnim = true)
{
    if(!tempwin.rendering && id > -1)
    {
        tempwin.rendering = true;
        tempwid = id;
        widgetFails_Busy[id] = 0;
        if(widgetFails_Busy_Timer[id] != undefined) clearTimeout(widgetFails_Busy_Timer[id]);

        if(loadingAnim)
        {
            winW["w" + tempwid].webContents.send('sendData', { // send data from main to renderer
                inprogress: 1
            });
        }

        Currently_Rendering = id;
        global.Currently_Rendering = Currently_Rendering;
        global.Cur_Widget_Scroll = sett["widget" + id].Scroll || 0;
        fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));

        tempwin.loadURL(sett["widget" + id].URL);
        tempwin.webContents.setAudioMuted(true);

        tempwin.failtimer = setTimeout(failedRender, 20000);
    }
    else if(id > -1)
    {
        if(widgetFails_Busy[id] >= 5)
        {
            console.error("Cannot render another image, the widget renderer is already busy! [Trying to render ID: " + id + "]");
        }
        else
        {
            widgetFails_Busy[id]++;
            widgetFails_Busy_Timer[id] = setTimeout(() => {
                renderWidget(id);
            }, 1000);
        }
    }
}

function failedRender() 
{
    if(tempwin.rendering)
    {
        if(tempwid != -1 && winW["w" + tempwid].renderFailCount >= 3)
        {
            winW["w" + tempwid].renderFailCount = 0;
            wtemprender[tempwid] = true;

            let dialogtemp = tempwid;
            tempwin.rendering = false;
            tempwid = -1;
            Currently_Rendering = -1;
            global.Currently_Rendering = Currently_Rendering;
            global.Cur_Widget_Scroll = 0;
            fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
            tempwin.loadFile("./empty.html");

            dialog.showMessageBox(winW["w" + dialogtemp], {
                type: "warning",
                icon: "icon.ico",
                buttons: ["OK", "Exit app"],
                title: "Custom Widget App",
                defaultId: 0,
                cancelId: 1,
                noLink: true,
                message: "The widget renderer couldn't render the image.\nPossible network timeout.\nRestart the app or press 'Apply' again to retry..."
            }).then((result) => {
                if(result.response === 1) app.exit();
            });
        }
        else if(tempwid != -1 && winW["w" + tempwid].renderFailCount < 3)
        {
            winW["w" + tempwid].renderFailCount++;
            let retryid = tempwid;
            tempwin.rendering = false;
            tempwid = -1;
            Currently_Rendering = -1;
            global.Currently_Rendering = Currently_Rendering;
            global.Cur_Widget_Scroll = 0;
            fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
            tempwin.loadFile("./empty.html");
            setTimeout(() => {
                console.log("The widget renderer failed to render an image, retrying... [ID: " + retryid + "]");
                renderWidget(retryid);
            }, 200);
        }
    }
}

function renderWidgetCallback()
{
    tempwin.timeout2 = setTimeout(() => {
        Currently_Rendering = -1;
        global.Currently_Rendering = Currently_Rendering;
        global.Cur_Widget_Scroll = 0;
        fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
        tempwin.rendering = false;
        let www = tempwid;
        tempwid = -1;
        console.log("The widget renderer failed to render an image, retrying... [ID: " + www + "]");
        renderWidget(www);
    }, 7000);

    let ts = Date.now();

    tempwin.webContents.capturePage({x: 0, y: 0, width: 1280, height: 720}).then((img) => {
        if(Date.now() <= (ts + 7000))
        {
            clearTimeout(tempwin.timeout2);
            fs.writeFileSync(roamingPath + "\\widgetRender" + tempwid + ".png", img.toPNG(), "base64");
            
            if(fs.statSync(roamingPath + "\\widgetRender" + tempwid + ".png").size == 0)
            {
                failedRender();
                return;
            }
            else
            {
                winW["w" + tempwid].webContents.send('sendData', { // send data from main to renderer
                    imgsrc: roamingPath + "\\widgetRender" + tempwid + ".png"
                });

                if(winW["w" + tempwid].updateInterval == null)
                {
                    const currid = tempwid;
                    winW["w" + currid].updateInterval = 1;
                    setTimeout(() => {
                        winW["w" + currid].updateInterval = setInterval(() => {
                            renderWidget(currid, false);
                        }, 300000); // update widget every 5 min
                    }, (currid+1)*500*((currid+1)/2));
                }

                tempwid = -1;
                tempwin.rendering = false;
                Currently_Rendering = -1;
                global.Currently_Rendering = Currently_Rendering;
                global.Cur_Widget_Scroll = 0;
                fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
                tempwin.loadFile("./empty.html");
            }
        }
    });
}