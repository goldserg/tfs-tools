// ==================== Custom Vars =======================
var TARGET_COLUMNS = [
	{ key: 'Priority', values: ['1'] },
	{ key: 'Priority', values: ['0'], mode: 'important' },
	{ key: 'Title', values: ['[ASAP]', '[БОЙ]'], mode: 'important', operator: 'CONTAINS' },
	{
		key: 'Assigned To',
		values: [
			'g NCIH',
			'g NCIH Dev',
		],
	},
];

var settings = {
	iterationPath: true,
	iterationPathTail: 2,
	state: false,
	severity: true,
	highlightRows: false,
	wiStyle: true,

	keys: {
		zoom: true,
		main: true,
		refreshWI: true,
		copyId: true,
		panel: true,
		panelShortkey: false,
		openTemplate: true,
		addTags: true,
		expandCollapse: true,
	},
};
// ==================== Vars =======================
let scrollStek = 0;
const wiLists = [
	'.work-item-list .grid-canvas[role=presentation]:visible',
	'.wiql-query-result-grid .grid-canvas[role=presentation]:visible',
	'.productbacklog-grid-results .grid-canvas[role=presentation]:visible'
];

const eventsInstalled = {
	formatNewView: false,
	highlightList: false,
	devPanel: false
};
const tfsProject = ['FORIS_Mobile', 'a0bf1feb-f7e0-4f18-9f30-7c4d9ec8d5d9'];
const tfsTeam = 'NCIH 2.0 Team';
// ==================== Грушин =======================

const getColumnIndex = (key, gridN = 0) => {
	const headerRefList = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN})`).parent().find('.grid-header-column');
	//document.querySelectorAll('.grid-header-column');
	const headerRefs = Array.from(headerRefList);
	const headerRef = headerRefs.find((header) => header.attributes['aria-label'].value === key);
	return headerRefs.indexOf(headerRef);
};

const applyPatch = (key, patchFn) => {
	document.querySelectorAll('.grid-canvas[role=presentation]:not(.no-rows)').forEach((_, gridN) => {
		const index  = getColumnIndex(key, gridN);
  	const elementRefs = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-cell:nth-child(${index + 1})`);
  	elementRefs.length && elementRefs.toArray().forEach(patchFn);
	});
	
	/*const index  = getColumnIndex(key);
	document.querySelectorAll(`.grid-cell:nth-child(${index + 1})`);
	elementRefs.forEach(patchFn);*/
};

const iterationPathPatch = (level = 1) => {
	if (level === 0) return;
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
	document.querySelectorAll('.grid-canvas[role=presentation]:not(.no-rows)').forEach((_, gridN) => {
		const rowRefs = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-row.grid-row-normal`);
  	
  	rowRefs.length && rowRefs.toArray().forEach((rowRef) => {
			let mode = true;
			const needToBeHiglighted = columns.some((column) => {
				const columnIndex = getColumnIndex(column.key);
				const columnRef = rowRef.children[columnIndex];
				if (!columnRef) return false;
				const matchFound = column.values.some((value) => 
					validateByOperator(columnRef.innerText, value, column.operator));
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
	});
	//const rowRefs = document.querySelectorAll('.grid-row.grid-row-normal');
	/*rowRefs.forEach((rowRef) => {
		let mode = true;
		const needToBeHiglighted = columns.some((column) => {
			const columnIndex = getColumnIndex(column.key);
			const columnRef = rowRef.children[columnIndex];
			if (!columnRef) return false;
			const matchFound = column.values.some((value) => 
				validateByOperator(columnRef.innerText, value, column.operator));
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
	});*/
};

const applyPatches = () => {
	settings.iterationPath && iterationPathPatch(settings.iterationPathTail);
	settings.state && statePatch();
	settings.severity && severityPatch();
	settings.highlightRows && highlightRows(TARGET_COLUMNS);
};

// ============= CopyToClipboard ==============================
 function copyToClipboard(n, t) {
  var u = !1, r, f, i;
  if (t || window.clipboardData === undefined) {
      i = $("<div/>");
      try {
          i.css("background-color", "inherit");
          t ? i.append(n) : (i.css("white-space", "pre"),
          i.text(n));
          document.body.createTextRange ? (i.prependTo($("body")),
          r = document.body.createTextRange(),
          r.moveToElementText(i[0]),
          r.select(),
          u = r.execCommand("copy")) : document.createRange && window.getSelection && (i.appendTo($("body")),
          r = document.createRange(),
          f = window.getSelection(),
          f.removeAllRanges(),
          r.selectNodeContents(i[0]),
          f.addRange(r),
          u = document.execCommand("copy"))
      } finally {
          i.remove()
      }
  } else
      window.clipboardData.setData(o, n),
      u = !0;
  return u
}
    
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

// Коды клавиш
// http://netcode.ru/cpp/?artID=234

// ` - restart app
const keyMain = (e) => {
	if (!settings.keys.main || !settings.keys.panelShortkey) return;
	!e.altKey && e.which == 192 && startInit(true);
};

// ALT+5 - click refresh on WI or List WI
const keyRefreshWI = (e) => {
	if (!settings.keys.refreshWI) return;
	if (e.altKey && e.which == 53) {
		// list 
		if ($('[command=refresh-work-items]:visible').length) {
			$('[command=refresh-work-items]:visible').click();
			setTimeout(applyPatches, 1000);
			// formatNewView();
		} else if ($('[data-command-key=refresh-work-items]:visible').length) {
			$('[data-command-key=refresh-work-items]:visible').click();
			setTimeout(applyPatches, 1000);
			// formatNewView();
		// WI
		} else if ($('.workitem-tool-bar .bowtie-navigate-refresh:visible').length) {
			$('.workitem-tool-bar .bowtie-navigate-refresh').click();
			calcPersent();
		}
	}
};

// CTRL+ALT+T - open templates menu
const keyOpenTemplate = (e) => {
	if (!settings.keys.openTemplate) return;
	if (e.ctrlKey && e.altKey && e.which == 84) {
		// Если карточка WI
		const actionsWi = $('.workitem-tool-bar [role=menubar] [command=actions]');
		const actionsQuery = $('.grid-context-menu:visible').eq(0);
		const menuTemplates = '[command=work-item-templates]';

		if (actionsWi.length) {
			actionsWi.click();
			safeExec(
				() => $(menuTemplates).length !== 0,
				() => { $(menuTemplates).click() }
			);
		} else if (actionsQuery.length) {
			actionsQuery.click();
			safeExec(
				() => $(menuTemplates).length !== 0,
				() => { $(menuTemplates).click() }
			);
		}
	}
};

// CTRL+ALT+L - click Assigned
const keyAssignedClick = (e) => {
	//if (!settings.keys.openTemplate) return;
	if (e.ctrlKey && e.altKey && e.which == 76) {

		safeExec(
			() => $('.identity-picker-resolved').length !== 0,
			() => { $('.identity-picker-resolved').click() }
		);
	}
};


// CTRL+ALT+T CTRL+ALT+С - apply template "Close"
const keyCloseWi = (e) => {
	if (!settings.keys.openTemplate) return;
	if (e.ctrlKey && e.altKey && e.which == 67) {
		// Если открыт шаблон
		const menuItem = '[data-parent*="_work-item-templates"] [role=menuitem] [role=button]:contains("Close"):visible';
		
		safeExec(
			() => $(menuItem).length !== 0,
			() => { $(menuItem).parent().eq(0).click() }
		);
	}
};

// CTRL+ALT+A - focus tags field
const keyAddTags = (e) => {
	if (!settings.keys.addTags) return;
	if (e.ctrlKey && e.altKey && e.which == 65) {
		$('.tags-add-button').click();
		$('.tags-items-container .tags-input').val('VM');
	}
};

// ALT+"+" ALT+"-" - expand/collapse tree
const keyExpandCollapse = (e) => {
	if (!settings.keys.expandCollapse) return;
	if (e.altKey && [189, 108, 187, 107].indexOf(e.which) > -1) {
		const action = 
			[189, 108].indexOf(e.which) > -1 
				? 'collapse' 
				: 'expand';
		const actionsQuery = `.expand-collapse-icons-header .${action}-icon`;
		
		safeExec(
			() => $(actionsQuery).length !== 0,
			() => { $(actionsQuery).click() }
		);

	}
};

// ALT+SHIFT+X - copy WI id
const keyCopyId = (e) => {
	if (!settings.keys.copyId) return;
	if (e.altKey && e.shiftKey && e.which == 88) {
		
		// WI
		if ($('.workitem-tool-bar .bowtie-navigate-refresh:visible').length) {
			document.designMode = 'on';
			const el = document.createElement('textarea');
			el.value = $('.work-item-form-id:visible').text();
			el.textContent = el.value;
			document.body.appendChild(el);
			el.select();
			document.execCommand('copy');
			document.body.removeChild(el);
			document.designMode = 'off';
		} else // list 
		if ($(wiLists.join(', ')).length) {
			//$('.grid-row-selected:visible')
			document.querySelectorAll('.grid-canvas[role=presentation]:not(.no-rows)').forEach((_, gridN) => {
				const index  = getColumnIndex('ID', gridN);
		  	const elementRefs = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-row-selected:visible .grid-cell:nth-child(${index + 1})`);
		  	if (elementRefs.length) {
		  		const value = elementRefs.toArray().map(_ => _.innerText).join(',');
		  		document.designMode = 'on';
					const el = document.createElement('textarea');
					el.value = value;
					el.textContent = el.value;
					document.body.appendChild(el);
					el.select();
					document.execCommand('copy');
					document.body.removeChild(el);
					document.designMode = 'off';
		  	}
			});
		} 
	}
};

// ALT+SHIFT+C - copy WI with Title
const keyCopyWI = (e) => {
	if (!settings.keys.copyId) return;
	if (e.altKey && e.shiftKey && e.which == 67) {
		
		// WI cancel custom
		if ($('.workitem-tool-bar .bowtie-navigate-refresh:visible').length) {
			return e;
		} else // list 
		if ($(wiLists.join(', ')).length) {
			//$('.grid-row-selected:visible')
			document.querySelectorAll('.grid-canvas[role=presentation]:not(.no-rows)').forEach((_, gridN) => {
				const colIndex = {
					id: getColumnIndex('ID', gridN), 
					title: getColumnIndex('Title', gridN)
				};
		  	const elementListId = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-row-selected:visible .grid-cell:nth-child(${colIndex.id + 1})`);
		  	let elementListTitle = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-row-selected:visible .grid-cell:nth-child(${colIndex.title + 1}) .grid-cell-contents-container`);
			if (elementListTitle.length === 0) {
				elementListTitle = $(`.grid-canvas[role=presentation]:not(.no-rows):eq(${gridN}) .grid-row-selected:visible .grid-cell:nth-child(${colIndex.title + 1})`);
			}

		  	if (elementListId.length && elementListId.length === elementListTitle.length) {
		  		const isHtml = true;
		  		const elementListTitleArr = elementListTitle.toArray();
		  		const value = elementListId.toArray().map((_, i) => {
		  			const link = $('.work-item-title-link', elementListTitleArr[i]).attr('href');
		  			const id = _.innerText;
		  			const title = $('.work-item-title-link', elementListTitleArr[i]).text();
		  			const type = $('.work-item-type-icon-host i', elementListTitleArr[i]).attr('aria-label');
		  			
		  			const result = `<span style='font-size:11pt; background-color: inherit; color: inherit;'><a href='${link}' target='_blank' rel='noopener noreferrer'>${type} ${id}<\/a><span style='font-size:11pt; background-color: inherit; color: inherit;'>: ${title}<\/span><\/span>`;
		  		
		  			return result;
		  		}).join(isHtml ? '<br/>' : '\n\r');
		  		
		  		copyToClipboard(value, isHtml);
		  		/*
		  		document.designMode = 'on';
					const el = document.createElement('textarea');
					el.value = value;
					el.textContent = el.value;
					document.body.appendChild(el);
					el.select();
					document.execCommand('copy');
					document.body.removeChild(el);
					document.designMode = 'off';
					*/
		  	}
			});
		} 
	}
};

// ALT+` - open dev panel
const keyPanel = (e) => {
	if (!settings.keys.panel) return;
	if (e.altKey && e.which == 192) {
		$('.dev-panel').toggleClass('showed');
		settings.keys.panelShortkey = $('.dev-panel.showed').length > 0;
	}
};
// 1-4, 7 - allow only with opened dev panel: enable/disable options
const keyPanelShortkey = (e) => {
	if (!settings.keys.panelShortkey) return;
	if (e.target.tagName.toLowerCase() === 'input') return true;
	if (e.which >= 49 && e.which <= 54 && !e.altKey) {
		const settingList = ['iterationPath', 'state', 'severity', 'highlightRows'];
		changeSetting(settingList[e.which - 49]);
		document.getElementById(`settings.${settingList[e.which - 49]}`).checked = settings[settingList[e.which - 49]];
	}
	if (e.which === 55 && !e.altKey) {
		const settingList = ['iterationPath', 'state', 'severity', 'highlightRows', 'wiStyle'];
		changeSetting('wiStyle');
		document.getElementById(`settings.wiStyle`).checked = settings.wiStyle;
		$(document.body).toggleClass('dev--work-item-style');
	}
};

$(document).keydown(function(e) { //For any other keypress event

	if (keyZoom(e)) return;
	keyMain(e);
	keyRefreshWI(e);
	keyCopyId(e);
	keyCopyWI(e);
	keyPanel(e);
	keyPanelShortkey(e);
	keyOpenTemplate(e);
	keyAddTags(e);
	keyExpandCollapse(e);
	keyCloseWi(e);
	keyAssignedClick(e);

});

const calcPersent = () => {
	var containerHeader = $('.work-item-form-header-controls-container');
	var percentTask = $('.percent-wi');
	const completedWorkField = $('.workitemcontrol-label:contains(Completed work):visible');
	if (percentTask.length > 0) {
		percentTask.remove();
		percentTask.length = 0;
	}

	if (percentTask.length === 0 && completedWorkField.length) {
		const isLT = $('.info-text-wrapper a:visible:last').text().indexOf('LeadTask') > -1;
		const fieldChildren = isLT ? ' By Children' : '';
		const configLabel = {
			//completedWork: `input[aria-label="${fieldChildren}Completed Work"]:visible`,
			//remainingWork: `input[aria-label="${fieldChildren}Remaining Work"]:visible`,
			completedWork: $(`.workitemcontrol-label:contains(Completed work${fieldChildren})`).eq(0).parents('.control').find('input'),
			remainingWork: $(`.workitemcontrol-label:contains(Remaining work${fieldChildren})`).eq(0).parents('.control').find('input'),
		};

		var completedWork = configLabel.completedWork.length ? configLabel.completedWork.val() || '0' : '0';
		var remainingWork = configLabel.remainingWork.length ? configLabel.remainingWork.val() || '0' : '0';
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

const changeSetting = (key, value) => {
	const path = key.split('.');
	path.reduce((memo, _) => {
  	if (memo.hasOwnProperty(_)) {
    	if (typeof memo[_] != 'object') {
    		memo[_] = value != undefined ? value : !memo[_];
    		setLS('settings', settings);
    	}
			return memo[_];
  	}
  	console.warn(`Key ${key} not found in ${settings}`);
	}, settings);
}

const safeExec = (condition, func, settings, i = 0) => {
	settings = $.extend({timeout: 50, delta: 10, maxStep: 50}, settings);
	setTimeout(() => {
		if (!condition() && i < settings.maxStep) safeExec(func, condition, settings, ++i);
		else func();
	}, settings.timeout + i * settings.delta);
};
const validateByOperator = (a, b, operator = 'EQUALS') => {
	switch (operator.toUpperCase()) {
		case 'EQUALS':
			return a.trim().toLowerCase() === b.trim().toLowerCase();
		case 'CONTAINS':
			return a.trim().toLowerCase().includes(b.trim().toLowerCase());
	}
	
}
const setLS = (key, value) => {
	localStorage[key] = JSON.stringify(value);
};
const getLS = (key) => {
	return localStorage[key] ? JSON.parse(localStorage[key]) : null;
};

const startInit = (reset = false) => {
	// Load settings
	if (getLS('settings')) {
		const settingsOrig = $.extend(true, {}, settings);
		const keys = $.extend(true, settings.keys, getLS('settings').keys);
		settings = $.extend(settings, getLS('settings'));
		settings.keys = keys;
		if (settings != settingsOrig) {
			setLS('settings', settings);
			console.log('Обновлены настройки', settings)
		}
	}
	//settings = getLS('settings') || settings;
	settings.keys.panelShortkey = false;
	
	if (settings.wiStyle && !$('body.dev--work-item-style').length) {
		$(document.body).toggleClass('dev--work-item-style');
	}

	scrollStek = 0;
	formatNewView = () => {
		if (reset) {
			eventsInstalled.highlightList = false;
			$(wiLists.join(', ')).off('scroll', attachScrollEvent);
			reset = false;
		}
		let nextTimer = false;

		// ActionMenu
		safeExec(
			() => $('[command=actions]').eq(0).length > 0,
			() => {
				// start percent
				calcPersent();
				eventsInstalled.formatNewView = true;
				console.log('Event formatNewView installed');
			},
			{timeout: 500},
		);

		// Highlight
		safeExec(
			() => $(wiLists.join(', ')).length > 0,
			() => {
				if (eventsInstalled.highlightList === false) {
					eventsInstalled.highlightList = true;
					scrollStek = 0;
					$(wiLists.join(', ')).scroll(attachScrollEvent);
					setTimeout(applyPatches, 500);
					console.log('Event highlightList installed');
				}
			},
			{timeout: 500},
		);

		// Create dev panel
		safeExec(
			() => $('.dev-panel').length === 0,
			() => {
				if (eventsInstalled.devPanel === false) {
					eventsInstalled.devPanel = true;
					$(document.body).append(`<div class="dev-panel">
						<div class="dev-panel__header">Настройки</div>
						<div>
							<label>
								<input type="checkbox" id="settings.iterationPath" ${settings.iterationPath ? 'checked="checked"' : ''} 
											onclick="changeSetting('iterationPath')"/> IterationPath (1)
							</label>
							<label>
								IterationPathTail <input type="number" min="0" max="4" id="settings.iterationPathTail" value="${settings.iterationPathTail}" 
											onchange="changeSetting('iterationPathTail', Number(this.value))"/> 
							</label>
							<label>
								<input type="checkbox" id="settings.state" ${settings.state ? 'checked="checked"' : ''} onclick="changeSetting('state')"/> 
								State (2)
							</label>
							<label>
								<input type="checkbox" id="settings.severity" ${settings.severity ? 'checked="checked"' : ''} onclick="changeSetting('severity')"/> 
								Severity (3)
							</label>
							<label>
								<input type="checkbox" id="settings.highlightRows" ${settings.highlightRows ? 'checked="checked"' : ''} 
											onclick="changeSetting('highlightRows')"/> 
								HighlightRows (4)
							</label>
							<label>
								<input type="checkbox" id="settings.wiStyle" ${settings.wiStyle ? 'checked="checked"' : ''} 
											onclick="changeSetting('wiStyle')"/> 
								Work item style (7)
							</label>
						</div>
						<div class="dev-panel__header">HotKeys</div>
						<div>
							<label>
								<input type="checkbox" id="settings.keys.zoom" ${settings.keys.zoom ? 'checked="checked"' : ''} 
											onclick="changeSetting('keys.zoom')"/> Я=z (Zoom)
							</label>
							<label>
								<input type="checkbox" id="settings.keys.refreshWI" ${settings.keys.refreshWI ? 'checked="checked"' : ''} onclick="changeSetting('keys.refreshWI')"/> 
								Alt+5
							</label>
							<label>
								<input type="checkbox" id="settings.keys.copyId" ${settings.keys.copyId ? 'checked="checked"' : ''} onclick="changeSetting('keys.copyId')"/> 
								ALT+SHIFT+X
							</label>
							<label>
								<input type="checkbox" id="settings.keys.openTemplate" ${settings.keys.openTemplate ? 'checked="checked"' : ''} 
											onclick="changeSetting('keys.openTemplate')"/> 
								CTRL+ALT+T
							</label>
							<label>
								<input type="checkbox" id="settings.keys.addTags" ${settings.keys.addTags ? 'checked="checked"' : ''} 
											onclick="changeSetting('keys.addTags')"/> 
								CTRL+ALT+A
							</label>
						</div>
					</div>`);
					console.log('Dev panel installed');
				}
			},
			{timeout: 500},
		);
	};

	switch (true) {
		case location.href.indexOf('/_workitems') > -1:
		case location.href.indexOf('/_queries') > -1:
		case location.href.indexOf('/_backlogs') > -1:
		case location.href.indexOf('/_sprints') > -1:
		case location.href.indexOf('/_dashboards') > -1:
			console.log('Full Loaded');
			formatNewView();
			break;
			// Скрытие предупреждений для ретроплагина
		case location.href.indexOf('_apps/hub/ms-devlabs.team-retrospectives.home') > -1:
			console.log('Retro Loaded');
			safeExec(
				() => $('.external-content--iframe').contents().find('.ms-MessageBar-multiline').length > 0,
				() => {
					$('.external-content--iframe').contents().find('.ms-MessageBar-multiline button').click();
				},
				{timeout: 500},
			);
			break;
		default:
	}
}


$(document).ready(() => {
	startInit();
});