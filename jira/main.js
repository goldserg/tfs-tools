const options = {
	protocol: 'https:',
	host: `${location.host}`,
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
};
let DAY_MS = Date.DAY;
const corsProxies = ['https://cors-anywhere.herokuapp.com/'];
const year = new Date().getFullYear();
const jqlSearch = `project = HOL and updatedDate > ${new Date().toISOString().replace(/(.*?)-\d\dT.*/, '$1')}-01 and issuetype != Initiative ORDER BY created DESC`;
// 'assignee = currentUser() AND resolution = Unresolved order by created DESC'
let myName = null;
let calendar = null;
let vacations = null;
const columnsBase = ['Id', 'summary', '%'];
let columns = [...columnsBase];
let dataTasks = [];
dataTasks.head = {};

const setLS = (key, value) => localStorage[key] = JSON.stringify(value);
const getLS = (key) => localStorage[key] ? JSON.parse(localStorage[key]) : null;

const keyPanel = (e) => {
	if (e.altKey && e.which == 192) {
		$('.dev-panel').toggleClass('showed');
	}
	if (e.key === 'Escape' && $('.dev-panel.showed').length) {
		$('.dev-panel').toggleClass('showed');
	}
};
$(document).keydown(function(e) { //For any other keypress event
	keyPanel(e);
});

const getDateArray = (dateFrom, dateTo) => {
	if (!DAY_MS) DAY_MS = Date.DAY;
	const allDaysOff = calendar.reduce((memo, month)=>{
		const days = month.days.split(',').filter(day => !day.includes('*')).map(day => parseInt(day.split('+')[0]));
		days.forEach(day => memo.push(new Date(year, month.month - 1, day, 3)));
		return memo;
	}, []);
	const personaDaysOff = vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`].reduce((memo, vac)=>{
		const duration = new Date(vac.DateTo) - new Date(vac.DateFrom);
		const steps = duration / DAY_MS;
		const days = Array.from({length: steps+1}, (v,i) => new Date(new Date(vac.DateFrom).valueOf() + (DAY_MS * i)));
		days.forEach(day => {
			day.setHours(3);
			memo.push(day);
		});
		return memo;
	}, []);
	const allDays7h = calendar.reduce((memo, month)=>{
		const days = month.days.split(',').filter(day => day.includes('*')).map(day => parseInt(day.split('*')[0]));
		days.forEach(day => memo.push(new Date(year, month.month - 1, day, 3)));
		return memo;
	}, []);

	// Generate array of hours
	const daysCount = Math.ceil((dateTo-dateFrom) / DAY_MS) + 1;
	let daysDateMap = new Array(daysCount).fill(null)
		.map((day, index) => new Date(dateFrom.getTime() + index * DAY_MS))
		// фильтруем выходные и праздники
		.filter(day => !allDaysOff.map(_ => _.getTime()).includes(day.getTime()) )
		// фильтруем отпуска
		.filter(day => !personaDaysOff.map(_ => _.getTime()).includes(day.getTime()) );

	return daysDateMap;
}

const addNewItem = (
	jql = jqlSearch,
	dateFrom =  new Date($('.dev-panel [name=dateFrom]').val()),
	dateTo = new Date($('.dev-panel [name=dateTo]').val())
) => {

	const arrayTaskId = dataTasks.map(_ => _.Id);
	const dispersion = dataTasks.map(_ => _['%']);

	let objectTimeResult = {};
	jql = encodeURIComponent(jql);
	const optFixVersion = {
		...options,
		path: `/rest/api/2/search?jql=${jql}&fields=worklog,summary&maxResults=250`,
		url: `${options.protocol}//${options.host}/rest/api/2/search?jql=${jql}&fields=worklog,summary&maxResults=250`
	};

	let daysDateMap = getDateArray(dateFrom, dateTo);
	let days = new Array(daysDateMap.length).fill(8);

	getRequest(optFixVersion).then(async function (taskList) {
		// проверяем список worklog и составляем список необходимых расширенных запросов
		for (const task of taskList.issues) {
			const index = taskList.issues.indexOf(task);

			// проверка на заполенность summary
			dataTasks.forEach((_, index) => {
				if (_.Id === task.key/* && !_.summary*/)
					dataTasks[index].summary = task.fields.summary;
			})

			if (task.fields.worklog.total <= task.fields.worklog.maxResults) continue;

			await getRequest({
				...options,
				url: `${options.protocol}//${options.host}/rest/api/2/issue/${task.key}/worklog`
			}).then(issue => taskList.issues[index].fields.worklog.worklogs = issue.worklogs);
		}

		// заполняем список часов
		taskList.issues.forEach(task => {
			task.fields.worklog.worklogs
				// filter only my logs
				.filter(workLog => workLog.author.name === myName)
				.forEach(workLog => {

					const workDayStarted = new Date(workLog.started);
					if (!(dateFrom <= workDayStarted && workDayStarted <= dateTo.getTime() + DAY_MS)) return;

					//days[workDayStarted.getDayOfYear() - dateFrom.getDayOfYear()] -= workLog.timeSpentSeconds / 3600;
					workDayStarted.setHours(-workDayStarted.getTimezoneOffset()  / 60, 0, 0, 0);
					const dayIndex = daysDateMap.map(_ => _.getTime()).indexOf(workDayStarted.getTime());
					days[dayIndex] -= workLog.timeSpentSeconds / 3600;

				});
		});
		// подсчет суммы времени для распределения и кол-ва задач
		const totalHours = days.reduce((memo, day)=> memo + day, 0);
		let totalTasks = arrayTaskId.length;

		// расчет кол-ва часов на задачу исходя из распределения
		let remainHours = totalHours;
		let taskTimeToCompleted = arrayTaskId.reduce((memo, taskId, index) => {
			const time = totalHours * (dispersion[index] / 100) >> 0; // TODO: ввести параметр, для поддержки любой нужной кратности
			memo.push(time)
			remainHours -= time;
			return memo;
		}, []);
		while (remainHours > 0) {
			taskTimeToCompleted[Math.random() * totalTasks | 0] += 1; // TODO: ввести параметр, для поддержки любой нужной кратности
			remainHours--;
		}
		console.log(days);
		// расчет распределения времени задачи по дням (равномерное) TODO: придумать неравномерную схему
		arrayTaskId.map((taskId, index) => {
			if (!objectTimeResult[taskId]) objectTimeResult[taskId] = [];

			// TODO: определять исходя из даты создания, и других признаков
			let totalDaysForTask = days.filter(_ => _ !== 0).length;
			let totalDaysForTaskIndexes = days.map((_, ind) => _ !== 0 ? ind : null).filter(_ => _ !== null);
			console.log(totalDaysForTaskIndexes);
			let timeToCompleted = taskTimeToCompleted[index];
			console.log(timeToCompleted, totalDaysForTask);
			timeToCompleted = totalDaysForTaskIndexes.reduce((memo, ind) => {
				let timeInDay = taskTimeToCompleted[index] / totalDaysForTask >> 0;
				while (days[ind] - timeInDay <= 0) {
					timeInDay--; // TODO: ввести параметр, для поддержки любой нужной кратности
				}
				days[ind] -= timeInDay;
				memo -= timeInDay;
				objectTimeResult[taskId][ind] = timeInDay;
				return memo;
			}, timeToCompleted);
			let timer = 0;
			while (timeToCompleted > 0) {
				let time = totalDaysForTaskIndexes[Math.random() * totalDaysForTask >> 0];
				console.log(time, Math.random() * totalDaysForTask >> 0, days[time]);
				if (days[time] > 0) {
					days[time] -= 1;// TODO: ввести параметр, для поддержки любой нужной кратности
					objectTimeResult[taskId][time] += 1;
					timeToCompleted--;
				}
				timer++;
				if (timer > 20) {
					console.log('BREAK! ', timeToCompleted);
					break;
				}
			}
			console.log(days);
		});

		// clear old data
		columns = [...columnsBase];

		daysDateMap.forEach((day, i) => {
			var dateColName = day.toLocaleDateString('ru').substr(0, 5);
			!columns.includes(dateColName) && columns.push(dateColName);
			dataTasks.forEach((_, index) => {
				dataTasks[index][dateColName] = objectTimeResult[_.Id][i];
				dataTasks.head[dateColName] = (dataTasks.head[dateColName] || 0) + (objectTimeResult[_.Id][i] || 0);
			})
		});

		dataTasks.head['%'] = dataTasks.reduce((memo, row) => memo += Number(row['%']), 0);
		// save summory
		setLS('dataTasks.default', dataTasks.map(task => ({'Id': task['Id'], 'summary': task['summary'], '%': task['%']}) ));
		setLS('dataTasks.head', dataTasks.head);
		refreshTable();
		$('#dev-panel__save').show();
	});
};
const save = () => {
	$('#dev-panel__save').hide();
	dataTasks.forEach(async function(task, row){
		for (const date of Object.keys(task)) if (!columnsBase.includes(date) && task[date]){
			await getRequest({
				...options,
				method: 'POST',
				data: JSON.stringify({
					started:  `${year}-${date.split('.').reverse().join('-')}T09:30:00.000+0300`,
					timeSpentSeconds: task[date] * 3600
				}),
				url: `${options.protocol}//${options.host}/rest/api/2/issue/${task.Id}/worklog`
			}).then(() => {
				$(`#dev-panel__table tbody tr:eq(${row}) td:eq(${Object.keys(task).indexOf(date)})`).html(`${task[date]} ✔️`)
			});
		}
	});
}


function refreshTable() {
	$('#newJiraPercent').off('keyup');
	const head = '<thead><tr>\n\t\t\t' + columns.map(col => {
		const control = dataTasks.head[col] === 0 ? `<br>✔️` : `<br>${dataTasks.head[col]}ч <a href="javascript:void(0)" onclick="clearWorklog(undefined, '${col}')">❌</a>`;
		return `<th>${col} ${columnsBase.includes(col) ? '' : control}</th>`
	}).join('\n\t\t') + '\n\t\t</tr></thead>';
	const lines = dataTasks.map((wi, row) => `<tr>\n\t\t\t${columns.map(col => {
			switch (col) {
				case 'Id':
					return `<td><a href="${location.origin}/browse/${wi[col]}">${wi[col]}</a> <a href="javascript:void(0)" onclick="removeRow(${row})">❌</a></td>`
				case 'summary':
				case '%':
					return `<td>${wi[col] || ''}</td>`
				default:
					return !wi[col] ? 
						`<td></td>` :
						`<td>${wi[col]}  <a href="javascript:void(0)" onclick="clearWorklog(${row}, '${col}')">❌</a></td>`
			}
		}).join('\n\t\t\t')}\n\t\t</tr>`).join('\n\t\t') +
		`<tr>\n\t\t\t<td><input type="text" id="newJiraId"></td><td><input type="text" id="newJiraPercent"> <a href="javascript:void(0)" onclick="addRow()">✔️</a></td><td>${dataTasks.head['%'] ? dataTasks.head['%'] + ' %' : ''}</td>\n\t\t</tr>`;

	$('#dev-panel__table').html(head + '<tbody>' + lines + '</tbody>');
	$('#newJiraPercent').on('keyup', (e) => (e.key === 'Enter' || e.keyCode === 13) && addRow());
}
const refreshVacationTable = () => {
	const periods = vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`].map((period, index) => {
		const dateFrom = period.DateFrom.replace(/(.*?)T.*/, '$1');
		const dateTo = period.DateTo.replace(/(.*?)T.*/, '$1');
		return `<div class="period">
			<input type="date" name="dateFrom_${index}" value="${dateFrom}" onchange="changeVacationDate(event, ${index}, 'DateFrom')">
			<input type="date" name="dateTo_${index}" value="${dateTo}" onchange="changeVacationDate(event, ${index}, 'DateTo')">
			<a href="javascript:void(0)" onclick="removeVacation(${index})">❌</a>
		</div>`
	});

	$('#dev-panel__vacations-form').html(periods);
};
const changeVacationDate = (e, index, field) => {
	vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`][index][field] = new Date(e.target.value).toISOString().split('.')[0];
	if (field === 'DateFrom' && new Date(e.target.value) > new Date(vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`][index]['DateTo'])) {
		$(`[name=dateTo_${index}`).val(e.target.value);
		vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`][index]['DateTo'] = new Date(e.target.value).toISOString().split('.')[0];
	}
	setLS('vacations.default', vacations);
};
const addVacationDate = (e, index, field) => {
	vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`].push({...vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`][vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`].length - 1]});
	setLS('vacations.default', vacations);
	refreshVacationTable();
};
const removeVacation = (index) => {
	vacations[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`].splice(index, 1);
	setLS('vacations.default', vacations);
	refreshVacationTable();
};

const toggle = () => $('.dev-panel').toggleClass('showed');
const addRow = () => {
	dataTasks.push({
		Id: $('#newJiraId').val(),
		'%': $('#newJiraPercent').val()
	});
	dataTasks.head['%'] = dataTasks.reduce((memo, row) => memo += Number(row['%']), 0);

	setLS('dataTasks.default', dataTasks.map(task => ({'Id': task['Id'], 'summary': task['summary'], '%': task['%']}) ));
	setLS('dataTasks.head', dataTasks.head);
	refreshTable();
	$('#newJiraId').focus();
};
const removeRow = (index) => {
	dataTasks.splice(index, 1);
	dataTasks.head['%'] = dataTasks.reduce((memo, row) => memo += Number(row['%']), 0);
	setLS('dataTasks.default', dataTasks.map(task => ({'Id': task['Id'], 'summary': task['summary'], '%': task['%']}) ));
	setLS('dataTasks.head', dataTasks.head);
	refreshTable();
};
const clearWorklog = (row = undefined, col) => {
	if (row !== undefined) {
		dataTasks[row][col] = undefined;
	} else {
		dataTasks.forEach((_, index) =>{
			dataTasks[index][col] = undefined;
		});
	}
	refreshTable();
};

const activateProxy = () => {
	$('#dev-panel__demo_proxy').hide();
	$('#dev-panel__refresh').show();
};
const loadCalendar = () => {
	getRequest(corsProxies[0] + `http://xmlcalendar.ru/data/ru/${year}/calendar.json`).then(data => {
		setLS('xmlcalendar.2023.json', data.months);
		calendar = data.months;
	});
	$('#dev-panel__refresh').hide();
};


async function getRequest(options) {
	return new Promise((resolve, reject) => {
		const req = $.get(options, function(res) {
			console.log(res);
			resolve(res);
		})
			.fail(function(resp) {
				if (resp.responseText.includes('/corsdemo'))
					$('#dev-panel__demo_proxy').show();
			});
	}).catch((err) => {
		console.error('err', err);
		return undefined;
	});
}
async function sendRequest(options, postData) {
	return new Promise((resolve, reject) => {
		const req = $.post(options, function(res) {
			resolve(res);
		});
	}).catch((err) => {
		console.error('err', err);
		return undefined;
	});
}


async function startInit() {
	// Load work calendar
	calendar = getLS(`xmlcalendar.${year}.json`);
	!calendar && loadCalendar();

	// load name
	const optFixVersion = {
		...options,
		url: `/rest/auth/latest/session`
	};
	await getRequest(optFixVersion).then(data => {
		myName = data.name;
	});

	// load dataTasks
	dataTasks = getLS(`dataTasks.default`) || [];
	dataTasks.head = getLS(`dataTasks.head`) || {};

	// load vacations
	vacations = getLS(`vacations.default`) || {
		[`VIMPELCOM_MAIN\\${myName.split('@')[0]}`]: [
			{
				"DateFrom": "2023-01-01T00:00:00",
				"DateTo": "2023-01-01T00:00:00"
			}
		]
	};
	setLS('vacations.default', vacations);

	// Generate UI
	const dateFrom = new Date(new Date().setDate(1)).toISOString().replace(/(.*?)T.*/, '$1');
	const dateTo = new Date().toISOString().replace(/(.*?)T.*/, '$1');
	const devPanel = `
	<div class="dev-panel">
		<div style="position: fixed; top: 0; right: 0;">ver 1.3</div>
		<div class="dev-panel__header">
			<form>
				<input type="date" name="dateFrom" value="${dateFrom}">
				<input type="date" name="dateTo" value="${dateTo}">
			</form>
			<div>
				<a id="dev-panel__demo_proxy" class="blinker aui-button aui-button-primary aui-style" style="display: none" onclick="activateProxy()" href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">Activate Proxy</a>
				<a id="dev-panel__refresh" class="blinker aui-button aui-button-primary aui-style" style="display: none" onclick="loadCalendar()" href="javascript:void(0)">Need reload Calendar</a>
				<a id="dev-panel__generate" class="aui-button aui-button-primary aui-style" onclick="addNewItem()" href="javascript:void(0)">Generate</a>
				<a id="dev-panel__save" class="aui-button aui-button-primary aui-style" style="display: none" onclick="save()" href="javascript:void(0)">Save</a>			
			</div>
		</div>
		<div style="position: relative">
			<a class="title" onclick="$('.dev-panel__vacations').toggle()" href="javascript:void(0)">Отпуска</a>
			<div class="dev-panel__vacations" style="display: none">
				<form id="dev-panel__vacations-form"></form>
				<div>
					<a id="dev-panel__generate" class="aui-button aui-button-primary aui-style" onclick="addVacationDate()" href="javascript:void(0)">Add</a>
				</div>
			</div>
		</div>
		<div style="max-width: 95vw; overflow-x: auto;">
			<table id="dev-panel__table">
			</table>
		</div>
	</div>`;
	$("#create-menu").append(`<a id="open-dev-panel" class="aui-button aui-button-primary aui-style" onclick="toggle()" href="javascript:void(0)">Dev</a>`);
	$(document.body).append(devPanel);

	// add css
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = 'https://cdn.jsdelivr.net/gh/goldserg/tfs-tools/jira/main.css';
	document.head.appendChild(link);

	refreshTable();
	refreshVacationTable();
	console.error('INITED!');
}

$(document).ready(() => {
	startInit();
});