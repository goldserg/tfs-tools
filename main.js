// ==================== Custom Vars =======================
var TARGET_COLUMNS = [
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

var settings = {
	iterationPath: true,
	iterationPathValue: 2,
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
	},
};
// ==================== Vars =======================
let scrollStek = 0;
const wiLists = [
	'.work-item-list .grid-canvas[role=presentation]',
	'.wiql-query-result-grid .grid-canvas[role=presentation]',
	'.productbacklog-grid-results .grid-canvas[role=presentation]'
];

const eventsInstalled = {
	formatNewView: false,
	highlightList: false,
	devPanel: false
};
const tfsProject = ['FORIS_Mobile', 'a0bf1feb-f7e0-4f18-9f30-7c4d9ec8d5d9'];
const tfsTeam = 'NCIH 2.0 Team';
// ==================== Грушин =======================

const getColumnIndex = (key) => {
	const headerRefList = document.querySelectorAll('.grid-header-column');
	const headerRefs = Array.from(headerRefList);
	const headerRef = headerRefs.find((header) => header.attributes['aria-label'].value === key);
	return headerRefs.indexOf(headerRef);
};

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
			const matchFound = column.values.some((value) => isEqual(columnRef.innerText, value));
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

// Коды клавиш
// http://netcode.ru/cpp/?artID=234

// ` - restart app
const keyMain = (e) => {
	if (!settings.keys.main || !settings.keys.panelShortkey) return;
	!e.altKey && e.which == 192 && startInit(true);
};

// ALT+5 - click refresh on WI
const keyRefreshWI = (e) => {
	if (!settings.keys.refreshWI) return;
	if (e.altKey && e.which == 53) {
		$('.workitem-tool-bar .bowtie-navigate-refresh').click();
		calcPersent();
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

// CTRL+ALT+A - focus tags field
const keyAddTags = (e) => {
	if (!settings.keys.addTags) return;
	if (e.ctrlKey && e.altKey && e.which == 65) {
		$('.tags-add-button').click();
		$('.tags-items-container .tags-input').val('VM');
	}
};

// ALT+SHIFT+X - copy WI id
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
	if (e.which >= 49 && e.which <= 54 && !e.altKey) {
		const settingList = ['iterationPath', 'state', 'severity', 'highlightRows'];
		changeSetting(settingList[e.which - 49]);
		$(`#settings_${settingList[e.which - 49]}`)[0].checked = settings[settingList[e.which - 49]];
	}
	if (e.which === 55 && !e.altKey) {
		const settingList = ['iterationPath', 'state', 'severity', 'highlightRows', 'wiStyle'];
		changeSetting('wiStyle');
		$(`#settings_wiStyle`)[0].checked = settings.wiStyle;
		$(document.body).toggleClass('dev--work-item-style');
	}
};

$(document).keydown(function(e) { //For any other keypress event

	if (keyZoom(e)) return;
	keyMain(e);
	keyRefreshWI(e);
	keyCopyId(e);
	keyPanel(e);
	keyPanelShortkey(e);
	keyOpenTemplate(e);
	keyAddTags(e);

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

const safeExec = (func, condition, settings = {timeout: 50, delta: 10, maxStep: 50}, i = 0) => {
	setTimeout(() => {
		if (!condition() && i < settings.maxStep) safeExec(func, condition, ++i);
		else func();
	}, settings.timeout + i * settings.delta);
};
const isEqual = (a, b) => {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}
const setLS = (key, value) => {
	localStorage[key] = JSON.stringify(value);
};
const getLS = (key, value) => {
	return localStorage[key] ? JSON.parse(localStorage[key]) : null;
};

const startInit = (reset = false) => {
	if (settings.wiStyle) {
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
						<div>Настройки</div>
						<div>
							<label>
								<input type="checkbox" id="settings_iterationPath" ${settings.iterationPath ? 'checked="checked"' : ''} 
											onclick="changeSetting('iterationPath')"/> IterationPath (1)
							</label>
							<label>
								<input type="checkbox" id="settings_state" ${settings.state ? 'checked="checked"' : ''} onclick="changeSetting('state')"/> 
								State (2)
							</label>
							<label>
								<input type="checkbox" id="settings_severity" ${settings.severity ? 'checked="checked"' : ''} onclick="changeSetting('severity')"/> 
								Severity (3)
							</label>
							<label>
								<input type="checkbox" id="settings_highlightRows" ${settings.highlightRows ? 'checked="checked"' : ''} 
											onclick="changeSetting('highlightRows')"/> 
								HighlightRows (4)
							</label>
							<label>
								<input type="checkbox" id="settings_wiStyle" ${settings.wiStyle ? 'checked="checked"' : ''} 
											onclick="changeSetting('wiStyle')"/> 
								Work item style (7)
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
		case location.href.indexOf('/_dashboards') > -1:
			console.log('Full Loaded');
			formatNewView();
			break;
		default:
	}
}
