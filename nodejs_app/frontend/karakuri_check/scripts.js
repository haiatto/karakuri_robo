
var gSnap; 

//カムの描画です
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


function CycleAnalyze(){
	var self = this;
	var logData = [];
	var maxVal = 0;
	var minVal = 99999;

	var caribProtCycleData_ = null;
	var nowProtCycleOffset_ = 0;

	var ThresholdStartRange = 200;
	var ThresholdStartData  = 100;
	var ViewCount = 500;

	//HACK: 多次元に拡張すると多分より精度アップ
	self.addValue = function(val)
	{
		logData.push(val);
		minVal = Math.min(minVal,val);
		maxVal = Math.max(maxVal,val);

		// トレース処理
		if(caribProtCycleData_)
		{
			var cycleLen = caribProtCycleData_.length;

			var nowIdx = nowProtCycleOffset_;
			
			var minDiff = -1;
			var minDiffIdxOffs = -1;

			for(var idxOffs=0; idxOffs < 16 ; ++idxOffs)
			{
				var refVal = caribProtCycleData_[(nowIdx+idxOffs)% cycleLen];
				var diffVal = Math.abs(refVal - val) * (1.0 + idxOffs/64);
				if(minDiff<0||diffVal < minDiff)
				{
					minDiff        = diffVal;
					minDiffIdxOffs = idxOffs;
				}
			}
			/*
			for(var idxOffs=0; idxOffs < 16 ; ++idxOffs)
			{
				var refVal = caribProtCycleData_[(nowIdx-idxOffs)% cycleLen];
				var diffVal = Math.abs(refVal - val) * (1.0 + idxOffs/32);
				if(minDiff<0||diffVal < minDiff)
				{
					minDiff        = diffVal;
					minDiffIdxOffs = -idxOffs;
				}
			}*/
			nowProtCycleOffset_ = (nowProtCycleOffset_ + minDiffIdxOffs + cycleLen)%cycleLen;
		}
	};
	self.tryCarib = function()
	{
		if( maxVal-minVal < ThresholdStartRange )
		{
			return false;
		}
		if( logData.length < ThresholdStartData )
		{
			return false;
		}

		var protCycleData = self.tryCreateProtCycleData();
		if(protCycleData)
		{
			caribProtCycleData_ = protCycleData;
			nowProtCycleOffset_ = self.findBestMatchCycleOffset(caribProtCycleData_);
			return true;
		}
		return false;	
	};
	self.getNowRotDegree = function()
	{
		if(caribProtCycleData_)
		{
			return nowProtCycleOffset_/caribProtCycleData_.length * 360;
		}
		return 0;
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
	
	self.calcPeekInfo = function()
	{
		var logInfo = self.getLogInfo();

		var peekInfos    = [];
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
						peekInfos.push( nowInfo );
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
						peekInfos.push( nowInfo );
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
		// サイクルの検出をします
		var cycleRanges = [];//{startIdx,endIdx}
		for(var idx=0;idx < peekInfos.length-2;++idx)
		{
			// マッチング
			var tmpIdx = idx;
			if(peekInfos[tmpIdx].isMax==false)continue;
			tmpIdx++;
			if(peekInfos[tmpIdx].isMax==true)continue;
			//TODO:範囲チェック
			tmpIdx++;
			if(peekInfos[tmpIdx].isMax==false)continue;
			//TODO:範囲チェック
			cycleRanges.push({startIdx:peekInfos[idx  ].peekIdx,
							  endIdx:  peekInfos[idx+2].peekIdx});
			idx++;			                
		}
		return {peekInfos:    peekInfos,
				cycleRanges:  cycleRanges,
		        minPeekInfos: minPeekInfos,
		        maxPeekInfos: maxPeekInfos,
		        };
	};
	self.tryCreateProtCycleData = function()
	{
		var CycleProtTableSize = 256;

		var protCycleData = null;

		var logInfo  = self.getLogInfo();
		var peekInfo = self.calcPeekInfo();
		
		if ( peekInfo.cycleRanges.length >= 2 )
		{
			protCycleData = [];
			for(var ii=0; ii < CycleProtTableSize;ii++){
				protCycleData.push(0);	
			};

			var sumCnt = 0;
			$.each(peekInfo.cycleRanges, function(k,cycleRange)
			{
				var idxE = cycleRange.endIdx;
				var idxS = cycleRange.startIdx;
				for(var tblIdx=0; tblIdx < CycleProtTableSize ; ++tblIdx)
				{
					var srcIdx = (tblIdx/CycleProtTableSize) * (idxE - idxS) + idxS;
					srcIdx = Math.floor(srcIdx);
					protCycleData[tblIdx] = logData[logInfo.offsIdx + srcIdx]; 					
				}
			});
		}
		return protCycleData;
	};
	self.findBestMatchCycleOffset = function(protCycleData,ctx)
	{
		var logInfo  = self.getLogInfo();
		if(protCycleData)
		{
			var findScale      = 1.0;
			var findLoopOffset = 0;
			var minScore = -1;

			var protDataLen = protCycleData.length;
			for(var scale=0.1; scale < 2.0; scale+=0.4)
			{				
				for(var loopOffset=0; loopOffset < protDataLen; loopOffset++)
				{
					var score = 0;
					for(var ii=0; ii < protDataLen; ++ii)
					{
						var protIdx = (protDataLen-1) - (ii+loopOffset)%protDataLen;
						var logIdx  = (logInfo.offsIdx + logInfo.len-1) - Math.floor(ii * scale);
						var valP = protCycleData[protIdx];
						var valL = logData[logIdx];

						score += Math.abs(valP - valL);
					}
					if(minScore<0 || score < minScore)
					{
						findScale      = scale;
						findLoopOffset = loopOffset;
						minScore       = score;
					}
				}
			}
			if(minScore>=0)
			{
				if(ctx)
				{
					ctx.save()				
					ctx.beginPath();
					ctx.moveTo( 10, 10 );
					for(var ii=0; ii < protDataLen; ++ii)
					{
						var logIdx  = (logInfo.offsIdx + logInfo.len-1) - Math.floor(ii * findScale);
						var valL = logData[logIdx];
						ctx.lineTo( 10 + ii, 10 + valL / 10 );
					}
					ctx.moveTo( 10, 10 );
					for(var ii=0; ii < protDataLen; ++ii)
					{
						var protIdx = (protDataLen-1) - (ii+findLoopOffset)%protDataLen;
						var valP = protCycleData[protIdx];
						ctx.lineTo( 10 + ii, 10 + valP / 10 );
					}
					ctx.strokeStyle = "#F0F";
					ctx.stroke();
					ctx.restore();
				}
				return findLoopOffset;
			}
		}
		return -1;
	};

	self.debugDraw = function(px,py,ctx)
	{
		var ProtScale = 1400.0;
		
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
		var peekInfo = self.calcPeekInfo();
	
		var filterData=[];
		for(var idx=0; idx < logInfo.len;idx++)
		{
			filterData.push(0);
		}
		var offs=10;
		$.each(peekInfo.cycleRanges,function(k,cycleRange){
			for(var ii=cycleRange.startIdx; ii < cycleRange.endIdx; ii++){
				filterData[ii] = offs;
			}
			offs += 10;
		});
		$.each(peekInfo.minPeekInfos,function(k,minInfo){
			filterData[minInfo.peekIdx] = 100;
		});
		$.each(peekInfo.maxPeekInfos,function(k,maxInfo){
			filterData[maxInfo.peekIdx] = 200;
		});

		//if(caribProtCycleData_)
		//{
		//	var cycleOffset = self.findBestMatchCycleOffset(caribProtCycleData_,ctx);
		//}

		ctx.save()		
		
		ctx.beginPath();
		ctx.moveTo( px, py + logData[logInfo.offsIdx]/ProtScale * 200 );
		for(var idx=0; idx < logInfo.len ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + logData[logInfo.offsIdx+idx]/ProtScale * 200 );
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
		ctx.moveTo( px, py + filterData[0]/ProtScale * 200 );
		for(var idx=0; idx < filterData.length ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + filterData[idx]/ProtScale * 200 );
		}
		ctx.strokeStyle = "#F0F";
		ctx.stroke();

		
		if(caribProtCycleData_)
		{
			ctx.beginPath();
			ctx.moveTo( px+10, py + 200 + caribProtCycleData_[0]/ProtScale * 200 );
			for(var idx=0; idx < caribProtCycleData_.length ; ++idx)
			{
				ctx.lineTo( px+10 + idx, py + 200 + caribProtCycleData_[idx]/ProtScale * 200 );
			}
			ctx.strokeStyle = "#F0F";
			ctx.stroke();

			ctx.beginPath();
			
			ctx.moveTo( px+10 + nowProtCycleOffset_, py + 200 + 0 );
			ctx.lineTo( px+10 + nowProtCycleOffset_, py + 200 + 200 );
			
			ctx.strokeStyle = "#FF0";
			ctx.stroke();

			ctx.beginPath();


			var nowVal = logData[logInfo.offsIdx + logInfo.len-1];
			ctx.moveTo( px+10 + 0,   py + 200 + nowVal/ProtScale * 200 );
			ctx.lineTo( px+10 + 400, py + 200 + nowVal/ProtScale * 200 );

			ctx.strokeStyle = "#0F0";
			ctx.stroke();
		}

		ctx.restore();
	};
};



function CamHeadContol(){
	var self = this;

	var flg       = false;
	var lastInner = false;
	var lastDeg   = -1;

	var bNowReq         = false;
	var reqRestDelayDeg = 0;
	var reqRestOnDeg    = 0;

	self.addValue = function(val,nowDeg)
	{
		var deltaDeg = 0;
		if(lastDeg<0){
			lastDeg = nowDeg;
		}
		if(lastDeg > 270 && nowDeg < 90){
			deltaDeg = nowDeg - (lastDeg-360);	
		}
		else if(nowDeg > 270 && lastDeg < 90){	
			deltaDeg = (nowDeg-360) - lastDeg;	
		}
		else{
			deltaDeg = nowDeg - lastDeg;	
		}
		lastDeg = nowDeg;		

		// リクエストがある時はその処理をします(角度に紐づく処理です)
		if(bNowReq)
		{
			var restDelta = deltaDeg;
			//nowDeg =
			if(reqRestDelayDeg!=0){
				reqRestDelayDeg -= restDelta;
				if(reqRestDelayDeg<0){
					restDelta = -reqRestDelayDeg;
					reqRestDelayDeg = 0;
				}
			}
			if(reqRestDelayDeg==0){
		        reqRestOnDeg -= restDelta;
		        if(reqRestOnDeg<=0){
		        	bNowReq = false;
		        }
			}
		}

		// 内外検出(エッジにより検出します)
		var oldInner = lastInner;
		if(lastInner)
		{
			if(val>900)
			{
				lastInner = true;
			}
		}else{
			if(val<400)
			{
				lastInner = false;
			}
		}
		// 内外切り替え時の処理をします(取り付け位置と現在の位置によって決まっている一定角度後に溝が来る状態です)
		if(lastInner!=oldInner)
		{
			//test
			bNowReq         = true;
		    reqRestDelayDeg = 10;
	        reqRestOnDeg    = 10;
		}
	};
	self.setHeadPos = function(headPosValue)
	{
	};
	self.getSolenoidState = function(){
		return flg;
	};
};


//
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

	var cycleAnalyze = new CycleAnalyze();
	var camHeadControl0 = new CamHeadContol();

	var $sketch = $( "#sketch" );
	var canvas  = $sketch[0]
	var $context = $sketch[0].getContext( '2d' );

	var $lastV0 = -1;
	var $lastV1 = -1;

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
		
		// ■データ受信処理をします
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
		var data = {
		   v0:jsonData.val0/1024 * max_canvas_x/2,	
		   v1:jsonData.val1/1024 * max_canvas_y/2,	
		};

		// ■データへの各種処理を行います

		// 回転部分
		cycleAnalyze.addValue(jsonData.val0);
		if("carib"==myVm.nowState())
		{
			if(cycleAnalyze.tryCarib())
			{
				myVm.nowState("caribOk");
			}
		}
		myVm.nowDeg(cycleAnalyze.getNowRotDegree()); 

		// ソレノイド部分
		if("caribOk"==myVm.nowState())
		{
			camHeadControl0.addValue(jsonData.val1, cycleAnalyze.getNowRotDegree());
			camHeadControl0.setHeadPos(0.5);
		}
		
		if(camHeadControl0.getSolenoidState()){
			socket.emit( "solenoid", {"tgt":1,"value":true} );
		}
		else{
			socket.emit( "solenoid", {"tgt":1,"value":false} );
		}

		// ■センサーデータの数値を表示します
		var setDispSensorData_ = function(rawVal, nowVal, minVal, maxVal){
			nowVal(rawVal);
			minVal(Math.min(rawVal, minVal()));
			maxVal(Math.max(rawVal, maxVal()));
		};
		setDispSensorData_(jsonData.val0, myVm.nowVal0, myVm.minVal0, myVm.maxVal0);
		setDispSensorData_(jsonData.val1, myVm.nowVal1, myVm.minVal1, myVm.maxVal1);

		var len0 = myVm.maxVal0()-myVm.minVal0();
		var len1 = myVm.maxVal1()-myVm.minVal1();
		if(len0)myVm.nowNormalzeVal0((myVm.nowVal0()-myVm.minVal0())/len0);
		if(len1)myVm.nowNormalzeVal1((myVm.nowVal1()-myVm.minVal1())/len1);
		var nv0 = myVm.nowNormalzeVal0();
		var nv1 = myVm.nowNormalzeVal1();





		// ■SVGによる描画を行います

		/* Initial position */
		if ( $lastV0 == -1 ) {
			$lastV0 = data.v0;
			$lastV1 = data.v1;
		}

		$context.drawImage(canvas,-1,0)
		$context.fillStyle = 'rgba(255,255,255,0.00)'
		$context.fillRect(0,0, canvas.width, canvas.height)

		$context.save()
		$context.translate(4, 0);
  //    $context.rotate(theta)

		$context.beginPath();
		$context.moveTo( max_canvas_x-10, $lastV1 );
		$context.lineTo( max_canvas_x-10, data.v1 );
		$context.closePath();

		$context.strokeStyle = "#F00";
		$context.stroke();

		//
		$context.beginPath();
		$context.moveTo( max_canvas_x-10, $lastV0 + 100 );
		$context.lineTo( max_canvas_x-10, data.v0 + 100 );
		$context.closePath();

		$context.strokeStyle = "#000";
		$context.stroke();

		$context.restore();

		//■カムの描画です
		var dbgCtx = $( "#debugCanvas" )[0].getContext( '2d' );
		dbgCtx.fillStyle = "#CCF";
		dbgCtx.fillRect(0,0,max_canvas_x,max_canvas_y);
		cycleAnalyze.debugDraw(0,0,dbgCtx);

		gSnap.clear();
		drawCircle(50,50,Math.PI * myVm.nowDeg()/180 );

		$lastV0 = data.v0;
		$lastV1 = data.v1;
	};
	socket.on( "message", dataInputFunc );
});