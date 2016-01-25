
var gSnap; 

function drawCircle(cx,cy,rotRad)
{
	var s = gSnap;
  var mainCircle = s.circle(cx,cy, 50);
  mainCircle.attr({
	  fill: "none",
	  stroke: "#000",
	  strokeWidth: 1
  });
  var drawMoveLine = function(info)
  {
	for(var cycIdx=0; cycIdx < info.cycle; cycIdx++)
	{
	  var startRad    = (cycIdx / info.cycle) * Math.PI*2 + rotRad;
	  var lenRad      = (1 / info.cycle)      * Math.PI*2;
	  var startRadius = info.startR;
	  var lenRadius   = info.endR - info.startR;
	  var nowRad,nowRadius;

	  var polyLines=[];
	  var polyLines2=[];
	  for(var smpIdx=0;smpIdx <= info.samplingOneCycle; ++smpIdx)
	  {
		var t = smpIdx / info.samplingOneCycle;
		if(t<0.5){
			nowRad   = startRad    + t * lenRad;
			nowRadius= startRadius + t*2 * lenRadius;   
		}else{
			nowRad   = startRad    + t * lenRad;
			nowRadius= startRadius + lenRadius - (t-0.5)*2 * lenRadius;   
		}
		var x = nowRadius*Math.cos(nowRad) - Math.sin(nowRad);
		var y = nowRadius*Math.sin(nowRad) + Math.cos(nowRad);
		polyLines.push(x+cx);
		polyLines.push(y+cy);
	  }
	  s.polyline({
		  points:polyLines,
		  fill:"none",
		  stroke:"red",
		  strokeWidth:1,
	  });
	  for(var smpIdx=1;smpIdx <= info.samplingOneCycle-1; ++smpIdx)
	  {
		var x0 = polyLines[(smpIdx-1)*2];
		var y0 = polyLines[(smpIdx-1)*2+1];
		var x1 = polyLines[smpIdx*2];
		var y1 = polyLines[smpIdx*2+1];
		var x2 = polyLines[(smpIdx+1)*2];
		var y2 = polyLines[(smpIdx+1)*2+1];
		var dx = x2-x0;
		var dy = y2-y0;
		var dLen = Math.sqrt(dx*dx+dy*dy);
		if(dLen!=0){
			polyLines2.push(x1+(-dy/dLen)*info.innerLen);
			polyLines2.push(y1+(dx/dLen)*info.innerLen);
		}
	  }
	  s.polyline({
		  points:polyLines2,
		  fill:"none",
		  stroke:"red",
		  strokeWidth:1,
	  });
	}
  };
  drawMoveLine({cycle:4,startR:45,endR:25,innerLen:4,samplingOneCycle:40});
  drawMoveLine({cycle:4,startR:30,endR:15,innerLen:4,samplingOneCycle:40});
}

$(function () {

	var s = Snap("#svg");
	gSnap = s; 

	var myViewModel = {
		nowVal0:ko.observable(0),
		nowVal1:ko.observable(0),
		minVal0:ko.observable(9999),
		minVal1:ko.observable(9999),
		maxVal0:ko.observable(0),
		maxVal1:ko.observable(0),
		nowNormalzeVal0:ko.observable(0),
		nowNormalzeVal1:ko.observable(0),
		nowDeg:ko.observable(0),
		nowState:ko.observable("none"),
		calibStart:function(){
			myViewModel.nowState("carib");
		},
	};
	ko.applyBindings(myViewModel);
	var myVm = myViewModel;

	var logData0 = [];
	var logData1 = [];

	var $sketch = $( "#sketch" );
	var canvas  = $sketch[0]
	var $context = $sketch[0].getContext( '2d' );

	var $lastX = -1;
	var $lastY = -1;

	var socket = io.connect( "/", {
		"reconnect"                :true,
		"reconnection delay"       :500,
		"max reconnection attempts":10
	} );
	var max_canvas_x = 523;
	var max_canvas_y = 346;

	$context.fillStyle = "#FFF";
	$context.fillRect(0,0,max_canvas_x,max_canvas_y);

	socket.on( "message", function ( data ) {
		var jsonData;
		try {
			jsonData = JSON.parse(data);
			console.log('val0: ' + jsonData.val0);
			console.log('val1: ' + jsonData.val1);
		} catch(e) {
			console.log("error");
			// データ受信がおかしい場合無視する
			return;
		}
		jsonData.modVal0 = jsonData.val0 - jsonData.val1/10;
		jsonData.modVal1 = jsonData.val1 - jsonData.val0/10;
		var data = {
		   x:jsonData.val0/1024 * max_canvas_x/2,	
		   y:jsonData.val1/1024 * max_canvas_y/2,	
		};

		var setData_ = function(rawVal, nowVal, minVal, maxVal, logTbl){
			nowVal(rawVal);
			minVal(Math.min(rawVal, minVal()));
			maxVal(Math.max(rawVal, maxVal()));
			logTbl.push(rawVal);
		};
		setData_(jsonData.val0, myVm.nowVal0, myVm.minVal0, myVm.maxVal0, logData0);
		setData_(jsonData.val1, myVm.nowVal1, myVm.minVal1, myVm.maxVal1, logData1);

		var len0 = myVm.maxVal0()-myVm.minVal0();
		var len1 = myVm.maxVal1()-myVm.minVal1();
		if(len0)myVm.nowNormalzeVal0((myVm.nowVal0()-myVm.minVal0())/len0);
		if(len1)myVm.nowNormalzeVal1((myVm.nowVal1()-myVm.minVal1())/len1);

		var nv0 = myVm.nowNormalzeVal0();
		var nv1 = myVm.nowNormalzeVal1();
		myVm.nowDeg(nv0*360); 

		/* Initial position */
		if ( $lastX == -1 ) {
			$lastX = data.x;
			$lastY = data.y;
		}

		$context.drawImage(canvas,-1,0)
		$context.fillStyle = 'rgba(255,255,255,0.00)'
		$context.fillRect(0,0, canvas.width, canvas.height)

		$context.save()
		$context.translate(4, 0);
  //    $context.rotate(theta)

		$context.beginPath();
		$context.moveTo( max_canvas_x-10, $lastY );
		$context.lineTo( max_canvas_x-10, data.y );
		$context.closePath();

		$context.strokeStyle = "#F00";
		$context.stroke();

		$context.beginPath();
		$context.moveTo( max_canvas_x-10, $lastX + 100 );
		$context.lineTo( max_canvas_x-10, data.x + 100 );
		$context.closePath();

		$context.strokeStyle = "#000";
		$context.stroke();

		$context.restore();

		gSnap.clear();
		drawCircle(50,50,Math.PI * myVm.nowDeg()/180 );

		$lastX = data.x;
		$lastY = data.y;
	} );

});