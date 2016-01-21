var gSnap;
$(function(){
      var s = Snap("#svg");
      gSnap = s; 

      var cx=200;
      var cy=200;
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

      $("#svgText").text($("#svgContent").html());
});