// http://sebastien.drouyer.com/jquery.flowchart-demo/
/// https://github.com/sdrdis/jquery.flowchart
// https://gojs.net/latest/index.html

// TODO: impl. loader delay inb4 resend query
// TODO: impl. canvas div clear inb4 redisplay
// TODO: design patterns / class inherence for checkbox mouseevents and triggers ... ?

// https://www.techiediaries.com/javascript-queryselectorall-nodelist-foreach/
// https://css-tricks.com/a-bunch-of-options-for-looping-over-queryselectorall-nodelists/
var config = { // initial cfg for diagram
    container: "#custom-colored",

    nodeAlign: "BOTTOM",

    connectors: {
        type: 'step'
    },
    node: {
        HTMLclass: 'nodeExample1'
    }
}

var myDiv = null;
var asignaturas = [];
var prereqs = [];
var prereqs_perc = [];
var sList = "";
var fileReader;
var fileLoader;
var highlightSpec;

var creditsHolder = {};

function workThingHighlight(myThing, checked) {
    var classToSet = "highlight";
    if(highlightSpec) {
        classToSet = "highlightTemp";
        myThing.setAttribute("class", "");
    }
    if(!checked && myThing.classList.contains("highlightTemp")) {
        myThing.classList.remove("highlightTemp");
    } else {
        if(checked) {
            myThing.classList.add(classToSet);
        } else {
            myThing.classList.remove(classToSet);
        }
    }
}

function resetCreditsHolder() {
    asignaturas = [];
    prereqs = [];
    prereqs_perc = [];
	creditsHolder = {
		credits: 0,
		seleccion: 0,
		creditsTotal: 0,
		numAsignaturas: 0,
		numAsignaturasTotal: 0
	};
}

function slcHandleChange(myRadio) {
    var selcMaxHolder = document.getElementById("currentSelectMax");
    selcMaxHolder.innerHTML = myRadio.value;
}

function checkBoxMark(target) {
    var checked = target.checked;
    var id = target.parentElement.childNodes[1].innerText.trimStart().trimEnd();
    // avoid redundancy
    if (asignaturas[id]['selected'] == checked) return;

    // TODO: pattern ".\d\% De los créditos aprobados" spec. req
    var credHolder = document.getElementById("currentCredits");
    var asigHolder = document.getElementById("currentAsignaturas");
    var selcHolder = document.getElementById("currentSelect");
    if (checked == false) {
        var header = target.parentElement.parentElement.querySelector(".headcheck");
        var checkboxes = header.querySelectorAll("input[type=checkbox]");

        checkboxes.forEach((button) => {
			if(button.checked) {
				button.checked = false;
				header.classList.remove('highlight');
			}
        });
	  creditsHolder['credits'] -= parseInt(asignaturas[id]['creditos']);
      if(!highlightSpec) {
        creditsHolder['seleccion'] -= parseInt(asignaturas[id]['creditos']);
      }
	  creditsHolder['numAsignaturas']--;
	  
	  trigger_creditsProgressBar();
	} else {
	  creditsHolder['credits'] += parseInt(asignaturas[id]['creditos']);
      if(!highlightSpec) {
        creditsHolder['seleccion'] += parseInt(asignaturas[id]['creditos']);
      }
	  creditsHolder['numAsignaturas']++;
	  
	  trigger_creditsProgressBar();
    }
    credHolder.innerHTML = creditsHolder['credits'];
    asigHolder.innerHTML = creditsHolder['numAsignaturas'];
    selcHolder.innerHTML = creditsHolder['seleccion'];
    workThingHighlight(target.parentElement, checked);
    if(highlightSpec) {
        target.disabled = true;
    }

    asignaturas[id]['selected'] = checked;

    if (prereqs[id]) {

        // it should be noted some recursion begins here
        var value;
        // TODO: eval performance for vs map
        for (var index = 0; index < prereqs[id].length; ++index) {
            value = prereqs[id][index];
            if (asignaturas[value].disabled && checked) {
                var doContinue = true;
                var tempThing = asignaturas[value]['prereq'];
				
                tempThing.map(function(a) {
                    if (a != id && asignaturas[a]['selected'] == false) {
                        doContinue = false;
                    }
                });
                if (doContinue) {
                    asignaturas[value].disabled = false;
                    var htmlElem = asignaturas[value].htmlref;
                    
                    var checkbox = document.createElement('input');
                    checkbox.type = "checkbox";
                    checkbox.className = "chkAsg";
                    checkbox.onchange = change_checkBoxMark;

                    htmlElem.insertAdjacentElement('beforeend', checkbox);

                    // TODO: CHECK IF BROWSER COMPAT https://stackoverflow.com/questions/18880890/how-do-i-toggle-an-elements-class-in-pure-javascript
                    if (htmlElem.classList.contains('highlightRed')) {
                        htmlElem.classList.remove('highlightRed');
                    }
                }
            } else if (!asignaturas[value].disabled && !checked) {
                asignaturas[value].disabled = true;

                var htmlElem = asignaturas[value].htmlref;
                [].forEach.call(htmlElem.getElementsByClassName("chkAsg"), function (el) {
                  el.checked = false;
                  fireEvent(el, 'change');
				  el.parentElement.classList.add('highlightRed');
                  el.remove();
                });

                if (htmlElem.parentElement.classList.contains('highlightRed')) {
                    htmlElem.parentElement.classList.remove('highlightRed');
                }
            }
        }
    }
}

function change_checkHeaderBoxMark(event) {
	var checked = event.target.checked;
	if (!checked) {
		event.target.parentNode.classList.remove('highlight');
	} else {
		event.target.parentNode.classList.add('highlight');
	}
	Array.prototype.forEach.call(event.target.parentElement.parentElement.getElementsByClassName("chkAsg"),
		function(element, index) {
            //				var objRef = element.getElementsByClassName("input[type=checkbox]")[0];
            if(!element.disabled) {
                element.checked = checked;
                fireEvent(element, 'change');
            }
			//			element.children("input[type=checkbox]").attr("checked", checked).trigger("change");
		});
}

function change_checkBoxMark(event) { // enable selection upon use
    checkBoxMark(event.target);
}

function fileReaderOnLoad(event) {
    var data = event.target.result; // data <-- in this var you have the file data in Base64 format
    var str = data.replace('data:text/plain;base64,', '')
    sList = str.split(",");
    highlightSpec = true;

    // https://stackoverflow.com/questions/3871547/js-iterating-over-result-of-getelementsbyclassname-using-array-foreach
    var els = document.getElementsByTagName("tr");
    for(var it = 0; it < els.length; it++)
    {
        var el = els[it];
        // TODO: un- chopped'n'screwed

        var truth = parseInt(sList[it]) == 1 ? true : false;
        // https://stackoverflow.com/questions/37790582/how-to-get-and-use-table-in-html-by-javascript-by-getelementsbyclassname

        var myid = el.children[0].localName;
        if(el.children[4] != null) {
            el.children[4].checked = truth;
            fireEvent(el.children[4], 'change');
        }
    }
    highlightSpec = false;
    fileLoader.value = "";
}

function createFileReader() {
    // https://stackoverflow.com/questions/15791279/how-to-get-files-from-input-type-file-indirect-with-javascript/15792918
    fileReader = new FileReader();
    fileReader.onload = fileReaderOnLoad;
    fileReader.readAsText(fileLoader.files[0]);
}

function loadCarrera() {
    // FIRST THINGS FIRST;
    // THE CODE BEGINS HERE. THIS IS WHERE THE PENSUM IS LOADED.
    var e = document.getElementById("dropper");
    if(e == "NONE") {
        return;
    }

    var url = "carreras/";
    url += e.options[e.selectedIndex].value;
    url += '.html';
	resetCreditsHolder();
    httpGetAsync(url, function(result) {
        // https://stackoverflow.com/questions/10585029/parse-an-html-string-with-js
        var myLoader = document.getElementById("loader");
        fileLoader = document.getElementById("file1");

        var parser = new DOMParser();
        var html = parser.parseFromString(result, 'text/html');
        myLoader.innerHTML = "";
        document.getElementById("custom-colored").innerHTML = "";

        var elements;
        elements = document.getElementsByTagName("input");
        for (var i = 0; i < elements.length; i++) {
            elements[i].removeAttribute("disabled");
        }
        elements = document.getElementsByTagName("textarea");
        for (var i = 0; i < elements.length; i++) {
            elements[i].removeAttribute("disabled");
        }

        myDiv = html.getElementsByClassName("contPensum")[0];
        myLoader.appendChild(myDiv);
        document.getElementById("loadbtn").addEventListener("mouseup", function() {
            // https://stackoverflow.com/questions/2381572/how-can-i-trigger-a-javascript-event-click
            fileLoader.click();
        }, false);

        // FOR THE PURPOSE OF MAKING A BUTTON TO LOAD A CONFIGURATION
        // https://stackoverflow.com/questions/2820249/base64-encoding-and-decoding-in-client-side-javascript
        fileLoader.addEventListener("change", createFileReader, false);

        // check this out for free hits:
        // https://html5-tutorial.net/Localization/LanguageStatus/es/
        // ADD CHECKBOXES TO DETERMINE CURRENT PROGRAMME DEVELOPMENT

        [].forEach.call(document.getElementsByTagName("table"),
            function(elem, index) {
                var trows = elem.querySelectorAll('tr');
                // TODO: can add mouseevents here
                // header row
                trows[0].classList.toggle('headcheck');
                trows[0].insertAdjacentHTML('beforeend', '<input class="chkHead" type="checkbox"/>');

                //etc row
                var el;
                for (var i = 1; i < trows.length; ++i) {
                    el = trows[i];
                    /////////////////////////////////////////
                    // the making of a configuration array //
                    /////////////////////////////////////////
                    var texty = el.children[3].innerText; // TODO: export dynamic table?

                    var expresion = /[A-Z]{3}[0-9]{3}/gi;
                    var patt = new RegExp(expresion);

                    var exp2 = /(\d{2})\%.+/gi;
                    var patt2 = new RegExp(exp2);

                    var res = patt.test(texty);
                    var res2 = patt2.test(texty);
					
                    var asignatura = [];
                    asignatura['htmlref'] = el;

                    var codigo = el.children[0].innerText.trimStart().trimEnd();
                    asignatura['label'] = el.children[1].innerText.trimStart().trimEnd();
                    asignatura['creditos'] = el.children[2].innerText.trimStart().trimEnd();
                    creditsHolder['creditsTotal'] += parseInt(asignatura['creditos']);
					creditsHolder['numAsignaturasTotal'] += 1;
                    asignatura['selected'] = false;
                    if (res) {
                        var matches = texty.match(expresion);
                        asignatura['prereq'] = matches;
                        matches.map(function(i) {
                            if (!prereqs[i]) {
                                prereqs[i] = [];
                            }
                            prereqs[i].push(codigo);
                        });
                        asignatura['disabled'] = true;
                        el.classList.toggle('highlightRed');
                    } else {
                        /////////////////////////////////
                        // the formation of a checkbox //
                        /////////////////////////////////
                        // insertAdjacentHTML('beforeend'
                        if (res2) {
                            var matches = exp2.exec(texty);
                            if (!prereqs_perc[matches[1]]) {
                                prereqs_perc[matches[1]] = [];
                                prereqs_perc[matches[1]].push(codigo);
                            }
                            asignatura['disabled'] = true;
                            el.classList.toggle('highlightRed');
                        } else {
                            var checkbox = el.insertAdjacentHTML('beforeend', '<input class="chkAsg" type="checkbox"/>');
                        }
                    }
                    asignaturas[codigo] = asignatura;
                }

            });
        var els = document.getElementsByClassName("chkHead");
        Array.prototype.forEach.call(els, function(el) {
            el.addEventListener("change", change_checkHeaderBoxMark);
        });
        var els = document.getElementsByClassName("chkAsg");
        Array.prototype.forEach.call(els, function(el) {
            el.addEventListener("change", change_checkBoxMark);
        });
        document.body.style.background = "";// 

        // ASSIGN A CHECKBOX TO EACH TABLE ROW FOR CHOICES
        //
        var preInfo = myLoader.getElementsByClassName("infoCarrera")[0];

        var infoPlus = document.createElement('div');

        var contextInnerHtml = "<h2>Información Adicional</h2>";
        contextInnerHtml += "<h3>Créditos</h3>: <span id=\"currentCredits\">0</span> / "+creditsHolder['creditsTotal'];
        contextInnerHtml += "<div id=\"myProgress\"><div id=\"myBar\">0%</div></div>";
        contextInnerHtml += "<h3>Cantidad de asignaturas</h3>: <span id=\"currentAsignaturas\">0</span> / " + creditsHolder['numAsignaturasTotal'];

        // max creds : https://www.unapec.edu.do/media/1334/reg-vc-0023-reglamento-estudiantil005.pdf
        contextInnerHtml += "<h3>Cantidad de selección</h3>: <span id=\"currentSelect\">0</span> / " + "<span id=\"currentSelectMax\">0</span>";

        contextInnerHtml += "<br><h3>Cómo me esta llendo</h3>:"
        contextInnerHtml += "<ul>"
        contextInnerHtml += "<li><input type=\"radio\" name=\"slcMax\" id=\"slcNormal\" onchange=\"slcHandleChange(this);\" value=\"24\"><label for=\"slcNormal\">Jebi [NORMAL]</label></li>";
        contextInnerHtml += "<li><input type=\"radio\" name=\"slcMax\" id=\"slcBenef\" onchange=\"slcHandleChange(this);\" value=\"27\"><label for=\"slcBenef\">Muy jebi [>=3.25]</label></li>";
        contextInnerHtml += "<li><input type=\"radio\" name=\"slcMax\" id=\"slcPleb\" onchange=\"slcHandleChange(this);\" value=\"15\"><label for=\"slcPleb\">Me toy j*****do [>=2.5]</label></li>";
        contextInnerHtml += "<li><input type=\"radio\" name=\"slcMax\" id=\"slcGGn00b\" onchange=\"slcHandleChange(this);\" value=\"13\"><label for=\"slcGGn00b\">GG WP [Prueba Académica]</label></li>";
        contextInnerHtml += "</ul>"
        contextInnerHtml += "¿<a href=\"img/maxcreds.png\" target=\"_blank\">Qué significa esto</a>? Las <a href=\"https://www.unapec.edu.do/media/1334/reg-vc-0023-reglamento-estudiantil005.pdf#page=14&zoom=175,109,320\">reglas</a> son importantes."

		// TODO : can add milestones (like SEMINARIO status: UNAVAIL/READY/COMPLETE, PASANTIA, OPTATIVA, etc)
            
          infoPlus.innerHTML = contextInnerHtml;
          infoPlus.className = 'infoCarreraPlus';

        preInfo.parentNode.insertBefore(infoPlus, preInfo);

        slcHandleChange(document.getElementById("slcNormal"));
        document.getElementById("slcNormal").checked = true;
    });
}

function trigger_creditsProgressBar() {
    i = 1;
    var elem = document.getElementById("myBar");
    var width = creditsHolder['credits']/creditsHolder['creditsTotal'] * 100;
	var rounded = Math.round(width * 100) / 100;
	
	elem.style.width = rounded + "%";
	elem.innerHTML = rounded + "%";

	elem.className = '';
	if(rounded == 100) {
		elem.classList.add("statusFinal");
	} else if(rounded > 85) {
		elem.classList.add("status6");
	} else if(rounded > 65) {
		elem.classList.add("status5");
	} else if(rounded > 45) {
		elem.classList.add("status4");
	} else if(rounded > 35) {
		elem.classList.add("status3");
	} else if(rounded > 15) {
		elem.classList.add("status2");
	} else {
		elem.classList.add("status1");
    }
    
    [].forEach.call(prereqs_perc,
        function(elem, index) {
            if(index <= rounded) {
                elem.map(function(a) {
                    var htmlElem = asignaturas[a].htmlref;
                    if (asignaturas[a]['disabled'] == true) {
                        var checkbox = document.createElement('input');
                        checkbox.type = "checkbox";
                        checkbox.className = "chkAsg";
                        checkbox.onchange = change_checkBoxMark;

                        htmlElem.insertAdjacentElement('beforeend', checkbox);
                        asignaturas[a]['disabled'] = false;
                        if (htmlElem.classList.contains('highlightRed')) {
                            htmlElem.classList.remove('highlightRed');
                        }
                    }
                });
            } else {
                elem.map(function(a) {
                    var htmlElem = asignaturas[a].htmlref;
                    [].forEach.call(htmlElem.getElementsByClassName("chkAsg"), function (el) {
                        el.checked = false;
                        fireEvent(el, 'change');
                        el.parentElement.classList.add('highlightRed');
                        el.remove();
                    });
                });
            }
        }
    );
}

function saveConfig(e) {
    sList = "";

    var it = 0;
/* 
	var els = document.querySelectorAll("input[type=checkbox]");
    Array.prototype.forEach.call(els, function(el) {
        var sThisVal = (el.checked ? "1" : "0");
        sList += (sList == "" ? sThisVal : "," + sThisVal);
    });
*/

    var els = document.getElementsByTagName("tr");
    Array.prototype.forEach.call(els, function(el) {
		var sThisVal = 0;
		if(el.children[4]) {
			sThisVal = (el.children[4].checked ? "1" : "0");
		}
        sList += (sList == "" ? sThisVal : "," + sThisVal);
    });
	
    // Start file download.
    download("config.txt", sList);
}

window.onload = function() {
    document.getElementById("dropper").addEventListener("change", loadCarrera);
    document.getElementById("dropperBtn").addEventListener("click", loadCarrera);
    // FOR THE PURPOSE OF SAVING THE CONFIGURATION TO THE TEXT BOX
    // FOR THE PURPOSE OF DOWNLOADING TO A JSON [pending JSON]
    document.querySelector("a#programatically").addEventListener("click", saveConfig);

};

/////////////////
// FOOTER BITS //
/////////////////

// begin configuration for Treant JS (flowchart/matrix/graph builder)
$(document).ready(function() {

    var main = { // programme identifier
        text: {
            name: "Ingenieria de Software",
            //title: "Chief executive officer",
            //contact: "Tel: 01 213 123 134",
        },
        image: "img/unapec.png"
    };
    var chart_config = [config,
        main
    ];

    var myobj; // declare this for further use in recursion

    // also, byo recursive function
    function looper(object, callback) {
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                if (false === callback.call(object[key], key, object[key])) {
                    break;
                }
            }
        }
        return object;
    }

    $("#genebtn").click(function() {
        var cfgs = []; // i can has cfg?

        // recursive run in order to configure each diagram object
        looper(asignaturas, function(index, value) {
            var parent = main; // all courses start from the programme identifier [PI]
            if (value['prereq'] && value['prereq'].length > 0) {
                // unless it should have pre-reqs,
                // from which it will choose the first
                parent = cfgs[value['prereq'][value['prereq'].length - 1]];
            }

            // then, it will make individual object for each course
            myobj = {
                parent: parent,
                text: {
                    name: index, // having course id
                    label: value['label'], // having course description
                    creditos: "Creditos: " + value['creditos'] // and having course creds
                }
            };
            if (value['selected'] == true) {
                myobj['HTMLclass'] = 'highlight';
            } else if(value['disabled'] == true) {
                myobj['HTMLclass'] = 'highlightRed';
            }
            cfgs[index] = myobj;
            chart_config.push(myobj);
            //your code
        });

        // the making of a graphic diagram
        var treant = new Treant(chart_config, function() {
            for (i = 0, len = treant.tree.nodeDB.db.length; i < len; i++) {
                node = treant.tree.nodeDB.get(i);
                if (asignaturas[node.text.name])
                    asignaturas[node.text.name]['id'] = i;
            };

            // recursive run again to (inefficiently) add secondary/tertiary/... parent
            looper(asignaturas, function(index, value) {
                if (value['prereq'] && value['prereq'].length > 1) {
                    for (i = 0, len = value['prereq'].length - 1; i < len; i++) {
                        var color = value['prereq'][i];
                        color = "#" + color.substr(3, 1) + "0" + color.substr(4, 1) + "0" + color.substr(5, 1) + "0";

                        // debugging?
                        //console.log(color, value['prereq'][i]);

                        treant.tree.addConnectionToNode(treant.tree.nodeDB.get(value.id), false, treant.tree.nodeDB.get(asignaturas[value['prereq'][i]].id), color);
                    }
                }
            });
        });
    });
});