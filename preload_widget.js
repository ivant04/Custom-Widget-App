const { contextBridge, ipcRenderer } = require("electron");
const remote = require("@electron/remote");
const fs = require("fs");


contextBridge.exposeInMainWorld('electronAPI', {
    getData: (data) => ipcRenderer.on('sendData', data),
    getMovableStatus: (value) => ipcRenderer.on('movable', value)
});


const roamingPath = process.env.APPDATA + '\\CustomWidgetApp';
if(!fs.existsSync(roamingPath))
{
    fs.mkdirSync(roamingPath);
}
if(!fs.existsSync(roamingPath + '\\settings.json'))
{
    fs.appendFileSync(roamingPath + '\\settings.json', "{}");
}
let rawdata = fs.readFileSync(roamingPath + '\\settings.json');
let sett = JSON.parse(rawdata);


const win = remote.getCurrentWindow();
const ttl = win.getTitle();
let id = -1;
if(!ttl.startsWith("Custom Widget - ID ")) console.error("The preload script couldn't get the widget ID");
else
{
    id = Number(ttl.substring("Custom Widget - ID ".length));
}


window.onload = (event) => {
    if(sett["widget" + id].Round_Edges != undefined)
    {
        document.getElementById("wrapmainimg").style.borderRadius = (sett["widget" + id].Round_Edges/10) + "em";
    }
    if(sett["widget" + id].Zoom != undefined)
    {
        const zoom = sett["widget" + id].Zoom/100;
        if(zoom > 1)
        {
            document.getElementById("mainimg").style.transform = "scale(" + zoom + ")";
            document.getElementById("wrapmainimg").style.transform = "scale(1)";

            if(sett["widget" + id].Zoom_Pos_X != undefined && sett["widget" + id].Zoom_Pos_Y != undefined)
            {
                document.getElementById("mainimg").style.transformOrigin = sett["widget" + id].Zoom_Pos_X + "% " + sett["widget" + id].Zoom_Pos_Y + "%";
            }
        }
        else if(zoom < 1)
        {
            document.getElementById("wrapmainimg").style.transform = "scale(" + zoom + ")";
            document.getElementById("mainimg").style.transform = "scale(1)";
        }
        else
        {
            document.getElementById("mainimg").style.transform = "scale(1)";
            document.getElementById("wrapmainimg").style.transform = "scale(1)";
        }
    }
    if(sett["widget" + id].Border_Width != undefined)
    {
        document.getElementById("wrapmainimg").style.borderWidth = sett["widget" + id].Border_Width + "px";
        document.getElementById("wrapmainimg").style.borderStyle = "solid";

        if(sett["widget" + id].Border_Color != undefined)
        {
            document.getElementById("wrapmainimg").style.borderColor = sett["widget" + id].Border_Color;
        }
        else
        {
            document.getElementById("wrapmainimg").style.borderColor = "#ffffff";
        }
    }


    document.body.scroll = "no";
    document.body.style.overflow = "hidden";
    document.body.style.pointerEvents = "none";
    document.body.style.userSelect = "none";
}


[].map.call(document, function(elem) {
    elem.addEventListener("keydown", function(e) {
        if (e.keyCode != 9) {
            e.returnValue = false;
            return false;
        }
    }, true);
});