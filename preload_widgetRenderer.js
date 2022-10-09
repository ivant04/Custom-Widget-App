const fs = require("fs");

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



document.addEventListener('readystatechange', event => { 
    if(event.target.readyState === "complete") {
        setTimeout(() => {
            if(sett.Currently_Rendering != undefined && sett.Currently_Rendering != -1)
            {
                if(sett["widget" + sett.Currently_Rendering].Scroll != undefined)
                {
                    let scr = 0;
                    if(!isNaN(sett["widget" + sett.Currently_Rendering].Scroll))
                    {
                        scr = Number(sett["widget" + sett.Currently_Rendering].Scroll);
                    }
                    if(scr > document.body.scrollHeight)
                    {
                        scr = document.body.scrollHeight;
                    }
                    //setInterval(() => {
                        window.scrollTo(0, scr);
                        document.body.scroll = "no";
                        document.body.style.overflow = "hidden";
                    //}, 100);
                }
                else
                {
                    //setInterval(() => {
                        document.body.scroll = "no";
                        document.body.style.overflow = "hidden";
                    //}, 100);
                }
            }
            setTimeout(() => {
                document.title = "Renderer-Ready-Toxic48";
            }, 500);
        }, 1000);
    }
});