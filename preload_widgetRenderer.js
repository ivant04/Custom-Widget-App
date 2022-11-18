const remote = require("@electron/remote");


const Currently_Rendering = remote.getGlobal("Currently_Rendering");
const Scroll = remote.getGlobal("Cur_Widget_Scroll");


window.addEventListener("load", () => {
    if(Currently_Rendering != undefined && Currently_Rendering != -1)
    {
        if(Scroll != undefined && Scroll > 0)
        {
            let elem = document.createElement("script");
            elem.src = "https://code.jquery.com/jquery-3.6.1.js";
            elem.integrity = "sha256-3zlB5s2uwoUzrXK3BT7AX3FyvojsraNFxCc2vC/7pNI="
            elem.crossOrigin = "anonymous";
            document.head.appendChild(elem);


            window.scrollTo(0, Number(Scroll || 0));
        }
    }
});


document.addEventListener("readystatechange", event => { 
    if(event.target.readyState === "complete") {
        setTimeout(() => {
            if(Currently_Rendering != undefined && Currently_Rendering != -1)
            {
                let time = 300;
                if(Scroll != undefined && Scroll > 0)
                {
                    // Sometimes using "window.scrollTo()" doesn't work, but jquery scroll does
                    // But some sites don't allow importing scripts so we use both methods

                    let elems = document.createElement("script");
                    elems.innerHTML = '$("html, body").animate({ scrollTop: ' + Number(Scroll || 0) + ' }, 10);';
                    document.head.appendChild(elems);
                    time += 700;
                }
                setTimeout(() => {
                    if(Scroll != undefined && Scroll > 0) // Additional checks for scroll value
                    {
                        if(Scroll != undefined && document.body.scrollTop < Scroll)
                        {
                            window.scrollTo(0, Scroll || 0);
                            let elems = document.createElement("script");
                            elems.innerHTML = '$("html, body").animate({ scrollTop: ' + Number(Scroll || 0) + ' }, 10);';
                            document.head.appendChild(elems);

                            setTimeout(() => {
                                document.title = "Renderer-Ready-Toxic48";
                            }, 500);
                        }
                        else document.title = "Renderer-Ready-Toxic48";
                    }
                    else document.title = "Renderer-Ready-Toxic48";
                }, time);
            }
        }, 200);
    }
});