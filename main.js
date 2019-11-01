jQuery(function($) {

	var _oldShow = $.fn.show;

  $.fn.show = function(speed, oldCallback) {
		return $(this).each(function() {
			var obj         = $(this),
				newCallback = function() {
					if ($.isFunction(oldCallback)) {
						oldCallback.apply(obj);
					}
					obj.trigger('afterShow');
				};
      	// you can trigger a before show if you want
			obj.trigger('beforeShow');

			// now use the old function to show the element passing the new callback
    	_oldShow.apply(obj, [speed, newCallback]);
  	});
	};
});

const setLS = (key, value) => {
	localStorage[key] = JSON.stringify(value);
};
const getLS = (key, value) => {
	return localStorage[key] ? JSON.parse(localStorage[key]) : null;
};

// ==================== Vars =======================
let scrollStek = 0;
const wiLists = [
	'.work-item-list .grid-canvas[role=presentation]', 
	'.wiql-query-result-grid .grid-canvas[role=presentation]', 
	'.productbacklog-grid-results .grid-canvas[role=presentation]'
];
	
const TARGET_COLUMNS = [
	{ key: 'Priority', values: ['1'] },
	{ key: 'Priority', values: ['0'], mode: 'important' },
  { 	
  	key: 'Assigned To', 
   	values: [
			'g NCIH',
			'g NCIH Dev',
			'Золотонос Сергей Борисович',
		],
 	},
];

const settings = {
	iterationPath: true,
	iterationPathValue: 2,
	state: false,
	severity: true,
	highlightRows: false,
	
	keys: {
		zoom: true,
		main: true,
		refreshWI: true,
		copyId: true,
		panel: true,
		panelShortkey: false,
	},
};

// ==================== Vars =======================
// @deprecated
let userData = getLS('userData') || {
	filter: ''
};
const eventsInstalled = {
	//textFilter: false,
	triageView: true,
	formatNewView: false,
	highlightList: false,
	devPanel: false,
	formatNewView_count: 0
};
const tfsProject = ['FORIS_Mobile', 'a0bf1feb-f7e0-4f18-9f30-7c4d9ec8d5d9'];
const tfsTeam = 'NCIH 2.0 Team';
// ==================== Грушин =======================

const getColumnIndex = (key) => {
	const headerRefList = document.querySelectorAll('.grid-header-column');
	const headerRefs = Array.from(headerRefList);
	const headerRef = headerRefs.find((header) => header.attributes['aria-label'].value === key);
	return headerRefs.indexOf(headerRef);
}

const applyPatch = (key, patchFn) => {
	const index  = getColumnIndex(key);
	const elementRefs = document.querySelectorAll(`.grid-cell:nth-child(${index + 1})`);
	elementRefs.forEach(patchFn);
};

const iterationPathPatch = (level = 1) => {
	applyPatch('Iteration Path', (elem) => {
		const iterationPath = elem.innerHTML.split('\\');
		const release = iterationPath.slice(iterationPath.length - level).join('\\');
		elem.innerHTML = release;
	});
};

const statePatch = () => {
	applyPatch('State', (elem) => {
		const stateTextElem = elem.querySelector('.workitem-state-value');
		stateTextElem.innerHTML = '';
	});
};

const severityPatch = () => {
	applyPatch('Severity', (elem) => {
		elem.classList.add(`state--${elem.innerHTML}`);
	});
};

const highlightRows = (columns) => {
	if (columns.length === 0) return;
  const rowRefs = document.querySelectorAll('.grid-row.grid-row-normal');
  rowRefs.forEach((rowRef) => {
  	let mode = true;
  	const needToBeHiglighted = columns.some((column) => {
  		const columnIndex = getColumnIndex(column.key);
  		const columnRef = rowRef.children[columnIndex];
  		if (!columnRef) return false;
  		const matchFound = column.values.some((value) => columnRef.innerHTML.includes(value));
  		if (column.mode && matchFound) {
  			mode = column.mode;
  		}
  		return matchFound;
  	});
  	if (mode === 'important') {
  		rowRef.classList.add('row--very-important');
  	} 
  	if (needToBeHiglighted) return;
  	rowRef.classList.add('row--not-important');
  });
};

const applyPatches = () => {
	settings.iterationPath && iterationPathPatch(settings.iterationPathValue || 1);
	settings.state && statePatch();
	settings.severity && severityPatch();
	settings.highlightRows && highlightRows(TARGET_COLUMNS);
};

// ============= WI ==============================

// "Я", "я" => "Z", "z"
const keyZoom = (e) => {
	if (!settings.keys.zoom) return;
	if (e.which == 90 && e.key != "z" 
		&& !$(e.target).eq(0).is('.richeditor-container')
		&& !$(e.target).eq(0).is('input')
		&& !$(e.target).eq(0).is('textarea')) {
		if ($('[command=fullscreen-toggle]').length) {
			$('[command=fullscreen-toggle]').click();
		} else if ($('[command=toggle-full-screen]').length) {
			$('[command=toggle-full-screen]').click();
		}
		return true;
	}
};

// `
const keyMain = (e) => {
	if (!settings.keys.main || !settings.keys.panelShortkey) return;
	!e.altKey && e.which == 192 && startInit(true);
};

// ALT+5
const keyRefreshWI = (e) => {
	if (!settings.keys.refreshWI) return;
	if (e.altKey && e.which == 53) {
		$('.workitem-tool-bar .bowtie-navigate-refresh').click();
		calcPersent();
	}
};

// ALT+SHIFT+X
// TODO снова не работает!
const keyCopyId = (e) => {
	if (!settings.keys.copyId) return;
	if (e.altKey && e.shiftKey && e.which == 88) { 
		document.designMode = 'on';
		const el = document.createElement('textarea');
		el.value = $('.work-item-form-id:visible').text();
		el.textContent = el.value;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		document.designMode = 'off';
	}
};

// ALT+`
const keyPanel = (e) => {
	if (!settings.keys.panel) return;
	if (e.altKey && e.which == 192) {
		$('.dev-panel').toggleClass('showed');
		settings.keys.panelShortkey = $('.dev-panel.showed').length > 0;
	}
};
// 1-5
const keyPanelShortkey = (e) => {
	if (!settings.keys.panelShortkey) return;
	if (e.which >= 49 && e.which <= 54) {
		const settingList = ['iterationPath', 'state', 'severity', 'highlightRows'];
		changeSetting(settingList[e.which - 49]);
		$(`#settings_${settingList[e.which - 49]}`)[0].checked = settings[settingList[e.which - 49]];
	}
};

$(document).keydown(function(e) { //For any other keypress event

	if (keyZoom(e)) return;
	keyMain(e);
	keyRefreshWI(e);
	keyCopyId(e);
	keyPanel(e);
	keyPanelShortkey(e);

});

$(document).ready(() => {
	// Redirect to Н2 team
	tfsProject.some((project) => {
		if (location.href.indexOf(`STS/${project}/_workitems`) > -1) {
			location.href = location.href.replace(`${project}/`, `${tfsProject[0]}/${tfsTeam}/`);
			return true;
		}
		return false;
	});
	
	startInit();
});

const calcPersent = () => {
	var containerHeader = $('.work-item-form-header-controls-container');
	var percentTask = $('.percent-wi');
	const completedWorkField = $('[aria-label="Completed Work"]:visible');
	if (percentTask.length > 0) {
		percentTask.remove();
		percentTask.length = 0;
	}

	if (percentTask.length === 0 && completedWorkField.length) {
		const isLT = $('.info-text-wrapper a:visible:last').text().indexOf('LeadTask') > -1;
		const fieldChildren = isLT ? 'Children ' : '';
		const configLabel = {
			completedWork: `input[aria-label="${fieldChildren}Completed Work"]:visible`,
			remainingWork: `input[aria-label="${fieldChildren}Remaining Work"]:visible`,
		};
		
		var completedWork = $(configLabel.completedWork).length ? $(configLabel.completedWork).val() : 0;
		var remainingWork = $(configLabel.remainingWork).length ? $(configLabel.remainingWork).val() : 0;
		completedWork = Number(completedWork.replace(',', '.'));
		remainingWork = Number(remainingWork.replace(',', '.'));
		
		const percentWi = (completedWork + remainingWork) > 0
			? (completedWork * 100 / (completedWork + remainingWork)).toFixed() 
			: 0;
		
		const percentClass = {0: 0, 1: 25, 2: 50, 3: 75, 4: 100}[Math.floor(percentWi / 25)];
		containerHeader.append(`<div class="percent-wi percent--${percentClass}">${percentWi}%</div>`);
	}
}

const attachScrollEvent = () => { 
	scrollStek++;
	setTimeout(() => {
		if (scrollStek == 1) {
			applyPatches();
			console.log('scrollStek last');
		}
		scrollStek--;
	}, 100);
};

const changeSetting = (key) => {
	if (settings[key] != undefined) {
		settings[key] = !settings[key];
	} else {
		console.warn(`Key ${key} not found in settings`);
	}
}

const startInit = (reset = false) => {
	// @deprecated
	setTextFilterValue = () => {
		return;
		$('.text-filter-input').val(userData.filter || '');
		$('.text-filter-input').keyup();
	};
	// @deprecated
	setTextFilterEvent = () => {
		const textFilter = $('.text-filter-input');
		if (textFilter.length === 0) return;
		if ($._data(textFilter[0]).events.change 
			&& $._data(textFilter[0]).events.change.length > 0) {
			if (eventsInstalled.textFilter) {
				console.log('Event textFilter installed');
				setTextFilterValue();
				return;
			}
			setTimeout(() => {
				if (!eventsInstalled.textFilter) {
					setTextFilterEvent();
				} else {
					console.log('Event textFilter installed');
					setTextFilterValue();
				}
				eventsInstalled.textFilter = true;
			}, 1000);
			return;
		}
		
		textFilter.change((value) => {
			console.log('change ', value.target.value);
			userData.filter = value.target.value;
			setLS('userData', userData);
		});
		setTimeout(setTextFilterEvent, 1000);
	};
	// @deprecated
	setTriageViewEvent = () => {
		const triageView = $('.triage-view');
		const textFilter = $('.text-filter-input');
		
		if (triageView.length === 0) return;
		
		triageView.bind('beforeShow', function(event) {
			/*if (!eventsInstalled.textFilter) {
				setTextFilterEvent();
			}*/
			
			setTextFilterValue();
	    });
	    eventsInstalled.triageView = true;
	    console.log('Event triageView installed');
	};
	
	scrollStek = 0;

	formatNewView = () => {
		if (reset) {
			eventsInstalled.formatNewView_count = 0;
			eventsInstalled.highlightList = false;
			$(wiLists.join(', ')).off('scroll', attachScrollEvent);
			reset = false;
		}
		if (eventsInstalled.formatNewView_count > 10) return;
		eventsInstalled.formatNewView_count++;
		const actionMenu = $('[command=actions]').eq(0);
		let nextTimer = false;
		//if ($('.work-items-right-pane').length || $('.workitem-dialog').length)  {
		
		// ActionMenu
		if (actionMenu.length) {
			if (actionMenu.parent().find(' > [command=work-item-templates]').length === 0) {
				actionMenu.click();
				$('[command=work-item-templates]').insertBefore(actionMenu);
				actionMenu.click();
			}
			
			/* start percent */
			calcPersent();
			/* end */
			
			if ($('[command=actions] [command=work-item-templates]').length 
				|| !$('[command=work-item-templates]').length) {
				setTimeout(formatNewView, 500);
			} else {
				eventsInstalled.formatNewView = true;
				console.log('Event formatNewView installed');
			}
		} else {
			nextTimer = true;
		}
		
		// Highlight
		if (eventsInstalled.highlightList === false && $(wiLists.join(', ')).length) {
			eventsInstalled.highlightList = true;
			scrollStek = 0;
			$(wiLists.join(', ')).scroll(attachScrollEvent);
			setTimeout(applyPatches, 500);
			console.log('Event highlightList installed');
		} else {
			nextTimer = true;
		}
		
				
		// Create dev panel
		if (eventsInstalled.devPanel === false && $('.dev-panel').length === 0) {
			eventsInstalled.devPanel = true;
			$(document.body).append(`<div class="dev-panel">
				<div>Настройки</div>
				<div>
					<label>
						<input type="checkbox" id="settings_iterationPath" ${settings.iterationPath ? 'checked="checked"' : ''} 
									onclick="changeSetting('iterationPath')"/> IterationPath
					</label>
					<label>
						<input type="checkbox" id="settings_state" ${settings.state ? 'checked="checked"' : ''} onclick="changeSetting('state')"/> 
						State
					</label>
					<label>
						<input type="checkbox" id="settings_severity" ${settings.severity ? 'checked="checked"' : ''} onclick="changeSetting('severity')"/> 
						Severity
					</label>
					<label>
						<input type="checkbox" id="settings_highlightRows" ${settings.highlightRows ? 'checked="checked"' : ''} 
									onclick="changeSetting('highlightRows')"/> 
						HighlightRows
					</label>
				</div>
			</div>`);
			console.log('Dev panel installed');
		}
		
		if (nextTimer) {
			setTimeout(formatNewView, 500);
		}
	};

	
	switch (true) {
		// Если WI или query 
		// @deprecated
		/*case location.href.indexOf('/_workitems') > -1:
			const timer = setInterval(() => {
				console.log('Full Loaded');
				//const textFilter = $('.text-filter-input');
				
				//setTextFilterEvent();
		    	//setTriageViewEvent();
		    	formatNewView();
		    	if (eventsInstalled.triageView) clearInterval(timer);
			
			}, 500);
			break;*/
		case location.href.indexOf('/_workitems') > -1:
		case location.href.indexOf('/_queries') > -1:
		case location.href.indexOf('/_backlogs') > -1 && reset:
		case location.href.indexOf('/_dashboards') > -1:
			console.log('Full Loaded');
			formatNewView();
			break;
		default:
			// code
	}
}
