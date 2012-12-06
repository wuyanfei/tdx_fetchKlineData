var unpack = require('./unpacker');
var async = require('async');
var fs = require('fs');
var redis = require('redis').createClient(6390, '172.16.33.203');
var _ = require('underscore');
var moment = require('./moment');
var KUNIT = null;
process.on('uncaughtException', function(e) {
	console.error(e.stack);
	// constant.redis.quit();
});
/**
 * 读取文件列表
 */
var walk = function(path, callback) {
	var fileList = [];
	var dirList = fs.readdirSync(path);
	console.log('要处理的股票个数：' + dirList.length + '个');
	dirList.forEach(function(item) {
		if (fs.statSync(path + '/' + item).isFile()) {
			fileList.push(path + '/' + item);
		}
	});

	dirList.forEach(function(item) {
		if (fs.statSync(path + '/' + item).isDirectory()) {
			walk(path + '/' + item);
		}
	});
	callback(fileList);
};

/**
 * 开始任务分钟K线
 */
exports.startMission = function() {
	var path = '/home/cool/workspace/tdxKline/files';
	walk(path, function(fileList) {
		deal5Kline(fileList);
	});
};
/**
 * K线实体
 */
var KLineUnit = function() {
	var self = this;
	this.time;// 时间
	this.open = 0;// 开盘价
	this.high = 0;// 最高价
	this.low = 0;// 最低价
	this.closePrice = 0;// 昨收价
	this.volum = 0;// 成交量
	this.amount = 0;// 成交额
	this.toArray = function() {
		return [ self.time, self.high, self.open, self.low, self.closePrice,
				self.volum, self.amount ];
	};
	this.getTime = function() {
		return self.time;
	};
	this.setTime = function(time) {
		self.time = time;
	};
	this.setVolum = function(volum) {
		self.volum = parseFloat(self.volum) + parseFloat(volum);
	};
	this.getVolum = function() {
		return self.volum;
	};
	this.setAmount = function(amount) {
		self.amount = parseFloat(self.amount) + parseFloat(amount);
	};
	this.getAmount = function() {
		return self.amount;
	};
	this.setOpen = function(open) {
		self.open = open;
	};
	this.getOpen = function() {
		return self.open;
	};
	this.setHigh = function(high) {
		if (parseFloat(high) > parseFloat(self.high)) {
			self.high = high;
		}
	};
	this.getHigh = function() {
		return self.high;
	};
	this.setLow = function(low) {
		if (self.low == 0)
			self.low = low;
		if (parseFloat(low) < parseFloat(self.low)) {
			self.low = low;
		}
	};
	this.getLow = function() {
		return self.low;
	};
	this.setClosePrice = function(closePrice) {
		self.closePrice = closePrice;
	};
	this.getClosePrice = function() {
		return self.closePrice;
	};
};
/**
 * 克隆对象
 */
var clone = function(object) {
	if (typeof object != 'object')
		return object;
	if (object == null || object == undefined)
		return object;
	var newObject = new Object();
	for ( var i in object) {
		newObject[i] = clone(object[i]);
	}
	return newObject;
};
/**
 * 处理5分钟k线
 */
var deal5Kline = function(fileList) {
	var worker = new Worker(5);
	worker.setTask(fileList);
};

/**
 * 年K
 */
var dealYearKline = function(results, key) {
	var tempRes = {};
	var TIME = '';
	var START = '';
	var count = 0;
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ymd = item[0].toString().substring(0, 8);// 年月日
		var year = item[0].toString().substring(0, 4);
		try {
			if (parseFloat(ymd) < parseFloat(year + '' + '1231')) {
				var _date = new Date(year + '-12-31');
				var _weekDay = _date.getDay();
				while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
					var _tempDate = _date.add(-1, 'yyyy-MM-dd');
					_date = new Date(_tempDate);
					_weekDay = _date.getDay();
				}
				TIME = _date.add(0, 'yyyyMMdd');
			}
		} catch (e) {
			console.log(e.stack);
		}
		kUnit.setTime(TIME);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};

/**
 * 半年K
 */
var dealHalfYKline = function(results, key) {
	var tempRes = {};
	var TIME = '';
	var count = 0;
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ym = item[0].toString().substring(0, 6);// 年月
		var month = item[0].toString().substring(4, 6);// 月
		var year = item[0].toString().substring(0, 4);// 年
		var compareSummerYM = year + '' + '07';
		var compareWinterYM = year + '' + '01';
		var compareWinterYMEnd = parseFloat(year + 1) + '' + '01';
		if (parseFloat(ym) >= parseFloat(compareWinterYM)
				&& parseFloat(ym) < parseFloat(compareSummerYM)) {
			var _date = new Date(year + '-06-30');
			var _weekDay = _date.getDay();
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();
		} else if (parseFloat(ym) > parseFloat(compareSummerYM)
				&& parseFloat(ym) <= parseFloat(compareWinterYMEnd)) {
			var _date = new Date(year + '-12-31');
			var _weekDay = _date.getDay();
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();
		}
		kUnit.setTime(TIME);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};

/**
 * 处理季K
 */
var dealJiKline = function(results, key) {
	var tempRes = {};
	var TIME = '';
	var count = 0;
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ym = item[0].toString().substring(0, 6);// 年月
		var month = ym.toString().substring(4, 6);// 月
		var year = ym.toString().substring(0, 4);// 年
		var day = item[0].toString().substring(6, 8);// 日
		var compareSummerYM = year + '' + '04';// 夏季401~630
		var compareSpringYM = year + '' + '01';// 春季101~331
		var compareAutumYM = year + '' + '07';// 秋季701~930
		var compareWinterYM = year + '' + '10';// 冬季1001～1231
		var compareNextSpringYM = parseFloat(parseFloat(year) + 1) + '' + '01';// 第二年的3月份
		if (parseFloat(ym) >= parseFloat(compareSpringYM)
				&& parseFloat(ym) < parseFloat(compareSummerYM)) {
			var _date = new Date(year + '-03-31');
			if (parseFloat(new Date().toString()) < parseFloat(year + '0331')) {
				_date = new Date();
			}
			var _weekDay = _date.getDay();
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();// 春季
			// console.log('春'+TIME);
		} else if (parseFloat(ym) >= parseFloat(compareSummerYM)
				&& parseFloat(ym) < parseFloat(compareAutumYM)) {
			var _date = new Date(year + '-06-30');
			if (parseFloat(new Date().toString()) < parseFloat(year + '0630')) {
				_date = new Date();
			}
			var _weekDay = _date.getDay();
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();// 夏季
			// console.log('夏季'+TIME);
		} else if (parseFloat(ym) >= parseFloat(compareAutumYM)
				&& parseFloat(ym) < parseFloat(compareWinterYM)) {
			var _date = new Date(year + '-09-30');
			if (parseFloat(new Date().toString()) < parseFloat(year + '0930')) {
				_date = new Date();
			}
			var _weekDay = _date.getDay();
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();// 秋季
			// console.log('秋'+TIME);
		} else if (parseFloat(ym) >= parseFloat(compareWinterYM)
				&& parseFloat(ym) < parseFloat(compareNextSpringYM)) {
			// console.log(compareNextSpringYM,ym);
			var _date = new Date(year + '-12-31');
			// console.log(parseFloat(new Date().toString()),parseFloat(year+'1231'));
			if (parseFloat(new Date().toString()) < parseFloat(year + '1231')) {
				_date = new Date();
			}

			var _weekDay = _date.getDay();
			// console.log(_weekDay);
			while (_weekDay == 6 || _weekDay == 0) {// 判断不在周末
				var _tempDate = _date.add(-1, 'yyyy-MM-dd');
				_date = new Date(_tempDate);
				_weekDay = _date.getDay();
			}
			TIME = _date.toString();// 冬季
			// console.log('冬'+TIME);
		}
		// console.log(TIME);
		kUnit.setTime(TIME);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		// console.log(tempRes);
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};
/**
 * 处理月K
 */
var dealMonthKline = function(results, key) {
	var tempRes = {};
	var START = '';
	var count = 0;
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ym = item[0].toString().substring(0, 6);// 年月
		if (count == 0) {
			START = ym;
			count = count + 1;
		}
		if (START != ym) {// 不在同月内
			START = ym;
		}
		kUnit.setTime(START);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};
/**
 * 处理周K
 */
var dealWeekKline = function(results, key) {
	var tempRes = {};
	var START = '';
	var END = '';
	var count = 0;
	var _time = '';
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ymd = item[0].toString().substring(0, 8);// 年月日
		var year = ymd.substring(0, 4);
		var month = ymd.substring(4, 6);
		var day = ymd.substring(6, 8);
		var date = new Date();
		date.setFullYear(year, parseFloat(month - 1), day);
		var weekDay = date.getDay();
		if (count == 0) {// 此处的count是为了保证START除了周日赋值外，只赋一次值
			_time = ymd;
			count = count + 1;
		}
		if (parseFloat(6 - weekDay) > 1) {
			var diff = parseFloat(6 - weekDay - 1);
			_time = date.add(diff, 'yyyyMMdd');
		}
		if (parseFloat(6 - weekDay) == 1) {
			_time = ymd;// 周五
		}

		kUnit.setTime(_time);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};
/**
 * 处理60分钟K线
 */
var deal60Kline = function(results, key) {
	var tempRes = {};
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ymd = item[0].substring(0, 8);// 年月日
		var time = item[0];
		var _time = '';
		time = parseFloat(time.substring(8, time.length));// 时分
		if (time >= 930 && time <= 1030) {
			_time = ymd + '1030';
		} else if (time > 1030 && time <= 1130) {
			_time = ymd + '1130';
		} else if (time > 1300 && time <= 1400) {
			_time = ymd + '1400';
		} else if (time > 1400 && time <= 1500) {
			_time = ymd + '1500';
		}
		kUnit.setTime(_time);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};
/**
 * 处理30分钟k线
 */
var deal30Kline = function(results, key) {
	var tempRes = {};
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ymd = item[0].substring(0, 8);// 年月日
		var time = item[0];
		var _time = '';
		time = parseFloat(time.substring(8, time.length));// 时分
		if (time >= 930 && time <= 1000) {
			_time = ymd + '1000';
		} else if (time > 1000 && time <= 1030) {
			_time = ymd + '1030';
		} else if (time > 1030 && time <= 1100) {
			_time = ymd + '1100';
		} else if (time > 1100 && time <= 1130) {
			_time = ymd + '1130';
		} else if (time > 1300 && time <= 1330) {
			_time = ymd + '1330';
		} else if (time > 1330 && time <= 1400) {
			_time = ymd + '1400';
		} else if (time > 1400 && time <= 1430) {
			_time = ymd + '1430';
		} else if (time > 1430 && time <= 1500) {
			_time = ymd + '1500';
		}
		kUnit.setTime(_time);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};
/**
 * 处理15分钟K线
 */
var deal15Kline = function(results, key) {
	var tempRes = {};
	async.forEach(results, function(item, cb) {
		var kUnit = setKLineUnit(item);
		var ymd = item[0].substring(0, 8);// 年月日
		var time = item[0];
		var _time = '';
		time = parseFloat(time.substring(8, time.length));// 时分
		if (time >= 930 && time <= 945) {
			_time = ymd + '0945';
		} else if (time > 945 && time <= 1000) {
			_time = ymd + '1000';
		} else if (time > 1000 && time <= 1015) {
			_time = ymd + '1015';
		} else if (time > 1015 && time <= 1030) {
			_time = ymd + '1030';
		} else if (time > 1030 && time <= 1045) {
			_time = ymd + '1045';
		} else if (time > 1045 && time <= 1100) {
			_time = ymd + '1100';
		} else if (time > 1100 && time <= 1115) {
			_time = ymd + '1115';
		} else if (time > 1115 && time <= 1130) {
			_time = ymd + '1130';
		} else if (time >= 1300 && time <= 1315) {
			_time = ymd + '1315';
		} else if (time > 1315 && time <= 1330) {
			_time = ymd + '1330';
		} else if (time > 1330 && time <= 1345) {
			_time = ymd + '1345';
		} else if (time > 1345 && time <= 1400) {
			_time = ymd + '1400';
		} else if (time > 1400 && time <= 1415) {
			_time = ymd + '1415';
		} else if (time > 1415 && time <= 1430) {
			_time = ymd + '1430';
		} else if (time > 1430 && time <= 1445) {
			_time = ymd + '1445';
		} else if (time > 1445 && time <= 1500) {
			_time = ymd + '1500';
		}
		kUnit.setTime(_time);
		if (KUNIT != null) {
			if (kUnit.getTime() == KUNIT.getTime()) {
				var unit = setKLineUnit(KUNIT, kUnit);
				tempRes[kUnit.getTime()] = clone(unit).toArray();
				KUNIT = clone(unit);
				cb();
			} else {
				tempRes[kUnit.getTime()] = clone(kUnit).toArray();
				KUNIT = clone(kUnit);
				cb();
			}
		} else {
			tempRes[kUnit.getTime()] = clone(kUnit).toArray();
			KUNIT = clone(kUnit);
			cb();
		}
	}, function() {
		var worker = new Worker(1, key);
		worker.setTask(tempRes);
	});
};

var setKLineUnit = function(item, unit) {
	var kUnit = null;
	if (_.isArray(item)) {
		kUnit = new KLineUnit();
		kUnit.setHigh(item[1]);
		kUnit.setOpen(item[2]);
		kUnit.setLow(item[3]);
		kUnit.setClosePrice(item[4]);
		kUnit.setVolum(item[5]);
		kUnit.setAmount(item[6]);
	} else {
		kUnit = clone(item);
		kUnit.setHigh(unit.getHigh());
		// kUnit.setOpen(unit.getOpen());//不赋值开盘价，原来的要保持
		kUnit.setLow(unit.getLow());
		kUnit.setClosePrice(unit.getClosePrice());
		kUnit.setVolum(unit.getVolum());
		kUnit.setAmount(unit.getAmount());
	}
	return kUnit;
};
/**
 * 获取异常信息
 */
var getException = function(e) {
	if (e && e.stack) {
		return e.stack;
	} else {
		return e;
	}
};

/**
 * 获取解析后的数据
 */
var get5Results = function(item, cb) {
	var data = fs.readFileSync(item);
	var temp = item.split('/');
	var key = temp[temp.length - 1];
	var preffix = key.substring(0, 2);
	var code = key.substring(2, 8);
	key = 'TDX.KLINE.' + preffix.toLocaleUpperCase() + code + '.05M';
	var result = unpack.unpackMinuteKLine(data);
	setDataToRedis(result, key, cb);

};

/**
 * 获取日K数据
 */
var get60Results = function(item, cb) {
	var data = fs.readFileSync(item);
	var temp = item.split('/');
	var key = temp[temp.length - 1];
	var preffix = key.substring(0, 2);
	var code = key.substring(2, 8);
	key = 'TDX.KLINE.' + preffix.toLocaleUpperCase() + code + '.DAY';
	var result = unpack.unpackDayKline(data);
	try {
		setDayDataToRedis(result, key, cb);
	} catch (ee) {
		console.log(ee);
	}
};

var setDayDataToRedis = function(results, key, cb) {
	console.log(key);
	var dayKey = key.split('.');
	var weekKey = [ dayKey[0], dayKey[1], dayKey[2], dayKey[3] ];
	var monthKey = [ dayKey[0], dayKey[1], dayKey[2], dayKey[3] ];
	var jiKey = [ dayKey[0], dayKey[1], dayKey[2], dayKey[3] ];
	var halfYKey = [ dayKey[0], dayKey[1], dayKey[2], dayKey[3] ];
	var yearKey = [ dayKey[0], dayKey[1], dayKey[2], dayKey[3] ];
	weekKey[3] = 'WK';
	monthKey[3] = 'MTH';
	jiKey[3] = 'SY';
	halfYKey[3] = 'HY';
	yearKey[3] = 'FY';
	dealWeekKline(results, weekKey.join('.'));// 处理周K线
	dealMonthKline(results, monthKey.join('.'));// 处理月K线
	dealJiKline(results, jiKey.join('.'));// 处理季K
	dealHalfYKline(results, halfYKey.join('.'));// 半年K
	dealYearKline(results, yearKey.join('.'));// 年K
	async.forEach(results, function(item, callback) {
		var str = item.join('|');
		pushData(key, str, callback);
	}, function() {
		cb();
	});
};
/**
 * 以list存入redis
 */
var pushData = function(key, str, callback) {
	redis.rpush(key, str, function(err, res) {
		if (err)
			console.log(err);
		if (callback)
			callback();
	});
};

/**
 * 把数据存入redis results是一个数组
 */
var setDataToRedis = function(results, key, cb) {
	var fiveKey = key.split('.');
	var fifteenKey = [ fiveKey[0], fiveKey[1], fiveKey[2], fiveKey[3] ];
	var thirtyKey = [ fiveKey[0], fiveKey[1], fiveKey[2], fiveKey[3] ];
	var _60Key = [ fiveKey[0], fiveKey[1], fiveKey[2], fiveKey[3] ];
	var weekKey = [ fiveKey[0], fiveKey[1], fiveKey[2], fiveKey[3] ];
	var monthKey = [ fiveKey[0], fiveKey[1], fiveKey[2], fiveKey[3] ];
	fifteenKey[3] = '15M';
	thirtyKey[3] = '30M';
	_60Key[3] = '60M';
	weekKey[3] = 'WK';
	monthKey[3] = 'MTH';
	deal15Kline(results, fifteenKey.join('.'));// 处理15分钟K线
	deal30Kline(results, thirtyKey.join('.'));// 处理30分钟K线
	deal60Kline(results, _60Key.join('.'));// 处理60分钟k线
	// dealWeekKline(results, weekKey.join('.'));// 处理周K线
	// dealMonthKline(results, monthKey.join('.'));// 处理月K线
	async.forEach(results, function(item, callback) {
		var str = item.join('|');
		pushData(key, str, callback);
	}, function() {
		cb();
	});
};
/**
 * 工作队列
 */
var Worker = function(type, key) {
	this.type = type;
	var self = this;
	this.q = async.queue(function(item, cb) {
		if (type == 5) {
			get5Results(item.item, cb);// 解析5分钟文件
		} else if (type == 1) {
			pushData(key, item.item.join('|'), cb);// 存储15 30 60分钟k线
		} else if (type == 60) {
			get60Results(item.item, cb);// 解析日K文件
		}
	}, 1)
	this.setTask = function(array) {
		for ( var i in array) {
			self.q.push({
				'item' : array[i]
			}, function(err) {
				if (err) {
					console.log(getException(err));
				}
			});
		}
	};
};
Date.prototype.toString = function() {
	var year = this.getFullYear();
	var month = parseFloat(this.getMonth()) + 1;
	if (parseFloat(month) < 10)
		month = '0' + month;
	var day = this.getDate();
	if (parseFloat(day) < 10) {
		day = '0' + day;
	}
	return year + '' + month + '' + day;
}
Date.prototype.add = function(days, pattern) {
	var temp = moment(this).add('days', days)._d;
	temp = temp.toString();
	return pattern.replace(/yyyy/g, temp.substring(0, 4)).replace(/MM/g,
			temp.substring(4, 6)).replace(/dd/g, temp.substring(6, 8));
};
/**
 * 处理5分钟，15分钟，30分钟，60分钟 K线
 */
// startMission();
/**
 * 处理日K，周K，月K，季K
 */
exports.startDayMission = function() {
	var path = '/home/cool/workspace/tdxKline/dayFile';
	walk(path, function(fileList) {
		dealDayKline(fileList);
	});
};

/**
 * 日K处理逻辑
 */
var dealDayKline = function(fileList) {
	var worker = new Worker(60);
	worker.setTask(fileList);
};
Date.prototype.format = function(pattern) {
	var date = this;
	var year4 = date.getFullYear();
	var year2 = year4.toString().substring(2);
	pattern = pattern.replace(/yyyy/, year4);
	pattern = pattern.replace(/yy/, year2);

	var month = date.getMonth();
	month = month + 1;
	month = pad(month);
	pattern = pattern.replace(/MM/, month);

	var dayOfMonth = date.getDate();
	var dayOfMonth2 = pad(dayOfMonth);
	pattern = pattern.replace(/dd/, dayOfMonth2);
	pattern = pattern.replace(/d/, dayOfMonth);

	var hours = date.getHours();
	var hours2 = pad(hours);
	pattern = pattern.replace(/HH/, hours2);
	pattern = pattern.replace(/H/, hours);

	var minutes = date.getMinutes();
	var minutes2 = pad(minutes);
	pattern = pattern.replace(/mm/, minutes2);
	pattern = pattern.replace(/m/, minutes);

	var seconds = date.getSeconds();
	var seconds2 = pad(seconds);
	pattern = pattern.replace(/ss/, seconds2);
	pattern = pattern.replace(/s/, seconds);

	var milliSeconds = date.getMilliseconds();
	pattern = pattern.replace(/S+/, milliSeconds);
	var day = date.getDay();
	var kHours = hours;
	if (kHours == 0) {
		kHours = 24;
	}
	var kHours2 = pad(kHours);
	pattern = pattern.replace(/kk/, kHours2);
	pattern = pattern.replace(/k/, kHours);
	var KHours = hours;
	if (hours > 11) {
		KHours = hours - 12;
	}
	var KHours2 = pad(KHours);
	pattern = pattern.replace(/KK/, KHours2);
	pattern = pattern.replace(/K/, KHours);
	var hHours = KHours;
	if (hHours == 0) {
		hHours = 12;
	}
	var hHours2 = pad(hHours);
	pattern = pattern.replace(/hh/, hHours2);
	pattern = pattern.replace(/h/, hHours);
	return pattern;
}

// startDayMission();

