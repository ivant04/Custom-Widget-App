// Including tooltip.css to user's HTML file

var http = new XMLHttpRequest();
http.open('HEAD', "https://gitcdn.link/cdn/Toxic48/attribute-tooltips/main/tooltip.css", false);
http.send();


var link = document.createElement('link');
link.setAttribute('rel', 'stylesheet');
link.setAttribute('type', 'text/css');

if(http.status == 404) // If the CSS file can't be downloaded from GitHub, use the local file
{
    link.setAttribute('href', 'tooltip.css');
}
else
{
    link.setAttribute('href', 'https://gitcdn.link/cdn/Toxic48/attribute-tooltips/main/tooltip.css');
}

document.getElementsByTagName('head')[0].appendChild(link);


// Changing the tooltip color, text color, text size and hover transition speed

function setProp()
{
    var el = document.querySelectorAll("[data-tooltip-text]");

    for(var i = 0; i < el.length; i++)
    {
        if(el[i].hasAttribute("data-tooltip-color"))
        {
            el[i].style.setProperty('--color', el[i].getAttribute("data-tooltip-color"));
            if(el[i].hasAttribute("data-tooltip-location"))
            {
                if(el[i].getAttribute("data-tooltip-location") == "left")
                {
                    el[i].style.setProperty('--bcolor', 'transparent transparent transparent ' + el[i].getAttribute("data-tooltip-color"));
                }
                else if(el[i].getAttribute("data-tooltip-location") == "right")
                {
                    el[i].style.setProperty('--bcolor', 'transparent ' + el[i].getAttribute("data-tooltip-color") + ' transparent transparent');
                }
                else if(el[i].getAttribute("data-tooltip-location") == "bottom")
                {
                    el[i].style.setProperty('--bcolor', 'transparent transparent ' + el[i].getAttribute("data-tooltip-color") + ' transparent');
                }
                else
                {
                    el[i].style.setProperty('--bcolor', el[i].getAttribute("data-tooltip-color") + ' transparent transparent transparent');
                }
            }
            else
            {
                el[i].style.setProperty('--bcolor', el[i].getAttribute("data-tooltip-color") + ' transparent transparent transparent');
            }
        }

        if(el[i].hasAttribute("data-tooltip-text-color"))
        {
            el[i].style.setProperty('--tcolor', el[i].getAttribute("data-tooltip-text-color"));
        }

        if(el[i].hasAttribute("data-tooltip-text-size"))
        {
            el[i].style.setProperty('--tsize', el[i].getAttribute("data-tooltip-text-size"));
        }

        if(el[i].hasAttribute("data-tooltip-speed"))
        {
            var speed = el[i].getAttribute("data-tooltip-speed");
            var pos = speed.search("ms");
            var m = 1;
            if(pos == -1)
            {
                pos = speed.search("s");
                m = 0;
            }

            if(pos != -1)
            {
                el[i].style.setProperty('--speed', el[i].getAttribute("data-tooltip-speed"));

                if(m == 1)
                {
                    speed = speed.substring(0, pos);
                    var aspeed = Number(speed) + 200;
                    el[i].style.setProperty('--aspeed', aspeed + "ms");
                }
                else if(m == 0)
                {
                    speed = speed.substring(0, pos);
                    var aspeed = Number(speed) + 0.2;
                    el[i].style.setProperty('--aspeed', aspeed + "s");
                }
            }
        }
    }

    // Keep updating tooltip in case something is modified
    // You can remove this part if you don't update tooltip properties after initially loading the page
    setInterval(() => {
        setProp();      
    }, 1000);
    //
    
}

document.addEventListener('DOMContentLoaded', setProp, false); // Insert the attributes into the tooltip when the page initially loads
