const remote = require("@electron/remote");
const fs = require("fs");

const Currently_Rendering = remote.getGlobal("Currently_Rendering");
const Scroll = remote.getGlobal("Cur_Widget_Scroll");


document.addEventListener("readystatechange", event => { 
    if(event.target.readyState === "complete") {
        setTimeout(() => {
            if(Currently_Rendering != undefined && Currently_Rendering != -1)
            {
                if(Scroll != undefined)
                {
                    let scr = 0;
                    if(!isNaN(Scroll))
                    {
                        scr = Number(Scroll);
                    }
                    if(scr > document.body.scrollHeight)
                    {
                        scr = document.body.scrollHeight;
                    }
                    
                    window.scrollTo(0, scr);
                }
            }
            
            setTimeout(() => {
                document.title = "Renderer-Ready-Toxic48";
            }, 500);
        }, 1000);
    }
});