var gSnap;
$(function(){
      var myViewModel={
          circleRadius:ko.observable(40),
          cycle:ko.observable(3),
          samplingOneCycle:ko.observable(40),
          innerLen:ko.observable(4),
          infoCount:ko.observable(2),
          cycleInfos:  ko.observableArray(),
          hideCycleInfos:  ko.observableArray(),
      };

      var s = Snap("#svg");
      gSnap = s; 

      var cx=200;
      var cy=200;
      var drawMoveLine = function(info)
      {
        var minDeg=99999, maxDeg=0;
        for(var cycIdx=0; cycIdx < info.cycle; cycIdx++)
        {
          var startRad    = (cycIdx / info.cycle) * Math.PI*2;
          var lenRad      = (1 / info.cycle)      * Math.PI*2;
          var startRadius = info.startR;
          var lenRadius   = info.endR - info.startR;
          var nowRad,nowRadius;
          //外側
          var polyLines=[];
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
          //内側
          var polyLines2=[];
          for(var smpIdx=0;smpIdx <= info.samplingOneCycle; ++smpIdx)
          {
            var x = polyLines[smpIdx*2];
            var y = polyLines[smpIdx*2+1];
            var vx = x - cx;
            var vy = y - cy;
            var vLen = Math.sqrt(vx*vx+vy*vy);
            if(vLen!=0){
                var nx = vx/vLen;
                var ny = vy/vLen;
                var newLen = vLen - info.innerLen;
                polyLines2.push(nx * newLen + cx);
                polyLines2.push(ny * newLen + cy);
            }
          }
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
                //polyLines2.push(x1+(-dy/dLen)*info.innerLen);
                //polyLines2.push(y1+( dx/dLen)*info.innerLen);
            }


            // 接線計算(テスト中)
            var makeVec2 = function(x,y){return {x:x,y:y};}
            var norm = function(v){
                var len = Math.sqrt(v.x*v.x+v.y*v.y);
                return makeVec2(v.x/len,v.y/len);
            };
            var add = function(v0,v1){return {x:v0.x+v1.x, y:v0.y+v1.y};};
            var mulS = function(v0,s){return makeVec2(v0.x*s, v0.y*s);};
            var dot = function(v0,v1){return v0.x*v1.x + v0.y*v1.y;}
            var rot = function(v,rad){
                var s=Math.sin(rad);c=Math.cos(rad);
                return makeVec2(c*v.x + -s*v.y, s*v.x + c*v.y);
            };
            
            var nvA = {x:x1-x0,y:y1-y0};
            var nvB = {x:x2-x1,y:y2-y1};
            nvA = norm(nvA);
            nvB = norm(nvB);
            
            var nvAB = rot(norm(add(nvA,nvB)),-Math.PI/2);
            //s.line({x1:x1,y1:y1,x2:x1+nvAB.x*5,y2:y1+nvAB.y*5,
    		//        stroke:"purple" ,strokeWidth:1});
    		var toOutN = norm(makeVec2(x1-cx, y1-cy));
            //s.line({x1:x1,y1:y1, x2:x1+toOutN.x*7,y2:y1+toOutN.y*7,
    		//        stroke:"green" ,strokeWidth:1});
    		
    		var deg = Math.acos( dot(nvAB,toOutN) ) / Math.PI * 180;
    		minDeg = Math.min(deg, minDeg);
    		maxDeg = Math.max(deg, maxDeg); 
          }
          s.polyline({
              points:polyLines,
              fill:"none",
              stroke:"red",
              strokeWidth:1,
          });
          s.polyline({
              points:polyLines2,
              fill:"none",
              stroke:"red",
              strokeWidth:1,
          });
        }
        info.aturyokukakuMin = minDeg;
        info.aturyokukakuMax = maxDeg;
        console.log("max:"+maxDeg+"min:"+minDeg);
      };
      var dpi72 = 72 / 25.4; //1.0を72dpiで1mmに変換する係数です
      var updateFunc = function(){
            s.clear();
            var circleRadius = myViewModel.circleRadius() * dpi72;
            var cycle        = myViewModel.cycle();
            var innerLen     = myViewModel.innerLen()*dpi72;
            var samplingOneCycle = myViewModel.samplingOneCycle();
            // 外円
            var mainCircle = s.circle(cx,cy, circleRadius);
            mainCircle.attr({
                fill: "none",
                stroke: "#00F",
                strokeWidth: 1
            });
            // 六角シャフト穴
            var rp = s.rpolygon(6,cx,cy,1.5*dpi72).attr({fill:"red"});
            rp.attr({
                fill: "none",
                stroke: "#00F",
                strokeWidth: 1
            });
            //s.prependTo(container);

            // カム
            $.each(myViewModel.cycleInfos(),function(k,cycleInfo){
                var info={
                    cycle:cycle, 
                    startR:cycleInfo.startR() * dpi72, 
                    endR:  cycleInfo.endR() * dpi72, 
                    innerLen:innerLen, 
                    samplingOneCycle:samplingOneCycle
                };
                drawMoveLine(
                  info
                );
                cycleInfo.aturyokukakuMin( info.aturyokukakuMin );
                cycleInfo.aturyokukakuMax( info.aturyokukakuMax );
            });
            var svgTxt = $("#svgContent").html();
            svgTxt = svgTxt.replace( /<svg /g , '<svg xmlns="http://www.w3.org/2000/svg" ' ) ;
            svgTxt = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgTxt;
            $("#svgText").text(svgTxt);
            console.log(svgTxt);
      };
      ko.bindingHandlers.updateDraw = {
          init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
              //updateFunc();
              element =element;
          },
          update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
              updateFunc();
          }
      };
      myViewModel.hideCycleInfos([
          {startR:ko.observable(38), 
           endR:  ko.observable(20),
           aturyokukakuMin:ko.observable(0),
           aturyokukakuMax:ko.observable(0),
          },
          {startR:ko.observable(20), 
           endR:  ko.observable(12),
           aturyokukakuMin:ko.observable(0),
           aturyokukakuMax:ko.observable(0),
          },
      ]);
      for(var idx=0;idx<100;idx++)
      {
          myViewModel.hideCycleInfos.push(
                {startR:ko.observable(10), 
                 endR:  ko.observable(5),
                 aturyokukakuMin:ko.observable(0),
                 aturyokukakuMax:ko.observable(0),
                }
          );
      }
      var updateInfos = function(){
            myViewModel.cycleInfos.removeAll();
            for(var idx=0;idx<myViewModel.infoCount();idx++)
            {
                myViewModel.cycleInfos.push(myViewModel.hideCycleInfos()[idx]);
            }
      };
      myViewModel.infoCount.subscribe(function(){
            updateInfos();            
      });
      updateInfos();
      updateFunc();
      ko.applyBindings(myViewModel);

});