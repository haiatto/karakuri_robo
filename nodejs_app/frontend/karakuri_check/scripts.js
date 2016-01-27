
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


function CaribData(){
	var self = this;
	var logData = [];
	var maxVal = 0;
	var minVal = 99999;

	var ThresholdStartRange = 200;
	var ThresholdStartData  = 100;
	var ViewCount = 500;

	//HACK: 多次元に拡張すると多分より精度アップ
	self.addValue = function(val)
	{
		logData.push(val);
		minVal = Math.min(minVal,val);
		maxVal = Math.max(maxVal,val);
	};
	self.tryMatching = function()
	{
		if( maxVal-minVal < ThresholdStartRange )
		{
			return false;
		}
		if( logData.length < ThresholdStartData )
		{
			return false;
		}	
/*	
		var peekData=[];
		var len = logData.length;
		for(var slideIdx=0; slideIdx < len / 2 ; ++slideIdx)
		{
			var matchVal = 0;
			for(var idx=0; idx < len / 2 ; ++idx)
			{
				var diff = (logData[slideIdx] - logData[idx]);
				matchVal += diff * diff;
			}
			peekData.push(matchVal);
		}
*/
		return false;	
	};
	self.getCaribValue = function()
	{
		return value;
	};

	self.getLogInfo = function()
	{
		var info={};
		info.offsIdx = 0;
		info.len     = logData.length;
		if(info.len > ViewCount) 
		{
			info.offsIdx = info.len - ViewCount;
			info.len     = ViewCount;
		}
		return info;
	};
	self.calcMinMaxPeekInfo = function()
	{
		var logInfo = self.getLogInfo();

		var minPeekInfos = [];
		var maxPeekInfos = [];
		var nowInfo      = null;
		var thresholdMaxS  = ((maxVal-minVal)*0.85+minVal);
		var thresholdMaxE  = ((maxVal-minVal)*0.70+minVal);
		var thresholdMinS  = ((maxVal-minVal)*0.15+minVal);
		var thresholdMinE  = ((maxVal-minVal)*0.30+minVal);
		for(var idx=0; idx < logInfo.len; ++idx)
		{
			var filterValue=0;
			var val = logData[logInfo.offsIdx+idx];
			if( val > thresholdMaxE ){
				if( val > thresholdMaxS ){
					if(nowInfo && !nowInfo.isMax){
						nowInfo.endIdx = idx;
						nowInfo = null;
					}
					if(nowInfo==null){
						nowInfo = {isMax:true,startIdx:idx,endIdx:idx+1,peekIdx:-1};
						maxPeekInfos.push( nowInfo );
					}
				}
			}
			else 
			if( val < thresholdMinE ){
				if( val < thresholdMinS ){
					if(nowInfo && nowInfo.isMax){
						nowInfo.endIdx = idx;
						nowInfo = null;
					}
					if(nowInfo==null){
						nowInfo = {isMax:false,startIdx:idx,endIdx:idx+1,peekIdx:-1};
						minPeekInfos.push( nowInfo );
					}
				}
			}
			else{
				if(nowInfo){
					nowInfo.endIdx = idx;
					nowInfo = null;
				}
			}
		}
		$.each(minPeekInfos,function(k,minInfo){
			var peekIdx    = minInfo.startIdx;
			var nowMinVal  = logData[logInfo.offsIdx + minInfo.startIdx];
			for(var idx=minInfo.startIdx; idx < minInfo.endIdx; ++idx){
				var tmpMinVal = logData[logInfo.offsIdx + minInfo.startIdx];
				if(tmpMinVal < nowMinVal)
				{
					peekIdx   = idx;
					nowMinVal = tmpMinVal;
				}
			}
			minInfo.peekIdx = peekIdx;
		});
		$.each(maxPeekInfos,function(k,maxInfo){
			var peekIdx    = maxInfo.startIdx;
			var nowMaxVal  = logData[logInfo.offsIdx + maxInfo.startIdx];
			for(var idx=maxInfo.startIdx; idx < maxInfo.endIdx; ++idx){
				var tmpMaxVal = logData[logInfo.offsIdx + maxInfo.startIdx];
				if(tmpMaxVal > nowMaxVal)
				{
					peekIdx   = idx;
					nowMaxVal = tmpMaxVal;
				}
			}
			maxInfo.peekIdx = peekIdx;
		});
		return {minPeekInfos:minPeekInfos,
		        maxPeekInfos:maxPeekInfos}
	};

	self.debugDraw = function(px,py,ctx)
	{
		if( maxVal-minVal < ThresholdStartRange )
		{
			return false;
		}
		if( logData.length < ThresholdStartData )
		{
			return false;
		}
		var logInfo = self.getLogInfo();
/*
		var peekData=[];
		for(var slideIdx=0; slideIdx < logInfo.len / 2 ; ++slideIdx)
		{
			var matchVal = 0;
			for(var idx=0; idx < len / 2 ; ++idx)
			{
				var diff = (logData[logInfo.offsIdx+slideIdx+idx] - logData[logInfo.offsIdx+idx]);
				matchVal += Math.abs(diff);
			}
			peekData.push(matchVal);
		}
*/
		var minMaxPeekInfo = self.calcMinMaxPeekInfo();
		
		var filterData=[];
		for(var idx=0; idx < logInfo.len;idx++)
		{
			filterData.push(0);
		}
		$.each(minMaxPeekInfo.minPeekInfos,function(k,minInfo){
			filterData[minInfo.peekIdx] = 100;
		});
		$.each(minMaxPeekInfo.maxPeekInfos,function(k,maxInfo){
			filterData[maxInfo.peekIdx] = 200;
		});

		ctx.save()		
		
		ctx.beginPath();
		ctx.moveTo( px, py + logData[logInfo.offsIdx]/1024.0 * 200 );
		for(var idx=0; idx < logInfo.len ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + logData[logInfo.offsIdx+idx]/1024.0 * 200 );
		}
		ctx.strokeStyle = "#F00";
		ctx.stroke();

/*
		ctx.beginPath();
		ctx.moveTo( px, py + peekData[0]/1024.0 * 200 );
		for(var idx=0; idx < peekData.length ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + peekData[idx]/2000.0 * 200 );
		}
		ctx.strokeStyle = "#F0F";
		ctx.stroke();
*/
		ctx.beginPath();
		ctx.moveTo( px, py + filterData[0]/1024.0 * 200 );
		for(var idx=0; idx < filterData.length ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + filterData[idx]/1024.0 * 200 );
		}
		ctx.strokeStyle = "#F0F";
		ctx.stroke();

		ctx.restore();
	};
};

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

	var caribData = new CaribData();

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

	var dataInputFunc = function ( data ) {
		var jsonData;
		try {
			jsonData = JSON.parse(data);
			//console.log('val0: ' + jsonData.val0);
			//console.log('val1: ' + jsonData.val1);
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
		var setData_ = function(rawVal, nowVal, minVal, maxVal){
			nowVal(rawVal);
			minVal(Math.min(rawVal, minVal()));
			maxVal(Math.max(rawVal, maxVal()));
		};
		setData_(jsonData.val0, myVm.nowVal0, myVm.minVal0, myVm.maxVal0);
		setData_(jsonData.val1, myVm.nowVal1, myVm.minVal1, myVm.maxVal1);

		caribData.addValue(jsonData.val0);
		if("carib"==myVm.nowState())
		{
			if(caribData.tryMatching())
			{
				myVm.nowState("caribOk");
			}
		}

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


		var dbgCtx = $( "#debugCanvas" )[0].getContext( '2d' );
		dbgCtx.fillStyle = "#CCF";
		dbgCtx.fillRect(0,0,max_canvas_x,max_canvas_y);
		caribData.debugDraw(0,0,dbgCtx);

		gSnap.clear();
		drawCircle(50,50,Math.PI * myVm.nowDeg()/180 );

		$lastX = data.x;
		$lastY = data.y;
	};

	socket.on( "message", dataInputFunc );
});