# tfs-tools

# Горячие клавиши

Alt+\` - открыть консоль
         При открытой консоли клавиши 1-4, 7 включают отключают соответсвующие модификации
Alt+5 - кнопка обновить в карточке WI

# Внутри плагина
- необходимо подключить текущую либу и jQuery
- Содержимое JS части заключается в кастомизации под себя

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
	},
};
```
