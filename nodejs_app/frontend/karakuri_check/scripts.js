
var gSnap; 

//カムの描画です
function drawCamCircle(cx,cy,rotRad)
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
	  var startRad    = (cycIdx / info.cycle) * Math.PI*2;
	  var lenRad      = (1 / info.cycle)      * Math.PI*2;
	  var startRadius = info.startR;
	  var lenRadius   = info.endR - info.startR;
	  var nowRad,nowRadius;
		
	  var m = Snap.matrix();
	  m.rotate(rotRad/Math.PI*180,cx,cy);

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
		  stroke:cycIdx==0?"blue":"red",
		  strokeWidth:1,
	  }).transform(m);
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
		  stroke:cycIdx==0?"blue":"red",
		  strokeWidth:1,
	  }).transform(m);
	}
  };
  drawMoveLine({cycle:4,startR:45,endR:25,innerLen:4,samplingOneCycle:40});
  drawMoveLine({cycle:4,startR:30,endR:15,innerLen:4,samplingOneCycle:40});
}

//回転解析２
function CycleAnalyze2(roundCycleNum, debugCtx){
	var self = this;
	var logData_ = [];
	var maxVal_ = 0;
	var minVal_ = 99999;

	var isCaribOk_ = false;
	var caribProtCycleRoundInfos_ = [];
	var tryNextCaribCycleIdx_ = 0;

	var nowProtCycleOffset_ = 0;
	var nowRoundCycleIdx_ = 0;

	var lastPeekCaledLogIdx_ = 0;
	var peekInfos_      = [];
	var isLastPeekMax_  = false;
	var lastLatchPeekIdx_ = 0;
	var lastLatchCalcedPeekIdx_ = 0;
	var lastLatchCount_ = 0;

	var ThresholdStartRange_ = 50;
	var ThresholdStartData_  = 100;
	var ViewCount_ = 500;
	var RoundCycleNum_ = roundCycleNum;
	var CycleProtTableSize_ = 256;

	for(var ii=0; ii < RoundCycleNum_;ii++)
	{
		caribProtCycleRoundInfos_.push({
			roundIdx:   ii,
			protData:   null,
			minPeekIdx: -1,
			minVal:  99999,
			maxVal:  0,
			valRange:0,
		});
	}

	//HACK: 多次元に拡張すると多分より精度アップ
	self.addValue = function(val)
	{
		//同じ値が一定数続いたら停止という事で無視します(処理量上がるので)
		if(logData_.length > 30){
			var isStopData = true;
			for(var ii=0;ii<30;ii++){
				if(Math.abs(logData_[logData_.length-ii-1] - val)>3){
					isStopData = false;
					break;
				}
			}
			if(isStopData){
				return;
			}
		}

		logData_.push(val);
		minVal_ = Math.min(minVal_,val);
		maxVal_ = Math.max(maxVal_,val);

		// ピーク検出の処理
		if( (maxVal_-minVal_) > ThresholdStartRange_ )
		{
			var valRange = maxVal_ - minVal_;
			var midVal   = valRange/2 + minVal_;

			var peekInfos    = [];
			var nowInfo      = null;
			var thresholdMaxS  = (midVal + (valRange)*0.30);
			var thresholdMaxE  = (midVal + (valRange)*0.15);
			var thresholdMinS  = (midVal - (valRange)*0.30);
			var thresholdMinE  = (midVal - (valRange)*0.15);
			for(var idx=lastPeekCaledLogIdx_; idx < logData_.length; ++idx)
			{
				var val = logData_[idx];
				if( val > thresholdMaxE ){
					if( val > thresholdMaxS ){
						if(nowInfo && !nowInfo.isMax){
							nowInfo.endIdx = idx;
							peekInfos.push( nowInfo );
							nowInfo = null;
						}
						if(nowInfo==null){
							nowInfo = {isMax:true,startIdx:idx,endIdx:idx+1,peekIdx:-1};
						}
					}
				}
				else 
				if( val < thresholdMinE ){
					if( val < thresholdMinS ){
						if(nowInfo && nowInfo.isMax){
							nowInfo.endIdx = idx;
							peekInfos.push( nowInfo );
							nowInfo = null;
						}
						if(nowInfo==null){
							nowInfo = {isMax:false,startIdx:idx,endIdx:idx+1,peekIdx:-1};
						}
					}
				}
				else{
					if(nowInfo){
						nowInfo.endIdx = idx;
						peekInfos.push( nowInfo );
						nowInfo = null;
					}
				}
			}
			$.each(peekInfos,function(k,peekInfo){
				var peekIdx = peekInfo.startIdx;
				if(peekInfo.isMax)
				{
					var nowMaxVal  = logData_[peekInfo.startIdx];
					for(var idx=peekInfo.startIdx; idx < peekInfo.endIdx; ++idx){
						var tmpMaxVal = logData_[idx];
						if(tmpMaxVal > nowMaxVal)
						{
							peekIdx   = idx;
							nowMaxVal = tmpMaxVal;
						}
					}
					peekInfo.peekIdx = peekIdx;
					peekInfo.peekVal = nowMaxVal;
				}else{
					var nowMinVal  = logData_[peekInfo.startIdx];
					for(var idx=peekInfo.startIdx; idx < peekInfo.endIdx; ++idx){
						var tmpMinVal = logData_[idx];
						if(tmpMinVal < nowMinVal)
						{
							peekIdx   = idx;
							nowMinVal = tmpMinVal;
						}
					}
					peekInfo.peekIdx = peekIdx;
					peekInfo.peekVal = tmpMinVal;
				}
			});
			// 追記します
			if(peekInfos.length>0)
			{
				$.each(peekInfos,function(k,peekInfo){
					peekInfos_.push(peekInfo);
				});
				lastPeekCaledLogIdx_ = peekInfos[peekInfos.length - 1].endIdx;
			}
		}
		// ラッチの検出をします
		if(lastLatchCalcedPeekIdx_ < peekInfos_.length)
		{
			var findMinIdx = -1;
			for(var idx = lastLatchCalcedPeekIdx_ ; idx < peekInfos_.length ; idx++)
			{
				if(!peekInfos_[idx].isMax){
					findMinIdx = idx; 
				}
				else {
					if(findMinIdx>=0){
						lastLatchPeekIdx_       = idx;
						lastLatchCalcedPeekIdx_ = idx+1;
						lastLatchCount_ += 1;
						findMinIdx = -1;
						nowRoundCycleIdx_ = lastLatchCount_ % RoundCycleNum_; 
					}
				}
			}
		}

		// トレース処理
		if(isCaribOk_)
		{
			var nextRoundCycle = (lastLatchCount_+1) % RoundCycleNum_;
			caribProtCycleInfo = caribProtCycleRoundInfos_[nextRoundCycle];

			var maxVal = caribProtCycleInfo.maxVal; //maxVal_;
			var minVal = caribProtCycleInfo.minVal; //minVal_;

			// 直前のピーク(シュミットトリガなので遅れて検知される)の状態でマッチング開始位置が決まります
			// キャリブレパタンは、Max-Min-Maxになっています
			var lastPeekInfo = peekInfos_[peekInfos_.length-1];

			// まず攻めのピーク検出をします
			var findTmpPeekIdx = lastPeekInfo.peekIdx;
			var findTmpPeekVal = logData_[findTmpPeekIdx];
			for(var logIdx=lastPeekInfo.peekIdx; logIdx < logData_.length ; ++logIdx)
			{
				var logVal = logData_[logIdx];
				if(lastPeekInfo.isMax){
					if(findTmpPeekVal > logVal){
						findTmpPeekIdx = logIdx;
						findTmpPeekVal = logVal;		
					}
				}else{
					if(findTmpPeekVal < logVal){
						findTmpPeekIdx = logIdx;
						findTmpPeekVal = logVal;		
					}
				}
			}
			var preFindPeekIdx = -1;
			if(findTmpPeekIdx != logData_.length-1)
			{
				// ピークあったようです
				// ノイズ的な勾配の差分の可能性を多少チェックしてみます
				var lastVal = logData_[logData_.length-1];
				if(Math.abs(findTmpPeekVal - lastVal)>=1)
				{
					var ratio=0;
					if(lastPeekInfo.isMax){
						// Minのピークがあるはず
						ratio = Math.abs(findTmpPeekVal - minVal)/(maxVal - minVal);
					}else{
						// Maxのピークがあるはず
						ratio = Math.abs(findTmpPeekVal - maxVal)/(maxVal - minVal);
					}
					if(ratio < 0.2)
					{
						// 一定範囲内ならピークという事にします
						preFindPeekIdx = findTmpPeekIdx;
					}
				}
			}
			// 開始位置を推定します
			var lastIsMax   = false;
			var lastPeekIdx = -1;
			var isCycleNext = false;
			if(preFindPeekIdx>=0)
			{
				lastIsMax   = !lastPeekInfo.isMax;
				lastPeekIdx = preFindPeekIdx;
			}else
			{
				lastIsMax   = lastPeekInfo.isMax;
				lastPeekIdx = lastPeekInfo.peekIdx;
			}
			if(preFindPeekIdx>=0 && !lastPeekInfo.isMax){
				// Minが検出されていない状態でpreFindPeekIdxが検出されている場合、
				// ラッチのカウントが進んでない状態で次のサイクルに入っている状態(シュミットトリガの猶予期間中)です
				isCycleNext = true;
				caribProtCycleInfo = caribProtCycleRoundInfos_[(nextRoundCycle+1)%RoundCycleNum_];
				maxVal = caribProtCycleInfo.maxVal;
				minVal = caribProtCycleInfo.minVal;
			}

			var startProtIdx = 0;
			var endProtIdx   = caribProtCycleInfo.minPeekIdx;
			if(!lastIsMax){
				startProtIdx = caribProtCycleInfo.minPeekIdx;
				endProtIdx   = caribProtCycleInfo.protData.length;
			}
			nowProtCycleOffset_ = startProtIdx;
			// マッチングします
			var startLogIdx = lastPeekIdx;
			var len         = logData_.length - lastPeekIdx;
			var tgtVal      = (logData_[logData_.length-1] - minVal) / (maxVal-minVal);
			var score       = -1;
			var bestProtCycleIdx = nowProtCycleOffset_;

			for(var protCycleIdx = startProtIdx ; protCycleIdx < endProtIdx ; ++protCycleIdx)
			{
				var protVal  = caribProtCycleInfo.protData[protCycleIdx];
				var tmpScore = Math.abs(tgtVal - protVal);
				if(score < 0 || score > tmpScore){
					score = tmpScore;
					bestProtCycleIdx = protCycleIdx;
				}
			}
			nowProtCycleOffset_ = bestProtCycleIdx;
			//次のラッチのサイクルにはみ出ているので、カウントを一周分足して対処します
			if(isCycleNext){
				nowProtCycleOffset_ += caribProtCycleInfo.protData.length;
			}
if(1)
{
	var bx=0;
	var by=0;
	debugCtx.save()				
	debugCtx.fillStyle = "#FFF";
	debugCtx.fillRect(bx,by,200,100);

	debugCtx.beginPath();
	debugCtx.moveTo( bx, by+25 );
	debugCtx.lineTo( bx+200,by+25 );
	debugCtx.moveTo( bx, by+25+50 );
	debugCtx.lineTo( bx+200,by+25+50 );
	debugCtx.strokeStyle = "#F0F";
	debugCtx.stroke();

	debugCtx.beginPath();
	debugCtx.moveTo( bx, by );
	if(lastLatchPeekIdx_>=0)
	{
		var latchPeekInfo = peekInfos_[lastLatchPeekIdx_];
		for(var ii = latchPeekInfo.peekIdx ; ii < logData_.length ; ++ii)
		{
			var val = (logData_[ii] - minVal) / (maxVal-minVal);		
			debugCtx.lineTo( bx+ii-latchPeekInfo.peekIdx,   by+val*50 + 25 );
		}
	}
	debugCtx.strokeStyle = "#404";
	debugCtx.stroke();

	debugCtx.beginPath();
	debugCtx.moveTo( bx, by );
	for(var ii = 0 ; ii < len ; ++ii)
	{
		var val = (logData_[ii+startLogIdx] - minVal) / (maxVal-minVal);		
		debugCtx.lineTo( bx+ii,   by+val*50 + 25 );
	}
	debugCtx.strokeStyle = "#F0F";
	debugCtx.stroke();

	debugCtx.beginPath();
	debugCtx.moveTo( bx,    by+25+tgtVal*50 );
	debugCtx.lineTo( bx+200,by+25+tgtVal*50 );
	debugCtx.strokeStyle = "#0F0";
	debugCtx.stroke();

	debugCtx.restore();
}
		}
	};

	self.isCaribOk = function(){
		return isCaribOk_;	
	};
	self.updateCarib = function()
	{
		var tableValScale      = 1.0;

		var protCycleData = null;

		var logInfo  = self.calcLogInfo();
		var peekInfo = self.calcPeekInfo();

		// 一定間隔でサイクルが連続していたらそこをキャリブレーションデータとして使用します
		var serialStartIdx = -1;
		var serialCount    = 0;
		for(var crIdx = peekInfo.cycleRanges.length-1; crIdx >= tryNextCaribCycleIdx_ ; crIdx-- )
		{
			var timeRangeBase = peekInfo.cycleRanges[crIdx].endIdx - peekInfo.cycleRanges[crIdx].startIdx;
			var TimeCorrectRange = timeRangeBase * 0.3;//0.1;//誤差の許容範囲(+/-の誤差)

			serialCount = 0;
			for(var crIdx2 = crIdx-1; crIdx2>=0  ; crIdx2-- )
			{
				var timeRangeCmd = peekInfo.cycleRanges[crIdx2].endIdx - peekInfo.cycleRanges[crIdx2].startIdx;
				if( Math.abs(timeRangeCmd - timeRangeBase) > TimeCorrectRange ){
					break;
				}
				serialCount++;
			}
			// 一周分をリミットにしてみます
			if(serialCount >= RoundCycleNum_){
				serialStartIdx = crIdx - (serialCount-1);
				break;
			}
		}
		tryNextCaribCycleIdx_ = peekInfo.cycleRanges.length;

		if ( serialStartIdx >= 0 )
		{
			for(var crIdx=serialStartIdx; crIdx < serialStartIdx+serialCount;crIdx++)
			{
				var caribProtCycleInfo = caribProtCycleRoundInfos_[ crIdx % RoundCycleNum_ ];

				var isNew = false;
				if(caribProtCycleInfo.protData==null)
				{
					caribProtCycleInfo.protData = [];
					for(var ii=0; ii < CycleProtTableSize_;ii++){
						caribProtCycleInfo.protData.push(0);	
					};
					isNew = true;
				}

				var cycleRange = peekInfo.cycleRanges[crIdx];
				var idxE     = cycleRange.endIdx;
				var idxS     = cycleRange.startIdx;
				var valRange = cycleRange.valRange;
				var minVal   = cycleRange.minVal;
				var maxVal   = cycleRange.maxVal;
				var AddWeight   = 0.2;
				for(var tblIdx=0; tblIdx < CycleProtTableSize_ ; ++tblIdx)
				{
					var srcIdx = (tblIdx/CycleProtTableSize_) * (idxE - idxS) + idxS;
					srcIdx = Math.floor(srcIdx);
					var val = (logData_[logInfo.offsIdx + srcIdx] - minVal)*tableValScale / valRange;
					if(isNew)
					{
						caribProtCycleInfo.protData[tblIdx] = val;
					}else{
						caribProtCycleInfo.protData[tblIdx] = 
							caribProtCycleInfo.protData[tblIdx] * (1.0-AddWeight) + val * AddWeight;
					}
				}
				if(isNew)
				{
					caribProtCycleInfo.minVal   = minVal;
					caribProtCycleInfo.maxVal   = maxVal;
					caribProtCycleInfo.valRange = valRange;
				}else{
					caribProtCycleInfo.minVal   = caribProtCycleInfo.minVal   * (1.0-AddWeight)+ minVal  * AddWeight;
					caribProtCycleInfo.maxVal   = caribProtCycleInfo.maxVal   * (1.0-AddWeight)+ maxVal  * AddWeight;
					caribProtCycleInfo.valRange = caribProtCycleInfo.valRange * (1.0-AddWeight)+ valRange* AddWeight;
				}

				var minPeekVal = 0;
				caribProtCycleInfo.minPeekIdx = -1;
				$.each(caribProtCycleInfo.protData,function(idx,v){
					if(caribProtCycleInfo.minPeekIdx<0 || minPeekVal>v){
						caribProtCycleInfo.minPeekIdx = idx;
						minPeekVal = v;
					}
				});
			}
		}
		var isOk = true;
		$.each(caribProtCycleRoundInfos_,function(k,info){
			if(info.protData==null){
				isOk=false;
			}
		});
		isCaribOk_ = isOk;
	};
	self.getNowRotDegree = function()
	{
		var oneCycle  = 360/RoundCycleNum_;
		var roundIdx  = (lastLatchCount_%RoundCycleNum_);
		if(isCaribOk_)
		{
			var cycleRatio = nowProtCycleOffset_/CycleProtTableSize_;
			var deg = 0;
			deg += roundIdx * oneCycle;
			deg += (cycleRatio * oneCycle);
			return deg;
		}
		return roundIdx * oneCycle;
	};

	self.calcLogInfo = function()
	{
		var info={};
		info.offsIdx = 0;
		info.len     = logData_.length;
		if(info.len > ViewCount_) 
		{
			info.offsIdx = info.len - ViewCount_;
			info.len     = ViewCount_;
		}
		info.maxVal = 0;
		info.minVal = 9999999;
		info.midVal = 0;
		for(var idx=0; idx < info.len; ++idx)
		{
			var val = logData_[info.offsIdx+idx];
			info.maxVal = Math.max(val,info.maxVal);
			info.minVal = Math.min(val,info.minVal);
		}
		info.midVal   = (info.maxVal - info.minVal)*0.5+info.minVal;
		info.valRange = (info.maxVal - info.minVal);
		return info;
	};
	self.calcPeekInfo = function()
	{
		var logInfo = self.calcLogInfo();
		if(logInfo.valRange < (maxVal_ - minVal_)*0.5)
		{
			//現在のログがピークとるのに向いてない状態
			return {peekInfos:    [],
					cycleRanges:  [],
					};
		}
		var findStartPeekIdx = -1;
		for(var peekIdx = peekInfos_.length-1; peekIdx >= 0; peekIdx--)
		{
			if(peekInfos_[peekIdx].startIdx < logInfo.offsIdx)
			{
				break;
			}
			findStartPeekIdx = peekIdx;
		}
		if(findStartPeekIdx<0)
		{
			return {peekInfos:    [],
					cycleRanges:  [],
					};
		}
		var peekInfos = [];
		for(var peekIdx = findStartPeekIdx; peekIdx < peekInfos_.length; peekIdx++)
		{
			var origPeekInfo = peekInfos_[peekIdx];
			var logPeekInfo = {
				isMax:   origPeekInfo.isMax,
				peekIdx: origPeekInfo.peekIdx  - logInfo.offsIdx,
				peekVal: origPeekInfo.peekVal,
			};
			peekInfos.push( logPeekInfo );
		}
		if(peekInfos.length==0)
		{
			// 探索範囲にピーク情報無しでした
			return {peekInfos:    [],
					cycleRanges:  [],
					};
		}
		// サイクルの検出をします
		var cycleRanges = [];//{startIdx,endIdx}
		for(var infoIdx=0;infoIdx < peekInfos.length-2;++infoIdx)
		{
			// マッチング
			var tmpInfoIdx = infoIdx;
			if(peekInfos[tmpInfoIdx].isMax==false)continue;
			tmpInfoIdx++;
			if(peekInfos[tmpInfoIdx].isMax==true)continue;
			//TODO:範囲チェック
			tmpInfoIdx++;
			if(peekInfos[tmpInfoIdx].isMax==false)continue;
			//TODO:範囲チェック
			var info = {startIdx:peekInfos[infoIdx  ].peekIdx,
						endIdx:  peekInfos[infoIdx+2].peekIdx,
						minVal:  99999,
						maxVal:  0,
						valRange:0,};
			for(var valIdx=info.startIdx; valIdx < info.endIdx; ++valIdx){
				var val = logData_[logInfo.offsIdx + valIdx];
				info.minVal = Math.min(info.minVal, val);
				info.maxVal = Math.max(info.maxVal, val);
			}
			info.valRange = info.maxVal - info.minVal;
			cycleRanges.push(info);
			tmpInfoIdx++;			                
		}
		return {peekInfos:    peekInfos,
				cycleRanges:  cycleRanges,};
	};

	self.debugDraw = function(px,py,ctx)
	{
		var ProtScale = 1400.0;
		
		if( maxVal_-minVal_ < ThresholdStartRange_ )
		{
			return false;
		}
		if( logData_.length < ThresholdStartData_ )
		{
			return false;
		}
		var logInfo  = self.calcLogInfo();
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
		$.each(peekInfo.peekInfos,function(k,peekInfo){
			filterData[peekInfo.peekIdx] = peekInfo.isMax ? 200 : 100;
		});
		ctx.save()		
		
		ctx.beginPath();
		ctx.moveTo( px, py + logData_[logInfo.offsIdx]/ProtScale * 200 );
		for(var idx=0; idx < logInfo.len ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + logData_[logInfo.offsIdx+idx]/ProtScale * 200 );
		}
		ctx.strokeStyle = "#F00";
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo( px, py + filterData[0]/ProtScale * 200 );
		for(var idx=0; idx < filterData.length ; ++idx)
		{
			ctx.lineTo( px + idx, py + 100 + filterData[idx]/ProtScale * 200 );
		}
		ctx.strokeStyle = "#F0F";
		ctx.stroke();

		
		if(isCaribOk_)
		{
			var nextRoundCycle = (lastLatchCount_+1) % RoundCycleNum_;
			caribProtCycleInfo = caribProtCycleRoundInfos_[nextRoundCycle];

			var cycleHPix = 100;
			ctx.beginPath();
			ctx.moveTo( px+10, py + 200 + caribProtCycleInfo.protData[0] * cycleHPix );
			for(var idx=0; idx < caribProtCycleInfo.protData.length ; ++idx)
			{
				ctx.lineTo( px+10 + idx, py + 200 + caribProtCycleInfo.protData[idx] * cycleHPix );
			}
			ctx.strokeStyle = "#F0F";
			ctx.stroke();

			ctx.beginPath();
			
			ctx.moveTo( px+10 + nowProtCycleOffset_, py + 200 + 0 );
			ctx.lineTo( px+10 + nowProtCycleOffset_, py + 200 + cycleHPix );
			
			ctx.strokeStyle = "#FF0";
			ctx.stroke();

			ctx.beginPath();


			var nowVal   = logData_[logInfo.offsIdx + logInfo.len-1];
			var minVal   = caribProtCycleInfo.minVal;
			var valRange = caribProtCycleInfo.valRange;
			ctx.moveTo( px+10 + 0,   py + 200 + (nowVal-minVal)/valRange * cycleHPix );
			ctx.lineTo( px+10 + 400, py + 200 + (nowVal-minVal)/valRange * cycleHPix );

			ctx.strokeStyle = "#0F0";
			ctx.stroke();
		}

		ctx.restore();
	};
};




function CamHeadContol(){
	var self = this;

	var solenoidFlg_ = false;
	var lastInner    = false;
	var lastDeg      = -1;

	var bNowReq_        = false;
	var reqRestDelayDeg = 0;
	var reqRestOnDeg    = 0;
	var reqExitTimer_   = 0;
	var minVal_         = -1;
	var maxVal_         = -1;

	var caribOk_  = false;
	var caribDeg_ = 360*2;

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
		if(!caribOk_)
		{
			if(minVal_<0){
				minVal_ = val;
				maxVal_ = val;
				return;
			}
			minVal_ = Math.min(minVal_,val);
			maxVal_ = Math.max(maxVal_,val);
			caribDeg_ -= deltaDeg;
			if(caribDeg_<0){
				caribOk_ = true;
			}
		}
		var normalizeVal = (val-minVal_) / (maxVal_ - minVal_);

		// リクエストがある時はその処理をします(角度に紐づく処理です)
		solenoidFlg_ = false;
		if(bNowReq_)
		{
			if(reqExitTimer_>0)
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
						bNowReq_ = false;
					}else{
						solenoidFlg_ = true;
					}
				}
				reqExitTimer_--;
			}else{
				bNowReq_ = false;
				reqRestDelayDeg = 0;
				reqRestOnDeg    = 0;
			}
		}

		// 内外検出(エッジにより検出します)
		var oldInner = lastInner;
		if(!lastInner)
		{
			if(normalizeVal > 0.7)
			{
				lastInner = true;
			}
		}else{
			if(normalizeVal < 0.3)
			{
				lastInner = false;
			}
		}
		// 内外切り替え時の処理をします(取り付け位置と現在の位置によって決まっている一定角度後に溝が来る状態です)
		if(!bNowReq_ && lastInner!=oldInner)
		{
			//test
			if(oldInner)
			{
				bNowReq_        = true;
				reqRestDelayDeg = 0;
				reqRestOnDeg    = 10;
				reqExitTimer_   = 50;
			}
		}
	};
	self.setHeadPos = function(headPosValue)
	{
	};
	self.getSolenoidState = function(){
		return solenoidFlg_;
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

	var $sketch = $( "#sketch" );
	var canvas  = $sketch[0]
	var $context = $sketch[0].getContext( '2d' );
	var dbgCtx = $( "#debugCanvas" )[0].getContext( '2d' );
	var dbgCtx2 = $( "#debugCanvas2" )[0].getContext( '2d' );

	var lastDrawData = null;

	var cycleAnalyze = new CycleAnalyze2(6,dbgCtx2);
	var camHeadControl0 = new CamHeadContol(dbgCtx2);

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

		// ■データへの各種処理を行います

		// 回転部分
		cycleAnalyze.addValue(jsonData.val0);
		//if("carib"==myVm.nowState()||"none"==myVm.nowState())
		{
			cycleAnalyze.updateCarib();
			if(cycleAnalyze.isCaribOk())
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
		var forDrawData = {
		   v0:  myVm.nowVal0()/1024 * max_canvas_x/2,	
		   v1:  myVm.nowVal1()/1024 * max_canvas_y/2,	
		   min0:myVm.minVal0()/1024 * max_canvas_x/2,	
		   min1:myVm.minVal1()/1024 * max_canvas_x/2,	
		   max0:myVm.maxVal0()/1024 * max_canvas_x/2,	
		   max1:myVm.maxVal1()/1024 * max_canvas_x/2,	
		};
		if ( lastDrawData == null ) {
			lastDrawData = forDrawData;
		}

		$context.drawImage(canvas,-1,0)
		$context.fillStyle = 'rgba(255,255,255,0.00)'
		$context.fillRect(0,0, canvas.width, canvas.height)

		$context.save()
		$context.translate(4, 0);
  //    $context.rotate(theta)

		$context.beginPath();
		$context.moveTo( max_canvas_x-10, lastDrawData.v1 );
		$context.lineTo( max_canvas_x-10, forDrawData.v1 );
		$context.strokeStyle = "#F00";
		$context.stroke();

		$context.beginPath();
		$context.moveTo( max_canvas_x-11, forDrawData.max1 );
		$context.lineTo( max_canvas_x-10, forDrawData.max1 );
		$context.strokeStyle = "#F00";
		$context.stroke();

		$context.beginPath();
		$context.moveTo( max_canvas_x-11, forDrawData.min1 );
		$context.lineTo( max_canvas_x-10, forDrawData.min1 );
		$context.strokeStyle = "#F00";
		$context.stroke();

		//
		$context.beginPath();
		$context.moveTo( max_canvas_x-10, lastDrawData.v0 + 100 );
		$context.lineTo( max_canvas_x-10, forDrawData.v0  + 100 );
		$context.strokeStyle = "#000";
		$context.stroke();

		$context.beginPath();
		$context.moveTo( max_canvas_x-11, forDrawData.max0 + 100 );
		$context.lineTo( max_canvas_x-10, forDrawData.max0 + 100 );
		$context.strokeStyle = "#000";
		$context.stroke();

		$context.beginPath();
		$context.moveTo( max_canvas_x-11, forDrawData.min0 + 100 );
		$context.lineTo( max_canvas_x-10, forDrawData.min0 + 100 );
		$context.strokeStyle = "#000";
		$context.stroke();

		$context.restore();

		//■カムの描画です
		var dbgCtx = $( "#debugCanvas" )[0].getContext( '2d' );
		dbgCtx.fillStyle = "#CCF";
		dbgCtx.fillRect(0,0,max_canvas_x,max_canvas_y);
		cycleAnalyze.debugDraw(0,0,dbgCtx);

		gSnap.clear();
		drawCamCircle(50,50,Math.PI * myVm.nowDeg()/180 );

		lastDrawData = forDrawData;
	};
	socket.on( "message", dataInputFunc );
});