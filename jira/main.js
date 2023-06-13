const options = {
	protocol: 'https:',
	host: `${location.host}`,
	method: 'GET',
	headers: {
		'Content-Type': 'application/json'
	}
};
const DAY_MS = Date.DAY;
const corsProxies = ['https://cors-anywhere.herokuapp.com/'];
const year = new Date().getFullYear();
const jqlSearch = `project = HOL and updatedDate > ${new Date().toISOString().replace(/(.*?)-\d\dT.*/, '$1')}-01 and issuetype != Initiative ORDER BY created DESC`;
// 'assignee = currentUser() AND resolution = Unresolved order by created DESC'
let myName = null;
let calendar = null;
let columns = ['Id', '%'];
let dataTasks = [];


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
	const allDaysOff = calendar.reduce((memo, month)=>{
		const days = month.days.split(',').filter(day => !day.includes('*')).map(day => parseInt(day.split('+')[0]));
		days.forEach(day => memo.push(new Date(year, month.month - 1, day, 3)));
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
		.filter(day => !allDaysOff.map(_ => _.getTime()).includes(day.getTime()) );

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
		path: `/rest/api/2/search?jql=${jql}&fields=worklog&maxResults=250`,
		url: `${options.protocol}//${options.host}/rest/api/2/search?jql=${jql}&fields=worklog&maxResults=250`
	};

	let daysDateMap = getDateArray(dateFrom, dateTo);
	let days = new Array(daysDateMap.length).fill(8);

	getRequest(optFixVersion).then(async function (taskList) {
		// проверяем список worklog и составляем список необходимых расширенных запросов
		for (const task of taskList.issues) {
			const index = taskList.issues.indexOf(task);
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
					if (!(dateFrom <= workDayStarted && workDayStarted <= dateTo)) return;

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

		daysDateMap.forEach((day, i) => {
			var dateColName = day.toLocaleDateString().substr(0, 5);
			!columns.includes(dateColName) && columns.push(dateColName);
			dataTasks.forEach((_, index) => {
				dataTasks[index][dateColName] = objectTimeResult[_.Id][i];
			})
		});

		refreshTable();
		$('#dev-panel__save').show();
	});
};
const save = () => {
	$('#dev-panel__save').hide();
	dataTasks.forEach(async function(task, row){
		for (const date of Object.keys(task)) if (!['Id', '%'].includes(date) && task[date]){
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
	const head = '<thead><tr>\n\t\t\t' + columns.map(col => `<th>${col.replace(/(.*?)/, '$1')}</th>`).join('\n\t\t') + '\n\t\t</tr></thead>';
	const lines = dataTasks.map((wi, row) => `<tr>\n\t\t\t${columns.map(col => {
			return col === 'Id' ? `<td><a href="${location.origin}/browse/${wi[col]}">${wi[col]}</a> <button onclick="removeRow(${row})">❌</button></td>` : `<td>${wi[col] || ''}</td>`;
		}).join('\n\t\t\t')}\n\t\t</tr>`).join('\n\t\t') +
		`<tr>\n\t\t\t<td><input type="text" id="newJiraId"></td><td><input type="text" id="newJiraPercent"> <button onclick="addRow()">✔️</button></td>\n\t\t</tr>`;

	$('#dev-panel__table').html(head + '<tbody>' + lines + '</tbody>');
	$('#newJiraPercent').on('keyup', (e) => (e.key === 'Enter' || e.keyCode === 13) && addRow());
}

const toggle = () => $('.dev-panel').toggleClass('showed');
const addRow = () => {
	dataTasks.push({
		Id: $('#newJiraId').val(),
		'%': $('#newJiraPercent').val()
	});
	setLS('dataTasks.default', dataTasks.map(task => ({Id: task.Id, '%': task['%']})));
	refreshTable();
	$('#newJiraId').focus();
};
const removeRow = (index) => {
	dataTasks.splice(index, 1);
	setLS('dataTasks.default', dataTasks.map(task => ({Id: task.Id, '%': task['%']})));
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


function startInit() {
	// Load work calendar
	calendar = getLS(`xmlcalendar.${year}.json`);
	!calendar && loadCalendar();

	// load name
	const optFixVersion = {
		...options,
		url: `/rest/auth/latest/session`
	};
	getRequest(optFixVersion).then(data => {
		myName = data.name;
	});

	// load dataTasks
	dataTasks = getLS(`dataTasks.default`) || [];


	// Generate UI
	const dateFrom = new Date(new Date().setDate(1)).toISOString().replace(/(.*?)T.*/, '$1');
	const dateTo = new Date().toISOString().replace(/(.*?)T.*/, '$1');
	const devPanel = `
	<div class="dev-panel">
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
		<div style="max-width: 100vw; overflow-x: auto;">
			<table id="dev-panel__table">
			</table>
		</div>
	</div>`;
	$("#create-menu").append(`<a id="open-dev-panel" class="aui-button aui-button-primary aui-style" onclick="toggle()" href="javascript:void(0)">Dev</a>`);
	$(document.body).append(devPanel);

	refreshTable();
	console.error('INITED!');
}

$(document).ready(() => {
	startInit();
});