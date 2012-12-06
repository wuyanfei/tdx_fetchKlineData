/*
struct TDX_DAY
{
    int date;
    int open;   //元
    int high;  
    int low;
    int close;
    float amount; //元
    int vol; //股 1手=100股
    int reservation;
} ;
 */

function readKLineUnit(buff, offset) {
	var step = 0, date, open, high, low, close, amount, vol, reservation;
	date = buff.readInt32LE(offset + step);
	step += 4;
	open = buff.readInt32LE(offset + step) / 100;
	step += 4;
	high = buff.readInt32LE(offset + step) / 100;
	step += 4;
	low = buff.readInt32LE(offset + step) / 100;
	step += 4;
	close = buff.readInt32LE(offset + step) / 100;
	step += 4;
	amount = buff.readFloatLE(offset + step);
	step += 4;
	vol = buff.readInt32LE(offset + step);
	step += 4;
	reservation = buff.readInt32LE(offset + step);
	return [ date, high.toFixed(3), open.toFixed(3), low.toFixed(3), close.toFixed(3), vol, amount, reservation ];
}
exports.unpackDayKline = function(data) {
	var totalLength = data.length, unitLength = 32, dayCount = totalLength
			/ unitLength, i = 0, offset = 0, results = [];

	for (i = 0; i < dayCount; i++) {
		results.push(readKLineUnit(data, i * 32));
	}
	return results;
}

/*
 * 
 * struct TDX_5MIN { unsigned short nianyue; unsigned short xiaoshifenzhong;
 * float open; float high; float low; float close; float chengjiaoe; int
 * chengjiaoliang; int reservation; };
 */
/*
 * function getLc5DateOld(dayMonth) { var date = new Date('2012-11-14'); date2 =
 * date.addDays(dayMonth - 17497); return Date.format(date2,'Ymd'); }
 */

function getLc5Date(dayMonth) {
	var timeString = '2012-11-13';
	var timeCount = 17497;
	if(dayMonth < 17485) {
		timeCount = 17415;
		timeString = '2012-10-31';
	}
	var date = new Date(timeString);
	date.setDate(date.getDate() + dayMonth - timeCount);
	return date.getFullYear() + '' + (date.getMonth() + 1) + '' + date.getDate();
}

function read5MinuteKLineUnit(buff, offset) {
	var step = 0, nianyue, xiaoshifenzhong, open, high, low, close, amount, vol, reservation;
	nianyue= buff.readUInt16LE(offset + step);
	var xxx = nianyue;
	//console.log(xxx);
	nianyue = getLc5Date(nianyue) + ' ';
	var t = '';
	if (nianyue.length == 6) {
		t = nianyue.substring(0, 4);
		t = t + '0' + nianyue.substring(4, 5);
		t = t + '0' + nianyue.substring(5, 6);
	} else if (nianyue.length == 7) {
		t = nianyue.substring(0, 4);
		var m = nianyue.substring(4, 6);
		if (parseFloat(m) > 12) {
			m = '0' + nianyue.substring(4, 5);
			t = t + '' + m + '' + nianyue.substring(5, 7);
		} else {
			t = t +m+ '0' + nianyue.substring(6, 7);
		}
	}else{
		t = nianyue;
	}
	nianyue = t;
 //console.log(nianyue);
	step += 2;
	xiaoshifenzhong = buff.readUInt16LE(offset + step);
	 //console.log(xiaoshifenzhong);
	var xiaoshi = Math.floor(xiaoshifenzhong / 60);
	if (xiaoshi < 10) {
		xiaoshi = '0' + xiaoshi;
	}
	var minute = xiaoshifenzhong % 60;
	if (minute < 10) {
		minute = '0' + minute;
	}
	xiaoshifenzhong = xiaoshi + '' + minute;
	step += 2;
	open = buff.readFloatLE(offset + step);
	step += 4;
	high = buff.readFloatLE(offset + step);
	step += 4;
	low = buff.readFloatLE(offset + step);
	step += 4;
	close = buff.readFloatLE(offset + step);
	step += 4;
	amount = buff.readFloatLE(offset + step);
	step += 4;
	vol = buff.readInt32LE(offset + step);
	step += 4;
	reservation = buff.readInt32LE(offset + step);
	var time = nianyue+''+xiaoshifenzhong;
	//console.log(xxx,time);
	return [time, high.toFixed(3),open.toFixed(3), low.toFixed(3), close.toFixed(3), vol,amount ];
}
exports.unpackMinuteKLine = function(data) {
	var totalLength = data.length, unitLength = 32, dayCount = totalLength
			/ unitLength, i = 0, results = [];
	for (i = 0; i < dayCount; i++) {
		results.push(read5MinuteKLineUnit(data, i * 32));
	}
	var tempArray = [];
	for ( var j = 0; j < results.length; j++) {
		var temp = results[j];
		for ( var t = 2; t < temp.length - 1; t++) {
			temp[t] = parseFloat(temp[t]).toFixed(3);
		}
		//console.log(temp[0]);
		tempArray.push(temp);
	}
	return tempArray;
};
