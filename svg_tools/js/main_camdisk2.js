var gSnap;
$(function(){
      var myViewModel={
          circleRadius:ko.observable(40),
          divCycle:ko.observable(3),
          divMizo:ko.observable(3),
          mizoMargin:ko.observable(7),
          samplingOneCycle:ko.observable(40),
          innerLen:ko.observable(4),
          startR:ko.observable(38),
          endR:ko.observable(15),
          aturyokukakuMin:ko.observable(0),
          aturyokukakuMax:ko.observable(0),
      };

      var s = Snap("#svg");
      gSnap = s; 

      var cx=200;
      var cy=200;
      var drawMoveLine = function(info)
      {
        // 簡易ベクトル計算
        var makeVec2 = function(x,y){return {x:x,y:y};}
        var norm = function(v){
            var len = Math.sqrt(v.x*v.x+v.y*v.y);
            return makeVec2(v.x/len,v.y/len);
        };
        var lenVec = function(v){
            return Math.sqrt(v.x*v.x+v.y*v.y);
        };
        var add = function(v0,v1){return {x:v0.x+v1.x, y:v0.y+v1.y};};
        var sub = function(v0,v1){return {x:v0.x-v1.x, y:v0.y-v1.y};};
        var mulS = function(v0,s){return makeVec2(v0.x*s, v0.y*s);};
        var dot = function(v0,v1){return v0.x*v1.x + v0.y*v1.y;}
        var rot = function(v,rad){
            var s=Math.sin(rad);c=Math.cos(rad);
            return makeVec2(c*v.x + -s*v.y, s*v.x + c*v.y);
        };

        // 溝のラインたち
        var mizoLinesTbl = [];
        //旧仕様版
        if(0)
        {
              for(var cycIdx=0; cycIdx < info.divCycle; cycIdx++)
              {
                var startRad    = (cycIdx / info.divCycle) * Math.PI*2;
                var lenRad      = (1 / info.divCycle)      * Math.PI*2;
                var startRadius = info.startR;
                var lenRadius   = info.endR - info.startR;
                var nowRad,nowRadius;

                // 溝の中心のライン
                var mizoLines = [];
                for(var smpIdx=0;smpIdx <= info.samplingOneCycle/2; ++smpIdx)
                {      
                  var t = smpIdx / info.samplingOneCycle;
                  nowRad   = startRad    + t   * lenRad;
                  nowRadius= startRadius + (t*2 * lenRadius);   
                  nowRadius -= info.innerLen/2.0;
                  var x = nowRadius*Math.cos(nowRad) - 0*Math.sin(nowRad);
                  var y = nowRadius*Math.sin(nowRad) + 0*Math.cos(nowRad);
                  mizoLines.push(makeVec2(x+cx, y+cy));
                }
                mizoLinesTbl.push(mizoLines);

                var mizoLines = [];
                for(var smpIdx=0;smpIdx <= info.samplingOneCycle/2; ++smpIdx)
                {
                  var t = smpIdx / info.samplingOneCycle;
                  nowRad   = startRad    + (t+0.5) * lenRad;
                  nowRadius= startRadius + (lenRadius - t*2 * lenRadius);   
                  nowRadius -= info.innerLen/2.0;
                  var x = nowRadius*Math.cos(nowRad) - 0*Math.sin(nowRad);
                  var y = nowRadius*Math.sin(nowRad) + 0*Math.cos(nowRad);
                  mizoLines.push(makeVec2(x+cx, y+cy));
                }
                mizoLinesTbl.push(mizoLines);
              }
        }
        //新仕様版
        if(1)
        {
            // 使えるのは半分で移動速度(回転数)より分割数が決まります
            //var cycle = divCycle * 2;//分割数*2が溝分割の単位

            var addMizoLine_ = function(
              startRad,   diffRad,
              startRadius,diffRadius,
              samplingCount)
            {
                var nowRad, nowRadius;
                var mizoLines = [];
                for(var smpIdx=0;smpIdx <= samplingCount; ++smpIdx)
                {      
                  var t = smpIdx / samplingCount;
                  nowRad     = startRad    + t * diffRad;
                  nowRadius  = startRadius + t * diffRadius;   
                  var x = nowRadius*Math.cos(nowRad) - 0*Math.sin(nowRad);
                  var y = nowRadius*Math.sin(nowRad) + 0*Math.cos(nowRad);
                  mizoLines.push(makeVec2(x+cx, y+cy));
                }
                mizoLinesTbl.push(mizoLines);
            };
            var mizoMarginRad = info.mizoMargin/180 * Math.PI;

            for(var divCycleIdx=0; divCycleIdx < info.divCycle ; ++divCycleIdx)
            {
              var divMove = info.divMizo;
              for(var divMoveIdx=0; divMoveIdx < divMove ; ++divMoveIdx)
              {                  
                  var lenRad      = Math.PI*2 / info.divCycle;
                  var startRad    = divCycleIdx * lenRad;
                  var lenRadius   = (info.endR - info.startR)/ divMove;
                  var startRadius = info.startR + divMoveIdx*lenRadius;
                  var nowRad,nowRadius;
                  // 溝の中心のライン
                  addMizoLine_(
                    startRad + mizoMarginRad, 
                    lenRad/2 - mizoMarginRad,
                    startRadius - info.innerLen/2.0, lenRadius,
                    info.samplingOneCycle
                  );
                  addMizoLine_(
                    startRad + lenRad/2, 
                    lenRad/2 - mizoMarginRad,
                    (startRadius+lenRadius) - info.innerLen/2.0, -lenRadius,
                    info.samplingOneCycle
                  );
              }
            }
        }

        var minDeg=99999, maxDeg=0;

        $.each(mizoLinesTbl,function(k,mizoLines){   
          //溝を中心にして描画します
          //(とりあえず図形は円で。そのうちヘッドの形に合わせてもいいかも) 
          var c = s.circle(
            mizoLines[0].x, 
            mizoLines[0].y, 
            info.innerLen/2.0);
          c.attr({
            fill: "none",
            stroke: "#F00",
            strokeWidth: 1
          });
          var c = s.circle(
            mizoLines[mizoLines.length-1].x, 
            mizoLines[mizoLines.length-1].y, 
            info.innerLen/2.0);
          c.attr({
            fill: "none",
            stroke: "#F00",
            strokeWidth: 1
          });

          var polyLines =[];
          var polyLines2=[];
          for(var mizoIdx=0;mizoIdx < mizoLines.length; ++mizoIdx)
          {
            var mizoP0 = mizoLines[mizoIdx-1];
            var mizoP  = mizoLines[mizoIdx];
            var mizoP1 = mizoLines[mizoIdx+1];
            var nv;
            if(!mizoP0){
              nv = rot(norm(sub(mizoP1,mizoP)),-Math.PI/2);
            }
            else if(!mizoP1){
              nv = rot(norm(sub(mizoP,mizoP0)),-Math.PI/2);
            }
            else{
              nv = rot(norm(sub(mizoP1,mizoP)),-Math.PI/2);
            }
            var cp = makeVec2(cx,cy);
            var toV   = sub(mizoP,cp);
            var toNV  = norm(toV);
            var toLen = lenVec(toV);
            var toVA = add(toV, mulS(nv,  info.innerLen/2));
            var toVB = add(toV, mulS(nv, -info.innerLen/2));
            var lineP  = add(cp,toVA);
            var lineP2 = add(cp,toVB);
            polyLines .push(lineP.x);
            polyLines .push(lineP.y);
            polyLines2.push(lineP2.x);
            polyLines2.push(lineP2.y);
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
          // 圧力角計算
          for(var smpIdx=1;smpIdx <= info.samplingOneCycle/2-1; ++smpIdx)
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
        });
        info.aturyokukakuMin = minDeg;
        info.aturyokukakuMax = maxDeg;
        console.log("max:"+maxDeg+"min:"+minDeg);
      };
      var dpi72 = 72 / 25.4; //1.0を72dpiで1mmに変換する係数です
      var updateFunc = function(){
            s.clear();
            var circleRadius = myViewModel.circleRadius() * dpi72;
            var divCycle     = myViewModel.divCycle();
            var divMizo      = myViewModel.divMizo();
            var mizoMargin   = myViewModel.mizoMargin();
            var innerLen     = myViewModel.innerLen()*dpi72;
            var samplingOneCycle = myViewModel.samplingOneCycle();
            var startR       = myViewModel.startR() * dpi72; 
            var endR         = myViewModel.endR()   * dpi72; 

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
            var info={
              divCycle: divCycle,
              divMizo:  divMizo, 
              mizoMargin:mizoMargin,
              startR:startR, 
              endR:  endR, 
              innerLen:innerLen, 
              samplingOneCycle:samplingOneCycle
            };
            drawMoveLine(
              info
            );
            myViewModel.aturyokukakuMin( info.aturyokukakuMin );
            myViewModel.aturyokukakuMax( info.aturyokukakuMax );
            
            // 検出用パタン
            
            // 外円
            cx = cx + circleRadius;
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
            */

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
      updateFunc();
      ko.applyBindings(myViewModel);
});