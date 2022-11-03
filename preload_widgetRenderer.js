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
                    
                    window.scrollTo(0, scr);
                }
            }



                        
            //document.getElementById("CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll").click(); //bitcoin site
            //let d = document.evaluate("//*[. = 'Allow']", document.body).iterateNext(); //bitcoin site also
            
            setTimeout(() => {
                document.title = "Renderer-Ready-Toxic48";
            }, 500);
        }, 1000);
    }
});


function isVisible(elem) {
    if (!(elem instanceof Element)) throw Error('DomUtil: elem is not an element.');
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter   = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode);
    return false;
}