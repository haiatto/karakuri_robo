
var serialport = require( "serialport" );
var SerialPort = serialport.SerialPort;

// Replace with the device name in your machine.
var portName = "/dev/cu.usbmodem1421";

var portName = '\\\\.\\COM3';
var sp = new SerialPort(portName, {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    parser: serialport.parsers.readline("\n")   
} );

module.exports = {

	init:function ( socket ) {

		/* When we get a new line from the arduino, send it to the browser via this socket */
		sp.on( "data", function ( data ) {
			console.log( data );
			socket.emit( "message", data.toString() );
		} );
		
		return {sp:sp};

	}

};

