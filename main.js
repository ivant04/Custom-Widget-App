const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, dialog } = require('electron');
const { SetBottomMost } = require("electron-bottom-most");
const { DisableMinimize } = require("electron-disable-minimize");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const path = require("path");
const fs = require("fs");
const MAX_WIDGETS = 10;



let showDash = false;
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
    sett.Currently_Rendering = -1;
    fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
}
else
{
    let exist = false;
    for(let i = 0; i < MAX_WIDGETS; i++)
    {
        if(sett["widget" + i] != undefined && sett["widget" + i]["Shown"] == "1")
        {
            exist = true;
            break;
        }
    }

    exist ? showDash = false : showDash = true;
}

sett.Currently_Rendering = -1;
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
        width: 900,
        height: 700,
        title: "Custom Widget App by Toxic",
        icon: "icon.ico",
        //transparent: true,
        //frame: false,
        backgroundColor: '#00FFFFFF',
        webPreferences: {
            nodeIntegration: true,
            preload: `${__dirname}/dashboard/preload_sendData.js`
        }
    });
    win.on("page-title-updated", (event) => {
        event.preventDefault();
    });
    win.on("closed", () => {
        win.shown = false;
        let j = false;
        for(let i = 0; i < MAX_WIDGETS; i++)
        {
            if(winW["w" + i] != undefined)
            {
                if(winW["w" + i].shown)
                {
                    j = true;
                    break;
                }
            }
        }
        if(!j) app.exit();
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
                console.log("main.js recieved unidentified data from the renderer");
            }
        }
    });
    
    win.loadFile("dashboard/index.html");
    win.removeMenu();
    win.shown = true;
}

function createWidget(id)
{   
    winW["w" + id] = new BrowserWindow({
        width: 800,
        height: 600,
        title: "Custom Widget - ID " + id,
        icon: "icon.ico",
        frame: false,
        focusable: false,
        backgroundColor: '#00000000',
        skipTaskbar: true,
        closable: false,
        minimizable: false,
        resizable: false,
        transparent: true,
        backgroundThrottling: false,
        offscreen: true,
        webPreferences: {
            nodeIntegration: true,
            preload: `${__dirname}/preload_widget.js`
        }
    });
    winW["w" + id].on("page-title-updated", (event) => {
        event.preventDefault();
    });
    remoteMain.enable(winW["w" + id].webContents);

    winW["w" + id].loadFile("index.html");

    widgetSetData(id);

    winW["w" + id].shown = true;
    winW["w" + id].renderFailCount = 0;
    widgetFails_Busy[id] = 0;

    renderWidget(id);
}

function createShownWidgets()
{
    for(let i = 0; i < MAX_WIDGETS; i++)
    {
        if(sett["widget" + i] != undefined)
        {
            if(sett["widget" + i]["Shown"] != undefined && Number(sett["widget" + i]["Shown"]) == 1)
            {
                createWidget(i);
            }
        }
    }
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
        if(sett["widget" + id].Size_X != undefined && sett["widget" + id].Size_Y != undefined) { winW["w" + id].setMinimumSize(Number(sett["widget" + id].Size_X), Number(sett["widget" + id].Size_Y)); winW["w" + id].setSize(Number(sett["widget" + id].Size_X), Number(sett["widget" + id].Size_Y)); }
        if(sett["widget" + id].Opacity != undefined) winW["w" + id].setOpacity(sett["widget" + id].Opacity / 100);

        winW["w" + id].shown = true;
    }

    
    if(wtemprender[id] && wtempreload[id] && winW["w" + id].webContents != undefined)
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
    else if(wtemprender[id] && winW["w" + id].webContents != undefined)
    {
        winW["w" + id].renderFailCount = 0;
        renderWidget(id);
        wtemprender[id] = false;
    }
    else if(wtempreload[id] && winW["w" + id].webContents != undefined)
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
    tempwin.on("closed", (event) => {
        app.exit();
    });
}
//----------//

let tray = null;


app.whenReady().then(() => {
    createTempWin();

    if(showDash)
    {
        createDashboard();
    }
    else
    {
        createShownWidgets();
    }

    if(!showDash)
    {
        for(let i = 0; i < MAX_WIDGETS; i++)
        {
            if(winW["w" + i] != undefined)
            {
                SetBottomMost(winW["w" + i].getNativeWindowHandle());
                DisableMinimize(winW["w" + i].getNativeWindowHandle());
            }
        }
    }
    //----------//

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            if(showDash)
            {
                createDashboard();
            }
            else
            {
                createWidget();
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
        }
    },
    {
        label: 'Exit', click () {
            app.exit();
        }
    }]);
    tray.setToolTip("Custom Widget App");
    tray.setContextMenu(contextMenu);
    //

    /*globalShortcut.register("Shift+0", () => {
        winW["w0"].webContents.openDevTools();
    });*/

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

function renderWidget(id)
{
    if(!tempwin.rendering && id > -1)
    {
        tempwin.rendering = true;
        tempwid = id;
        widgetFails_Busy[id] = 0;
        if(widgetFails_Busy_Timer[id] != undefined) clearTimeout(widgetFails_Busy_Timer[id]);

        winW["w" + tempwid].webContents.send('sendData', { // send data from main to renderer
            inprogress: 1
        });

        sett.Currently_Rendering = id;
        fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));

        tempwin.loadURL(sett["widget" + id].URL);

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
            let dialogtemp = tempwid;
            tempwin.rendering = false;
            tempwid = -1;
            sett.Currently_Rendering = -1;
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
                message: "The widget renderer couldn't render the image.\nPossible network timeout.\nRestart the app to retry..."
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
            sett.Currently_Rendering = -1;
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
        sett.Currently_Rendering = -1;
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
                tempwid = -1;
                tempwin.rendering = false;
                sett.Currently_Rendering = -1;
                fs.writeFileSync(roamingPath + '\\settings.json', JSON.stringify(sett));
                tempwin.loadFile("./empty.html");
            }
        }
    });
}