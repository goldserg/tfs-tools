# tfs-tools

# Горячие клавиши

Alt+\` - открыть консоль
         При открытой консоли
	 - клавиши "1-4", "7" включают отключают соответсвующие модификации
	 - клавиша "\`" - перезапуск плагина
	 
Alt+5 - Дублирование кнопки обновить в карточке WI
Alt+T - Открыть меню шаблонов

# Подключение
1) Установить плагин https://chrome.google.com/webstore/detail/user-javascript-and-css/nbhcbdghjpllgmfilhnhkllmkecfmpld
2) подключить jQuery и текущую либу (на вкладке Libs/Библиотеки)

Название | ссылка
----|------
jQuery | @extension@jquery.min.js
main | https://cdn.jsdelivr.net/gh/goldserg/tfs-tools/main.js

3) В опциях включить эти либы
4) В содержимое JS включить секцию ниже

```javascript
// ==================== Custom Vars =======================
TARGET_COLUMNS = [
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

settings = {
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
	},
};
```

5) В содержимое css включить содержимое файла https://github.com/goldserg/tfs-tools/blob/master/main.css
