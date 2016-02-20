var gSnap;
$(function(){
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
            //接線テスト
            
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
              points:polyLines2,
              fill:"none",
              stroke:"red",
              strokeWidth:1,
          });
        }
        console.log("max:"+maxDeg+"min:"+minDeg);
      };
      //drawMoveLine({cycle:4,startR:45,endR:25,innerLen:4,samplingOneCycle:40});
      //drawMoveLine({cycle:4,startR:30,endR:15,innerLen:4,samplingOneCycle:40});
      var dpi72 = 72 / 25.4; //1.0を72dpiで1mmに変換する係数です
      var mainCircle = s.circle(cx,cy, 40*dpi72);
      mainCircle.attr({
          fill: "none",
          stroke: "#00F",
          strokeWidth: 1
      });
      drawMoveLine({cycle:3, startR:38*dpi72, endR:20*dpi72, innerLen:4*dpi72, samplingOneCycle:40});      
      drawMoveLine({cycle:3, startR:20*dpi72, endR:12*dpi72, innerLen:4*dpi72, samplingOneCycle:40});

      //drawMoveLine({cycle:2, startR:38*dpi72, endR:20*dpi72, innerLen:4*dpi72, samplingOneCycle:40});
      //drawMoveLine({cycle:2, startR:20*dpi72, endR:10*dpi72, innerLen:4*dpi72, samplingOneCycle:40});

      $("#svgText").text($("#svgContent").html());
      console.log($("#svgContent").html());
});