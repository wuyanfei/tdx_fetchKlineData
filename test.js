var buf = new Buffer(32);

buf[0] = 0xCD;
buf[1] = 0x00;
buf[2] = 0x3F;
buf[3] = 0x02;
console.log(0xC);
console.log(buf.readUInt16LE(0));