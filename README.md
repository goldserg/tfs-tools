# tfs-tools

# Горячие клавиши

Alt+\` - открыть консоль

         При открытой консоли
	 - клавиши "1-4", "7" включают отключают соответсвующие модификации
	 - клавиша "\`" - перезапуск плагина
	 
Alt+5 - Дублирование кнопки обновить в карточке WI

CTRL+Alt+A - Фокус на поле установки тега с предустановленным префиксом

SHIFT+Alt+X - Копирование id WorkItem или списка WorkItem через запятую из таблицы 

CTRL+Alt+T - Открыть меню шаблонов (работает из любой области где есть шаблоны)

CTRL+Alt+T CTRL+Alt+C - Открыть меню шаблонов и применить шаблон "Close" (работает из любой области где есть шаблоны)

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
	{ key: 'Title', values: ['[ASAP]'], mode: 'important', operator: 'CONTAINS' },
	{
		key: 'Assigned To',
		values: [
			'g NCIH',
			'g NCIH Dev',
		],
	},
];
```
```
key - ключ столбца
values - значения, которые требуется найти
mode - сейчас принимает либо значение 'important' - тогда строчка будет мигать
			либо без значения	  - тогда строчка будет полупрозрачной
operator - (значение по умолчанию 'EQUALS') - текущие допустимые значение ['EQUALS', 'CONTAINS'] - тип поиска значений по столбцам
```

5) В содержимое css включить содержимое файла https://github.com/goldserg/tfs-tools/blob/master/main.css
